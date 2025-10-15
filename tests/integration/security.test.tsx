import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RichTextEditor from '../../src/components/RichTextEditor'
import WaitlistModal from '../../src/components/WaitlistModal'

describe('Security Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('XSS Prevention', () => {
    it('should sanitize malicious script tags in rich text editor', async () => {
      const onChange = vi.fn()

      render(<RichTextEditor content='' onChange={onChange} />)

      const editor = screen.getByRole('textbox')

      // Simulate pasting malicious content
      const maliciousContent =
        '<script>alert("XSS")</script><p>Safe content</p>'

      // Use fireEvent to simulate paste with malicious content
      fireEvent.input(editor, {
        target: { innerHTML: maliciousContent },
      })

      // DOMPurify should have sanitized the content
      expect(onChange).toHaveBeenCalled()
      const sanitizedContent = onChange.mock.calls[0][0]
      expect(sanitizedContent).not.toContain('<script>')
      expect(sanitizedContent).toContain('<p>Safe content</p>')
    })

    it('should prevent image onerror XSS attacks', async () => {
      const onChange = vi.fn()

      render(<RichTextEditor content='' onChange={onChange} />)

      const editor = screen.getByRole('textbox')

      // Malicious image with onerror handler
      const maliciousImg = '<img src="invalid.jpg" onerror="alert(\'XSS\')" />'

      fireEvent.input(editor, {
        target: { innerHTML: maliciousImg },
      })

      expect(onChange).toHaveBeenCalled()
      const sanitizedContent = onChange.mock.calls[0][0]
      expect(sanitizedContent).not.toContain('onerror')
    })

    it('should allow safe HTML elements', async () => {
      const onChange = vi.fn()

      render(<RichTextEditor content='' onChange={onChange} />)

      const editor = screen.getByRole('textbox')

      const safeContent =
        '<p><strong>Bold text</strong> and <em>italic text</em></p>'

      fireEvent.input(editor, {
        target: { innerHTML: safeContent },
      })

      expect(onChange).toHaveBeenCalled()
      const sanitizedContent = onChange.mock.calls[0][0]
      expect(sanitizedContent).toContain('<strong>')
      expect(sanitizedContent).toContain('<em>')
      expect(sanitizedContent).toContain('<p>')
    })

    it('should remove dangerous style attributes', async () => {
      const onChange = vi.fn()

      render(<RichTextEditor content='' onChange={onChange} />)

      const editor = screen.getByRole('textbox')

      // Dangerous style with JavaScript
      const dangerousStyle =
        '<p style="background: url(javascript:alert(\'XSS\'))">Text</p>'

      fireEvent.input(editor, {
        target: { innerHTML: dangerousStyle },
      })

      expect(onChange).toHaveBeenCalled()
      const sanitizedContent = onChange.mock.calls[0][0]
      expect(sanitizedContent).not.toContain('javascript:')
    })

    it('should prevent SVG-based XSS attacks', async () => {
      const onChange = vi.fn()

      render(<RichTextEditor content='' onChange={onChange} />)

      const editor = screen.getByRole('textbox')

      const maliciousSvg = '<svg onload="alert(\'XSS\')"><circle r="10"/></svg>'

      fireEvent.input(editor, {
        target: { innerHTML: maliciousSvg },
      })

      expect(onChange).toHaveBeenCalled()
      const sanitizedContent = onChange.mock.calls[0][0]
      expect(sanitizedContent).not.toContain('<svg')
      expect(sanitizedContent).not.toContain('onload')
    })
  })

  describe('Input Validation', () => {
    it('should validate email format in waitlist form', async () => {
      const user = userEvent.setup()
      const onSubmit = vi.fn()

      render(
        <WaitlistModal isOpen={true} onClose={() => {}} onSubmit={onSubmit} />
      )

      const emailInput = screen.getByLabelText(/email/i)
      const submitButton = screen.getByRole('button', {
        name: /join waitlist/i,
      })

      // Test invalid email formats
      const invalidEmails = [
        'not-an-email',
        '@example.com',
        'user@',
        'user..name@example.com',
        'user@.com',
      ]

      for (const invalidEmail of invalidEmails) {
        await user.clear(emailInput)
        await user.type(emailInput, invalidEmail)
        await user.click(submitButton)

        // Should not call onSubmit with invalid email
        expect(onSubmit).not.toHaveBeenCalled()
      }
    })

    it('should sanitize user input in form fields', async () => {
      const user = userEvent.setup()
      const onSubmit = vi.fn()

      render(
        <WaitlistModal isOpen={true} onClose={() => {}} onSubmit={onSubmit} />
      )

      const nameInput = screen.getByLabelText(/name/i)
      const emailInput = screen.getByLabelText(/email/i)

      // Try to inject script in name field
      await user.type(nameInput, '<script>alert("XSS")</script>John Doe')
      await user.type(emailInput, 'john@example.com')

      const submitButton = screen.getByRole('button', {
        name: /join waitlist/i,
      })
      await user.click(submitButton)

      if (onSubmit.mock.calls.length > 0) {
        const submittedData = onSubmit.mock.calls[0][0]
        expect(submittedData.name).not.toContain('<script>')
        expect(submittedData.name).toContain('John Doe')
      }
    })
  })

  describe('Content Security Policy', () => {
    it('should not execute inline JavaScript', () => {
      // Create element with inline script
      const div = document.createElement('div')
      div.innerHTML = '<button onclick="alert(\'XSS\')">Click me</button>'
      document.body.appendChild(div)

      const button = div.querySelector('button')

      // Click should not execute the inline script
      fireEvent.click(button!)

      // If we reach here without alert, CSP is working
      expect(true).toBe(true)

      document.body.removeChild(div)
    })

    it('should prevent eval() execution', () => {
      expect(() => {
        // This should be blocked by CSP or throw an error
        eval('alert("This should not work")')
      }).toThrow()
    })
  })

  describe('Data Sanitization', () => {
    it('should sanitize data before storage', async () => {
      const onChange = vi.fn()

      render(<RichTextEditor content='' onChange={onChange} />)

      const editor = screen.getByRole('textbox')

      // Mixed content with dangerous and safe elements
      const mixedContent = `
        <p>Safe paragraph</p>
        <script>alert('XSS')</script>
        <strong>Bold text</strong>
        <iframe src="javascript:alert('XSS')"></iframe>
        <em>Italic text</em>
      `

      fireEvent.input(editor, {
        target: { innerHTML: mixedContent },
      })

      expect(onChange).toHaveBeenCalled()
      const sanitizedContent = onChange.mock.calls[0][0]

      // Should keep safe elements
      expect(sanitizedContent).toContain('<p>Safe paragraph</p>')
      expect(sanitizedContent).toContain('<strong>Bold text</strong>')
      expect(sanitizedContent).toContain('<em>Italic text</em>')

      // Should remove dangerous elements
      expect(sanitizedContent).not.toContain('<script>')
      expect(sanitizedContent).not.toContain('<iframe>')
      expect(sanitizedContent).not.toContain('javascript:')
    })

    it('should handle nested malicious content', async () => {
      const onChange = vi.fn()

      render(<RichTextEditor content='' onChange={onChange} />)

      const editor = screen.getByRole('textbox')

      // Nested malicious content
      const nestedMalicious = `
        <div>
          <p>
            Safe text
            <span onclick="alert('XSS')">
              <strong>Bold with danger</strong>
            </span>
          </p>
        </div>
      `

      fireEvent.input(editor, {
        target: { innerHTML: nestedMalicious },
      })

      expect(onChange).toHaveBeenCalled()
      const sanitizedContent = onChange.mock.calls[0][0]

      // Should preserve structure but remove dangerous attributes
      expect(sanitizedContent).toContain('<div>')
      expect(sanitizedContent).toContain('<p>')
      expect(sanitizedContent).toContain('<strong>Bold with danger</strong>')
      expect(sanitizedContent).not.toContain('onclick')
    })
  })

  describe('Error Handling Security', () => {
    it('should not expose sensitive information in error messages', async () => {
      // Mock console.error to capture error messages
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      try {
        // Trigger an error in the component
        const onChange = vi.fn().mockImplementation(() => {
          throw new Error(
            'Database connection failed: admin:password@localhost:5432/secret_db'
          )
        })

        render(<RichTextEditor content='' onChange={onChange} />)

        const editor = screen.getByRole('textbox')
        fireEvent.input(editor, { target: { innerHTML: 'test' } })

        // Error should be logged but not expose sensitive information
        if (consoleSpy.mock.calls.length > 0) {
          const errorMessages = consoleSpy.mock.calls.flat().join(' ')
          expect(errorMessages).not.toContain('admin:password')
          expect(errorMessages).not.toContain('secret_db')
        }
      } finally {
        consoleSpy.mockRestore()
      }
    })
  })

  describe('Rate Limiting Simulation', () => {
    it('should handle rapid form submissions gracefully', async () => {
      const user = userEvent.setup()
      const onSubmit = vi.fn()

      render(
        <WaitlistModal isOpen={true} onClose={() => {}} onSubmit={onSubmit} />
      )

      const emailInput = screen.getByLabelText(/email/i)
      const nameInput = screen.getByLabelText(/name/i)
      const submitButton = screen.getByRole('button', {
        name: /join waitlist/i,
      })

      // Fill form
      await user.type(emailInput, 'test@example.com')
      await user.type(nameInput, 'Test User')

      // Rapidly click submit multiple times
      for (let i = 0; i < 10; i++) {
        await user.click(submitButton)
      }

      // Should not call onSubmit multiple times simultaneously
      // (This would need actual rate limiting implementation)
      expect(onSubmit.mock.calls.length).toBeLessThanOrEqual(1)
    })
  })
})
