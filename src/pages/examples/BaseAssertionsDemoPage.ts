import { expect, Locator, Page, TestInfo } from '@playwright/test';
import { BaseAssertions } from '../../utils/BaseAssertions';

export class BaseAssertionsDemoPage {
  private page: Page;
  readonly testInfo: TestInfo;
  readonly assertions: BaseAssertions;

  readonly title: Locator;
  readonly subtitle: Locator;
  readonly nameInput: Locator;
  readonly emailInput: Locator;
  readonly checkOne: Locator;
  readonly checkTwo: Locator;
  readonly enabledBtn: Locator;
  readonly disabledBtn: Locator;
  readonly hiddenEl: Locator;
  readonly cssBox: Locator;
  readonly emptyDiv: Locator;
  readonly tempNode: Locator;
  readonly resultItems: Locator;
  readonly multiSelect: Locator;
  readonly inViewportTarget: Locator;

  constructor(page: Page, testInfo: TestInfo) {
    this.page = page;
    this.testInfo = testInfo;
    this.assertions = new BaseAssertions(page, testInfo);

    this.title = page.locator('#title').describe('Page title');
    this.subtitle = page.locator('#subtitle').describe('Page subtitle');
    this.nameInput = page.locator('#nameInput').describe('Name input');
    this.emailInput = page.locator('#emailInput').describe('Email input');
    this.checkOne = page.locator('#checkOne').describe('Checked checkbox');
    this.checkTwo = page.locator('#checkTwo').describe('Unchecked checkbox');
    this.enabledBtn = page.locator('#enabledBtn').describe('Enabled save button');
    this.disabledBtn = page.locator('#disabledBtn').describe('Disabled button');
    this.hiddenEl = page.locator('#hiddenEl').describe('Hidden element');
    this.cssBox = page.locator('#cssBox').describe('CSS box');
    this.emptyDiv = page.locator('#emptyDiv').describe('Empty div');
    this.tempNode = page.locator('#tempNode').describe('Temporary node');
    this.resultItems = page.locator('.result-item').describe('Result items');
    this.multiSelect = page.locator('#multiSelect').describe('Multi select');
    this.inViewportTarget = page.locator('#inViewportTarget').describe('Viewport target');
  }

  async demoPageLevelAssertions() {
    await this.page.goto('https://the-internet.herokuapp.com/?demo=base-assertions');
    await this.assertions.assertURL(/the-internet\.herokuapp\.com/);
    await this.assertions.assertPathname('/');
    await this.assertions.assertQueryParam('demo', 'base-assertions');
    await this.assertions.assertPageTitle(/The Internet/i);
  }

  async setupDeterministicDom() {
    await this.page.setContent(`
      <main>
        <h1 id="title" class="hero banner" aria-label="Main heading" aria-description="Landing section heading">Welcome QA</h1>
        <p id="subtitle" data-test="sub">Automation demo text content</p>
        <input id="nameInput" aria-label="Name input" value="John Doe" />
        <input id="emailInput" aria-label="Email input" aria-invalid="true" aria-errormessage="emailError" />
        <div id="emailError">Invalid email format</div>
        <input id="ageInput" />
        <input id="checkOne" type="checkbox" checked />
        <input id="checkTwo" type="checkbox" />
        <button id="enabledBtn" class="btn primary">Save</button>
        <button id="disabledBtn" class="btn muted" disabled>Disabled</button>
        <div id="hiddenEl" style="display:none">Hidden content</div>
        <div id="cssBox" style="color: rgb(255, 0, 0);">Color box</div>
        <div id="emptyDiv"></div>
        <div id="tempNode">Remove me</div>
        <ul id="results">
          <li class="result-item">One</li>
          <li class="result-item">Two</li>
          <li class="result-item">Three</li>
        </ul>
        <select id="multiSelect" aria-label="Multi select" multiple>
          <option value="alpha" selected>Alpha</option>
          <option value="beta">Beta</option>
          <option value="gamma" selected>Gamma</option>
        </select>
        <div style="height: 1600px;"></div>
        <div id="inViewportTarget">Viewport target</div>
      </main>
    `);
  }

  async demoCoreLocatorAssertions() {
    await this.assertions.assertElementVisible(this.title);
    await this.assertions.assertElementNotVisible(this.hiddenEl);
    await this.assertions.assertElementHidden(this.hiddenEl);
    await this.assertions.assertElementEnabled(this.enabledBtn);
    await this.assertions.assertElementDisabled(this.disabledBtn);
    await this.assertions.assertElementText(this.title, 'Welcome QA');
    await this.assertions.assertElementContainsText(this.subtitle, /Automation demo/i);
    await this.assertions.assertElementValue(this.nameInput, 'John Doe');
    await this.assertions.assertElementAttribute(this.title, 'id', 'title');
    await this.assertions.assertElementCount(this.resultItems, 3);
    await this.assertions.assertElementCountGreaterThan(this.resultItems, 2);
    await this.assertions.assertElementCountGreaterThanOrEqual(this.resultItems, 3);
    await this.assertions.assertElementChecked(this.checkOne);
    await this.assertions.assertElementNotChecked(this.checkTwo);
    await this.assertions.assertElementAttached(this.tempNode);

    await this.page.focus('#nameInput');
    await this.assertions.assertElementFocused(this.nameInput);

    await this.assertions.assertElementHasClass(this.title, 'hero banner');
    await this.assertions.assertElementContainsClass(this.title, 'hero');
    await this.assertions.assertElementNotHasClass(this.title, 'does-not-exist');
    await this.assertions.assertElementId(this.title, /title/);
  }

  async demoExtendedWebFirstAssertions() {
    await this.assertions.assertElementTextNotEqual(this.title, 'Wrong heading');
    await this.assertions.assertElementNotContainsText(this.title, /Error state/i);
    await this.assertions.assertElementValueNotEqual(this.nameInput, 'Jane Doe');
    await this.assertions.assertElementAttributeNotEqual(this.title, 'id', 'not-title');
    await this.assertions.assertElementCSS(this.cssBox, 'color', /rgb\(255,\s*0,\s*0\)/);
    await this.assertions.assertElementCSSNotEqual(this.cssBox, 'color', /rgb\(0,\s*0,\s*255\)/);
    await this.assertions.assertElementEditable(this.nameInput);
    await this.assertions.assertElementEmpty(this.emptyDiv);
    await this.assertions.assertElementRole(this.enabledBtn, 'button');
    await this.assertions.assertElementAccessibleName(this.nameInput, 'Name input');
    await this.assertions.assertElementAccessibleDescription(this.title, 'Landing section heading');
    await this.assertions.assertElementAccessibleErrorMessage(this.emailInput, 'Invalid email format');
    await this.assertions.assertElementJSProperty(this.nameInput, 'value', 'John Doe');
    await this.assertions.assertElementValues(this.multiSelect, ['alpha', 'gamma']);
    await this.assertions.assertElementAriaSnapshot(this.enabledBtn, `
      - button "Save"
    `);

    await this.inViewportTarget.scrollIntoViewIfNeeded();
    await this.assertions.assertElementInViewport(this.inViewportTarget);
  }

  async demoDetachedAndSoftAssertions() {
    await this.page.evaluate(() => {
      document.querySelector('#tempNode')?.remove();
    });
    await this.assertions.assertElementDetached(this.tempNode);

    await this.assertions.assertElementVisible(this.title, { soft: true });

    await this.assertions.assertElementVisible(this.title, { soft: false });
    await this.assertions.assertElementText(this.title, 'Welcome QA', { soft: true });
    await this.assertions.assertElementCount(this.resultItems, 3, { soft: true });
    this.assertions.assertToBe(10, 10, { soft: true });
    this.assertions.assertGreaterThan(5, 1, { soft: true });
  }

  async demoApiAssertion() {
    const response = await this.page.request.get('https://the-internet.herokuapp.com/status_codes/200');
    await this.assertions.assertResponseOK(response);
  }

  async demoGenericAssertions() {
    this.assertions.assertToBe(10, 10);
    this.assertions.assertToEqual({ a: 1 }, { a: 1 });
    this.assertions.assertToStrictEqual({ a: [1, 2] }, { a: [1, 2] });
    this.assertions.assertTruthy('value');
    this.assertions.assertFalsy(0);
    this.assertions.assertNull(null);
    this.assertions.assertUndefined(undefined);
    this.assertions.assertDefined('defined');
    this.assertions.assertNaN(Number.NaN);
    this.assertions.assertContains('playwright framework', 'framework');
    this.assertions.assertContainsEqual([{ id: 1 }, { id: 2 }], { id: 2 });
    this.assertions.assertLength([1, 2, 3], 3);
    this.assertions.assertProperty({ user: { name: 'qa' } }, ['user', 'name'], 'qa');
    this.assertions.assertMatch('hello world', /hello/);
    this.assertions.assertMatchObject({ a: 1, b: 2 }, { a: 1 });
    this.assertions.assertGreaterThan(5, 1);
    this.assertions.assertGreaterThanOrEqual(5, 5);
    this.assertions.assertLessThan(1, 5);
    this.assertions.assertLessThanOrEqual(5, 5);
    this.assertions.assertCloseTo(3.1415, 3.14, 2);
    this.assertions.assertInstanceOf(new Error('x'), Error);
    this.assertions.assertThrows(() => {
      throw new Error('sync boom');
    }, /sync boom/);
    await this.assertions.assertRejects(async () => Promise.reject(new Error('async boom')), /async boom/);
  }

  async demoExpectWrappers() {
    const softExpect = this.assertions.getConfiguredExpect({ soft: true, timeout: 2000 });
    await softExpect(this.title).toBeVisible();

    const state = { ready: false, value: 0 };
    setTimeout(() => {
      state.ready = true;
      state.value = 42;
    }, 250);

    await this.assertions.assertPollToBe(() => state.ready, true, { timeout: 3000 });
    await this.assertions.assertPollToEqual(() => state.value, 42, { timeout: 3000 });

    let attempts = 0;
    await this.assertions.assertToPass(async () => {
      attempts += 1;
      expect(attempts).toBeGreaterThan(1);
    }, {
      timeout: 3000,
      intervals: [100, 200]
    });
  }
}
