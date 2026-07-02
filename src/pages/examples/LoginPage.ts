import { Page, TestInfo, Locator } from '@playwright/test';
import config from '../../../environment/env';
import { BaseActions } from '../../utils/BaseActions';
import { BaseAssertions } from '../../utils/BaseAssertions';

export class LoginPage {
  private page: Page;
  readonly actions: BaseActions;
  readonly assertions: BaseAssertions;
  readonly testInfo: TestInfo;

  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly productsLabel: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page, testInfo: TestInfo) {
    this.page = page;
    this.testInfo = testInfo;
    this.actions = new BaseActions(page,testInfo);
    this.assertions = new BaseAssertions(page,testInfo);

    this.usernameInput = page.locator('[data-test="username"]').describe('Username Input');
    this.passwordInput = page.locator('[data-test="password"]').describe('Password Input');
    this.loginButton = page.locator('[id="login-button"]').describe('Login Button');
    this.productsLabel = page.getByText('Products').describe('Products Label');
    this.errorMessage = page.locator('[data-test="error"]').describe('Login Error Message');
  }

  async goto() {
    await this.page.goto(config.baseUrl);
  }

  async login(username: string, password: string) {
    await this.actions.fill(this.usernameInput, username);
    await this.actions.fill(this.passwordInput, password);
    await this.actions.click(this.loginButton);
  }

  async assertProductsVisible() {
    await this.assertions.assertElementVisible(this.productsLabel);
  }

  async assertLoginPageVisible() {
    await this.assertions.assertElementVisible(this.loginButton);
    await this.assertions.assertElementVisible(this.usernameInput);
    await this.assertions.assertElementVisible(this.passwordInput);
  }

  async assertErrorContainsText(expectedText: string) {
    await this.assertions.assertElementContainsText(this.errorMessage, expectedText);
  }
} 