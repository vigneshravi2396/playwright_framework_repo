/**
 * Advanced utility that provides self-healing capabilities for locator failures using both programmatic heuristics and AI-powered suggestions
 * @description This class implements a two-tier self-healing approach:
 * 1. Programmatic heuristic healing - Uses pattern matching and element analysis to find alternative locators
 * 2. AI-powered healing - Uses OpenAI GPT-4 to analyze page context and suggest new locators
 * 
 * The self-healing process is automatically triggered when locator-related errors occur in BaseActions and BaseAssertions.
 * @example
 * ```typescript
 * // Self-healing is automatically triggered in BaseActions/BaseAssertions
 * // No direct usage needed - it's integrated into the action methods
 * 
 * // Example of how it works internally:
 * try {
 *   await element.click();
 * } catch (error) {
 *   if (SelfHealingHelper.isLocatorError(error)) {
 *     const healedLocator = await SelfHealingHelper.trySelfHealing(page, element, 'Login Button', clickAction);
 *   }
 * }
 * ```
 */
// utils/SelfHealingHelper.ts

import { Page, Locator } from '@playwright/test';
import config from 'environment/env';
import OpenAI from 'openai';

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!config.openAIKey) {
    throw new Error('OpenAI API key not set. Please set OPENAI_API_KEY environment variable.');
  }
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: config.openAIKey });
  }
  return openaiClient;
}

export class SelfHealingHelper {
  // Allowed locator methods for safe eval
  private static allowedPrefixes = [
    'page.locator',
    'page.getByRole',
    'page.getByText',
    'page.getByLabel',
    'page.getByPlaceholder',
    'page.getByTestId',
    'page.getByAltText',
  ];

  /**
   * Detects if an error is related to element location/interaction
   * @param error - Error object to analyze
   * @returns True if error is locator-related, false otherwise
   * @description Checks error message for common locator failure patterns like 'No element', 'Timeout', 'not found', etc.
   * @example
   * ```typescript
   * try {
   *   await element.click();
   * } catch (error) {
   *   if (SelfHealingHelper.isLocatorError(error)) {
   *     // Trigger self-healing process
   *   }
   * }
   * ```
   */
  static isLocatorError(error: Error): boolean {
    const msg = error.message || '';
    return (
      msg.includes('No element found') ||
      msg.includes('strict mode violation') ||
      msg.includes('locator resolved to') ||
      msg.includes('Target closed') ||
      msg.includes('Frame was detached')
    );
  }

  /**
   * Extracts comprehensive metadata for all interactable elements on the page
   * @param page - Playwright page object to analyze
   * @returns Promise resolving to array of element metadata with attributes and XPath
   * @description Analyzes all buttons, links, inputs, selects, textareas, and elements with roles.
   * Returns detailed metadata including tag, id, class, name, type, role, aria-label, text content, and XPath.
   * @example
   * ```typescript
   * const elements = await SelfHealingHelper.extractAllLocators(page);
   * console.log(elements.length); // Number of interactable elements found
   * console.log(elements[0]); // First element's metadata
   * ```
   */
  static async extractAllLocators(page: Page): Promise<Array<Record<string, any>>> {
    const elements = await page.$$eval(
      'button, a, input, select, textarea, [role]',
      (els) =>
        els.map((el) => {
          const dataAttrs: Record<string, string> = {};
          for (const attr of Array.from(el.attributes)) {
            if (attr.name.startsWith('data-')) {
              dataAttrs[attr.name] = attr.value;
            }
          }
          const parent = el.parentElement;
          let siblingIndex = 0;
          if (parent) {
            const siblings = Array.from(parent.children).filter(c => c.tagName === el.tagName);
            siblingIndex = siblings.indexOf(el);
          }
          return {
            tag: el.tagName.toLowerCase(),
            id: el.id || '',
            name: el.getAttribute('name') || '',
            class: el.className || '',
            type: el.getAttribute('type') || '',
            role: el.getAttribute('role') || '',
            'aria-label': el.getAttribute('aria-label') || '',
            dataAttrs,
            text: (el.textContent || '').trim(),
            siblingIndex,
            xpath: '',
          };
        })
    );

    const elementHandles = await page.$$('button, a, input, select, textarea, [role]');
    for (let i = 0; i < elementHandles.length; i++) {
      const xpath = await page.evaluate((el) => {
        function getXPath(el: Element): string {
          if (!el) return '';
          if (el.id) return `//*[@id="${el.id}"]`;
          const parts: string[] = [];
          while (el && el.nodeType === 1) {
            let nb = 0;
            let sib = el.previousSibling;
            while (sib) {
              if (sib.nodeType === 1 && sib.nodeName === el.nodeName) {
                nb++;
              }
              sib = sib.previousSibling;
            }
            const idx = nb + 1;
            parts.unshift(`${el.nodeName.toLowerCase()}[${idx}]`);
            el = el.parentElement!;
          }
          return '/' + parts.join('/');
        }
        return getXPath(el);
      }, elementHandles[i]);

      elements[i].xpath = xpath;
    }

    return elements;
  }

