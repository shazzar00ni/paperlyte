import DOMPurify from 'dompurify'
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Undo,
  Redo,
  Underline,
} from 'lucide-react'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { monitoring } from '../utils/monitoring'

/**
 * @interface RichTextEditorProps
 * @description Props for the RichTextEditor component
 * @property {string} content - The initial HTML content of the editor
 * @property {(content: string) => void} onChange - Callback triggered when editor content changes
 * @property {string} [placeholder] - Optional placeholder text displayed when editor is empty
 * @property {string} [className] - Optional CSS class name for custom styling
 * @property {boolean} [disabled] - Optional flag to disable editing
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
 * @description Lightning-fast rich text editor built with contenteditable API.
 * Features include:
 * - Text formatting (bold, italic, underline)
 * - Heading levels (H1, H2, H3)
 * - Lists (ordered and unordered)
 * - Undo/Redo functionality with 50-entry history
 * - Keyboard shortcuts (Ctrl+B, Ctrl+I, Ctrl+Z, etc.)
 * - XSS protection via DOMPurify sanitization
 * - Smart paste handling to preserve plain text
 * @param {RichTextEditorProps} props - Component props
 * @returns {React.ReactElement} Rendered rich text editor with toolbar
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

  // Undo/Redo history management
  // historyRef stores up to 50 content snapshots for undo/redo
  // historyIndexRef tracks current position in history
  const historyRef = useRef<string[]>([])
  const historyIndexRef = useRef<number>(-1)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  /**
   * Synchronize editor content with external prop changes
   * Only updates when user is not actively typing (isUpdatingRef check)
   * Sanitizes content to prevent XSS attacks
   * Initializes history on first render
   */
  useEffect(() => {
    if (editorRef.current && !isUpdatingRef.current) {
      const currentContent = editorRef.current.innerHTML
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
          'h1',
          'h2',
          'h3',
        ],
        ALLOWED_ATTR: ['style'],
      })
      if (currentContent !== sanitizedContent) {
        editorRef.current.innerHTML = sanitizedContent

        // Initialize history if empty
        if (historyRef.current.length === 0 && sanitizedContent) {
          historyRef.current = [sanitizedContent]
          historyIndexRef.current = 0
        }
      }
    }
  }, [content])

  /**
   * Update undo/redo button states based on history position
   * Enables/disables buttons when history changes
   */
  useEffect(() => {
    setCanUndo(historyIndexRef.current > 0)
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1)
  }, [historyRef.current.length])

  /**
   * @function handleInput
   * @description Handles the onInput event from the contenteditable div
   * Sanitizes content, manages undo/redo history, and triggers onChange callback
   * Limits history to 50 entries to prevent memory issues
   * @throws Logs errors to monitoring service if sanitization fails
   */
  const handleInput = useCallback(() => {
    if (editorRef.current && !isUpdatingRef.current) {
      isUpdatingRef.current = true
      try {
        const rawContent = editorRef.current.innerHTML
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
            'h1',
            'h2',
            'h3',
          ],
          ALLOWED_ATTR: ['style'],
        })

        // Add to history for undo/redo
        if (sanitizedContent !== historyRef.current[historyIndexRef.current]) {
          // Remove any future history if we're not at the end
          historyRef.current = historyRef.current.slice(
            0,
            historyIndexRef.current + 1
          )
          historyRef.current.push(sanitizedContent)
          historyIndexRef.current = historyRef.current.length - 1

          // Limit history to 50 entries
          if (historyRef.current.length > 50) {
            historyRef.current.shift()
            historyIndexRef.current--
          }

          setCanUndo(historyIndexRef.current > 0)
          setCanRedo(false)
        }

        onChange(sanitizedContent)
      } catch (error) {
        // Handle errors gracefully without exposing sensitive information
        const sanitizedMessage =
          error instanceof Error
            ? error.message.replace(/[^\w\s]/g, '*')
            : 'Unknown error'

        // Log to monitoring with sanitized error message
        monitoring.logError(new Error(sanitizedMessage), {
          feature: 'rich_text_editor',
          action: 'content_change_failed',
        })
      } finally {
        // Reset flag after a short delay to allow for external updates
        setTimeout(() => {
          isUpdatingRef.current = false
        }, 10)
      }
    }
  }, [onChange])

  /**
   * @function undo
   * @description Reverts editor content to previous state in history
   * Updates editor DOM and triggers onChange with historical content
   */
  const undo = useCallback(() => {
    if (historyIndexRef.current > 0 && editorRef.current) {
      historyIndexRef.current--
      const previousContent = historyRef.current[historyIndexRef.current]
      editorRef.current.innerHTML = previousContent
      onChange(previousContent)
      setCanUndo(historyIndexRef.current > 0)
      setCanRedo(true)
    }
  }, [onChange])

  /**
   * @function redo
   * @description Re-applies editor content to next state in history
   * Updates editor DOM and triggers onChange with future content
   */
  const redo = useCallback(() => {
    if (
      historyIndexRef.current < historyRef.current.length - 1 &&
      editorRef.current
    ) {
      historyIndexRef.current++
      const nextContent = historyRef.current[historyIndexRef.current]
      editorRef.current.innerHTML = nextContent
      onChange(nextContent)
      setCanUndo(true)
      setCanRedo(historyIndexRef.current < historyRef.current.length - 1)
    }
  }, [onChange])

  /**
   * @function wrapSelectionWithTag
   * @description Wraps current text selection with specified HTML tag
   * Used for applying inline formatting (bold, italic, underline)
   * @param {string} tag - HTML tag name to wrap selection with (e.g., 'b', 'i', 'u')
   */
  const wrapSelectionWithTag = (tag: string) => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return
    const range = selection.getRangeAt(0)
    if (range.collapsed) return
    const wrapper = document.createElement(tag)
    wrapper.appendChild(range.extractContents())
    range.insertNode(wrapper)
    // Move selection to after the inserted node
    selection.removeAllRanges()
    const newRange = document.createRange()
    newRange.selectNodeContents(wrapper)
    newRange.collapse(false)
    selection.addRange(newRange)
  }

  /**
   * @function formatText
   * @description Applies formatting to selected text or current block
   * Handles inline formatting (bold, italic, underline), headings, and lists
   * Uses Selection API for precise cursor manipulation
   * @param {string} command - Formatting command (e.g., 'bold', 'h1', 'insertUnorderedList')
   * @param {string} [value] - Optional value for certain commands (e.g., 'div' for formatBlock)
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
        case 'h1':
        case 'h2':
        case 'h3':
          // Convert current block to heading
          {
            const selection = window.getSelection()
            if (selection && selection.rangeCount > 0) {
              const range = selection.getRangeAt(0)
              let block = range.startContainer

              // Find the block element
              while (block && block.nodeType === 3 && block.parentNode) {
                block = block.parentNode
              }

              if (
                block &&
                block instanceof HTMLElement &&
                block !== editorRef.current
              ) {
                // Check if we're already in the same heading type
                if (block.nodeName.toLowerCase() === command) {
                  // Convert back to paragraph
                  const p = document.createElement('p')
                  p.innerHTML = block.innerHTML
                  block.replaceWith(p)
                } else {
                  // Convert to heading
                  const heading = document.createElement(command)
                  heading.innerHTML = block.innerHTML
                  block.replaceWith(heading)
                }
              }
            }
          }
          break
        case 'insertUnorderedList':
          // Create unordered list
          {
            const selection = window.getSelection()
            if (selection && selection.rangeCount > 0) {
              const range = selection.getRangeAt(0)
              let block = range.startContainer

              // Find the block element
              while (block && block.nodeType === 3 && block.parentNode) {
                block = block.parentNode
              }

              if (block && block instanceof HTMLElement) {
                // Check if already in a list
                const existingList = block.closest('ul')
                if (existingList) {
                  // Remove from list
                  const listItem = block.closest('li')
                  if (listItem) {
                    const p = document.createElement('p')
                    p.innerHTML = listItem.innerHTML
                    listItem.replaceWith(p)

                    // Clean up empty list
                    if (existingList.children.length === 0) {
                      existingList.remove()
                    }
                  }
                } else {
                  // Create new list
                  const ul = document.createElement('ul')
                  const li = document.createElement('li')
                  li.innerHTML = block.innerHTML || '<br>'
                  ul.appendChild(li)

                  if (block === editorRef.current) {
                    editorRef.current.appendChild(ul)
                  } else {
                    block.replaceWith(ul)
                  }
                }
              }
            }
          }
          break
        case 'insertOrderedList':
          // Create ordered list
          {
            const selection = window.getSelection()
            if (selection && selection.rangeCount > 0) {
              const range = selection.getRangeAt(0)
              let block = range.startContainer

              // Find the block element
              while (block && block.nodeType === 3 && block.parentNode) {
                block = block.parentNode
              }

              if (block && block instanceof HTMLElement) {
                // Check if already in a list
                const existingList = block.closest('ol')
                if (existingList) {
                  // Remove from list
                  const listItem = block.closest('li')
                  if (listItem) {
                    const p = document.createElement('p')
                    p.innerHTML = listItem.innerHTML
                    listItem.replaceWith(p)

                    // Clean up empty list
                    if (existingList.children.length === 0) {
                      existingList.remove()
                    }
                  }
                } else {
                  // Create new list
                  const ol = document.createElement('ol')
                  const li = document.createElement('li')
                  li.innerHTML = block.innerHTML || '<br>'
                  ol.appendChild(li)

                  if (block === editorRef.current) {
                    editorRef.current.appendChild(ol)
                  } else {
                    block.replaceWith(ol)
                  }
                }
              }
            }
          }
          break
        // Minimal stubs for outdent and formatBlock
        case 'outdent':
          // No-op or implement custom logic if needed
          break
        case 'formatBlock':
          // For 'div', replace parent block element with <div>
          if (value === 'div') {
            const selection = window.getSelection()
            if (selection && selection.rangeCount > 0) {
              const range = selection.getRangeAt(0)
              let block = range.startContainer
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
      handleInput()
    },
    [disabled, handleInput]
  )

  /**
   * @function handleKeyDown
   * @description Handles keyboard shortcuts for formatting and undo/redo
   * Shortcuts:
   * - Ctrl+B: Bold
   * - Ctrl+I: Italic
   * - Ctrl+U: Underline
   * - Ctrl+1/2/3: Headings
   * - Ctrl+Z: Undo
   * - Ctrl+Shift+Z or Ctrl+Y: Redo
   * - Enter in empty list: Exit list
   * @param {React.KeyboardEvent} e - Keyboard event
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return

      // Handle keyboard shortcuts
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
          case '1':
            e.preventDefault()
            formatText('h1')
            break
          case '2':
            e.preventDefault()
            formatText('h2')
            break
          case '3':
            e.preventDefault()
            formatText('h3')
            break
          case 'z':
            e.preventDefault()
            if (e.shiftKey) {
              redo()
            } else {
              undo()
            }
            break
          case 'y':
            e.preventDefault()
            redo()
            break
        }
      }

      // Handle Enter key for lists
      if (e.key === 'Enter') {
        const selection = window.getSelection()
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0)
          const listItem = range.startContainer.parentElement?.closest('li')

          if (listItem && listItem.textContent?.trim() === '') {
            // If we're in an empty list item, exit the list
            e.preventDefault()
            formatText('outdent')
            formatText('formatBlock', 'div')
          }
        }
      }
    },
    [disabled, formatText, undo, redo]
  )

  /**
   * @function handlePaste
   * @description Handles paste events to strip rich formatting
   * Only plain text is preserved to maintain editor consistency
   * @param {React.ClipboardEvent} e - Clipboard event
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
        // Move the cursor after the inserted text node
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
   * @description Determines if a formatting command is active at current cursor position
   * Used to highlight toolbar buttons when formatting is applied
   * @param {string} command - Formatting command to check
   * @returns {boolean} True if formatting is active at cursor position
   */
  const isActive = useCallback(
    (command: string): boolean => {
      if (disabled) return false
      const selection = window.getSelection()
      if (!selection || selection.rangeCount === 0) return false
      let node = selection.focusNode
      // If the selection is a text node, get its parent element
      if (node && node.nodeType === Node.TEXT_NODE) {
        node = node.parentElement
      }
      if (!node) return false
      // Traverse up the DOM tree to check for formatting tags
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
        case 'h1':
          while (node && node !== editorRef.current) {
            if (node.nodeName === 'H1') {
              return true
            }
            node = node.parentElement
          }
          return false
        case 'h2':
          while (node && node !== editorRef.current) {
            if (node.nodeName === 'H2') {
              return true
            }
            node = node.parentElement
          }
          return false
        case 'h3':
          while (node && node !== editorRef.current) {
            if (node.nodeName === 'H3') {
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
      {/* Enhanced Toolbar */}
      <div className='flex items-center space-x-1 p-2 border-b border-gray-200 bg-gray-50'>
        {/* Undo/Redo */}
        <button
          type='button'
          onClick={undo}
          disabled={disabled || !canUndo}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${
            disabled || !canUndo ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          title='Undo (Ctrl+Z)'
          aria-label='Undo'
        >
          <Undo className='h-4 w-4' />
        </button>

        <button
          type='button'
          onClick={redo}
          disabled={disabled || !canRedo}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${
            disabled || !canRedo ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          title='Redo (Ctrl+Y or Ctrl+Shift+Z)'
          aria-label='Redo'
        >
          <Redo className='h-4 w-4' />
        </button>

        <div className='w-px h-6 bg-gray-300 mx-1' />

        {/* Text Formatting */}
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

        <button
          type='button'
          onClick={() => formatText('underline')}
          disabled={disabled}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${
            isActive('underline') ? 'bg-gray-300' : ''
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          title='Underline (Ctrl+U)'
          aria-label='Underline'
        >
          <Underline className='h-4 w-4' />
        </button>

        <div className='w-px h-6 bg-gray-300 mx-1' />

        {/* Headings */}
        <button
          type='button'
          onClick={() => formatText('h1')}
          disabled={disabled}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${
            isActive('h1') ? 'bg-gray-300' : ''
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          title='Heading 1 (Ctrl+1)'
          aria-label='Heading 1'
        >
          <Heading1 className='h-4 w-4' />
        </button>

        <button
          type='button'
          onClick={() => formatText('h2')}
          disabled={disabled}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${
            isActive('h2') ? 'bg-gray-300' : ''
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          title='Heading 2 (Ctrl+2)'
          aria-label='Heading 2'
        >
          <Heading2 className='h-4 w-4' />
        </button>

        <button
          type='button'
          onClick={() => formatText('h3')}
          disabled={disabled}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${
            isActive('h3') ? 'bg-gray-300' : ''
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          title='Heading 3 (Ctrl+3)'
          aria-label='Heading 3'
        >
          <Heading3 className='h-4 w-4' />
        </button>

        <div className='w-px h-6 bg-gray-300 mx-1' />

        {/* Lists */}
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

      {/* Content Editable Area */}
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
