import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import WaitlistModal from '../WaitlistModal'
import { dataService } from '../../services/dataService'

// Mock the dataService
vi.mock('../../services/dataService', () => ({
  dataService: {
    addToWaitlist: vi.fn()
  }
}))

// Mock analytics
vi.mock('../../utils/analytics', () => ({
  trackUserAction: vi.fn()
}))

describe('WaitlistModal', () => {
  const mockOnClose = vi.fn()
  
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render when open', () => {
    render(<WaitlistModal isOpen={true} onClose={mockOnClose} />)
    
    expect(screen.getByText('Join the Paperlyte Waitlist')).toBeInTheDocument()
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument()
    expect(screen.getByLabelText('Name (Optional)')).toBeInTheDocument()
  })

  it('should not render when closed', () => {
    render(<WaitlistModal isOpen={false} onClose={mockOnClose} />)
    
    expect(screen.queryByText('Join the Paperlyte Waitlist')).not.toBeInTheDocument()
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
    
    const emailInput = screen.getByLabelText('Email Address')
    const submitButton = screen.getByText('Join Waitlist')
    
    // Enter invalid email
    await user.type(emailInput, 'invalid-email')
    await user.click(submitButton)
    
    expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument()
    expect(dataService.addToWaitlist).not.toHaveBeenCalled()
  })

  it('should submit valid form data', async () => {
    const user = userEvent.setup()
    vi.mocked(dataService.addToWaitlist).mockResolvedValue({ success: true })
    
    render(<WaitlistModal isOpen={true} onClose={mockOnClose} />)
    
    const emailInput = screen.getByLabelText('Email Address')
    const nameInput = screen.getByLabelText('Name (Optional)')
    const submitButton = screen.getByText('Join Waitlist')
    
    // Fill form with valid data
    await user.type(emailInput, 'test@example.com')
    await user.type(nameInput, 'Test User')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(dataService.addToWaitlist).toHaveBeenCalledWith({
        email: 'test@example.com',
        name: 'Test User',
        interest: 'other'
      })
    })
  })

  it('should handle submission errors', async () => {
    const user = userEvent.setup()
    vi.mocked(dataService.addToWaitlist).mockResolvedValue({ 
      success: false, 
      error: 'Email already registered' 
    })
    
    render(<WaitlistModal isOpen={true} onClose={mockOnClose} />)
    
    const emailInput = screen.getByLabelText('Email Address')
    const submitButton = screen.getByText('Join Waitlist')
    
    await user.type(emailInput, 'existing@example.com')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Email already registered')).toBeInTheDocument()
    })
  })

  it('should show success message after successful submission', async () => {
    const user = userEvent.setup()
    vi.mocked(dataService.addToWaitlist).mockResolvedValue({ success: true })
    
    render(<WaitlistModal isOpen={true} onClose={mockOnClose} />)
    
    const emailInput = screen.getByLabelText('Email Address')
    const submitButton = screen.getByText('Join Waitlist')
    
    await user.type(emailInput, 'success@example.com')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/You're on the list!/)).toBeInTheDocument()
    })
  })

  it('should allow interest selection', async () => {
    const user = userEvent.setup()
    vi.mocked(dataService.addToWaitlist).mockResolvedValue({ success: true })
    
    render(<WaitlistModal isOpen={true} onClose={mockOnClose} />)
    
    const emailInput = screen.getByLabelText('Email Address')
    const interestSelect = screen.getByLabelText('I am a...')
    const submitButton = screen.getByText('Join Waitlist')
    
    await user.type(emailInput, 'professional@example.com')
    await user.selectOptions(interestSelect, 'professional')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(dataService.addToWaitlist).toHaveBeenCalledWith({
        email: 'professional@example.com',
        name: '',
        interest: 'professional'
      })
    })
  })
})
