import { Page, TestInfo, Locator } from '@playwright/test';
import { BaseActions } from '../../utils/BaseActions';
import { BaseAssertions } from '../../utils/BaseAssertions';

export class CheckoutOverviewPage {
  private page: Page;
  readonly actions: BaseActions;
  readonly assertions: BaseAssertions;
  readonly testInfo: TestInfo;

  readonly contentsWrapper: Locator;
  readonly checkoutSummaryContainer: Locator;
  readonly shippingInfoLabel: Locator;
  readonly paymentInfoLabel: Locator;
  readonly cancelLink: Locator;
  readonly finishLink: Locator;

  constructor(page: Page, testInfo: TestInfo) {
    this.page = page;
    this.testInfo = testInfo;
    this.actions = new BaseActions(page,testInfo);
    this.assertions = new BaseAssertions(page,testInfo);

    this.contentsWrapper = page.locator('#contents_wrapper').describe('Checkout Overview Contents Wrapper');
    this.checkoutSummaryContainer = page.locator('#checkout_summary_container').describe('Checkout Summary Container');
    this.shippingInfoLabel = page.getByText('Shipping Information:').describe('Shipping Info Label');
    this.paymentInfoLabel = page.getByText('Payment Information:').describe('Payment Info Label');
    this.cancelLink = page.getByRole('link', { name: 'CANCEL' }).describe('Cancel Link');
    this.finishLink = page.getByRole('link', { name: 'FINISH' }).describe('Finish Link');
  }

  productLabel(productLabel: string): Locator {
    return this.page.getByRole('link', { name: productLabel }).describe(`Product Label: ${productLabel}`);
  }

  async assertOverviewLabel() {
    await this.assertions.assertElementContainsText(this.contentsWrapper, 'Checkout: Overview');
  }

  async assertProductVisible(productLabel: string) {
    await this.assertions.assertElementVisible(this.productLabel(productLabel));
  }

  async assertSummaryInfo() {
    await this.assertions.assertElementContainsText(this.checkoutSummaryContainer, 'Payment Information:');
    await this.assertions.assertElementVisible(this.shippingInfoLabel);
    await this.assertions.assertElementVisible(this.paymentInfoLabel);
  }

  async assertCancelAndFinishVisible() {
    await this.assertions.assertElementVisible(this.cancelLink);
    await this.assertions.assertElementVisible(this.finishLink);
  }

  async finishCheckout() {
    await this.actions.click(this.finishLink);
  }
} 