export function generateRequestId(): string {
  return Math.random().toString(32).substring(2)
}
