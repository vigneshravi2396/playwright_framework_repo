import { Page, TestInfo, Locator } from '@playwright/test';
import { BaseActions } from '../../utils/BaseActions';
import { BaseAssertions } from '../../utils/BaseAssertions';

export class CheckoutInfoPage {
  private page: Page;
  readonly actions: BaseActions;
  readonly assertions: BaseAssertions;
  readonly testInfo: TestInfo;

  readonly checkoutInfoLabel: Locator;
  readonly contentsWrapper: Locator;
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly postalCodeInput: Locator;
  readonly cancelLink: Locator;
  readonly continueButton: Locator;

  constructor(page: Page, testInfo: TestInfo) {
    this.page = page;
    this.testInfo = testInfo;
    this.actions = new BaseActions(page,testInfo);
    this.assertions = new BaseAssertions(page,testInfo);

    this.checkoutInfoLabel = page.getByText('Checkout: Your Information').describe('Checkout Info Label');
    this.contentsWrapper = page.locator('#contents_wrapper').describe('Checkout Info Contents Wrapper');
    this.firstNameInput = page.locator('[data-test="firstName"]').describe('First Name Input');
    this.lastNameInput = page.locator('[data-test="lastName"]').describe('Last Name Input');
    this.postalCodeInput = page.locator('[data-test="postalCode"]').describe('Postal Code Input');
    this.cancelLink = page.getByRole('link', { name: 'CANCEL' }).describe('Cancel Link');
    this.continueButton = page.getByRole('button', { name: 'CONTINUE' }).describe('Continue Button');
  }

  async assertCheckoutInfoLabel() {
    await this.assertions.assertElementVisible(this.checkoutInfoLabel);
    await this.assertions.assertElementContainsText(this.contentsWrapper, 'Checkout: Your Information');
  }

  async fillCheckoutInfo(firstName: string, lastName: string, postalCode: string) {
    await this.actions.fill(this.firstNameInput, firstName);
    await this.actions.fill(this.lastNameInput, lastName);
    await this.actions.fill(this.postalCodeInput, postalCode);
  }

  async assertCancelAndContinueVisible() {
    await this.assertions.assertElementVisible(this.cancelLink);
    await this.assertions.assertElementVisible(this.continueButton);
  }

  async continueCheckout() {
    await this.actions.click(this.continueButton);
  }
} 