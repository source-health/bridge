import { generateRequestId } from './generateRequestId'
import { Envelope, Response, ResponseEnvelope } from './types'

type ResolveFn<T> = (value: T) => void
type OnMessageFn = (envelope: Envelope) => Promise<void>

interface SourceBridgeClientOptions {
  debug?: boolean
}

export class SourceBridgeClient {
  // Map where we keep track of open requests and their promise resolve callbacks
  private openRequests: Map<string, ResolveFn<unknown>> = new Map()

  // Map where we keep track of event subscriptions
  private messageCallbacks: Map<string, OnMessageFn[]> = new Map()

  constructor(
    private readonly otherWindow: Window,
    readonly config: SourceBridgeClientOptions = {},
  ) {
    window.addEventListener('message', (message) => this.handleMessage(message))
  }

  public close(): void {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    window.removeEventListener('message', this.handleMessage)
  }

  // Because we allow async callbacks, handleEnvelope is async, but addEventListener only takes non-async callbacks
  // so we use `void` operator to allow using an async function here.
  private handleMessage(event: MessageEvent<unknown>): void {
    void this.handleEnvelope(event)
  }

  public sendEvent(message: Envelope): void {
    this.debug('[SourceBridge] sending message: ', message)
    this.otherWindow.postMessage(JSON.stringify(message), '*')
  }

  public async sendRequest<TResponse>(message: Envelope): Promise<TResponse> {
    const promise = new Promise<TResponse>((resolve, _reject) => {
      this.openRequests.set(message.id, resolve as ResolveFn<unknown>)
    })
    this.debug('[SourceBridge] sending request: ', message)
    this.otherWindow.postMessage(JSON.stringify(message), '*')
    return promise
  }

  public sendReply<TPayload>(request: Envelope, payload: TPayload): void {
    const response: Response<string, TPayload> = {
      id: generateRequestId(),
      in_reply_to: request.id,
      type: request.type,
      ok: true,
      payload,
    }
    this.sendEvent(response)
  }

  public onEvent(type: string, callback: OnMessageFn): void {
    const callbacks = this.messageCallbacks.get(type)
    if (callbacks) {
      callbacks.push(callback)
    } else {
      this.messageCallbacks.set(type, [callback])
    }
  }

  private async handleEnvelope(event: MessageEvent<unknown>): Promise<void> {
    if (event.source !== this.otherWindow) {
      return
    }
    const envelope = this.parseEnvelope(event.data)
    if (!envelope) {
      return
    }
    // If we have in_reply_to set then this is a response
    if (envelope.in_reply_to) {
      this.handleResponse(envelope as ResponseEnvelope)
    } else {
      await this.handleEvent(envelope as Envelope)
    }
  }

  private async handleEvent(message: Envelope): Promise<void> {
    const callbacks = this.messageCallbacks.get(message.type)
    if (callbacks) {
      for (const callback of callbacks) {
        try {
          await callback(message)
        } catch (error) {
          console.error('[SourceBridge] error thrown in event callback: ', error)
        }
      }
    }
  }

  private handleResponse(message: ResponseEnvelope): void {
    const requestId = message.in_reply_to
    this.debug(`[SourceBridge] handling response to ${requestId}`, message)
    const resolve = this.openRequests.get(requestId)
    if (!resolve) {
      this.error(`[SourceBridge] Did not find resolve for request ${requestId}.`)
      return
    }
    this.openRequests.delete(requestId)
    resolve(message)
  }

  private parseEnvelope(data: unknown): Partial<ResponseEnvelope> | null {
    if (!data || typeof data !== 'string') {
      this.debug('Ignoring message that is not a string')
      return null
    }

    try {
      const envelope = JSON.parse(data) as Partial<Envelope>
      if (envelope.id && envelope.type) {
        return envelope
      }
      return null
    } catch (err) {
      this.debug('Ignoring message with invalid JSON:', data)
      return null
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private debug(message: any, ...optionalParams: any[]): void {
    if (this.config.debug === true) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      console.log(message, ...optionalParams)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private error(message: any, ...optionalParams: any[]): void {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    console.log(message, ...optionalParams)
  }
}