  /**
   * Converts extracted element metadata to a Markdown table format for AI analysis
   * @param locators - Array of element metadata from extractAllLocators
   * @returns Markdown table string with element information
   * @description Formats element metadata into a structured table for AI prompt generation.
   * Used internally by the AI-powered healing system to provide context about available elements.
   * @example
   * ```typescript
   * const elements = await SelfHealingHelper.extractAllLocators(page);
   * const markdownTable = SelfHealingHelper.locatorsToMarkdownTable(elements);
   * console.log(markdownTable); // Formatted table for AI analysis
   * ```
   */
  static locatorsToMarkdownTable(locators: Array<Record<string, any>>): string {
    const headers = [
      'Tag', 'Id', 'Class', 'Name', 'Type', 'Role', 'ARIA Label', 'SiblingIndex', 'XPath', 'Text', 'Data-Attrs',
    ];
    const rows = locators.map(el => {
      const dataAttrsStr = JSON.stringify(el.dataAttrs);
      const cols = [
        el.tag, el.id, el.class, el.name, el.type, el.role, el['aria-label'], el.siblingIndex.toString(), el.xpath, el.text, dataAttrsStr,
      ];
      return '| ' + cols.map(c => (c ?? '').toString().replace(/\|/g, '\\|')).join(' | ') + ' |';
    });
    const headerRow = '| ' + headers.join(' | ') + ' |';
    const sepRow = '| ' + headers.map(() => '---').join(' | ') + ' |';

    return [headerRow, sepRow, ...rows].join('\n');
  }

