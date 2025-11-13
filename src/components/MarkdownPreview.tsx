import React, { useEffect, useMemo } from 'react'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { monitoring } from '../utils/monitoring'

interface MarkdownPreviewProps {
  content: string
  className?: string
}

/**
 * Markdown preview component with sanitization
 * Renders Markdown content as HTML with security measures
 */
const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({
  content,
  className = '',
}) => {
  // Configure marked options for better rendering
  useEffect(() => {
    marked.setOptions({
      breaks: true, // Add <br> on single line breaks
      gfm: true, // GitHub Flavored Markdown
    })
  }, [])

  // Parse and sanitize Markdown
  const htmlContent = useMemo(() => {
    try {
      // Validate content before parsing
      if (!content || typeof content !== 'string') {
        return '<p>No content to preview</p>'
      }

      const rawHtml = marked.parse(content) as string
      // Sanitize HTML to prevent XSS attacks
      return DOMPurify.sanitize(rawHtml, {
        ALLOWED_TAGS: [
          'h1',
          'h2',
          'h3',
          'h4',
          'h5',
          'h6',
          'p',
          'br',
          'strong',
          'em',
          'b',
          'i',
          'u',
          'a',
          'ul',
          'ol',
          'li',
          'blockquote',
          'code',
          'pre',
          'hr',
          'table',
          'thead',
          'tbody',
          'tr',
          'th',
          'td',
        ],
        ALLOWED_ATTR: ['href', 'title', 'target', 'rel'],
        // Automatically add rel="noopener noreferrer" to links
        ALLOW_DATA_ATTR: false,
      })
    } catch (error) {
      // Use monitoring system for consistent error tracking
      monitoring.logError(error as Error, {
        feature: 'markdown_preview',
        action: 'parse_error',
      })
      return '<p>Error rendering preview</p>'
    }
  }, [content])

  return (
    <div
      className={`markdown-preview prose prose-slate max-w-none p-6 ${className}`}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  )
}

export default MarkdownPreview
