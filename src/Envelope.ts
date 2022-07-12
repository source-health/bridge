export interface EventEnvelope {
  id: string
  type: string
  payload?: unknown
}

export interface ResponseEnvelope extends EventEnvelope {
  in_reply_to: string
  ok: boolean
  error?: unknown
}
