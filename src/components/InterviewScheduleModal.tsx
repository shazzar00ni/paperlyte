import { Calendar, Mail, User, X } from 'lucide-react'
import React, { useState } from 'react'
import { dataService } from '../services/dataService'
import type { InterviewAvailability, ModalProps } from '../types'
import { trackInterviewEvent } from '../utils/analytics'
import { monitoring } from '../utils/monitoring'
import { isValidEmail } from '../utils/validation'

interface InterviewFormData {
  name: string
  email: string
  availability: InterviewAvailability
  preferredDays: string[]
  timezone: string
  topics: string[]
  additionalNotes: string
}

const InterviewScheduleModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState<InterviewFormData>({
    name: '',
    email: '',
    availability: 'flexible',
    preferredDays: [],
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    topics: [],
    additionalNotes: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const availableDays = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ]

  const interviewTopics = [
    'Product feedback',
    'Feature requests',
    'User experience',
    'Pain points',
    'Workflow integration',
    'Other',
  ]

  const handleDayToggle = (day: string) => {
    setFormData(prev => ({
      ...prev,
      preferredDays: prev.preferredDays.includes(day)
        ? prev.preferredDays.filter(d => d !== day)
        : [...prev.preferredDays, day],
    }))
  }

  const handleTopicToggle = (topic: string) => {
    setFormData(prev => ({
      ...prev,
      topics: prev.topics.includes(topic)
        ? prev.topics.filter(t => t !== topic)
        : [...prev.topics, topic],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      // Validate form
      if (!formData.name.trim() || !formData.email.trim()) {
        throw new Error('Please fill in all required fields')
      }

      if (formData.name.trim().length > 100) {
        throw new Error('Name must be less than 100 characters')
      }

      if (!isValidEmail(formData.email)) {
        throw new Error('Please enter a valid email address')
      }

      if (formData.preferredDays.length === 0) {
        throw new Error('Please select at least one preferred day')
      }

      if (formData.topics.length === 0) {
        throw new Error('Please select at least one topic to discuss')
      }

      if (formData.additionalNotes.trim().length > 1000) {
        throw new Error('Additional notes must be less than 1000 characters')
      }

      // Use data service for persistence
      const result = await dataService.scheduleInterview({
        name: formData.name.trim(),
        email: formData.email.trim(),
        availability: formData.availability,
        preferredDays: formData.preferredDays,
        timezone: formData.timezone,
        topics: formData.topics,
        additionalNotes: formData.additionalNotes.trim() || undefined,
      })

      if (!result.success) {
        throw new Error(result.error || 'Failed to schedule interview')
      }

      // Track successful scheduling
      trackInterviewEvent('schedule', {
        availability: formData.availability,
        daysCount: formData.preferredDays.length,
        topicsCount: formData.topics.length,
      })

      monitoring.addBreadcrumb(
        'Interview scheduled successfully',
        'user_action',
        {
          availability: formData.availability,
          timezone: formData.timezone,
        }
      )

      setIsSubmitted(true)
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Something went wrong'
      setError(errorMessage)

      monitoring.logError(error as Error, {
        feature: 'user_interview',
        action: 'schedule_failed',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      if (!isSubmitted) {
        trackInterviewEvent('cancel')
      }
      onClose()
      // Reset form after a delay to prevent flash
      setTimeout(() => {
        setFormData({
          name: '',
          email: '',
          availability: 'flexible',
          preferredDays: [],
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          topics: [],
          additionalNotes: '',
        })
        setIsSubmitted(false)
        setError(null)
      }, 300)
    }
  }

  return (
    <div className='modal-overlay' onClick={handleClose}>
      <div
        className='modal-content max-h-[90vh] overflow-y-auto'
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className='flex justify-between items-center mb-6'>
          <h2 className='text-2xl font-bold text-dark'>
            {isSubmitted ? 'Request Received!' : 'Schedule User Interview'}
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
              <Calendar className='h-8 w-8 text-green-600' />
            </div>
            <h3 className='text-xl font-semibold text-dark mb-2'>
              We&apos;ll be in touch!
            </h3>
            <p className='text-gray-600 mb-6'>
              Thank you for your interest in sharing feedback. We&apos;ll reach
              out via email to schedule a time that works for you.
            </p>
            <button type='button' onClick={handleClose} className='btn-primary btn-md'>
              Close
            </button>
          </div>
        ) : (
          /* Form State */
          <form onSubmit={handleSubmit} className='space-y-4'>
            <p className='text-gray-600 mb-6'>
              Help shape the future of Paperlyte! We&apos;d love to hear about
              your experience in a 20-30 minute video call.
            </p>

            {/* Name Field */}
            <div>
              <label
                htmlFor='name'
                className='block text-sm font-medium text-dark mb-2'
              >
                Full Name *
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
                  maxLength={100}
                />
              </div>
            </div>

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

            {/* Availability */}
            <div>
              <label
                htmlFor='availability'
                className='block text-sm font-medium text-dark mb-2'
              >
                Preferred Time of Day *
              </label>
              <select
                id='availability'
                value={formData.availability}
                onChange={e =>
                  setFormData({
                    ...formData,
                    availability: e.target.value as InterviewAvailability,
                  })
                }
                className='input'
                disabled={isSubmitting}
                required
              >
                <option value='morning'>Morning (9 AM - 12 PM)</option>
                <option value='afternoon'>Afternoon (12 PM - 5 PM)</option>
                <option value='evening'>Evening (5 PM - 8 PM)</option>
                <option value='flexible'>Flexible</option>
              </select>
            </div>

            {/* Preferred Days */}
            <div>
              <span id='preferred-days-label' className='block text-sm font-medium text-dark mb-2'>
                Preferred Days *
              </span>
              <div className='grid grid-cols-2 gap-2' role='group' aria-labelledby='preferred-days-label'>
                {availableDays.map(day => (
                  <button
                    key={day}
                    type='button'
                    onClick={() => handleDayToggle(day)}
                    className={`py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                      formData.preferredDays.includes(day)
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    disabled={isSubmitting}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>

            {/* Topics */}
            <div>
              <span id='topics-label' className='block text-sm font-medium text-dark mb-2'>
                Topics to Discuss *
              </span>
              <div className='space-y-2' role='group' aria-labelledby='topics-label'>
                {interviewTopics.map(topic => (
                  <label
                    key={topic}
                    className='flex items-center space-x-2 cursor-pointer'
                  >
                    <input
                      type='checkbox'
                      checked={formData.topics.includes(topic)}
                      onChange={() => handleTopicToggle(topic)}
                      className='w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary'
                      disabled={isSubmitting}
                    />
                    <span className='text-sm text-gray-700'>{topic}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Timezone Display */}
            <div>
              <label className='block text-sm font-medium text-dark mb-2'>
                Your Timezone
              </label>
              <input
                type='text'
                value={formData.timezone}
                className='input bg-gray-50'
                disabled
                readOnly
              />
            </div>

            {/* Additional Notes */}
            <div>
              <label
                htmlFor='additionalNotes'
                className='block text-sm font-medium text-dark mb-2'
              >
                Additional Notes (Optional)
              </label>
              <textarea
                id='additionalNotes'
                value={formData.additionalNotes}
                onChange={e =>
                  setFormData({ ...formData, additionalNotes: e.target.value })
                }
                className='input min-h-[80px] resize-y'
                placeholder='Any specific times, topics, or constraints we should know about?'
                disabled={isSubmitting}
                maxLength={1000}
              />
              <p className='text-xs text-gray-500 mt-1'>
                {formData.additionalNotes.length}/1000 characters
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
              {isSubmitting ? 'Submitting...' : 'Request Interview'}
            </button>

            {/* Privacy Note */}
            <p className='text-xs text-gray-500 text-center'>
              We respect your time and privacy. Interviews are typically 20-30
              minutes.
            </p>
          </form>
        )}
      </div>
    </div>
  )
}

export default InterviewScheduleModal
