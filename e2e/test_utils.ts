import { expect, Frame, Page } from '@playwright/test'

/**
 * This file contains utils used by e2e test code (should not import from the main source bridge codebase
 */

/**
 * Retrieve and parse the JSON from the above replaceContent
 */
export async function getData(
  page: Page | Frame,
  expectText: string | RegExp,
  selector: string = '#content',
): Promise<Record<string, unknown>> {
  // Parse the data displayed in the iframe and make sure it's what we expect
  const data = page.locator(`${selector} .data`)
  // Make sure whatever needs to have happened has happened
  await expect(data).toContainText(expectText)
  const parsed = JSON.parse(await data.innerText())
  return parsed
}
