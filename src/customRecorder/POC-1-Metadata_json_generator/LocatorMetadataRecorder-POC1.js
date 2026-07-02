/**
 * LocatorMetadataRecorder - Interactive element metadata recording tool
 * @description A Playwright-based tool that records user interactions with web elements and generates
 * comprehensive metadata for each element. This tool helps in creating robust locators by capturing
 * element properties, accessibility information, and interaction patterns.
 * 
 * Features:
 * - Records clicks, inputs, selections, and navigation events
 * - Generates unique element metadata keyed by XPath
 * - Captures accessibility information (ARIA labels, roles, etc.)
 * - Tracks element hierarchy and positioning
 * - Buffers rapid input events to avoid duplicates
 * - Exports recorded data to JSON format
 * 
 * @example
 * ```bash
 * node LocatorMetadataRecorder.js
 * # Navigate to your web application
 * # Interact with elements (click, type, select)
 * # Press Ctrl+C to save recorded metadata
 * ```
 * 
 * @author Playwright Boilerplate Team
 * @version 1.0.0
 */

import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Storage for unique events keyed by XPath to avoid duplicates
 * @type {Object.<string, Object>}
 * @description Each key is an XPath string, value contains element metadata and interaction history
 */
const uniqueEventsByXPath = {};

/**
 * Chromium browser instance for recording interactions
 * @type {Browser}
 */
const browser = await chromium.launch({ headless: false });

/**
 * Browser page instance for recording interactions
 * @type {Page}
 */
const page = await browser.newPage();

/**
 * Buffer for input events to batch rapid inputs per element
 * @type {Object.<string, Object>}
 */
let inputBuffer = {};

/**
 * Timeout reference for flushing input buffer
 * @type {NodeJS.Timeout|null}
 */
let flushTimeout = null;

/**
 * Exposes a function to the browser context for reporting user interactions
 * @description This function is called from the browser context whenever a user interacts with an element.
 * It handles deduplication, buffering of rapid inputs, and merging of interaction data.
 * 
 * @param {Object} data - Interaction data from browser context
 * @param {string} data.action - Type of interaction (click, input, select, change, navigation)
 * @param {Object} data.meta - Element metadata including XPath
 * @param {*} data.value - Value associated with the interaction (for inputs, selects)
 * @param {string} [data.displayText] - Display text for select options
 * @param {string} [data.url] - URL for navigation events
 * @param {number} data.timestamp - Timestamp of the interaction
 */
await page.exposeFunction('reportInteraction', (data) => {
  const key = data.meta?.xpath;
  if (!key) return;

  // For input actions, buffer to batch rapid inputs per element
  if (data.action === 'input') {
    clearTimeout(flushTimeout);
    inputBuffer[key] = data;

    flushTimeout = setTimeout(() => {
      for (const entry of Object.values(inputBuffer)) {
        mergeEvent(entry);
      }
      inputBuffer = {};
    }, 500);
  } else {
    mergeEvent(data);
  }

  /**
   * Merges interaction event data with existing element metadata
   * @param {Object} event - Interaction event data
   * @description Updates existing element metadata or creates new entry if element not seen before.
   * Tracks all actions performed on each element and maintains latest values for inputs/selects.
   */
  function mergeEvent(event) {
    const key = event.meta?.xpath;
    if (!key) return;

    if (uniqueEventsByXPath[key]) {
      // Update timestamp to latest
      uniqueEventsByXPath[key].timestamp = event.timestamp;

      // For inputs and selects, update latest value
      if (event.action === 'input' || event.action === 'select') {
        uniqueEventsByXPath[key].value = event.value;
        if (event.displayText) uniqueEventsByXPath[key].displayText = event.displayText;
      }

      // Keep track of all actions performed on that element
      if (!uniqueEventsByXPath[key].actions) {
        uniqueEventsByXPath[key].actions = [];
      }
      uniqueEventsByXPath[key].actions.push(event.action);
    } else {
      uniqueEventsByXPath[key] = Object.assign({}, event, { actions: [event.action] });
    }
  }
});

/**
 * Adds initialization script to browser context for element interaction tracking
 * @description Injects JavaScript into the browser context to set up event listeners
 * for clicks, inputs, changes, and navigation events. Also provides utility functions
 * for extracting comprehensive element metadata.
 */
