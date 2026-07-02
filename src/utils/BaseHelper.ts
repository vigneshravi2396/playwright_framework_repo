import { Page, Locator, TestInfo, expect, APIResponse } from '@playwright/test';
import { SelfHealingHelper } from './SelfHealingHelper';
import { ScreenshotHelper } from './ScreenShotsHelper';
import config from 'environment/env';

const SELF_HEAL_ENABLED = config.selfhealEnabled === 'true';

/**
 * Shared base class for `BaseActions` and `BaseAssertions`.
 * Holds the common constructor, element-description helper, the unified
 * diagnostic snapshot used in error messages, and the core locator-assertion
 * runner that eliminates boilerplate across all locator-based assertions.
 */
export abstract class BaseHelper {
  protected page: Page;
  protected testInfo: TestInfo;

  constructor(page: Page, testInfo: TestInfo) {
    this.page = page;
    this.testInfo = testInfo;
  }

  /**
   * Extract the human-readable description from a locator (set via `locator.describe()`).
   * Returns `undefined` silently when the locator has no description.
   */
  protected getDescription(locator: Locator): string | undefined {
    try {
      const desc = locator.description();
      return desc ?? undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Returns `expect.soft` when `soft` is true, `expect` otherwise.
   * Kept as `protected` so non-runner assertion methods (poll, page-level, etc.)
   * can still call `this.getExp(isSoft)` directly.
   */
  protected getExp(soft?: boolean): typeof expect {
    // expect.soft shares the same call signature as expect for locators.
    return (soft ? expect.soft : expect) as typeof expect;
  }

  /**
   * Collect a snapshot of an element's current state for use in error messages.
   * Gathers: count, visibility, enabled-state, text content, input value, bounding
   * box, and current page URL.  Every sub-check is individually guarded so a single
   * DOM query failure never prevents the rest of the diagnostics from being captured.
   *
   * When the top-level locator lookup fails and self-healing is enabled, the method
   * retries once with a healed locator before returning a failure summary.
   */
  protected async gatherElementDiagnostics(locator: Locator): Promise<string> {
    const description = this.getDescription(locator);

    const collect = async (target: Locator): Promise<string> => {
      const parts: string[] = [];
      if (description) parts.push(`Element: ${description}`);

      const count = await target.count();
      parts.push(`count: ${count}`);

      if (count > 0) {
        const first = target.first();

        try {
          parts.push(`visible: ${await first.isVisible()}`);
        } catch {
          parts.push(`visible: (check failed)`);
        }

        try {
          parts.push(`enabled: ${await first.isEnabled()}`);
        } catch {
          parts.push(`enabled: (check failed)`);
        }

        try {
          const text = await first.textContent();
          parts.push(`text: "${text}"`);
        } catch {
          parts.push(`text: (check failed)`);
        }

        try {
          const value = await first.inputValue();
          parts.push(`value: "${value}"`);
        } catch {
          // Not an input — skip silently
        }

        try {
          const box = await first.boundingBox();
          if (box) {
            parts.push(`bbox: ${JSON.stringify(box)}`);
          }
        } catch {
          // Skip silently
        }
      }

      parts.push(`url: ${this.page.url()}`);
      return parts.join(', ');
    };

    try {
      return await collect(locator);
    } catch (error) {
      if (SelfHealingHelper.isLocatorError(error as Error) && SELF_HEAL_ENABLED) {
        try {
          const result = await SelfHealingHelper.trySelfHealing(
            this.page,
            locator,
            description,
            (healedLocator) => collect(healedLocator)
          );
          return `${result} (after self-healing)`;
        } catch {
          // Fall through to the generic failure message
        }
      }
      return `Diagnostics failed: ${(error as Error).message}, url: ${this.page.url()}`;
    }
  }

  /**
   * Core runner for all standard locator-based assertions in `BaseAssertions`.
   *
   * Handles uniformly across every assertion:
   * - Timing (start/end measurement)
   * - Structured console logging (🔍 / ✅ / ❌)
   * - Failure screenshots
   * - Soft-assertion detection (post-call error-count diff)
   * - Soft-failure diagnostics + screenshot
   * - Self-healing on locator errors (when `cfg.selfHeal: true`)
   * - Success screenshots (optional)
   *
   * @param locator    Element to assert on.
   * @param options    Standard assertion options: timeout, message, soft.
   * @param cfg        Per-assertion config: log label, default message, screenshot names,
   *                   and whether self-healing should be attempted on locator errors.
   * @param assertion  The Playwright matcher call.
   *                   Receives: exp (expect or expect.soft), locator, message, timeout.
   *                   When self-healing fires, the same callback is re-invoked with plain
   *                   `expect` and the healed locator — no duplication needed at call sites.
   *                   Example: `(exp, l, m, t) => exp(l, m).toBeVisible({ timeout: t })`
   */
  protected async runLocatorAssertion(
    locator: Locator,
    options: { timeout?: number; message?: string; soft?: boolean } | undefined,
    cfg: {
      /** Label shown in all console lines (🔍 start / ✅ pass / ❌ fail) for this assertion step. */
      stepLabel: string;
      /** Message shown when the assertion fails and no custom `options.message` was provided. */
      failureMessage: string;
      /** Screenshot filename captured on assertion failure. */
      screenshotOnFail: string;
      /** Screenshot filename captured on assertion pass. Omit or `null` to skip. */
      screenshotOnPass?: string | null;
      /**
       * Set `true` when this assertion requires the element to exist in a specific
       * positive state (e.g. visible, enabled, checked). If the locator fails to
       * resolve, self-healing will be attempted before throwing.
       * Omit (or `false`) for negation assertions — those pass trivially when the
       * element is not found, so self-healing would produce false positives.
       */
      isSelfHealEligible?: boolean;
    },
    assertion: (exp: typeof expect, locator: Locator, message: string, timeout: number) => Promise<void>,
  ): Promise<void> {
    const description = this.getDescription(locator);
    const timeout = options?.timeout ?? 10000;
    const isSoft = options?.soft ?? false;
    const customMessage = options?.message ?? cfg.failureMessage;
    const exp = this.getExp(isSoft);
    const errorsBefore = this.testInfo.errors.length;
    const startTime = Date.now();
    const label = description ? ` (${description})` : '';

    console.log(`🔍 ${cfg.stepLabel}${label}`);

    try {
      await assertion(exp, locator, customMessage, timeout);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ ${cfg.stepLabel}${label} — FAILED (${duration}ms)`);
      await ScreenshotHelper.takeFailureScreenshot(this.page, cfg.screenshotOnFail, this.testInfo);
      const diagnostics = await this.gatherElementDiagnostics(locator);

      if (cfg.isSelfHealEligible && SelfHealingHelper.isLocatorError(error as Error) && SELF_HEAL_ENABLED) {
        // Re-run the same assertion against the healed locator using plain expect (never soft).
        return await SelfHealingHelper.trySelfHealing(
          this.page, locator, description,
          (healedLocator) => assertion(expect, healedLocator, customMessage, timeout),
        );
      }

      throw new Error(
        `${customMessage} after ${duration}ms. ${diagnostics}. Original error: ${(error as Error).message}`,
      );
    }

    const duration = Date.now() - startTime;

    if (isSoft && this.testInfo.errors.length > errorsBefore) {
      console.error(`❌ ${cfg.stepLabel}${label} — SOFT FAILURE (${duration}ms)`);
      const softDiagnostics = await this.gatherElementDiagnostics(locator);
      console.error(`🔍 Soft assertion diagnostics:`, softDiagnostics);
      await ScreenshotHelper.takeFailureScreenshot(this.page, cfg.screenshotOnFail, this.testInfo);
      return;
    }

    console.log(`✅ ${cfg.stepLabel}${label} — PASSED (${duration}ms)`);
    if (cfg.screenshotOnPass) {
      await ScreenshotHelper.takeScreenshot(this.page, cfg.screenshotOnPass, this.testInfo);
    }
  }

  /**
   * Core runner for page-level assertions (`toHaveURL`, `toHaveTitle`).
   *
   * Mirrors `runLocatorAssertion` but targets the `Page` object instead of a `Locator`.
   * No self-healing — page-level assertions don't suffer from broken element selectors.
   *
   * @param options   Standard assertion options: timeout, message, soft.
   * @param cfg       Per-assertion config: log label, failure message, screenshot names.
   * @param assertion Playwright matcher call.
   *                  Receives: exp (expect or expect.soft), page, message, timeout.
   *                  Example: `(exp, page, m, t) => exp(page, m).toHaveURL(url, { timeout: t })`
   */
  protected async runPageAssertion(
    options: { timeout?: number; message?: string; soft?: boolean } | undefined,
    cfg: {
      /** Label shown in all console lines for this assertion step. */
      stepLabel: string;
      /** Message shown when the assertion fails and no custom `options.message` was provided. */
      failureMessage: string;
      /** Screenshot filename captured on assertion failure. */
      screenshotOnFail: string;
      /** Screenshot filename captured on assertion pass. Omit or `null` to skip. */
      screenshotOnPass?: string | null;
    },
    assertion: (exp: typeof expect, page: Page, message: string, timeout: number) => Promise<void>,
  ): Promise<void> {
    const timeout = options?.timeout ?? 10000;
    const isSoft = options?.soft ?? false;
    const customMessage = options?.message ?? cfg.failureMessage;
    const exp = this.getExp(isSoft);
    const errorsBefore = this.testInfo.errors.length;
    const startTime = Date.now();

    console.log(`🔍 ${cfg.stepLabel}`);

    try {
      await assertion(exp, this.page, customMessage, timeout);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ ${cfg.stepLabel} — FAILED (${duration}ms)`);
      await ScreenshotHelper.takeFailureScreenshot(this.page, cfg.screenshotOnFail, this.testInfo);
      throw new Error(
        `${customMessage} after ${duration}ms. Current URL: ${this.page.url()}. Original error: ${(error as Error).message}`,
      );
    }

    const duration = Date.now() - startTime;

    if (isSoft && this.testInfo.errors.length > errorsBefore) {
      console.error(`❌ ${cfg.stepLabel} — SOFT FAILURE (${duration}ms)`);
      await ScreenshotHelper.takeFailureScreenshot(this.page, cfg.screenshotOnFail, this.testInfo);
      return;
    }

    console.log(`✅ ${cfg.stepLabel} — PASSED (${duration}ms)`);
    if (cfg.screenshotOnPass) {
      await ScreenshotHelper.takeScreenshot(this.page, cfg.screenshotOnPass, this.testInfo);
    }
  }

  /**
   * Core runner for polled element-count assertions (>, <, >=, <=).
   *
   * Polls `locator.count()` every 100ms until the predicate is satisfied or the
   * timeout expires, then runs a synchronous numeric matcher.
   *
   * @param locator           Element to count.
   * @param options           Standard assertion options: timeout, message, soft.
   * @param cfg               Per-assertion config including `expectedLabel` for error context.
   * @param shouldKeepPolling Return `true` while the count has NOT yet satisfied the condition.
   *                          Example for `count > min`: `(count) => count <= min`
   * @param matcher           Synchronous numeric assertion.
   *                          Example: `(exp, count, m) => exp(count, m).toBeGreaterThan(min)`
   */
  protected async runPolledCountAssertion(
    locator: Locator,
    options: { timeout?: number; message?: string; soft?: boolean } | undefined,
    cfg: {
      /** Label shown in all console lines for this assertion step. */
      stepLabel: string;
      /** Message shown when the assertion fails and no custom `options.message` was provided. */
      failureMessage: string;
      /** Screenshot filename captured on assertion failure. */
      screenshotOnFail: string;
      /** Screenshot filename captured on assertion pass. Omit or `null` to skip. */
      screenshotOnPass?: string | null;
      /** Human-readable bound label used in error messages, e.g. `"> 3"`, `"<= 10"`. */
      expectedLabel: string;
    },
    shouldKeepPolling: (count: number) => boolean,
    matcher: (exp: typeof expect, count: number, message: string) => void,
  ): Promise<void> {
    const timeout = options?.timeout ?? 10000;
    const isSoft = options?.soft ?? false;
    const customMessage = options?.message ?? cfg.failureMessage;
    const exp = this.getExp(isSoft);
    const errorsBefore = this.testInfo.errors.length;
    const startTime = Date.now();

    console.log(`🔍 ${cfg.stepLabel}`);

    try {
      let actualCount = await locator.count();
      while (shouldKeepPolling(actualCount) && Date.now() - startTime < timeout) {
        await this.page.waitForTimeout(100);
        actualCount = await locator.count();
      }
      matcher(exp, actualCount, customMessage);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ ${cfg.stepLabel} — FAILED (${duration}ms)`);
      await ScreenshotHelper.takeFailureScreenshot(this.page, cfg.screenshotOnFail, this.testInfo);
      let actualCount = 0;
      try { actualCount = await locator.count(); } catch { /* keep 0 */ }
      throw new Error(
        `${customMessage}. Expected ${cfg.expectedLabel}, Actual: ${actualCount}. Duration: ${duration}ms. Original error: ${(error as Error).message}`,
      );
    }

    const duration = Date.now() - startTime;

    if (isSoft && this.testInfo.errors.length > errorsBefore) {
      console.error(`❌ ${cfg.stepLabel} — SOFT FAILURE (${duration}ms)`);
      await ScreenshotHelper.takeFailureScreenshot(this.page, cfg.screenshotOnFail, this.testInfo);
      return;
    }

    console.log(`✅ ${cfg.stepLabel} — PASSED (${duration}ms)`);
    if (cfg.screenshotOnPass) {
      await ScreenshotHelper.takeScreenshot(this.page, cfg.screenshotOnPass, this.testInfo);
    }
  }

  /**
   * Core runner for API response assertions (`assertResponseOK`, `assertResponseStatus`,
   * `assertResponseBody`, `assertResponseJSON`).
   *
   * Centralises soft-assertion detection, structured logging, and error propagation.
   * No screenshots — response assertions operate on in-memory data, not visible UI state.
   *
   * @param response   Playwright `APIResponse` object.
   * @param options    Standard assertion options: message, soft (no timeout — responses are synchronous).
   * @param cfg        Per-assertion config: log label, failure message.
   * @param assertion  The assertion logic including any async pre-steps (e.g. reading body/JSON).
   *                   Receives: exp (expect or expect.soft), response, message.
   *                   Any error thrown by this callback propagates as-is.
   */
  protected async runResponseAssertion(
    response: APIResponse,
    options: { message?: string; soft?: boolean } | undefined,
    cfg: {
      /** Label shown in all console lines for this assertion step. */
      stepLabel: string;
      /** Message shown when the assertion fails and no custom `options.message` was provided. */
      failureMessage: string;
    },
    assertion: (exp: typeof expect, response: APIResponse, message: string) => Promise<void> | void,
  ): Promise<void> {
    const isSoft = options?.soft ?? false;
    const customMessage = options?.message ?? cfg.failureMessage;
    const exp = this.getExp(isSoft);
    const errorsBefore = this.testInfo.errors.length;

    console.log(`🔍 ${cfg.stepLabel}`);

    try {
      await assertion(exp, response, customMessage);
    } catch (error) {
      console.error(`❌ ${cfg.stepLabel} — FAILED`);
      // Re-throw as-is — each callback builds its own detailed message.
      throw error instanceof Error ? error : new Error(`${customMessage}. Original error: ${String(error)}`);
    }

    if (isSoft && this.testInfo.errors.length > errorsBefore) {
      console.error(`❌ ${cfg.stepLabel} — SOFT FAILURE`);
      return;
    }

    console.log(`✅ ${cfg.stepLabel} — PASSED`);
  }
}
