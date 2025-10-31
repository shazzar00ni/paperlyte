import DOMPurify from 'dompurify'
import { Bold, Italic, List, ListOrdered } from 'lucide-react'
import React, { useCallback, useEffect, useRef } from 'react'
/**
 * @interface RichTextEditorProps
 * @description Defines the props for the RichTextEditor component.
 * @property {string} content - The initial HTML content of the editor.
 * @property {(content: string) => void} onChange - Callback function triggered when the editor content changes.
 * @property {string} [placeholder] - Optional placeholder text to display when the editor is empty.
 * @property {string} [className] - Optional CSS class name for custom styling.
 * @property {boolean} [disabled] - Optional flag to disable the editor.
 */
interface RichTextEditorProps {
  content: string
  onChange: (content: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

/**
 * @component RichTextEditor
 * @description A lightning-fast rich text editor built with contenteditable.
 * It supports bold, italic, and list formatting, along with keyboard shortcuts.
 * The editor sanitizes input to prevent XSS attacks.
 * @param {RichTextEditorProps} props - The props for the component.
 * @returns {React.ReactElement} - The rendered rich text editor.
 */
const RichTextEditor: React.FC<RichTextEditorProps> = ({
  content,
  onChange,
  placeholder = 'Start writing your thoughts...',
  className = '',
  disabled = false,
}) => {
  const editorRef = useRef<HTMLDivElement>(null)
  const isUpdatingRef = useRef(false)

  // Synchronize the editor's content with the `content` prop.
  // This effect runs when the `content` prop changes.
  // It avoids updating the DOM if the user is currently typing.
  useEffect(() => {
    if (editorRef.current && !isUpdatingRef.current) {
      const currentContent = editorRef.current.innerHTML
      // Sanitize the incoming content to prevent XSS vulnerabilities.
      const sanitizedContent = DOMPurify.sanitize(content || '', {
        ALLOWED_TAGS: [
          'b',
          'strong',
          'i',
          'em',
          'u',
          'ul',
          'ol',
          'li',
          'br',
          'div',
          'span',
          'p',
        ],
        ALLOWED_ATTR: ['style'],
      })
      // Only update the DOM if the content has actually changed.
      if (currentContent !== sanitizedContent) {
        editorRef.current.innerHTML = sanitizedContent
      }
    }
  }, [content])

  /**
   * @function handleInput
   * @description Handles the `onInput` event of the contenteditable element.
   * It reads the raw HTML, sanitizes it, and then calls the `onChange` callback.
   * A ref `isUpdatingRef` is used to prevent race conditions with the `useEffect`.
   */
  const handleInput = useCallback(() => {
    if (editorRef.current && !isUpdatingRef.current) {
      isUpdatingRef.current = true
      const rawContent = editorRef.current.innerHTML
      // Sanitize the user's input to ensure it's safe.
      const sanitizedContent = DOMPurify.sanitize(rawContent, {
        ALLOWED_TAGS: [
          'b',
          'strong',
          'i',
          'em',
          'u',
          'ul',
          'ol',
          'li',
          'br',
          'div',
          'span',
          'p',
        ],
        ALLOWED_ATTR: ['style'],
      })
      onChange(sanitizedContent)
      // Use a short timeout to reset the update flag, allowing external changes.
      setTimeout(() => {
        isUpdatingRef.current = false
      }, 10)
    }
  }, [onChange])

  /**
   * @function wrapSelectionWithTag
   * @description A helper function to wrap the current text selection with a given HTML tag.
   * @param {string} tag - The HTML tag to wrap the selection with (e.g., 'b', 'i').
   */
  const wrapSelectionWithTag = (tag: string) => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return
    const range = selection.getRangeAt(0)
    if (range.collapsed) return
    const wrapper = document.createElement(tag)
    wrapper.appendChild(range.extractContents())
    range.insertNode(wrapper)
    // Restore the selection to the end of the newly wrapped content.
    selection.removeAllRanges()
    const newRange = document.createRange()
    newRange.selectNodeContents(wrapper)
    newRange.collapse(false)
    selection.addRange(newRange)
  }

  /**
   * @function formatText
   * @description Applies text formatting commands to the selection.
   * This function uses the `wrapSelectionWithTag` helper for basic formatting.
   * @param {string} command - The formatting command to apply (e.g., 'bold', 'italic').
   * @param {string} [value] - An optional value for commands that require it (e.g., 'formatBlock').
   */
  const formatText = useCallback(
    (command: string, value?: string) => {
      if (disabled) return
      if (!editorRef.current) return

      switch (command) {
        case 'bold':
          wrapSelectionWithTag('b')
          break
        case 'italic':
          wrapSelectionWithTag('i')
          break
        case 'underline':
          wrapSelectionWithTag('u')
          break
        // Stubs for more complex list handling.
        case 'outdent':
          // This can be expanded with custom logic for list indentation.
          break
        case 'formatBlock':
          // Handles changing the block-level element, e.g., to a 'div'.
          if (value === 'div') {
            const selection = window.getSelection()
            if (selection && selection.rangeCount > 0) {
              const range = selection.getRangeAt(0)
              let block = range.startContainer
              // Find the parent block element.
              while (block && block.nodeType === 3 && block.parentNode) {
                block = block.parentNode
              }
              if (
                block &&
                block instanceof HTMLElement &&
                block !== editorRef.current
              ) {
                const div = document.createElement('div')
                div.innerHTML = block.innerHTML
                block.replaceWith(div)
              }
            }
          }
          break
        default:
          break
      }
      editorRef.current.focus()
      handleInput() // Trigger an update after formatting.
    },
    [disabled, handleInput]
  )

  /**
   * @function handleKeyDown
   * @description Handles keyboard shortcuts for text formatting (Ctrl+B, Ctrl+I, Ctrl+U).
   * It also includes logic for handling the Enter key within list items.
   * @param {React.KeyboardEvent} e - The keyboard event.
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return

      // Standard formatting shortcuts.
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'b':
            e.preventDefault()
            formatText('bold')
            break
          case 'i':
            e.preventDefault()
            formatText('italic')
            break
          case 'u':
            e.preventDefault()
            formatText('underline')
            break
        }
      }

      // Handle the Enter key to exit an empty list item.
      if (e.key === 'Enter') {
        const selection = window.getSelection()
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0)
          const listItem = range.startContainer.parentElement?.closest('li')

          if (listItem && listItem.textContent?.trim() === '') {
            // If the list item is empty, pressing Enter will exit the list.
            e.preventDefault()
            formatText('outdent')
            formatText('formatBlock', 'div')
          }
        }
      }
    },
    [disabled, formatText]
  )

  /**
   * @function handlePaste
   * @description Intercepts the paste event to sanitize and insert plain text.
   * This prevents pasting of complex HTML and potential XSS vectors.
   * @param {React.ClipboardEvent} e - The clipboard event.
   */
  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      if (disabled) return

      e.preventDefault()
      const text = e.clipboardData.getData('text/plain')
      const selection = window.getSelection()
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0)
        range.deleteContents()
        const textNode = document.createTextNode(text)
        range.insertNode(textNode)
        // Move the cursor to the end of the pasted content.
        range.setStartAfter(textNode)
        range.collapse(true)
        selection.removeAllRanges()
        selection.addRange(range)
      }
      handleInput()
    },
    [disabled, handleInput]
  )

  /**
   * @function isActive
   * @description Checks if a given formatting command is active at the current selection.
   * It traverses the DOM tree upwards from the selection to find matching tags or styles.
   * @param {string} command - The command to check (e.g., 'bold', 'italic').
   * @returns {boolean} - True if the command is active, false otherwise.
   */
  const isActive = useCallback(
    (command: string): boolean => {
      if (disabled) return false
      const selection = window.getSelection()
      if (!selection || selection.rangeCount === 0) return false
      let node = selection.focusNode
      // Start from the parent element if the selection is a text node.
      if (node && node.nodeType === Node.TEXT_NODE) {
        node = node.parentElement
      }
      if (!node) return false
      // Check for the active state by walking up the DOM tree.
      switch (command) {
        case 'bold':
          while (node && node !== editorRef.current) {
            if (
              node.nodeName === 'B' ||
              node.nodeName === 'STRONG' ||
              (node instanceof HTMLElement && node.style.fontWeight === 'bold')
            ) {
              return true
            }
            node = node.parentElement
          }
          return false
        case 'italic':
          while (node && node !== editorRef.current) {
            if (
              node.nodeName === 'I' ||
              node.nodeName === 'EM' ||
              (node instanceof HTMLElement && node.style.fontStyle === 'italic')
            ) {
              return true
            }
            node = node.parentElement
          }
          return false
        case 'underline':
          while (node && node !== editorRef.current) {
            if (
              node.nodeName === 'U' ||
              (node instanceof HTMLElement &&
                node.style.textDecoration.includes('underline'))
            ) {
              return true
            }
            node = node.parentElement
          }
          return false
        case 'insertUnorderedList':
          while (node && node !== editorRef.current) {
            if (node.nodeName === 'UL') {
              return true
            }
            node = node.parentElement
          }
          return false
        case 'insertOrderedList':
          while (node && node !== editorRef.current) {
            if (node.nodeName === 'OL') {
              return true
            }
            node = node.parentElement
          }
          return false
        default:
          return false
      }
    },
    [disabled]
  )

  return (
    <div className='rich-text-editor'>
      {/* The toolbar provides buttons for formatting the text. */}
      <div className='flex items-center space-x-1 p-2 border-b border-gray-200 bg-gray-50'>
        <button
          type='button'
          onClick={() => formatText('bold')}
          disabled={disabled}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${
            isActive('bold') ? 'bg-gray-300' : ''
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          title='Bold (Ctrl+B)'
          aria-label='Bold'
        >
          <Bold className='h-4 w-4' />
        </button>

        <button
          type='button'
          onClick={() => formatText('italic')}
          disabled={disabled}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${
            isActive('italic') ? 'bg-gray-300' : ''
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          title='Italic (Ctrl+I)'
          aria-label='Italic'
        >
          <Italic className='h-4 w-4' />
        </button>

        <div className='w-px h-6 bg-gray-300 mx-1' />

        <button
          type='button'
          onClick={() => formatText('insertUnorderedList')}
          disabled={disabled}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${
            isActive('insertUnorderedList') ? 'bg-gray-300' : ''
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          title='Bullet List'
          aria-label='Bullet List'
        >
          <List className='h-4 w-4' />
        </button>

        <button
          type='button'
          onClick={() => formatText('insertOrderedList')}
          disabled={disabled}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${
            isActive('insertOrderedList') ? 'bg-gray-300' : ''
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          title='Numbered List'
          aria-label='Numbered List'
        >
          <ListOrdered className='h-4 w-4' />
        </button>
      </div>

      {/* The main content area, which is a contenteditable div. */}
      <div
        ref={editorRef}
        contentEditable={!disabled}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        className={`
          rich-text-content min-h-[400px] p-6 text-lg leading-relaxed outline-none focus:outline-none
          text-dark bg-transparent resize-none overflow-y-auto break-words
          ${className}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-text'}
        `}
        role='textbox'
        aria-multiline='true'
        aria-label='Rich text editor'
        data-placeholder={placeholder}
        suppressContentEditableWarning={true}
      />
    </div>
  )
}

export default RichTextEditor
