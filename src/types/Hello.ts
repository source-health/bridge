import { AuthPayload } from './Auth'
import { Request } from './Request'
import { Response } from './Response'

export interface HelloPayload {
  auth?: AuthPayload
}

export type HelloRequest = Request<'hello', undefined>
export type HelloResponse = Response<'hello', HelloPayload>
