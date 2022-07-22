/**
 * The main bundle for legacy_plugin.html, which is a simple plugin that helps us write E2E
 * tests of the plugin functionality.
 *
 * 'Legacy' here means this was written with the original API for SourceBridge < 0.1, which is still
 * supported by the PluginBridge class but no longer documented.
 *
 * Rather than hitting a demo backend, this plugin just displays the data received from the
 * parent window.
 */

import { PluginBridge } from '../../src/plugins'
import { replaceContent } from './utils'

const pluginBridge = new PluginBridge({ debug: true })

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
  await pluginBridge.onContextUpdate(async (context) => {
    // Display the data we got from the parent window
    replaceContent({
      info: pluginBridge.info(),
      context,
      token: await pluginBridge.currentToken(),
    })

    if (readyDelay) {
      console.log(`[iframe] Delaying ready() by ${readyDelay}ms`)
    }
    setTimeout(async () => {
      // Call ready() to clear the loading state for the plugin
      pluginBridge.ready()
    }, readyDelay)

    // If the parent window is doing one of the 'scenarios' (set via query param) then let's refresh the content
    // of the iframe to reflect the current state.
    if (scenario === 'send_auth') {
      setInterval(async () => {
        replaceContent({
          info: pluginBridge.info(),
          context: pluginBridge.currentContext(),
          token: await pluginBridge.currentToken(),
        })
      }, 1_000)
    }
  })

  if (initDelay) {
    console.log(`[iframe] Delaying init() by ${initDelay}ms`)
  }
  setTimeout(async () => {
    // Kick off the initial handshake, which will lead to the context update callback being called.
    const info = await pluginBridge.init()
  }, initDelay)

  window.addEventListener('load', async () => {
    if (scenario === 'access_before_init') {
      try {
        pluginBridge.currentContext()
      } catch (err: unknown) {
        if (err instanceof Error) {
          errors.push(err.message)
          await replaceContent({ errors: errors })
        }
      }
      try {
        await pluginBridge.currentToken()
      } catch (err: unknown) {
        if (err instanceof Error) {
          errors.push(err.message)
          await replaceContent({ errors: errors })
        }
      }
      try {
        pluginBridge.info()
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
