import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';


/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// import path from 'path';
// dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * See https://playwright.dev/docs/test-configuration.
 */

// ESM __dirname
const __dirname = dirname(fileURLToPath(import.meta.url));

// Load env file for local runs (same convention as environment/env.ts). CI sets vars from secrets.
const envName = (process.env.ENV || 'local').toLowerCase();
dotenv.config({ path: resolve(__dirname, 'environment', `.env.${envName}`) });

const SUITE = process.env.SUITE || 'default';
const BROWSER = process.env.BROWSER as 'chrome' | 'firefox' | 'webkit' | 'chromium';
const IS_REGRESSION = process.env.IS_REGRESSION === 'true';

// ✅ Validate browser input
if (!['chrome', 'firefox', 'webkit', 'chromium'].includes(BROWSER)) {
  throw new Error(
    `❌ Invalid browser: "${BROWSER}". Please set BROWSER as one of: chrome | firefox | webkit | chromium`
  );
}

// Build reporters array based on whether it's a regression run
const reporters: any[] = [
  ['html', { outputFolder: `reports/${SUITE}/html-report`}],
  ['json', { outputFile: `reports/${SUITE}/results.json` }],
  // ['./reporter/count-reporter.ts']
];

// Only add blob reporter for regression runs
if (IS_REGRESSION) {
  reporters.push(['blob', { outputDir: `reports/${SUITE}/blob-report` }]);
}

// ✅ Helper function to pick device based on BROWSER
function getDeviceConfig() {
  const deviceMap: Record<string, typeof devices['Desktop Chrome']> = {
    chrome: devices['Desktop Chrome'],
    firefox: devices['Desktop Firefox'],
    webkit: devices['Desktop Safari'],
    chromium: devices['Desktop Chrome'],
  };

  const device = deviceMap[BROWSER];
  if (!device) {
    throw new Error(`Device config not found for browser: ${BROWSER}`);
  }

  // Use branded Chrome channel for 'chrome' option (Google Chrome from Dockerfile)
  if (BROWSER === 'chrome') {
    return { ...device, channel: 'chrome' };
  }

  // For 'chromium' option, use default Playwright Chromium (no channel)
  return { ...device };
}

export default defineConfig({
  testDir: './tests/e2e/saucedemo',
  /* Run tests in files in parallel */
  fullyParallel: false,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 1 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 2 : 6,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: reporters,
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    // baseURL: 'http://127.0.0.1:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on',
    video: 'on', //Record video for each test. Default is off, if you want to record video for each test, set it to 'on' or 'retain-on-failure'
    screenshot: 'on', // Take a screenshot on failure. Default is off, if you want to take a screenshot on failure, set it to 'on' or 'only-on-failure'
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: `cart - ${BROWSER}`,
      testDir: './tests/e2e/saucedemo/cart',
      use: getDeviceConfig(),
    },
    {
      name: `login - ${BROWSER}`,
      testDir: './tests/e2e/saucedemo/login',
      use: getDeviceConfig(),
    },
    {
      name: `purchase - ${BROWSER}`,
      testDir: './tests/e2e/saucedemo/purchase',
      use: getDeviceConfig(),
    },
    {
      name: `sorting - ${BROWSER}`,
      testDir: './tests/e2e/saucedemo/sorting',
      use: getDeviceConfig(),
    },
  ],

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://127.0.0.1:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});