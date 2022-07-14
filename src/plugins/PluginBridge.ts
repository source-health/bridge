import { BridgeGuest } from '../BridgeGuest'
import { Auth } from '../types'

import { ContextPayload, HelloPayload, PluginInfoPayload } from './Messages'

export interface Context {
  member?: string
}

export interface PluginInfo {
  application: string
  viewKey: string
  surface: string
}

type OnContextFn = (context: Context) => Promise<void>

class PluginBridgeAPI {
  private onContextCallbacks: OnContextFn[] = []
  private context?: Context
  private pluginInfo?: PluginInfo

  public async init(onContextUpdate?: OnContextFn): Promise<PluginInfo> {
    if (onContextUpdate) {
      this.onContextCallbacks.push(onContextUpdate)
    }
    const helloPayload = await BridgeGuest.init<HelloPayload>({
      eventHandlers: {
        context: async (payload) => this.handleNewContext(payload as ContextPayload),
      },
      autoReady: false,
    })
    const info = this.handlePluginInfo(helloPayload.plugin_info)

    // Call the context callback with the initial context
    await this.handleNewContext(helloPayload.context)

    return info
  }

  public ready(): void {
    BridgeGuest.ready()
  }

  public async currentToken(): Promise<Auth> {
    return await BridgeGuest.currentToken()
  }

  public currentContext(): Context {
    if (!this.context) {
      console.error('[SourceBridge] called currentContext() before init().')
      throw new Error(
        'SourceBridge is not yet initialized. Please call `init()` before currentContext()',
      )
    }
    return this.context
  }

  public info(): PluginInfo {
    if (!this.pluginInfo) {
      console.error('[SourceBridge] called info() before init().')
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
    console.log('[SourceBridge] handling new context: ', context)
    this.context = context
    await Promise.allSettled(this.onContextCallbacks.map((callback) => callback(context)))
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

export const PluginBridge = new PluginBridgeAPI()
