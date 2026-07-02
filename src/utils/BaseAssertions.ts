import { expect, Locator, Page, TestInfo, APIResponse } from '@playwright/test';
import { ScreenshotHelper } from './ScreenShotsHelper';
import { BaseHelper } from './BaseHelper';

/**
 * Options for generic assertion helpers.
 * Set `soft: true` to use Playwright's native `expect.soft` — the test continues on failure
 * and all soft failures are reported together at the end.
 */
export type AssertOptions = { message?: string; soft?: boolean };

function parseAssertOptions(msgOrOpt?: string | AssertOptions): { message?: string; soft?: boolean } {
  if (typeof msgOrOpt === 'string') return { message: msgOrOpt };
  if (msgOrOpt && typeof msgOrOpt === 'object') return { message: msgOrOpt.message, soft: msgOrOpt.soft };
  return {};
}

/**
 * Base assertions class providing enhanced assertion capabilities with descriptive locators
 */
export class BaseAssertions extends BaseHelper {
  /**
   * Create a `BaseAssertions` helper bound to the current test page.
   * @param page - Playwright page instance under test.
   * @param testInfo - Current Playwright `TestInfo` for attachments/reporting.
   */
  constructor(page: Page, testInfo: TestInfo) {
    super(page, testInfo);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // #region ELEMENT STATE — VISIBILITY & INTERACTIVITY
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Assert element is visible with enhanced error handling, reporting, and self-healing
   * @param locator - Element locator to check (can use locator.describe() for better error messages)
   * @param options - Assert configuration options
   * @param options.timeout - Maximum time to wait for element to be visible (default: 10000ms)
   * @param options.message - Custom error message to display on failure
   * @returns Promise that resolves when assertion passes
   * @throws Error with detailed diagnostics if element is not visible after self-healing attempts
   * @example
   * ```typescript
   * await assertions.assertElementVisible(loginButton);
   * ```
   * @example
   * ```typescript
   * await assertions.assertElementVisible(errorMessage, {
   *   timeout: 5000,
   *   message: 'Error message should be visible after form submission'
   * });
   * ```
   */
  async assertElementVisible(locator: Locator, options?: {
    timeout?: number;
    message?: string;
    /** When `true`, uses `expect.soft` — failure is recorded but execution continues. */
    soft?: boolean;
  }): Promise<void> {
    const desc = this.getDescription(locator);
    return this.runLocatorAssertion(
      locator, options,
      {
        stepLabel: 'Asserting element is visible',
        failureMessage: `Element${desc ? ` (${desc})` : ''} is not visible`,
        screenshotOnFail: `not_visible_element ${desc}`,
        screenshotOnPass: `visible_element ${desc}`,
        isSelfHealEligible: true,
      },
      (exp, locator, message, timeout) => exp(locator, message).toBeVisible({ timeout }),
    );
  }

  /**
   * Assert element is not visible (hidden or removed from DOM)
   * @param locator - Element locator to check (can use locator.describe() for better error messages)
   * @param options - Assert configuration options
   * @param options.timeout - Maximum time to wait for element to be hidden (default: 5000ms)
   * @param options.message - Custom error message to display on failure
   * @returns Promise that resolves when assertion passes
   * @throws Error if element is still visible when it shouldn't be
   * @example
   * ```typescript
   * await assertions.assertElementNotVisible(loadingSpinner);
   * ```
   * @example
   * ```typescript
   * await assertions.assertElementNotVisible(errorMessage, {
   *   message: 'Error message should be hidden after successful login'
   * });
   * ```
   */
  async assertElementNotVisible(locator: Locator, options?: {
    timeout?: number;
    message?: string;
    /** When `true`, uses `expect.soft` — failure is recorded but execution continues. */
    soft?: boolean;
  }): Promise<void> {
    const desc = this.getDescription(locator);
    return this.runLocatorAssertion(
      locator, { ...options, timeout: options?.timeout ?? 5000 },
      {
        stepLabel: 'Asserting element is not visible',
        failureMessage: `Element${desc ? ` (${desc})` : ''} should not be visible but it is`,
        screenshotOnFail: `incorrectly_visible_element ${desc}`,
      },
      (exp, locator, message, timeout) => exp(locator, message).not.toBeVisible({ timeout }),
    );
  }

  /**
   * Assert element is enabled and clickable with error handling and self-healing
   * @param locator - Element locator to check (can use locator.describe() for better error messages)
   * @param options - Assert configuration options
   * @param options.timeout - Maximum time to wait for element to be enabled (default: 10000ms)
   * @param options.message - Custom error message to display on failure
   * @returns Promise that resolves when assertion passes
   * @throws Error with detailed diagnostics if element is not enabled after self-healing attempts
   * @example
   * ```typescript
   * await assertions.assertElementEnabled(submitButton);
   * ```
   * @example
   * ```typescript
   * await assertions.assertElementEnabled(inputField, {
   *   message: 'Input field should be enabled after validation passes'
   * });
   * ```
   */
  async assertElementEnabled(locator: Locator, options?: {
    timeout?: number;
    message?: string;
    /** When `true`, uses `expect.soft` — failure is recorded but execution continues. */
    soft?: boolean;
  }): Promise<void> {
    const desc = this.getDescription(locator);
    return this.runLocatorAssertion(
      locator, options,
      {
        stepLabel: 'Asserting element is enabled',
        failureMessage: `Element${desc ? ` (${desc})` : ''} is not enabled`,
        screenshotOnFail: `not_enabled_element - ${desc}`,
        screenshotOnPass: `enabled_element - ${desc}`,
        isSelfHealEligible: true,
      },
      (exp, locator, message, timeout) => exp(locator, message).toBeEnabled({ timeout }),
    );
  }

  /**
   * Assert element is disabled and not clickable with error handling and self-healing
   * @param locator - Element locator to check (can use locator.describe() for better error messages)
   * @param options - Assert configuration options
   * @param options.timeout - Maximum time to wait for element to be disabled (default: 10000ms)
   * @param options.message - Custom error message to display on failure
   * @returns Promise that resolves when assertion passes
   * @throws Error with detailed diagnostics if element is not disabled after self-healing attempts
   * @example
   * ```typescript
   * await assertions.assertElementDisabled(submitButton);
   * ```
   * @example
   * ```typescript
   * await assertions.assertElementDisabled(inputField, {
   *   message: 'Input field should be disabled during form validation'
   * });
   * ```
   */
  async assertElementDisabled(locator: Locator, options?: {
    timeout?: number;
    message?: string;
    /** When `true`, uses `expect.soft` — failure is recorded but execution continues. */
    soft?: boolean;
  }): Promise<void> {
    const desc = this.getDescription(locator);
    return this.runLocatorAssertion(
      locator, options,
      {
        stepLabel: 'Asserting element is disabled',
        failureMessage: `Element${desc ? ` (${desc})` : ''} should be disabled but it's not`,
        screenshotOnFail: `not_disabled_element - ${desc}`,
        screenshotOnPass: `disabled_element - ${desc}`,
        isSelfHealEligible: true,
      },
      (exp, locator, message, timeout) => exp(locator, message).toBeDisabled({ timeout }),
    );
  }

  // #endregion

  // ──────────────────────────────────────────────────────────────────────────
  // #region ELEMENT CONTENT — TEXT
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Assert element has exact text content with error handling and self-healing
   * @param locator - Element locator to check (can use locator.describe() for better error messages)
   * @param expectedText - Expected text content (string or RegExp)
   * @param options - Assert configuration options
   * @param options.timeout - Maximum time to wait for text match (default: 10000ms)
   * @param options.ignoreCase - Whether to ignore case when comparing text (default: false)
   * @param options.message - Custom error message to display on failure
   * @returns Promise that resolves when assertion passes
   * @throws Error with actual vs expected text details if assertion fails after self-healing attempts
   * @example
   * ```typescript
   * await assertions.assertElementText(heading, 'Welcome to our site');
   * ```
   * @example
   * ```typescript
   * await assertions.assertElementText(statusMessage, /success/i, {
   *   ignoreCase: true,
   *   message: 'Status should show success message'
   * });
   * ```
   */
  async assertElementText(
    locator: Locator,
    expectedText: string | RegExp,
    options?: {
      timeout?: number;
      ignoreCase?: boolean;
      message?: string;
      /** When `true`, uses `expect.soft` — failure is recorded but execution continues. */
      soft?: boolean;
    },
  ): Promise<void> {
    const desc = this.getDescription(locator);
    const normalised: string | RegExp =
      options?.ignoreCase && typeof expectedText === 'string'
        ? new RegExp(expectedText, 'i')
        : expectedText;
    return this.runLocatorAssertion(
      locator, options,
      {
        stepLabel: `Asserting element text: "${expectedText}"`,
        failureMessage: `Text mismatch in element${desc ? ` (${desc})` : ''}`,
        screenshotOnFail: `text_mismatch ${desc}`,
        screenshotOnPass: `text_match ${desc}`,
        isSelfHealEligible: true,
      },
      (exp, locator, message, timeout) => exp(locator, message).toHaveText(normalised, { timeout }),
    );
  }


  /**
   * Assert element contains specific text with error handling and self-healing
   * @param locator - Element locator to check (can use locator.describe() for better error messages)
   * @param expectedText - Text that should be contained in element (string or RegExp)
   * @param options - Assert configuration options
   * @param options.timeout - Maximum time to wait for text to be contained (default: 10000ms)
   * @param options.ignoreCase - Whether to ignore case when comparing text (default: false)
   * @param options.message - Custom error message to display on failure
   * @returns Promise that resolves when assertion passes
   * @throws Error with actual vs expected text details if assertion fails after self-healing attempts
   * @example
   * ```typescript
   * await assertions.assertElementContainsText(description, 'success');
   * ```
   * @example
   * ```typescript
   * await assertions.assertElementContainsText(errorDiv, /invalid/i, {
   *   ignoreCase: true,
   *   message: 'Error message should contain invalid'
   * });
   * ```
   */
  async assertElementContainsText(locator: Locator, expectedText: string | RegExp, options?: {
    timeout?: number;
    ignoreCase?: boolean;
    message?: string;
    /** When `true`, uses `expect.soft` — failure is recorded but execution continues. */
    soft?: boolean;
  }): Promise<void> {
    const desc = this.getDescription(locator);
    const normalised: string | RegExp =
      options?.ignoreCase && typeof expectedText === 'string'
        ? new RegExp(expectedText, 'i')
        : expectedText;
    return this.runLocatorAssertion(
      locator, options,
      {
        stepLabel: `Asserting element contains text: "${expectedText}"`,
        failureMessage: `Text not found in element${desc ? ` (${desc})` : ''}`,
        screenshotOnFail: `text_not_contains_element ${desc}`,
        screenshotOnPass: `text_contains_element ${desc}`,
        isSelfHealEligible: true,
      },
      (exp, locator, message, timeout) => exp(locator, message).toContainText(normalised, { timeout }),
    );
  }

  // #endregion

  // ──────────────────────────────────────────────────────────────────────────
  // #region ELEMENT CONTENT — VALUE & ATTRIBUTES
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Assert element has specific value (for input fields) with error handling and self-healing
   * @param locator - Element locator to check (can use locator.describe() for better error messages)
   * @param expectedValue - Expected input value (string or RegExp)
   * @param options - Assert configuration options
   * @param options.timeout - Maximum time to wait for value match (default: 10000ms)
   * @param options.message - Custom error message to display on failure
   * @returns Promise that resolves when assertion passes
   * @throws Error with actual vs expected value details if assertion fails after self-healing attempts
   * @example
   * ```typescript
   * await assertions.assertElementValue(usernameField, 'testuser');
   * ```
   * @example
   * ```typescript
   * await assertions.assertElementValue(emailField, /@example\.com$/, {
   *   message: 'Email should end with @example.com'
   * });
   * ```
   */
  async assertElementValue(locator: Locator, expectedValue: string | RegExp, options?: {
    timeout?: number;
    message?: string;
    /** When `true`, uses `expect.soft` — failure is recorded but execution continues. */
    soft?: boolean;
  }): Promise<void> {
    const desc = this.getDescription(locator);
    return this.runLocatorAssertion(
      locator, options,
      {
        stepLabel: `Asserting element value: "${expectedValue}"`,
        failureMessage: `Value mismatch${desc ? ` in "${desc}"` : ''}`,
        screenshotOnFail: `value_mismatch ${desc}`,
        screenshotOnPass: `value_match ${desc}`,
        isSelfHealEligible: true,
      },
      (exp, locator, message, timeout) => exp(locator, message).toHaveValue(expectedValue, { timeout }),
    );
  }

  /**
   * Assert element has specific attribute with expected value and self-healing
   * @param locator - Element locator to check (can use locator.describe() for better error messages)
   * @param attributeName - Name of the attribute to check (e.g., 'href', 'src', 'class')
   * @param expectedValue - Expected attribute value (string or RegExp)
   * @param options - Assert configuration options
   * @param options.timeout - Maximum time to wait for attribute match (default: 10000ms)
   * @param options.message - Custom error message to display on failure
   * @returns Promise that resolves when assertion passes
   * @throws Error with actual vs expected attribute value details if assertion fails after self-healing attempts
   * @example
   * ```typescript
   * await assertions.assertElementAttribute(linkElement, 'href', 'https://example.com');
   * ```
   * @example
   * ```typescript
   * await assertions.assertElementAttribute(imageElement, 'src', /logo\.png$/, {
   *   message: 'Image should have logo.png as source'
   * });
   * ```
   */
  async assertElementAttribute(locator: Locator, attributeName: string, expectedValue: string | RegExp, options?: {
    timeout?: number;
    message?: string;
    /** When `true`, uses `expect.soft` — failure is recorded but execution continues. */
    soft?: boolean;
  }): Promise<void> {
    const desc = this.getDescription(locator);
    return this.runLocatorAssertion(
      locator, options,
      {
        stepLabel: `Asserting attribute "${attributeName}": "${expectedValue}"`,
        failureMessage: `Attribute "${attributeName}" mismatch${desc ? ` in "${desc}"` : ''}`,
        screenshotOnFail: `attribute_mismatch ${desc}`,
        isSelfHealEligible: true,
      },
      (exp, locator, message, timeout) => exp(locator, message).toHaveAttribute(attributeName, expectedValue, { timeout }),
    );
  }

  /**
   * Assert that an element has an attribute at all — without checking its value.
   * Useful for boolean / presence-only attributes such as `disabled`, `readonly`, `checked`,
   * `required`, `aria-expanded`, etc.
   * @param locator - Element locator to inspect.
   * @param attributeName - Name of the attribute that must be present on the element.
   * @param options - Assert configuration options.
   * @param options.timeout - Maximum time to wait (default: 10000ms).
   * @param options.message - Custom error message on failure.
   * @param options.soft - When `true`, uses `expect.soft`; failure is recorded but execution continues.
   * @example
   * ```typescript
   * await assertions.assertElementHasAttribute(submitBtn, 'disabled');
   * await assertions.assertElementHasAttribute(checkbox, 'required', { soft: true });
   * ```
   */
  async assertElementHasAttribute(locator: Locator, attributeName: string, options?: {
    timeout?: number;
    message?: string;
    /** When `true`, uses `expect.soft` — failure is recorded but execution continues. */
    soft?: boolean;
  }): Promise<void> {
    const desc = this.getDescription(locator);
    return this.runLocatorAssertion(
      locator, options,
      {
        stepLabel: `Asserting attribute "${attributeName}" exists`,
        failureMessage: `Element is missing attribute "${attributeName}"${desc ? ` on "${desc}"` : ''}`,
        // /^.*$/ matches any value including the empty string returned for boolean attributes.
        screenshotOnFail: `attribute_missing_${attributeName}_${desc}`,
        isSelfHealEligible: true,
      },
      (exp, locator, message, timeout) => exp(locator, message).toHaveAttribute(attributeName, /^.*$/, { timeout }),
    );
  }

  /**
   * Assert that an element does **not** have the specified attribute.
   * Complement to `assertElementHasAttribute` — useful for verifying an attribute has been removed
   * (e.g. `disabled` removed after enabling a button, `aria-expanded` removed after collapse).
   * @param locator - Element locator to inspect.
   * @param attributeName - Name of the attribute that must **not** be present on the element.
   * @param options - Assert configuration options.
   * @param options.timeout - Maximum time to wait (default: 10000ms).
   * @param options.message - Custom error message on failure.
   * @param options.soft - When `true`, uses `expect.soft`; failure is recorded but execution continues.
   * @example
   * ```typescript
   * await page.click('#enable-btn');
   * await assertions.assertElementNotHasAttribute(submitBtn, 'disabled');
   * await assertions.assertElementNotHasAttribute(panel, 'aria-expanded', { soft: true });
   * ```
   */
  async assertElementNotHasAttribute(locator: Locator, attributeName: string, options?: {
    timeout?: number;
    message?: string;
    /** When `true`, uses `expect.soft` — failure is recorded but execution continues. */
    soft?: boolean;
  }): Promise<void> {
    const desc = this.getDescription(locator);
    return this.runLocatorAssertion(
      locator, options,
      {
        stepLabel: `Asserting attribute "${attributeName}" is absent`,
        failureMessage: `Element still has attribute "${attributeName}"${desc ? ` on "${desc}"` : ''}`,
        screenshotOnFail: `attribute_present_${attributeName}_${desc}`,
      },
      (exp, locator, message, timeout) => exp(locator, message).not.toHaveAttribute(attributeName, /^.*$/, { timeout }),
    );
  }

  // #endregion

  // ──────────────────────────────────────────────────────────────────────────
  // #region ELEMENT COUNT & GEOMETRY
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Assert exact number of elements found with error handling
   * @param locator - Element locator to count (can use locator.describe() for better error messages)
   * @param expectedCount - Expected number of elements
   * @param options - Assert configuration options
   * @param options.timeout - Maximum time to wait for count match (default: 10000ms)
   * @param options.message - Custom error message to display on failure
   * @returns Promise that resolves when assertion passes
   * @throws Error with actual vs expected count details if assertion fails
   * @example
   * ```typescript
   * await assertions.assertElementCount(productItems, 5);
   * ```
   * @example
   * ```typescript
   * await assertions.assertElementCount(errorMessages, 0, {
   *   message: 'No error messages should be displayed'
   * });
   * ```
   */
  async assertElementCount(locator: Locator, expectedCount: number, options?: {
    timeout?: number;
    message?: string;
    /** When `true`, uses `expect.soft` — failure is recorded but execution continues. */
    soft?: boolean;
  }): Promise<void> {
    const desc = this.getDescription(locator);
    return this.runLocatorAssertion(locator, options, {
      stepLabel:        `Asserting count${desc ? ` of ${desc}` : ''}: ${expectedCount}`,
      failureMessage:   `Element count mismatch${desc ? ` for "${desc}"` : ''}`,
      screenshotOnFail: `count_mismatch ${desc}`,
      screenshotOnPass: `count_match ${desc}`,
    },
    (exp, locator, message, timeout) => exp(locator, message).toHaveCount(expectedCount, { timeout }),
    );
  }

  /**
   * Assert element count is greater than expected minimum with error handling
   * @param locator - Element locator to count (can use locator.describe() for better error messages)
   * @param minCount - Minimum expected count (exclusive)
   * @param options - Assert configuration options
   * @param options.timeout - Maximum time to wait for count check (default: 10000ms)
   * @param options.message - Custom error message to display on failure
   * @returns Promise that resolves when assertion passes
   * @throws Error with actual count details if assertion fails
   * @example
   * ```typescript
   * await assertions.assertElementCountGreaterThan(searchResults, 0);
   * ```
   * @example
   * ```typescript
   * await assertions.assertElementCountGreaterThan(productItems, 2, {
   *   message: 'Should have more than 2 products'
   * });
   * ```
   */
  async assertElementCountGreaterThan(locator: Locator, minCount: number, options?: {
    timeout?: number;
    message?: string;
    /** When `true`, uses `expect.soft` — failure is recorded but execution continues. */
    soft?: boolean;
  }): Promise<void> {
    const desc = this.getDescription(locator);
    return this.runPolledCountAssertion(locator, options, {
      stepLabel:        `Asserting count${desc ? ` of ${desc}` : ''} is greater than: ${minCount}`,
      failureMessage:   `Element count not greater than expected${desc ? ` for "${desc}"` : ''}`,
      screenshotOnFail: `count_not_greater ${desc}`,
      screenshotOnPass: `count_greater ${desc}`,
      expectedLabel:    `> ${minCount}`,
    },
    (count) => count <= minCount,
    (exp, count, m) => exp(count, m).toBeGreaterThan(minCount),
    );
  }

  /**
   * Assert element count is strictly less than a threshold.
   * @param locator - Element locator to count.
   * @param maxCount - Upper bound (exclusive).  Actual count must be < `maxCount`.
   * @param options - Assert configuration options.
   * @param options.timeout - Maximum time to wait (default: 10000ms).
   * @param options.message - Custom error message on failure.
   * @param options.soft - When `true`, uses `expect.soft`; failure is recorded but execution continues.
   * @example
   * ```typescript
   * await assertions.assertElementCountLessThan(errorBanners, 3);
   * ```
   */
  async assertElementCountLessThan(locator: Locator, maxCount: number, options?: {
    timeout?: number;
    message?: string;
    /** When `true`, uses `expect.soft` — failure is recorded but execution continues. */
    soft?: boolean;
  }): Promise<void> {
    const desc = this.getDescription(locator);
    return this.runPolledCountAssertion(locator, options, {
      stepLabel:        `Asserting count${desc ? ` of ${desc}` : ''} is less than: ${maxCount}`,
      failureMessage:   `Element count not less than expected${desc ? ` for "${desc}"` : ''}`,
      screenshotOnFail: `count_not_less ${desc}`,
      screenshotOnPass: `count_less ${desc}`,
      expectedLabel:    `< ${maxCount}`,
    },
    (count) => count >= maxCount,
    (exp, count, m) => exp(count, m).toBeLessThan(maxCount),
    );
  }

  /**
   * Assert element count is less than or equal to a threshold.
   * @param locator - Element locator to count.
   * @param maxCount - Upper bound (inclusive).  Actual count must be <= `maxCount`.
   * @param options - Assert configuration options.
   * @param options.timeout - Maximum time to wait (default: 10000ms).
   * @param options.message - Custom error message on failure.
   * @param options.soft - When `true`, uses `expect.soft`; failure is recorded but execution continues.
   * @example
   * ```typescript
   * await assertions.assertElementCountLessThanOrEqual(notifications, 5);
   * ```
   */
  async assertElementCountLessThanOrEqual(locator: Locator, maxCount: number, options?: {
    timeout?: number;
    message?: string;
    /** When `true`, uses `expect.soft` — failure is recorded but execution continues. */
    soft?: boolean;
  }): Promise<void> {
    const desc = this.getDescription(locator);
    return this.runPolledCountAssertion(locator, options, {
      stepLabel:        `Asserting count${desc ? ` of ${desc}` : ''} is <= ${maxCount}`,
      failureMessage:   `Element count exceeds expected maximum${desc ? ` for "${desc}"` : ''}`,
      screenshotOnFail: `count_not_less_or_equal ${desc}`,
      expectedLabel:    `<= ${maxCount}`,
    },
    (count) => count > maxCount,
    (exp, count, m) => exp(count, m).toBeLessThanOrEqual(maxCount),
    );
  }

  /**
   * Assert the bounding box (position and/or size) of an element.
   * Only the fields you supply are checked — omit any field to skip checking it.
   * An optional `tolerance` (default 0) allows pixel-level fuzz for anti-aliasing or sub-pixel layout.
   * @param locator - Element locator whose bounding box will be measured.
   * @param expected - Expected bounding box fields. All are optional.
   * @param expected.x - Expected left edge (px).
   * @param expected.y - Expected top edge (px).
   * @param expected.width - Expected width (px).
   * @param expected.height - Expected height (px).
   * @param expected.tolerance - Allowed deviation in pixels (default 0).
   * @param options - Assert configuration options.
   * @param options.message - Custom error message on failure.
   * @param options.soft - When `true`, uses `expect.soft`; failure is recorded but execution continues.
   * @example
   * ```typescript
   * await assertions.assertElementBoundingBox(logo, { width: 200, height: 60, tolerance: 2 });
   * await assertions.assertElementBoundingBox(modal, { x: 100, y: 50 });
   * ```
   */
  async assertElementBoundingBox(locator: Locator, expected: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    tolerance?: number;
  }, options?: {
    message?: string;
    /** When `true`, uses `expect.soft` — failure is recorded but execution continues. */
    soft?: boolean;
  }): Promise<void> {
    const description = this.getDescription(locator);
    const startTime = Date.now();
    const isSoft = options?.soft ?? false;
    const tolerance = expected.tolerance ?? 0;
    const customMessage = options?.message || `Bounding box assertion failed${description ? ` for "${description}"` : ''}`;
    const errorsBefore = this.testInfo.errors.length;

    console.log(`🔍 Asserting bounding box${description ? ` of ${description}` : ''}`, expected);

    const box = await locator.boundingBox();
    if (!box) {
      const duration = Date.now() - startTime;
      await ScreenshotHelper.takeFailureScreenshot(this.page, `bbox_not_found_${description}`, this.testInfo);
      throw new Error(`${customMessage}: element is not visible or not in the DOM. Duration: ${duration}ms.`);
    }

    const failures: string[] = [];
    const check = (field: 'x' | 'y' | 'width' | 'height') => {
      if (expected[field] === undefined) return;
      const diff = Math.abs(box[field] - expected[field]!);
      if (diff > tolerance) {
        failures.push(`${field}: expected ${expected[field]} ±${tolerance}, got ${box[field]} (diff ${diff})`);
      }
    };

    check('x');
    check('y');
    check('width');
    check('height');

    const duration = Date.now() - startTime;

    if (failures.length > 0) {
      const detail = failures.join('; ');
      await ScreenshotHelper.takeFailureScreenshot(this.page, `bbox_mismatch_${description}`, this.testInfo);

      if (isSoft) {
        this.testInfo.errors.push({ message: `${customMessage}. ${detail}. Duration: ${duration}ms.` });
        if (this.testInfo.errors.length > errorsBefore) {
          console.error(`❌ Bounding box assertion failed (soft)${description ? ` for ${description}` : ''} — ${detail} (${duration}ms)`);
        }
        return;
      }
      throw new Error(`${customMessage}. ${detail}. Duration: ${duration}ms.`);
    }

    await ScreenshotHelper.takeScreenshot(this.page, `bbox_ok_${description}`, this.testInfo);
    console.log(`✅ Bounding box assertion passed${description ? ` for ${description}` : ''} (${duration}ms)`, box);
  }

