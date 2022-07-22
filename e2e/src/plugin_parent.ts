/**
 * This is a testing / demo scaffold that simulates the Source web application
 * loading an iframe plugin. It's super hacky and hard-coded, but it is just enough
 * to get an iframe plugin bootstrapped and communicating over the SourceBridge API.
 */

import { Envelope } from '../../src'

const APPLICATION_ID = 'app_123' // matches the demo server's dummy config

function generateRequestId(): string {
  return Math.random().toString(32).substring(2)
}

interface Context {
  member?: string
}
interface Auth {
  token: string
  expires_at: Date
}

interface PluginInfo {
  application: string
  view_key: string
  surface: string
}

interface HelloResponse {
  type: 'hello'
  id: string
  in_reply_to: string
  ok: boolean
  payload: {
    context: Context
    auth: Auth
    plugin_info: PluginInfo
  }
}

interface AuthEvent {
  type: 'authentication'
  id: string
  payload: Auth
}

interface AuthResponse {
  type: 'authentication'
  id: string
  in_reply_to: string
  ok: boolean
  payload: Auth
}

async function createHelloResponse(messageId: string): Promise<HelloResponse> {
  return {
    type: 'hello',
    id: generateRequestId(),
    in_reply_to: messageId,
    ok: true,
    payload: {
      context: {
        member: 'mem_123',
      },
      auth: {
        token:
          'eyJhbGciOiJFZERTQSIsImNydiI6IkVkMjU1MTkiLCJraWQiOiJhcHBfMTIzIn0.eyJwdXJwb3NlIjoidmVyaWZpY2F0aW9uIiwiYXBwIjoiYXBwXzEyMyIsInVzciI6InVzcl8xMjMiLCJpYXQiOjE2NDE0MjEwODksImlzcyI6InNvdXJjZWhlYWx0aCIsImV4cCI6MTY0MTQyMTk4OX0.ebL6cmBNt1vVkzvdZ6KS_Rv95jAM972G1Sz8aXDCuoxMDqtx1Hf7OqM2LzEL-31C_R58bSaqmvrAKjqWVgkKBQ',
        expires_at: new Date('2022-01-05T22:33:09.485Z'),
      },
      plugin_info: {
        application: APPLICATION_ID,
        view_key: 'summary',
        surface: 'main_tab',
      },
    },
  }
}

async function createAuthEvent(): Promise<AuthEvent> {
  return {
    type: 'authentication',
    id: generateRequestId(),
    payload: {
      token:
        'eyJhbGciOiJFZERTQSIsImNydiI6IkVkMjU1MTkiLCJraWQiOiJhcHBfMTIzIn0.eyJwdXJwb3NlIjoidmVyaWZpY2F0aW9uIiwiYXBwIjoiYXBwXzEyMyIsInVzciI6InVzcl8xMjMiLCJpYXQiOjE2NDE1MDExOTQsImlzcyI6InNvdXJjZWhlYWx0aCIsImV4cCI6MTY0MTUwMjA5NH0.3oYyGr4XHSuZENF121lYVIumI32ZdRH6RV5b0emG8p_yHuPm-TL1dSU4Y3v6OYnzPs0qi2H8sTUCruXNg4Z0CA',
      expires_at: new Date('2022-01-06T20:48:14.919Z'),
    },
  }
}

async function createAuthResponse(request: Envelope): Promise<AuthResponse> {
  return {
    type: 'authentication',
    id: generateRequestId(),
    in_reply_to: request.id,
    ok: true,
    payload: {
      token:
        'eyJhbGciOiJFZERTQSIsImNydiI6IkVkMjU1MTkiLCJraWQiOiJhcHBfMTIzIn0.eyJwdXJwb3NlIjoidmVyaWZpY2F0aW9uIiwiYXBwIjoiYXBwXzEyMyIsInVzciI6InVzcl8xMjMiLCJpYXQiOjE2NDE1MDExOTQsImlzcyI6InNvdXJjZWhlYWx0aCIsImV4cCI6MTY0MTUwMjA5NH0.3oYyGr4XHSuZENF121lYVIumI32ZdRH6RV5b0emG8p_yHuPm-TL1dSU4Y3v6OYnzPs0qi2H8sTUCruXNg4Z0CA',
      expires_at: new Date('2022-01-06T20:48:14.919Z'),
    },
  }
}

