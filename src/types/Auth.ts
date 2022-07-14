import { Event } from './Event'
import { Request } from './Request'
import { Response } from './Response'

export interface Auth {
  token: string
  expiresAt: Date
}

export interface AuthPayload {
  token: string
  expires_at: string
}

export type AuthenticationEvent = Event<'authentication', AuthPayload>
export type AuthenticationRequest = Request<'authentication', undefined>
export type AuthenticationResponse = Response<'authentication', AuthPayload>