  // #endregion

  // ──────────────────────────────────────────────────────────────────────────
  // #region PAGE ASSERTIONS — URL, TITLE & TEXT
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Assert current page URL matches expected pattern with error handling
   * @param expectedURL - Expected URL pattern (string or RegExp)
   * @param options - Assert configuration options
   * @param options.timeout - Maximum time to wait for URL match (default: 10000ms)
   * @param options.message - Custom error message to display on failure
   * @returns Promise that resolves when assertion passes
   * @throws Error with actual vs expected URL details if assertion fails
   * @example
   * ```typescript
   * await assertions.assertURL('https://example.com/dashboard');
   * ```
   * @example
   * ```typescript
   * await assertions.assertURL(/\/dashboard\//, {
   *   message: 'Should be on dashboard page'
   * });
   * ```
   */
  async assertURL(expectedURL: string | RegExp, options?: {
    timeout?: number;
    message?: string;
    /** When `true`, uses `expect.soft` — failure is recorded but execution continues. */
    soft?: boolean;
  }): Promise<void> {
    return this.runPageAssertion(options, {
      stepLabel:        `Asserting URL matches: ${expectedURL}`,
      failureMessage:   'URL does not match expected pattern',
      screenshotOnFail: 'url_mismatch',
    },
    (exp, page, message, timeout) => exp(page, message).toHaveURL(expectedURL, { timeout }),
    );
  }

