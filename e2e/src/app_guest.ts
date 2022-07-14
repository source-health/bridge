import { Auth, AuthPayload, Event, Request, Response, BridgeGuest } from '../../src'
import {
  FooEvent,
  FooPayload,
  MyRequestPayload,
  MyResponse,
  MyResponsePayload,
} from './app_messages'
import { replaceContent } from './utils'

async function handleFoo(event: FooEvent): Promise<void> {
  replaceContent({
    auth: await BridgeGuest.currentToken(),
    foo: event.payload,
  })
}

export async function init(): Promise<void> {
  let foo: FooPayload | null = null
  let auth: Auth | null = null
  let initResponse: unknown = null
  let myResponse: MyResponsePayload | null = null

  function refresh() {
    replaceContent({
      auth,
      initResponse,
      myResponse,
      foo,
    })
  }

  console.log('[guest] calling init()')
  initResponse = await BridgeGuest.init({
    eventHandlers: {
      foo: async (event: FooPayload) => {
        console.log('[guest] received foo', event)
        foo = event
        await refresh()
      },
    },
  })

  auth = await BridgeGuest.currentToken()
  myResponse = (
    await BridgeGuest.sendRequest<'my', MyRequestPayload, MyResponse>('my', {
      value: 'hi there',
      sender: 'guest',
    })
  ).payload

  await refresh()

  BridgeGuest.sendEvent<'foo', FooPayload>('foo', { value: 'hello to my host', sender: 'guest' })

  await refresh()
}

init()
