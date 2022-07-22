export enum BridgeErrors {
  NotStarted = 'not_started',
  NotReady = 'not_ready',
}

export class BridgeError extends Error {
  constructor(public readonly cause: BridgeErrors) {
    super('Loading Source Bridge guest failed')
  }
}
