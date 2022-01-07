// From https://stackoverflow.com/a/10727155
function randomString(length: number, chars: string) {
  let result = ''
  for (let i = length; i > 0; --i) result += chars[Math.round(Math.random() * (chars.length - 1))]
  return result
}

export function generateRequestId(): string {
  return randomString(16, '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ')
}
