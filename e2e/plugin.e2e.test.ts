import { test, expect } from '@playwright/test'

/**
 * Testing this kind of bidirectional iframe communication presents a challenge. We have created plugin_parent.html /
 * plugin_parent.ts and plugin.html / plugin.ts, and then for each given test scenario we set a 'scenario' query param
 * that triggers certain behavior. The comments on the tests explain the behavior of the scenarios because the
 * code in parent.ts and plugin.ts is pretty hard to follow.
 */

/**
 * Scenario: none (default behavior). Load the iframe, plugin does handshake, parent and plugin both update their
 * contents to reflect the data that was exchanged.
 *
 * This test exercises:
 *  SourceBridgeClient:
 *    - sendRequest()
 *    - sendEvent()
 *    - request/response handling
 *  SourceBridge:
 *  - init() initiates handshake and response triggers onContextUpdate callback
 *  - ready() sends ready event
 *  - currentToken(), currentContext() and info() all work after the callback
 */
test('parent loads plugin and completes handshake', async ({ page, baseURL }) => {
  await page.goto(`${baseURL}/plugin_parent.html?plugin=plugin.html`)
  const title = page.locator('h1')
  await expect(title).toHaveText('Source Simple Plugin Demo')

  // Grab a handle to the iframe's window, which will be a Page we can assert on
  const iframeHandle = await page.$('iframe')
  const frame = await iframeHandle.contentFrame()

  const frameTitle = frame.locator('h1')
  await expect(frameTitle).toHaveText('Simple Demo Plugin iframe')

  const content = frame.locator('#content')
  await expect(content).toContainText('Data that was passed from the parent window')

  // Parse the data displayed in the iframe and make sure it's what we expect
  const data = frame.locator('#data')
  await expect(data).toContainText('token')
  const parsed = JSON.parse(await data.innerText())
  expect(parsed).toStrictEqual({
    info: {
      application: 'app_123',
      viewKey: 'summary',
      surface: 'main_tab',
    },
    context: { member: 'mem_123' },
    token: {
      token:
        'eyJhbGciOiJFZERTQSIsImNydiI6IkVkMjU1MTkiLCJraWQiOiJhcHBfMTIzIn0.eyJwdXJwb3NlIjoidmVyaWZpY2F0aW9uIiwiYXBwIjoiYXBwXzEyMyIsInVzciI6InVzcl8xMjMiLCJpYXQiOjE2NDE0MjEwODksImlzcyI6InNvdXJjZWhlYWx0aCIsImV4cCI6MTY0MTQyMTk4OX0.ebL6cmBNt1vVkzvdZ6KS_Rv95jAM972G1Sz8aXDCuoxMDqtx1Hf7OqM2LzEL-31C_R58bSaqmvrAKjqWVgkKBQ',

      expiresAt: '2022-01-05T22:33:09.485Z',
    },
  })

  // parent should indicate that 'ready' event was received
  const ready = page.locator('#ready')
  await expect(ready).toContainText('ready')
})

/**
 * In this scenario, the parent sends a new auth token after 1s.
 * The plugin will update the content displayed to reflect that.
 */
test('when parent sends updated auth the client has it available', async ({ page, baseURL }) => {
  await page.goto(`${baseURL}/plugin_parent.html?plugin=plugin.html&scenario=send_auth`)

  const iframeHandle = await page.$('iframe')
  const frame = await iframeHandle.contentFrame()
  await expect(frame.locator('#content')).toContainText(
    'Data that was passed from the parent window',
  )

  const data = frame.locator('#data')
  await expect(data).toContainText('2022-01-06T20:48:14.919Z') // This is expires_at for the updated auth token
  const parsed = JSON.parse(await data.innerText())
  expect(parsed).toStrictEqual({
    info: {
      application: 'app_123',
      viewKey: 'summary',
      surface: 'main_tab',
    },
    context: { member: 'mem_123' },
    token: {
      // 'token' and 'expiresAt' are different
      token:
        'eyJhbGciOiJFZERTQSIsImNydiI6IkVkMjU1MTkiLCJraWQiOiJhcHBfMTIzIn0.eyJwdXJwb3NlIjoidmVyaWZpY2F0aW9uIiwiYXBwIjoiYXBwXzEyMyIsInVzciI6InVzcl8xMjMiLCJpYXQiOjE2NDE1MDExOTQsImlzcyI6InNvdXJjZWhlYWx0aCIsImV4cCI6MTY0MTUwMjA5NH0.3oYyGr4XHSuZENF121lYVIumI32ZdRH6RV5b0emG8p_yHuPm-TL1dSU4Y3v6OYnzPs0qi2H8sTUCruXNg4Z0CA',
      expiresAt: '2022-01-06T20:48:14.919Z',
    },
  })
})

/**
 * In this scenario, the parent sends a context event after 1s with member = 'mem_other'
 * The plugin will update the content displayed to reflect that.
 */
