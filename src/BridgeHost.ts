/**
 * This is an API for use by 'host' applications embedding one or more guest iframes that need to use the Source Bridge
 * protocol to communicate back to the host window.
 */

import { SourceBridgeClient } from './SourceBridgeClient'
import { BridgeError, BridgeErrors } from './errors'
import { generateRequestId } from './generateRequestId'
import { AnyEventHandler, AnyRequestHandler, Auth, Envelope, Event } from './types'

type Timeout = ReturnType<typeof setTimeout>
type GetTokenFn = () => Promise<Auth>

interface BridgeHostOptions {
  readonly iframe: Window
  readonly url: URL
  readonly helloTimeout: number
  readonly readyTimeout: number
  getToken: GetTokenFn
  onError: (error: BridgeError) => void
  onHello?: () => Promise<unknown>
  onReady?: () => Promise<void>
  eventHandlers?: Record<string, AnyEventHandler>
  requestHandlers?: Record<string, AnyRequestHandler>
  debug?: boolean
}

export class BridgeHost {
  private client: SourceBridgeClient
  private booted: boolean = false
  private helloTimer: Timeout | null = null
  private readyTimer: Timeout | null = null

  constructor(private readonly options: BridgeHostOptions) {
    this.client = new SourceBridgeClient(options.iframe, { debug: options.debug })

    // Wire up the 'authentication' request to send back a token using the `getToken` callback.
    this.client.onEvent('authentication', async (request) => await this.sendAuthResponse(request))

    // Wire up the 'hello' request to send back the handshake (and include the response of the 'onHello' callback as
    // the payload).
    this.client.onEvent('hello', async (request) => await this.onHello(request))

    // Wire up the 'ready' event to call the onReady callback and clear the timeout
    this.client.onEvent('ready', async (request) => await this.onReady(request))

    // Wire up any other event handlers
    if (options.eventHandlers) {
      for (const [eventName, handler] of Object.entries(options.eventHandlers)) {
        this.client.onEvent(eventName, async (envelope) => {
          const payload = (envelope as Event<string, unknown>).payload
          await handler(payload)
        })
      }
    }

    // Wire up any other request handlers
    if (options.requestHandlers) {
      for (const [requestName, handler] of Object.entries(options.requestHandlers)) {
        this.client.onEvent(requestName, async (request) => {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const responsePayload = await handler(request.payload)
          this.client.sendReply(request, responsePayload)
        })
      }
    }
  }

  public boot(): void {
    if (this.booted) {
      return
    }

    // Mark the guest application as booted
    this.booted = true

    // Start the timers to receive a hello and ready message
    this.helloTimer = setTimeout(
      () => this.emitError(BridgeErrors.NotStarted),
      this.options.helloTimeout,
    )

    this.readyTimer = setTimeout(
      () => this.emitError(BridgeErrors.NotReady),
      this.options.readyTimeout,
    )
  }

  public destroy(): void {
    this.client.close()

    if (this.helloTimer) {
      clearInterval(this.helloTimer)
      this.helloTimer = null
    }

    if (this.readyTimer) {
      clearInterval(this.readyTimer)
      this.readyTimer = null
    }

    this.booted = false
  }

  public sendEvent<TType extends string, TPayload>(type: TType, payload?: TPayload): void {
    this.client.sendEvent({
      type,
      id: generateRequestId(),
      payload,
    })
  }

  private emitError(error: BridgeErrors): void {
    this.options.onError(new BridgeError(error))
  }

  private async sendAuthResponse(request: Envelope): Promise<void> {
    const auth = await this.options.getToken()
    this.client.sendReply(request, {
      token: auth.token,
      expires_at: auth.expiresAt,
    })
  }

  private async onHello(request: Envelope): Promise<void> {
    this.debug('[BridgeHost] Received hello, returning handshake response')
    if (this.helloTimer) {
      clearInterval(this.helloTimer)
    }

    const payload = this.options.onHello ? await this.options.onHello() : undefined
    this.client.sendReply(request, payload)
  }

  private async onReady(_request: Envelope): Promise<void> {
    this.debug('[BridgeHost] Received ready')
    if (this.readyTimer) {
      clearInterval(this.readyTimer)
    }
    if (this.options.onReady) {
      await this.options.onReady()
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private debug(message: any, ...optionalParams: any[]): void {
    if (this.options.debug === true) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      console.log(message, ...optionalParams)
    }
  }
}
