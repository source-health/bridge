import { test, expect } from '@playwright/test'
import { hostname } from 'os'
import { getData } from './test_utils'

const authFromParent = {
  expiresAt: '2022-01-06T20:48:14.919Z',
  token:
    'eyJhbGciOiJFZERTQSIsImNydiI6IkVkMjU1MTkiLCJraWQiOiJhcHBfMTIzIn0.eyJwdXJwb3NlIjoidmVyaWZpY2F0aW9uIiwiYXBwIjoiYXBwXzEyMyIsInVzciI6InVzcl8xMjMiLCJpYXQiOjE2NDE1MDExOTQsImlzcyI6InNvdXJjZWhlYWx0aCIsImV4cCI6MTY0MTUwMjA5NH0.3oYyGr4XHSuZENF121lYVIumI32ZdRH6RV5b0emG8p_yHuPm-TL1dSU4Y3v6OYnzPs0qi2H8sTUCruXNg4Z0CA',
}

/**
 * Scenario: none (default behavior). Load the iframe, plugin does handshake, parent and plugin both update their
 * contents to reflect the data that was exchanged.
 *
 * This test exercises:
 *  SourceBridgeClient:
 *    - sendRequest()
 *    - sendReply()
 *    - sendEvent()
 *    - request/response handling
 *  SourceBridge:
 *  - init() initiates handshake and response triggers onContextUpdate callback
 *  - ready() sends ready event
 *  - currentToken(), currentContext() and info() all work after the callback
 */
test('host loads guest, completes handshake, exchanges auth, exchanges request, sends and receives event', async ({
  page,
  baseURL,
}) => {
  await page.goto(`${baseURL}/app_host.html`)
  const title = page.locator('h1')
  await expect(title).toHaveText('Source Host Test')

  // Grab a handle to the iframe's window, which will be a Page we can assert on
  const iframeHandle = await page.$('iframe')
  const frame = await iframeHandle.contentFrame()

  const frameTitle = frame.locator('h1')
  await expect(frameTitle).toHaveText('Source Guest Test')

  // Parse the data displayed in the iframe and make sure it's what we expect
  const data = await getData(frame, /sum[^]*.*hello to my guest/)
  expect(data).toStrictEqual({
    auth: authFromParent,
    myResponse: {
      sum: 1,
      sender: 'host',
    },
    foo: {
      sender: 'host',
      value: 'hello to my guest',
    },
  })

  // Parse the data from the host page and make sure it's what we expect
  const hostData = await getData(page, 'hello to my host', '#host_content')
  await expect(hostData).toStrictEqual({
    ready: true,
    foo: {
      sender: 'guest',
      value: 'hello to my host',
    },
  })
})
