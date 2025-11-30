import '@testing-library/jest-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Footer from '../Footer'

// Mock the modal components
vi.mock('../FeedbackModal', () => ({
  default: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
    <div data-testid="feedback-modal" data-open={isOpen}>
      <button type="button" onClick={onClose}>Close Feedback</button>
    </div>
  ),
}))

vi.mock('../InterviewScheduleModal', () => ({
  default: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
    <div data-testid="interview-modal" data-open={isOpen}>
      <button type="button" onClick={onClose}>Close Interview</button>
    </div>
  ),
}))

describe('Footer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render footer with brand section', () => {
      render(<Footer />)

      expect(screen.getByText('Paperlyte')).toBeInTheDocument()
      expect(
        screen.getByText(/Lightning fast, distraction-free note-taking app/i)
      ).toBeInTheDocument()
    })

    it('should render all navigation sections', () => {
      render(<Footer />)

      expect(screen.getByText('Product')).toBeInTheDocument()
      expect(screen.getByText('Company')).toBeInTheDocument()
      expect(screen.getByText('Feedback')).toBeInTheDocument()
    })

    it('should render product links', () => {
      render(<Footer />)

      const productLinks = ['Features', 'Pricing', 'Security', 'Roadmap']
      productLinks.forEach(link => {
        expect(screen.getByText(link)).toBeInTheDocument()
      })
    })

    it('should render company links', () => {
      render(<Footer />)

      const companyLinks = ['About', 'Privacy', 'Terms', 'Contact']
      companyLinks.forEach(link => {
        expect(screen.getByText(link)).toBeInTheDocument()
      })
    })

    it('should render feedback section with buttons', () => {
      render(<Footer />)

      expect(screen.getByText('Feedback')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /give feedback/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /user interview/i })).toBeInTheDocument()
    })

    it('should render social media icons', () => {
      render(<Footer />)

      // Check for social links (they have href="#")
      const socialLinks = screen.getAllByRole('link')
      const socialIconLinks = socialLinks.filter(link => link.getAttribute('href') === '#')
      expect(socialIconLinks.length).toBeGreaterThanOrEqual(2) // Twitter and Github
    })

    it('should render copyright notice', () => {
      render(<Footer />)

      expect(screen.getByText(/© 2024 Paperlyte. All rights reserved./i)).toBeInTheDocument()
    })
  })

  describe('Feedback Modal Interaction', () => {
    it('should open feedback modal when Give Feedback button is clicked', async () => {
      const user = userEvent.setup()
      render(<Footer />)

      const feedbackButton = screen.getByRole('button', { name: /give feedback/i })
      await user.click(feedbackButton)

      const feedbackModal = screen.getByTestId('feedback-modal')
      expect(feedbackModal).toHaveAttribute('data-open', 'true')
    })

    it('should close feedback modal when close is triggered', async () => {
      const user = userEvent.setup()
      render(<Footer />)

      const feedbackButton = screen.getByRole('button', { name: /give feedback/i })
      await user.click(feedbackButton)

      let feedbackModal = screen.getByTestId('feedback-modal')
      expect(feedbackModal).toHaveAttribute('data-open', 'true')

      const closeButton = screen.getByText('Close Feedback')
      await user.click(closeButton)

      await waitFor(() => {
        feedbackModal = screen.getByTestId('feedback-modal')
        expect(feedbackModal).toHaveAttribute('data-open', 'false')
      })
    })

    it('should keep interview modal closed when feedback modal opens', async () => {
      const user = userEvent.setup()
      render(<Footer />)

      const feedbackButton = screen.getByRole('button', { name: /give feedback/i })
      await user.click(feedbackButton)

      const feedbackModal = screen.getByTestId('feedback-modal')
      const interviewModal = screen.getByTestId('interview-modal')

      expect(feedbackModal).toHaveAttribute('data-open', 'true')
      expect(interviewModal).toHaveAttribute('data-open', 'false')
    })
  })

  describe('Interview Modal Interaction', () => {
    it('should open interview modal when User Interview button is clicked', async () => {
      const user = userEvent.setup()
      render(<Footer />)

      const interviewButton = screen.getByRole('button', { name: /user interview/i })
      await user.click(interviewButton)

      const interviewModal = screen.getByTestId('interview-modal')
      expect(interviewModal).toHaveAttribute('data-open', 'true')
    })

    it('should close interview modal when close is triggered', async () => {
      const user = userEvent.setup()
      render(<Footer />)

      const interviewButton = screen.getByRole('button', { name: /user interview/i })
      await user.click(interviewButton)

      let interviewModal = screen.getByTestId('interview-modal')
      expect(interviewModal).toHaveAttribute('data-open', 'true')

      const closeButton = screen.getByText('Close Interview')
      await user.click(closeButton)

      await waitFor(() => {
        interviewModal = screen.getByTestId('interview-modal')
        expect(interviewModal).toHaveAttribute('data-open', 'false')
      })
    })

    it('should keep feedback modal closed when interview modal opens', async () => {
      const user = userEvent.setup()
      render(<Footer />)

      const interviewButton = screen.getByRole('button', { name: /user interview/i })
      await user.click(interviewButton)

      const feedbackModal = screen.getByTestId('feedback-modal')
      const interviewModal = screen.getByTestId('interview-modal')

      expect(feedbackModal).toHaveAttribute('data-open', 'false')
      expect(interviewModal).toHaveAttribute('data-open', 'true')
    })
  })

  describe('Modal State Management', () => {
    it('should handle opening both modals sequentially', async () => {
      const user = userEvent.setup()
      render(<Footer />)

      // Open feedback modal
      const feedbackButton = screen.getByRole('button', { name: /give feedback/i })
      await user.click(feedbackButton)

      let feedbackModal = screen.getByTestId('feedback-modal')
      expect(feedbackModal).toHaveAttribute('data-open', 'true')

      // Close feedback modal
      const closeFeedback = screen.getByText('Close Feedback')
      await user.click(closeFeedback)

      await waitFor(() => {
        feedbackModal = screen.getByTestId('feedback-modal')
        expect(feedbackModal).toHaveAttribute('data-open', 'false')
      })

      // Open interview modal
      const interviewButton = screen.getByRole('button', { name: /user interview/i })
      await user.click(interviewButton)

      const interviewModal = screen.getByTestId('interview-modal')
      expect(interviewModal).toHaveAttribute('data-open', 'true')
    })

    it('should handle reopening same modal', async () => {
      const user = userEvent.setup()
      render(<Footer />)

      const feedbackButton = screen.getByRole('button', { name: /give feedback/i })

      // Open
      await user.click(feedbackButton)
      let feedbackModal = screen.getByTestId('feedback-modal')
      expect(feedbackModal).toHaveAttribute('data-open', 'true')

      // Close
      const closeButton = screen.getByText('Close Feedback')
      await user.click(closeButton)

      await waitFor(() => {
        feedbackModal = screen.getByTestId('feedback-modal')
        expect(feedbackModal).toHaveAttribute('data-open', 'false')
      })

      // Reopen
      await user.click(feedbackButton)
      feedbackModal = screen.getByTestId('feedback-modal')
      expect(feedbackModal).toHaveAttribute('data-open', 'true')
    })

    it('should initialize with both modals closed', () => {
      render(<Footer />)

      const feedbackModal = screen.getByTestId('feedback-modal')
      const interviewModal = screen.getByTestId('interview-modal')

      expect(feedbackModal).toHaveAttribute('data-open', 'false')
      expect(interviewModal).toHaveAttribute('data-open', 'false')
    })
  })

  describe('Accessibility', () => {
    it('should have proper button roles for feedback links', () => {
      render(<Footer />)

      const feedbackButton = screen.getByRole('button', { name: /give feedback/i })
      const interviewButton = screen.getByRole('button', { name: /user interview/i })

      expect(feedbackButton.tagName).toBe('BUTTON')
      expect(interviewButton.tagName).toBe('BUTTON')
    })

    it('should be keyboard navigable', async () => {
      const user = userEvent.setup()
      render(<Footer />)

      // Tab to feedback button and activate
      const feedbackButton = screen.getByRole('button', { name: /give feedback/i })
      feedbackButton.focus()
      expect(feedbackButton).toHaveFocus()

      await user.keyboard('{Enter}')

      const feedbackModal = screen.getByTestId('feedback-modal')
      expect(feedbackModal).toHaveAttribute('data-open', 'true')
    })

    it('should have proper text alignment for buttons', () => {
      render(<Footer />)

      const feedbackButton = screen.getByRole('button', { name: /give feedback/i })
      expect(feedbackButton).toHaveClass('text-left')
    })
  })

  describe('Layout and Styling', () => {
    it('should render in a footer element', () => {
      const { container } = render(<Footer />)

      const footer = container.querySelector('footer')
      expect(footer).toBeInTheDocument()
    })

    it('should have proper background styling', () => {
      const { container } = render(<Footer />)

      const footer = container.querySelector('footer')
      expect(footer).toHaveClass('bg-gray-50')
      expect(footer).toHaveClass('border-t')
    })

    it('should use responsive grid layout', () => {
      const { container } = render(<Footer />)

      const grid = container.querySelector('.grid')
      expect(grid).toBeInTheDocument()
      expect(grid).toHaveClass('grid-cols-1')
      expect(grid).toHaveClass('md:grid-cols-2')
      expect(grid).toHaveClass('lg:grid-cols-5')
    })
  })

  describe('Edge Cases', () => {
    it('should handle rapid button clicks', async () => {
      const user = userEvent.setup()
      render(<Footer />)

      const feedbackButton = screen.getByRole('button', { name: /give feedback/i })

      // Click multiple times rapidly
      await user.click(feedbackButton)
      await user.click(feedbackButton)
      await user.click(feedbackButton)

      const feedbackModal = screen.getByTestId('feedback-modal')
      expect(feedbackModal).toHaveAttribute('data-open', 'true')
    })

    it('should maintain state across re-renders', async () => {
      const user = userEvent.setup()
      const { rerender } = render(<Footer />)

      const feedbackButton = screen.getByRole('button', { name: /give feedback/i })
      await user.click(feedbackButton)

      const feedbackModal = screen.getByTestId('feedback-modal')
      expect(feedbackModal).toHaveAttribute('data-open', 'true')

      // Re-render
      rerender(<Footer />)

      expect(feedbackModal).toHaveAttribute('data-open', 'true')
    })
  })
})