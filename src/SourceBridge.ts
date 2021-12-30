import {
  AuthPayload,
  AuthenticationEvent,
  ContextEvent,
  ContextPayload,
  HelloResponse,
  PluginInfoPayload,
} from './Messages'
import { SourceBridgeClient } from './SourceBridgeClient'
import { generateRequestId } from './generateRequestId'

export interface Context {
  member?: string
}

export interface Auth {
  token: string
  expiresAt: Date
}

export interface PluginInfo {
  application: string
  viewKey: string
  surface: string
}

type OnContextFn = (context: Context) => Promise<void>

class SourceBridgeAPI {
  private client: SourceBridgeClient
  private onContextCallbacks: OnContextFn[] = []
  private auth?: Auth
  private context?: Context
  private pluginInfo?: PluginInfo

  constructor() {
    this.client = new SourceBridgeClient()
  }

  public async init(): Promise<PluginInfo> {
    const response = await this.client.sendRequest<HelloResponse>({
      type: 'hello',
      id: generateRequestId(),
    })
    this.handleNewAuth(response.payload.auth)
    const info = this.handlePluginInfo(response.payload.plugin_info)
    // Call the context callback with the initial context
    await this.handleNewContext(response.payload.context)

    // Subscribe to any further context events
    this.client.onEvent('context', async (envelope) => {
      const context = (envelope as ContextEvent).payload
      await this.handleNewContext(context)
    })

    // Subscribe to any auth events
    // eslint-disable-next-line @typescript-eslint/require-await
    this.client.onEvent('authentication', async (envelope) => {
      this.handleNewAuth((envelope as AuthenticationEvent).payload)
    })

    return info
  }

  public ready(): void {
    this.client.sendEvent({
      type: 'ready',
      id: generateRequestId(),
    })
  }

  // This is async because we intend to add 'fetch on demand' when the current token is
  // expired (e.g. if the tab has been throttled by the browser, or the computer has been
  // suspended.)
  // eslint-disable-next-line @typescript-eslint/require-await
  public async currentToken(): Promise<Auth> {
    if (!this.auth) {
      console.error('[SourceBridge] called currentToken() before init()')
      throw new Error(
        'SourceBridge is not yet initialized. Please call `init()` before currentToken()',
      )
    }
    return this.auth
  }

  public currentContext(): Context {
    if (!this.context) {
      console.error('[SourceBridge] called currentContext() before init()')
      throw new Error(
        'SourceBridge is not yet initialized. Please call `init()` before currentContext()',
      )
    }
    return this.context
  }

  public info(): PluginInfo {
    if (!this.pluginInfo) {
      console.error('[SourceBridge] called info() before init()')
      throw new Error('SourceBridge is not yet initialized. Please call `init()` before info()')
    }
    return this.pluginInfo
  }

  public async onContextUpdate(callback: OnContextFn): Promise<void> {
    this.onContextCallbacks.push(callback)
    // We immediately call the callback if we already have received context, in case
    // the developer forgot to set up the callbacks before running init()
    if (this.context) {
      await callback(this.context)
    }
  }

  private async handleNewContext(context: ContextPayload): Promise<void> {
    console.log('[SourceBridge] handling new context', context)
    this.context = context
    await Promise.allSettled(this.onContextCallbacks.map((callback) => callback(context)))
  }

  private handleNewAuth(auth: AuthPayload): void {
    console.log('[SourceBridge] handling new application token')
    this.auth = {
      token: auth.token,
      expiresAt: new Date(auth.expires_at),
    }
  }

  private handlePluginInfo(info: PluginInfoPayload): PluginInfo {
    const mapped = {
      application: info.application,
      viewKey: info.view_key,
      surface: info.surface,
    }
    this.pluginInfo = mapped
    return mapped
  }
}

export const SourceBridge = new SourceBridgeAPI()
