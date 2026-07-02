/**
 * Codegen Metadata Injector - Injects metadata recording into Playwright Codegen
 * @description A script that can be injected into Playwright's codegen browser to record
 * comprehensive locator metadata alongside test generation.
 * 
 * Usage:
 * 1. Run: npx playwright codegen https://your-app-url.com
 * 2. Open browser dev tools (F12)
 * 3. Paste this script into the console
 * 4. Interact with elements to record metadata
 * 5. Run: window.downloadMetadata() to save the data
 * 
 * @author Playwright Boilerplate Team
 * @version 1.0.0
 */

(function() {
  'use strict';
  
  console.log('🎬 Codegen Metadata Injector loaded!');
  console.log('📋 Interact with elements to record metadata');
  console.log('💾 Run window.downloadMetadata() or window.copyMetadataToClipboard() when done');
  console.log('📸 Run window.enableScreenshotCapture() to capture a screenshot on each user action');

  /**
   * Storage for unique events keyed by XPath to avoid duplicates
   * @type {Object.<string, Object>}
   */
  const uniqueEventsByXPath = {};

  /**
   * Screenshot capture: stored per user action
   * @type {Array<{ action: string, timestamp: number, label?: string, dataUrl: string }>}
   */
  const screenshots = [];
  let screenshotCaptureEnabled = false;
  let html2canvasLoaded = false;

  /**
   * Input buffer for batching rapid inputs
   * @type {Object.<string, Object>}
   */
  let inputBuffer = {};
  let flushTimeout = null;

  /**
   * Extracts comprehensive metadata for a DOM element
   * @param {Element} el - DOM element to analyze
   * @returns {Object} Element metadata object
   */
  function getElementMetadata(el) {
    if (!el || !el.tagName) return {};

    /**
     * Finds associated label text for form elements
     * @returns {string} Label text or empty string
     */
    function findLabelText() {
      // Check for label[for="id"]
      if (el.id) {
        const labels = document.querySelectorAll(`label[for="${el.id}"]`);
        if (labels.length > 0) {
          return labels[0].textContent.trim();
        }
      }
      
      // Check if element is inside a label
      const parentLabel = el.closest('label');
      if (parentLabel) {
        const labelClone = parentLabel.cloneNode(true);
        const inputsInLabel = labelClone.querySelectorAll('input, select, textarea');
        inputsInLabel.forEach(input => input.remove());
        return labelClone.textContent.trim();
      }
      
      return '';
    }

    /**
     * Gets ancestor element information for context
     * @param {Element} element - Element to get ancestors for
     * @param {number} [limit=3] - Maximum number of ancestors to include
     * @returns {Array<Object>} Array of ancestor metadata objects
     */
    function getAncestorsInfo(element, limit = 3) {
      const ancestors = [];
      let parent = element.parentElement;
      let count = 0;
      
      while (parent && count < limit) {
        const ancestorInfo = {
          tag: parent.tagName.toLowerCase()
        };
        
        // Only include meaningful identifiers
        if (parent.id) ancestorInfo.id = parent.id;
        if (parent.className) ancestorInfo.class = parent.className;
        if (parent.getAttribute('role')) ancestorInfo.role = parent.getAttribute('role');
        if (parent.getAttribute('data-testid')) ancestorInfo['data-testid'] = parent.getAttribute('data-testid');
        
        ancestors.push(ancestorInfo);
        parent = parent.parentElement;
        count++;
      }
      
      return ancestors.reverse();
    }

    /**
     * Extracts accessibility information for the element
     * @returns {Object} Accessibility metadata object
     */
    function getAccessibilityInfo() {
      const role = el.getAttribute('role') || 
                  (el.tagName.toLowerCase() === 'button' ? 'button' : '') ||
                  (el.tagName.toLowerCase() === 'input' && el.type === 'text' ? 'textbox' : '') ||
                  (el.tagName.toLowerCase() === 'input' && el.type === 'submit' ? 'button' : '');
      
      let accessibleName = el.getAttribute('aria-label') || 
                          findLabelText() ||
                          el.textContent?.trim() ||
                          el.getAttribute('placeholder') ||
                          el.getAttribute('title') ||
                          el.getAttribute('alt') ||
                          '';
      
      const description = el.getAttribute('aria-describedby') ? 
                         document.getElementById(el.getAttribute('aria-describedby'))?.textContent?.trim() : '';
      
      return {
        role: role,
        accessibleName: accessibleName,
        description: description || ''
      };
    }

    /**
     * Gets positioning information for nth-child fallback locators
     * @returns {Object} Position metadata object
     */
    function getPositionInfo() {
      if (!el.parentElement) return { nthChild: 1, siblingTags: [] };
      
      const siblings = Array.from(el.parentElement.children);
      const nthChild = siblings.indexOf(el) + 1;
      const siblingTags = siblings
        .filter(s => s !== el)
        .map(s => s.tagName.toLowerCase())
        .slice(0, 5); // Limit sibling tags
      
      return { nthChild, siblingTags };
    }

    // Build the metadata object following the documented schema
    const metadata = {
      tag: el.tagName.toLowerCase(),
      textContent: (el.textContent || '').trim(),
      labelText: findLabelText(),
      id: el.id || '',
      name: el.getAttribute('name') || '',
      classList: el.className ? el.className.split(/\s+/).filter(c => c) : [],
      attributes: {},
      ancestorsInfo: getAncestorsInfo(el),
      positionInfo: getPositionInfo(),
      accessibilityInfo: getAccessibilityInfo(),
      xpath: getXPath(el), // Keep for deduplication
      visible: !!(el.offsetParent || el.getClientRects().length)
    };

    // Collect important attributes (following schema)
    const importantAttrs = [
      'placeholder', 'type', 'value', 'data-testid', 'role', 
      'aria-label', 'aria-labelledby', 'aria-describedby', 
      'alt', 'title', 'href', 'src', 'for'
    ];
    
    importantAttrs.forEach(attr => {
      const value = el.getAttribute(attr);
      if (value !== null) {
        metadata.attributes[attr] = value;
      }
    });

    // Add any data-* attributes
    for (const attr of el.attributes) {
      if (attr.name.startsWith('data-')) {
        metadata.attributes[attr.name] = attr.value;
      }
    }

    return metadata;
  }

  /**
   * Generates XPath for an element
   * @param {Element} element - DOM element to generate XPath for
   * @returns {string} XPath string for the element
   */
  function getXPath(element) {
    if (element.id) return `//*[@id="${element.id}"]`;
    
    const parts = [];
    while (element && element.nodeType === Node.ELEMENT_NODE) {
      let index = 1;
      let sibling = element.previousSibling;
      while (sibling) {
        if (sibling.nodeType === Node.ELEMENT_NODE && sibling.nodeName === element.nodeName) {
          index++;
        }
        sibling = sibling.previousSibling;
      }
      const tagName = element.nodeName.toLowerCase();
      const part = `${tagName}[${index}]`;
      parts.unshift(part);
      element = element.parentNode;
    }
    return '/' + parts.join('/');
  }

  /**
   * Loads html2canvas from CDN for screenshot capture
   * @returns {Promise<void>}
   */
  function loadHtml2Canvas() {
    if (html2canvasLoaded) return Promise.resolve();
    if (typeof window.html2canvas === 'function') {
      html2canvasLoaded = true;
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
      script.crossOrigin = 'anonymous';
      script.onload = function () {
        html2canvasLoaded = true;
        console.log('📸 html2canvas loaded - screenshot capture ready');
        resolve();
      };
      script.onerror = function () {
        console.warn('⚠️ Failed to load html2canvas - screenshot capture disabled');
        reject(new Error('html2canvas load failed'));
      };
      document.head.appendChild(script);
    });
  }

  /**
   * Captures a screenshot of the current viewport and stores it with the action
   * @param {string} action - Type of action (click, input, select, change, navigation)
   * @param {string} [label] - Optional short label (e.g. element text)
   */
  function captureScreenshot(action, label) {
    if (!screenshotCaptureEnabled || !html2canvasLoaded || typeof window.html2canvas !== 'function') return;
    window.html2canvas(document.body, {
      useCORS: true,
      allowTaint: true,
      logging: false,
      scale: 1,
    }).then(function (canvas) {
      const dataUrl = canvas.toDataURL('image/png');
      screenshots.push({
        action: action,
        timestamp: Date.now(),
        label: label || '',
        dataUrl: dataUrl,
      });
      console.log('📸 Screenshot captured for action:', action, label ? '(' + label + ')' : '');
    }).catch(function (err) {
      console.warn('⚠️ Screenshot capture failed:', err && err.message ? err.message : err);
    });
  }

  /**
   * Merges interaction event data with existing element metadata
   * @param {Object} event - Interaction event data
   */
  function mergeEvent(event) {
    const key = event.meta?.xpath;
    if (!key) return;

    if (uniqueEventsByXPath[key]) {
      uniqueEventsByXPath[key].timestamp = event.timestamp;

      if (event.action === 'input' || event.action === 'select') {
        uniqueEventsByXPath[key].value = event.value;
        if (event.displayText) uniqueEventsByXPath[key].displayText = event.displayText;
      }

      if (!uniqueEventsByXPath[key].actions) {
        uniqueEventsByXPath[key].actions = [];
      }
      uniqueEventsByXPath[key].actions.push(event.action);
    } else {
      uniqueEventsByXPath[key] = Object.assign({}, event, { actions: [event.action] });
    }
  }

  /**
   * Tracks last click time for navigation correlation
   * @type {number}
   */
  let lastClickTime = 0;

  /**
   * Click event handler for recording click interactions
   */
  document.addEventListener('click', function(e) {
    lastClickTime = Date.now();
    const el = e.target;
    const eventData = {
      action: 'click',
      meta: getElementMetadata(el),
      timestamp: Date.now(),
    };
    mergeEvent(eventData);
    const label = (el.textContent || el.getAttribute('aria-label') || el.id || el.className || '').toString().trim().substring(0, 40);
    captureScreenshot('click', label);
    console.log('🖱️  Click recorded:', el.tagName, el.id || el.className || el.textContent?.substring(0, 20));
  });

  /**
   * Input event handler for recording text input interactions
   */
  document.addEventListener('input', function(e) {
    const el = e.target;
    if (el.tagName.toLowerCase() === 'select') return;
    
    clearTimeout(flushTimeout);
    inputBuffer[el.xpath || getXPath(el)] = {
      action: 'input',
      value: el.value,
      meta: getElementMetadata(el),
      timestamp: Date.now(),
    };

    flushTimeout = setTimeout(() => {
      for (const entry of Object.values(inputBuffer)) {
        mergeEvent(entry);
        const label = (entry.meta && (entry.meta.textContent || entry.meta.labelText || entry.meta.id || '')) || entry.value || '';
        captureScreenshot('input', String(label).substring(0, 40));
      }
      inputBuffer = {};
    }, 500);
    
    console.log('⌨️  Input recorded:', el.tagName, el.value?.substring(0, 20));
  });

  /**
   * Change event handler for recording form control changes
   */
  document.addEventListener('change', function(e) {
    const el = e.target;
    
    if (el.tagName.toLowerCase() === 'select') {
      const selectedText = el.options[el.selectedIndex] ? el.options[el.selectedIndex].text : '';
      const eventData = {
        action: 'select',
        value: el.value,
        displayText: selectedText,
        meta: getElementMetadata(el),
        timestamp: Date.now(),
      };
      mergeEvent(eventData);
      captureScreenshot('select', selectedText.substring(0, 40));
      console.log('📋 Select recorded:', el.tagName, selectedText);
    } else if (el.type === 'checkbox' || el.type === 'radio') {
      const eventData = {
        action: 'change',
        value: el.checked,
        meta: getElementMetadata(el),
        timestamp: Date.now(),
      };
      mergeEvent(eventData);
      const label = (el.getAttribute('aria-label') || el.id || '').toString().substring(0, 40);
      captureScreenshot('change', label);
      console.log('☑️  Checkbox/Radio recorded:', el.tagName, el.checked);
    }
  });

  /**
   * Reports navigation events to track page changes
   * @param {string} url - URL of the navigation
   */
  const reportNavigation = (url) => {
    if (window.top !== window) return;
    if (!window._firstNavigationReported) {
      window._firstNavigationReported = true;
      mergeEvent({
        action: 'navigation',
        url: url,
        timestamp: Date.now(),
      });
      captureScreenshot('navigation', url ? url.replace(/^https?:\/\//, '').substring(0, 40) : '');
      return;
    }
    if (Date.now() - lastClickTime < 800) {
      mergeEvent({
        action: 'navigation',
        url: url,
        timestamp: Date.now(),
      });
      captureScreenshot('navigation', url ? url.replace(/^https?:\/\//, '').substring(0, 40) : '');
    }
  };

  /**
   * Browser back/forward navigation tracking
   */
  window.addEventListener('popstate', function() {
    reportNavigation(window.location.href);
  });

  /**
   * History API navigation tracking - pushState
   */
  const _pushState = history.pushState;
  history.pushState = function() {
    _pushState.apply(this, arguments);
    reportNavigation(window.location.href);
  };

  /**
   * History API navigation tracking - replaceState
   */
  const _replaceState = history.replaceState;
  history.replaceState = function() {
    _replaceState.apply(this, arguments);
    reportNavigation(window.location.href);
  };

  /**
   * Downloads the recorded metadata as a JSON file
   * Note: Due to browser security restrictions, the file will be downloaded to the default download folder.
   * You can then move it to the POC-2-codegen-MetadataInjector-manual folder manually.
   */
  window.downloadMetadata = function() {
    // Flush any remaining input buffer
    for (const entry of Object.values(inputBuffer)) {
      mergeEvent(entry);
    }
    inputBuffer = {};

    const uniqueEvents = Object.values(uniqueEventsByXPath);
    const dataStr = JSON.stringify(uniqueEvents, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    
    // Generate filename with timestamp for uniqueness
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `codegen-metadata-${timestamp}.json`;
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = filename;
    link.click();
    
    console.log(`✅ Downloaded metadata for ${uniqueEvents.length} unique interactions`);
    console.log(`📁 File saved as: ${filename}`);
    console.log(`📂 Please move this file to: src/customRecorder/POC-2-codegen-MetadataInjector-manual/`);
    
    return uniqueEvents;
  };

  /**
   * Shows current metadata count
   */
  window.showMetadataCount = function() {
    const count = Object.keys(uniqueEventsByXPath).length;
    console.log(`📊 Currently recorded ${count} unique element interactions`);
    return count;
  };

  /**
   * Clears all recorded metadata
   */
  window.clearMetadata = function() {
    Object.keys(uniqueEventsByXPath).forEach(key => delete uniqueEventsByXPath[key]);
    inputBuffer = {};
    console.log('🗑️  All metadata cleared');
  };

  /**
   * Enables screenshot capture for each user action (click, input, select, change, navigation).
   * Loads html2canvas from CDN on first call. Call this before interacting if you want screenshots.
   */
  window.enableScreenshotCapture = function() {
    screenshotCaptureEnabled = true;
    return loadHtml2Canvas().then(
      function() {
        console.log('📸 Screenshot capture enabled - each action will capture a screenshot');
      },
      function() {
        screenshotCaptureEnabled = false;
      }
    );
  };

  /**
   * Disables screenshot capture (no new screenshots; existing ones remain until cleared).
   */
  window.disableScreenshotCapture = function() {
    screenshotCaptureEnabled = false;
    console.log('📸 Screenshot capture disabled');
  };

  /**
   * Builds the screenshots HTML string (shared by download and copy).
   * @returns {{ html: string, timestamp: string }|null} HTML and timestamp, or null if no screenshots
   */
  function buildScreenshotsHtml() {
    if (screenshots.length === 0) return null;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const rows = screenshots.map(function(s, i) {
      const time = new Date(s.timestamp).toISOString();
      return '<tr><td>' + (i + 1) + '</td><td>' + s.action + '</td><td>' + (s.label || '-') + '</td><td>' + time + '</td><td><img src="' + s.dataUrl + '" alt="' + s.action + '" style="max-width:600px;border:1px solid #ccc;" /></td></tr>';
    }).join('');
    const html = '<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Screenshots - ' + timestamp + '</title><style>table{border-collapse:collapse}td,th{border:1px solid #999;padding:8px}th{background:#eee}</style></head><body><h1>Screenshots per user action</h1><p>Captured: ' + timestamp + ' (' + screenshots.length + ')</p><table><thead><tr><th>#</th><th>Action</th><th>Label</th><th>Time</th><th>Screenshot</th></tr></thead><tbody>' + rows + '</tbody></table></body></html>';
    return { html: html, timestamp: timestamp };
  }

  /**
   * Downloads all captured screenshots as a single HTML file (open in browser to view/save images).
   * Note: In codegen, the file may go to the browser's download folder. Use copyScreenshotsToClipboard()
   * and paste into a file in your project folder for easy access.
   */
  window.downloadScreenshots = function() {
    const built = buildScreenshotsHtml();
    if (!built) {
      console.log('📸 No screenshots captured. Enable with window.enableScreenshotCapture() and perform actions.');
      return screenshots;
    }
    const blob = new Blob([built.html], { type: 'text/html' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'screenshots-' + built.timestamp + '.html';
    link.click();
    URL.revokeObjectURL(link.href);
    console.log('✅ Downloaded ' + screenshots.length + ' screenshots as HTML: screenshots-' + built.timestamp + '.html');
    return screenshots;
  };

  /**
   * Copies all captured screenshots as HTML to the clipboard. Paste into a new file (e.g. screenshots.html)
   * in your project folder (e.g. src/customRecorder/POC-2-codegen-MetadataInjector-manual/) and save –
   * then open that file in a browser. Use this when running in codegen so the file is in an accessible location.
   */
  window.copyScreenshotsToClipboard = function() {
    const built = buildScreenshotsHtml();
    if (!built) {
      console.log('📸 No screenshots captured. Enable with window.enableScreenshotCapture() and perform actions.');
      return screenshots;
    }
    navigator.clipboard.writeText(built.html).then(
      function() {
        console.log('✅ Screenshots HTML copied to clipboard (' + screenshots.length + ' screenshots)');
        console.log('📂 Paste into a new file (e.g. screenshots.html) in src/customRecorder/POC-2-codegen-MetadataInjector-manual/ and open in browser');
      },
      function(err) {
        console.error('❌ Copy failed (content may be too large for clipboard):', err && err.message ? err.message : err);
        console.log('💡 Try window.downloadScreenshots() and move the file from your Downloads folder');
      }
    );
    return screenshots;
  };

  /**
   * Returns count of captured screenshots
   */
  window.getScreenshotCount = function() {
    console.log('📸 Captured ' + screenshots.length + ' screenshots');
    return screenshots.length;
  };

  /**
   * Clears all captured screenshots
   */
  window.clearScreenshots = function() {
    screenshots.length = 0;
    console.log('🗑️ Screenshots cleared');
  };

  /**
   * Copies the recorded metadata to clipboard as JSON
   * Alternative to downloadMetadata() - you can paste this into a file in the target folder
   */
  window.copyMetadataToClipboard = function() {
    // Flush any remaining input buffer
    for (const entry of Object.values(inputBuffer)) {
      mergeEvent(entry);
    }
    inputBuffer = {};

    const uniqueEvents = Object.values(uniqueEventsByXPath);
    const dataStr = JSON.stringify(uniqueEvents, null, 2);
    
    navigator.clipboard.writeText(dataStr).then(() => {
      console.log(`📋 Metadata copied to clipboard for ${uniqueEvents.length} unique interactions`);
      console.log(`💡 You can now paste this into a new file in: src/customRecorder/POC-2-codegen-MetadataInjector-manual/`);
    }).catch(err => {
      console.error('❌ Failed to copy to clipboard:', err);
      console.log('📄 Metadata data (copy manually):');
      console.log(dataStr);
    });
    
    return uniqueEvents;
  };

  console.log('✅ Metadata recording is now active!');
  console.log('📋 Available commands:');
  console.log('  - window.downloadMetadata() - Download recorded data (with timestamp)');
  console.log('  - window.copyMetadataToClipboard() - Copy data to clipboard');
  console.log('  - window.showMetadataCount() - Show current count');
  console.log('  - window.clearMetadata() - Clear all data');
  console.log('📸 Screenshot commands (enable first):');
  console.log('  - window.enableScreenshotCapture() - Enable screenshot on each action');
  console.log('  - window.copyScreenshotsToClipboard() - Copy HTML to clipboard (paste into file in project folder)');
  console.log('  - window.downloadScreenshots() - Download all screenshots as HTML');
  console.log('  - window.getScreenshotCount() - Show screenshot count');
  console.log('  - window.clearScreenshots() - Clear screenshots');

})();
