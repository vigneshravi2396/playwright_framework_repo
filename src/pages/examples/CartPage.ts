import { Page, TestInfo, Locator } from '@playwright/test';
import { BaseActions } from '../../utils/BaseActions';
import { BaseAssertions } from '../../utils/BaseAssertions';

export class CartPage {
  readonly page: Page;
  readonly actions: BaseActions;
  readonly assertions: BaseAssertions;
  readonly testInfo: TestInfo;

  readonly contentsWrapper: Locator;
  readonly cartContentsContainer: Locator;
  readonly checkoutLink: Locator;
  readonly continueShoppingLink: Locator;

  constructor(page: Page, testInfo: TestInfo) {
    this.page = page;
    this.testInfo = testInfo;
    this.actions = new BaseActions(page,testInfo);
    this.assertions = new BaseAssertions(page,testInfo);

    this.contentsWrapper = page.locator('#contents_wrapper').describe('Cart Contents Wrapper');
    this.cartContentsContainer = page.locator('#cart_contents_container').describe('Cart Contents Container');
    this.checkoutLink = page.getByRole('link', { name: 'CHECKOUT' }).describe('Checkout Link');
    this.continueShoppingLink = page.locator('[data-test="continue-shopping"]').describe('Continue Shopping Button');
  }

  productPriceLabel(productName: string): Locator {
    return this.page.locator(`//div[@class="inventory_item_name" and text()='${productName}']/ancestor::div[@class="cart_item"]//div[@class='inventory_item_price']`).describe(`Cart Item Price Label for ${productName}`);
  }

  async assertCartLabel() {
    await this.assertions.assertElementContainsText(this.contentsWrapper, 'Your Cart');
  }

  async assertCartItemPrice(productName: string, price: string) {
    const productPrice = price.split('$')[1];
    await this.assertions.assertElementContainsText(this.productPriceLabel(productName), productPrice);
  }

  async proceedToCheckout() {
    await this.actions.click(this.checkoutLink);
  }

  async assertContinueShoppingVisible() {
    await this.assertions.assertElementVisible(this.continueShoppingLink);
  }

  cartItemName(productName: string): Locator {
    return this.page.locator('.inventory_item_name', { hasText: productName }).describe(`Cart Item: ${productName}`);
  }

  async assertProductInCart(productName: string) {
    await this.assertions.assertElementVisible(this.cartItemName(productName));
  }

  async assertCartItemCount(count: number) {
    await this.assertions.assertElementCount(this.page.locator('.cart_item'), count);
  }

  async continueShopping() {
    await this.actions.click(this.continueShoppingLink);
  }
} 