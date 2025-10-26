import { describe, it, expect } from 'vitest'
import { isValidEmail, normalizeEmail } from '../validation'

describe('Validation Utilities', () => {
  describe('isValidEmail', () => {
    it('should validate correct email formats', () => {
      expect(isValidEmail('user@example.com')).toBe(true)
      expect(isValidEmail('test.user@domain.co.uk')).toBe(true)
      expect(isValidEmail('name+tag@company.org')).toBe(true)
    })

    it('should reject invalid email formats', () => {
      expect(isValidEmail('invalid')).toBe(false)
      expect(isValidEmail('@example.com')).toBe(false)
      expect(isValidEmail('user@')).toBe(false)
      expect(isValidEmail('user @example.com')).toBe(false)
      expect(isValidEmail('user@example')).toBe(false)
      expect(isValidEmail('')).toBe(false)
    })

    it('should reject emails with spaces', () => {
      expect(isValidEmail(' user@example.com')).toBe(false)
      expect(isValidEmail('user@example.com ')).toBe(false)
      expect(isValidEmail('user @example.com')).toBe(false)
    })
  })

  describe('normalizeEmail', () => {
    it('should convert email to lowercase', () => {
      expect(normalizeEmail('User@Example.COM')).toBe('user@example.com')
      expect(normalizeEmail('TEST@DOMAIN.ORG')).toBe('test@domain.org')
    })

    it('should trim whitespace', () => {
      expect(normalizeEmail(' user@example.com ')).toBe('user@example.com')
      expect(normalizeEmail('\tuser@example.com\n')).toBe('user@example.com')
    })

    it('should handle both lowercase and trim together', () => {
      expect(normalizeEmail(' User@Example.COM ')).toBe('user@example.com')
    })

    it('should handle empty strings', () => {
      expect(normalizeEmail('')).toBe('')
      expect(normalizeEmail('   ')).toBe('')
    })
  })
})
