import { generateRequestId } from './generateRequestId'

describe('generateRequestId', () => {
  it('generates IDs', () => {
    const id1 = generateRequestId()
    const id2 = generateRequestId()
    expect(id1.length).toBe(16)
    expect(id1).not.toBe(id2)
  })
})
