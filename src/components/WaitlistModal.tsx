import { Briefcase, Mail, User, X } from 'lucide-react'
import React, { useState } from 'react'
import { dataService } from '../services/dataService'
import type { ModalProps } from '../types'
import { trackWaitlistEvent } from '../utils/analytics'
import { monitoring } from '../utils/monitoring'
import { rateLimiter, sanitization, RATE_LIMITS } from '../utils/security'

interface WaitlistFormData {
  email: string
  name: string
  interest: 'student' | 'professional' | 'creator' | 'other'
}

const WaitlistModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState<WaitlistFormData>({
    email: '',
    name: '',
    interest: 'professional',
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
      // Check rate limiting to prevent abuse
      if (!rateLimiter.isAllowed('waitlist_signup', RATE_LIMITS.FORM_SUBMIT)) {
        throw new Error(
          'Too many signup attempts. Please try again in a few minutes.'
        )
      }

      // Validate and sanitize form inputs
      if (!formData.email || !formData.name) {
        throw new Error('Please fill in all required fields')
      }

      // Sanitize email with built-in validation
      const sanitizedEmail = sanitization.sanitizeEmail(formData.email)
      if (!sanitizedEmail) {
        throw new Error('Please enter a valid email address')
      }

      // Sanitize name to remove any dangerous content
      const sanitizedName = sanitization.sanitizeText(formData.name)
      if (!sanitizedName || sanitizedName.length < 2) {
        throw new Error('Please enter a valid name')
      }

      // Use data service for persistence (currently localStorage, will be API in Q4 2025)
      const result = await dataService.addToWaitlist({
        email: sanitizedEmail,
        name: sanitizedName,
        interest: formData.interest,
      })

      if (!result.success) {
        throw new Error(result.error || 'Failed to join waitlist')
      }

      // Track successful signup
      trackWaitlistEvent('signup', {
        interest: formData.interest,
        source: 'modal',
      })

      monitoring.addBreadcrumb('Waitlist signup successful', 'user_action', {
        interest: formData.interest,
      })

      setIsSubmitted(true)
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Something went wrong'
      setError(errorMessage)

      monitoring.logError(error as Error, {
        feature: 'waitlist',
        action: 'signup_failed',
        additionalData: { email: formData.email },
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      onClose()
      // Reset form after a delay to prevent flash
      setTimeout(() => {
        setFormData({ email: '', name: '', interest: 'professional' })
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
            {isSubmitted ? 'Welcome aboard!' : 'Join the Waitlist'}
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
              <Mail className='h-8 w-8 text-green-600' />
            </div>
            <h3 className='text-xl font-semibold text-dark mb-2'>
              You&apos;re on the list!
            </h3>
            <p className='text-gray-600 mb-6'>
              We&apos;ll notify you as soon as Paperlyte launches. Thank you for
              your interest!
            </p>
            <button onClick={handleClose} className='btn-primary btn-md'>
              Close
            </button>
          </div>
        ) : (
          /* Form State */
          <form onSubmit={handleSubmit} className='space-y-4'>
            <p className='text-gray-600 mb-6'>
              Be among the first to experience lightning-fast note-taking. Get
              early access and exclusive updates.
            </p>

            {/* Email Field */}
            <div>
              <label
                htmlFor='email'
                className='block text-sm font-medium text-dark mb-2'
              >
                Email Address *
              </label>
              <div className='relative'>
                <Mail className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5' />
                <input
                  type='email'
                  id='email'
                  required
                  value={formData.email}
                  onChange={e =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className='input pl-11'
                  placeholder='your@email.com'
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Name Field */}
            <div>
              <label
                htmlFor='name'
                className='block text-sm font-medium text-dark mb-2'
              >
                Name *
              </label>
              <div className='relative'>
                <User className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5' />
                <input
                  type='text'
                  id='name'
                  required
                  value={formData.name}
                  onChange={e =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className='input pl-11'
                  placeholder='Your name'
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Interest Field */}
            <div>
              <label
                htmlFor='interest'
                className='block text-sm font-medium text-dark mb-2'
              >
                I&apos;m interested as a...
              </label>
              <div className='relative'>
                <Briefcase className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5' />
                <select
                  id='interest'
                  value={formData.interest}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      interest: e.target.value as WaitlistFormData['interest'],
                    })
                  }
                  className='input pl-11'
                  disabled={isSubmitting}
                >
                  <option value='student'>Student</option>
                  <option value='professional'>Professional</option>
                  <option value='creator'>Creative</option>
                  <option value='other'>Other</option>
                </select>
              </div>
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
              {isSubmitting ? 'Joining...' : 'Join Waitlist'}
            </button>

            {/* Privacy Note */}
            <p className='text-xs text-gray-500 text-center'>
              We respect your privacy. No spam, just launch updates.
            </p>
          </form>
        )}
      </div>
    </div>
  )
}

export default WaitlistModal
