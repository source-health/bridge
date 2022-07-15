import { Auth, BridgeGuest } from '../../src'

import { FooPayload, MyRequestPayload, MyResponse, MyResponsePayload } from './app_messages'
import { replaceContent } from './utils'

export async function init(): Promise<void> {
  console.log('[guest] calling init()')

  let foo: FooPayload | null = null
  let auth: Auth | null = null
  let initResponse: unknown = null
  let myResponse: MyResponsePayload | null = null
  let autoReady = true

  const urlParams = new URLSearchParams(window.location.search)
  // We use the 'scenario' query param to trigger different behavior
  const scenario = urlParams.get('scenario')
  const guestName = urlParams.get('guestName') ?? 'guest'

  if (scenario === 'no_hello') {
    console.log('[guest] skipping hello')
    return
  } else if (scenario === 'no_ready') {
    autoReady = false
  }

  function refresh() {
    replaceContent({
      auth,
      initResponse,
      myResponse,
      foo,
    })
  }

  initResponse = await BridgeGuest.init({
    autoReady,
    eventHandlers: {
      foo: async (event: FooPayload) => {
        console.log('[guest] received foo', event)
        foo = event
        refresh()
        await Promise.resolve()
      },
    },
  })

  auth = await BridgeGuest.currentToken()
  myResponse = (
    await BridgeGuest.sendRequest<'my', MyRequestPayload, MyResponse>('my', {
      value: 'hi there',
      sender: guestName,
    })
  ).payload

  refresh()

  BridgeGuest.sendEvent<'foo', FooPayload>('foo', {
    value: 'hello to my host',
    sender: guestName,
  })

  refresh()
}

void init()
