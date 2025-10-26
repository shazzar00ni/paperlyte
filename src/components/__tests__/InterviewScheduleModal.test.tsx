import '@testing-library/jest-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { dataService } from '../../services/dataService'
import InterviewScheduleModal from '../InterviewScheduleModal'

// Mock the dataService
vi.mock('../../services/dataService', () => ({
  dataService: {
    scheduleInterview: vi.fn(),
  },
}))

// Mock analytics
vi.mock('../../utils/analytics', () => ({
  trackInterviewEvent: vi.fn(),
}))

// Mock monitoring
vi.mock('../../utils/monitoring', () => ({
  monitoring: {
    addBreadcrumb: vi.fn(),
    logError: vi.fn(),
  },
}))

// Mock validation utilities
vi.mock('../../utils/validation', () => ({
  isValidEmail: vi.fn((email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ),
  normalizeEmail: vi.fn((email: string) => email.toLowerCase().trim()),
}))

describe('InterviewScheduleModal', () => {
  const mockOnClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render when open', () => {
    render(<InterviewScheduleModal isOpen={true} onClose={mockOnClose} />)

    expect(screen.getByText('Schedule User Interview')).toBeInTheDocument()
    expect(screen.getByLabelText('Full Name *')).toBeInTheDocument()
    expect(screen.getByLabelText('Email Address *')).toBeInTheDocument()
  })

  it('should not render when closed', () => {
    render(<InterviewScheduleModal isOpen={false} onClose={mockOnClose} />)

    expect(
      screen.queryByText('Schedule User Interview')
    ).not.toBeInTheDocument()
  })

  it('should call onClose when close button is clicked', async () => {
    const user = userEvent.setup()
    render(<InterviewScheduleModal isOpen={true} onClose={mockOnClose} />)

    const closeButton = screen.getByLabelText('Close modal')
    await user.click(closeButton)

    expect(mockOnClose).toHaveBeenCalledOnce()
  })

  // Note: HTML5 form validation (required fields, email format) is tested by the browser
  // The tests below focus on our custom business logic validation

  it('should validate day selection', async () => {
    const user = userEvent.setup()
    render(<InterviewScheduleModal isOpen={true} onClose={mockOnClose} />)

    const nameInput = screen.getByLabelText('Full Name *')
    const emailInput = screen.getByLabelText('Email Address *')
    const submitButton = screen.getByText('Request Interview')

    await user.type(nameInput, 'John Doe')
    await user.type(emailInput, 'john@example.com')

    // Select at least one topic but no days
    const feedbackCheckbox = screen.getByLabelText('Product feedback')
    await user.click(feedbackCheckbox)

    await user.click(submitButton)

    await waitFor(() => {
      expect(
        screen.getByText('Please select at least one preferred day')
      ).toBeInTheDocument()
    })
    expect(dataService.scheduleInterview).not.toHaveBeenCalled()
  })

  it('should validate topic selection', async () => {
    const user = userEvent.setup()
    render(<InterviewScheduleModal isOpen={true} onClose={mockOnClose} />)

    const nameInput = screen.getByLabelText('Full Name *')
    const emailInput = screen.getByLabelText('Email Address *')
    const submitButton = screen.getByText('Request Interview')

    await user.type(nameInput, 'John Doe')
    await user.type(emailInput, 'john@example.com')

    // Select at least one day but no topics
    const mondayButton = screen.getByText('Monday')
    await user.click(mondayButton)

    await user.click(submitButton)

    await waitFor(() => {
      expect(
        screen.getByText('Please select at least one topic to discuss')
      ).toBeInTheDocument()
    })
    expect(dataService.scheduleInterview).not.toHaveBeenCalled()
  })

  it('should submit valid interview request', async () => {
    const user = userEvent.setup()
    vi.mocked(dataService.scheduleInterview).mockResolvedValue({
      success: true,
    })

    render(<InterviewScheduleModal isOpen={true} onClose={mockOnClose} />)

    const nameInput = screen.getByLabelText('Full Name *')
    const emailInput = screen.getByLabelText('Email Address *')
    const availabilitySelect = screen.getByLabelText('Preferred Time of Day *')
    const submitButton = screen.getByText('Request Interview')

    // Fill form with valid data
    await user.type(nameInput, 'John Doe')
    await user.type(emailInput, 'john@example.com')
    await user.selectOptions(availabilitySelect, 'morning')

    // Select days
    const mondayButton = screen.getByText('Monday')
    const wednesdayButton = screen.getByText('Wednesday')
    await user.click(mondayButton)
    await user.click(wednesdayButton)

    // Select topics
    const feedbackCheckbox = screen.getByLabelText('Product feedback')
    const uxCheckbox = screen.getByLabelText('User experience')
    await user.click(feedbackCheckbox)
    await user.click(uxCheckbox)

    await user.click(submitButton)

    await waitFor(() => {
      expect(dataService.scheduleInterview).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'John Doe',
          email: 'john@example.com',
          availability: 'morning',
          preferredDays: expect.arrayContaining(['Monday', 'Wednesday']),
          topics: expect.arrayContaining([
            'Product feedback',
            'User experience',
          ]),
          timezone: expect.any(String),
        })
      )
    })

    // Should show success message
    await waitFor(() => {
      expect(screen.getByText("We'll be in touch!")).toBeInTheDocument()
    })
  })

  it('should handle submission errors', async () => {
    const user = userEvent.setup()
    vi.mocked(dataService.scheduleInterview).mockResolvedValue({
      success: false,
      error: 'You already have a pending interview request!',
    })

    render(<InterviewScheduleModal isOpen={true} onClose={mockOnClose} />)

    const nameInput = screen.getByLabelText('Full Name *')
    const emailInput = screen.getByLabelText('Email Address *')
    const submitButton = screen.getByText('Request Interview')

    await user.type(nameInput, 'John Doe')
    await user.type(emailInput, 'john@example.com')

    // Select days and topics
    const mondayButton = screen.getByText('Monday')
    await user.click(mondayButton)

    const feedbackCheckbox = screen.getByLabelText('Product feedback')
    await user.click(feedbackCheckbox)

    await user.click(submitButton)

    await waitFor(() => {
      expect(
        screen.getByText('You already have a pending interview request!')
      ).toBeInTheDocument()
    })
  })

  it('should toggle day selection', async () => {
    const user = userEvent.setup()
    render(<InterviewScheduleModal isOpen={true} onClose={mockOnClose} />)

    const mondayButton = screen.getByText('Monday')

    // Click to select
    await user.click(mondayButton)
    expect(mondayButton).toHaveClass('bg-primary')

    // Click again to deselect
    await user.click(mondayButton)
    expect(mondayButton).not.toHaveClass('bg-primary')
  })

  it('should handle additional notes', async () => {
    const user = userEvent.setup()
    vi.mocked(dataService.scheduleInterview).mockResolvedValue({
      success: true,
    })

    render(<InterviewScheduleModal isOpen={true} onClose={mockOnClose} />)

    const nameInput = screen.getByLabelText('Full Name *')
    const emailInput = screen.getByLabelText('Email Address *')
    const notesInput = screen.getByLabelText('Additional Notes (Optional)')
    const submitButton = screen.getByText('Request Interview')

    await user.type(nameInput, 'John Doe')
    await user.type(emailInput, 'john@example.com')
    await user.type(notesInput, 'Prefer early morning meetings')

    // Select days and topics
    const mondayButton = screen.getByText('Monday')
    await user.click(mondayButton)

    const feedbackCheckbox = screen.getByLabelText('Product feedback')
    await user.click(feedbackCheckbox)

    await user.click(submitButton)

    await waitFor(() => {
      expect(dataService.scheduleInterview).toHaveBeenCalledWith(
        expect.objectContaining({
          additionalNotes: 'Prefer early morning meetings',
        })
      )
    })
  })
})
