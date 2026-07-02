/**
 * Network Capture Injector - Captures fetch and XHR network calls in the application
 * @description A script that can be injected into Playwright's codegen browser (or any page)
 * to record all network requests and responses for test debugging and API documentation.
 *
 * Usage:
 * 1. Run: npx playwright codegen https://your-app-url.com
 * 2. Open browser dev tools (F12) -> Console
 * 3. Paste this script into the console (optionally after CodegenMetadataInjector.js)
 * 4. Interact with the application - network calls are captured automatically
 * 5. Run: window.downloadNetworkLog() or window.copyNetworkLogToClipboard() when done
 *
 * @author Playwright Boilerplate Team
 * @version 1.0.0
 */

(function () {
  'use strict';

  console.log('🌐 Network Capture Injector loaded!');
  console.log('📡 All fetch and XHR calls will be captured');
  console.log('💾 Run window.downloadNetworkLog() or window.copyNetworkLogToClipboard() when done');

  /** @type {Array<Object>} Store for captured network entries */
  const networkLog = [];

  /** Max length for request/response body preview in log */
  const BODY_PREVIEW_LENGTH = 500;

  /** Headers to redact from logs (sensitive data) */
  const REDACT_HEADERS = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];

  /**
   * Redacts sensitive header values
   * @param {Object} headers - Headers object (key-value)
   * @returns {Object} Sanitized copy
   */
  function sanitizeHeaders(headers) {
    if (!headers || typeof headers !== 'object') return {};
    const out = {};
    for (const [k, v] of Object.entries(headers)) {
      const key = (k || '').toLowerCase();
      out[k] = REDACT_HEADERS.some((h) => key.includes(h)) ? '[REDACTED]' : v;
    }
    return out;
  }

  /**
   * Safely get body preview (string, truncated)
   * @param {string|Object} body - Raw body
   * @returns {string}
   */
  function bodyPreview(body) {
    if (body == null) return '';
    if (typeof body === 'string') return body.length > BODY_PREVIEW_LENGTH ? body.slice(0, BODY_PREVIEW_LENGTH) + '...' : body;
    try {
      const str = JSON.stringify(body);
      return str.length > BODY_PREVIEW_LENGTH ? str.slice(0, BODY_PREVIEW_LENGTH) + '...' : str;
    } catch (_) {
      return '[Non-serializable]';
    }
  }

  /**
   * Capture XHR: intercept open/send and record on load/error
   */
  const XHROpen = XMLHttpRequest.prototype.open;
  const XHRSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this._capture = { method: (method || 'GET').toUpperCase(), url: url || '', start: Date.now() };
    return XHROpen.apply(this, [method, url, ...rest]);
  };

  XMLHttpRequest.prototype.send = function (body) {
    const xhr = this;
    const cap = xhr._capture;
    if (!cap) return XHRSend.call(xhr, body);

    const captureRequest = () => {
      const entry = {
        type: 'XHR',
        method: cap.method,
        url: cap.url,
        requestHeaders: {},
        requestBody: bodyPreview(typeof body === 'string' ? body : null),
        timestamp: cap.start,
        duration: Date.now() - cap.start,
        status: xhr.status,
        statusText: xhr.statusText,
        responseHeaders: {},
        responseBody: '',
      };

      try {
        const reqHeaders = xhr.getAllResponseHeaders
          ? xhr.getAllResponseHeaders()
          : '';
        if (reqHeaders) {
          reqHeaders.split('\r\n').forEach((line) => {
            const idx = line.indexOf(':');
            if (idx > 0) {
              const key = line.slice(0, idx).trim();
              const val = line.slice(idx + 1).trim();
              entry.responseHeaders[key] = REDACT_HEADERS.some((h) => key.toLowerCase().includes(h)) ? '[REDACTED]' : val;
            }
          });
        }
      } catch (_) {}

      try {
        const resp = xhr.responseText || xhr.response;
        entry.responseBody = bodyPreview(typeof resp === 'string' ? resp : resp != null ? JSON.stringify(resp) : '');
      } catch (_) {
        entry.responseBody = '[Unable to read]';
      }

      networkLog.push(entry);
      console.log('📡 XHR captured:', cap.method, cap.url, xhr.status);
    };

    xhr.addEventListener('load', captureRequest);
    xhr.addEventListener('error', captureRequest);
    xhr.addEventListener('abort', captureRequest);

    return XHRSend.call(xhr, body);
  };

  /**
   * Capture fetch: wrap global fetch
   */
  const originalFetch = window.fetch;
  window.fetch = function (input, init) {
    const start = Date.now();
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    const method = (init && init.method) ? init.method.toUpperCase() : 'GET';
    const headers = (init && init.headers) ? (init.headers instanceof Headers
      ? Object.fromEntries(init.headers.entries())
      : { ...init.headers }) : {};
    const reqBody = init && init.body != null ? bodyPreview(typeof init.body === 'string' ? init.body : '[Body]') : '';

    return originalFetch.apply(this, arguments).then(
      (response) => {
        const duration = Date.now() - start;
        const respHeaders = {};
        response.headers.forEach((val, key) => {
          respHeaders[key] = REDACT_HEADERS.some((h) => key.toLowerCase().includes(h)) ? '[REDACTED]' : val;
        });

        return response.clone().text().then(
          (text) => {
            networkLog.push({
              type: 'fetch',
              method,
              url,
              requestHeaders: sanitizeHeaders(headers),
              requestBody: reqBody,
              timestamp: start,
              duration,
              status: response.status,
              statusText: response.statusText,
              responseHeaders: respHeaders,
              responseBody: bodyPreview(text),
            });
            console.log('📡 Fetch captured:', method, url, response.status);
            return response;
          },
          () => {
            networkLog.push({
              type: 'fetch',
              method,
              url,
              requestHeaders: sanitizeHeaders(headers),
              requestBody: reqBody,
              timestamp: start,
              duration,
              status: response.status,
              statusText: response.statusText,
              responseHeaders: respHeaders,
              responseBody: '[Unable to read]',
            });
            console.log('📡 Fetch captured:', method, url, response.status);
            return response;
          }
        );
      },
      (err) => {
        networkLog.push({
          type: 'fetch',
          method,
          url,
          requestHeaders: sanitizeHeaders(headers),
          requestBody: reqBody,
          timestamp: start,
          duration: Date.now() - start,
          status: null,
          statusText: 'Failed',
          responseHeaders: {},
          responseBody: err && err.message ? err.message : '[Network error]',
        });
        console.log('📡 Fetch (failed) captured:', method, url);
        throw err;
      }
    );
  };

  /**
   * Download network log as JSON file
   */
  window.downloadNetworkLog = function () {
    const dataStr = JSON.stringify(networkLog, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `network-capture-${timestamp}.json`;

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);

    console.log(`✅ Downloaded network log: ${networkLog.length} requests -> ${filename}`);
    return networkLog;
  };

  /**
   * Copy network log to clipboard as JSON
   */
  window.copyNetworkLogToClipboard = function () {
    const dataStr = JSON.stringify(networkLog, null, 2);
    navigator.clipboard.writeText(dataStr).then(
      () => console.log(`📋 Network log copied to clipboard (${networkLog.length} requests)`),
      (err) => {
        console.error('❌ Failed to copy:', err);
        console.log('📄 Data:', dataStr);
      }
    );
    return networkLog;
  };

  /**
   * Show count of captured requests
   */
  window.showNetworkLogCount = function () {
    console.log(`📊 Captured ${networkLog.length} network requests`);
    return networkLog.length;
  };

  /**
   * Clear network log
   */
  window.clearNetworkLog = function () {
    networkLog.length = 0;
    console.log('🗑️ Network log cleared');
  };

  /**
   * Return the current log (for programmatic use)
   */
  window.getNetworkLog = function () {
    return [...networkLog];
  };

  console.log('✅ Network capture is active!');
  console.log('📋 Commands: window.downloadNetworkLog() | window.copyNetworkLogToClipboard() | window.showNetworkLogCount() | window.clearNetworkLog()');
})();
