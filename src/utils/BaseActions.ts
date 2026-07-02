
import { Page, Locator, expect, TestInfo, Frame, FrameLocator, Route, Request, Response, Cookie } from '@playwright/test';
import { SelfHealingHelper } from './SelfHealingHelper';
import config from 'environment/env';
import { ScreenshotHelper } from './ScreenShotsHelper';
import { BaseHelper } from './BaseHelper';

const SELF_HEAL_ENABLED = config.selfhealEnabled === 'true';

export class BaseActions extends BaseHelper {

  // ──────────────────────────────────────────────────────────────────────────
  // #region CORE INTERACTIONS — CLICK, FILL, SELECT & HOVER
  // ──────────────────────────────────────────────────────────────────────────


  /**
   * Enhanced click method with extensive error handling, logging, and self-healing capabilities
   * @param locator - Element locator to click (can use locator.describe() for better error messages)
   * @param options - Click configuration options
   * @param options.timeout - Maximum time to wait for element (default: 10000ms)
   * @param options.waitForNavigation - Whether to wait for navigation after click (default: false)
   * @param options.expectedUrl - Expected URL pattern after navigation
   * @param options.force - Force click even if element is not actionable (default: false)
   * @param options.button - Mouse button to use (default: 'left')
   * @param options.clickCount - Number of clicks to perform (default: 1)
   * @returns Promise that resolves when click is successful
   * @throws Error with detailed diagnostics if click fails after self-healing attempts
   * @example
   * ```typescript
   * await actions.click(loginButton, { waitForNavigation: true });
   * ```
   * @example
   * ```typescript
   * await actions.click(submitBtn, { 
   *   expectedUrl: /dashboard/,
   *   timeout: 15000 
   * });
   * ```
   */
  async click(locator: Locator, options?: {
    timeout?: number;
    waitForNavigation?: boolean;
    /**
     * Load state to wait for when `waitForNavigation` is `true`.
     * Defaults to `'load'`.  Use `'networkidle'` only when the page has settled
     * API calls you need to wait for.
     */
    loadState?: 'load' | 'domcontentloaded' | 'networkidle';
    expectedUrl?: string | RegExp;
    force?: boolean;
    button?: 'left' | 'right' | 'middle';
    clickCount?: number;
  }): Promise<void> {
    const timeout = options?.timeout || 10000;
    const startTime = Date.now();
    const description = this.getDescription(locator);
  
    try {
      console.log(`🔄 Attempting to click:`, description || locator);
  
      await locator.waitFor({ state: 'visible', timeout });
      await locator.scrollIntoViewIfNeeded({ timeout });
      await this.highlightElement(locator);
  
      // Step 1: Click
      await locator.click({
        timeout,
        force: options?.force,
        button: options?.button,
        clickCount: options?.clickCount || 1
      });
  
      // Step 2: Wait for navigation or expected URL
      if (options?.expectedUrl) {
        await this.page.waitForURL(options.expectedUrl, { timeout });
      } else if (options?.waitForNavigation) {
        await this.page.waitForLoadState(options.loadState ?? 'load', { timeout });
      }
  
      const duration = Date.now() - startTime;
      console.log(`✅ Successfully clicked:`, description || locator, `(${duration}ms)`);
      await ScreenshotHelper.takeScreenshot(this.page, `click_element ${description}`, this.testInfo);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Failed to click:`, description || locator, `(${duration}ms)`);
      await ScreenshotHelper.takeFailureScreenshot(this.page, `click_failed_element ${description}`, this.testInfo);
      const errorDetails = await this.gatherElementDiagnostics(locator);
  
      if (SelfHealingHelper.isLocatorError(error as Error) && SELF_HEAL_ENABLED) {
        return await SelfHealingHelper.trySelfHealing(
          this.page,
          locator,
          description,
          async (healedLocator) => {
            await healedLocator.click({
              timeout,
              force: options?.force,
              button: options?.button,
              clickCount: options?.clickCount || 1
            });
          }
        );
      }
  
      throw new Error(`Failed to click element after ${duration}ms. ${errorDetails}. Original error: ${(error as Error).message}`);
    }
  }
  

  /**
   * Enhanced fill method with validation, error handling, and self-healing capabilities
   * @param locator - Input field locator (can use locator.describe() for better error messages)
   * @param value - Text value to fill into the input field
   * @param options - Fill configuration options
   * @param options.timeout - Maximum time to wait for element (default: 10000ms)
   * @param options.clearFirst - Whether to clear field before filling (default: true)
   * @param options.validateInput - Whether to validate the input after filling (default: true)
   * @param options.pressTab - Whether to press Tab key after filling (default: false)
   * @returns Promise that resolves when fill is successful
   * @throws Error with detailed diagnostics if fill fails after self-healing attempts
   * @example
   * ```typescript
   * await actions.fill(usernameField, 'testuser');
   * ```
   * @example
   * ```typescript
   * await actions.fill(passwordField, 'password123', {
   *   validateInput: true,
   *   pressTab: true
   * });
   * ```
   */
  async fill(locator: Locator, value: string, options?: {
    timeout?: number;
    clearFirst?: boolean;
    validateInput?: boolean;
    pressTab?: boolean;
  }): Promise<void> {
    const timeout = options?.timeout || 10000;
    const startTime = Date.now();
    const description = this.getDescription(locator);
    try {
      console.log(`🔄 Attempting to fill:`, description || locator, `with value: "${value}"`);
      await locator.waitFor({ state: 'visible', timeout });
      await locator.scrollIntoViewIfNeeded({ timeout });
      await this.highlightElement(locator);
      if (options?.clearFirst !== false) {
        await locator.clear({ timeout });
      }
      await locator.fill(value, { timeout });
      if (options?.validateInput !== false) {
        await expect(locator).toHaveValue(value, { timeout });
      }
      if (options?.pressTab) {
        await locator.press('Tab');
      }
      const duration = Date.now() - startTime;
      console.log(`✅ Successfully filled:`, description || locator, `(${duration}ms)`);
      await ScreenshotHelper.takeScreenshot(this.page, `fill_element ${description}`, this.testInfo);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Failed to fill:`, description || locator, `(${duration}ms)`);
      await ScreenshotHelper.takeFailureScreenshot(this.page, `fill_failed_element ${description}`, this.testInfo);
      const errorDetails = await this.gatherElementDiagnostics(locator);

      if (SelfHealingHelper.isLocatorError(error as Error) && SELF_HEAL_ENABLED) {
        return await SelfHealingHelper.trySelfHealing(
          this.page,
          locator,
          description,
          async (healedLocator) => {
            if (options?.clearFirst !== false) {
              await healedLocator.clear({ timeout });
            }
            await healedLocator.fill(value, { timeout });
            if (options?.validateInput !== false) {
              await expect(healedLocator).toHaveValue(value, { timeout });
            }
            if (options?.pressTab) {
              await healedLocator.press('Tab');
            }
          }
        );
      }

      throw new Error(`Failed to fill element with "${value}" after ${duration}ms. ${errorDetails}. Original error: ${(error as Error).message}`);
    }
  }

  /**
   * Enhanced select method for dropdown elements with error handling and self-healing
   * @param locator - Select element locator (can use locator.describe() for better error messages)
   * @param value - Option value(s) to select (string, string array, or number for index)
   * @param options - Select configuration options
   * @param options.timeout - Maximum time to wait for element (default: 10000ms)
   * @param options.byValue - Select by option value attribute (default: false)
   * @param options.byLabel - Select by option label text (default: true)
   * @param options.byIndex - Select by option index (default: false)
   * @returns Promise that resolves when selection is successful
   * @throws Error with detailed diagnostics if selection fails after self-healing attempts
   * @example
   * ```typescript
   * await actions.select(countryDropdown, 'United States');
   * ```
   * @example
   * ```typescript
   * await actions.select(sizeSelect, 'large', { byValue: true });
   * ```
   */
  async select(locator: Locator, value: string | number | Array<string | number>, options?: {
    timeout?: number;
    byValue?: boolean;
    byLabel?: boolean;
    byIndex?: boolean;
    validateSelection?: boolean;
  }): Promise<void> {
    const timeout = options?.timeout || 10000;
    const startTime = Date.now();
    const description = this.getDescription(locator);
    try {
      console.log(`🔄 Attempting to select value: "${value}" in`, description || locator);
      await locator.waitFor({ state: 'visible', timeout });
      await locator.scrollIntoViewIfNeeded({ timeout });
      await this.highlightElement(locator);
      const values = Array.isArray(value) ? value : [value];
      const normalizedValues = values.map((v) => String(v));

      if (options?.byValue) {
        await locator.selectOption(normalizedValues.map((v) => ({ value: v })), { timeout });
      } else if (options?.byIndex) {
        const indices = values.map((v) => {
          const parsed = typeof v === 'number' ? v : parseInt(String(v), 10);
          if (Number.isNaN(parsed)) {
            throw new Error(`Invalid index value for select(): ${v}`);
          }
          return parsed;
        });
        await locator.selectOption(indices.map((index) => ({ index })), { timeout });
      } else {
        await locator.selectOption(normalizedValues.map((label) => ({ label })), { timeout });
      }

      if (options?.validateSelection) {
        const selectedData = await locator.evaluate((selectElement) => {
          const select = selectElement as HTMLSelectElement;
          return Array.from(select.selectedOptions).map((option) => ({
            value: option.value,
            label: option.label
          }));
        });
        if (selectedData.length !== values.length) {
          throw new Error(`Selection validation failed. Expected ${values.length} selected option(s), got ${selectedData.length}.`);
        }
      }

      const duration = Date.now() - startTime;
      console.log(`✅ Successfully selected value in`, description || locator, `(${duration}ms)`);
      await ScreenshotHelper.takeScreenshot(this.page, `select_element ${description}`, this.testInfo);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Failed to select value in`, description || locator, `(${duration}ms)`);
      await ScreenshotHelper.takeFailureScreenshot(this.page, `select_failed_element ${description}`, this.testInfo);
      const errorDetails = await this.gatherElementDiagnostics(locator);

      if (SelfHealingHelper.isLocatorError(error as Error) && SELF_HEAL_ENABLED) {
        return await SelfHealingHelper.trySelfHealing(
          this.page,
          locator,
          description,
          async (healedLocator) => {
            const values = Array.isArray(value) ? value : [value];
            const normalizedValues = values.map((v) => String(v));
            if (options?.byValue) {
              await healedLocator.selectOption(normalizedValues.map((v) => ({ value: v })), { timeout });
            } else if (options?.byIndex) {
              const indices = values.map((v) => {
                const parsed = typeof v === 'number' ? v : parseInt(String(v), 10);
                if (Number.isNaN(parsed)) {
                  throw new Error(`Invalid index value for select(): ${v}`);
                }
                return parsed;
              });
              await healedLocator.selectOption(indices.map((index) => ({ index })), { timeout });
            } else {
              await healedLocator.selectOption(normalizedValues.map((label) => ({ label })), { timeout });
            }
            if (options?.validateSelection) {
              const selectedData = await healedLocator.evaluate((selectElement) => {
                const select = selectElement as HTMLSelectElement;
                return Array.from(select.selectedOptions).map((option) => ({
                  value: option.value,
                  label: option.label
                }));
              });
              if (selectedData.length !== values.length) {
                throw new Error(`Selection validation failed after healing. Expected ${values.length} selected option(s), got ${selectedData.length}.`);
              }
            }
          }
        );
      }

      throw new Error(`Failed to select "${value}" in element after ${duration}ms. ${errorDetails}. Original error: ${(error as Error).message}`);
    }
  }

  /**
   * Enhanced hover method with error handling and self-healing capabilities
   * @param locator - Element locator to hover over (can use locator.describe() for better error messages)
   * @param options - Hover configuration options
   * @param options.timeout - Maximum time to wait for element (default: 10000ms)
   * @param options.position - Specific position to hover (x, y coordinates)
   * @returns Promise that resolves when hover is successful
   * @throws Error with detailed diagnostics if hover fails after self-healing attempts
   * @example
   * ```typescript
   * await actions.hover(menuItem);
   * ```
   * @example
   * ```typescript
   * await actions.hover(tooltipTrigger, { position: { x: 10, y: 5 } });
   * ```
   */
  async hover(locator: Locator, options?: {
    timeout?: number;
    position?: { x: number; y: number };
  }): Promise<void> {
    const timeout = options?.timeout || 10000;
    const startTime = Date.now();
    const description = this.getDescription(locator);
    try {
      console.log(`🔄 Attempting to hover over:`, description || locator);
      await locator.waitFor({ state: 'visible', timeout });
      await locator.scrollIntoViewIfNeeded({ timeout });
      await this.highlightElement(locator);
      await locator.hover({
        timeout,
        position: options?.position
      });
      const duration = Date.now() - startTime;
      console.log(`✅ Successfully hovered over:`, description || locator, `(${duration}ms)`);
      await ScreenshotHelper.takeScreenshot(this.page, `hover_element ${description}`, this.testInfo);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Failed to hover over:`, description || locator, `(${duration}ms)`);
      await ScreenshotHelper.takeFailureScreenshot(this.page, `hover_failed_element ${description}`, this.testInfo);
      const errorDetails = await this.gatherElementDiagnostics(locator);

      if (SelfHealingHelper.isLocatorError(error as Error) && SELF_HEAL_ENABLED) {
        return await SelfHealingHelper.trySelfHealing(
          this.page,
          locator,
          description,
          async (healedLocator) => {
            await healedLocator.hover({
              timeout,
              position: options?.position
            });
          }
        );
      }

      throw new Error(`Failed to hover over element after ${duration}ms. ${errorDetails}. Original error: ${(error as Error).message}`);
    }
  }

  // #endregion

  // ──────────────────────────────────────────────────────────────────────────
  // #region WAIT & NAVIGATION
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Wait for element to reach specified state with enhanced error handling and self-healing
   * @param locator - Element locator to wait for (can use locator.describe() for better error messages)
   * @param options - Wait configuration options
   * @param options.state - Element state to wait for (default: 'visible')
   * @param options.timeout - Maximum time to wait (default: 10000ms)
   * @returns Promise that resolves when element reaches specified state
   * @throws Error with detailed diagnostics if wait fails after self-healing attempts
   * @example
   * ```typescript
   * await actions.waitForElement(loadingSpinner, { state: 'hidden' });
   * ```
   * @example
   * ```typescript
   * await actions.waitForElement(errorMessage, { 
   *   state: 'visible',
   *   timeout: 5000 
   * });
   * ```
   */
  async waitForElement(locator: Locator, options?: {
    state?: 'visible' | 'hidden' | 'attached' | 'detached';
    timeout?: number;
  }): Promise<void> {
    const timeout = options?.timeout || 10000;
    const state = options?.state || 'visible';
    const startTime = Date.now();
    const description = this.getDescription(locator);
    try {
      console.log(`🔄 Waiting for`, description || locator, `to be ${state}`);
      await locator.waitFor({ state, timeout });
      const duration = Date.now() - startTime;
      console.log(`✅`, description || locator, `is now ${state} (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌`, description || locator, `did not become ${state} (${duration}ms)`);
      await ScreenshotHelper.takeFailureScreenshot(this.page, `wait_failed_element ${description}`, this.testInfo);
      const errorDetails = await this.gatherElementDiagnostics(locator);

      if (SelfHealingHelper.isLocatorError(error as Error) && SELF_HEAL_ENABLED) {
        return await SelfHealingHelper.trySelfHealing(
          this.page,
          locator,
          description,
          async (healedLocator) => {
            await healedLocator.waitFor({
              state,
              timeout
            });
          }
        );
      }

      throw new Error(`Element did not become ${state} within ${timeout}ms. ${errorDetails}. Original error: ${(error as Error).message}`);
    }
  }

  /**
   * Navigate to URL with enhanced error handling and load state management
   * @param url - URL to navigate to
   * @param options - Navigation configuration options
   * @param options.waitForLoadState - Load state to wait for (default: 'networkidle')
   * @param options.timeout - Maximum time to wait for navigation (default: 30000ms)
   * @param options.referer - Referer header for the request
   * @returns Promise that resolves when navigation is successful
   * @throws Error with current URL and load state details if navigation fails
   * @example
   * ```typescript
   * await actions.navigateTo('https://example.com');
   * ```
   * @example
   * ```typescript
   * await actions.navigateTo('/dashboard', {
   *   waitForLoadState: 'domcontentloaded',
   *   timeout: 15000
   * });
   * ```
   */
  async navigateTo(url: string, options?: {
    waitForLoadState?: 'load' | 'domcontentloaded' | 'networkidle';
    timeout?: number;
    referer?: string;
  }): Promise<void> {
    const timeout = options?.timeout || 30000;
    const waitForLoadState = options?.waitForLoadState || 'load';
    const startTime = Date.now();

    try {
      console.log(`🔄 Navigating to: ${url}`);

      const performNavigation = async () => {
        await this.page.goto(url, {
          timeout,
          waitUntil: waitForLoadState,
          referer: options?.referer
        });
      };

      try {
        await performNavigation();
      } catch (firstError) {
        const firstMessage = (firstError as Error).message || '';
        const currentUrl = this.page.url();
        const isTransientNavigationInterruption =
          firstMessage.includes('interrupted by another navigation') ||
          firstMessage.includes('chrome-error://chromewebdata/') ||
          currentUrl.startsWith('chrome-error://');

        if (!isTransientNavigationInterruption) {
          throw firstError;
        }

        // Occasionally Chrome lands on chrome-error:// after an aborted/failed request.
        // A short pause + one retry makes navigation robust without masking real failures.
        console.warn(`⚠️ Transient navigation interruption detected. Retrying navigateTo once for: ${url}`);
        await this.page.waitForTimeout(300);
        await performNavigation();
      }

      const duration = Date.now() - startTime;
      console.log(`✅ Successfully navigated to: ${url} (${duration}ms)`);

      await ScreenshotHelper.takeScreenshot(this.page, 'navigation_success', this.testInfo);

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Failed to navigate to: ${url} (${duration}ms)`);

      await ScreenshotHelper.takeFailureScreenshot(this.page, 'navigation_failed', this.testInfo);

      const details = `Current URL: ${this.page.url()}, Load State: ${waitForLoadState}`;
      throw new Error(`Failed to navigate to "${url}" after ${duration}ms. ${details}. Original error: ${(error as Error).message}`);
    }
  }

  /**
   * Press keyboard key on page or focused element with error handling
   * @param key - Keyboard key to press (e.g., 'Enter', 'Tab', 'Escape', 'ArrowDown')
   * @param locator - Optional element to focus before pressing key (can use locator.describe() for better error messages)
   * @returns Promise that resolves when key press is successful
   * @throws Error with detailed diagnostics if key press fails after self-healing attempts
   * @example
   * ```typescript
   * await actions.pressKey('Enter');
   * ```
   * @example
   * ```typescript
   * await actions.pressKey('Tab', usernameField);
   * ```
   */
  async pressKey(key: string, locator?: Locator): Promise<void> {
    const startTime = Date.now();

    try {
      if (locator) {
        const description = this.getDescription(locator);
        console.log(`🔄 Pressing key: ${key} on ${description || locator}`);
        await locator.press(key);
        const duration = Date.now() - startTime;
        console.log(`✅ Successfully pressed key: ${key} on ${description || locator} (${duration}ms)`);
      } else {
        console.log(`🔄 Pressing key: ${key} on page`);
        await this.page.keyboard.press(key);
        const duration = Date.now() - startTime;
        console.log(`✅ Successfully pressed key: ${key} on page (${duration}ms)`);
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Failed to press key: ${key} (${duration}ms)`);

      if (locator) {
        const description = this.getDescription(locator);
        const errorDetails = await this.gatherElementDiagnostics(locator);

        if (SelfHealingHelper.isLocatorError(error as Error) && SELF_HEAL_ENABLED) {
          return await SelfHealingHelper.trySelfHealing(
            this.page,
            locator,
            description,
            async (healedLocator) => {
              await healedLocator.press(key);
            }
          );
        }
        throw new Error(`Failed to press key "${key}" after ${duration}ms. ${errorDetails}. Original error: ${(error as Error).message}`);
      }

      throw new Error(`Failed to press key "${key}" after ${duration}ms. Original error: ${(error as Error).message}`);
    }
  }

  /**
   * Type text character by character with configurable delay and self-healing
   * @param locator - Element locator to type into (can use locator.describe() for better error messages)
   * @param text - Text to type character by character
   * @param options - Type configuration options
   * @param options.delay - Delay between each character in milliseconds (default: 100ms)
   * @param options.timeout - Maximum time to wait for element (default: 10000ms)
   * @returns Promise that resolves when typing is successful
   * @throws Error with detailed diagnostics if typing fails after self-healing attempts
   * @example
   * ```typescript
   * await actions.typeText(searchField, 'search query');
   * ```
   * @example
   * ```typescript
   * await actions.typeText(commentBox, 'Long comment text', {
   *   delay: 50 // Faster typing
   * });
   * ```
   */
  async typeText(locator: Locator, text: string, options?: {
    delay?: number;
    timeout?: number;
  }): Promise<void> {
    const timeout = options?.timeout || 10000;
    const delay = options?.delay || 100;
    const startTime = Date.now();
    const description = this.getDescription(locator);
    try {
      console.log(`🔄 Typing text in:`, description || locator, `with delay: ${delay}ms`);
      await locator.waitFor({ state: 'visible', timeout });
      await locator.scrollIntoViewIfNeeded({ timeout });
      await this.highlightElement(locator);
      await locator.pressSequentially(text, { delay });
      const duration = Date.now() - startTime;
      console.log(`✅ Successfully typed text in:`, description || locator, `(${duration}ms)`);
      await ScreenshotHelper.takeScreenshot(this.page, `type_element ${description}`, this.testInfo);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Failed to type text in:`, description || locator, `(${duration}ms)`);
      await ScreenshotHelper.takeFailureScreenshot(this.page, `type_failed_element ${description}`, this.testInfo);
      const errorDetails = await this.gatherElementDiagnostics(locator);

      if (SelfHealingHelper.isLocatorError(error as Error) && SELF_HEAL_ENABLED) {
        return await SelfHealingHelper.trySelfHealing(
          this.page,
          locator,
          description,
          async (healedLocator) => {
            await healedLocator.pressSequentially(text, { delay });
          }
        );
      }

      throw new Error(`Failed to type text in element after ${duration}ms. ${errorDetails}. Original error: ${(error as Error).message}`);
    }
  }

  /**
   * Scroll to element or specific position with error handling and self-healing
   * @param options - Scroll configuration options
   * @param options.locator - Element locator to scroll to
   * @param options.x - X coordinate to scroll to
   * @param options.y - Y coordinate to scroll to
   * @param options.behavior - Scroll behavior ('auto' or 'smooth', default: 'auto')
   * @returns Promise that resolves when scrolling is successful
   * @throws Error with detailed diagnostics if scrolling fails after self-healing attempts
   * @example
   * ```typescript
   * await actions.scrollTo({ locator: footerElement });
   * ```
   * @example
   * ```typescript
   * await actions.scrollTo({ x: 0, y: 500, behavior: 'smooth' });
   * ```
   */
  async scrollTo(options: {
    locator?: Locator;
    x?: number;
    y?: number;
    behavior?: 'auto' | 'smooth';
  }): Promise<void> {
    const startTime = Date.now();

    try {
      if (options.locator) {
        const description = this.getDescription(options.locator);
        console.log(`🔄 Scrolling to`, description || options.locator);
        await options.locator.scrollIntoViewIfNeeded();
        await this.highlightElement(options.locator);
      } else if (options.x !== undefined && options.y !== undefined) {
        console.log(`🔄 Scrolling to position: (${options.x}, ${options.y})`);
        await this.page.evaluate(({ x, y, behavior }) => {
          window.scrollTo({ left: x, top: y, behavior: behavior as ScrollBehavior });
        }, { x: options.x, y: options.y, behavior: options.behavior || 'auto' });
      }

      const duration = Date.now() - startTime;
      console.log(`✅ Successfully scrolled (${duration}ms)`);
      await ScreenshotHelper.takeScreenshot(this.page, `scroll`, this.testInfo);

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Failed to scroll (${duration}ms)`);

      if (options.locator) {
        const description = this.getDescription(options.locator);
        const errorDetails = await this.gatherElementDiagnostics(options.locator);

        if (SelfHealingHelper.isLocatorError(error as Error) && SELF_HEAL_ENABLED) {
          return await SelfHealingHelper.trySelfHealing(
            this.page,
            options.locator,
            description,
            async (healedLocator) => {
              await healedLocator.scrollIntoViewIfNeeded();
            }
          );
        }
        throw new Error(`Failed to scroll to element after ${duration}ms. ${errorDetails}. Original error: ${(error as Error).message}`);
      }

      throw new Error(`Failed to scroll after ${duration}ms. Original error: ${(error as Error).message}`);
    }
  }

  // #endregion (WAIT & NAVIGATION — ends here; private helper follows)

  // ──────────────────────────────────────────────────────────────────────────
  // #region PRIVATE HELPERS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Briefly highlight an element with a red border and yellow background for visual
   * debugging.  Failures are silently swallowed — highlighting is never allowed to
   * break or slow down a test.
   */
  private async highlightElement(locator: Locator): Promise<void> {
    try {
      await locator.evaluate((el) => {
        const prev = { border: el.style.border, bg: el.style.backgroundColor, opacity: el.style.opacity };
        el.style.border = '3px solid red';
        el.style.backgroundColor = 'yellow';
        el.style.opacity = '0.8';
        setTimeout(() => {
          el.style.border = prev.border;
          el.style.backgroundColor = prev.bg;
          el.style.opacity = prev.opacity;
        }, 1000);
      });
    } catch {
      // Highlighting is best-effort — never fail the test for this
    }
  }

  // #endregion (PRIVATE HELPERS)

  // ──────────────────────────────────────────────────────────────────────────
  // #region PAGE STATE & ELEMENT GETTERS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Wait for page to reach specified load state with timeout and URL validation
   * @param options - Wait configuration options
   * @param options.state - Load state to wait for (default: 'networkidle')
   * @param options.timeout - Maximum time to wait (default: 30000ms)
   * @param options.expectedUrl - Expected URL pattern to validate
   * @returns Promise that resolves when page load is successful
   * @throws Error with current URL and expected state details if wait fails
   * @example
   * ```typescript
   * await actions.waitForPageLoad();
   * ```
   * @example
   * ```typescript
   * await actions.waitForPageLoad({
   *   state: 'domcontentloaded',
   *   expectedUrl: /dashboard/
   * });
   * ```
   */
  async waitForPageLoad(options?: {
    /**
     * Load state to wait for.
     * - `'load'` (default) — fires when the page and all sub-resources finish loading.
     * - `'domcontentloaded'` — fires when the HTML is parsed; faster but sub-resources may still be loading.
     * - `'networkidle'` — waits until no network connections for 500 ms; use only when necessary
     *   as it is slow and unreliable on SPAs with background polling or websockets.
     */
    state?: 'load' | 'domcontentloaded' | 'networkidle';
    timeout?: number;
    expectedUrl?: string | RegExp;
  }): Promise<void> {
    const timeout = options?.timeout || 30000;
    const state = options?.state || 'load';
    const startTime = Date.now();

    try {
      console.log(`🔄 Waiting for page to load (${state})`);

      if (options?.expectedUrl) {
        await Promise.all([
          this.page.waitForLoadState(state, { timeout }),
          this.page.waitForURL(options.expectedUrl, { timeout })
        ]);
      } else {
        await this.page.waitForLoadState(state, { timeout });
      }

      const duration = Date.now() - startTime;
      console.log(`✅ Page loaded successfully (${duration}ms)`);
      if (options?.expectedUrl) {
        console.log(`✅ URL matches expected pattern:`, options.expectedUrl);
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Page failed to load (${duration}ms)`);
      if (options?.expectedUrl) {
        console.error(`❌ Current URL:`, this.page.url());
        console.error(`❌ Expected URL:`, options.expectedUrl);
      }

      const details = `Current URL: ${this.page.url()}, State: ${state}, Expected URL: ${options?.expectedUrl || 'not specified'}`;
      throw new Error(`Page failed to load within ${timeout}ms. ${details}. Original error: ${(error as Error).message}`);
    }
  }

  /**
   * Wait for URL to match expected pattern with optional load-state synchronization.
   * @param expectedUrl - Expected URL string or regex
   * @param options - Wait options
   * @param options.timeout - Maximum wait time (default: 30000ms)
   * @param options.waitForLoadState - Optional page load state to await after URL match
   * @throws Error when URL does not match within timeout
   */
  async waitForURL(expectedUrl: string | RegExp, options?: {
    timeout?: number;
    waitForLoadState?: 'load' | 'domcontentloaded' | 'networkidle';
  }): Promise<void> {
    const timeout = options?.timeout || 30000;
    const startTime = Date.now();
    try {
      await this.page.waitForURL(expectedUrl, { timeout });
      if (options?.waitForLoadState) {
        await this.page.waitForLoadState(options.waitForLoadState, { timeout });
      }
      const duration = Date.now() - startTime;
      console.log(`✅ URL matched successfully (${duration}ms): ${expectedUrl}`);
    } catch (error) {
      const duration = Date.now() - startTime;
      throw new Error(`Failed waitForURL(${expectedUrl}) after ${duration}ms. Current URL: ${this.page.url()}. Original error: ${(error as Error).message}`);
    }
  }

  /**
   * Get element text content with error handling and self-healing
   * @param locator - Element locator (can use locator.describe() for better error messages)
   * @returns Promise resolving to element's text content (empty string if no text)
   * @throws Error with detailed diagnostics if text retrieval fails after self-healing attempts
   * @example
   * ```typescript
   * const text = await actions.getElementText(headingElement);
   * console.log(text); // 'Welcome to our site'
   * ```
   */
  async getElementText(locator: Locator): Promise<string> {
    const description = this.getDescription(locator);
    try {
      await locator.waitFor({ state: 'visible', timeout: 10000 });
      const text = await locator.textContent();
      console.log(`📄 Retrieved text from:`, description || locator, `: "${text}"`);
      return text || '';
    } catch (error) {
      console.error(`❌ Failed to get text from:`, description || locator);
      const errorDetails = await this.gatherElementDiagnostics(locator);

      if (SelfHealingHelper.isLocatorError(error as Error) && SELF_HEAL_ENABLED) {
        return await SelfHealingHelper.trySelfHealing(
          this.page,
          locator,
          description,
          async (healedLocator) => {
            await healedLocator.waitFor({ state: 'visible', timeout: 10000 });
            const text = await healedLocator.textContent();
            return text || '';
          }
        );
      }

      throw new Error(`Failed to get text from element. ${errorDetails}. Original error: ${(error as Error).message}`);
    }
  }

  /**
   * Get element attribute value with error handling and self-healing
   * @param locator - Element locator (can use locator.describe() for better error messages)
   * @param attributeName - Name of the attribute to retrieve (e.g., 'href', 'src', 'class')
   * @returns Promise resolving to attribute value or null if attribute doesn't exist
   * @throws Error with detailed diagnostics if attribute retrieval fails after self-healing attempts
   * @example
   * ```typescript
   * const href = await actions.getElementAttribute(linkElement, 'href');
   * console.log(href); // 'https://example.com'
   * ```
   * @example
   * ```typescript
   * const className = await actions.getElementAttribute(divElement, 'class');
   * console.log(className); // 'container main-content'
   * ```
   */
  async getElementAttribute(locator: Locator, attributeName: string): Promise<string | null> {
    const description = this.getDescription(locator);
    try {
      await locator.waitFor({ state: 'attached', timeout: 10000 });
      const attribute = await locator.getAttribute(attributeName);
      console.log(`📄 Retrieved ${attributeName} attribute from:`, description || locator, `: "${attribute}"`);
      return attribute;
    } catch (error) {
      console.error(`❌ Failed to get ${attributeName} attribute from:`, description || locator);
      const errorDetails = await this.gatherElementDiagnostics(locator);

      if (SelfHealingHelper.isLocatorError(error as Error) && SELF_HEAL_ENABLED) {
        return await SelfHealingHelper.trySelfHealing(
          this.page,
          locator,
          description,
          async (healedLocator) => {
            await healedLocator.waitFor({ state: 'attached', timeout: 10000 });
            return await healedLocator.getAttribute(attributeName);
          }
        );
      }

      throw new Error(`Failed to get ${attributeName} attribute from element. ${errorDetails}. Original error: ${(error as Error).message}`);
    }
  }

  // #endregion

  // ──────────────────────────────────────────────────────────────────────────
  // #region MOUSE PRECISION, DRAG, KEYBOARD & SCROLL
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Move mouse cursor to specific viewport coordinates.
   * @param x - Target X coordinate in viewport
   * @param y - Target Y coordinate in viewport
   * @param options - Mouse move configuration
   * @param options.steps - Number of intermediate steps to simulate natural movement
   * @throws Error when mouse movement fails
   */
  async moveMouse(x: number, y: number, options?: {
    steps?: number;
  }): Promise<void> {
    const startTime = Date.now();
    try {
      console.log(`🔄 Moving mouse to (${x}, ${y})`);
      await this.page.mouse.move(x, y, { steps: options?.steps });
      const duration = Date.now() - startTime;
      console.log(`✅ Successfully moved mouse to (${x}, ${y}) (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Failed to move mouse to (${x}, ${y}) (${duration}ms)`);
      await ScreenshotHelper.takeFailureScreenshot(this.page, 'mouse_move_failed', this.testInfo);
      throw new Error(`Failed to move mouse to (${x}, ${y}) after ${duration}ms. Original error: ${(error as Error).message}`);
    }
  }

  /**
   * Hold mouse button down (drag start or press-and-hold interactions).
   * @param options - Mouse down configuration
   * @param options.button - Mouse button to hold (default: 'left')
   * @param options.clickCount - Click count metadata for underlying event
   * @throws Error when mouse down fails
   */
  async mouseDown(options?: {
    button?: 'left' | 'right' | 'middle';
    clickCount?: number;
  }): Promise<void> {
    const startTime = Date.now();
    try {
      console.log(`🔄 Pressing mouse down (${options?.button || 'left'})`);
      await this.page.mouse.down({
        button: options?.button || 'left',
        clickCount: options?.clickCount
      });
      const duration = Date.now() - startTime;
      console.log(`✅ Mouse down successful (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Failed mouse down (${duration}ms)`);
      await ScreenshotHelper.takeFailureScreenshot(this.page, 'mouse_down_failed', this.testInfo);
      throw new Error(`Failed mouse down after ${duration}ms. Original error: ${(error as Error).message}`);
    }
  }

  /**
   * Release mouse button (drag end or hold release interactions).
   * @param options - Mouse up configuration
   * @param options.button - Mouse button to release (default: 'left')
   * @param options.clickCount - Click count metadata for underlying event
   * @throws Error when mouse up fails
   */
  async mouseUp(options?: {
    button?: 'left' | 'right' | 'middle';
    clickCount?: number;
  }): Promise<void> {
    const startTime = Date.now();
    try {
      console.log(`🔄 Releasing mouse button (${options?.button || 'left'})`);
      await this.page.mouse.up({
        button: options?.button || 'left',
        clickCount: options?.clickCount
      });
      const duration = Date.now() - startTime;
      console.log(`✅ Mouse up successful (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Failed mouse up (${duration}ms)`);
      await ScreenshotHelper.takeFailureScreenshot(this.page, 'mouse_up_failed', this.testInfo);
      throw new Error(`Failed mouse up after ${duration}ms. Original error: ${(error as Error).message}`);
    }
  }

  /**
   * Perform wheel scrolling by pixel deltas.
   * @param deltaX - Horizontal wheel delta
   * @param deltaY - Vertical wheel delta
   * @throws Error when wheel scroll fails
   */
  async scrollWheel(deltaX: number, deltaY: number): Promise<void> {
    const startTime = Date.now();
    try {
      console.log(`🔄 Scrolling wheel by (${deltaX}, ${deltaY})`);
      await this.page.mouse.wheel(deltaX, deltaY);
      const duration = Date.now() - startTime;
      console.log(`✅ Wheel scroll successful (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Failed wheel scroll (${duration}ms)`);
      await ScreenshotHelper.takeFailureScreenshot(this.page, 'mouse_wheel_failed', this.testInfo);
      throw new Error(`Failed wheel scroll after ${duration}ms. Original error: ${(error as Error).message}`);
    }
  }

  /**
   * Drag source element and drop on target element with resilience and diagnostics.
   * @param source - Source locator to drag
   * @param target - Target locator to drop onto
   * @param options - Drag-and-drop configuration
   * @param options.timeout - Maximum action timeout (default: 10000ms)
   * @param options.force - Force interaction on non-actionable elements
   * @param options.noWaitAfter - Disable post-action waiting
   * @param options.sourcePosition - Source point relative to source element
   * @param options.targetPosition - Target point relative to target element
   * @param options.trial - Perform trial run without actual actionability interaction
   * @throws Error when drag and drop fails after healing attempts
   */
  async dragAndDrop(source: Locator, target: Locator, options?: {
    timeout?: number;
    force?: boolean;
    noWaitAfter?: boolean;
    sourcePosition?: { x: number; y: number };
    targetPosition?: { x: number; y: number };
    trial?: boolean;
  }): Promise<void> {
    const timeout = options?.timeout || 10000;
    const startTime = Date.now();
    const sourceDescription = this.getDescription(source);
    const targetDescription = this.getDescription(target);
    try {
      console.log(`🔄 Dragging ${sourceDescription || source} -> ${targetDescription || target}`);
      await source.waitFor({ state: 'visible', timeout });
      await target.waitFor({ state: 'visible', timeout });
      await source.scrollIntoViewIfNeeded({ timeout });
      await target.scrollIntoViewIfNeeded({ timeout });
      await this.highlightElement(source);
      await this.highlightElement(target);

      await source.dragTo(target, {
        timeout,
        force: options?.force,
        noWaitAfter: options?.noWaitAfter,
        sourcePosition: options?.sourcePosition,
        targetPosition: options?.targetPosition,
        trial: options?.trial
      });

      const duration = Date.now() - startTime;
      console.log(`✅ Drag and drop successful (${duration}ms)`);
      await ScreenshotHelper.takeScreenshot(this.page, `drag_drop_${sourceDescription || 'source'}_to_${targetDescription || 'target'}`, this.testInfo);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Failed drag and drop (${duration}ms)`);
      await ScreenshotHelper.takeFailureScreenshot(this.page, 'drag_drop_failed', this.testInfo);
      const sourceDetails = await this.gatherElementDiagnostics(source);
      const targetDetails = await this.gatherElementDiagnostics(target);

      if (SelfHealingHelper.isLocatorError(error as Error) && SELF_HEAL_ENABLED) {
        return await SelfHealingHelper.trySelfHealing(
          this.page,
          source,
          sourceDescription,
          async (healedSource) => {
            await healedSource.dragTo(target, {
              timeout,
              force: options?.force,
              noWaitAfter: options?.noWaitAfter,
              sourcePosition: options?.sourcePosition,
              targetPosition: options?.targetPosition,
              trial: options?.trial
            });
          }
        );
      }
      throw new Error(`Failed drag and drop after ${duration}ms. Source: ${sourceDetails}. Target: ${targetDetails}. Original error: ${(error as Error).message}`);
    }
  }

  /**
   * Double-click an element with full click options and reliability wrappers.
   * @param locator - Target element locator
   * @param options - Double-click configuration
   * @param options.timeout - Maximum wait/action timeout
   * @param options.waitForNavigation - Wait for post-click navigation
   * @param options.expectedUrl - Expected URL after click
   * @param options.force - Force interaction on non-actionable elements
   * @param options.button - Mouse button to use
   * @returns Promise that resolves when double-click succeeds
   */
  async doubleClick(locator: Locator, options?: {
    timeout?: number;
    waitForNavigation?: boolean;
    expectedUrl?: string | RegExp;
    force?: boolean;
    button?: 'left' | 'right' | 'middle';
  }): Promise<void> {
    await this.click(locator, {
      timeout: options?.timeout,
      waitForNavigation: options?.waitForNavigation,
      expectedUrl: options?.expectedUrl,
      force: options?.force,
      button: options?.button || 'left',
      clickCount: 2
    });
  }

  /**
   * Right-click an element to open context menus and context interactions.
   * @param locator - Target element locator
   * @param options - Right-click configuration
   * @param options.timeout - Maximum wait/action timeout
   * @param options.waitForNavigation - Wait for post-click navigation
   * @param options.expectedUrl - Expected URL after click
   * @param options.force - Force interaction on non-actionable elements
   * @returns Promise that resolves when right-click succeeds
   */
  async rightClick(locator: Locator, options?: {
    timeout?: number;
    waitForNavigation?: boolean;
    expectedUrl?: string | RegExp;
    force?: boolean;
  }): Promise<void> {
    await this.click(locator, {
      timeout: options?.timeout,
      waitForNavigation: options?.waitForNavigation,
      expectedUrl: options?.expectedUrl,
      force: options?.force,
      button: 'right',
      clickCount: 1
    });
  }

  /**
   * Hold down a keyboard key for advanced combinations and modifier scenarios.
   * @param key - Key identifier to hold
   * @throws Error when key down fails
   */
  async keyDown(key: string): Promise<void> {
    const startTime = Date.now();
    try {
      console.log(`🔄 Holding key down: ${key}`);
      await this.page.keyboard.down(key);
      const duration = Date.now() - startTime;
      console.log(`✅ Key down successful: ${key} (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Failed key down: ${key} (${duration}ms)`);
      throw new Error(`Failed key down "${key}" after ${duration}ms. Original error: ${(error as Error).message}`);
    }
  }

  /**
   * Release a previously held keyboard key.
   * @param key - Key identifier to release
   * @throws Error when key up fails
   */
  async keyUp(key: string): Promise<void> {
    const startTime = Date.now();
    try {
      console.log(`🔄 Releasing key: ${key}`);
      await this.page.keyboard.up(key);
      const duration = Date.now() - startTime;
      console.log(`✅ Key up successful: ${key} (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Failed key up: ${key} (${duration}ms)`);
      throw new Error(`Failed key up "${key}" after ${duration}ms. Original error: ${(error as Error).message}`);
    }
  }

  /**
   * Press key combinations either directly or with explicit key hold/release sequencing.
   * @param keys - Combination as "Control+A" string or key array like ['Control', 'A']
   * @param options - Combo configuration options
   * @param options.locator - Optional element to focus before combo press
   * @param options.holdAndRelease - Use keyDown/keyUp sequence instead of direct press
   * @returns Promise that resolves when combo is executed
   */
  async pressCombo(keys: string | string[], options?: {
    locator?: Locator;
    holdAndRelease?: boolean;
  }): Promise<void> {
    const keyArray = Array.isArray(keys) ? keys : keys.split('+').map((k) => k.trim()).filter(Boolean);
    const comboName = keyArray.join('+');
    const startTime = Date.now();
    try {
      if (options?.locator) {
        await options.locator.waitFor({ state: 'visible', timeout: 10000 });
        await options.locator.focus();
      }
      console.log(`🔄 Pressing combo: ${comboName}`);

      if (options?.holdAndRelease && keyArray.length > 1) {
        for (const key of keyArray) {
          await this.page.keyboard.down(key);
        }
        for (let i = keyArray.length - 1; i >= 0; i--) {
          await this.page.keyboard.up(keyArray[i]);
        }
      } else {
        await this.page.keyboard.press(comboName);
      }

      const duration = Date.now() - startTime;
      console.log(`✅ Combo successful: ${comboName} (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Failed combo: ${comboName} (${duration}ms)`);
      throw new Error(`Failed combo "${comboName}" after ${duration}ms. Original error: ${(error as Error).message}`);
    }
  }

  /**
   * Paste text using clipboard simulation or direct keyboard insertion.
   * @param text - Text to paste into active/focused input
   * @param options - Paste configuration options
   * @param options.locator - Optional element to focus before paste
   * @param options.method - Paste strategy ('insertText' or 'clipboard', default: 'insertText')
   * @throws Error when paste fails
   */
  async paste(text: string, options?: {
    locator?: Locator;
    method?: 'insertText' | 'clipboard';
  }): Promise<void> {
    const method = options?.method || 'insertText';
    const startTime = Date.now();
    try {
      if (options?.locator) {
        await options.locator.waitFor({ state: 'visible', timeout: 10000 });
        await options.locator.focus();
      }
      console.log(`🔄 Pasting text using ${method}`);
      if (method === 'clipboard') {
        await this.page.evaluate(async (value) => {
          if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(value);
          }
        }, text);
        await this.page.keyboard.press('ControlOrMeta+V');
      } else {
        await this.page.keyboard.insertText(text);
      }
      const duration = Date.now() - startTime;
      console.log(`✅ Paste successful (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Failed paste (${duration}ms)`);
      throw new Error(`Failed paste after ${duration}ms. Original error: ${(error as Error).message}`);
    }
  }

  // #endregion

  // ──────────────────────────────────────────────────────────────────────────
  // #region FILE, DIALOG & DOWNLOAD
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Upload file(s) into input[type=file] controls with validation wrappers.
   * @param locator - File input locator
   * @param files - Absolute/relative file path or multiple paths
   * @param options - Upload options
   * @param options.timeout - Maximum wait/action timeout
   * @returns Promise that resolves when upload value is set
   * @throws Error when upload fails after healing attempts
   */
  async uploadFile(locator: Locator, files: string | string[], options?: {
    timeout?: number;
  }): Promise<void> {
    const timeout = options?.timeout || 10000;
    const description = this.getDescription(locator);
    const startTime = Date.now();
    try {
      console.log(`🔄 Uploading file(s) into:`, description || locator);
      await locator.waitFor({ state: 'attached', timeout });
      await locator.setInputFiles(files, { timeout });
      const duration = Date.now() - startTime;
      console.log(`✅ File upload successful (${duration}ms)`);
      await ScreenshotHelper.takeScreenshot(this.page, `upload_file_${description}`, this.testInfo);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Failed file upload (${duration}ms)`);
      await ScreenshotHelper.takeFailureScreenshot(this.page, `upload_file_failed_${description}`, this.testInfo);
      const errorDetails = await this.gatherElementDiagnostics(locator);
      if (SelfHealingHelper.isLocatorError(error as Error) && SELF_HEAL_ENABLED) {
        return await SelfHealingHelper.trySelfHealing(
          this.page,
          locator,
          description,
          async (healedLocator) => {
            await healedLocator.setInputFiles(files, { timeout });
          }
        );
      }
      throw new Error(`Failed file upload after ${duration}ms. ${errorDetails}. Original error: ${(error as Error).message}`);
    }
  }

  /**
   * Clear previously selected file(s) from a file input.
   * @param locator - File input locator
   * @param options - Clear options
   * @param options.timeout - Maximum wait/action timeout
   * @throws Error when clearing file input fails
   */
  async clearFile(locator: Locator, options?: {
    timeout?: number;
  }): Promise<void> {
    await this.uploadFile(locator, [], { timeout: options?.timeout });
  }

  /**
   * Wait for and capture a browser download triggered by supplied action.
   * @param options - Download handling options
   * @param options.triggerAction - Action that triggers the download
   * @param options.timeout - Maximum time to wait for download event (default: 30000ms)
   * @param options.saveAsPath - Optional explicit destination path for downloaded file
   * @param options.expectedFileName - Optional exact or regex filename expectation
   * @returns Download metadata including final path and suggested filename
   * @throws Error when download is not observed or validation fails
   */
  async handleDownload(options: {
    triggerAction: () => Promise<void>;
    timeout?: number;
    saveAsPath?: string;
    expectedFileName?: string | RegExp;
  }): Promise<{ download: unknown; path: string | null; suggestedFilename: string }> {
    const timeout = options.timeout || 30000;
    const startTime = Date.now();
    try {
      console.log(`🔄 Waiting for download event`);
      const [download] = await Promise.all([
        this.page.waitForEvent('download', { timeout }),
        options.triggerAction()
      ]);
      const suggestedFilename = download.suggestedFilename();
      if (options.expectedFileName) {
        const matches = typeof options.expectedFileName === 'string'
          ? suggestedFilename === options.expectedFileName
          : options.expectedFileName.test(suggestedFilename);
        if (!matches) {
          throw new Error(`Download filename mismatch. Expected: ${options.expectedFileName}, Actual: ${suggestedFilename}`);
        }
      }

      let finalPath: string | null;
      if (options.saveAsPath) {
        await download.saveAs(options.saveAsPath);
        finalPath = options.saveAsPath;
      } else {
        finalPath = await download.path();
      }
      const duration = Date.now() - startTime;
      console.log(`✅ Download captured (${duration}ms): ${suggestedFilename}`);
      return { download, path: finalPath, suggestedFilename };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Failed to handle download (${duration}ms)`);
      await ScreenshotHelper.takeFailureScreenshot(this.page, 'download_failed', this.testInfo);
      throw new Error(`Failed to handle download after ${duration}ms. Original error: ${(error as Error).message}`);
    }
  }

  /**
   * Handle browser dialog (alert/confirm/prompt) triggered by supplied action.
   * @param options - Dialog handling options
   * @param options.triggerAction - Action expected to open the dialog
   * @param options.accept - Accept or dismiss the dialog (default: true)
   * @param options.promptText - Text to enter for prompt dialogs
   * @param options.timeout - Maximum wait for dialog event (default: 10000ms)
   * @param options.expectedType - Optional expected dialog type
   * @param options.expectedMessage - Optional exact or regex message assertion
   * @returns Captured dialog type and message
   * @throws Error when dialog event is not captured or assertions fail
   */
  async handleDialog(options: {
    triggerAction: () => Promise<void>;
    accept?: boolean;
    promptText?: string;
    timeout?: number;
    expectedType?: 'alert' | 'beforeunload' | 'confirm' | 'prompt';
    expectedMessage?: string | RegExp;
  }): Promise<{ type: string; message: string }> {
    const timeout = options.timeout || 10000;
    const accept = options.accept !== false;
    const startTime = Date.now();
    try {
      console.log(`🔄 Waiting for dialog event`);
      const [dialog] = await Promise.all([
        this.page.waitForEvent('dialog', { timeout }),
        options.triggerAction()
      ]);
      const type = dialog.type();
      const message = dialog.message();

      if (options.expectedType && type !== options.expectedType) {
        throw new Error(`Dialog type mismatch. Expected: ${options.expectedType}, Actual: ${type}`);
      }
      if (options.expectedMessage) {
        const matches = typeof options.expectedMessage === 'string'
          ? message === options.expectedMessage
          : options.expectedMessage.test(message);
        if (!matches) {
          throw new Error(`Dialog message mismatch. Expected: ${options.expectedMessage}, Actual: ${message}`);
        }
      }

      if (accept) {
        await dialog.accept(options.promptText);
      } else {
        await dialog.dismiss();
      }

      const duration = Date.now() - startTime;
      console.log(`✅ Dialog handled (${duration}ms): [${type}] ${message}`);
      return { type, message };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Failed to handle dialog (${duration}ms)`);
      throw new Error(`Failed to handle dialog after ${duration}ms. Original error: ${(error as Error).message}`);
    }
  }

  // #endregion

  // ──────────────────────────────────────────────────────────────────────────
  // #region BROWSER CONTEXT — TABS, PERMISSIONS, VIEWPORT & PAGE CONTROLS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Capture and switch control to newly opened tab/window triggered by supplied action.
   * @param options - New tab handling options
   * @param options.triggerAction - Action expected to open new page/tab
   * @param options.timeout - Maximum wait for new page event (default: 30000ms)
   * @param options.waitForLoadState - Load state to wait in new tab (default: 'domcontentloaded')
   * @returns Newly opened Page instance
   * @throws Error when tab does not open in time
   */
  async switchToNewTab(options: {
    triggerAction: () => Promise<void>;
    timeout?: number;
    waitForLoadState?: 'load' | 'domcontentloaded' | 'networkidle';
  }): Promise<Page> {
    const timeout = options.timeout || 30000;
    const waitForLoadState = options.waitForLoadState || 'domcontentloaded';
    const startTime = Date.now();
    try {
      const context = this.page.context();
      console.log(`🔄 Waiting for new tab/window`);
      const [newPage] = await Promise.all([
        context.waitForEvent('page', { timeout }),
        options.triggerAction()
      ]);
      await newPage.waitForLoadState(waitForLoadState, { timeout });
      const duration = Date.now() - startTime;
      console.log(`✅ Switched to new tab/window (${duration}ms): ${newPage.url()}`);
      return newPage;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Failed to switch to new tab/window (${duration}ms)`);
      throw new Error(`Failed to switch to new tab/window after ${duration}ms. Original error: ${(error as Error).message}`);
    }
  }

  /**
   * Wait for a new tab/window to open without a known trigger action.
   * Use this when the new tab is opened by internal app logic (redirects,
   * postMessage, OAuth popups) rather than a direct user click.
   * @param options - Wait options
   * @param options.timeout - Maximum wait time (default: 30000ms)
   * @param options.waitForLoadState - Load state to await in the new page (default: 'domcontentloaded')
   * @returns Newly opened Page instance
   * @example
   * ```typescript
   * // start listening BEFORE the action that will open the tab
   * const newTabPromise = actions.waitForNewTab();
   * await page.evaluate(() => window.open('/reports', '_blank'));
   * const reportPage = await newTabPromise;
   * ```
   */
  async waitForNewTab(options?: {
    timeout?: number;
    waitForLoadState?: 'load' | 'domcontentloaded' | 'networkidle';
  }): Promise<Page> {
    const timeout = options?.timeout ?? 30000;
    const waitForLoadState = options?.waitForLoadState ?? 'domcontentloaded';
    const startTime = Date.now();
    try {
      console.log(`🔄 Waiting for new tab/window to open`);
      const newPage = await this.page.context().waitForEvent('page', { timeout });
      await newPage.waitForLoadState(waitForLoadState, { timeout });
      const duration = Date.now() - startTime;
      console.log(`✅ New tab/window detected (${duration}ms): ${newPage.url()}`);
      return newPage;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ No new tab/window appeared (${duration}ms)`);
      throw new Error(`waitForNewTab() timed out after ${duration}ms. Original error: ${(error as Error).message}`);
    }
  }

  /**
   * Return all currently open pages (tabs/windows) in this browser context.
   * This is the Playwright equivalent of Selenium's `driver.getWindowHandles()`.
   * @returns Array of Page objects; index 0 is always the originally opened page.
   * @example
   * ```typescript
   * const pages = actions.getAllPages();
   * expect(pages.length).toBe(2);
   * ```
   */
  getAllPages(): Page[] {
    return this.page.context().pages();
  }

  /**
   * Switch focus to an already-open tab by its zero-based index.
   * Index 0 is always the first tab that was opened in the browser context.
   * @param index - Zero-based tab index
   * @param options - Switch options
   * @param options.waitForLoadState - Load state to await after switching (default: 'domcontentloaded')
   * @returns The Page at the given index
   * @throws Error when no page exists at the given index
   * @example
   * ```typescript
   * const secondTab = await actions.switchToTabByIndex(1);
   * ```
   */
  async switchToTabByIndex(index: number, options?: {
    waitForLoadState?: 'load' | 'domcontentloaded' | 'networkidle';
  }): Promise<Page> {
    const startTime = Date.now();
    try {
      const pages = this.page.context().pages();
      if (index < 0 || index >= pages.length) {
        throw new Error(`Tab index ${index} is out of range. Open tabs: ${pages.length}.`);
      }
      const target = pages[index];
      console.log(`🔄 Switching to tab [${index}]: ${target.url()}`);
      await target.bringToFront();
      if (options?.waitForLoadState) {
        await target.waitForLoadState(options.waitForLoadState);
      }
      const duration = Date.now() - startTime;
      console.log(`✅ Switched to tab [${index}] (${duration}ms): ${target.url()}`);
      return target;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Failed to switch to tab [${index}] (${duration}ms)`);
      throw new Error(`switchToTabByIndex(${index}) failed after ${duration}ms. Original error: ${(error as Error).message}`);
    }
  }

  /**
   * Switch focus to an already-open tab whose URL matches the given pattern.
   * @param pattern - Exact URL string or RegExp to match against each tab's URL
   * @param options - Switch options
   * @param options.waitForLoadState - Load state to await after switching (default: 'domcontentloaded')
   * @returns The first matching Page
   * @throws Error when no open tab matches the pattern
   * @example
   * ```typescript
   * const adminTab = await actions.switchToTabByUrl('/admin');
   * const reportTab = await actions.switchToTabByUrl(/report/);
   * ```
   */
  async switchToTabByUrl(pattern: string | RegExp, options?: {
    waitForLoadState?: 'load' | 'domcontentloaded' | 'networkidle';
  }): Promise<Page> {
    const startTime = Date.now();
    try {
      const pages = this.page.context().pages();
      const target = pages.find(p =>
        typeof pattern === 'string' ? p.url().includes(pattern) : pattern.test(p.url()),
      );
      if (!target) {
        const urls = pages.map(p => p.url()).join(', ');
        throw new Error(`No open tab matches "${pattern}". Open URLs: [${urls}]`);
      }
      console.log(`🔄 Switching to tab by URL pattern "${pattern}": ${target.url()}`);
      await target.bringToFront();
      if (options?.waitForLoadState) {
        await target.waitForLoadState(options.waitForLoadState);
      }
      const duration = Date.now() - startTime;
      console.log(`✅ Switched to tab by URL (${duration}ms): ${target.url()}`);
      return target;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Failed to switch to tab by URL (${duration}ms)`);
      throw new Error(`switchToTabByUrl("${pattern}") failed after ${duration}ms. Original error: ${(error as Error).message}`);
    }
  }

  /**
   * Switch focus to an already-open tab whose `<title>` matches the given pattern.
   * @param pattern - Exact title string or RegExp to match against each tab's title
   * @param options - Switch options
   * @param options.waitForLoadState - Load state to await after switching
   * @returns The first matching Page
   * @throws Error when no open tab matches the pattern
   * @example
   * ```typescript
   * const dashboardTab = await actions.switchToTabByTitle('Dashboard');
   * const reportTab    = await actions.switchToTabByTitle(/Monthly Report/);
   * ```
   */
  async switchToTabByTitle(pattern: string | RegExp, options?: {
    waitForLoadState?: 'load' | 'domcontentloaded' | 'networkidle';
  }): Promise<Page> {
    const startTime = Date.now();
    try {
      const pages = this.page.context().pages();
      let target: Page | undefined;
      const titles: string[] = [];
      for (const p of pages) {
        const title = await p.title();
        titles.push(title);
        const matches = typeof pattern === 'string' ? title === pattern : pattern.test(title);
        if (matches) { target = p; break; }
      }
      if (!target) {
        throw new Error(`No open tab matches title "${pattern}". Open titles: [${titles.join(', ')}]`);
      }
      console.log(`🔄 Switching to tab by title "${pattern}": ${target.url()}`);
      await target.bringToFront();
      if (options?.waitForLoadState) {
        await target.waitForLoadState(options.waitForLoadState);
      }
      const duration = Date.now() - startTime;
      console.log(`✅ Switched to tab by title (${duration}ms): ${target.url()}`);
      return target;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Failed to switch to tab by title (${duration}ms)`);
      throw new Error(`switchToTabByTitle("${pattern}") failed after ${duration}ms. Original error: ${(error as Error).message}`);
    }
  }

  /**
   * Switch focus back to the original (first) tab in the browser context.
   * Equivalent to Selenium's `driver.switchTo().window(originalHandle)`.
   * @param options - Switch options
   * @param options.waitForLoadState - Load state to await after switching
   * @returns The original Page (index 0)
   * @example
   * ```typescript
   * await actions.switchToOriginalTab();
   * ```
   */
  async switchToOriginalTab(options?: {
    waitForLoadState?: 'load' | 'domcontentloaded' | 'networkidle';
  }): Promise<Page> {
    const startTime = Date.now();
    try {
      const original = this.page.context().pages()[0];
      console.log(`🔄 Switching back to original tab: ${original.url()}`);
      await original.bringToFront();
      if (options?.waitForLoadState) {
        await original.waitForLoadState(options.waitForLoadState);
      }
      const duration = Date.now() - startTime;
      console.log(`✅ Returned to original tab (${duration}ms): ${original.url()}`);
      return original;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Failed to return to original tab (${duration}ms)`);
      throw new Error(`switchToOriginalTab() failed after ${duration}ms. Original error: ${(error as Error).message}`);
    }
  }

  /**
   * Close a specific tab/window, or the current page if none is specified.
   * @param target - Page to close; defaults to the current page (`this.page`)
   * @example
   * ```typescript
   * await actions.closeTab(newTabPage);  // close a specific tab
   * await actions.closeTab();            // close the current tab
   * ```
   */
  async closeTab(target?: Page): Promise<void> {
    const pageToClose = target ?? this.page;
    const url = pageToClose.url();
    const startTime = Date.now();
    try {
      console.log(`🔄 Closing tab: ${url}`);
      await pageToClose.close();
      const duration = Date.now() - startTime;
      console.log(`✅ Tab closed (${duration}ms): ${url}`);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Failed to close tab (${duration}ms)`);
      throw new Error(`closeTab() failed after ${duration}ms. Original error: ${(error as Error).message}`);
    }
  }

  /**
   * Set browser context geolocation for location-aware application testing.
   * @param latitude - Latitude coordinate
   * @param longitude - Longitude coordinate
   * @param options - Geolocation options
   * @param options.accuracy - Geolocation accuracy radius in meters
   * @throws Error when geolocation cannot be applied
   */
  async setGeolocation(latitude: number, longitude: number, options?: {
    accuracy?: number;
  }): Promise<void> {
    const startTime = Date.now();
    try {
      console.log(`🔄 Setting geolocation (${latitude}, ${longitude})`);
      await this.page.context().setGeolocation({
        latitude,
        longitude,
        accuracy: options?.accuracy
      });
      const duration = Date.now() - startTime;
      console.log(`✅ Geolocation set successfully (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Failed to set geolocation (${duration}ms)`);
      throw new Error(`Failed to set geolocation after ${duration}ms. Original error: ${(error as Error).message}`);
    }
  }

  /**
   * Grant browser permissions (camera/microphone/geolocation/clipboard etc.) for current context.
   * @param permissions - Permission names supported by Playwright/browser
   * @param options - Permission grant options
   * @param options.origin - Optional target origin URL for scoped permissions
   * @param options.clearExisting - Clear previously granted permissions first
   * @throws Error when permission grant fails
   */
  async grantPermissions(permissions: string[], options?: {
    origin?: string;
    clearExisting?: boolean;
  }): Promise<void> {
    const startTime = Date.now();
    try {
      const context = this.page.context();
      if (options?.clearExisting) {
        await context.clearPermissions();
      }
      console.log(`🔄 Granting permissions: ${permissions.join(', ')}`);
      await context.grantPermissions(permissions, { origin: options?.origin });
      const duration = Date.now() - startTime;
      console.log(`✅ Permissions granted successfully (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Failed to grant permissions (${duration}ms)`);
      throw new Error(`Failed to grant permissions after ${duration}ms. Original error: ${(error as Error).message}`);
    }
  }

  /**
   * Navigate to previous history entry and optionally validate load state/URL.
   * @param options - Back navigation options
   * @param options.timeout - Maximum wait timeout (default: 30000ms)
   * @param options.waitForLoadState - Load state after back navigation
   * @param options.expectedUrl - Optional expected URL check after navigation
   * @throws Error when back navigation fails or no history entry exists
   */
  async goBack(options?: {
    timeout?: number;
    waitForLoadState?: 'load' | 'domcontentloaded' | 'networkidle';
    expectedUrl?: string | RegExp;
  }): Promise<void> {
    const timeout = options?.timeout || 30000;
    const waitForLoadState = options?.waitForLoadState || 'domcontentloaded';
    const startTime = Date.now();
    try {
      console.log(`🔄 Navigating back in browser history`);
      const response = await this.page.goBack({ timeout, waitUntil: waitForLoadState });
      if (!response) {
        throw new Error('No previous history entry found for goBack().');
      }
      if (options?.expectedUrl) {
        await this.page.waitForURL(options.expectedUrl, { timeout });
      }
      const duration = Date.now() - startTime;
      console.log(`✅ Back navigation successful (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Back navigation failed (${duration}ms)`);
      throw new Error(`Failed goBack() after ${duration}ms. Original error: ${(error as Error).message}`);
    }
  }

  /**
   * Navigate to next history entry and optionally validate load state/URL.
   * @param options - Forward navigation options
   * @param options.timeout - Maximum wait timeout (default: 30000ms)
   * @param options.waitForLoadState - Load state after forward navigation
   * @param options.expectedUrl - Optional expected URL check after navigation
   * @throws Error when forward navigation fails or no forward entry exists
   */
  async goForward(options?: {
    timeout?: number;
    waitForLoadState?: 'load' | 'domcontentloaded' | 'networkidle';
    expectedUrl?: string | RegExp;
  }): Promise<void> {
    const timeout = options?.timeout || 30000;
    const waitForLoadState = options?.waitForLoadState || 'domcontentloaded';
    const startTime = Date.now();
    try {
      console.log(`🔄 Navigating forward in browser history`);
      const response = await this.page.goForward({ timeout, waitUntil: waitForLoadState });
      if (!response) {
        throw new Error('No forward history entry found for goForward().');
      }
      if (options?.expectedUrl) {
        await this.page.waitForURL(options.expectedUrl, { timeout });
      }
      const duration = Date.now() - startTime;
      console.log(`✅ Forward navigation successful (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Forward navigation failed (${duration}ms)`);
      throw new Error(`Failed goForward() after ${duration}ms. Original error: ${(error as Error).message}`);
    }
  }

  /**
   * Reload current page and optionally validate URL/load completion.
   * @param options - Reload options
   * @param options.timeout - Maximum wait timeout (default: 30000ms)
   * @param options.waitForLoadState - Load state to wait for on reload
   * @param options.expectedUrl - Optional expected URL check after reload
   * @throws Error when reload fails
   */
  async refresh(options?: {
    timeout?: number;
    waitForLoadState?: 'load' | 'domcontentloaded' | 'networkidle';
    expectedUrl?: string | RegExp;
  }): Promise<void> {
    const timeout = options?.timeout || 30000;
    const waitForLoadState = options?.waitForLoadState || 'domcontentloaded';
    const startTime = Date.now();
    try {
      console.log(`🔄 Refreshing current page`);
      await this.page.reload({ timeout, waitUntil: waitForLoadState });
      if (options?.expectedUrl) {
        await this.page.waitForURL(options.expectedUrl, { timeout });
      }
      const duration = Date.now() - startTime;
      console.log(`✅ Page refresh successful (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Page refresh failed (${duration}ms)`);
      throw new Error(`Failed refresh() after ${duration}ms. Original error: ${(error as Error).message}`);
    }
  }

  /**
   * Apply page zoom by setting CSS zoom on document root.
   * @param zoomPercent - Zoom percentage (e.g., 80, 100, 125)
   * @throws Error when zoom value is invalid or action fails
   */
  async setZoomLevel(zoomPercent: number): Promise<void> {
    const startTime = Date.now();
    try {
      if (!Number.isFinite(zoomPercent) || zoomPercent <= 0) {
        throw new Error(`Invalid zoomPercent: ${zoomPercent}. Must be a positive number.`);
      }
      console.log(`🔄 Setting page zoom to ${zoomPercent}%`);
      await this.page.evaluate((value) => {
        document.documentElement.style.zoom = `${value}%`;
      }, zoomPercent);
      const duration = Date.now() - startTime;
      console.log(`✅ Zoom applied successfully (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Failed to set zoom (${duration}ms)`);
      throw new Error(`Failed setZoomLevel(${zoomPercent}) after ${duration}ms. Original error: ${(error as Error).message}`);
    }
  }

  /**
   * Trigger browser print workflow using dialog trigger or Chromium PDF output.
   * @param options - Print options
   * @param options.mode - 'dialog' triggers window.print(), 'pdf' writes PDF in Chromium (default: 'dialog')
   * @param options.pdfPath - Destination path for PDF when mode is 'pdf'
   * @param options.format - PDF paper format for Chromium PDF mode
   * @param options.landscape - PDF orientation for Chromium PDF mode
   * @throws Error when print action fails
   */
  async printPage(options?: {
    mode?: 'dialog' | 'pdf';
    pdfPath?: string;
    format?: 'A0' | 'A1' | 'A2' | 'A3' | 'A4' | 'A5' | 'A6' | 'Letter' | 'Legal' | 'Tabloid' | 'Ledger';
    landscape?: boolean;
  }): Promise<void> {
    const mode = options?.mode || 'dialog';
    const startTime = Date.now();
    try {
      console.log(`🔄 Triggering print flow (${mode})`);
      if (mode === 'pdf') {
        await this.page.pdf({
          path: options?.pdfPath,
          format: options?.format || 'A4',
          landscape: options?.landscape
        });
      } else {
        await this.page.evaluate(() => {
          window.print();
        });
      }
      const duration = Date.now() - startTime;
      console.log(`✅ Print flow completed (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Print flow failed (${duration}ms)`);
      throw new Error(`Failed printPage(${mode}) after ${duration}ms. Original error: ${(error as Error).message}`);
    }
  }

  /**
   * Toggle browser context offline/online mode.
   * @param offline - True to go offline, false to go online
   * @throws Error when context offline toggle fails
   */
  async setOfflineMode(offline: boolean): Promise<void> {
    const startTime = Date.now();
    try {
      console.log(`🔄 Setting offline mode to: ${offline}`);
      await this.page.context().setOffline(offline);
      const duration = Date.now() - startTime;
      console.log(`✅ Offline mode updated (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Failed to set offline mode (${duration}ms)`);
      throw new Error(`Failed setOfflineMode(${offline}) after ${duration}ms. Original error: ${(error as Error).message}`);
    }
  }

  // #endregion

  // ──────────────────────────────────────────────────────────────────────────
  // #region NETWORK — INTERCEPT, MOCK & WAIT
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Wait for a matching outgoing request.
   * @param matcher - URL matcher (string/regex) or predicate
   * @param options - Wait options
   * @param options.timeout - Max wait time in milliseconds (default: 30000)
   * @param options.method - Optional HTTP method filter
   * @returns Matched Request object
   * @throws Error when no request matches in time
   */
  async waitForRequest(
    matcher: string | RegExp | ((request: Request) => boolean),
    options?: {
      timeout?: number;
      method?: string;
    }
  ): Promise<Request> {
    const timeout = options?.timeout || 30000;
    const startTime = Date.now();
    try {
      const request = await this.page.waitForRequest((request) => {
        const methodMatches = options?.method
          ? request.method().toUpperCase() === options.method.toUpperCase()
          : true;
        if (!methodMatches) {
          return false;
        }

        if (typeof matcher === 'function') {
          return matcher(request);
        }
        if (typeof matcher === 'string') {
          return request.url().includes(matcher);
        }
        return matcher.test(request.url());
      }, { timeout });
      const duration = Date.now() - startTime;
      console.log(`✅ Request captured (${duration}ms): ${request.method()} ${request.url()}`);
      return request;
    } catch (error) {
      const duration = Date.now() - startTime;
      throw new Error(`Failed waitForRequest() after ${duration}ms. Original error: ${(error as Error).message}`);
    }
  }

  /**
   * Wait for a matching incoming response.
   * @param matcher - URL matcher (string/regex) or predicate
   * @param options - Wait options
   * @param options.timeout - Max wait time in milliseconds (default: 30000)
   * @param options.status - Optional HTTP status filter
   * @param options.method - Optional request method filter
   * @returns Matched Response object
   * @throws Error when no response matches in time
   */
  async waitForResponse(
    matcher: string | RegExp | ((response: Response) => boolean),
    options?: {
      timeout?: number;
      status?: number;
      method?: string;
    }
  ): Promise<Response> {
    const timeout = options?.timeout || 30000;
    const startTime = Date.now();
    try {
      const response = await this.page.waitForResponse((response) => {
        const statusMatches = options?.status ? response.status() === options.status : true;
        const methodMatches = options?.method
          ? response.request().method().toUpperCase() === options.method.toUpperCase()
          : true;
        if (!statusMatches || !methodMatches) {
          return false;
        }

        if (typeof matcher === 'function') {
          return matcher(response);
        }
        if (typeof matcher === 'string') {
          return response.url().includes(matcher);
        }
        return matcher.test(response.url());
      }, { timeout });
      const duration = Date.now() - startTime;
      console.log(`✅ Response captured (${duration}ms): ${response.status()} ${response.url()}`);
      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      throw new Error(`Failed waitForResponse() after ${duration}ms. Original error: ${(error as Error).message}`);
    }
  }

  /**
   * Throttle matching requests by introducing artificial latency before continue.
   * @param urlPattern - URL matcher for requests to throttle
   * @param delayMs - Delay in milliseconds before request continues
   * @param options - Throttle options
   * @param options.once - Apply delay only once
   * @throws Error when route setup fails
   */
  async addRequestDelay(urlPattern: string | RegExp, delayMs: number, options?: {
    once?: boolean;
  }): Promise<void> {
    const startTime = Date.now();
    try {
      console.log(`🔄 Adding request delay (${delayMs}ms) for pattern: ${urlPattern}`);
      await this.page.route(
        urlPattern,
        async (route: Route) => {
          await this.page.waitForTimeout(delayMs);
          await route.continue();
        },
        { times: options?.once ? 1 : undefined }
      );
      const duration = Date.now() - startTime;
      console.log(`✅ Request delay route added (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Failed to add request delay route (${duration}ms)`);
      throw new Error(`Failed addRequestDelay() after ${duration}ms. Original error: ${(error as Error).message}`);
    }
  }

  /**
   * Mock matching requests by fulfilling a controlled response.
   * @param urlPattern - URL matcher for requests to mock
   * @param options - Mock response options
   * @param options.status - HTTP status code (default: 200)
   * @param options.headers - Response headers
   * @param options.body - Raw response body
   * @param options.json - JSON response body (stringified automatically)
   * @param options.contentType - Response content type
   * @param options.method - Optional request method filter (e.g., 'GET')
   * @param options.once - Apply mock only once
   * @throws Error when route setup fails
   */
  async mockResponse(urlPattern: string | RegExp, options: {
    status?: number;
    headers?: Record<string, string>;
    body?: string;
    json?: unknown;
    contentType?: string;
    method?: string;
    once?: boolean;
  }): Promise<void> {
    const startTime = Date.now();
    try {
      console.log(`🔄 Adding response mock for pattern: ${urlPattern}`);
      await this.page.route(
        urlPattern,
        async (route: Route, request: Request) => {
          if (options.method && request.method().toUpperCase() !== options.method.toUpperCase()) {
            await route.continue();
            return;
          }

          if (options.json !== undefined) {
            await route.fulfill({
              status: options.status || 200,
              headers: options.headers,
              contentType: options.contentType || 'application/json',
              body: JSON.stringify(options.json)
            });
            return;
          }

          await route.fulfill({
            status: options.status || 200,
            headers: options.headers,
            contentType: options.contentType,
            body: options.body
          });
        },
        { times: options.once ? 1 : undefined }
      );
      const duration = Date.now() - startTime;
      console.log(`✅ Response mock added (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Failed to add response mock (${duration}ms)`);
      throw new Error(`Failed mockResponse() after ${duration}ms. Original error: ${(error as Error).message}`);
    }
  }

  /**
   * Fetch real backend response, mutate payload/metadata, and fulfill modified response.
   * @param urlPattern - URL matcher for responses to modify
   * @param options - Response transformation options
   * @param options.method - Optional request method filter
   * @param options.status - Override status code
   * @param options.headers - Merge/override response headers
   * @param options.contentType - Override content-type header
   * @param options.body - Full raw response body override
   * @param options.json - Full JSON response override (stringified)
   * @param options.transformText - Transform existing response text
   * @param options.transformJson - Transform existing JSON payload
   * @param options.once - Apply transformation only once
   * @throws Error when route transformation setup fails
   */
  async mockAndModifyResponse(urlPattern: string | RegExp, options?: {
    method?: string;
    status?: number;
    headers?: Record<string, string>;
    contentType?: string;
    body?: string;
    json?: unknown;
    transformText?: (body: string) => string;
    transformJson?: (body: unknown) => unknown;
    once?: boolean;
  }): Promise<void> {
    const startTime = Date.now();
    try {
      console.log(`🔄 Adding response patch route for pattern: ${urlPattern}`);
      await this.page.route(
        urlPattern,
        async (route: Route, request: Request) => {
          if (options?.method && request.method().toUpperCase() !== options.method.toUpperCase()) {
            await route.continue();
            return;
          }

          const originalResponse = await route.fetch();
          const mergedHeaders: Record<string, string> = {
            ...originalResponse.headers(),
            ...(options?.headers || {})
          };
          if (options?.contentType) {
            mergedHeaders['content-type'] = options.contentType;
          }

          let finalBody: string | undefined;
          if (options?.json !== undefined) {
            finalBody = JSON.stringify(options.json);
            if (!mergedHeaders['content-type']) {
              mergedHeaders['content-type'] = options.contentType || 'application/json';
            }
          } else if (options?.body !== undefined) {
            finalBody = options.body;
          } else if (options?.transformJson) {
            const originalJson = await originalResponse.json();
            finalBody = JSON.stringify(options.transformJson(originalJson));
            if (!mergedHeaders['content-type']) {
              mergedHeaders['content-type'] = options.contentType || 'application/json';
            }
          } else if (options?.transformText) {
            const originalText = await originalResponse.text();
            finalBody = options.transformText(originalText);
          }

          await route.fulfill({
            response: originalResponse,
            status: options?.status || originalResponse.status(),
            headers: mergedHeaders,
            body: finalBody
          });
        },
        { times: options?.once ? 1 : undefined }
      );
      const duration = Date.now() - startTime;
      console.log(`✅ Response patch route added (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Failed to add response patch route (${duration}ms)`);
      throw new Error(`Failed mockAndModifyResponse() after ${duration}ms. Original error: ${(error as Error).message}`);
    }
  }

  /**
   * Intercept matching requests, patch request fields, and continue to server.
   * @param urlPattern - URL matcher for requests to patch
   * @param options - Request patch options
   * @param options.url - Override request URL
   * @param options.method - Override request method
   * @param options.headers - Merge/override request headers
   * @param options.postData - Override request body
   * @param options.removeHeaders - Header names to remove (case-insensitive)
   * @param options.matchMethod - Optional incoming request method filter
   * @param options.once - Apply patch only once
   * @throws Error when route patch setup fails
   */
  async mockRequest(urlPattern: string | RegExp, options?: {
    url?: string;
    method?: string;
    headers?: Record<string, string>;
    postData?: string;
    removeHeaders?: string[];
    matchMethod?: string;
    once?: boolean;
  }): Promise<void> {
    const startTime = Date.now();
    try {
      console.log(`🔄 Adding request patch route for pattern: ${urlPattern}`);
      await this.page.route(
        urlPattern,
        async (route: Route, request: Request) => {
          if (options?.matchMethod && request.method().toUpperCase() !== options.matchMethod.toUpperCase()) {
            await route.continue();
            return;
          }

          const baseHeaders = { ...request.headers() };
          const removeSet = new Set((options?.removeHeaders || []).map((h) => h.toLowerCase()));
          for (const key of Object.keys(baseHeaders)) {
            if (removeSet.has(key.toLowerCase())) {
              delete baseHeaders[key];
            }
          }

          const finalHeaders = {
            ...baseHeaders,
            ...(options?.headers || {})
          };

          await route.continue({
            url: options?.url,
            method: options?.method,
            headers: finalHeaders,
            postData: options?.postData
          });
        },
        { times: options?.once ? 1 : undefined }
      );
      const duration = Date.now() - startTime;
      console.log(`✅ Request patch route added (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Failed to add request patch route (${duration}ms)`);
      throw new Error(`Failed mockRequest() after ${duration}ms. Original error: ${(error as Error).message}`);
    }
  }

  /**
   * Clear all routes/mocks for a specific URL pattern.
   * @param urlPattern - URL matcher to unroute
   * @throws Error when unroute fails
   */
  async clearRequestMocks(urlPattern: string | RegExp): Promise<void> {
    const startTime = Date.now();
    try {
      console.log(`🔄 Clearing request mocks for pattern: ${urlPattern}`);
      await this.page.unroute(urlPattern);
      const duration = Date.now() - startTime;
      console.log(`✅ Request mocks cleared (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Failed to clear request mocks (${duration}ms)`);
      throw new Error(`Failed clearRequestMocks() after ${duration}ms. Original error: ${(error as Error).message}`);
    }
  }

  /**
   * Abort matching network requests with Playwright error code.
   * @param urlPattern - URL matcher for requests to abort
   * @param options - Abort options
   * @param options.errorCode - Abort error code (default: 'failed')
   * @param options.method - Optional request method filter
   * @param options.once - Apply abort only once
   * @throws Error when abort route setup fails
   */
  async abortRequest(urlPattern: string | RegExp, options?: {
    errorCode?: 'aborted' | 'accessdenied' | 'addressunreachable' | 'blockedbyclient' | 'blockedbyresponse' | 'connectionaborted' | 'connectionclosed' | 'connectionfailed' | 'connectionrefused' | 'connectionreset' | 'internetdisconnected' | 'namenotresolved' | 'timedout' | 'failed';
    method?: string;
    once?: boolean;
  }): Promise<void> {
    const startTime = Date.now();
    const errorCode = options?.errorCode || 'failed';
    try {
      console.log(`🔄 Adding abort route for pattern: ${urlPattern}`);
      await this.page.route(
        urlPattern,
        async (route: Route, request: Request) => {
          if (options?.method && request.method().toUpperCase() !== options.method.toUpperCase()) {
            await route.continue();
            return;
          }
          await route.abort(errorCode);
        },
        { times: options?.once ? 1 : undefined }
      );
      const duration = Date.now() - startTime;
      console.log(`✅ Abort route added (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Failed to add abort route (${duration}ms)`);
      throw new Error(`Failed abortRequest() after ${duration}ms. Original error: ${(error as Error).message}`);
    }
  }

  /**
   * Alias for abortRequest with default failure semantics for quick negative-network tests.
   * @param urlPattern - URL matcher for requests to fail
   * @param options - Fail options
   * @param options.errorCode - Abort error code (default: 'failed')
   * @param options.method - Optional request method filter
   * @param options.once - Apply failure only once
   * @throws Error when fail route setup fails
   */
  async failRequest(urlPattern: string | RegExp, options?: {
    errorCode?: 'aborted' | 'accessdenied' | 'addressunreachable' | 'blockedbyclient' | 'blockedbyresponse' | 'connectionaborted' | 'connectionclosed' | 'connectionfailed' | 'connectionrefused' | 'connectionreset' | 'internetdisconnected' | 'namenotresolved' | 'timedout' | 'failed';
    method?: string;
    once?: boolean;
  }): Promise<void> {
    await this.abortRequest(urlPattern, {
      errorCode: options?.errorCode || 'failed',
      method: options?.method,
      once: options?.once
    });
  }

  // #endregion

  // ──────────────────────────────────────────────────────────────────────────
  // #region COOKIES & STORAGE
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Add cookies into current browser context.
   * @param cookies - Cookies to add
   * @throws Error when cookie insertion fails
   */
  async addCookies(cookies: Array<{
    name: string;
    value: string;
    url?: string;
    domain?: string;
    path?: string;
    expires?: number;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'Strict' | 'Lax' | 'None';
  }>): Promise<void> {
    const startTime = Date.now();
    try {
      console.log(`🔄 Adding ${cookies.length} cookie(s)`);
      await this.page.context().addCookies(cookies);
      const duration = Date.now() - startTime;
      console.log(`✅ Cookies added successfully (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Failed adding cookies (${duration}ms)`);
      throw new Error(`Failed addCookies() after ${duration}ms. Original error: ${(error as Error).message}`);
    }
  }

  /**
   * Get cookies from current context.
   * @param urls - Optional URL or URL list to filter cookies
   * @returns Cookies from context
   * @throws Error when cookie retrieval fails
   */
  async getCookies(urls?: string | string[]): Promise<Cookie[]> {
    const startTime = Date.now();
    try {
      const urlList = typeof urls === 'string' ? [urls] : urls;
      const cookies = await this.page.context().cookies(urlList);
      const duration = Date.now() - startTime;
      console.log(`✅ Retrieved ${cookies.length} cookie(s) (${duration}ms)`);
      return cookies;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Failed retrieving cookies (${duration}ms)`);
      throw new Error(`Failed getCookies() after ${duration}ms. Original error: ${(error as Error).message}`);
    }
  }

  /**
   * Clear cookies from current browser context.
   * @throws Error when cookie clearing fails
   */
  async clearCookies(): Promise<void> {
    const startTime = Date.now();
    try {
      console.log(`🔄 Clearing all cookies`);
      await this.page.context().clearCookies();
      const duration = Date.now() - startTime;
      console.log(`✅ Cookies cleared successfully (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Failed clearing cookies (${duration}ms)`);
      throw new Error(`Failed clearCookies() after ${duration}ms. Original error: ${(error as Error).message}`);
    }
  }

  /**
   * Clear all previously granted browser permissions for current context.
   * @throws Error when permission clearing fails
   */
  async clearPermissions(): Promise<void> {
    const startTime = Date.now();
    try {
      await this.page.context().clearPermissions();
      const duration = Date.now() - startTime;
      console.log(`✅ Permissions cleared (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      throw new Error(`Failed clearPermissions() after ${duration}ms. Original error: ${(error as Error).message}`);
    }
  }

  /**
   * Resize current page viewport for responsive behavior checks.
   * @param width - Viewport width in pixels
   * @param height - Viewport height in pixels
   * @throws Error when viewport resize fails
   */
  async setViewportSize(width: number, height: number): Promise<void> {
    const startTime = Date.now();
    try {
      await this.page.setViewportSize({ width, height });
      const duration = Date.now() - startTime;
      console.log(`✅ Viewport set to ${width}x${height} (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      throw new Error(`Failed setViewportSize(${width}, ${height}) after ${duration}ms. Original error: ${(error as Error).message}`);
    }
  }

  /**
   * Set a localStorage key/value for current origin.
   * @param key - localStorage key
   * @param value - localStorage value
   * @throws Error when storage write fails
   */
  async setLocalStorageItem(key: string, value: string): Promise<void> {
    const startTime = Date.now();
    try {
      await this.page.evaluate(({ storageKey, storageValue }) => {
        localStorage.setItem(storageKey, storageValue);
      }, { storageKey: key, storageValue: value });
      const duration = Date.now() - startTime;
      console.log(`✅ localStorage key set (${duration}ms): ${key}`);
    } catch (error) {
      const duration = Date.now() - startTime;
      throw new Error(`Failed setLocalStorageItem("${key}") after ${duration}ms. Original error: ${(error as Error).message}`);
    }
  }

  /**
   * Get a localStorage value for current origin.
   * @param key - localStorage key
   * @returns localStorage value or null
   * @throws Error when storage read fails
   */
  async getLocalStorageItem(key: string): Promise<string | null> {
    const startTime = Date.now();
    try {
      const value = await this.page.evaluate((storageKey) => localStorage.getItem(storageKey), key);
      const duration = Date.now() - startTime;
      console.log(`✅ localStorage key fetched (${duration}ms): ${key}`);
      return value;
    } catch (error) {
      const duration = Date.now() - startTime;
      throw new Error(`Failed getLocalStorageItem("${key}") after ${duration}ms. Original error: ${(error as Error).message}`);
    }
  }

  /**
   * Remove a localStorage item for current origin.
   * @param key - localStorage key
   * @throws Error when remove fails
   */
  async removeLocalStorageItem(key: string): Promise<void> {
    const startTime = Date.now();
    try {
      await this.page.evaluate((storageKey) => {
        localStorage.removeItem(storageKey);
      }, key);
      const duration = Date.now() - startTime;
      console.log(`✅ localStorage key removed (${duration}ms): ${key}`);
    } catch (error) {
      const duration = Date.now() - startTime;
      throw new Error(`Failed removeLocalStorageItem("${key}") after ${duration}ms. Original error: ${(error as Error).message}`);
    }
  }

  /**
   * Clear all localStorage entries for current origin.
   * @throws Error when clear fails
   */
  async clearLocalStorage(): Promise<void> {
    const startTime = Date.now();
    try {
      await this.page.evaluate(() => localStorage.clear());
      const duration = Date.now() - startTime;
      console.log(`✅ localStorage cleared (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      throw new Error(`Failed clearLocalStorage() after ${duration}ms. Original error: ${(error as Error).message}`);
    }
  }

  /**
   * Set a sessionStorage key/value for current origin.
   * @param key - sessionStorage key
   * @param value - sessionStorage value
   * @throws Error when storage write fails
   */
  async setSessionStorageItem(key: string, value: string): Promise<void> {
    const startTime = Date.now();
    try {
      await this.page.evaluate(({ storageKey, storageValue }) => {
        sessionStorage.setItem(storageKey, storageValue);
      }, { storageKey: key, storageValue: value });
      const duration = Date.now() - startTime;
      console.log(`✅ sessionStorage key set (${duration}ms): ${key}`);
    } catch (error) {
      const duration = Date.now() - startTime;
      throw new Error(`Failed setSessionStorageItem("${key}") after ${duration}ms. Original error: ${(error as Error).message}`);
    }
  }

  /**
   * Get a sessionStorage value for current origin.
   * @param key - sessionStorage key
   * @returns sessionStorage value or null
   * @throws Error when storage read fails
   */
  async getSessionStorageItem(key: string): Promise<string | null> {
    const startTime = Date.now();
    try {
      const value = await this.page.evaluate((storageKey) => sessionStorage.getItem(storageKey), key);
      const duration = Date.now() - startTime;
      console.log(`✅ sessionStorage key fetched (${duration}ms): ${key}`);
      return value;
    } catch (error) {
      const duration = Date.now() - startTime;
      throw new Error(`Failed getSessionStorageItem("${key}") after ${duration}ms. Original error: ${(error as Error).message}`);
    }
  }

  /**
   * Remove a sessionStorage item for current origin.
   * @param key - sessionStorage key
   * @throws Error when remove fails
   */
  async removeSessionStorageItem(key: string): Promise<void> {
    const startTime = Date.now();
    try {
      await this.page.evaluate((storageKey) => {
        sessionStorage.removeItem(storageKey);
      }, key);
      const duration = Date.now() - startTime;
      console.log(`✅ sessionStorage key removed (${duration}ms): ${key}`);
    } catch (error) {
      const duration = Date.now() - startTime;
      throw new Error(`Failed removeSessionStorageItem("${key}") after ${duration}ms. Original error: ${(error as Error).message}`);
    }
  }

  /**
   * Clear all sessionStorage entries for current origin.
   * @throws Error when clear fails
   */
  async clearSessionStorage(): Promise<void> {
    const startTime = Date.now();
    try {
      await this.page.evaluate(() => sessionStorage.clear());
      const duration = Date.now() - startTime;
      console.log(`✅ sessionStorage cleared (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      throw new Error(`Failed clearSessionStorage() after ${duration}ms. Original error: ${(error as Error).message}`);
    }
  }

  /**
   * Save current context storage state (cookies + localStorage) to file.
   * @param outputPath - Destination JSON file path
   * @throws Error when storage state save fails
   */
  async saveStorageState(outputPath: string): Promise<void> {
    const startTime = Date.now();
    try {
      await this.page.context().storageState({ path: outputPath });
      const duration = Date.now() - startTime;
      console.log(`✅ Storage state saved (${duration}ms): ${outputPath}`);
    } catch (error) {
      const duration = Date.now() - startTime;
      throw new Error(`Failed saveStorageState("${outputPath}") after ${duration}ms. Original error: ${(error as Error).message}`);
    }
  }

  // #endregion

  // ──────────────────────────────────────────────────────────────────────────
  // #region FRAMES & IFRAMES
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Resolve and return FrameLocator for iframe interactions using frame selector.
   * @param frameSelector - CSS/xpath/text selector for iframe element
   * @returns FrameLocator instance for chaining locators within frame
   */
  getFrameLocator(frameSelector: string): FrameLocator {
    return this.page.frameLocator(frameSelector);
  }

  /**
   * Resolve frame by name or URL with timeout polling support.
   * @param options - Frame lookup options
   * @param options.name - Frame name to match
   * @param options.url - Frame URL string or regex to match
   * @param options.timeout - Lookup timeout (default: 10000ms)
   * @returns Matched Frame instance
   * @throws Error when frame cannot be found in time
   */
  async getFrame(options: {
    name?: string;
    url?: string | RegExp;
    timeout?: number;
  }): Promise<Frame> {
    const timeout = options.timeout || 10000;
    const pollInterval = 250;
    const startTime = Date.now();
    try {
      while (Date.now() - startTime < timeout) {
        const frame = this.page.frame({
          name: options.name,
          url: options.url
        });
        if (frame) {
          return frame;
        }
        await this.page.waitForTimeout(pollInterval);
      }
      throw new Error(`Frame not found by name/url within ${timeout}ms`);
    } catch (error) {
      throw new Error(`Failed to get frame. Original error: ${(error as Error).message}`);
    }
  }

  /**
   * Resolve frame and wait for desired load state before returning.
   * @param options - Frame switch options
   * @param options.name - Frame name to match
   * @param options.url - Frame URL string or regex to match
   * @param options.timeout - Maximum wait timeout
   * @param options.waitForLoadState - Frame load state to wait for (default: 'domcontentloaded')
   * @returns Ready Frame instance
   * @throws Error when frame lookup/load wait fails
   */
  async switchFrame(options: {
    name?: string;
    url?: string | RegExp;
    timeout?: number;
    waitForLoadState?: 'load' | 'domcontentloaded' | 'networkidle';
  }): Promise<Frame> {
    const timeout = options.timeout || 10000;
    const waitForLoadState = options.waitForLoadState || 'domcontentloaded';
    const startTime = Date.now();
    try {
      const frame = await this.getFrame({
        name: options.name,
        url: options.url,
        timeout
      });
      await frame.waitForLoadState(waitForLoadState, { timeout });
      const duration = Date.now() - startTime;
      console.log(`✅ Frame ready (${duration}ms)`);
      return frame;
    } catch (error) {
      const duration = Date.now() - startTime;
      throw new Error(`Failed to switch frame after ${duration}ms. Original error: ${(error as Error).message}`);
    }
  }

  // #endregion

  // ──────────────────────────────────────────────────────────────────────────
  // #region TOUCH & MOBILE
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Tap element for mobile/touch-enabled interactions.
   * @param locator - Target element locator
   * @param options - Tap options
   * @param options.timeout - Maximum action timeout
   * @param options.force - Force interaction on non-actionable elements
   * @param options.modifiers - Keyboard modifiers during tap
   * @param options.noWaitAfter - Disable post-action waiting
   * @param options.position - Relative element tap coordinates
   * @param options.trial - Perform trial actionability check
   * @throws Error when tap fails after healing attempts
   */
  async tap(locator: Locator, options?: {
    timeout?: number;
    force?: boolean;
    modifiers?: ('Alt' | 'Control' | 'ControlOrMeta' | 'Meta' | 'Shift')[];
    noWaitAfter?: boolean;
    position?: { x: number; y: number };
    trial?: boolean;
  }): Promise<void> {
    const timeout = options?.timeout || 10000;
    const startTime = Date.now();
    const description = this.getDescription(locator);
    try {
      console.log(`🔄 Tapping:`, description || locator);
      await locator.waitFor({ state: 'visible', timeout });
      await locator.scrollIntoViewIfNeeded({ timeout });
      await this.highlightElement(locator);
      await locator.tap({
        timeout,
        force: options?.force,
        modifiers: options?.modifiers,
        noWaitAfter: options?.noWaitAfter,
        position: options?.position,
        trial: options?.trial
      });
      const duration = Date.now() - startTime;
      console.log(`✅ Tap successful (${duration}ms)`);
      await ScreenshotHelper.takeScreenshot(this.page, `tap_element_${description}`, this.testInfo);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Failed tap (${duration}ms)`);
      await ScreenshotHelper.takeFailureScreenshot(this.page, `tap_failed_${description}`, this.testInfo);
      const errorDetails = await this.gatherElementDiagnostics(locator);
      if (SelfHealingHelper.isLocatorError(error as Error) && SELF_HEAL_ENABLED) {
        return await SelfHealingHelper.trySelfHealing(
          this.page,
          locator,
          description,
          async (healedLocator) => {
            await healedLocator.tap({
              timeout,
              force: options?.force,
              modifiers: options?.modifiers,
              noWaitAfter: options?.noWaitAfter,
              position: options?.position,
              trial: options?.trial
            });
          }
        );
      }
      throw new Error(`Failed tap after ${duration}ms. ${errorDetails}. Original error: ${(error as Error).message}`);
    }
  }

  /**
   * Tap raw viewport coordinates using touchscreen API.
   * @param x - Viewport X coordinate
   * @param y - Viewport Y coordinate
   * @throws Error when coordinate tap fails
   */
  async touchTap(x: number, y: number): Promise<void> {
    const startTime = Date.now();
    try {
      console.log(`🔄 Touch tap at (${x}, ${y})`);
      await this.page.touchscreen.tap(x, y);
      const duration = Date.now() - startTime;
      console.log(`✅ Touch tap successful (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Failed touch tap (${duration}ms)`);
      throw new Error(`Failed touch tap after ${duration}ms. Original error: ${(error as Error).message}`);
    }
  }

  // #endregion

  // ──────────────────────────────────────────────────────────────────────────
  // #region FORM CONTROLS — CHECK, UNCHECK, FOCUS & BLUR
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Check checkbox/radio controls with resilience and diagnostics.
   * @param locator - Checkbox or radio locator
   * @param options - Check options
   * @param options.timeout - Maximum action timeout
   * @param options.force - Force interaction on non-actionable elements
   * @param options.noWaitAfter - Disable post-action waiting
   * @param options.position - Relative click position for check action
   * @param options.trial - Perform trial actionability check
   * @throws Error when check fails after healing attempts
   */
  async check(locator: Locator, options?: {
    timeout?: number;
    force?: boolean;
    noWaitAfter?: boolean;
    position?: { x: number; y: number };
    trial?: boolean;
  }): Promise<void> {
    const timeout = options?.timeout || 10000;
    const startTime = Date.now();
    const description = this.getDescription(locator);
    try {
      console.log(`🔄 Checking element:`, description || locator);
      await locator.waitFor({ state: 'visible', timeout });
      await locator.scrollIntoViewIfNeeded({ timeout });
      await this.highlightElement(locator);
      await locator.check({
        timeout,
        force: options?.force,
        noWaitAfter: options?.noWaitAfter,
        position: options?.position,
        trial: options?.trial
      });
      const duration = Date.now() - startTime;
      console.log(`✅ Check successful (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Failed check (${duration}ms)`);
      const errorDetails = await this.gatherElementDiagnostics(locator);
      if (SelfHealingHelper.isLocatorError(error as Error) && SELF_HEAL_ENABLED) {
        return await SelfHealingHelper.trySelfHealing(
          this.page,
          locator,
          description,
          async (healedLocator) => {
            await healedLocator.check({
              timeout,
              force: options?.force,
              noWaitAfter: options?.noWaitAfter,
              position: options?.position,
              trial: options?.trial
            });
          }
        );
      }
      throw new Error(`Failed check after ${duration}ms. ${errorDetails}. Original error: ${(error as Error).message}`);
    }
  }

  /**
   * Uncheck checkbox controls with resilience and diagnostics.
   * @param locator - Checkbox locator
   * @param options - Uncheck options
   * @param options.timeout - Maximum action timeout
   * @param options.force - Force interaction on non-actionable elements
   * @param options.noWaitAfter - Disable post-action waiting
   * @param options.position - Relative click position for uncheck action
   * @param options.trial - Perform trial actionability check
   * @throws Error when uncheck fails after healing attempts
   */
  async uncheck(locator: Locator, options?: {
    timeout?: number;
    force?: boolean;
    noWaitAfter?: boolean;
    position?: { x: number; y: number };
    trial?: boolean;
  }): Promise<void> {
    const timeout = options?.timeout || 10000;
    const startTime = Date.now();
    const description = this.getDescription(locator);
    try {
      console.log(`🔄 Unchecking element:`, description || locator);
      await locator.waitFor({ state: 'visible', timeout });
      await locator.scrollIntoViewIfNeeded({ timeout });
      await this.highlightElement(locator);
      await locator.uncheck({
        timeout,
        force: options?.force,
        noWaitAfter: options?.noWaitAfter,
        position: options?.position,
        trial: options?.trial
      });
      const duration = Date.now() - startTime;
      console.log(`✅ Uncheck successful (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Failed uncheck (${duration}ms)`);
      const errorDetails = await this.gatherElementDiagnostics(locator);
      if (SelfHealingHelper.isLocatorError(error as Error) && SELF_HEAL_ENABLED) {
        return await SelfHealingHelper.trySelfHealing(
          this.page,
          locator,
          description,
          async (healedLocator) => {
            await healedLocator.uncheck({
              timeout,
              force: options?.force,
              noWaitAfter: options?.noWaitAfter,
              position: options?.position,
              trial: options?.trial
            });
          }
        );
      }
      throw new Error(`Failed uncheck after ${duration}ms. ${errorDetails}. Original error: ${(error as Error).message}`);
    }
  }

  /**
   * Focus an element explicitly for keyboard and accessibility driven flows.
   * @param locator - Target element locator
   * @param options - Focus options
   * @param options.timeout - Maximum wait timeout
   * @throws Error when focus fails after healing attempts
   */
  async focus(locator: Locator, options?: {
    timeout?: number;
  }): Promise<void> {
    const timeout = options?.timeout || 10000;
    const startTime = Date.now();
    const description = this.getDescription(locator);
    try {
      console.log(`🔄 Focusing element:`, description || locator);
      await locator.waitFor({ state: 'attached', timeout });
      await locator.focus();
      const duration = Date.now() - startTime;
      console.log(`✅ Focus successful (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorDetails = await this.gatherElementDiagnostics(locator);
      if (SelfHealingHelper.isLocatorError(error as Error) && SELF_HEAL_ENABLED) {
        return await SelfHealingHelper.trySelfHealing(
          this.page,
          locator,
          description,
          async (healedLocator) => {
            await healedLocator.focus();
          }
        );
      }
      throw new Error(`Failed focus after ${duration}ms. ${errorDetails}. Original error: ${(error as Error).message}`);
    }
  }

  /**
   * Blur an element explicitly to trigger blur-based validations and handlers.
   * @param locator - Target element locator
   * @param options - Blur options
   * @param options.timeout - Maximum wait timeout
   * @throws Error when blur fails after healing attempts
   */
  async blur(locator: Locator, options?: {
    timeout?: number;
  }): Promise<void> {
    const timeout = options?.timeout || 10000;
    const startTime = Date.now();
    const description = this.getDescription(locator);
    try {
      console.log(`🔄 Blurring element:`, description || locator);
      await locator.waitFor({ state: 'attached', timeout });
      await locator.evaluate((element) => {
        (element as HTMLElement).blur();
      });
      const duration = Date.now() - startTime;
      console.log(`✅ Blur successful (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorDetails = await this.gatherElementDiagnostics(locator);
      if (SelfHealingHelper.isLocatorError(error as Error) && SELF_HEAL_ENABLED) {
        return await SelfHealingHelper.trySelfHealing(
          this.page,
          locator,
          description,
          async (healedLocator) => {
            await healedLocator.evaluate((element) => {
              (element as HTMLElement).blur();
            });
          }
        );
      }
      throw new Error(`Failed blur after ${duration}ms. ${errorDetails}. Original error: ${(error as Error).message}`);
    }
  }

  // #endregion

  // ──────────────────────────────────────────────────────────────────────────
  // #region UTILITIES — CONDITIONAL ACTIONS, EVALUATE & NETWORK IDLE
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Click an element only if it is currently visible — silently skips when the element is absent.
   * Use this for conditional UI elements such as cookie banners, tour overlays, or optional modals
   * that are not always present.
   * @param locator - Element to conditionally click.
   * @param options - Click options forwarded to `click()`.
   * @returns `true` when the element was found and clicked; `false` when it was absent.
   * @example
   * ```typescript
   * await actions.clickIfExists(cookieBanner);
   * await actions.clickIfExists(skipIntroBtn, { timeout: 2000 });
   * ```
   */
  async clickIfExists(locator: Locator, options?: {
    timeout?: number;
    force?: boolean;
    button?: 'left' | 'right' | 'middle';
  }): Promise<boolean> {
    const timeout = options?.timeout ?? 3000;
    const description = this.getDescription(locator);
    try {
      await locator.waitFor({ state: 'visible', timeout });
    } catch {
      console.log(`ℹ️ clickIfExists: element not found${description ? ` (${description})` : ''} — skipping`);
      return false;
    }
    await this.click(locator, { ...options, timeout });
    return true;
  }

  /**
   * Execute arbitrary JavaScript on the page and return the result.
   * A thin, logged wrapper around `page.evaluate()` that keeps test code within the
   * abstraction layer instead of reaching directly into the `page` object.
   * @param fn - Function to execute in the browser context.
   * @param arg - Optional serialisable argument passed to the function.
   * @returns The serialised return value of `fn`.
   * @example
   * ```typescript
   * const title = await actions.evaluate(() => document.title);
   * const count = await actions.evaluate((sel) => document.querySelectorAll(sel).length, '.item');
   * ```
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async evaluate<T = unknown>(fn: (...args: any[]) => T, arg?: unknown): Promise<T> {
    const startTime = Date.now();
    try {
      console.log(`🔄 Executing page script`);
      const result = await this.page.evaluate(fn, arg);
      console.log(`✅ Page script executed (${Date.now() - startTime}ms)`);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Page script failed (${duration}ms)`);
      throw new Error(`evaluate() failed after ${duration}ms. Original error: ${(error as Error).message}`);
    }
  }

  /**
   * Set a form-control value directly via the DOM — bypassing Playwright's `fill()`.
   * Some React/Vue/Angular components use controlled inputs that ignore programmatic
   * `fill()` calls because they listen to native DOM events rather than raw value changes.
   * This method sets `.value` and dispatches `input` + `change` events so frameworks
   * pick up the new value.
   * @param locator - Input, textarea, or select element locator.
   * @param value - Value to inject.
   * @example
   * ```typescript
   * await actions.setInputValueDirect(autocompleteField, 'New York');
   * await actions.setInputValueDirect(reactDatePicker, '2025-12-31');
   * ```
   */
  async setInputValueDirect(locator: Locator, value: string): Promise<void> {
    const description = this.getDescription(locator);
    const startTime = Date.now();
    try {
      console.log(`🔄 Setting input value directly${description ? ` on ${description}` : ''}: "${value}"`);
      await locator.waitFor({ state: 'visible', timeout: 10000 });
      await locator.evaluate((el, val) => {
        const input = el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
        input.value = val;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }, value);
      const duration = Date.now() - startTime;
      console.log(`✅ Input value set directly${description ? ` on ${description}` : ''} (${duration}ms)`);
      await ScreenshotHelper.takeScreenshot(this.page, `set_value_direct_${description}`, this.testInfo);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Failed to set input value directly${description ? ` on ${description}` : ''} (${duration}ms)`);
      await ScreenshotHelper.takeFailureScreenshot(this.page, `set_value_direct_failed_${description}`, this.testInfo);
      throw new Error(`setInputValueDirect() failed after ${duration}ms. Original error: ${(error as Error).message}`);
    }
  }

  /**
   * Wait until there are no in-flight network requests for a continuous quiet period.
   * Useful before taking a stable screenshot or assertion after an action that triggers
   * multiple sequential fetches.  Unlike `waitForPageLoad({ state: 'networkidle' })`,
   * this is scoped to the current moment and does not require a navigation event.
   * @param options - Wait configuration.
   * @param options.quietMs - Consecutive milliseconds of network silence required (default: 500ms).
   * @param options.timeout - Maximum total wait time (default: 10000ms).
   * @example
   * ```typescript
   * await actions.click(loadMoreBtn);
   * await actions.waitForNetworkIdle();
   * await assertions.assertElementCount(items, 20);
   * ```
   */
  async waitForNetworkIdle(options?: { quietMs?: number; timeout?: number }): Promise<void> {
    const quietMs = options?.quietMs ?? 500;
    const timeout = options?.timeout ?? 10000;
    const startTime = Date.now();
    console.log(`🔄 Waiting for network idle (quiet: ${quietMs}ms)`);
    try {
      await this.page.waitForLoadState('networkidle', { timeout });
      console.log(`✅ Network idle reached (${Date.now() - startTime}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.warn(`⚠️ Network did not fully idle within ${timeout}ms (${duration}ms elapsed) — continuing`);
    }
    // Additional configurable quiet-period on top of Playwright's built-in check
    if (quietMs > 500) {
      await this.page.waitForTimeout(quietMs - 500);
    }
  }

  /**
   * Scroll the page all the way to the bottom.
   * @param options - Scroll behaviour.
   * @param options.behavior - CSS scroll-behavior (`'smooth'` | `'auto'`, default: `'auto'`).
   * @example
   * ```typescript
   * await actions.scrollToBottom();
   * await actions.scrollToBottom({ behavior: 'smooth' });
   * ```
   */
  async scrollToBottom(options?: { behavior?: 'auto' | 'smooth' }): Promise<void> {
    const behavior = options?.behavior ?? 'auto';
    const startTime = Date.now();
    try {
      console.log(`🔄 Scrolling to page bottom`);
      await this.page.evaluate((b) => window.scrollTo({ top: document.body.scrollHeight, behavior: b as ScrollBehavior }), behavior);
      console.log(`✅ Scrolled to bottom (${Date.now() - startTime}ms)`);
      await ScreenshotHelper.takeScreenshot(this.page, `scroll_bottom`, this.testInfo);
    } catch (error) {
      const duration = Date.now() - startTime;
      throw new Error(`scrollToBottom() failed after ${duration}ms. Original error: ${(error as Error).message}`);
    }
  }

  /**
   * Scroll the page all the way to the top.
   * @param options - Scroll behaviour.
   * @param options.behavior - CSS scroll-behavior (`'smooth'` | `'auto'`, default: `'auto'`).
   * @example
   * ```typescript
   * await actions.scrollToTop();
   * ```
   */
  async scrollToTop(options?: { behavior?: 'auto' | 'smooth' }): Promise<void> {
    const behavior = options?.behavior ?? 'auto';
    const startTime = Date.now();
    try {
      console.log(`🔄 Scrolling to page top`);
      await this.page.evaluate((b) => window.scrollTo({ top: 0, behavior: b as ScrollBehavior }), behavior);
      console.log(`✅ Scrolled to top (${Date.now() - startTime}ms)`);
      await ScreenshotHelper.takeScreenshot(this.page, `scroll_top`, this.testInfo);
    } catch (error) {
      const duration = Date.now() - startTime;
      throw new Error(`scrollToTop() failed after ${duration}ms. Original error: ${(error as Error).message}`);
    }
  }

  // #endregion

}