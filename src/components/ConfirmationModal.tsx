import React from 'react'
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
      <div className="modal-content max-w-sm" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-6 w-6 text-amber-500" />
            </div>
            <h2 className="text-lg font-semibold text-dark">
              {title}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 p-1"
            disabled={isLoading}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Message */}
        <p className="text-gray-600 mb-6 ml-9">
          {message}
        </p>

        {/* Actions */}
        <div className="flex justify-end space-x-3">
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="btn-secondary btn-sm"
          >
            {cancelText}
          </button>
          <button
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