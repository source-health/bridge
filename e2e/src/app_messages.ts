import { Event, Request, Response } from '../../src'

export interface FooPayload {
  value: string
  sender: string
}
export type FooEvent = Event<'foo', FooPayload>

export interface MyRequestPayload {
  value: string
  sender: string
}
export type MyRequest = Request<'my', MyRequestPayload>

export interface MyResponsePayload {
  sum: number
  sender: string
}
export type MyResponse = Response<'my', MyResponsePayload>
