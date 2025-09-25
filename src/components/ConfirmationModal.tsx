import React, { useEffect } from 'react'
import { X, AlertTriangle } from 'lucide-react'
import type { ModalProps } from '../types'

interface ConfirmationModalProps extends ModalProps {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  confirmVariant?: 'primary' | 'danger'
  onConfirm: () => void
  isLoading?: boolean
}

/**
 * Reusable confirmation modal for destructive actions
 */
const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  title = 'Confirm Action',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'danger',
  onConfirm,
  isLoading = false
}) => {
  // Generate stable IDs for accessibility
  const titleId = `confirmation-title-${React.useId()}`
  const messageId = `confirmation-message-${React.useId()}`

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isLoading) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isLoading, onClose])

  if (!isOpen) return null

  const handleConfirm = () => {
    if (!isLoading) {
      onConfirm()
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      onClose()
    }
  }

  const confirmButtonClass = confirmVariant === 'danger' 
    ? 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500/50'
    : 'btn-primary'

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div 
        className="modal-content max-w-sm" 
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-6 w-6 text-amber-500" />
            </div>
            <h2 id={titleId} className="text-lg font-semibold text-dark">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 p-1"
            disabled={isLoading}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Message */}
        <p id={messageId} className="text-gray-600 mb-6 ml-9">
          {message}
        </p>

        {/* Actions */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            className="btn-secondary btn-sm"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
            className={`btn btn-sm ${confirmButtonClass} ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isLoading ? 'Deleting...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmationModal