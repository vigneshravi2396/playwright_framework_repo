import path from 'path';
import { Page, TestInfo, Locator, expect } from '@playwright/test';
import { BaseActions } from '../../utils/BaseActions';

export class BaseActionsDemoPage {
  private page: Page;
  readonly testInfo: TestInfo;
  readonly actions: BaseActions;
  readonly demoBase = 'https://the-internet.herokuapp.com';

  readonly internetHeading: Locator;
  readonly abTestLink: Locator;
  readonly abTestHeading: Locator;
  readonly numberInput: Locator;
  readonly dropdown: Locator;
  readonly firstAvatar: Locator;
  readonly firstCheckbox: Locator;
  readonly addElementButton: Locator;
  readonly deleteButton: Locator;
  readonly contextMenuHotSpot: Locator;
  readonly dragSourceColumnA: Locator;
  readonly dragTargetColumnB: Locator;
  readonly columnsContainer: Locator;
  readonly fileUploadInput: Locator;
  readonly downloadFirstFileLink: Locator;
  readonly windowsClickHereLink: Locator;
  readonly iframeSelector: string;
  readonly iframeParagraphSelector: string;
  readonly patchedMarker: Locator;
  readonly mockedPageHeading: Locator;

  constructor(page: Page, testInfo: TestInfo) {
    this.page = page;
    this.testInfo = testInfo;
    this.actions = new BaseActions(page, testInfo);

    this.internetHeading = page.locator('h1').describe('Internet heading');
    this.abTestLink = page.locator('a[href="/abtest"]').first().describe('A/B Testing link');
    this.abTestHeading = page.locator('h3').describe('AB test heading');
    this.numberInput = page.locator('input[type="number"]').describe('Number input');
    this.dropdown = page.locator('#dropdown').describe('Dropdown');
    this.firstAvatar = page.locator('.figure').first().describe('First avatar');
    this.firstCheckbox = page.locator('input[type="checkbox"]').first().describe('First checkbox');
    this.addElementButton = page.getByRole('button', { name: 'Add Element' }).describe('Add Element button');
    this.deleteButton = page.getByRole('button', { name: 'Delete' }).first().describe('Delete button');
    this.contextMenuHotSpot = page.locator('#hot-spot').describe('Context menu hotspot');
    this.dragSourceColumnA = page.locator('#column-a').describe('Drag source column A');
    this.dragTargetColumnB = page.locator('#column-b').describe('Drag target column B');
    this.columnsContainer = page.locator('#columns').describe('Columns container');
    this.fileUploadInput = page.locator('#file-upload').describe('File upload input');
    this.downloadFirstFileLink = page.locator('.example a').first().describe('First downloadable file');
    this.windowsClickHereLink = page.getByRole('link', { name: 'Click Here' }).describe('Windows click here link');
    this.iframeSelector = 'iframe#mce_0_ifr';
    this.iframeParagraphSelector = 'body#tinymce p';
    this.patchedMarker = page.locator('#patched-marker').describe('Patched marker');
    this.mockedPageHeading = page.locator('h3').describe('Mocked page heading');
  }

  multiSelectDropdown(): Locator {
    return this.page.locator('#multi-select').describe('Multi-select dropdown');
  }

  loadedParagraph(): Locator {
    return this.page.locator('.jscroll-added').last().describe('Loaded paragraph');
  }

  optionsSingleSelect(): Locator {
    return this.page.locator('#single-select').describe('Single select options demo');
  }

  optionsMultiSelect(): Locator {
    return this.page.locator('#multi-select-options').describe('Multi select options demo');
  }

  optionsInput(): Locator {
    return this.page.locator('#option-input').describe('Option input');
  }

  optionsHoverTarget(): Locator {
    return this.page.locator('#hover-target').describe('Hover target option');
  }

  optionsTransient(): Locator {
    return this.page.locator('#transient').describe('Transient element');
  }

  touchAddElementButton(touchPage: Page): Locator {
    return touchPage.getByRole('button', { name: 'Add Element' }).describe('Touch Add Element');
  }

  touchDeleteButton(touchPage: Page): Locator {
    return touchPage.getByRole('button', { name: 'Delete' }).first().describe('Touch Delete Button');
  }

  private async assertLandingPageHeadingAndLink() {
    const headingText = await this.actions.getElementText(this.internetHeading);
    expect(headingText.toLowerCase()).toContain('welcome');
    const href = await this.actions.getElementAttribute(this.abTestLink, 'href');
    expect(href).toBe('/abtest');
  }

  private async openAbTestAndRunMouseBasics() {
    await this.actions.click(this.abTestLink, { waitForNavigation: true });
    await this.actions.waitForElement(this.abTestHeading, { state: 'visible' });
    await this.actions.moveMouse(250, 180, { steps: 8 });
    await this.actions.mouseDown();
    await this.actions.mouseUp();
  }

  private async exerciseNumberInputKeyboardFlow() {
    await this.actions.focus(this.numberInput);
    await this.actions.fill(this.numberInput, '10');
    await this.actions.typeText(this.numberInput, '5', { delay: 30 });
    await this.actions.pressKey('ArrowUp', this.numberInput);
    await this.actions.keyDown('Shift');
    await this.actions.keyUp('Shift');
    await this.actions.pressCombo('ControlOrMeta+A', { locator: this.numberInput });
    await this.actions.paste('42', { locator: this.numberInput, method: 'insertText' });
    await this.actions.blur(this.numberInput);
  }

  private async verifyNumberInputFinalValue() {
    const finalValue = await this.numberInput.inputValue();
    expect(finalValue).toBe('42');
  }

  private async selectSingleDropdownValue() {
    await this.actions.select(this.dropdown, 'Option 1', { byLabel: true });
    await expect(this.dropdown).toHaveValue('1');
  }

  private async selectDynamicMultiDropdownValues() {
    await this.page.setContent(`
      <select id="multi-select" multiple>
        <option value="a">Alpha</option>
        <option value="b">Beta</option>
        <option value="g">Gamma</option>
      </select>
    `);
    const multiSelect = this.multiSelectDropdown();
    await this.actions.select(multiSelect, ['Alpha', 'Gamma'], { byLabel: true, validateSelection: true });
    const selectedValues = await multiSelect.evaluate((el) =>
      Array.from((el as HTMLSelectElement).selectedOptions).map((opt) => opt.value)
    );
    expect(selectedValues).toEqual(['a', 'g']);
  }

  private async verifyFirstAvatarHoverCard() {
    await this.actions.hover(this.firstAvatar);
    await expect(this.page.getByText('name: user1')).toBeVisible();
  }

  private async exerciseScrollActions() {
    await this.actions.scrollTo({ x: 0, y: 900 });
    await this.actions.scrollWheel(0, 500);
    await this.actions.scrollTo({ locator: this.loadedParagraph() });
  }

  private async verifyCheckboxCheckAndUncheck() {
    await this.actions.check(this.firstCheckbox);
    await expect(this.firstCheckbox).toBeChecked();
    await this.actions.uncheck(this.firstCheckbox);
    await expect(this.firstCheckbox).not.toBeChecked();
  }

  private async verifyAddElementAndDeleteButtonVisible() {
    await this.actions.doubleClick(this.addElementButton);
    await this.actions.waitForElement(this.deleteButton, { state: 'visible' });
  }

  private async performContextMenuRightClick() {
    this.page.once('dialog', async (dialog) => dialog.accept());
    await this.actions.rightClick(this.contextMenuHotSpot);
  }

  private async verifyDragAndDropColumns() {
    await this.actions.dragAndDrop(this.dragSourceColumnA, this.dragTargetColumnB);
    await expect(this.columnsContainer).toContainText('A');
    await expect(this.columnsContainer).toContainText('B');
  }

  private async verifyUploadAndClearFileInput(filePath: string) {
    await this.actions.uploadFile(this.fileUploadInput, filePath);
    await this.actions.clearFile(this.fileUploadInput);
    const selectedFiles = await this.fileUploadInput.evaluate((input) => (input as HTMLInputElement).files?.length ?? 0);
    expect(selectedFiles).toBe(0);
  }

  private async verifyDownloadFlow() {
    const downloadResult = await this.actions.handleDownload({
      saveAsPath: path.join(this.testInfo.outputDir, 'base-actions-demo-download.bin'),
      expectedFileName: /.+/,
      triggerAction: async () => {
        await this.downloadFirstFileLink.click();
      }
    });
    expect(downloadResult.suggestedFilename.length).toBeGreaterThan(0);
  }

  private async verifyAlertDialogHandling() {
    const dialogResult = await this.actions.handleDialog({
      expectedType: 'alert',
      expectedMessage: 'I am a JS Alert',
      triggerAction: async () => {
        await this.page.evaluate(() => {
          setTimeout(() => {
            (window as unknown as { jsAlert: () => void }).jsAlert();
          }, 0);
        });
      }
    });
    expect(dialogResult.type).toBe('alert');
  }

  private async verifyNewTabContent() {
    const newTab = await this.actions.switchToNewTab({
      triggerAction: async () => {
        await this.windowsClickHereLink.click();
      }
    });
    await expect(newTab.locator('h3')).toHaveText('New Window');
    await newTab.close();
  }

  private async verifyFrameAccessByAllHelpers() {
    const frameLocator = this.actions.getFrameLocator(this.iframeSelector);
    await expect(frameLocator.locator(this.iframeParagraphSelector)).toBeVisible();
    const frameByName = await this.actions.getFrame({ name: 'mce_0_ifr' });
    const frameParagraph = await frameByName.locator(this.iframeParagraphSelector).textContent();
    expect(frameParagraph).toBeTruthy();
    const readyFrame = await this.actions.switchFrame({ name: 'mce_0_ifr', waitForLoadState: 'domcontentloaded' });
    await expect(readyFrame.locator(this.iframeParagraphSelector)).toContainText('Your content goes here.');
  }

  private async verifyOfflineAndBackOnlineFlow() {
    await this.actions.setOfflineMode(true);
    const offlineNavigationFailed = await this.page
      .goto(`${this.demoBase}/abtest`, { timeout: 5000, waitUntil: 'domcontentloaded' })
      .then(() => false)
      .catch(() => true);
    expect(offlineNavigationFailed).toBeTruthy();
    await this.actions.setOfflineMode(false);
  }

  private async verifyRequestDelayAndNetworkCapture() {
    await this.actions.addRequestDelay('**/status_codes/200', 700, { once: true });
    const delayedStart = Date.now();
    const [capturedRequest, capturedResponse] = await Promise.all([
      this.actions.waitForRequest('/status_codes/200', { method: 'GET' }),
      this.actions.waitForResponse('/status_codes/200', { method: 'GET', status: 200 }),
      this.actions.navigateTo(`${this.demoBase}/status_codes/200`, { waitForLoadState: 'domcontentloaded' })
    ]);
    expect(Date.now() - delayedStart).toBeGreaterThanOrEqual(600);
    expect(capturedRequest.method()).toBe('GET');
    expect(capturedResponse.status()).toBe(200);
  }

  private async verifyRequestPatchMocksAndFailures() {
    await this.actions.mockRequest('**/abtest', { once: true, url: `${this.demoBase}/status_codes/200` });
    const patchedResponseText = await this.page.evaluate(async () => {
      const response = await fetch('/abtest');
      return await response.text();
    });
    expect(patchedResponseText).toContain('This page returned a 200 status code.');

    await this.actions.mockAndModifyResponse('**/abtest', {
      once: true,
      transformText: (body) => `${body}<div id="patched-marker">Modified From Real Backend</div>`
    });
    await this.actions.navigateTo(`${this.demoBase}/abtest`, { waitForLoadState: 'domcontentloaded', timeout: 90000 });
    await expect(this.patchedMarker).toHaveText('Modified From Real Backend');

    await this.actions.mockResponse('**/abtest', {
      once: true,
      status: 200,
      contentType: 'text/html',
      body: '<html><body><h3>Mocked AB Test Page</h3></body></html>'
    });
    await this.actions.navigateTo(`${this.demoBase}/abtest`, { waitForLoadState: 'domcontentloaded', timeout: 90000 });
    await expect(this.mockedPageHeading).toHaveText('Mocked AB Test Page');

    await this.actions.failRequest('**/abtest', { once: true, errorCode: 'failed' });
    const abortedNavigationFailed = await this.page
      .goto(`${this.demoBase}/abtest`, { timeout: 5000, waitUntil: 'domcontentloaded' })
      .then(() => false)
      .catch(() => true);
    expect(abortedNavigationFailed).toBeTruthy();
    await this.actions.clearRequestMocks('**/abtest');
  }

  private async verifyCookieAndStorageFlows() {
    await this.actions.addCookies([{ name: 'qa_cookie', value: 'demo', url: this.demoBase }]);
    const cookies = await this.actions.getCookies(this.demoBase);
    const hasQaCookie = cookies.some((cookie) => {
      const candidate = cookie as { name?: string; value?: string };
      return candidate.name === 'qa_cookie' && candidate.value === 'demo';
    });
    expect(hasQaCookie).toBeTruthy();
    await this.actions.clearCookies();

    await this.actions.setLocalStorageItem('qa_local_key', 'local_value');
    expect(await this.actions.getLocalStorageItem('qa_local_key')).toBe('local_value');
    await this.actions.removeLocalStorageItem('qa_local_key');
    await this.actions.clearLocalStorage();

    await this.actions.setSessionStorageItem('qa_session_key', 'session_value');
    expect(await this.actions.getSessionStorageItem('qa_session_key')).toBe('session_value');
    await this.actions.removeSessionStorageItem('qa_session_key');
    await this.actions.clearSessionStorage();
    await this.actions.saveStorageState(path.join(this.testInfo.outputDir, 'base-actions-storage-state.json'));
  }

  private async setupOptionsCookbookDom() {
    await this.page.setContent(`
      <div style="height:1600px;">
        <input id="option-input" value="seed" />
        <input id="next-input" />
        <select id="single-select">
          <option value="1">One</option>
          <option value="2">Two</option>
          <option value="3">Three</option>
        </select>
        <select id="multi-select-options" multiple>
          <option value="a">Alpha</option>
          <option value="b">Beta</option>
          <option value="c">Gamma</option>
        </select>
        <div id="hover-target" style="width:120px;height:40px;background:#ddd;margin-top:20px;">Hover target</div>
        <div id="transient">Transient element</div>
      </div>
    `);
  }

  private async verifyOptionsSelectScenarios() {
    const singleSelect = this.optionsSingleSelect();
    await this.actions.select(singleSelect, '2', { byValue: true, validateSelection: true });
    await expect(singleSelect).toHaveValue('2');
    await this.actions.select(singleSelect, 0, { byIndex: true, validateSelection: true });
    await expect(singleSelect).toHaveValue('1');

    const multiSelectOptions = this.optionsMultiSelect();
    await this.actions.select(multiSelectOptions, [0, 2], { byIndex: true, validateSelection: true });
    const selectedByIndex = await multiSelectOptions.evaluate((el) =>
      Array.from((el as HTMLSelectElement).selectedOptions).map((opt) => opt.value)
    );
    expect(selectedByIndex).toEqual(['a', 'c']);
  }

  private async verifyOptionsInputHoverAndTransient() {
    const optionInput = this.optionsInput();
    await this.actions.fill(optionInput, 'typed-with-options', { validateInput: false, pressTab: true });
    const activeElementId = await this.page.evaluate(() => (document.activeElement as HTMLElement | null)?.id || '');
    expect(activeElementId).toBe('next-input');
    await this.actions.pressCombo(['ControlOrMeta', 'A'], { locator: optionInput, holdAndRelease: true });

    const hoverTarget = this.optionsHoverTarget();
    await this.actions.hover(hoverTarget, { position: { x: 6, y: 6 } });
    await this.actions.scrollTo({ x: 0, y: 600, behavior: 'smooth' });

    const transient = this.optionsTransient();
    await this.actions.waitForElement(transient, { state: 'visible' });
    await this.page.evaluate(() => {
      setTimeout(() => {
        const el = document.getElementById('transient');
        if (el) {
          el.style.display = 'none';
        }
      }, 100);
      setTimeout(() => {
        const el = document.getElementById('transient');
        if (el) {
          el.remove();
        }
      }, 250);
    });
    await this.actions.waitForElement(transient, { state: 'hidden' });
    await this.actions.waitForElement(transient, { state: 'detached' });
  }

  private async verifyOptionsNetworkMockExamples() {
    await this.actions.mockResponse('**/status_codes/200', {
      once: true,
      method: 'GET',
      status: 418,
      contentType: 'text/plain',
      body: 'teapot'
    });
    const mockedResponse = await this.page.evaluate(async () => {
      const response = await fetch('/status_codes/200');
      return { status: response.status, text: await response.text() };
    });
    expect(mockedResponse.status).toBe(418);
    expect(mockedResponse.text).toContain('teapot');

    await this.actions.abortRequest('**/status_codes/201', { once: true, errorCode: 'failed', method: 'GET' });
    const abortedFetch = await this.page.evaluate(async () => {
      try {
        await fetch('/status_codes/201');
        return false;
      } catch {
        return true;
      }
    });
    expect(abortedFetch).toBeTruthy();
    await this.actions.clearRequestMocks('**/status_codes/200');
    await this.actions.clearRequestMocks('**/status_codes/201');
  }

  private async runTouchTapScenario(touchPage: Page, touchActions: BaseActions) {
    await touchActions.navigateTo(`${this.demoBase}/add_remove_elements/`);
    const addElementButton = this.touchAddElementButton(touchPage);
    await touchActions.tap(addElementButton);
    const deleteButton = this.touchDeleteButton(touchPage);
    const box = await deleteButton.boundingBox();
    if (!box) {
      throw new Error('Delete button bounding box was not available for touchTap.');
    }
    await touchActions.touchTap(box.x + box.width / 2, box.y + box.height / 2);
    await expect(deleteButton).toHaveCount(0);
  }

  async demoNavigationAndPageLoad() {
    await this.actions.navigateTo(`${this.demoBase}/`, { waitForLoadState: 'domcontentloaded' });
    await this.actions.waitForPageLoad({ state: 'domcontentloaded', expectedUrl: /the-internet\.herokuapp\.com/ });
  }

  async demoTextAttributesClickWaitAndMouse() {
    await this.assertLandingPageHeadingAndLink();
    await this.openAbTestAndRunMouseBasics();
  }

  async demoFillTypeFocusBlurAndKeyboard() {
    await this.actions.navigateTo(`${this.demoBase}/inputs`);
    await this.exerciseNumberInputKeyboardFlow();
    await this.verifyNumberInputFinalValue();
  }

  async demoSelectAndHover() {
    await this.actions.navigateTo(`${this.demoBase}/dropdown`);
    await this.selectSingleDropdownValue();
    await this.selectDynamicMultiDropdownValues();
    await this.actions.navigateTo(`${this.demoBase}/hovers`);
    await this.verifyFirstAvatarHoverCard();
  }

  async demoScrollAndCheckbox() {
    await this.actions.navigateTo(`${this.demoBase}/infinite_scroll`);
    await this.exerciseScrollActions();
    await this.actions.navigateTo(`${this.demoBase}/checkboxes`);
    await this.verifyCheckboxCheckAndUncheck();
  }

  async demoDoubleRightAndDragDrop() {
    await this.actions.navigateTo(`${this.demoBase}/add_remove_elements/`);
    await this.verifyAddElementAndDeleteButtonVisible();
    await this.actions.navigateTo(`${this.demoBase}/context_menu`);
    await this.performContextMenuRightClick();
    await this.actions.navigateTo(`${this.demoBase}/drag_and_drop`);
    await this.verifyDragAndDropColumns();
  }

  async demoUploadAndClearFile() {
    await this.actions.navigateTo(`${this.demoBase}/upload`);
    const filePath = path.join(process.cwd(), 'README.md');
    await this.verifyUploadAndClearFileInput(filePath);
  }

  async demoDownloadAndDialog() {
    await this.actions.navigateTo(`${this.demoBase}/download`);
    await this.verifyDownloadFlow();
    await this.actions.navigateTo(`${this.demoBase}/javascript_alerts`);
    await this.verifyAlertDialogHandling();
  }

  async demoNewTabPermissionsAndGeolocation() {
    await this.actions.grantPermissions(['geolocation'], { origin: this.demoBase, clearExisting: true });
    await this.actions.setGeolocation(40.7128, -74.0060, { accuracy: 50 });

    await this.actions.navigateTo(`${this.demoBase}/windows`);
    await this.verifyNewTabContent();
  }

  async demoBrowserLevelActions() {
    await this.actions.navigateTo(`${this.demoBase}/`);
    await this.actions.click(this.abTestLink, { waitForNavigation: true });
    await this.actions.waitForURL(/\/abtest/, { waitForLoadState: 'domcontentloaded' });
    await this.actions.goBack({ expectedUrl: /the-internet\.herokuapp\.com\/?$/ });
    await this.actions.goForward({ expectedUrl: /\/abtest/ });
    await this.actions.refresh({ expectedUrl: /\/abtest/ });
    await this.actions.setViewportSize(1280, 720);
    await this.actions.setZoomLevel(90);
    await this.actions.setZoomLevel(100);
    await this.actions.printPage({
      mode: 'pdf',
      pdfPath: path.join(this.testInfo.outputDir, 'base-actions-demo-print.pdf'),
      format: 'A4'
    });
  }

  async demoFrameMethods() {
    await this.actions.navigateTo(`${this.demoBase}/iframe`);
    await this.verifyFrameAccessByAllHelpers();
  }

  async demoNetworkAndSessionControls() {
    await this.actions.navigateTo(`${this.demoBase}/`);
    await this.verifyOfflineAndBackOnlineFlow();
    await this.verifyRequestDelayAndNetworkCapture();
    await this.verifyRequestPatchMocksAndFailures();
    await this.actions.navigateTo(`${this.demoBase}/`);
    await this.verifyCookieAndStorageFlows();
  }

  async demoOptionsCookbook() {
    await this.setupOptionsCookbookDom();
    await this.verifyOptionsSelectScenarios();
    await this.verifyOptionsInputHoverAndTransient();
    await this.actions.navigateTo(`${this.demoBase}/`);
    await this.verifyOptionsNetworkMockExamples();
  }

  async demoTouchMethods() {
    const browser = this.page.context().browser();
    if (!browser) {
      throw new Error('Browser instance is not available for touch context setup.');
    }

    const touchContext = await browser.newContext({
      hasTouch: true,
      viewport: { width: 390, height: 844 }
    });
    const touchPage = await touchContext.newPage();
    const touchActions = new BaseActions(touchPage, this.testInfo);

    try {
      await this.runTouchTapScenario(touchPage, touchActions);
    } finally {
      await touchContext.close();
    }
  }

  async cleanupPermissions() {
    await this.actions.clearPermissions();
  }
}
