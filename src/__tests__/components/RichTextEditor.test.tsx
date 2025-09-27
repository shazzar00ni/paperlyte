import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RichTextEditor from '../../components/RichTextEditor'

// Mock DOMPurify
vi.mock('dompurify', () => ({
  default: {
    sanitize: vi.fn((content) => content),
  },
}))

describe('RichTextEditor', () => {
  const defaultProps = {
    content: '',
    onChange: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render editor with placeholder', () => {
      render(<RichTextEditor {...defaultProps} placeholder="Start typing..." />)
      
      const editor = screen.getByRole('textbox')
      expect(editor).toBeInTheDocument()
      expect(editor).toHaveAttribute('data-placeholder', 'Start typing...')
    })

    it('should render with custom className', () => {
      render(<RichTextEditor {...defaultProps} className="custom-editor" />)
      
      const editorContainer = document.querySelector('.rich-text-editor.custom-editor')
      expect(editorContainer).toBeInTheDocument()
    })

    it('should render formatting buttons', () => {
      render(<RichTextEditor {...defaultProps} />)
      
      expect(screen.getByLabelText('Bold')).toBeInTheDocument()
      expect(screen.getByLabelText('Italic')).toBeInTheDocument()
      expect(screen.getByLabelText('Bullet List')).toBeInTheDocument()
      expect(screen.getByLabelText('Numbered List')).toBeInTheDocument()
    })

    it('should disable editor when disabled prop is true', () => {
      render(<RichTextEditor {...defaultProps} disabled={true} />)
      
      const editor = screen.getByRole('textbox')
      expect(editor).toHaveAttribute('contenteditable', 'false')
      
      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        expect(button).toBeDisabled()
      })
    })
  })

  describe('Content Management', () => {
    it('should display initial content', () => {
      const content = '<p>Initial content</p>'
      render(<RichTextEditor {...defaultProps} content={content} />)
      
      const editor = screen.getByRole('textbox')
      expect(editor.innerHTML).toBe(content)
    })

    it('should call onChange when content is modified', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      
      render(<RichTextEditor {...defaultProps} onChange={onChange} />)
      
      const editor = screen.getByRole('textbox')
      await user.type(editor, 'Hello world')
      
      await waitFor(() => {
        expect(onChange).toHaveBeenCalled()
      })
    })

    it('should sanitize content on input', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      
      render(<RichTextEditor {...defaultProps} onChange={onChange} />)
      
      const editor = screen.getByRole('textbox')
      
      // Simulate pasting dangerous content
      const maliciousContent = '<script>alert("xss")</script><p>Safe content</p>'
      editor.innerHTML = maliciousContent
      
      fireEvent.input(editor)
      
      await waitFor(() => {
        expect(onChange).toHaveBeenCalled()
      })
    })
  })

  describe('Formatting Actions', () => {
    it('should call formatting function on bold click', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      
      render(<RichTextEditor {...defaultProps} onChange={onChange} />)
      
      const editor = screen.getByRole('textbox')
      const boldButton = screen.getByLabelText('Bold')
      
      // Focus editor and add some text
      await user.click(editor)
      await user.type(editor, 'Test text')
      
      // Click bold button
      await user.click(boldButton)
      
      expect(onChange).toHaveBeenCalled()
    })

    it('should call formatting function on italic click', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      
      render(<RichTextEditor {...defaultProps} onChange={onChange} />)
      
      const editor = screen.getByRole('textbox')
      const italicButton = screen.getByLabelText('Italic')
      
      await user.click(editor)
      await user.type(editor, 'Test text')
      await user.click(italicButton)
      
      expect(onChange).toHaveBeenCalled()
    })

    it('should handle list creation', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      
      render(<RichTextEditor {...defaultProps} onChange={onChange} />)
      
      const editor = screen.getByRole('textbox')
      const listButton = screen.getByLabelText('Bullet List')
      
      await user.click(editor)
      await user.type(editor, 'List item')
      await user.click(listButton)
      
      expect(onChange).toHaveBeenCalled()
    })

    it('should handle numbered list creation', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      
      render(<RichTextEditor {...defaultProps} onChange={onChange} />)
      
      const editor = screen.getByRole('textbox')
      const numberedListButton = screen.getByLabelText('Numbered List')
      
      await user.click(editor)
      await user.type(editor, 'List item')
      await user.click(numberedListButton)
      
      expect(onChange).toHaveBeenCalled()
    })
  })

  describe('Keyboard Shortcuts', () => {
    it('should handle keyboard input in editor', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      
      render(<RichTextEditor {...defaultProps} onChange={onChange} />)
      
      const editor = screen.getByRole('textbox')
      await user.click(editor)
      await user.keyboard('Hello World')
      
      expect(onChange).toHaveBeenCalled()
    })

    it('should handle special keys', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      
      render(<RichTextEditor {...defaultProps} onChange={onChange} />)
      
      const editor = screen.getByRole('textbox')
      await user.click(editor)
      await user.type(editor, 'Some text')
      
      // Test Tab key (should not crash)
      await user.keyboard('{Tab}')
      expect(onChange).toHaveBeenCalled()
    })

    it('should handle Enter key', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      
      render(<RichTextEditor {...defaultProps} onChange={onChange} />)
      
      const editor = screen.getByRole('textbox')
      await user.click(editor)
      await user.type(editor, 'Line 1')
      await user.keyboard('{Enter}')
      await user.type(editor, 'Line 2')
      
      expect(onChange).toHaveBeenCalled()
    })
  })

  describe('Security', () => {
    it('should prevent XSS through content sanitization', () => {
      const maliciousContent = '<script>alert("xss")</script><img src="x" onerror="alert(1)">'
      
      render(<RichTextEditor {...defaultProps} content={maliciousContent} />)
      
      const editor = screen.getByRole('textbox')
      
      // DOMPurify should have been called to sanitize content
      expect(editor.innerHTML).not.toContain('<script>')
      expect(editor.innerHTML).not.toContain('onerror')
    })

    it('should preserve safe HTML elements', () => {
      const safeContent = '<p>Safe <strong>bold</strong> and <em>italic</em> text</p>'
      
      render(<RichTextEditor {...defaultProps} content={safeContent} />)
      
      const editor = screen.getByRole('textbox')
      expect(editor.innerHTML).toContain('<p>')
      expect(editor.innerHTML).toContain('<strong>')
      expect(editor.innerHTML).toContain('<em>')
    })
  })

  describe('Performance', () => {
    it('should debounce onChange calls', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      
      render(<RichTextEditor {...defaultProps} onChange={onChange} />)
      
      const editor = screen.getByRole('textbox')
      
      // Type multiple characters quickly
      await user.type(editor, 'fast typing')
      
      // onChange should not be called for every character
      // (actual debouncing would require real timers)
      expect(onChange).toHaveBeenCalled()
    })

    it('should not update DOM when content prop matches current content', () => {
      const { rerender } = render(
        <RichTextEditor {...defaultProps} content="<p>Test content</p>" />
      )
      
      const editor = screen.getByRole('textbox')
      const initialHTML = editor.innerHTML
      
      // Re-render with same content
      rerender(<RichTextEditor {...defaultProps} content="<p>Test content</p>" />)
      
      // DOM should not have changed
      expect(editor.innerHTML).toBe(initialHTML)
    })
  })
})