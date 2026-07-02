// tests/fixtures.ts
import { test as base } from './baseFixture';
import { TestInfo, expect } from '@playwright/test';
import { LoginPage } from '../../pages/examples/LoginPage';
import { ProductsPage } from '../../pages/examples/ProductsPage';
import { CartPage } from '../../pages/examples/CartPage';
import { CheckoutInfoPage } from '../../pages/examples/CheckoutInfoPage';
import { CheckoutOverviewPage } from '../../pages/examples/CheckoutOverviewPage';
import { CheckoutCompletePage } from '../../pages/examples/CheckoutCompletePage';
import { BaseActionsDemoPage } from '../../pages/examples/BaseActionsDemoPage';
import { BaseAssertionsDemoPage } from '../../pages/examples/BaseAssertionsDemoPage';
// import fs from 'fs';
// import path from 'path';

type MyFixtures = {
  loginPage: LoginPage;
  productsPage: ProductsPage;
  cartPage: CartPage;
  checkoutInfoPage: CheckoutInfoPage;
  checkoutOverviewPage: CheckoutOverviewPage;
  checkoutCompletePage: CheckoutCompletePage;
  baseActionsDemoPage: BaseActionsDemoPage;
  baseAssertionsDemoPage: BaseAssertionsDemoPage;
};

export const test = base.extend<MyFixtures>({
  loginPage: async ({ page }, use, testInfo: TestInfo) => {
    await use(new LoginPage(page, testInfo));
  },
  productsPage: async ({ page }, use, testInfo: TestInfo) => {
    await use(new ProductsPage(page, testInfo));
  },
  cartPage: async ({ page }, use, testInfo: TestInfo) => {
    await use(new CartPage(page, testInfo));
  },
  checkoutInfoPage: async ({ page }, use, testInfo: TestInfo) => {
    await use(new CheckoutInfoPage(page, testInfo));
  },
  checkoutOverviewPage: async ({ page }, use, testInfo: TestInfo) => {
    await use(new CheckoutOverviewPage(page, testInfo));
  },
  checkoutCompletePage: async ({ page }, use, testInfo: TestInfo) => {
    await use(new CheckoutCompletePage(page, testInfo));
  },
  baseActionsDemoPage: async ({ page }, use, testInfo: TestInfo) => {
    await use(new BaseActionsDemoPage(page, testInfo));
  },
  baseAssertionsDemoPage: async ({ page }, use, testInfo: TestInfo) => {
    await use(new BaseAssertionsDemoPage(page, testInfo));
  },
});

export { expect } from '@playwright/test';
