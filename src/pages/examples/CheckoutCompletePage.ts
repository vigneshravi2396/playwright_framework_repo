import { Page, TestInfo, Locator } from '@playwright/test';
import { ValidationMessagesConstants } from '../../data/examples/validation_messages_constants';
import { BaseActions } from '../../utils/BaseActions';
import { BaseAssertions } from '../../utils/BaseAssertions';

export class CheckoutCompletePage {
  readonly page: Page;
  readonly actions: BaseActions;
  readonly assertions: BaseAssertions;
  readonly testInfo: TestInfo;

  readonly orderSuccessHeading: Locator;
  readonly checkoutCompleteContainer: Locator;
  readonly finishButton: Locator;

  constructor(page: Page, testInfo: TestInfo) {
    this.page = page;
    this.testInfo = testInfo;
    this.actions = new BaseActions(page,testInfo);
    this.assertions = new BaseAssertions(page,testInfo);

    this.orderSuccessHeading = page.getByRole('heading').describe('Order Success Heading');
    this.checkoutCompleteContainer = page.locator('#checkout_complete_container').describe('Checkout Complete Container');
    this.finishButton = page.getByText('Finish').describe('Finish Button');
  }

  async assertOrderSuccess() {
    await this.assertions.assertElementContainsText(this.orderSuccessHeading, ValidationMessagesConstants.success.ORDER_SUCCESS_MESSAGE);
    await this.assertions.assertElementContainsText(this.checkoutCompleteContainer, ValidationMessagesConstants.success.ORDER_DISPATCHED_MESSAGE);
    await this.assertions.assertElementVisible(this.finishButton);
  }
} 