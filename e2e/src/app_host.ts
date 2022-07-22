import { BridgeError, BridgeHost, Envelope } from '../../src'

import { FooPayload, MyResponsePayload } from './app_messages'
import { createIFrame, getToken, replaceContent } from './utils'

export async function onMyRequest(_request: Envelope): Promise<MyResponsePayload> {
  return await Promise.resolve({
    sum: 1,
    sender: 'host',
  })
}

export function startGuest(guestName: string, dataElement: string): void {
  let foo: FooPayload | null = null
  let ready = false
  let error: BridgeError | null = null

  function refresh() {
    replaceContent(
      {
        ready,
        foo,
        error,
      },
      dataElement,
    )
  }

  const { iframe, url } = createIFrame('app_guest.html', guestName)
  const guest = new BridgeHost({
    iframe,
    url,
    helloTimeout: 1_000,
    readyTimeout: 2_000,
    getToken,
    onError: (thisError) => {
      guest.destroy()
      console.error('onError: ', thisError)
      error = thisError
      refresh()
    },
    onReady: async () => {
      console.log('[host] guest says ready')
      ready = true
      refresh()
      guest.sendEvent<'foo', FooPayload>('foo', {
        value: `hello to my guest ${guestName}`,
        sender: 'host',
      })
      await Promise.resolve()
    },
    requestHandlers: {
      my: async (_request: Envelope) => {
        return await Promise.resolve({
          sum: 1,
          sender: 'host',
        })
      },
    },
    eventHandlers: {
      foo: async (event: FooPayload) => {
        console.log('[host] received foo')
        foo = event
        refresh()
        await Promise.resolve()
      },
    },
    debug: true,
  })

  guest.boot()
}

function init(): void {
  console.log('[host] init')
  const urlParams = new URLSearchParams(window.location.search)
  // We use the 'scenario' query param to trigger different behavior
  const scenario = urlParams.get('scenario')

  startGuest('alice', '#host_content')

  if (scenario === 'two_guests') {
    startGuest('bob', '#host_content_2')
  }
}

void init()
