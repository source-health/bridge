/**
 * on-the-wire JSON-stringified representations of the message payloads
 */

import { EventEnvelope, ResponseEnvelope } from './Envelope'

export type Response<TType extends string, TPayload> = ResponseEnvelope & {
  type: TType
  payload: TPayload
}

export type Event<TType extends string, TPayload> = EventEnvelope & {
  type: TType
  payload: TPayload
}

export interface AuthPayload {
  token: string
  expires_at: string
}

export type AuthenticationEvent = Event<'authentication', AuthPayload>