test('when parent sends updated context the client calls the callback', async ({
  page,
  baseURL,
}) => {
  await page.goto(`${baseURL}/plugin_parent.html?plugin=plugin.html&scenario=send_new_context`)

  const iframeHandle = await page.$('iframe')
  const frame = await iframeHandle.contentFrame()
  await expect(frame.locator('#content')).toContainText(
    'Data that was passed from the parent window',
  )
  // Parse the data displayed in the iframe and make sure it's what we expect
  const data = frame.locator('#data')
  await expect(data).toContainText('mem_other')
  const parsed = JSON.parse(await data.innerText())
  expect(parsed).toStrictEqual({
    info: {
      application: 'app_123',
      viewKey: 'summary',
      surface: 'main_tab',
    },
    context: { member: 'mem_other' }, // This is different
    token: {
      token:
        'eyJhbGciOiJFZERTQSIsImNydiI6IkVkMjU1MTkiLCJraWQiOiJhcHBfMTIzIn0.eyJwdXJwb3NlIjoidmVyaWZpY2F0aW9uIiwiYXBwIjoiYXBwXzEyMyIsInVzciI6InVzcl8xMjMiLCJpYXQiOjE2NDE0MjEwODksImlzcyI6InNvdXJjZWhlYWx0aCIsImV4cCI6MTY0MTQyMTk4OX0.ebL6cmBNt1vVkzvdZ6KS_Rv95jAM972G1Sz8aXDCuoxMDqtx1Hf7OqM2LzEL-31C_R58bSaqmvrAKjqWVgkKBQ',

      expiresAt: '2022-01-05T22:33:09.485Z',
    },
  })
})

/**
 * In this scenario the parent sends non-valid JSON that can't be parsed.
 * The client should just ignore that message and correctly handle other valid messages
 */
test('when parent sends non-JSON the client ignores it', async ({ page, baseURL }) => {
  await page.goto(`${baseURL}/plugin_parent.html?plugin=plugin.html&scenario=send_non_json`)

  const iframeHandle = await page.$('iframe')
  const frame = await iframeHandle.contentFrame()
  await expect(frame.locator('#content')).toContainText(
    'Data that was passed from the parent window',
  )
  // Parse the data displayed in the iframe and make sure it's what we expect (same as if no garbage was sent)
  const data = frame.locator('#data')
  await expect(data).toContainText('token')
  const parsed = JSON.parse(await data.innerText())
  expect(parsed).toStrictEqual({
    info: {
      application: 'app_123',
      viewKey: 'summary',
      surface: 'main_tab',
    },
    context: { member: 'mem_123' },
    token: {
      token:
        'eyJhbGciOiJFZERTQSIsImNydiI6IkVkMjU1MTkiLCJraWQiOiJhcHBfMTIzIn0.eyJwdXJwb3NlIjoidmVyaWZpY2F0aW9uIiwiYXBwIjoiYXBwXzEyMyIsInVzciI6InVzcl8xMjMiLCJpYXQiOjE2NDE0MjEwODksImlzcyI6InNvdXJjZWhlYWx0aCIsImV4cCI6MTY0MTQyMTk4OX0.ebL6cmBNt1vVkzvdZ6KS_Rv95jAM972G1Sz8aXDCuoxMDqtx1Hf7OqM2LzEL-31C_R58bSaqmvrAKjqWVgkKBQ',

      expiresAt: '2022-01-05T22:33:09.485Z',
    },
  })
})

/**
 * In this scenario the parent sends some valid JSON but it doesn't have the fields that are expected by the client.
 * The client should just ignore that message and correctly handle other valid messages
 */
test('when parent sends non-envelope the client ignores it', async ({ page, baseURL }) => {
  await page.goto(`${baseURL}/plugin_parent.html?plugin=plugin.html&scenario=send_non_envelope`)

  const iframeHandle = await page.$('iframe')
  const frame = await iframeHandle.contentFrame()
  await expect(frame.locator('#content')).toContainText(
    'Data that was passed from the parent window',
  )
  // Parse the data displayed in the iframe and make sure it's what we expect (same as if no garbage was sent)
  const data = frame.locator('#data')
  await expect(data).toContainText('token')
  const parsed = JSON.parse(await data.innerText())
  expect(parsed).toStrictEqual({
    info: {
      application: 'app_123',
      viewKey: 'summary',
      surface: 'main_tab',
    },
    context: { member: 'mem_123' },
    token: {
      token:
        'eyJhbGciOiJFZERTQSIsImNydiI6IkVkMjU1MTkiLCJraWQiOiJhcHBfMTIzIn0.eyJwdXJwb3NlIjoidmVyaWZpY2F0aW9uIiwiYXBwIjoiYXBwXzEyMyIsInVzciI6InVzcl8xMjMiLCJpYXQiOjE2NDE0MjEwODksImlzcyI6InNvdXJjZWhlYWx0aCIsImV4cCI6MTY0MTQyMTk4OX0.ebL6cmBNt1vVkzvdZ6KS_Rv95jAM972G1Sz8aXDCuoxMDqtx1Hf7OqM2LzEL-31C_R58bSaqmvrAKjqWVgkKBQ',

      expiresAt: '2022-01-05T22:33:09.485Z',
    },
  })
})

/**
 * In this scenario, the plugin waits for 10s before starting the handshake, but immediately tries to call
 * SourceBridge.currentContext() etc, which throw exceptions.
 * The plugin catches the exceptions and displays them in #data
 */
test('when init has not completed client gets exceptions for accessing current context', async ({
  page,
  baseURL,
}) => {
  await page.goto(
    `${baseURL}/plugin_parent.html?plugin=plugin.html&scenario=access_before_init&initDelay=10000`,
  )

  const iframeHandle = await page.$('iframe')
  const frame = await iframeHandle.contentFrame()
  const data = frame.locator('#data')
  await expect(data).toContainText('errors')
  const parsed = JSON.parse(await data.innerText())
  expect(parsed).toStrictEqual({
    errors: [
      'SourceBridge is not yet initialized. Please call `init()` before currentContext()',
      'SourceBridge is not yet initialized. Please call `init()` before currentToken()',
      'SourceBridge is not yet initialized. Please call `init()` before info()',
    ],
  })
})
