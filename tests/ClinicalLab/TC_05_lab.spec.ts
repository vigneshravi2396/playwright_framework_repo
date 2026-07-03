import { test, expect } from '@playwright/test';

test('get started link', async ({ page }) => {

  await test.step('Open Playwright website', async () => {
    await page.goto('https://playwright.dev/');
  });

  await test.step('Click Get Started', async () => {
    await page.getByRole('link', { name: 'Get started' }).click();
  });

  await test.step('Verify Installation heading', async () => {
    await expect(
      page.getByRole('heading', { name: 'Installation' })
    ).toBeVisible();
  });

});
