export const messageTypes = ['hello', 'ready', 'context', 'authentication'] as const
export type MessageType = typeof messageTypes[number]