  /**
   * Assert page title matches expected pattern with error handling
   * @param expectedTitle - Expected page title (string or RegExp)
   * @param options - Assert configuration options
   * @param options.timeout - Maximum time to wait for title match (default: 10000ms)
   * @param options.message - Custom error message to display on failure
   * @returns Promise that resolves when assertion passes
   * @throws Error with actual vs expected title details if assertion fails
   * @example
   * ```typescript
   * await assertions.assertPageTitle('Dashboard - My App');
   * ```
   * @example
   * ```typescript
   * await assertions.assertPageTitle(/Dashboard/, {
   *   message: 'Page title should contain Dashboard'
   * });
   * ```
   */
  async assertPageTitle(expectedTitle: string | RegExp, options?: {
    timeout?: number;
    message?: string;
    /** When `true`, uses `expect.soft` — failure is recorded but execution continues. */
    soft?: boolean;
  }): Promise<void> {
    return this.runPageAssertion(options, {
      stepLabel:        `Asserting page title: ${expectedTitle}`,
      failureMessage:   'Page title does not match expected',
      screenshotOnFail: 'title_mismatch',
    },
    (exp, page, message, timeout) => exp(page, message).toHaveTitle(expectedTitle, { timeout }),
    );
  }

  /**
   * Assert that the page body contains the specified text anywhere in the visible DOM.
   * This is a page-wide check — use `assertElementText` when you need to scope it to a specific element.
   * @param expectedText - Text or RegExp to search for inside `<body>`.
   * @param options - Assert configuration options.
   * @param options.timeout - Maximum time to wait (default: 10000ms).
   * @param options.message - Custom error message on failure.
   * @param options.soft - When `true`, uses `expect.soft`; failure is recorded but execution continues.
   * @example
   * ```typescript
   * await assertions.assertPageContainsText('Welcome back, Alice');
   * await assertions.assertPageContainsText(/Order #\d+/, { soft: true });
   * ```
   */
  async assertPageContainsText(expectedText: string | RegExp, options?: {
    timeout?: number;
    message?: string;
    /** When `true`, uses `expect.soft` — failure is recorded but execution continues. */
    soft?: boolean;
  }): Promise<void> {
    return this.runLocatorAssertion(this.page.locator('body'), options, {
      stepLabel:        `Asserting page contains text: ${expectedText}`,
      failureMessage:   `Page does not contain expected text: "${expectedText}"`,
      screenshotOnFail: 'page_text_missing',
    },
    (exp, locator, message, timeout) => exp(locator, message).toContainText(expectedText, { timeout }),
    );
  }

  // #endregion

  // ──────────────────────────────────────────────────────────────────────────
  // #region ELEMENT STATE — INTERACTION & PRESENCE
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Assert element is checked (for checkboxes/radio buttons) with error handling and self-healing
   * @param locator - Element locator to check (can use locator.describe() for better error messages)
   * @param options - Assert configuration options
   * @param options.timeout - Maximum time to wait for element to be checked (default: 10000ms)
   * @param options.message - Custom error message to display on failure
   * @returns Promise that resolves when assertion passes
   * @throws Error with detailed diagnostics if element is not checked after self-healing attempts
   * @example
   * ```typescript
   * await assertions.assertElementChecked(termsCheckbox);
   * ```
   * @example
   * ```typescript
   * await assertions.assertElementChecked(radioButton, {
   *   message: 'Radio button should be selected'
   * });
   * ```
   */
  async assertElementChecked(locator: Locator, options?: {
    timeout?: number;
    message?: string;
    /** When `true`, uses `expect.soft` — failure is recorded but execution continues. */
    soft?: boolean;
  }): Promise<void> {
    const desc = this.getDescription(locator);
    return this.runLocatorAssertion(
      locator, options,
      {
        stepLabel: 'Asserting element is checked',
        failureMessage: `Element${desc ? ` "${desc}"` : ''} is not checked`,
        screenshotOnFail: `not_checked ${desc}`,
        screenshotOnPass: `checked ${desc}`,
        isSelfHealEligible: true,
      },
      (exp, locator, message, timeout) => exp(locator, message).toBeChecked({ timeout }),
    );
  }

  /**
   * Assert element is not checked (for checkboxes/radio buttons) with error handling and self-healing
   * @param locator - Element locator to check (can use locator.describe() for better error messages)
   * @param options - Assert configuration options
   * @param options.timeout - Maximum time to wait for element to be unchecked (default: 10000ms)
   * @param options.message - Custom error message to display on failure
   * @returns Promise that resolves when assertion passes
   * @throws Error with detailed diagnostics if element is checked when it shouldn't be after self-healing attempts
   * @example
   * ```typescript
   * await assertions.assertElementNotChecked(optionalCheckbox);
   * ```
   * @example
   * ```typescript
   * await assertions.assertElementNotChecked(radioButton, {
   *   message: 'Radio button should not be selected by default'
   * });
   * ```
   */
  async assertElementNotChecked(locator: Locator, options?: {
    timeout?: number;
    message?: string;
    /** When `true`, uses `expect.soft` — failure is recorded but execution continues. */
    soft?: boolean;
  }): Promise<void> {
    const desc = this.getDescription(locator);
    return this.runLocatorAssertion(
      locator, options,
      {
        stepLabel: 'Asserting element is not checked',
        failureMessage: `Element${desc ? ` "${desc}"` : ''} should not be checked but it is`,
        screenshotOnFail: `incorrectly_checked${desc ? `_${desc.replace(/\s+/g, '_').toLowerCase()}` : ''}`,
        screenshotOnPass: `not_checked ${desc}`,
        isSelfHealEligible: true,
      },
      (exp, locator, message, timeout) => exp(locator, message).not.toBeChecked({ timeout }),
    );
  }

  /**
   * Assert element has focus with error handling
   * @param locator - Element locator to check (can use locator.describe() for better error messages)
   * @param options - Assert configuration options
   * @param options.timeout - Maximum time to wait for element to be focused (default: 10000ms)
   * @param options.message - Custom error message to display on failure
   * @returns Promise that resolves when assertion passes
   * @throws Error with detailed diagnostics if element is not focused
   * @example
   * ```typescript
   * await assertions.assertElementFocused(usernameField);
   * ```
   * @example
   * ```typescript
   * await assertions.assertElementFocused(searchInput, {
   *   message: 'Search input should have focus after page load'
   * });
   * ```
   */
  async assertElementFocused(locator: Locator, options?: {
    timeout?: number;
    message?: string;
    /** When `true`, uses `expect.soft` — failure is recorded but execution continues. */
    soft?: boolean;
  }): Promise<void> {
    const desc = this.getDescription(locator);
    return this.runLocatorAssertion(
      locator, options,
      {
        stepLabel: 'Asserting element is focused',
        failureMessage: `Element${desc ? ` "${desc}"` : ''} is not focused`,
        screenshotOnFail: `not_focused ${desc}`,
        screenshotOnPass: `focused ${desc}`,
      },
      (exp, locator, message, timeout) => exp(locator, message).toBeFocused({ timeout }),
    );
  }

  /**
   * Assert element is attached to DOM with error handling
   * @param locator - Element locator to check (can use locator.describe() for better error messages)
   * @param options - Assert configuration options
   * @param options.timeout - Maximum time to wait for element to be attached (default: 10000ms)
   * @param options.message - Custom error message to display on failure
   * @returns Promise that resolves when assertion passes
   * @throws Error with detailed diagnostics if element is not attached to DOM
   * @example
   * ```typescript
   * await assertions.assertElementAttached(dynamicElement);
   * ```
   * @example
   * ```typescript
   * await assertions.assertElementAttached(modalElement, {
   *   message: 'Modal should be attached to DOM'
   * });
   * ```
   */
  async assertElementAttached(locator: Locator, options?: {
    timeout?: number;
    message?: string;
    /** When `true`, uses `expect.soft` — failure is recorded but execution continues. */
    soft?: boolean;
  }): Promise<void> {
    const desc = this.getDescription(locator);
    return this.runLocatorAssertion(
      locator, options,
      {
        stepLabel: 'Asserting element is attached to DOM',
        failureMessage: `Element${desc ? ` "${desc}"` : ''} is not attached to DOM`,
        screenshotOnFail: `not_attached ${desc}`,
      },
      (exp, locator, message, timeout) => exp(locator, message).toBeAttached({ timeout }),
    );
  }

  /**
   * Assert element is detached from DOM with error handling
   * @param locator - Element locator to check (can use locator.describe() for better error messages)
   * @param options - Assert configuration options
   * @param options.timeout - Maximum time to wait for element to be detached (default: 10000ms)
   * @param options.message - Custom error message to display on failure
   * @returns Promise that resolves when assertion passes
   * @throws Error with detailed diagnostics if element is still attached to DOM
   * @example
   * ```typescript
   * await assertions.assertElementDetached(loadingSpinner);
   * ```
   * @example
   * ```typescript
   * await assertions.assertElementDetached(modalElement, {
   *   message: 'Modal should be removed from DOM after close'
   * });
   * ```
   */
  async assertElementDetached(locator: Locator, options?: {
    timeout?: number;
    message?: string;
    /** When `true`, uses `expect.soft` — failure is recorded but execution continues. */
    soft?: boolean;
  }): Promise<void> {
    const desc = this.getDescription(locator);
    return this.runLocatorAssertion(
      locator, options,
      {
        stepLabel: 'Asserting element is detached from DOM',
        failureMessage: `Element${desc ? ` "${desc}"` : ''} is not detached from DOM`,
        screenshotOnFail: `not_detached_${desc}`,
      },
      (exp, locator, message, timeout) => exp(locator, message).not.toBeAttached({ timeout }),
    );
  }

  /**
   * Assert element contains specific CSS class with error handling and self-healing
   * @param locator - Element locator to check (can use locator.describe() for better error messages)
   * @param className - CSS class name to check for
   * @param options - Assert configuration options
   * @param options.timeout - Maximum time to wait for class to be present (default: 10000ms)
   * @param options.message - Custom error message to display on failure
   * @returns Promise that resolves when assertion passes
   * @throws Error with actual classes details if assertion fails after self-healing attempts
   * @example
   * ```typescript
   * await assertions.assertElementHasClass(buttonElement, 'active');
   * ```
   * @example
   * ```typescript
   * await assertions.assertElementHasClass(menuItem, 'selected', {
   *   message: 'Menu item should have selected class'
   * });
   * ```
   */
  async assertElementHasClass(locator: Locator, className: string, options?: {
    timeout?: number;
    message?: string;
    /** When `true`, uses `expect.soft` — failure is recorded but execution continues. */
    soft?: boolean;
  }): Promise<void> {
    const desc = this.getDescription(locator);
    const classRe = new RegExp(`\\b${className}\\b`);
    return this.runLocatorAssertion(
      locator, options,
      {
        stepLabel: `Asserting element has class: ${className}`,
        failureMessage: `Element${desc ? ` "${desc}"` : ''} does not have class "${className}"`,
        screenshotOnFail: `class_missing_${desc}`,
        isSelfHealEligible: true,
      },
      (exp, locator, message, timeout) => exp(locator, message).toHaveClass(classRe, { timeout }),
    );
  }


  /**
   * Assert multiple elements are visible with comprehensive error reporting
   * @param elements - Array of elements with locators and optional names
   * @param options - Assert configuration options
   * @param options.timeout - Maximum time to wait for all elements to be visible (default: 10000ms)
   * @param options.message - Custom error message to display on failure
   * @returns Promise that resolves when all elements are visible
   * @throws Error listing all failed elements if any are not visible
   * @example
   * ```typescript
   * await assertions.assertMultipleElementsVisible([
   *   { locator: headerElement, name: 'Header' },
   *   { locator: navigationMenu, name: 'Navigation' },
   *   { locator: mainContent, name: 'Main Content' }
   * ]);
   * ```
   * @example
   * ```typescript
   * await assertions.assertMultipleElementsVisible(formElements, {
   *   message: 'All form elements should be visible'
   * });
   * ```
   */
  async assertMultipleElementsVisible(elements: Array<{ locator: Locator, name?: string }>, options?: {
    timeout?: number;
    message?: string;
    /** When `true`, uses `expect.soft` per element — all failures recorded, execution continues. */
    soft?: boolean;
  }): Promise<void> {
    const timeout = options?.timeout || 10000;
    const startTime = Date.now();
    const isSoft = options?.soft ?? false;
    const exp = this.getExp(isSoft);
    const failures: string[] = [];

    console.log(`🔍 Asserting multiple elements are visible (${elements.length} elements)`);

    for (const element of elements) {
      const description = this.getDescription(element.locator) || element.name;
      const elementDesc = element.name || description || 'element';
      const elementMessage = `${elementDesc} is not visible`;
      const errorsBefore = this.testInfo.errors.length;

      try {
        await exp(element.locator, elementMessage).toBeVisible({ timeout });
      } catch (error) {
        // Only reached for hard assertions
        console.error(`  ❌ ${elementDesc} is not visible`);
        failures.push(`${elementDesc}: ${(error as Error).message}`);
        continue;
      }

      if (isSoft && this.testInfo.errors.length > errorsBefore) {
        console.error(`  ❌ ${elementDesc} is not visible (soft)`);
        failures.push(`${elementDesc}: soft assertion failed`);
        continue;
      }

      console.log(`  ✅ ${elementDesc} is visible`);
    }

    const duration = Date.now() - startTime;

    if (failures.length > 0) {
      await ScreenshotHelper.takeFailureScreenshot(this.page, 'multiple_elements_not_visible', this.testInfo);
      if (!isSoft) {
        const customMessage = options?.message || 'Some elements are not visible';
        throw new Error(`${customMessage} after ${duration}ms. Failed elements: ${failures.join(', ')}`);
      }
      return;
    }

    console.log(`✅ All ${elements.length} elements are visible (${duration}ms)`);
  }

  // #endregion

