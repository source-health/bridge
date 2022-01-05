/**
 * The main bundle for iframe.e2e.html, which is a simple plugin that helps us write E2E
 * tests of the plugin functionality.
 *
 * Rather than hitting a demo backend, this plugin just displays the data received from the
 * parent window.
 */

import { SourceBridge } from '../../src/SourceBridge'

async function replaceContent(data: Record<string, unknown>): Promise<void> {
  var contentDiv = document.querySelector('#content')
  if (!contentDiv) {
    console.error('Could not find #content div')
    return
  }

  contentDiv.innerHTML = `Data that was passed from the parent window<br><pre id='data'>${JSON.stringify(
    data,
    null,
    2,
  )}</pre>`
}

async function displayError(error: string): Promise<void> {
  var element = document.querySelector('#errors')
  if (!element) {
    console.error('Could not find #errors element')
    return
  }

  element.innerHTML += `<p>${error}</p>`
}

interface Config {
  initDelay: number
  readyDelay: number
  scenario: string | null
}

function getIntParam(urlParams: URLSearchParams, key: string): number {
  const value = urlParams.get(key)
  if (value) {
    return parseInt(value, 10)
  }
  return 0
}

/**
 * Depending on query params, we will add a delay before calling init() and/or ready(),
 * for testing our error handling of these cases.
 */
function getConfig(): Config {
  const urlParams = new URLSearchParams(window.location.search)
  return {
    initDelay: getIntParam(urlParams, 'initDelay'),
    readyDelay: getIntParam(urlParams, 'readyDelay'),
    scenario: urlParams.get('scenario'),
  }
}

async function init() {
  const { initDelay, readyDelay, scenario } = getConfig()
  const errors: string[] = []

  // Subscribe to updates from the parent window.
  await SourceBridge.onContextUpdate(async (context) => {
    // Display the data we got from the parent window
    replaceContent({
      info: SourceBridge.info(),
      context,
      token: await SourceBridge.currentToken(),
    })

    if (readyDelay) {
      console.log(`[iframe] Delaying ready() by ${readyDelay}ms`)
    }
    setTimeout(async () => {
      // Call ready() to clear the loading state for the plugin
      SourceBridge.ready()
    }, readyDelay)

    // If the parent window is doing one of the 'scenarios' (set via query param) then let's refresh the content
    // of the iframe to reflect the current state.
    if (scenario === 'send_auth') {
      setInterval(async () => {
        replaceContent({
          info: SourceBridge.info(),
          context: SourceBridge.currentContext(),
          token: await SourceBridge.currentToken(),
        })
      }, 1000)
    }
  })

  if (initDelay) {
    console.log(`[iframe] Delaying init() by ${initDelay}ms`)
  }
  setTimeout(async () => {
    // Kick off the initial handshake, which will lead to the context update callback being called.
    const info = await SourceBridge.init()
  }, initDelay)

  window.addEventListener('load', async () => {
    if (scenario === 'access_before_init') {
      try {
        SourceBridge.currentContext()
      } catch (err: unknown) {
        if (err instanceof Error) {
          errors.push(err.message)
          await replaceContent({ errors: errors })
        }
      }
      try {
        await SourceBridge.currentToken()
      } catch (err: unknown) {
        if (err instanceof Error) {
          errors.push(err.message)
          await replaceContent({ errors: errors })
        }
      }
      try {
        SourceBridge.info()
      } catch (err: unknown) {
        if (err instanceof Error) {
          errors.push(err.message)
          await replaceContent({ errors: errors })
        }
      }
    }
  })
}

init()
