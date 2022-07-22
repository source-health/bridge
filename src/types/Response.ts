import { Envelope } from './Envelope'

export interface ResponseEnvelope extends Envelope {
  in_reply_to: string
  ok: boolean
  error?: unknown
}

export type Response<TType extends string, TPayload> = ResponseEnvelope & {
  type: TType
  payload: TPayload
}
