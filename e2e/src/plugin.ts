/**
 * The main bundle for iframe.e2e.html, which is a simple plugin that helps us write E2E
 * tests of the plugin functionality.
 *
 * This test uses the 'new style' PluginBridge API, not in the backwards-compatible way, which is
 * tested in the 'legacy_plugin' tests.
 *
 * Rather than hitting a demo backend, this plugin just displays the data received from the
 * parent window.
 */

import { Context, PluginBridge } from '../../src/plugins'
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

  const onContextUpdate = async (context: Context) => {
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
  }

  if (initDelay) {
    console.log(`[iframe] Delaying init() by ${initDelay}ms`)
  }
  setTimeout(async () => {
    // Kick off the initial handshake, which will lead to the context update callback being called.
    const info = await pluginBridge.init(onContextUpdate)
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
