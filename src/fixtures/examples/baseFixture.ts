import { test as base, TestInfo } from '@playwright/test';

// ----------------------
// GLOBAL ENFORCEMENT
// ----------------------
base.beforeEach(async ({}, testInfo: TestInfo) => {
  const annotation = testInfo.annotations.find(a => a.type === 'QADENCE_TC_ID');
  const expectedTag = annotation ? `@QADENCE_TC_ID:${annotation.description}` : null;
  const tag = expectedTag ? testInfo.tags.find(t => t === expectedTag) : null;
  const hasAnnotation = !!annotation;
  const hasTag = !!tag;

  if (!hasAnnotation && !hasTag) {
    throw new Error(
      `Test "${testInfo.title}" is missing both:\n` +
        `  1. Annotation: { type: "TC_ID", description: "<This is the TC_ID coming from QADENCE>" }\n` +
        `  2. Tag: @TC_ID:<description> (must match the annotation)`
    );
  }
  if (!hasAnnotation) {
    throw new Error(
      `Test "${testInfo.title}" is missing annotation: { type: "TC_ID", description: "<This is the TC_ID coming from QADENCE>" }`
    );
  }
  if (!hasTag) {
    throw new Error(
      `Test "${testInfo.title}" is missing tag: "${expectedTag}"`
    );
  }
});

export const test = base;