  // ──────────────────────────────────────────────────────────────────────────
  // #region ELEMENT NEGATION ASSERTIONS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Assert element text does not equal specific value with error handling
   * @param locator - Element locator to check (can use locator.describe() for better error messages)
   * @param unexpectedText - Text that should not be present in element
   * @param options - Assert configuration options
   * @param options.timeout - Maximum time to wait for text check (default: 10000ms)
   * @param options.message - Custom error message to display on failure
   * @returns Promise that resolves when assertion passes
   * @throws Error if element contains the unexpected text
   * @example
   * ```typescript
   * await assertions.assertElementTextNotEqual(statusMessage, 'Error');
   * ```
   * @example
   * ```typescript
   * await assertions.assertElementTextNotEqual(notificationDiv, 'Failed', {
   *   message: 'Notification should not show failure message'
   * });
   * ```
   */
  async assertElementTextNotEqual(locator: Locator, unexpectedText: string, options?: {
    timeout?: number;
    message?: string;
    /** When `true`, uses `expect.soft` — failure is recorded but execution continues. */
    soft?: boolean;
  }): Promise<void> {
    const desc = this.getDescription(locator);
    return this.runLocatorAssertion(
      locator, options,
      {
        stepLabel: `Asserting element text is not: "${unexpectedText}"`,
        failureMessage: `Element${desc ? ` "${desc}"` : ''} has unexpected text`,
        screenshotOnFail: `text_unexpectedly_equal_${desc}`,
      },
      (exp, locator, message, timeout) => exp(locator, message).not.toHaveText(unexpectedText, { timeout }),
    );
  }

  /**
   * Assert element CSS property has expected value with error handling
   * @param locator - Element locator to check (can use locator.describe() for better error messages)
   * @param property - CSS property name to check (e.g., 'color', 'background-color', 'display')
   * @param expectedValue - Expected CSS property value (string or RegExp)
   * @param options - Assert configuration options
   * @param options.timeout - Maximum time to wait for CSS match (default: 10000ms)
   * @param options.message - Custom error message to display on failure
   * @returns Promise that resolves when assertion passes
   * @throws Error with expected value details if assertion fails
   * @example
   * ```typescript
   * await assertions.assertElementCSS(buttonElement, 'background-color', 'rgb(0, 123, 255)');
   * ```
   * @example
   * ```typescript
   * await assertions.assertElementCSS(modalElement, 'display', 'block', {
   *   message: 'Modal should be visible'
   * });
   * ```
   */
  async assertElementCSS(locator: Locator, property: string, expectedValue: string | RegExp, options?: {
    timeout?: number;
    message?: string;
    /** When `true`, uses `expect.soft` — failure is recorded but execution continues. */
    soft?: boolean;
  }): Promise<void> {
    const desc = this.getDescription(locator);
    return this.runLocatorAssertion(
      locator, options,
      {
        stepLabel: `Asserting CSS ${property}: "${expectedValue}"`,
        failureMessage: `CSS property "${property}" mismatch${desc ? ` in "${desc}"` : ''}`,
        screenshotOnFail: `css_mismatch_${desc}`,
      },
      (exp, locator, message, timeout) => exp(locator, message).toHaveCSS(property, expectedValue, { timeout }),
    );
  }

  /**
   * Assert element does NOT contain specific text.
   */
  async assertElementNotContainsText(locator: Locator, unexpectedText: string | RegExp, options?: {
    timeout?: number;
    message?: string;
    /** When `true`, uses `expect.soft` — failure is recorded but execution continues. */
    soft?: boolean;
  }): Promise<void> {
    const desc = this.getDescription(locator);
    return this.runLocatorAssertion(
      locator, options,
      {
        stepLabel: `Asserting element does not contain text: "${unexpectedText}"`,
        failureMessage: `Element${desc ? ` "${desc}"` : ''} unexpectedly contains text`,
        screenshotOnFail: `text_unexpectedly_contains_${desc}`,
      },
      (exp, locator, message, timeout) => exp(locator, message).not.toContainText(unexpectedText, { timeout }),
    );
  }

  /**
   * Assert element value does NOT match.
   */
  async assertElementValueNotEqual(locator: Locator, unexpectedValue: string | RegExp, options?: {
    timeout?: number;
    message?: string;
    /** When `true`, uses `expect.soft` — failure is recorded but execution continues. */
    soft?: boolean;
  }): Promise<void> {
    const desc = this.getDescription(locator);
    return this.runLocatorAssertion(
      locator, options,
      {
        stepLabel: `Asserting element value is not: "${unexpectedValue}"`,
        failureMessage: `Value unexpectedly matched${desc ? ` in "${desc}"` : ''}`,
        screenshotOnFail: `value_unexpectedly_equal_${desc}`,
      },
      (exp, locator, message, timeout) => exp(locator, message).not.toHaveValue(unexpectedValue, { timeout }),
    );
  }

  /**
   * Assert element attribute does NOT match.
   */
  async assertElementAttributeNotEqual(locator: Locator, attributeName: string, unexpectedValue: string | RegExp, options?: {
    timeout?: number;
    message?: string;
    /** When `true`, uses `expect.soft` — failure is recorded but execution continues. */
    soft?: boolean;
  }): Promise<void> {
    const desc = this.getDescription(locator);
    return this.runLocatorAssertion(
      locator, options,
      {
        stepLabel: `Asserting attribute "${attributeName}" is not: "${unexpectedValue}"`,
        failureMessage: `Attribute "${attributeName}" unexpectedly matched${desc ? ` in "${desc}"` : ''}`,
        screenshotOnFail: `attribute_unexpectedly_equal_${desc}`,
      },
      (exp, locator, message, timeout) => exp(locator, message).not.toHaveAttribute(attributeName, unexpectedValue, { timeout }),
    );
  }

  /**
   * Assert element does NOT have CSS class.
   */
  async assertElementNotHasClass(locator: Locator, className: string, options?: {
    timeout?: number;
    message?: string;
    /** When `true`, uses `expect.soft` — failure is recorded but execution continues. */
    soft?: boolean;
  }): Promise<void> {
    const desc = this.getDescription(locator);
    return this.runLocatorAssertion(
      locator, options,
      {
        stepLabel: `Asserting element does not have class: ${className}`,
        failureMessage: `Element${desc ? ` "${desc}"` : ''} unexpectedly has class "${className}"`,
        screenshotOnFail: `class_unexpectedly_present_${desc}`,
      },
      (exp, locator, message, timeout) => exp(locator, message).not.toHaveClass(new RegExp(`\\b${className}\\b`), { timeout }),
    );
  }

  /**
   * Assert element CSS property does NOT match.
   */
  async assertElementCSSNotEqual(locator: Locator, property: string, unexpectedValue: string | RegExp, options?: {
    timeout?: number;
    message?: string;
    /** When `true`, uses `expect.soft` — failure is recorded but execution continues. */
    soft?: boolean;
  }): Promise<void> {
    const desc = this.getDescription(locator);
    return this.runLocatorAssertion(
      locator, options,
      {
        stepLabel: `Asserting CSS ${property} is not: "${unexpectedValue}"`,
        failureMessage: `CSS property "${property}" unexpectedly matched${desc ? ` in "${desc}"` : ''}`,
        screenshotOnFail: `css_unexpectedly_equal_${desc}`,
      },
      (exp, locator, message, timeout) => exp(locator, message).not.toHaveCSS(property, unexpectedValue, { timeout }),
    );
  }

  // #endregion

  // ──────────────────────────────────────────────────────────────────────────
  // #region ELEMENT EDITABILITY & EMPTINESS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Assert element is editable.
   */
  async assertElementEditable(locator: Locator, options?: {
    timeout?: number;
    message?: string;
    /** When `true`, uses `expect.soft` — failure is recorded but execution continues. */
    soft?: boolean;
  }): Promise<void> {
    const desc = this.getDescription(locator);
    return this.runLocatorAssertion(
      locator, options,
      {
        stepLabel: 'Asserting element is editable',
        failureMessage: `Element${desc ? ` "${desc}"` : ''} is not editable`,
        screenshotOnFail: `not_editable_${desc}`,
      },
      (exp, locator, message, timeout) => exp(locator, message).toBeEditable({ timeout }),
    );
  }

  /**
   * Assert that an element is **not** editable (i.e. it is read-only or disabled from input).
   * Complement to `assertElementEditable`.
   * @param locator - Element locator to inspect.
   * @param options - Assert configuration options.
   * @param options.timeout - Maximum time to wait (default: 10000ms).
   * @param options.message - Custom error message on failure.
   * @param options.soft - When `true`, uses `expect.soft`; failure is recorded but execution continues.
   * @example
   * ```typescript
   * await assertions.assertElementNotEditable(lockedField);
   * await assertions.assertElementNotEditable(readonlyInput, { soft: true });
   * ```
   */
  async assertElementNotEditable(locator: Locator, options?: {
    timeout?: number;
    message?: string;
    /** When `true`, uses `expect.soft` — failure is recorded but execution continues. */
    soft?: boolean;
  }): Promise<void> {
    const desc = this.getDescription(locator);
    return this.runLocatorAssertion(
      locator, options,
      {
        stepLabel: 'Asserting element is not editable',
        failureMessage: `Element${desc ? ` "${desc}"` : ''} is editable but should not be`,
        screenshotOnFail: `unexpectedly_editable_${desc}`,
      },
      (exp, locator, message, timeout) => exp(locator, message).not.toBeEditable({ timeout }),
    );
  }

  /**
   * Assert element is empty.
   */
  async assertElementEmpty(locator: Locator, options?: {
    timeout?: number;
    message?: string;
    /** When `true`, uses `expect.soft` — failure is recorded but execution continues. */
    soft?: boolean;
  }): Promise<void> {
    const desc = this.getDescription(locator);
    return this.runLocatorAssertion(
      locator, options,
      {
        stepLabel: 'Asserting element is empty',
        failureMessage: `Element${desc ? ` "${desc}"` : ''} is not empty`,
        screenshotOnFail: `not_empty_${desc}`,
      },
      (exp, locator, message, timeout) => exp(locator, message).toBeEmpty({ timeout }),
    );
  }

  /**
   * Assert that an element is **not** empty — i.e. it has content (text, value, or child nodes).
   * Complement to `assertElementEmpty`.
   * @param locator - Element locator to inspect.
   * @param options - Assert configuration options.
   * @param options.timeout - Maximum time to wait (default: 10000ms).
   * @param options.message - Custom error message on failure.
   * @param options.soft - When `true`, uses `expect.soft`; failure is recorded but execution continues.
   * @example
   * ```typescript
   * await assertions.assertElementNotEmpty(resultsContainer);
   * await assertions.assertElementNotEmpty(descriptionField, { soft: true });
   * ```
   */
  async assertElementNotEmpty(locator: Locator, options?: {
    timeout?: number;
    message?: string;
    /** When `true`, uses `expect.soft` — failure is recorded but execution continues. */
    soft?: boolean;
  }): Promise<void> {
    const desc = this.getDescription(locator);
    return this.runLocatorAssertion(
      locator, options,
      {
        stepLabel: 'Asserting element is not empty',
        failureMessage: `Element${desc ? ` "${desc}"` : ''} is empty but should have content`,
        screenshotOnFail: `unexpectedly_empty_${desc}`,
      },
      (exp, locator, message, timeout) => exp(locator, message).not.toBeEmpty({ timeout }),
    );
  }

  // #endregion

  // ──────────────────────────────────────────────────────────────────────────
  // #region ELEMENT ACCESSIBILITY & VIEWPORT
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Assert element is in viewport.
   */
  async assertElementInViewport(locator: Locator, options?: {
    timeout?: number;
    ratio?: number;
    message?: string;
    /** When `true`, uses `expect.soft` — failure is recorded but execution continues. */
    soft?: boolean;
  }): Promise<void> {
    const desc = this.getDescription(locator);
    const ratio = options?.ratio;
    return this.runLocatorAssertion(
      locator, options,
      {
        stepLabel: 'Asserting element is in viewport',
        failureMessage: `Element${desc ? ` "${desc}"` : ''} is not in viewport`,
        screenshotOnFail: `not_in_viewport_${desc}`,
      },
      (exp, locator, message, timeout) => exp(locator, message).toBeInViewport({ timeout, ratio }),
    );
  }

