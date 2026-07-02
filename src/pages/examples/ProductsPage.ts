import { Page, TestInfo, Locator, expect } from '@playwright/test';
import { BaseActions } from '../../utils/BaseActions';
import { BaseAssertions } from '../../utils/BaseAssertions';

export class ProductsPage {
  private page: Page;
  readonly actions: BaseActions;
  readonly assertions: BaseAssertions;
  readonly testInfo: TestInfo;

  readonly cartIcon: Locator;
  readonly contentsWrapper: Locator;
  readonly sortDropdown: Locator;
  readonly inventoryItemNames: Locator;
  readonly cartBadge: Locator;
  readonly menuButton: Locator;
  readonly logoutLink: Locator;
  readonly productsTitle: Locator;

  constructor(page: Page, testInfo: TestInfo) {
    this.page = page;
    this.testInfo = testInfo;
    this.actions = new BaseActions(page,testInfo);
    this.assertions = new BaseAssertions(page,testInfo);

    this.cartIcon = page.locator('a.shopping_cart_link').describe('Cart Icon');
    this.contentsWrapper = page.locator('#contents_wrapper').describe('Products Contents Wrapper');
    this.sortDropdown = page.locator('[data-test="product-sort-container"]').describe('Product Sort Dropdown');
    this.inventoryItemNames = page.locator('[data-test="inventory-item-name"]').describe('Inventory Item Names');
    this.cartBadge = page.locator('.shopping_cart_badge').describe('Cart Badge');
    this.menuButton = page.locator('#react-burger-menu-btn').describe('Burger Menu Button');
    this.logoutLink = page.locator('#logout_sidebar_link').describe('Logout Link');
    this.productsTitle = page.locator('.title').describe('Products Page Title');
  }

  productLabel(productName: string): Locator {
    return this.page.locator(`//div[@data-test="inventory-item-name" and text()='${productName}']`).describe(`Product Label: ${productName}`);
  }

  addToCartButton(productName: string): Locator {
    return this.page.locator(`//div[@data-test="inventory-item-name" and text()='${productName}']/ancestor::div[@class="inventory_item"]//button`).describe(`Add to Cart Button for ${productName}`);
  }

  productPriceLabel(productName: string): Locator {
    return this.page.locator(`//div[@data-test="inventory-item-name" and text()='${productName}']/ancestor::div[@class="inventory_item"]//div[@class='inventory_item_price']`).describe(`Product Price Label for ${productName}`);
  }

  async addProductToCart(productLabel: string) {
    await this.actions.click(this.addToCartButton(productLabel));
  }

  async goToCart() {
    await this.actions.click(this.cartIcon);
  }

  async assertProductVisible(productLabel: string) {
    await this.assertions.assertElementVisible(this.productLabel(productLabel));
  }

  async assertPriceVisible(productLabel: string, price: string) {
    await this.assertions.assertElementContainsText(this.productPriceLabel(productLabel), price);
  }

  addToCartBySlug(productSlug: string): Locator {
    return this.page.locator(`button[data-test="add-to-cart-${productSlug}"]`).describe(`Add to Cart: ${productSlug}`);
  }

  removeFromCartBySlug(productSlug: string): Locator {
    return this.page.locator(`button[data-test="remove-${productSlug}"]`).describe(`Remove from Cart: ${productSlug}`);
  }

  async addProductBySlug(productSlug: string) {
    await this.actions.click(this.addToCartBySlug(productSlug));
  }

  async removeProductBySlug(productSlug: string) {
    await this.actions.click(this.removeFromCartBySlug(productSlug));
  }

  async sortProductsBy(option: 'az' | 'za' | 'lohi' | 'hilo') {
    await this.actions.select(this.sortDropdown, option, { byValue: true });
  }

  async getDisplayedProductNames(): Promise<string[]> {
    return this.inventoryItemNames.allTextContents();
  }

  async assertProductNamesOrder(expectedNames: string[]) {
    await expect(this.inventoryItemNames).toHaveText(expectedNames);
  }

  async assertCartBadgeCount(count: number) {
    if (count === 0) {
      await this.assertions.assertElementCount(this.cartBadge, 0);
      return;
    }
    await this.assertions.assertElementContainsText(this.cartBadge, String(count));
  }

  async logout() {
    await this.actions.click(this.menuButton);
    await this.actions.click(this.logoutLink);
  }

  async assertProductsPageVisible() {
    await this.assertions.assertElementVisible(this.productsTitle);
    await this.assertions.assertElementContainsText(this.productsTitle, 'Products');
  }
} 