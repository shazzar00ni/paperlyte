import '@testing-library/jest-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { dataService } from '../../services/dataService'
import WaitlistModal from '../WaitlistModal'

// Mock the dataService
vi.mock('../../services/dataService', () => ({
  dataService: {
    addToWaitlist: vi.fn(),
  },
}))

// Mock analytics
vi.mock('../../utils/analytics', () => ({
  trackUserAction: vi.fn(),
  trackWaitlistEvent: vi.fn(),
}))

describe('WaitlistModal', () => {
  const mockOnClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render when open', () => {
    render(<WaitlistModal isOpen={true} onClose={mockOnClose} />)

    expect(screen.getByText('Join the Waitlist')).toBeInTheDocument()
    expect(screen.getByLabelText('Email Address *')).toBeInTheDocument()
    expect(screen.getByLabelText('Name *')).toBeInTheDocument()
  })

  it('should not render when closed', () => {
    render(<WaitlistModal isOpen={false} onClose={mockOnClose} />)

    expect(screen.queryByText('Join the Waitlist')).not.toBeInTheDocument()
  })

  it('should call onClose when close button is clicked', async () => {
    const user = userEvent.setup()
    render(<WaitlistModal isOpen={true} onClose={mockOnClose} />)

    const closeButton = screen.getByLabelText('Close modal')
    await user.click(closeButton)

    expect(mockOnClose).toHaveBeenCalledOnce()
  })

  it('should validate email format', async () => {
    const user = userEvent.setup()
    render(<WaitlistModal isOpen={true} onClose={mockOnClose} />)

    const emailInput = screen.getByLabelText('Email Address *')
    const nameInput = screen.getByLabelText('Name *')
    const interestSelect = screen.getByLabelText("I'm interested as a...")
    const submitButton = screen.getByRole('button', { name: /join waitlist/i })

    // Enter email without proper domain (passes HTML5 but fails our regex)
    await user.type(emailInput, 'test@test')
    await user.type(nameInput, 'Test User')
    await user.selectOptions(interestSelect, 'other')

    // Submit form via user interaction to trigger validation naturally
    await user.click(submitButton)

    // Wait for error message to appear
    await waitFor(() => {
      expect(
        screen.getByText('Please enter a valid email address')
      ).toBeInTheDocument()
    })

    expect(dataService.addToWaitlist).not.toHaveBeenCalled()
  })

  it('should submit valid form data', async () => {
    const user = userEvent.setup()
    vi.mocked(dataService.addToWaitlist).mockResolvedValue({ success: true })

    render(<WaitlistModal isOpen={true} onClose={mockOnClose} />)

    const emailInput = screen.getByLabelText('Email Address *')
    const nameInput = screen.getByLabelText('Name *')
    const interestSelect = screen.getByLabelText("I'm interested as a...")
    const submitButton = screen.getByRole('button', { name: /join waitlist/i })

    // Fill form with valid data
    await user.type(emailInput, 'test@example.com')
    await user.type(nameInput, 'Test User')
    await user.selectOptions(interestSelect, 'other')
    await user.click(submitButton)

    await waitFor(() => {
      expect(dataService.addToWaitlist).toHaveBeenCalledWith({
        email: 'test@example.com',
        name: 'Test User',
        interest: 'other',
      })
    })
  })

  it('should handle submission errors', async () => {
    const user = userEvent.setup()
    vi.mocked(dataService.addToWaitlist).mockResolvedValue({
      success: false,
      error: "You're already on the waitlist!",
    })

    render(<WaitlistModal isOpen={true} onClose={mockOnClose} />)

    const emailInput = screen.getByLabelText('Email Address *')
    const nameInput = screen.getByLabelText('Name *')
    const submitButton = screen.getByRole('button', { name: /join waitlist/i })

    await user.type(emailInput, 'existing@example.com')
    await user.type(nameInput, 'Existing User')
    await user.click(submitButton)

    await waitFor(() => {
      expect(
        screen.getByText("You're already on the waitlist!")
      ).toBeInTheDocument()
    })
  })

  it('should show success message after successful submission', async () => {
    const user = userEvent.setup()
    vi.mocked(dataService.addToWaitlist).mockResolvedValue({ success: true })

    render(<WaitlistModal isOpen={true} onClose={mockOnClose} />)

    const emailInput = screen.getByLabelText('Email Address *')
    const nameInput = screen.getByLabelText('Name *')
    const submitButton = screen.getByRole('button', { name: /join waitlist/i })

    await user.type(emailInput, 'success@example.com')
    await user.type(nameInput, 'Success User')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/You're on the list!/)).toBeInTheDocument()
    })
  })

  it('should allow interest selection', async () => {
    const user = userEvent.setup()
    vi.mocked(dataService.addToWaitlist).mockResolvedValue({ success: true })

    render(<WaitlistModal isOpen={true} onClose={mockOnClose} />)

    const emailInput = screen.getByLabelText('Email Address *')
    const nameInput = screen.getByLabelText('Name *')
    const interestSelect = screen.getByLabelText("I'm interested as a...")
    const submitButton = screen.getByRole('button', { name: /join waitlist/i })

    await user.type(emailInput, 'professional@example.com')
    await user.type(nameInput, 'Professional User')
    await user.selectOptions(interestSelect, 'professional')
    await user.click(submitButton)

    await waitFor(() => {
      expect(dataService.addToWaitlist).toHaveBeenCalledWith({
        email: 'professional@example.com',
        name: 'Professional User',
        interest: 'professional',
      })
    })
  })
})
