import { MessageSquare, X } from 'lucide-react'
import React, { useState } from 'react'
import { dataService } from '../services/dataService'
import type { FeedbackType, ModalProps } from '../types'
import { trackFeedbackEvent } from '../utils/analytics'
import { monitoring } from '../utils/monitoring'
import { isValidEmail } from '../utils/validation'

interface FeedbackFormData {
  type: FeedbackType
  message: string
  email: string
  name: string
}

const FeedbackModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState<FeedbackFormData>({
    type: 'feature',
    message: '',
    email: '',
    name: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      // Validate form
      if (!formData.message.trim()) {
        throw new Error('Please provide feedback message')
      }

      if (formData.message.trim().length < 10) {
        throw new Error('Feedback message must be at least 10 characters')
      }

      if (formData.email && !isValidEmail(formData.email)) {
        throw new Error('Please enter a valid email address')
      }

      // Use data service for persistence
      const result = await dataService.addFeedback({
        type: formData.type,
        message: formData.message.trim(),
        email: formData.email || undefined,
        name: formData.name || undefined,
        userAgent: navigator.userAgent,
        url: window.location.href,
      })

      if (!result.success) {
        throw new Error(result.error || 'Failed to submit feedback')
      }

      // Track successful submission
      trackFeedbackEvent('submit', {
        type: formData.type,
        hasEmail: !!formData.email,
        hasName: !!formData.name,
        messageLength: formData.message.length,
      })

      monitoring.addBreadcrumb(
        'Feedback submitted successfully',
        'user_action',
        {
          type: formData.type,
        }
      )

      setIsSubmitted(true)
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Something went wrong'
      setError(errorMessage)

      monitoring.logError(error as Error, {
        feature: 'feedback',
        action: 'submit_failed',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      if (!isSubmitted) {
        trackFeedbackEvent('cancel')
      }
      onClose()
      // Reset form after a delay to prevent flash
      setTimeout(() => {
        setFormData({ type: 'feature', message: '', email: '', name: '' })
        setIsSubmitted(false)
        setError(null)
      }, 300)
    }
  }
  return (
    <div className='modal-overlay' onClick={handleClose}>
      <div className='modal-content' onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className='flex justify-between items-center mb-6'>
          <h2 className='text-2xl font-bold text-dark'>
            {isSubmitted ? 'Thank you!' : 'Share Your Feedback'}
          </h2>
          <button
            onClick={handleClose}
            className='text-gray-400 hover:text-gray-600 p-1'
            disabled={isSubmitting}
            aria-label='Close modal'
          >
            <X className='h-6 w-6' />
          </button>
        </div>

        {isSubmitted ? (
          /* Success State */
          <div className='text-center py-8'>
            <div className='w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4'>
              <MessageSquare className='h-8 w-8 text-green-600' />
            </div>
            <h3 className='text-xl font-semibold text-dark mb-2'>
              Feedback Received!
            </h3>
            <p className='text-gray-600 mb-6'>
              Thank you for helping us improve Paperlyte. We review all feedback
              and use it to build a better product.
            </p>
            <button onClick={handleClose} className='btn-primary btn-md'>
              Close
            </button>
          </div>
        ) : (
          /* Form State */
          <form onSubmit={handleSubmit} className='space-y-4'>
            <p className='text-gray-600 mb-6'>
              We&apos;d love to hear your thoughts! Share bugs, feature
              requests, or suggestions to help us improve.
            </p>

            {/* Feedback Type */}
            <div>
              <label
                htmlFor='type'
                className='block text-sm font-medium text-dark mb-2'
              >
                Feedback Type *
              </label>
              <select
                id='type'
                value={formData.type}
                onChange={e =>
                  setFormData({
                    ...formData,
                    type: e.target.value as FeedbackType,
                  })
                }
                className='input'
                disabled={isSubmitting}
                required
              >
                <option value='bug'>🐛 Bug Report</option>
                <option value='feature'>💡 Feature Request</option>
                <option value='improvement'>✨ Improvement</option>
                <option value='other'>💬 Other</option>
              </select>
            </div>

            {/* Message Field */}
            <div>
              <label
                htmlFor='message'
                className='block text-sm font-medium text-dark mb-2'
              >
                Your Feedback *
              </label>
              <textarea
                id='message'
                required
                value={formData.message}
                onChange={e =>
                  setFormData({ ...formData, message: e.target.value })
                }
                className='input min-h-[120px] resize-y'
                placeholder='Tell us what you think...'
                disabled={isSubmitting}
                minLength={10}
                maxLength={500}
              />
              <p className='text-xs text-gray-500 mt-1'>
                {formData.message.length}/500 characters
              </p>
            </div>

            {/* Name Field (Optional) */}
            <div>
              <label
                htmlFor='name'
                className='block text-sm font-medium text-dark mb-2'
              >
                Name (Optional)
              </label>
              <input
                type='text'
                id='name'
                value={formData.name}
                onChange={e =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className='input'
                placeholder='Your name'
                disabled={isSubmitting}
              />
            </div>

            {/* Email Field (Optional) */}
            <div>
              <label
                htmlFor='email'
                className='block text-sm font-medium text-dark mb-2'
              >
                Email (Optional)
              </label>
              <input
                type='email'
                id='email'
                value={formData.email}
                onChange={e =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className='input'
                placeholder='your@email.com'
                disabled={isSubmitting}
              />
              <p className='text-xs text-gray-500 mt-1'>
                We&apos;ll only contact you if we need more details
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className='bg-red-50 border border-red-200 rounded-lg p-3'>
                <p className='text-red-600 text-sm'>{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type='submit'
              disabled={isSubmitting}
              className='btn-primary btn-md w-full'
            >
              {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
            </button>

            {/* Privacy Note */}
            <p className='text-xs text-gray-500 text-center'>
              Your feedback helps us build a better product. Thank you!
            </p>
          </form>
        )}
      </div>
    </div>
  )
}

export default FeedbackModal
