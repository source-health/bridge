import { Envelope } from './Envelope'

export type Event<TType extends string, TPayload> = Envelope & {
  type: TType
  payload: TPayload
}

export type EventHandlerFn<T> = (payload: T) => Promise<void>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyEventHandler = EventHandlerFn<any>