async function replaceContent(selector: string, content: string): Promise<void> {
  var element = document.querySelector(selector)
  if (!element) {
    console.error('Could not find #content div')
    return
  }

  element.innerHTML = content
}

export function hi() {
  console.log('hi')
}

export async function init() {
  const urlParams = new URLSearchParams(window.location.search)
  // We use the 'scenario' query param to trigger different behavior
  const scenario = urlParams.get('scenario')

  // We get the plugin to load from the 'plugin' URL param
  var iframeHtml = urlParams.get('plugin') ?? 'plugin.html'
  console.log('plugin:', iframeHtml)

  // Default iframe base url is same as the parent
  var iframeOrigin = window.location.protocol + '//' + window.location.host
  var iframeUrl = new URL(iframeOrigin + '/' + iframeHtml)

  // Pass through the query params
  for (const entry of urlParams.entries()) {
    iframeUrl.searchParams.append(entry[0], entry[1])
  }

  var iframe = document.createElement('iframe')
  iframe.id = 'iframe1'
  iframe.src = iframeUrl.href
  iframe.width = '100%'
  iframe.height = '400px'
  iframe.sandbox.add('allow-forms', 'allow-popups', 'allow-scripts', 'allow-same-origin')
  var container = document.querySelector('#placeholder')
  if (!container) {
    console.error('Could not find #placeholder')
    return
  }
  container.appendChild(iframe)

  var destination = iframe.contentWindow

  iframe.addEventListener('load', function (e) {
    console.log('[parent] iframe load complete', iframeUrl.href)
  })

  window.addEventListener('message', async (event) => {
    if (!destination) {
      console.error('Could not find iframe window handle')
      return
    }
    if (event.source === destination) {
      if (event.origin !== iframeOrigin) {
        console.warn("[parent] Ew, I don't trust this message", event)
        return
      }
      console.log('[parent] Received message from iframe1: ' + event.data)
      var message = JSON.parse(event.data)
      if (message.type === 'hello') {
        var response = await createHelloResponse(message.id)

        // Some scenarios test that the client can receive garbage and ignore it
        if (scenario === 'send_non_json') {
          console.log('[parent] sending non-JSON message')
          destination.postMessage('blahblahblah', iframeOrigin)
        }

        if (scenario === 'send_non_envelope') {
          console.log('[parent] sending non-envelope message')
          const data = {
            foo: 'bar',
            hello: 'world',
          }
          destination.postMessage(JSON.stringify(data), iframeOrigin)
        }

        console.log("[parent] sending 'hello' response")
        destination.postMessage(JSON.stringify(response), iframeOrigin)
      } else if (message.type === 'ready') {
        console.log("[parent] received 'ready' from iframe1")
        replaceContent('#ready', 'iframe sent ready')
      } else if (message.type === 'authentication') {
        const data = await createAuthResponse(message)
        console.log("[parent] sending 'authentication' response")
        destination.postMessage(JSON.stringify(data), iframeOrigin)
      } else {
        console.log(`[parent] unknown message type ${message.type}`)
      }
    }
  })

  // scenario 'send_auth' = we will send a new auth token
  if (scenario === 'send_auth') {
    setTimeout(async () => {
      if (!destination) {
        console.error('Could not find iframe window handle')
        return
      }
      const event = await createAuthEvent()
      console.log('[parent] sending updated auth token')
      destination.postMessage(JSON.stringify(event), iframeOrigin)
    }, 1_000)
  }

  // scenario 'send_new_context' = we will send a new member ID as context
  if (scenario === 'send_new_context') {
    setTimeout(async () => {
      if (!destination) {
        console.error('Could not find iframe window handle')
        return
      }
      const event = await {
        id: generateRequestId(),
        type: 'context',
        payload: {
          member: 'mem_other',
        },
      }
      console.log('[parent] sending updated context')
      destination.postMessage(JSON.stringify(event), iframeOrigin)
    }, 1_000)
  }
}

init()
