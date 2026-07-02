import { Page, TestInfo } from '@playwright/test';
import config from 'environment/env';

const ALL_SCREENSHOT_ENABLED = String(config.allScreenshotsEnabled).toLowerCase() === 'true';

/**
 * Utility class for taking and managing screenshots during test execution
 * @description Provides methods for capturing screenshots and attaching them to test reports.
 * Screenshots are automatically attached to test reports and can be used for debugging and documentation.
 * @example
 * ```typescript
 * // Take a success screenshot
 * await ScreenshotHelper.takeScreenshot(page, 'login_success', testInfo);
 * 
 * // Take a failure screenshot
 * await ScreenshotHelper.takeFailureScreenshot(page, 'login_failed', testInfo);
 * ```
 */
export class ScreenshotHelper {
  /**
   * Takes a full page screenshot and attaches it to the test report
   * @param page - Playwright page object to capture
   * @param description - Description for the screenshot filename (will be sanitized)
   * @param testInfo - Test information object for attaching the screenshot
   * @description Captures a full page screenshot and attaches it to the test report.
   * The screenshot is taken as a buffer and attached directly without creating files.
   * @example
   * ```typescript
   * await ScreenshotHelper.takeScreenshot(page, 'login_page_loaded', testInfo);
   * await ScreenshotHelper.takeScreenshot(page, 'form_submitted_successfully', testInfo);
   * ```
   */
  static async takeScreenshot(page: Page, description: string, testInfo: TestInfo) {
    try {
      if (!ALL_SCREENSHOT_ENABLED) return;
      const safeDescription = description.replace(/[\\/:*?"<>|]/g, '_');
      const fileName = `${safeDescription}.png`;

      // Take screenshot directly to buffer
      const buffer = await page.screenshot({ fullPage: true });

      // Attach buffer directly, no file creation
      await testInfo.attach(fileName, {
        body: buffer,
        contentType: 'image/png',
      });
    } catch (err) {
      console.warn(`⚠️ Could not take screenshot: ${(err as Error).message}`);
    }
  }

  /**
   * Takes a full page screenshot for failure scenarios and attaches it to the test report
   * @param page - Playwright page object to capture
   * @param description - Description for the screenshot filename (will be sanitized and prefixed with 'FAIL_')
   * @param testInfo - Test information object for attaching the screenshot
   * @description Captures a full page screenshot with 'FAIL_' prefix for failure scenarios.
   * This helps distinguish failure screenshots from success screenshots in test reports.
   * @example
   * ```typescript
   * await ScreenshotHelper.takeFailureScreenshot(page, 'login_failed', testInfo);
   * await ScreenshotHelper.takeFailureScreenshot(page, 'element_not_found', testInfo);
   * ```
   */
  static async takeFailureScreenshot(page: Page, description: string, testInfo: TestInfo) {
    try {
      if (!ALL_SCREENSHOT_ENABLED) return;
      const safeDescription = description.replace(/[\\/:*?"<>|]/g, '_');
      const fileName = `FAIL_${safeDescription}.png`;

      const buffer = await page.screenshot({ fullPage: true });

      await testInfo.attach(fileName, {
        body: buffer,
        contentType: 'image/png',
      });
    } catch (err) {
      console.warn(`⚠️ Could not take failure screenshot: ${(err as Error).message}`);
    }
  }
}
