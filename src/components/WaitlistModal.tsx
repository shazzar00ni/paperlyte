import { Briefcase, Mail, User, X } from 'lucide-react'
import React, { useState } from 'react'
import { useAsyncOperation } from '../hooks/useAsyncOperation'
import { dataService } from '../services/dataService'
import type { ModalProps } from '../types'
import { trackWaitlistEvent } from '../utils/analytics'
import { stripHtml } from '../utils/sanitization'

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
  const [isSubmitted, setIsSubmitted] = useState(false)

  // Use async operation hook for consistent state management
  const submitWaitlist = useAsyncOperation(
    async (data: WaitlistFormData) => {
      // Validate form
      if (!data.email || !data.name) {
        throw new Error('Please fill in all required fields')
      }

      // Normalize email for validation
      const normalizedEmail = data.email.trim().toLowerCase()

      // Stricter RFC-5322-based email validation
      // Matches: local-part@domain with proper character constraints
      const emailRegex =
        /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i

      // Sanity checks for common invalid patterns
      const hasConsecutiveDots = /\.{2,}/.test(normalizedEmail)
      const domainPart = normalizedEmail.split('@')[1] || ''
      const domainLabels = domainPart.split('.')
      const hasValidDomainLabels = domainLabels.every(
        label => label.length > 0 && label.length <= 63
      )
      const hasValidTLD =
        domainLabels.length >= 2 &&
        domainLabels[domainLabels.length - 1].length >= 2

      if (
        !emailRegex.test(normalizedEmail) ||
        hasConsecutiveDots ||
        !hasValidDomainLabels ||
        !hasValidTLD
      ) {
        throw new Error('Please enter a valid email address')
      }

      // Sanitize inputs before persistence as per coding guidelines
      // Strip HTML/scripts and normalize email format to prevent XSS and data inconsistencies
      const sanitizedEmail = stripHtml(normalizedEmail)
      const sanitizedName = stripHtml(data.name.trim())

      // Use data service for persistence (currently localStorage, will be API in Q4 2025)
      const result = await dataService.addToWaitlist({
        email: sanitizedEmail,
        name: sanitizedName,
        interest: data.interest,
      })

      if (!result.success) {
        throw new Error(result.error || 'Failed to join waitlist')
      }

      return result
    },
    {
      feature: 'waitlist',
      action: 'signup',
      onSuccess: () => {
        trackWaitlistEvent('signup', {
          interest: formData.interest,
          source: 'modal',
        })
        setIsSubmitted(true)
      },
    }
  )

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await submitWaitlist.execute(formData)
  }

  const handleClose = () => {
    if (!submitWaitlist.isLoading) {
      onClose()
      // Reset form after a delay to prevent flash
      setTimeout(() => {
        setFormData({ email: '', name: '', interest: 'professional' })
        setIsSubmitted(false)
        submitWaitlist.reset()
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
            disabled={submitWaitlist.isLoading}
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
                  disabled={submitWaitlist.isLoading}
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
                  disabled={submitWaitlist.isLoading}
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
                  disabled={submitWaitlist.isLoading}
                >
                  <option value='student'>Student</option>
                  <option value='professional'>Professional</option>
                  <option value='creator'>Creative</option>
                  <option value='other'>Other</option>
                </select>
              </div>
            </div>

            {/* Error Message */}
            {submitWaitlist.error && (
              <div className='bg-red-50 border border-red-200 rounded-lg p-3'>
                <p className='text-red-600 text-sm'>
                  {submitWaitlist.error.message}
                </p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type='submit'
              disabled={submitWaitlist.isLoading}
              className='btn-primary btn-md w-full'
            >
              {submitWaitlist.isLoading ? 'Joining...' : 'Join Waitlist'}
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
