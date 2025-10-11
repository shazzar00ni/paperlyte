import '@testing-library/jest-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { dataService } from '../../services/dataService'
import FeedbackModal from '../FeedbackModal'

// Mock the dataService
vi.mock('../../services/dataService', () => ({
  dataService: {
    addFeedback: vi.fn(),
  },
}))

// Mock analytics
vi.mock('../../utils/analytics', () => ({
  trackFeedbackEvent: vi.fn(),
}))

// Mock monitoring
vi.mock('../../utils/monitoring', () => ({
  monitoring: {
    addBreadcrumb: vi.fn(),
    logError: vi.fn(),
  },
}))

describe('FeedbackModal', () => {
  const mockOnClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render when open', () => {
    render(<FeedbackModal isOpen={true} onClose={mockOnClose} />)

    expect(screen.getByText('Share Your Feedback')).toBeInTheDocument()
    expect(screen.getByLabelText('Feedback Type *')).toBeInTheDocument()
    expect(screen.getByLabelText('Your Feedback *')).toBeInTheDocument()
  })

  it('should not render when closed', () => {
    render(<FeedbackModal isOpen={false} onClose={mockOnClose} />)

    expect(screen.queryByText('Share Your Feedback')).not.toBeInTheDocument()
  })

  it('should call onClose when close button is clicked', async () => {
    const user = userEvent.setup()
    render(<FeedbackModal isOpen={true} onClose={mockOnClose} />)

    const closeButton = screen.getByLabelText('Close modal')
    await user.click(closeButton)

    expect(mockOnClose).toHaveBeenCalledOnce()
  })

  it('should validate message length', async () => {
    const user = userEvent.setup()
    render(<FeedbackModal isOpen={true} onClose={mockOnClose} />)

    const messageInput = screen.getByLabelText('Your Feedback *')
    const submitButton = screen.getByText('Submit Feedback')

    // Enter short message
    await user.type(messageInput, 'Too short')
    await user.click(submitButton)

    await waitFor(() => {
      expect(
        screen.getByText('Feedback message must be at least 10 characters')
      ).toBeInTheDocument()
    })
    expect(dataService.addFeedback).not.toHaveBeenCalled()
  })

  it('should allow submission with valid email', async () => {
    const user = userEvent.setup()
    vi.mocked(dataService.addFeedback).mockResolvedValue({ success: true })

    render(<FeedbackModal isOpen={true} onClose={mockOnClose} />)

    const messageInput = screen.getByLabelText('Your Feedback *')
    const emailInput = screen.getByLabelText('Email (Optional)')
    const submitButton = screen.getByText('Submit Feedback')

    // Enter valid message and email
    await user.type(messageInput, 'This is a valid feedback message')
    await user.type(emailInput, 'valid@email.com')
    await user.click(submitButton)

    await waitFor(() => {
      expect(dataService.addFeedback).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'This is a valid feedback message',
          email: 'valid@email.com',
        })
      )
    })
  })

  it('should submit valid feedback data', async () => {
    const user = userEvent.setup()
    vi.mocked(dataService.addFeedback).mockResolvedValue({ success: true })

    render(<FeedbackModal isOpen={true} onClose={mockOnClose} />)

    const typeSelect = screen.getByLabelText('Feedback Type *')
    const messageInput = screen.getByLabelText('Your Feedback *')
    const nameInput = screen.getByLabelText('Name (Optional)')
    const emailInput = screen.getByLabelText('Email (Optional)')
    const submitButton = screen.getByText('Submit Feedback')

    // Fill form with valid data
    await user.selectOptions(typeSelect, 'bug')
    await user.type(messageInput, 'This is a bug report with enough characters')
    await user.type(nameInput, 'John Doe')
    await user.type(emailInput, 'john@example.com')
    await user.click(submitButton)

    await waitFor(() => {
      expect(dataService.addFeedback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'bug',
          message: 'This is a bug report with enough characters',
          name: 'John Doe',
          email: 'john@example.com',
          userAgent: expect.any(String),
          url: expect.any(String),
        })
      )
    })

    // Should show success message
    await waitFor(() => {
      expect(screen.getByText('Feedback Received!')).toBeInTheDocument()
    })
  })

  it('should handle submission errors', async () => {
    const user = userEvent.setup()
    vi.mocked(dataService.addFeedback).mockResolvedValue({
      success: false,
      error: 'Server error',
    })

    render(<FeedbackModal isOpen={true} onClose={mockOnClose} />)

    const messageInput = screen.getByLabelText('Your Feedback *')
    const submitButton = screen.getByText('Submit Feedback')

    await user.type(messageInput, 'Valid feedback message')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Server error')).toBeInTheDocument()
    })
  })

  it('should disable form during submission', async () => {
    const user = userEvent.setup()
    vi.mocked(dataService.addFeedback).mockImplementation(
      () =>
        new Promise(resolve =>
          setTimeout(() => resolve({ success: true }), 100)
        )
    )

    render(<FeedbackModal isOpen={true} onClose={mockOnClose} />)

    const messageInput = screen.getByLabelText('Your Feedback *')
    const submitButton = screen.getByText('Submit Feedback')

    await user.type(messageInput, 'Valid feedback message')
    await user.click(submitButton)

    // Should show submitting state
    expect(screen.getByText('Submitting...')).toBeInTheDocument()
    expect(submitButton).toBeDisabled()
  })

  it('should allow feedback without optional fields', async () => {
    const user = userEvent.setup()
    vi.mocked(dataService.addFeedback).mockResolvedValue({ success: true })

    render(<FeedbackModal isOpen={true} onClose={mockOnClose} />)

    const messageInput = screen.getByLabelText('Your Feedback *')
    const submitButton = screen.getByText('Submit Feedback')

    // Only fill required field
    await user.type(messageInput, 'This is my feedback without name or email')
    await user.click(submitButton)

    await waitFor(() => {
      expect(dataService.addFeedback).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'This is my feedback without name or email',
          email: undefined,
          name: undefined,
        })
      )
    })
  })
})
