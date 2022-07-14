import { Envelope } from './Envelope'

export type Request<TType extends string, TPayload> = Envelope & {
  type: TType
  payload?: TPayload
}

export type RequestHandlerFn<TRequestPayload, TResponsePayload> = (
  payload: TRequestPayload,
) => Promise<TResponsePayload>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyRequestHandler = RequestHandlerFn<any, any>