  /**
   * Programmatic heuristic self-healing:
   * Attempts to find a suitable locator locally without calling LLM.
   * Matches based on id, name, data-* attrs, role+aria-label, and visible text heuristics.
   * Returns Locator if found, else null.
   */
private static async programmaticSelfHealing(
  page: Page,
  locator: Locator,
  description: string | undefined
): Promise<Locator | null> {
  const locators = await this.extractAllLocators(page);

  // Normalize and tokenize the description or locator string
  const target = (description || locator.toString()).toLowerCase().replace(/[^a-z0-9 ]/gi, ' ');
  const tokens = target.split(/\s+/).filter(Boolean);

  // Helpers for matching full tokens or phrases exactly
  const fullWordIn = (value?: string) => {
    if (!value) return false;
    const val = value.toLowerCase();
    return tokens.some(token => val === token || val.split(/[^a-z0-9]+/).includes(token));
  };

  const loosePhraseIn = (value?: string) => {
    if (!value) return false;
    const val = value.toLowerCase();
    return tokens.every(token => val.includes(token));
  };

  // Infer expected element type from description keywords
  function expectedElementType(desc: string) {
    desc = desc.toLowerCase();
    if (/radio|terms|t and c/.test(desc)) return 'radio';
    if (/check(box)?|accept|agree/.test(desc)) return 'checkbox';
    if (/button|submit|proceed|ok|cancel|close/.test(desc)) return 'button';
    if (/link|anchor/.test(desc)) return 'link';
    if (/select|dropdown|combo/.test(desc)) return 'select';
    if (/input|text(box)?|email|password|name|search|phone|textarea|field/.test(desc)) return 'textbox';
    return 'any'; // fallback to any type if uncertain
  }

  const expectedType = expectedElementType(description || '');

  // Check if candidate element matches expected type/tag/role
  function matchType(el: any): boolean {
    switch (expectedType) {
      case 'radio':
        return (el.tag === 'input' && el.type === 'radio') || el.role === 'radio';
      case 'checkbox':
        return (el.tag === 'input' && el.type === 'checkbox') || el.role === 'checkbox';
      case 'button':
        return el.tag === 'button' || el.role === 'button' || (el.tag === 'input' && ['button', 'submit', 'reset'].includes(el.type));
      case 'link':
        return el.tag === 'a' || el.role === 'link';
      case 'select':
        return el.tag === 'select' || el.role === 'listbox';
      case 'textbox':
        return (
          (el.tag === 'input' && ['text', 'email', 'password', 'search', 'tel', 'url'].includes(el.type)) ||
          el.tag === 'textarea' || el.role === 'textbox'
        );
      case 'any':
        return true;
      default:
        return false;
    }
  }

  // 1. Strict match by ID
  const byId = locators.find(el => el.id && (fullWordIn(el.id) || loosePhraseIn(el.id)) && matchType(el));
  if (byId && byId.id) {
    console.warn(`🔎 Programmatically Found by ID (safe): #${byId.id}`);
    return page.locator(`#${byId.id}`);
  }

  // 2. Strict match by Name
  const byName = locators.find(el => el.name && (fullWordIn(el.name) || loosePhraseIn(el.name)) && matchType(el));
  if (byName && byName.name) {
    console.warn(`🔎 Programmatically Found by name (safe): ${byName.tag}[name="${byName.name}"]`);
    return page.locator(`${byName.tag}[name="${byName.name}"]`);
  }

  // 3. Strict match by data-* attributes
  const dataKeys = ['data-testid', 'data-test-id', 'data-cy', 'data-qa'];
  for (const key of dataKeys) {
    const byData = locators.find(el => el.dataAttrs[key] && (fullWordIn(el.dataAttrs[key]) || loosePhraseIn(el.dataAttrs[key])) && matchType(el));
    if (byData && byData.dataAttrs[key]) {
      console.warn(`🔎 Programmatically Found by ${key} (safe): [${key}="${byData.dataAttrs[key]}"]`);
      return page.locator(`[${key}="${byData.dataAttrs[key]}"]`);
    }
  }

  // 4. Strict match by role + aria-label
  const byRoleAria = locators.find(el =>
    el.role &&
    el['aria-label'] &&
    (expectedType === 'any' || el.role.toLowerCase() === expectedType) &&
    (fullWordIn(el['aria-label']) || loosePhraseIn(el['aria-label'])) &&
    matchType(el)
  );
  if (byRoleAria && byRoleAria.role && byRoleAria['aria-label']) {
    console.warn(`🔎 Programmatically Found by role+aria-label (safe): getByRole(${byRoleAria.role},{name:"${byRoleAria['aria-label']}"})`);
    return page.getByRole(byRoleAria.role, { name: byRoleAria['aria-label'] });
  }

  // 5. Strict match by visible text
  const byText = locators.find(el =>
    el.text &&
    el.text.length > 1 &&
    (fullWordIn(el.text) || loosePhraseIn(el.text)) &&
    matchType(el)
  );
  if (byText && byText.text) {
    console.warn(`🔎 Programmatically Found by visible text (safe): getByText("${byText.text}")`);
    return page.getByText(byText.text);
  }

  // 6. Strict match by XPath as last resort
  const byXpath = locators.find(el =>
    el.xpath &&
    el.xpath.length > 0 &&
    (fullWordIn(el.xpath) || loosePhraseIn(el.xpath)) &&
    matchType(el)
  );
  if (byXpath && byXpath.xpath) {
    console.warn(`🔎 Programmatically Found by xpath (safe): ${byXpath.xpath}`);
    return page.locator(byXpath.xpath);
  }

  // No confident match found, trigger LLM fallback
  return null;
}


  /**
   * Main self-healing method that attempts to recover from locator failures
   * @param page - Playwright page object
   * @param locator - Failed locator that needs healing
   * @param description - Element description for context
   * @param actionFn - Function to retry with healed locator
   * @param actionArgs - Arguments to pass to the action function
   * @returns Promise resolving to the result of successful action execution
   * @throws Error if all healing attempts fail
   * @description Implements a two-tier healing approach:
   * 1. Programmatic heuristic healing using pattern matching
   * 2. AI-powered healing using OpenAI GPT-4 if heuristics fail
   * @example
   * ```typescript
   * // This is called automatically by BaseActions/BaseAssertions
   * const result = await SelfHealingHelper.trySelfHealing(
   *   page,
   *   failedLocator,
   *   'Login Button',
   *   async (healedLocator) => await healedLocator.click()
   * );
   * ```
   */
  static async trySelfHealing<T>(
    page: Page,
    locator: Locator,
    description: string | undefined,
    // eslint-disable-next-line no-unused-vars
    actionFn: (locator: Locator, ...args: any[]) => Promise<T>,
    ...actionArgs: any[]
  ): Promise<T> {
    // if (!SELF_HEAL_ENABLED) {
    //   throw new Error('Self-healing is disabled by project configuration.');
    // }

    // 1) Programmatic heuristic healing
    const heuristicLocator = await this.programmaticSelfHealing(page, locator, description);
    if (heuristicLocator) {
      console.warn('🔥 Using programmatic self-healing locator.');
      try {
        return await actionFn(heuristicLocator, ...actionArgs);
      } catch (err) {
        console.error('Programmatic self-healing retry failed:', (err as Error).message);
        // Proceed to LLM fallback
      }
    }

    // 2) LLM-based healing fallback
    const oldLocatorString = description || locator.toString();
    const newLocatorCode = await this.suggestLocatorWithLLM(page, description, oldLocatorString);
    if (!newLocatorCode) {
      throw new Error('Self-healing failed: no suggested locator returned by LLM.');
    }

    console.warn(`⚠️ Trying LLM self-healed locator: ${newLocatorCode}`);
    try {
      const healedLocator = this.parseLLMResponseToLocator(page, newLocatorCode);
      return await actionFn(healedLocator, ...actionArgs);
    } catch (err) {
      console.error('❌ LLM self-healing retry failed:', (err as Error).message);
      throw err;
    }
  }

