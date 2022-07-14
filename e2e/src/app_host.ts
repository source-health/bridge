import { Envelope } from '../../src'
import { BridgeHost } from '../../src/BridgeHost'
import { FooEvent, FooPayload, MyResponsePayload } from './app_messages'
import { createIFrame, getToken, replaceContent } from './utils'

export async function onMyRequest(request: Envelope): Promise<MyResponsePayload> {
  return {
    sum: 1,
    sender: 'host',
  }
}

export async function init(): Promise<void> {
  console.log('[host] init')
  let foo: FooPayload | null = null
  let ready: boolean = false

  function refresh() {
    replaceContent(
      {
        ready,
        foo,
      },
      '#host_content',
    )
  }

  const { iframe, url } = await createIFrame('app_guest.html')
  const guest = new BridgeHost({
    iframe,
    url,
    helloTimeout: 2_000,
    readyTimeout: 4_000,
    getToken,
    onError: (error) => {
      console.error('onError: ', error)
    },
    onReady: async () => {
      console.log('[host] guest says ready')
      ready = true
      await refresh()
      guest.sendEvent<'foo', FooPayload>('foo', { value: 'hello to my guest', sender: 'host' })
    },
    requestHandlers: {
      my: async (request: Envelope) => {
        return {
          sum: 1,
          sender: 'host',
        }
      },
    },
    eventHandlers: {
      foo: async (event: FooPayload) => {
        console.log('[host] received foo')
        foo = event
        await refresh()
      },
    },
  })

  guest.boot()
}

init()
