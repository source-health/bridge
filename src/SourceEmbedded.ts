import { AuthPayload, AuthenticationEvent, Event, Response } from './Messages'
import { SourceBridgeClient } from './SourceBridgeClient'
import { generateRequestId } from './generateRequestId'

export interface Auth {
  token: string
  expiresAt: Date
}

type EventHandlerFn<T> = (payload: T) => Promise<void>

interface HelloPayload {
  auth?: AuthPayload
}
type HelloResponse = Response<'hello', HelloPayload>

type EventHandlers = Record<string, EventHandlerFn<unknown>>

interface SourceEmbeddedOptions {
  eventHandlers: EventHandlers
  autoReady: boolean
}

class SourceEmbeddedAPI {
  private client: SourceBridgeClient
  private auth?: Auth

  constructor() {
    this.client = new SourceBridgeClient()
  }

  // TODO should this return anything, really? return the hello response?
  public async init<T>(options: Partial<SourceEmbeddedOptions> = {}): Promise<T> {
    const realOptions = {
      autoReady: true,
      eventHandlers: {},
      ...options,
    }

    const response = await this.client.sendRequest<HelloResponse>({
      type: 'hello',
      id: generateRequestId(),
    })
    if (response.payload.auth) {
      this.handleNewAuth(response.payload.auth)
    }

    // Create event handlers
    for (const [eventName, handler] of Object.entries(realOptions.eventHandlers)) {
      this.client.onEvent(eventName, async (envelope) => {
        const payload = (envelope as Event<string, unknown>).payload
        await handler(payload)
      })
    }

    // Subscribe to any auth events
    // eslint-disable-next-line @typescript-eslint/require-await
    this.client.onEvent('authentication', async (envelope) => {
      this.handleNewAuth((envelope as AuthenticationEvent).payload)
    })

    if (realOptions.autoReady) {
      this.sendEvent('ready')
    }

    return response.payload as T
  }

  public sendEvent<TType extends string, TPayload>(type: TType, payload?: TPayload): void {
    this.client.sendEvent({
      type,
      id: generateRequestId(),
      payload,
    })
  }

  public ready(): void {
    this.sendEvent('ready')
  }

  // This is async because we intend to add 'fetch on demand' when the current token is
  // expired (e.g. if the tab has been throttled by the browser, or the computer has been
  // suspended.)
  // eslint-disable-next-line @typescript-eslint/require-await
  public async currentToken(): Promise<Auth> {
    if (!this.auth) {
      console.error('[SourceBridge] called currentToken() before init().')
      throw new Error(
        'SourceBridge is not yet initialized. Please call `init()` before currentToken()',
      )
    }
    return this.auth
  }

  private handleNewAuth(auth: AuthPayload): void {
    console.log('[SourceBridge] handling new application token.')
    if (!auth.token || !auth.expires_at) {
      console.error('[SourceBridge] could not parse new application token')
      return
    }
    this.auth = {
      token: auth.token,
      expiresAt: new Date(auth.expires_at),
    }
  }
}

export const SourceEmbedded = new SourceEmbeddedAPI()