  /**
   * Uses OpenAI GPT-4 to suggest a new locator based on page context and failed locator
   * @param page - Playwright page object to analyze
   * @param description - Element description for context
   * @param oldLocatorString - Original failed locator string
   * @param extraContext - Additional context for the AI (optional)
   * @returns Promise resolving to AI-suggested locator string or null if AI call fails
   * @description Analyzes page elements and uses AI to suggest alternative locators when programmatic healing fails.
   * The AI receives a markdown table of all available elements and the failed locator context.
   * @example
   * ```typescript
   * const suggestedLocator = await SelfHealingHelper.suggestLocatorWithLLM(
   *   page,
   *   'Login Button',
   *   'button[data-testid="old-login-btn"]',
   *   'Button should be visible and clickable'
   * );
   * ```
   */
  static async suggestLocatorWithLLM(
    page: Page,
    description: string | undefined,
    oldLocatorString: string,
    extraContext?: string
  ): Promise<string | null> {
    const locatorInfo = await this.extractAllLocators(page);
    const elementsMarkdown = this.locatorsToMarkdownTable(locatorInfo);

    const prompt = `
The following Playwright locator failed to resolve an element:

Element Description: "${description || '(none provided)'}"
Old Locator: ${oldLocatorString}

Other visible interactable elements on the page (in Markdown table):
${elementsMarkdown}

${extraContext ? `Context: ${extraContext}\n` : ''}

Suggest a single precise Playwright locator for this element.
It should be EITHER:
- A Playwright locator expression starting with "page.locator(...)", "page.getByRole(...)", "page.getByText(...)", "page.getByLabel(...)", "page.getByPlaceholder(...)", "page.getByTestId(...)", or "page.getByAltText(...)"
- OR a selector string like 'input[name="first_name"]' or 'text=Submit'.

Respond ONLY with that locator code or selector string — no explanations, no extra text.
`.trim();

    try {
      const completion = await getOpenAIClient().chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
        max_tokens: 256,
      });

      const responseText = completion.choices[0]?.message?.content?.trim();
      if (!responseText) {
        console.warn('OpenAI returned empty response.');
        return null;
      }
      return responseText;
    } catch (error: any) {
      console.error('Error calling OpenAI API for locator suggestion:', error?.message ?? error);
      return null;
    }
  }

  /**
   * Safely parses AI response string into a Playwright Locator
   * @param page - Playwright page object
   * @param llmResponse - AI response string containing locator code
   * @returns Playwright Locator object
   * @throws Error if parsing fails or response contains unsafe code
   * @description Safely converts AI-suggested locator strings into Playwright Locator objects.
   * Only allows safe locator methods and validates the response format.
   * @example
   * ```typescript
   * const aiResponse = 'page.getByRole("button", { name: "Login" })';
   * const locator = SelfHealingHelper.parseLLMResponseToLocator(page, aiResponse);
   * await locator.click();
   * ```
   */
  static parseLLMResponseToLocator(page: Page, llmResponse: string): Locator {
    let cleaned = llmResponse.trim();

    // Remove markdown code fences or quotes
    cleaned = cleaned.replace(/^``````$/, '').trim();
    cleaned = cleaned.replace(/^["'`]+|["'`]+$/g, '').trim();

    const hasAllowedPrefix = this.allowedPrefixes.some(prefix => cleaned.startsWith(prefix));
    if (hasAllowedPrefix) {
      // eslint-disable-next-line no-eval
      return eval(cleaned);
    }

    // Otherwise, treat as selector string
    return page.locator(cleaned);
  }
}
