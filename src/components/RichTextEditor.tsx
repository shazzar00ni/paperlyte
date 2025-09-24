import React, { useRef, useCallback, useEffect } from 'react'
import { Bold, Italic, List, ListOrdered } from 'lucide-react'

interface RichTextEditorProps {
  content: string
  onChange: (content: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

/**
 * Lightning-fast rich text editor using contenteditable
 * Supports bold, italic, and list formatting with keyboard shortcuts
 */
const RichTextEditor: React.FC<RichTextEditorProps> = ({
  content,
  onChange,
  placeholder = 'Start writing your thoughts...',
  className = '',
  disabled = false
}) => {
  const editorRef = useRef<HTMLDivElement>(null)
  const isUpdatingRef = useRef(false)

  // Update editor content when prop changes (but not during user input)
  useEffect(() => {
    if (editorRef.current && !isUpdatingRef.current) {
      const currentContent = editorRef.current.innerHTML
      if (currentContent !== content) {
        editorRef.current.innerHTML = content || ''
      }
    }
  }, [content])

  // Handle content changes
  const handleInput = useCallback(() => {
    if (editorRef.current && !isUpdatingRef.current) {
      isUpdatingRef.current = true
      const newContent = editorRef.current.innerHTML
      onChange(newContent)
      // Reset flag after a short delay to allow for external updates
      setTimeout(() => {
        isUpdatingRef.current = false
      }, 10)
    }
  }, [onChange])

  // Format text using execCommand
  const formatText = useCallback((command: string, value?: string) => {
    if (disabled) return
    
    document.execCommand(command, false, value)
    editorRef.current?.focus()
    handleInput()
  }, [disabled, handleInput])

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
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
  }, [disabled, formatText])

  // Handle paste to clean up formatting
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
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
  }, [disabled, handleInput])

  // Toolbar button states
  const isActive = useCallback((command: string): boolean => {
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
            (node instanceof HTMLElement && node.style.textDecoration.includes('underline'))
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
  }, [disabled])

  return (
    <div className="rich-text-editor">
      {/* Minimal Toolbar */}
      <div className="flex items-center space-x-1 p-2 border-b border-gray-200 bg-gray-50">
        <button
          type="button"
          onClick={() => formatText('bold')}
          disabled={disabled}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${
            isActive('bold') ? 'bg-gray-300' : ''
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          title="Bold (Ctrl+B)"
          aria-label="Bold"
        >
          <Bold className="h-4 w-4" />
        </button>
        
        <button
          type="button"
          onClick={() => formatText('italic')}
          disabled={disabled}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${
            isActive('italic') ? 'bg-gray-300' : ''
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          title="Italic (Ctrl+I)"
          aria-label="Italic"
        >
          <Italic className="h-4 w-4" />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        <button
          type="button"
          onClick={() => formatText('insertUnorderedList')}
          disabled={disabled}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${
            isActive('insertUnorderedList') ? 'bg-gray-300' : ''
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          title="Bullet List"
          aria-label="Bullet List"
        >
          <List className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => formatText('insertOrderedList')}
          disabled={disabled}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${
            isActive('insertOrderedList') ? 'bg-gray-300' : ''
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          title="Numbered List"
          aria-label="Numbered List"
        >
          <ListOrdered className="h-4 w-4" />
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
          text-dark bg-transparent resize-none overflow-y-auto
          ${className}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-text'}
        `}
        role="textbox"
        aria-multiline="true"
        aria-label="Rich text editor"
        data-placeholder={placeholder}
        style={{
          wordWrap: 'break-word',
          overflowWrap: 'break-word'
        }}
        suppressContentEditableWarning={true}
      />
    </div>
  )
}

export default RichTextEditor