import { BridgeGuest } from '../BridgeGuest'
import { Auth } from '../types'

import { ContextPayload, HelloPayload, PluginInfoPayload } from './Messages'

interface PluginBridgeOptions {
  debug?: boolean
}

export interface Context {
  member?: string
}

export interface PluginInfo {
  application: string
  viewKey: string
  surface: string
}

type OnContextFn = (context: Context) => Promise<void>

export class PluginBridge {
  private onContextCallbacks: OnContextFn[] = []
  private context?: Context
  private pluginInfo?: PluginInfo
  private bridgeGuest: BridgeGuest

  constructor(readonly options: PluginBridgeOptions = {}) {
    this.bridgeGuest = new BridgeGuest(parent, { debug: options.debug })
  }

  public async init(onContextUpdate?: OnContextFn): Promise<PluginInfo> {
    if (onContextUpdate) {
      this.onContextCallbacks.push(onContextUpdate)
    }
    const helloPayload = await this.bridgeGuest.init<HelloPayload>({
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
    this.bridgeGuest.ready()
  }

  public async currentToken(): Promise<Auth> {
    return await this.bridgeGuest.currentToken()
  }

  public currentContext(): Context {
    if (!this.context) {
      this.error('[SourceBridge] called currentContext() before init().')
      throw new Error(
        'SourceBridge is not yet initialized. Please call `init()` before currentContext()',
      )
    }
    return this.context
  }

  public info(): PluginInfo {
    if (!this.pluginInfo) {
      this.error('[SourceBridge] called info() before init().')
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
    this.debug('[SourceBridge] handling new context: ', context)
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private debug(message: any, ...optionalParams: any[]): void {
    if (this.options.debug === true) {
      console.log(message, optionalParams)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private error(message: any, ...optionalParams: any[]): void {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    console.log(message, ...optionalParams)
  }
}
