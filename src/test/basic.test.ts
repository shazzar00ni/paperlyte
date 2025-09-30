import { describe, it, expect } from 'vitest'

describe('Basic Test Suite', () => {
  it('should pass a basic test', () => {
    expect(1 + 1).toBe(2)
  })

  it('should work with strings', () => {
    expect('hello').toBe('hello')
  })
})