  /**
   * Assert element role.
   */
  async assertElementRole(locator: Locator, expectedRole: string, options?: {
    timeout?: number;
    message?: string;
    /** When `true`, uses `expect.soft` — failure is recorded but execution continues. */
    soft?: boolean;
  }): Promise<void> {
    const desc = this.getDescription(locator);
    return this.runLocatorAssertion(
      locator, options,
      {
        stepLabel: `Asserting element has role: ${expectedRole}`,
        failureMessage: `Element role mismatch${desc ? ` for "${desc}"` : ''}`,
        screenshotOnFail: `role_mismatch_${desc}`,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (exp, locator, message, timeout) => exp(locator, message).toHaveRole(expectedRole as any, { timeout }),
    );
  }

  /**
   * Assert accessible name.
   */
  async assertElementAccessibleName(locator: Locator, expectedName: string | RegExp, options?: {
    timeout?: number;
    message?: string;
    /** When `true`, uses `expect.soft` — failure is recorded but execution continues. */
    soft?: boolean;
  }): Promise<void> {
    const desc = this.getDescription(locator);
    return this.runLocatorAssertion(
      locator, options,
      {
        stepLabel: `Asserting accessible name: "${expectedName}"`,
        failureMessage: `Accessible name mismatch${desc ? ` for "${desc}"` : ''}`,
        screenshotOnFail: `accessible_name_mismatch_${desc}`,
      },
      (exp, locator, message, timeout) => exp(locator, message).toHaveAccessibleName(expectedName, { timeout }),
    );
  }

  /**
   * Assert accessible description.
   */
  async assertElementAccessibleDescription(locator: Locator, expectedDescription: string | RegExp, options?: {
    timeout?: number;
    message?: string;
    /** When `true`, uses `expect.soft` — failure is recorded but execution continues. */
    soft?: boolean;
  }): Promise<void> {
    const desc = this.getDescription(locator);
    return this.runLocatorAssertion(
      locator, options,
      {
        stepLabel: `Asserting accessible description: "${expectedDescription}"`,
        failureMessage: `Accessible description mismatch${desc ? ` for "${desc}"` : ''}`,
        screenshotOnFail: `accessible_description_mismatch_${desc}`,
      },
      (exp, locator, message, timeout) => exp(locator, message).toHaveAccessibleDescription(expectedDescription, { timeout }),
    );
  }

  /**
   * Assert the ARIA tree snapshot of a locator.
   * @param locator - Target element locator.
   * @param expectedSnapshot - Expected YAML-like ARIA snapshot string.
   * @param options - Assertion options.
   * @param options.timeout - Max wait time in milliseconds (default: 10000).
   * @param options.message - Custom message to include in thrown error.
   * @returns Promise that resolves when snapshot matches.
   * @throws Error when the ARIA snapshot does not match.
   */
  async assertElementAriaSnapshot(locator: Locator, expectedSnapshot: string, options?: {
    timeout?: number;
    message?: string;
    /** When `true`, uses `expect.soft` — failure is recorded but execution continues. */
    soft?: boolean;
  }): Promise<void> {
    const desc = this.getDescription(locator);
    return this.runLocatorAssertion(
      locator, options,
      {
        stepLabel: 'Asserting ARIA snapshot',
        failureMessage: `ARIA snapshot mismatch${desc ? ` for "${desc}"` : ''}`,
        screenshotOnFail: `aria_snapshot_mismatch_${desc}`,
      },
      (exp, locator, message, timeout) => exp(locator, message).toMatchAriaSnapshot(expectedSnapshot, { timeout }),
    );
  }

  // #endregion

  // ──────────────────────────────────────────────────────────────────────────
  // #region PAGE EXTENDED — URL PARAMS, ELEMENT PROPERTIES & SCREENSHOTS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Assert pathname only (ignores origin, hash, query unless part of expected regex/string).
   */
  async assertPathname(expectedPathname: string | RegExp, options?: {
    timeout?: number;
    message?: string;
    /** When `true`, failure is recorded softly and execution continues. */
    soft?: boolean;
  }): Promise<void> {
    const timeout = options?.timeout || 10000;
    const startTime = Date.now();
    const isSoft = options?.soft ?? false;
    const customMessage = options?.message || 'Pathname does not match expected';
    try {
      await expect
        .poll(() => new URL(this.page.url()).pathname, { timeout })
        .toMatch(typeof expectedPathname === 'string' ? new RegExp(`^${expectedPathname}$`) : expectedPathname);
      const duration = Date.now() - startTime;
      console.log(`✅ Pathname assertion passed (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      await ScreenshotHelper.takeFailureScreenshot(this.page, `pathname_mismatch`, this.testInfo);
      const actualPath = new URL(this.page.url()).pathname;
      const err = error as Error;
      const message = `${customMessage}. Expected: "${expectedPathname}", Actual: "${actualPath}". Duration: ${duration}ms. Original error: ${err.message}`;
      if (isSoft) {
        (this.testInfo.errors as Array<{ message?: string; stack?: string }>).push({ message, stack: err.stack });
        return;
      }
      throw new Error(message);
    }
  }

  /**
   * Assert query param value.
   */
  async assertQueryParam(paramName: string, expectedValue: string | RegExp, options?: {
    timeout?: number;
    message?: string;
    /** When `true`, failure is recorded softly and execution continues. */
    soft?: boolean;
  }): Promise<void> {
    const timeout = options?.timeout || 10000;
    const startTime = Date.now();
    const isSoft = options?.soft ?? false;
    const customMessage = options?.message || `Query param "${paramName}" does not match expected`;
    try {
      await expect.poll(() => {
        const params = new URL(this.page.url()).searchParams;
        return params.get(paramName);
      }, { timeout }).toEqual(expect.stringMatching(expectedValue));
      const duration = Date.now() - startTime;
      console.log(`✅ Query param assertion passed (${duration}ms): ${paramName}`);
    } catch (error) {
      const duration = Date.now() - startTime;
      await ScreenshotHelper.takeFailureScreenshot(this.page, `query_param_mismatch_${paramName}`, this.testInfo);
      const actual = new URL(this.page.url()).searchParams.get(paramName);
      const err = error as Error;
      const message = `${customMessage}. Expected: "${expectedValue}", Actual: "${actual}". Duration: ${duration}ms. Original error: ${err.message}`;
      if (isSoft) {
        (this.testInfo.errors as Array<{ message?: string; stack?: string }>).push({ message, stack: err.stack });
        return;
      }
      throw new Error(message);
    }
  }

  /**
   * Assert element is hidden (different semantic from not visible in naming).
   */
  async assertElementHidden(locator: Locator, options?: {
    timeout?: number;
    message?: string;
    /** When `true`, uses `expect.soft` — failure is recorded but execution continues. */
    soft?: boolean;
  }): Promise<void> {
    const desc = this.getDescription(locator);
    return this.runLocatorAssertion(
      locator, options,
      {
        stepLabel: 'Asserting element is hidden',
        failureMessage: `Element${desc ? ` "${desc}"` : ''} is not hidden`,
        screenshotOnFail: `not_hidden_${desc}`,
      },
      (exp, locator, message, timeout) => exp(locator, message).toBeHidden({ timeout }),
    );
  }

  /**
   * Assert element contains class(es).
   */
  async assertElementContainsClass(
    locator: Locator,
    expected: string | RegExp | Array<string | RegExp>,
    options?: { timeout?: number; message?: string; /** When `true`, uses `expect.soft`. */ soft?: boolean }
  ): Promise<void> {
    const desc = this.getDescription(locator);
    return this.runLocatorAssertion(
      locator, options,
      {
        stepLabel: 'Asserting element contains class',
        failureMessage: 'Element class does not contain expected value',
        screenshotOnFail: `class_not_contained_${desc}`,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (exp, locator, message, timeout) => exp(locator, message).toContainClass(expected as any, { timeout }),
    );
  }

  /**
   * Assert element id attribute.
   */
  async assertElementId(locator: Locator, expectedId: string | RegExp, options?: {
    timeout?: number;
    message?: string;
    /** When `true`, uses `expect.soft` — failure is recorded but execution continues. */
    soft?: boolean;
  }): Promise<void> {
    return this.runLocatorAssertion(
      locator, options,
      {
        stepLabel: `Asserting element ID: "${expectedId}"`,
        failureMessage: 'Element id does not match expected',
        screenshotOnFail: 'id_mismatch',
      },
      (exp, locator, message, timeout) => exp(locator, message).toHaveId(expectedId, { timeout }),
    );
  }

  /**
   * Assert element JS property.
   */
  async assertElementJSProperty(locator: Locator, propertyName: string, expectedValue: unknown, options?: {
    timeout?: number;
    message?: string;
    /** When `true`, uses `expect.soft` — failure is recorded but execution continues. */
    soft?: boolean;
  }): Promise<void> {
    return this.runLocatorAssertion(
      locator, options,
      {
        stepLabel: `Asserting JS property "${propertyName}"`,
        failureMessage: `JS property "${propertyName}" does not match expected`,
        screenshotOnFail: `js_property_mismatch_${propertyName}`,
      },
      (exp, locator, message, timeout) => exp(locator, message).toHaveJSProperty(propertyName, expectedValue, { timeout }),
    );
  }

  /**
   * Assert multi-select values.
   */
  async assertElementValues(locator: Locator, expectedValues: Array<string | RegExp>, options?: {
    timeout?: number;
    message?: string;
    /** When `true`, uses `expect.soft` — failure is recorded but execution continues. */
    soft?: boolean;
  }): Promise<void> {
    return this.runLocatorAssertion(
      locator, options,
      {
        stepLabel: 'Asserting element values',
        failureMessage: 'Element values do not match expected',
        screenshotOnFail: 'values_mismatch',
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (exp, locator, message, timeout) => exp(locator, message).toHaveValues(expectedValues as any, { timeout }),
    );
  }

  /**
   * Assert accessible error message.
   */
  async assertElementAccessibleErrorMessage(locator: Locator, expectedErrorMessage: string | RegExp, options?: {
    timeout?: number;
    message?: string;
    /** When `true`, uses `expect.soft` — failure is recorded but execution continues. */
    soft?: boolean;
  }): Promise<void> {
    return this.runLocatorAssertion(
      locator, options,
      {
        stepLabel: `Asserting accessible error message: "${expectedErrorMessage}"`,
        failureMessage: 'Accessible error message does not match expected',
        screenshotOnFail: 'accessible_error_message_mismatch',
      },
      (exp, locator, message, timeout) => exp(locator, message).toHaveAccessibleErrorMessage(expectedErrorMessage, { timeout }),
    );
  }

  /**
   * Assert locator screenshot against baseline.
   */
  async assertElementScreenshot(locator: Locator, name?: string | string[], options?: {
    timeout?: number;
    maxDiffPixels?: number;
    maxDiffPixelRatio?: number;
    threshold?: number;
    animations?: 'disabled' | 'allow';
    caret?: 'hide' | 'initial';
    scale?: 'css' | 'device';
    message?: string;
    /** When `true`, uses `expect.soft` — failure is recorded but execution continues. */
    soft?: boolean;
  }): Promise<void> {
    const timeout = options?.timeout || 10000;
    const startTime = Date.now();
    const isSoft = options?.soft ?? false;
    const customMessage = options?.message || 'Element screenshot assertion failed';
    const exp = this.getExp(isSoft);
    const errorsBefore = this.testInfo.errors.length;
    const screenshotOptions = {
      timeout,
      maxDiffPixels: options?.maxDiffPixels,
      maxDiffPixelRatio: options?.maxDiffPixelRatio,
      threshold: options?.threshold,
      animations: options?.animations,
      caret: options?.caret,
      scale: options?.scale
    };
    try {
      if (name) {
        await exp(locator, customMessage).toHaveScreenshot(name as any, screenshotOptions as any);
      } else {
        await exp(locator, customMessage).toHaveScreenshot(screenshotOptions as any);
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      throw new Error(`${customMessage} after ${duration}ms. Original error: ${(error as Error).message}`);
    }
    const duration = Date.now() - startTime;
    if (isSoft && this.testInfo.errors.length > errorsBefore) {
      return;
    }
    console.log(`✅ Element screenshot assertion passed (${duration}ms)`);
  }

  /**
   * Assert page screenshot against baseline.
   */
  async assertPageScreenshot(name?: string | string[], options?: {
    timeout?: number;
    fullPage?: boolean;
    maxDiffPixels?: number;
    maxDiffPixelRatio?: number;
    threshold?: number;
    animations?: 'disabled' | 'allow';
    caret?: 'hide' | 'initial';
    scale?: 'css' | 'device';
    message?: string;
    /** When `true`, uses `expect.soft` — failure is recorded but execution continues. */
    soft?: boolean;
  }): Promise<void> {
    const timeout = options?.timeout || 10000;
    const startTime = Date.now();
    const isSoft = options?.soft ?? false;
    const customMessage = options?.message || 'Page screenshot assertion failed';
    const exp = this.getExp(isSoft);
    const errorsBefore = this.testInfo.errors.length;
    const screenshotOptions = {
      timeout,
      fullPage: options?.fullPage,
      maxDiffPixels: options?.maxDiffPixels,
      maxDiffPixelRatio: options?.maxDiffPixelRatio,
      threshold: options?.threshold,
      animations: options?.animations,
      caret: options?.caret,
      scale: options?.scale
    };
    try {
      if (name) {
        await exp(this.page, customMessage).toHaveScreenshot(name as any, screenshotOptions as any);
      } else {
        await exp(this.page, customMessage).toHaveScreenshot(screenshotOptions as any);
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      throw new Error(`${customMessage} after ${duration}ms. Original error: ${(error as Error).message}`);
    }
    const duration = Date.now() - startTime;
    if (isSoft && this.testInfo.errors.length > errorsBefore) {
      return;
    }
    console.log(`✅ Page screenshot assertion passed (${duration}ms)`);
  }

  // #endregion

  // ──────────────────────────────────────────────────────────────────────────
  // #region API / HTTP RESPONSE ASSERTIONS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Assert API response is successful (`2xx`).
   * @param response - Playwright API response object.
   * @param options - Assertion options.
   * @param options.message - Custom failure message.
   * @returns Promise that resolves when response status is successful.
   * @throws Error when status is not successful.
   */
  async assertResponseOK(response: APIResponse, options?: { message?: string; /** When `true`, uses `expect.soft`. */ soft?: boolean }): Promise<void> {
    return this.runResponseAssertion(response, options, {
      stepLabel:      `Asserting response is OK`,
      failureMessage: `Response is not OK (status: ${response.status()})`,
    },
    (exp, res, m) => exp(res, m).toBeOK(),
    );
  }

  /**
   * Assert that an API response has a specific HTTP status code.
   * Use `assertResponseOK` for any 2xx; use this method for exact codes such as 201, 404, 422, etc.
   * @param response - Playwright `APIResponse` object.
   * @param statusCode - Expected HTTP status code.
   * @param options - Assert configuration options.
   * @param options.message - Custom error message on failure.
   * @param options.soft - When `true`, uses `expect.soft`; failure is recorded but execution continues.
   * @example
   * ```typescript
   * const res = await request.post('/api/users', { data: payload });
   * await assertions.assertResponseStatus(res, 201);
   * await assertions.assertResponseStatus(res, 404, { soft: true });
   * ```
   */
  async assertResponseStatus(response: APIResponse, statusCode: number, options?: {
    message?: string;
    /** When `true`, uses `expect.soft` — failure is recorded but execution continues. */
    soft?: boolean;
  }): Promise<void> {
    return this.runResponseAssertion(response, options, {
      stepLabel:      `Asserting response status: ${statusCode}`,
      failureMessage: `Expected HTTP ${statusCode}, got ${response.status()}`,
    },
    (exp, res, m) => exp(res.status(), m).toBe(statusCode),
    );
  }

  /**
   * Assert that an API response body matches a string or RegExp.
   * The full response body is retrieved as text and compared.
   * @param response - Playwright `APIResponse` object.
   * @param expectedBody - Expected body text (exact string or RegExp).
   * @param options - Assert configuration options.
   * @param options.message - Custom error message on failure.
   * @param options.soft - When `true`, uses `expect.soft`; failure is recorded but execution continues.
   * @example
   * ```typescript
   * await assertions.assertResponseBody(res, /created successfully/i);
   * await assertions.assertResponseBody(res, '{"ok":true}');
   * ```
   */
  async assertResponseBody(response: APIResponse, expectedBody: string | RegExp, options?: {
    message?: string;
    /** When `true`, uses `expect.soft` — failure is recorded but execution continues. */
    soft?: boolean;
  }): Promise<void> {
    return this.runResponseAssertion(response, options, {
      stepLabel:      `Asserting response body matches: ${expectedBody}`,
      failureMessage: 'Response body does not match expected pattern',
    },
    async (exp, res, m) => {
      let body: string;
      try {
        body = await res.text();
      } catch (e) {
        throw new Error(`${m}: could not read response body. ${(e as Error).message}`);
      }
      try {
        if (typeof expectedBody === 'string') {
          exp(body, m).toBe(expectedBody);
        } else {
          exp(body, m).toMatch(expectedBody);
        }
      } catch (error) {
        throw new Error(`${m}. Actual body: ${body.slice(0, 500)}. Original error: ${(error as Error).message}`);
      }
    },
    );
  }

  /**
   * Assert that an API response JSON matches an expected object (deep equality) or passes a
   * custom validator callback.
   * @param response - Playwright `APIResponse` object.
   * @param expected - Expected JSON object (deep equal via `toEqual`) **or** a validator function
   *   that receives the parsed JSON and throws/asserts itself.
   * @param options - Assert configuration options.
   * @param options.message - Custom error message on failure.
   * @param options.soft - When `true`, uses `expect.soft`; failure is recorded but execution continues.
   * @example
   * ```typescript
   * await assertions.assertResponseJSON(res, { id: 42, status: 'active' });
   * await assertions.assertResponseJSON(res, json => {
   *   expect(json).toMatchObject({ items: expect.arrayContaining([expect.objectContaining({ id: 1 })]) });
   * });
   * ```
   */
  async assertResponseJSON(response: APIResponse, expected: Record<string, unknown> | ((json: unknown) => void), options?: {
    message?: string;
    /** When `true`, uses `expect.soft` — failure is recorded but execution continues. */
    soft?: boolean;
  }): Promise<void> {
    return this.runResponseAssertion(response, options, {
      stepLabel:      'Asserting response JSON',
      failureMessage: 'Response JSON does not match expected structure',
    },
    async (exp, res, m) => {
      let json: unknown;
      try {
        json = await res.json();
      } catch (e) {
        throw new Error(`${m}: could not parse response JSON. ${(e as Error).message}`);
      }
      try {
        if (typeof expected === 'function') {
          expected(json);
        } else {
          exp(json, m).toEqual(expected);
        }
      } catch (error) {
        throw new Error(`${m}. Actual JSON: ${JSON.stringify(json).slice(0, 500)}. Original error: ${(error as Error).message}`);
      }
    },
    );
  }

  /**
   * Assert that an API response contains specific headers.
   * Supply a partial `expected` map — only the headers you provide are checked; extra headers
   * in the actual response are ignored.  Values can be an exact string or a RegExp.
   * Header names are matched case-insensitively (HTTP/1.1 spec).
   * @param response - Playwright `APIResponse` object.
   * @param expected - Partial map of `{ 'header-name': string | RegExp }` to assert.
   * @param options - Assert configuration options.
   * @param options.message - Custom error message on failure.
   * @param options.soft - When `true`, uses `expect.soft`; failure is recorded but execution continues.
   * @example
   * ```typescript
   * await assertions.assertResponseHeaders(res, {
   *   'content-type': /application\/json/,
   *   'cache-control': 'no-store',
   * });
   * await assertions.assertResponseHeaders(res, { 'x-request-id': /^\w+$/ }, { soft: true });
   * ```
   */
  async assertResponseHeaders(response: APIResponse, expected: Record<string, string | RegExp>, options?: {
    message?: string;
    /** When `true`, uses `expect.soft` — failure is recorded but execution continues. */
    soft?: boolean;
  }): Promise<void> {
    const isSoft = options?.soft ?? false;
    const customMessage = options?.message || `Response header assertion failed`;
    const errorsBefore = this.testInfo.errors.length;

    console.log(`🔍 Asserting response headers:`, Object.keys(expected));

    const actualHeaders = response.headers();
    const failures: string[] = [];

    for (const [name, expectedValue] of Object.entries(expected)) {
      const normalizedName = name.toLowerCase();
      const actualValue = actualHeaders[normalizedName];

      if (actualValue === undefined) {
        failures.push(`header "${name}" is missing`);
        continue;
      }

      if (typeof expectedValue === 'string') {
        if (actualValue !== expectedValue) {
          failures.push(`header "${name}": expected "${expectedValue}", got "${actualValue}"`);
        }
      } else {
        if (!expectedValue.test(actualValue)) {
          failures.push(`header "${name}": value "${actualValue}" does not match ${expectedValue}`);
        }
      }
    }

    if (failures.length > 0) {
      const detail = failures.join('; ');
      if (isSoft) {
        this.testInfo.errors.push({ message: `${customMessage}. ${detail}` });
        if (this.testInfo.errors.length > errorsBefore) {
          console.error(`❌ Response header assertion failed (soft) — ${detail}`);
        }
        return;
      }
      throw new Error(`${customMessage}. ${detail}`);
    }

    if (isSoft && this.testInfo.errors.length > errorsBefore) { return; }
    console.log(`✅ Response header assertion passed (${Object.keys(expected).length} header(s) verified)`);
  }

  // #endregion

  // ──────────────────────────────────────────────────────────────────────────
  // #region BROWSER STATE — COOKIES & STORAGE
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Assert that a browser cookie exists and, optionally, that its value matches.
   * Searches the current browser context's cookies — no need to pass a URL.
   * @param name - Cookie name to look for.
   * @param options - Assert configuration options.
   * @param options.value - If provided, asserts the cookie value equals this string/RegExp.
   * @param options.domain - Optional domain filter (useful when cookies share the same name).
   * @param options.message - Custom error message on failure.
   * @param options.soft - When `true`, uses `expect.soft`; failure is recorded but execution continues.
   * @example
   * ```typescript
   * await assertions.assertCookie('session_id');
   * await assertions.assertCookie('theme', { value: 'dark' });
   * await assertions.assertCookie('lang', { value: /^en/, soft: true });
   * ```
   */
  async assertCookie(name: string, options?: {
    value?: string | RegExp;
    domain?: string;
    message?: string;
    /** When `true`, uses `expect.soft` — failure is recorded but execution continues. */
    soft?: boolean;
  }): Promise<void> {
    const isSoft = options?.soft ?? false;
    const customMessage = options?.message || `Cookie "${name}" assertion failed`;
    const errorsBefore = this.testInfo.errors.length;

    console.log(`🔍 Asserting cookie "${name}"`);

    const allCookies = await this.page.context().cookies();
    const cookie = allCookies.find(c => c.name === name && (!options?.domain || c.domain.includes(options.domain)));

    if (!cookie) {
      const failure = `${customMessage}: cookie "${name}" not found.`;
      if (isSoft) {
        this.testInfo.errors.push({ message: failure });
        console.error(`❌ ${failure} (soft)`);
        return;
      }
      throw new Error(failure);
    }

    if (options?.value !== undefined) {
      try {
        if (typeof options.value === 'string') {
          this.getExp(isSoft)(cookie.value, customMessage).toBe(options.value);
        } else {
          this.getExp(isSoft)(cookie.value, customMessage).toMatch(options.value);
        }
      } catch (error) {
        throw new Error(`${customMessage}. Actual value: "${cookie.value}". Original error: ${(error as Error).message}`);
      }
    }

    if (isSoft && this.testInfo.errors.length > errorsBefore) {
      console.error(`❌ Cookie "${name}" assertion failed (soft)`);
      return;
    }
    console.log(`✅ Cookie "${name}" assertion passed (value: "${cookie.value}")`);
  }

  /**
   * Assert that a browser cookie does **not** exist in the current browser context.
   * Complement to `assertCookie`.  Optionally scopes the check to a specific domain.
   * @param name - Cookie name that must be absent.
   * @param options - Assert configuration options.
   * @param options.domain - Optional domain filter — only searches cookies matching this domain.
   * @param options.message - Custom error message on failure.
   * @param options.soft - When `true`, uses `expect.soft`; failure is recorded but execution continues.
   * @example
   * ```typescript
   * await page.click('#logout');
   * await assertions.assertNoCookie('session_id');
   * await assertions.assertNoCookie('tracking_id', { domain: 'ads.example.com', soft: true });
   * ```
   */
  async assertNoCookie(name: string, options?: {
    domain?: string;
    message?: string;
    /** When `true`, uses `expect.soft` — failure is recorded but execution continues. */
    soft?: boolean;
  }): Promise<void> {
    const isSoft = options?.soft ?? false;
    const customMessage = options?.message || `Cookie "${name}" should not exist but was found`;
    const errorsBefore = this.testInfo.errors.length;

    console.log(`🔍 Asserting cookie "${name}" is absent`);

    const allCookies = await this.page.context().cookies();
    const cookie = allCookies.find(c => c.name === name && (!options?.domain || c.domain.includes(options.domain)));

    if (cookie) {
      const detail = `${customMessage} (value: "${cookie.value}", domain: "${cookie.domain}")`;
      if (isSoft) {
        this.testInfo.errors.push({ message: detail });
        if (this.testInfo.errors.length > errorsBefore) {
          console.error(`❌ Cookie absence assertion failed (soft): ${detail}`);
        }
        return;
      }
      throw new Error(detail);
    }

    console.log(`✅ Cookie "${name}" is absent — assertion passed`);
  }

  /**
   * Assert that a `localStorage` entry exists and, optionally, matches an expected value.
   * Pass `null` as `expectedValue` to assert the key is **absent**.
   * @param key - localStorage key.
   * @param expectedValue - If provided: expected string/RegExp value, or `null` to assert absence.
   * @param options - Assert configuration options.
   * @param options.message - Custom error message on failure.
   * @param options.soft - When `true`, uses `expect.soft`; failure is recorded but execution continues.
   * @example
   * ```typescript
   * await assertions.assertLocalStorage('authToken');                // key exists
   * await assertions.assertLocalStorage('theme', 'dark');           // key has specific value
   * await assertions.assertLocalStorage('guestToken', null);        // key must not exist
   * ```
   */
  async assertLocalStorage(key: string, expectedValue?: string | RegExp | null, options?: {
    message?: string;
    /** When `true`, uses `expect.soft` — failure is recorded but execution continues. */
    soft?: boolean;
  }): Promise<void> {
    const isSoft = options?.soft ?? false;
    const customMessage = options?.message || `localStorage["${key}"] assertion failed`;
    const errorsBefore = this.testInfo.errors.length;

    console.log(`🔍 Asserting localStorage["${key}"]`);

    const actual = await this.page.evaluate((k: string) => localStorage.getItem(k), key);

    try {
      if (expectedValue === null) {
        this.getExp(isSoft)(actual, customMessage).toBeNull();
      } else if (expectedValue === undefined) {
        this.getExp(isSoft)(actual, customMessage).not.toBeNull();
      } else if (typeof expectedValue === 'string') {
        this.getExp(isSoft)(actual, customMessage).toBe(expectedValue);
      } else {
        this.getExp(isSoft)(actual, customMessage).toMatch(expectedValue);
      }
    } catch (error) {
      throw new Error(`${customMessage}. Actual value: ${JSON.stringify(actual)}. Original error: ${(error as Error).message}`);
    }

    if (isSoft && this.testInfo.errors.length > errorsBefore) {
      console.error(`❌ localStorage["${key}"] assertion failed (soft)`);
      return;
    }
    console.log(`✅ localStorage["${key}"] assertion passed (value: ${JSON.stringify(actual)})`);
  }

  /**
   * Assert that a `sessionStorage` entry exists and, optionally, matches an expected value.
   * Pass `null` as `expectedValue` to assert the key is **absent**.
   * @param key - sessionStorage key.
   * @param expectedValue - If provided: expected string/RegExp value, or `null` to assert absence.
   * @param options - Assert configuration options.
   * @param options.message - Custom error message on failure.
   * @param options.soft - When `true`, uses `expect.soft`; failure is recorded but execution continues.
   * @example
   * ```typescript
   * await assertions.assertSessionStorage('cartId');              // key exists
   * await assertions.assertSessionStorage('draft', /^item-/);    // value matches regex
   * await assertions.assertSessionStorage('tempKey', null);      // key must not exist
   * ```
   */
  async assertSessionStorage(key: string, expectedValue?: string | RegExp | null, options?: {
    message?: string;
    /** When `true`, uses `expect.soft` — failure is recorded but execution continues. */
    soft?: boolean;
  }): Promise<void> {
    const isSoft = options?.soft ?? false;
    const customMessage = options?.message || `sessionStorage["${key}"] assertion failed`;
    const errorsBefore = this.testInfo.errors.length;

    console.log(`🔍 Asserting sessionStorage["${key}"]`);

    const actual = await this.page.evaluate((k: string) => sessionStorage.getItem(k), key);

    try {
      if (expectedValue === null) {
        this.getExp(isSoft)(actual, customMessage).toBeNull();
      } else if (expectedValue === undefined) {
        this.getExp(isSoft)(actual, customMessage).not.toBeNull();
      } else if (typeof expectedValue === 'string') {
        this.getExp(isSoft)(actual, customMessage).toBe(expectedValue);
      } else {
        this.getExp(isSoft)(actual, customMessage).toMatch(expectedValue);
      }
    } catch (error) {
      throw new Error(`${customMessage}. Actual value: ${JSON.stringify(actual)}. Original error: ${(error as Error).message}`);
    }

    if (isSoft && this.testInfo.errors.length > errorsBefore) {
      console.error(`❌ sessionStorage["${key}"] assertion failed (soft)`);
      return;
    }
    console.log(`✅ sessionStorage["${key}"] assertion passed (value: ${JSON.stringify(actual)})`);
  }

  // #endregion

  // ──────────────────────────────────────────────────────────────────────────
  // #region BROWSER STATE — TABS & WINDOWS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Assert the exact number of open tabs/windows in the current browser context.
   * Useful for verifying that opening or closing a tab had the expected effect.
   * @param expected - Exact number of open pages expected.
   * @param options - Assert configuration options.
   * @param options.message - Custom failure message.
   * @param options.soft - When `true`, uses `expect.soft`; failure is recorded but execution continues.
   * @example
   * ```typescript
   * await assertions.assertTabCount(1);                     // only the original tab
   * await assertions.assertTabCount(2);                     // original + one new tab
   * await assertions.assertTabCount(3, { soft: true });
   * ```
   */
  async assertTabCount(expected: number, options?: {
    message?: string;
    /** When `true`, uses `expect.soft` — failure is recorded but execution continues. */
    soft?: boolean;
  }): Promise<void> {
    const isSoft = options?.soft ?? false;
    const customMessage = options?.message ?? `Expected ${expected} open tab(s)`;
    const errorsBefore = this.testInfo.errors.length;

    console.log(`🔍 Asserting open tab count: ${expected}`);

    const actual = this.page.context().pages().length;

    if (actual !== expected) {
      const failure = `${customMessage}: found ${actual} open tab(s), expected ${expected}.`;
      if (isSoft) {
        this.testInfo.errors.push({ message: failure });
        console.error(`❌ ${failure} (soft)`);
        return;
      }
      throw new Error(failure);
    }

    if (isSoft && this.testInfo.errors.length > errorsBefore) {
      console.error(`❌ assertTabCount soft failure recorded`);
    } else {
      console.log(`✅ Tab count is ${actual}`);
    }
  }

  /**
   * Assert that the **currently focused** page's URL matches the given pattern.
   * Wraps Playwright's `expect(page).toHaveURL()` with soft-assertion support.
   * @param pattern - Expected URL string or RegExp.
   * @param options - Assert configuration options.
   * @param options.timeout - Wait timeout in ms (default: 5000ms).
   * @param options.message - Custom failure message.
   * @param options.soft - When `true`, uses `expect.soft`; failure is recorded but execution continues.
   * @example
   * ```typescript
   * await assertions.assertActiveTabUrl('/dashboard');
   * await assertions.assertActiveTabUrl(/\/report\/\d+/);
   * ```
   */
  async assertActiveTabUrl(pattern: string | RegExp, options?: {
    timeout?: number;
    message?: string;
    /** When `true`, uses `expect.soft` — failure is recorded but execution continues. */
    soft?: boolean;
  }): Promise<void> {
    return this.runPageAssertion(options, {
      stepLabel:        `Asserting active tab URL: ${pattern}`,
      failureMessage:   options?.message ?? `Active tab URL should match "${pattern}"`,
      screenshotOnFail: 'active_tab_url_mismatch',
    },
    (exp, page, message, timeout) => exp(page, message).toHaveURL(pattern, { timeout }),
    );
  }

  /**
   * Assert that the **currently focused** page's `<title>` matches the given pattern.
   * Wraps Playwright's `expect(page).toHaveTitle()` with soft-assertion support.
   * @param pattern - Expected title string or RegExp.
   * @param options - Assert configuration options.
   * @param options.timeout - Wait timeout in ms (default: 5000ms).
   * @param options.message - Custom failure message.
   * @param options.soft - When `true`, uses `expect.soft`; failure is recorded but execution continues.
   * @example
   * ```typescript
   * await assertions.assertActiveTabTitle('Dashboard');
   * await assertions.assertActiveTabTitle(/Monthly Report/);
   * ```
   */
  async assertActiveTabTitle(pattern: string | RegExp, options?: {
    timeout?: number;
    message?: string;
    /** When `true`, uses `expect.soft` — failure is recorded but execution continues. */
    soft?: boolean;
  }): Promise<void> {
    return this.runPageAssertion(options, {
      stepLabel:        `Asserting active tab title: ${pattern}`,
      failureMessage:   options?.message ?? `Active tab title should match "${pattern}"`,
      screenshotOnFail: 'active_tab_title_mismatch',
    },
    (exp, page, message, timeout) => exp(page, message).toHaveTitle(pattern, { timeout }),
    );
  }

  // #endregion

  // ──────────────────────────────────────────────────────────────────────────
  // #region NETWORK ASSERTIONS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Assert that a network request matching the given URL pattern was made during a test action.
   * You must trigger the request **after** calling this method (or use `page.waitForRequest` timing).
   * The method waits up to `timeout` for a matching request to appear in the network log.
   * @param urlPattern - URL string (substring match) or RegExp to match against the request URL.
   * @param options - Assert configuration options.
   * @param options.method - HTTP method filter, e.g. `"POST"`. Case-insensitive. Omit to match any.
   * @param options.timeout - Maximum time to wait for the matching request (default: 10000ms).
   * @param options.message - Custom error message on failure.
   * @param options.soft - When `true`, uses `expect.soft`; failure is recorded but execution continues.
   * @example
   * ```typescript
   * const [, res] = await Promise.all([
   *   assertions.assertNetworkRequest('/api/login', { method: 'POST' }),
   *   page.click('#submit'),
   * ]);
   * ```
   */
  async assertNetworkRequest(urlPattern: string | RegExp, options?: {
    method?: string;
    timeout?: number;
    message?: string;
    /** When `true`, uses `expect.soft` — failure is recorded but execution continues. */
    soft?: boolean;
  }): Promise<void> {
    const isSoft = options?.soft ?? false;
    const timeout = options?.timeout ?? 10000;
    const methodFilter = options?.method?.toUpperCase();
    const customMessage = options?.message || `No matching network request found for: ${urlPattern}${methodFilter ? ` [${methodFilter}]` : ''}`;
    const errorsBefore = this.testInfo.errors.length;

    console.log(`🔍 Asserting network request: ${urlPattern}${methodFilter ? ` [${methodFilter}]` : ''}`);

    try {
      await this.page.waitForRequest(req => {
        const urlMatch = typeof urlPattern === 'string'
          ? req.url().includes(urlPattern)
          : urlPattern.test(req.url());
        const methodMatch = !methodFilter || req.method().toUpperCase() === methodFilter;
        return urlMatch && methodMatch;
      }, { timeout });
    } catch (error) {
      if (isSoft) {
        const msg = `${customMessage}. Original error: ${(error as Error).message}`;
        this.testInfo.errors.push({ message: msg });
        console.error(`❌ Network request assertion failed (soft): ${customMessage}`);
        return;
      }
      throw new Error(`${customMessage}. Original error: ${(error as Error).message}`);
    }

    if (isSoft && this.testInfo.errors.length > errorsBefore) { return; }
    console.log(`✅ Network request assertion passed: ${urlPattern}`);
  }

  /**
   * Assert that a network response matching the given URL pattern was received during a test action.
   * Optionally checks the response status code.
   * The method waits up to `timeout` for a matching response to arrive.
   * @param urlPattern - URL string (substring match) or RegExp to match against the response URL.
   * @param options - Assert configuration options.
   * @param options.status - If provided, the response status code must equal this value.
   * @param options.timeout - Maximum time to wait for the matching response (default: 10000ms).
   * @param options.message - Custom error message on failure.
   * @param options.soft - When `true`, uses `expect.soft`; failure is recorded but execution continues.
   * @example
   * ```typescript
   * const [, response] = await Promise.all([
   *   assertions.assertNetworkResponse('/api/data', { status: 200 }),
   *   page.click('#load'),
   * ]);
   * ```
   */
  async assertNetworkResponse(urlPattern: string | RegExp, options?: {
    status?: number;
    timeout?: number;
    message?: string;
    /** When `true`, uses `expect.soft` — failure is recorded but execution continues. */
    soft?: boolean;
  }): Promise<void> {
    const isSoft = options?.soft ?? false;
    const timeout = options?.timeout ?? 10000;
    const expectedStatus = options?.status;
    const customMessage = options?.message || `No matching network response found for: ${urlPattern}${expectedStatus !== undefined ? ` (status ${expectedStatus})` : ''}`;
    const errorsBefore = this.testInfo.errors.length;

    console.log(`🔍 Asserting network response: ${urlPattern}${expectedStatus !== undefined ? ` [status: ${expectedStatus}]` : ''}`);

    try {
      const response = await this.page.waitForResponse(res => {
        const urlMatch = typeof urlPattern === 'string'
          ? res.url().includes(urlPattern)
          : urlPattern.test(res.url());
        const statusMatch = expectedStatus === undefined || res.status() === expectedStatus;
        return urlMatch && statusMatch;
      }, { timeout });

      if (expectedStatus !== undefined && response.status() !== expectedStatus) {
        throw new Error(`Expected status ${expectedStatus}, got ${response.status()}`);
      }
    } catch (error) {
      if (isSoft) {
        const msg = `${customMessage}. Original error: ${(error as Error).message}`;
        this.testInfo.errors.push({ message: msg });
        console.error(`❌ Network response assertion failed (soft): ${customMessage}`);
        return;
      }
      throw new Error(`${customMessage}. Original error: ${(error as Error).message}`);
    }

    if (isSoft && this.testInfo.errors.length > errorsBefore) { return; }
    console.log(`✅ Network response assertion passed: ${urlPattern}`);
  }

  // #endregion

  // ──────────────────────────────────────────────────────────────────────────
  // #region VALUE / PRIMITIVE ASSERTIONS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Assert strict identity (`toBe`) for primitive/reference equality.
   * @param actual - Actual value.
   * @param expected - Expected value.
   * @param messageOrOptions - Optional message or `{ message?, soft? }`. Set `soft: true` for soft assertion.
   */
  assertToBe<T>(actual: T, expected: T, messageOrOptions?: string | AssertOptions): void {
    const { message, soft } = parseAssertOptions(messageOrOptions);
    this.getExp(soft)(actual, message).toBe(expected);
  }

  /**
   * Assert deep equality (`toEqual`).
   * @param actual - Actual value.
   * @param expected - Expected value.
   * @param messageOrOptions - Optional message or `{ message?, soft? }`. Set `soft: true` for soft assertion.
   */
  assertToEqual<T>(actual: T, expected: T, messageOrOptions?: string | AssertOptions): void {
    const { message, soft } = parseAssertOptions(messageOrOptions);
    this.getExp(soft)(actual as any, message).toEqual(expected);
  }

  /**
   * Assert strict deep equality (`toStrictEqual`).
   * @param actual - Actual value.
   * @param expected - Expected value.
   * @param messageOrOptions - Optional message or `{ message?, soft? }`. Set `soft: true` for soft assertion.
   */
  assertToStrictEqual<T>(actual: T, expected: T, messageOrOptions?: string | AssertOptions): void {
    const { message, soft } = parseAssertOptions(messageOrOptions);
    this.getExp(soft)(actual as any, message).toStrictEqual(expected);
  }

  /**
   * Assert value is truthy.
   * @param actual - Value under test.
   * @param messageOrOptions - Optional message or `{ message?, soft? }`. Set `soft: true` for soft assertion.
   */
  assertTruthy(actual: unknown, messageOrOptions?: string | AssertOptions): void {
    const { message, soft } = parseAssertOptions(messageOrOptions);
    this.getExp(soft)(actual, message).toBeTruthy();
  }

  /**
   * Assert value is falsy.
   * @param actual - Value under test.
   * @param messageOrOptions - Optional message or `{ message?, soft? }`. Set `soft: true` for soft assertion.
   */
  assertFalsy(actual: unknown, messageOrOptions?: string | AssertOptions): void {
    const { message, soft } = parseAssertOptions(messageOrOptions);
    this.getExp(soft)(actual, message).toBeFalsy();
  }

  /**
   * Assert value is null.
   * @param actual - Value under test.
   * @param messageOrOptions - Optional message or `{ message?, soft? }`. Set `soft: true` for soft assertion.
   */
  assertNull(actual: unknown, messageOrOptions?: string | AssertOptions): void {
    const { message, soft } = parseAssertOptions(messageOrOptions);
    this.getExp(soft)(actual, message).toBeNull();
  }

  /**
   * Assert value is undefined.
   * @param actual - Value under test.
   * @param messageOrOptions - Optional message or `{ message?, soft? }`. Set `soft: true` for soft assertion.
   */
  assertUndefined(actual: unknown, messageOrOptions?: string | AssertOptions): void {
    const { message, soft } = parseAssertOptions(messageOrOptions);
    this.getExp(soft)(actual, message).toBeUndefined();
  }

  /**
   * Assert value is defined.
   * @param actual - Value under test.
   * @param messageOrOptions - Optional message or `{ message?, soft? }`. Set `soft: true` for soft assertion.
   */
  assertDefined(actual: unknown, messageOrOptions?: string | AssertOptions): void {
    const { message, soft } = parseAssertOptions(messageOrOptions);
    this.getExp(soft)(actual, message).toBeDefined();
  }

  /**
   * Assert value is NaN.
   * @param actual - Value under test.
   * @param messageOrOptions - Optional message or `{ message?, soft? }`. Set `soft: true` for soft assertion.
   */
  assertNaN(actual: unknown, messageOrOptions?: string | AssertOptions): void {
    const { message, soft } = parseAssertOptions(messageOrOptions);
    this.getExp(soft)(actual, message).toBeNaN();
  }

  /**
   * Assert string/array contains expected item.
   * @param actual - String or array to inspect.
   * @param expected - Expected substring/element.
   * @param messageOrOptions - Optional message or `{ message?, soft? }`. Set `soft: true` for soft assertion.
   */
  assertContains<T>(actual: string | readonly T[], expected: string | T, messageOrOptions?: string | AssertOptions): void {
    const { message, soft } = parseAssertOptions(messageOrOptions);
    this.getExp(soft)(actual as any, message).toContain(expected as any);
  }

  /**
   * Assert array contains an item equal by deep comparison.
   * @param actual - Array to inspect.
   * @param expected - Expected element.
   * @param messageOrOptions - Optional message or `{ message?, soft? }`. Set `soft: true` for soft assertion.
   */
  assertContainsEqual<T>(actual: readonly T[], expected: T, messageOrOptions?: string | AssertOptions): void {
    const { message, soft } = parseAssertOptions(messageOrOptions);
    this.getExp(soft)(actual, message).toContainEqual(expected);
  }

  /**
   * Assert object/string/array length.
   * @param actual - Value containing a `length` property.
   * @param expectedLength - Expected length.
   * @param messageOrOptions - Optional message or `{ message?, soft? }`. Set `soft: true` for soft assertion.
   */
  assertLength(actual: { length: number }, expectedLength: number, messageOrOptions?: string | AssertOptions): void {
    const { message, soft } = parseAssertOptions(messageOrOptions);
    this.getExp(soft)(actual, message).toHaveLength(expectedLength);
  }

  /**
   * Assert object has property path, optionally with expected value.
   * @param actual - Object under test.
   * @param path - Property path (dot path or path segments).
   * @param value - Optional expected property value.
   * @param messageOrOptions - Optional message or `{ message?, soft? }`. Set `soft: true` for soft assertion.
   */
  assertProperty(actual: unknown, path: string | Array<string | number>, value?: unknown, messageOrOptions?: string | AssertOptions): void {
    const { message, soft } = parseAssertOptions(messageOrOptions);
    if (arguments.length >= 3) {
      this.getExp(soft)(actual, message).toHaveProperty(path as any, value);
      return;
    }
    this.getExp(soft)(actual, message).toHaveProperty(path as any);
  }

  /**
   * Assert string matches a pattern.
   * @param actual - Actual string.
   * @param expected - Expected string/regex.
   * @param messageOrOptions - Optional message or `{ message?, soft? }`. Set `soft: true` for soft assertion.
   */
  assertMatch(actual: string, expected: string | RegExp, messageOrOptions?: string | AssertOptions): void {
    const { message, soft } = parseAssertOptions(messageOrOptions);
    this.getExp(soft)(actual, message).toMatch(expected as any);
  }

  /**
   * Assert object partially matches expected shape.
   * @param actual - Actual object.
   * @param expected - Expected partial object.
   * @param messageOrOptions - Optional message or `{ message?, soft? }`. Set `soft: true` for soft assertion.
   */
  assertMatchObject(actual: unknown, expected: Record<string, unknown>, messageOrOptions?: string | AssertOptions): void {
    const { message, soft } = parseAssertOptions(messageOrOptions);
    this.getExp(soft)(actual, message).toMatchObject(expected);
  }

  /**
   * Assert number is greater than expected.
   * @param actual - Actual number.
   * @param expected - Threshold number.
   * @param messageOrOptions - Optional message or `{ message?, soft? }`. Set `soft: true` for soft assertion.
   */
  assertGreaterThan(actual: number, expected: number, messageOrOptions?: string | AssertOptions): void {
    const { message, soft } = parseAssertOptions(messageOrOptions);
    this.getExp(soft)(actual, message).toBeGreaterThan(expected);
  }

  /**
   * Assert number is greater than or equal to expected.
   * @param actual - Actual number.
   * @param expected - Threshold number.
   * @param messageOrOptions - Optional message or `{ message?, soft? }`. Set `soft: true` for soft assertion.
   */
  assertGreaterThanOrEqual(actual: number, expected: number, messageOrOptions?: string | AssertOptions): void {
    const { message, soft } = parseAssertOptions(messageOrOptions);
    this.getExp(soft)(actual, message).toBeGreaterThanOrEqual(expected);
  }

  /**
   * Assert number is less than expected.
   * @param actual - Actual number.
   * @param expected - Threshold number.
   * @param messageOrOptions - Optional message or `{ message?, soft? }`. Set `soft: true` for soft assertion.
   */
  assertLessThan(actual: number, expected: number, messageOrOptions?: string | AssertOptions): void {
    const { message, soft } = parseAssertOptions(messageOrOptions);
    this.getExp(soft)(actual, message).toBeLessThan(expected);
  }

  /**
   * Assert number is less than or equal to expected.
   * @param actual - Actual number.
   * @param expected - Threshold number.
   * @param messageOrOptions - Optional message or `{ message?, soft? }`. Set `soft: true` for soft assertion.
   */
  assertLessThanOrEqual(actual: number, expected: number, messageOrOptions?: string | AssertOptions): void {
    const { message, soft } = parseAssertOptions(messageOrOptions);
    this.getExp(soft)(actual, message).toBeLessThanOrEqual(expected);
  }

  /**
   * Assert numbers are close within the specified precision.
   * @param actual - Actual number.
   * @param expected - Expected number.
   * @param numDigits - Precision digits for closeness comparison.
   * @param messageOrOptions - Optional message or `{ message?, soft? }`. Set `soft: true` for soft assertion.
   */
  assertCloseTo(actual: number, expected: number, numDigits?: number, messageOrOptions?: string | AssertOptions): void {
    const { message, soft } = parseAssertOptions(messageOrOptions);
    this.getExp(soft)(actual, message).toBeCloseTo(expected, numDigits);
  }

  /**
   * Assert value is an instance of a class.
   * @param actual - Value under test.
   * @param expectedClass - Constructor/class reference.
   * @param messageOrOptions - Optional message or `{ message?, soft? }`. Set `soft: true` for soft assertion.
   */
  assertInstanceOf(actual: unknown, expectedClass: any, messageOrOptions?: string | AssertOptions): void {
    const { message, soft } = parseAssertOptions(messageOrOptions);
    this.getExp(soft)(actual, message).toBeInstanceOf(expectedClass);
  }

  /**
   * Assert function throws, optionally matching expected message/error.
   * @param fn - Function expected to throw.
   * @param expected - Optional expected message/regex/error.
   * @param messageOrOptions - Optional message or `{ message?, soft? }`. Set `soft: true` for soft assertion.
   */
  assertThrows(fn: () => unknown, expected?: string | RegExp | Error, messageOrOptions?: string | AssertOptions): void {
    const { message, soft } = parseAssertOptions(messageOrOptions);
    if (expected !== undefined) {
      this.getExp(soft)(fn, message).toThrow(expected as any);
      return;
    }
    this.getExp(soft)(fn, message).toThrow();
  }

  /**
   * Assert async function/promise rejects, optionally matching expected message/error.
   * @param promiseFactory - Function returning a promise expected to reject.
   * @param expected - Optional expected message/regex/error.
   * @param messageOrOptions - Optional message or `{ message?, soft? }`. Set `soft: true` for soft assertion.
   * @returns Promise that resolves when rejection assertion passes.
   */
  async assertRejects(promiseFactory: () => Promise<unknown>, expected?: string | RegExp | Error, messageOrOptions?: string | AssertOptions): Promise<void> {
    const { message, soft } = parseAssertOptions(messageOrOptions);
    if (expected !== undefined) {
      await this.getExp(soft)(promiseFactory, message).rejects.toThrow(expected as any);
      return;
    }
    await this.getExp(soft)(promiseFactory, message).rejects.toThrow();
  }

  /**
   * Assert value/object against stored snapshot.
   * @param value - Value to snapshot.
   * @param name - Optional snapshot name/path segments.
   * @param messageOrOptions - Optional message or `{ message?, soft? }`. Set `soft: true` for soft assertion.
   */
  assertMatchSnapshot(value: unknown, name?: string | Array<string>, messageOrOptions?: string | AssertOptions): void {
    const { message, soft } = parseAssertOptions(messageOrOptions);
    if (name) {
      this.getExp(soft)(value, message).toMatchSnapshot(name as any);
      return;
    }
    this.getExp(soft)(value, message).toMatchSnapshot();
  }

  /**
   * Return a configured `expect` instance.
   * @param options - `expect.configure` options.
   * @param options.timeout - Default timeout for assertions from this instance.
   * @returns Configured expect function.
   */
  getConfiguredExpect(options: { timeout?: number; soft?: boolean }): typeof expect {
    // expect.configure supports both timeout and soft options natively.
    return expect.configure(options);
  }

  // #endregion

  // ──────────────────────────────────────────────────────────────────────────
  // #region POLLING & RETRY ASSERTIONS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Poll a probe function until value equals expected using `toBe`.
   * @param probe - Function sampled repeatedly until assertion passes or times out.
   * @param expected - Expected value for strict equality.
   * @param options - Poll/assertion options.
   * @param options.timeout - Total poll timeout in milliseconds.
   * @param options.intervals - Custom polling intervals in milliseconds.
   * @param options.message - Optional assertion message shown on failure.
   * @returns Promise that resolves when assertion passes.
   */
  async assertPollToBe<T>(
    probe: () => Promise<T> | T,
    expected: T,
    options?: {
      timeout?: number;
      intervals?: number[];
      message?: string;
      /** When `true`, failure is recorded softly and execution continues. */
      soft?: boolean;
    }
  ): Promise<void> {
    const isSoft = options?.soft ?? false;
    try {
      await expect.poll(probe, {
        timeout: options?.timeout,
        intervals: options?.intervals,
        message: options?.message
      }).toBe(expected);
    } catch (error) {
      if (isSoft) {
        const err = error as Error;
        (this.testInfo.errors as Array<{ message?: string; stack?: string }>).push({ message: err.message, stack: err.stack });
        return;
      }
      throw error;
    }
  }

  /**
   * Poll a probe function until value equals expected using deep equality (`toEqual`).
   * @param probe - Function sampled repeatedly until assertion passes or times out.
   * @param expected - Expected value.
   * @param options - Poll/assertion options.
   * @param options.timeout - Total poll timeout in milliseconds.
   * @param options.intervals - Custom polling intervals in milliseconds.
   * @param options.message - Optional assertion message shown on failure.
   * @param options.soft - When `true`, failure is recorded softly and execution continues.
   * @returns Promise that resolves when assertion passes.
   */
  async assertPollToEqual<T>(
    probe: () => Promise<T> | T,
    expected: T,
    options?: {
      timeout?: number;
      intervals?: number[];
      message?: string;
      /** When `true`, failure is recorded softly and execution continues. */
      soft?: boolean;
    }
  ): Promise<void> {
    const isSoft = options?.soft ?? false;
    try {
      await expect.poll(probe, {
        timeout: options?.timeout,
        intervals: options?.intervals,
        message: options?.message
      }).toEqual(expected);
    } catch (error) {
      if (isSoft) {
        const err = error as Error;
        (this.testInfo.errors as Array<{ message?: string; stack?: string }>).push({ message: err.message, stack: err.stack });
        return;
      }
      throw error;
    }
  }

  /**
   * Retry an assertion block until it passes using `toPass`.
   * @param assertionBlock - Async assertion logic to retry.
   * @param options - Retry/assertion options.
   * @param options.timeout - Total retry timeout in milliseconds.
   * @param options.intervals - Custom retry intervals in milliseconds.
   * @param options.message - Optional assertion message shown on failure.
   * @param options.soft - When `true`, failure is recorded softly and execution continues.
   * @returns Promise that resolves when assertion block passes.
   */
  async assertToPass(
    assertionBlock: () => Promise<void>,
    options?: {
      timeout?: number;
      intervals?: number[];
      message?: string;
      /** When `true`, uses `expect.soft` — failure is recorded but execution continues. */
      soft?: boolean;
    }
  ): Promise<void> {
    const isSoft = options?.soft ?? false;
    const exp = this.getExp(isSoft);
    await exp(async () => {
      await assertionBlock();
    }, options?.message).toPass({
      timeout: options?.timeout,
      intervals: options?.intervals
    });
  }

  /**
   * Assert element count is greater than or equal to expected minimum count with error handling
   * @param locator - Element locator to count (can use locator.describe() for better error messages)
   * @param minCount - Minimum expected count (inclusive)
   * @param options - Assert configuration options
   * @param options.timeout - Maximum time to wait for count check (default: 10000ms)
   * @param options.message - Custom error message to display on failure
   * @returns Promise that resolves when assertion passes
   * @throws Error with actual count details if assertion fails
   * @example
   * ```typescript
   * await assertions.assertElementCountGreaterThanOrEqual(searchResults, 1);
   * ```
   * @example
   * ```typescript
   * await assertions.assertElementCountGreaterThanOrEqual(productItems, 3, {
   *   message: 'Should have at least 3 products'
   * });
   * ```
   */
  async assertElementCountGreaterThanOrEqual(locator: Locator, minCount: number, options?: {
    timeout?: number;
    message?: string;
    /** When `true`, uses `expect.soft` — failure is recorded but execution continues. */
    soft?: boolean;
  }): Promise<void> {
    const desc = this.getDescription(locator);
    return this.runPolledCountAssertion(locator, options, {
      stepLabel:        `Asserting count${desc ? ` of ${desc}` : ''} is >= ${minCount}`,
      failureMessage:   `Element count is less than expected${desc ? ` for "${desc}"` : ''}`,
      screenshotOnFail: `count_not_greater_or_equal ${desc}`,
      screenshotOnPass: `count_greater_or_equal ${desc}`,
      expectedLabel:    `>= ${minCount}`,
    },
    (count) => count < minCount,
    (exp, count, m) => exp(count, m).toBeGreaterThanOrEqual(minCount),
    );
  }

  // #endregion

  // ──────────────────────────────────────────────────────────────────────────
  // #region REPORTING
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Create a detailed assertion report — printed to the console **and** attached to the
   * Playwright HTML report so it is always visible alongside the test result.
   *
   * @param testName - Descriptive name shown as the report heading.
   * @param assertions - Ordered list of assertion results collected during the test.
   * @example
   * ```typescript
   * const results = [
   *   { name: 'Login button visible', status: 'passed', duration: 150 },
   *   { name: 'Error message hidden', status: 'failed', duration: 1000, error: 'Element still visible' }
   * ];
   * await assertions.createAssertionReport('Login flow', results);
   * ```
   */
  async createAssertionReport(testName: string, assertions: Array<{
    name: string;
    status: 'passed' | 'failed';
    duration: number;
    error?: string;
  }>): Promise<void> {
    let passedCount = 0;
    let failedCount = 0;
    const lines: string[] = [];

    lines.push(`📊 ASSERTION REPORT — ${testName}`);
    lines.push('='.repeat(60));

    for (const assertion of assertions) {
      if (assertion.status === 'passed') {
        lines.push(`✅ ${assertion.name} (${assertion.duration}ms)`);
        passedCount++;
      } else {
        lines.push(`❌ ${assertion.name} (${assertion.duration}ms)${assertion.error ? ` — ${assertion.error}` : ''}`);
        failedCount++;
      }
    }

    lines.push('='.repeat(60));
    lines.push(`📈 Summary: ${passedCount} passed, ${failedCount} failed out of ${assertions.length} total`);

    const reportText = lines.join('\n');
    console.log(`\n${reportText}\n`);

    // Attach the report as a plain-text annotation so it appears in the HTML reporter
    // alongside screenshots and traces for this test.
    await this.testInfo.attach(`Assertion Report — ${testName}`, {
      body: reportText,
      contentType: 'text/plain'
    });
  }

  // #endregion
}
