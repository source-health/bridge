import { EventEnvelope, ResponseEnvelope } from './Envelope'

type ResolveFn<T> = (value: T) => void
type OnMessageFn = (envelope: EventEnvelope) => Promise<void>

export class SourceBridgeClient {
  // Map where we keep track of open requests and their promise resolve callbacks
  private openRequests: Map<string, ResolveFn<unknown>> = new Map()

  // Map where we keep track of event subscriptions
  private messageCallbacks: Map<string, OnMessageFn[]> = new Map()

  constructor() {
    window.addEventListener('message', (event) => {
      // Because we allow async callbacks, handleEnvelope is async, but addEventListener only takes non-async callbacks
      // so we use `void` operator to allow using an async function here.
      void this.handleEnvelope(event)
    })
  }

  public sendEvent(message: EventEnvelope): void {
    console.log('[SourceBridge] sending message to parent: ', message)
    parent.postMessage(JSON.stringify(message), '*')
  }

  public async sendRequest<TResponse>(message: EventEnvelope): Promise<TResponse> {
    const promise = new Promise<TResponse>((resolve, _reject) => {
      this.openRequests.set(message.id, resolve as ResolveFn<unknown>)
    })
    console.log('[SourceBridge] sending request to parent: ', message)
    parent.postMessage(JSON.stringify(message), '*')
    return promise
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
    if (event.source !== parent) {
      console.log('[SourceBridge] Ignoring message event from non-parent.')
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
      await this.handleEvent(envelope as EventEnvelope)
    }
  }

  private async handleEvent(message: EventEnvelope): Promise<void> {
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
    console.log(`[SourceBridge] handling response to ${requestId}`, message)
    const resolve = this.openRequests.get(requestId)
    if (!resolve) {
      console.error(`[SourceBridge] Did not find resolve for request ${requestId}.`)
      return
    }
    this.openRequests.delete(requestId)
    resolve(message)
  }

  private parseEnvelope(data: unknown): Partial<ResponseEnvelope> | null {
    try {
      const envelope = JSON.parse(data as string) as Partial<EventEnvelope>
      if (envelope.id && envelope.type) {
        return envelope
      }
      console.error('[SourceBridge] received non-Source-envelope message: ', envelope)
      return null
    } catch (err) {
      console.error('[SourceBridge] received non-JSON message: ', data, err)
      return null
    }
  }
}
