/**
 * on-the-wire JSON-stringified representations of the message payloads
 */

import { AuthPayload } from '../types'

export interface ContextPayload {
  member?: string
}

export interface PluginInfoPayload {
  application: string
  view_key: string
  surface: string
}

export interface HelloPayload {
  context: ContextPayload
  auth: AuthPayload
  plugin_info: PluginInfoPayload
}
