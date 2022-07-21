import { SourceBridgeClient } from './SourceBridgeClient'
import { generateRequestId } from './generateRequestId'
import { AnyEventHandler, Auth, AuthenticationResponse, Event, HelloResponse } from './types'

interface BridgeGuestOptions {
  eventHandlers: Record<string, AnyEventHandler>
  autoReady: boolean
}

export class BridgeGuest {
  private client: SourceBridgeClient

  constructor(private readonly otherWindow: Window) {
    this.client = new SourceBridgeClient(otherWindow)
  }

  /**
   * Initialize the bridge, perform the handshake with the host window, and return the host's response to `hello`.
   */
  public async init<T>(options: Partial<BridgeGuestOptions> = {}): Promise<T> {
    const realOptions = {
      autoReady: true,
      eventHandlers: {},
      ...options,
    }

    const response = await this.client.sendRequest<HelloResponse>({
      type: 'hello',
      id: generateRequestId(),
    })

    // Create event handlers
    for (const [eventName, handler] of Object.entries(realOptions.eventHandlers)) {
      this.client.onEvent(eventName, async (envelope) => {
        const payload = (envelope as Event<string, unknown>).payload
        await handler(payload)
      })
    }

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

  public async sendRequest<TType extends string, TRequestPayload, TResponse>(
    type: TType,
    payload?: TRequestPayload,
  ): Promise<TResponse> {
    return await this.client.sendRequest({
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
    const authResponse = await this.sendRequest<string, undefined, AuthenticationResponse>(
      'authentication',
    )
    return {
      token: authResponse.payload.token,
      expiresAt: new Date(authResponse.payload.expires_at),
    }
  }
}