await page.addInitScript(() => {
  /**
   * Extracts comprehensive metadata for a DOM element
   * @param {Element} el - DOM element to analyze
   * @returns {Object} Element metadata object
   * @description Generates detailed metadata including tag, attributes, accessibility info,
   * positioning, hierarchy, and XPath for robust locator generation.
   */
  function getElementMetadata(el) {
    if (!el || !el.tagName) return {};

    /**
     * Finds associated label text for form elements
     * @returns {string} Label text or empty string
     * @description Searches for labels using 'for' attribute or parent label elements
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
     * @description Collects parent element information to provide context for element location
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
     * @description Determines ARIA role, accessible name, and description for accessibility testing
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
     * @description Calculates nth-child position and sibling tag information for fallback locators
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
   * @description Creates a unique XPath for element identification and deduplication
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
   * Tracks last click time for navigation correlation
   * @type {number}
   */
  let lastClickTime = 0;

  /**
   * Click event handler for recording click interactions
   * @description Records click events on any element and reports interaction data
   */
  document.addEventListener('click', function(e) {
    lastClickTime = Date.now();
    const el = e.target;
    window.reportInteraction({
      action: 'click',
      meta: getElementMetadata(el),
      timestamp: Date.now(),
    });
  });

  /**
   * Input event handler for recording text input interactions
   * @description Records input events on text fields, excluding select elements
   */
  document.addEventListener('input', function(e) {
    const el = e.target;
    if (el.tagName.toLowerCase() === 'select') return;
    
    window.reportInteraction({
      action: 'input',
      value: el.value,
      meta: getElementMetadata(el),
      timestamp: Date.now(),
    });
  });

  /**
   * Change event handler for recording form control changes
   * @description Records changes to select elements, checkboxes, and radio buttons
   */
  document.addEventListener('change', function(e) {
    const el = e.target;
    
    if (el.tagName.toLowerCase() === 'select') {
      const selectedText = el.options[el.selectedIndex] ? el.options[el.selectedIndex].text : '';
      window.reportInteraction({
        action: 'select',
        value: el.value,
        displayText: selectedText,
        meta: getElementMetadata(el),
        timestamp: Date.now(),
      });
    } else if (el.type === 'checkbox' || el.type === 'radio') {
      window.reportInteraction({
        action: 'change',
        value: el.checked,
        meta: getElementMetadata(el),
        timestamp: Date.now(),
      });
    }
  });

  /**
   * Reports navigation events to track page changes
   * @param {string} url - URL of the navigation
   * @description Tracks navigation events and correlates them with click events
   */
  const reportNavigation = (url) => {
    if (window.top !== window) return;
    if (!window._firstNavigationReported) {
      window._firstNavigationReported = true;
      window.reportInteraction({
        action: 'navigation',
        url: url,
        timestamp: Date.now(),
      });
      return;
    }
    if (Date.now() - lastClickTime < 800) {
      window.reportInteraction({
        action: 'navigation',
        url: url,
        timestamp: Date.now(),
      });
    }
  };

  /**
   * Browser back/forward navigation tracking
   * @description Monitors popstate events for browser navigation
   */
  window.addEventListener('popstate', function() {
    reportNavigation(window.location.href);
  });

  /**
   * History API navigation tracking - pushState
   * @description Monitors programmatic navigation via history.pushState
   */
  const _pushState = history.pushState;
  history.pushState = function() {
    _pushState.apply(this, arguments);
    reportNavigation(window.location.href);
  };

  /**
   * History API navigation tracking - replaceState
   * @description Monitors programmatic navigation via history.replaceState
   */
  const _replaceState = history.replaceState;
  history.replaceState = function() {
    _replaceState.apply(this, arguments);
    reportNavigation(window.location.href);
  };
});

/**
 * Navigate to blank page to start recording
 * @description Initializes the recording session by navigating to a blank page
 */
await page.goto('about:blank');
console.log('🎬 Recording metadata uniquely keyed by XPath... Press Ctrl+C to stop\n');

/**
 * Handles graceful shutdown on Ctrl+C
 * @description Flushes remaining input buffer, saves recorded data to JSON file, and closes browser
 */
process.on('SIGINT', async () => {
  // Flush any remaining input buffer
  for (const entry of Object.values(inputBuffer)) {
    const key = entry.meta?.xpath;
    if (key) {
      if (uniqueEventsByXPath[key]) {
        uniqueEventsByXPath[key] = Object.assign({}, uniqueEventsByXPath[key], entry, { timestamp: entry.timestamp });
      } else {
        uniqueEventsByXPath[key] = entry;
      }
    }
  }
  inputBuffer = {};

  const uniqueEvents = Object.values(uniqueEventsByXPath);
  const outPath = path.join(__dirname, 'recorded-elements.json');
  fs.writeFileSync(outPath, JSON.stringify(uniqueEvents, null, 2));
  console.log('\n✅ Saved unique metadata to: ' + outPath);
  console.log(`📊 Captured ${uniqueEvents.length} unique interactions`);
  await browser.close();
  process.exit(0);
});