/**
 * Tests for note utility functions
 */

import { describe, it, expect } from 'vitest'
import {
  calculateWordCount,
  sanitizeTitle,
  sanitizeContent,
  validateNote,
} from '../noteUtils'

describe('Note Utilities', () => {
  describe('calculateWordCount', () => {
    it('should count words correctly in simple text', () => {
      expect(calculateWordCount('Hello world')).toBe(2)
      expect(calculateWordCount('One two three four five')).toBe(5)
    })

    it('should handle empty or whitespace-only text', () => {
      expect(calculateWordCount('')).toBe(0)
      expect(calculateWordCount('   ')).toBe(0)
      expect(calculateWordCount('\n\t  \n')).toBe(0)
    })

    it('should handle text with multiple spaces', () => {
      expect(calculateWordCount('Hello    world')).toBe(2)
      expect(calculateWordCount('  Hello  world  ')).toBe(2)
    })

    it('should remove HTML tags before counting', () => {
      expect(calculateWordCount('<p>Hello world</p>')).toBe(2)
      expect(
        calculateWordCount('<div><p>Test</p><span>content</span></div>')
      ).toBe(2)
    })

    it('should handle newlines and tabs', () => {
      expect(calculateWordCount('Hello\nworld')).toBe(2)
      expect(calculateWordCount('Hello\tworld\ntest')).toBe(3)
    })

    it('should handle invalid input', () => {
      expect(calculateWordCount(null as any)).toBe(0)
      expect(calculateWordCount(undefined as any)).toBe(0)
      expect(calculateWordCount(123 as any)).toBe(0)
    })
  })

  describe('sanitizeTitle', () => {
    it('should trim whitespace', () => {
      expect(sanitizeTitle('  Hello  ')).toBe('Hello')
      expect(sanitizeTitle('\nTest\n')).toBe('Test')
    })

    it('should remove HTML tags', () => {
      expect(sanitizeTitle('<script>alert("xss")</script>Clean')).toBe('Clean')
      expect(sanitizeTitle('<b>Bold</b> text')).toBe('Bold text')
    })

    it('should remove control characters', () => {
      expect(sanitizeTitle('Hello\x00World')).toBe('HelloWorld')
      expect(sanitizeTitle('Test\x1FString')).toBe('TestString')
    })

    it('should limit length to 255 characters', () => {
      const longTitle = 'a'.repeat(300)
      const sanitized = sanitizeTitle(longTitle)
      expect(sanitized.length).toBe(255)
    })

    it('should handle empty or invalid input', () => {
      expect(sanitizeTitle('')).toBe('')
      expect(sanitizeTitle(null as any)).toBe('')
      expect(sanitizeTitle(undefined as any)).toBe('')
    })

    it('should preserve Unicode characters', () => {
      expect(sanitizeTitle('Hello 世界')).toBe('Hello 世界')
      expect(sanitizeTitle('Test émoji 🎉')).toBe('Test émoji 🎉')
    })
  })

  describe('sanitizeContent', () => {
    it('should remove script tags', () => {
      const content = '<script>alert("xss")</script>Safe content'
      expect(sanitizeContent(content)).not.toContain('<script>')
      expect(sanitizeContent(content)).toContain('Safe content')
    })

    it('should remove event handlers', () => {
      const content = '<div onclick="malicious()">Content</div>'
      expect(sanitizeContent(content)).not.toContain('onclick')
    })

    it('should remove javascript: protocol', () => {
      const content = '<a href="javascript:alert(1)">Link</a>'
      expect(sanitizeContent(content)).not.toContain('javascript:')
    })

    it('should handle multiple script tags', () => {
      const content = '<script>bad1()</script>Text<script>bad2()</script>'
      const sanitized = sanitizeContent(content)
      expect(sanitized).not.toContain('<script>')
      expect(sanitized).toContain('Text')
    })

    it('should handle empty or invalid input', () => {
      expect(sanitizeContent('')).toBe('')
      expect(sanitizeContent(null as any)).toBe('')
      expect(sanitizeContent(undefined as any)).toBe('')
    })

    it('should preserve safe HTML tags', () => {
      // Note: Current implementation removes script tags but preserves others
      const content = '<p>Paragraph</p><b>Bold</b>'
      const sanitized = sanitizeContent(content)
      expect(sanitized).toContain('<p>')
      expect(sanitized).toContain('<b>')
    })
  })

  describe('validateNote', () => {
    it('should accept valid notes', () => {
      const note = {
        title: 'Valid Title',
        content: 'Valid content',
      }
      expect(validateNote(note)).toBeNull()
    })

    it('should reject notes with empty title', () => {
      const note = {
        title: '',
        content: 'Content',
      }
      expect(validateNote(note)).toBe('Note title is required')
    })

    it('should reject notes with whitespace-only title', () => {
      const note = {
        title: '   ',
        content: 'Content',
      }
      expect(validateNote(note)).toBe('Note title is required')
    })

    it('should reject notes with title exceeding 255 characters', () => {
      const note = {
        title: 'a'.repeat(300),
        content: 'Content',
      }
      expect(validateNote(note)).toBe(
        'Note title must be 255 characters or less'
      )
    })

    it('should accept notes without content', () => {
      const note = {
        title: 'Title only',
      }
      expect(validateNote(note)).toBeNull()
    })

    it('should reject notes with content exceeding 10MB', () => {
      const note = {
        title: 'Valid Title',
        content: 'a'.repeat(11 * 1024 * 1024), // 11MB
      }
      expect(validateNote(note)).toBe(
        'Note content is too large (maximum 10MB)'
      )
    })

    it('should accept title exactly 255 characters', () => {
      const note = {
        title: 'a'.repeat(255),
        content: 'Content',
      }
      expect(validateNote(note)).toBeNull()
    })
  })
})
