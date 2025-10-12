import '@testing-library/jest-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import FeedbackButton from '../FeedbackButton'
import * as analytics from '../../utils/analytics'
import { monitoring } from '../../utils/monitoring'

// Mock the analytics
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

// Mock the FeedbackModal component
vi.mock('../FeedbackModal', () => ({
  default: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
    <div data-testid="feedback-modal" data-open={isOpen}>
      <button onClick={onClose}>Close Modal</button>
    </div>
  ),
}))

describe('FeedbackButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Fixed Position (default)', () => {
    it('should render fixed position button by default', () => {
      render(<FeedbackButton />)

      const button = screen.getByRole('button', { name: /give feedback/i })
      expect(button).toBeInTheDocument()
      expect(button).toHaveClass('fixed')
      expect(button).toHaveClass('bottom-6')
      expect(button).toHaveClass('right-6')
    })

    it('should have correct styling for fixed button', () => {
      render(<FeedbackButton />)

      const button = screen.getByRole('button', { name: /give feedback/i })
      expect(button).toHaveClass('rounded-full')
      expect(button).toHaveClass('p-4')
      expect(button).toHaveClass('bg-primary')
      expect(button).toHaveClass('z-50')
    })

    it('should show only icon without text in fixed position', () => {
      render(<FeedbackButton />)

      const button = screen.getByRole('button', { name: /give feedback/i })
      // Icon should be present
      const icon = button.querySelector('svg')
      expect(icon).toBeInTheDocument()

      // Text should not be in button for fixed position
      expect(button.textContent).toBe('')
    })

    it('should apply custom className to fixed button', () => {
      render(<FeedbackButton position="fixed" className="custom-class" />)

      const button = screen.getByRole('button', { name: /give feedback/i })
      expect(button).toHaveClass('custom-class')
      expect(button).toHaveClass('fixed')
    })
  })

  describe('Inline Position', () => {
    it('should render inline button when position is inline', () => {
      render(<FeedbackButton position="inline" />)

      const button = screen.getByRole('button', { name: /give feedback/i })
      expect(button).toBeInTheDocument()
      expect(button).not.toHaveClass('fixed')
      expect(button).toHaveClass('btn-secondary')
    })

    it('should show icon and text for inline button', () => {
      render(<FeedbackButton position="inline" />)

      const button = screen.getByRole('button', { name: /give feedback/i })
      expect(button).toHaveTextContent('Give Feedback')

      const icon = button.querySelector('svg')
      expect(icon).toBeInTheDocument()
    })

    it('should apply custom className to inline button', () => {
      render(<FeedbackButton position="inline" className="custom-inline-class" />)

      const button = screen.getByRole('button', { name: /give feedback/i })
      expect(button).toHaveClass('custom-inline-class')
      expect(button).toHaveClass('btn-secondary')
    })
  })

  describe('Modal Interaction', () => {
    it('should open modal when button is clicked', async () => {
      const user = userEvent.setup()
      render(<FeedbackButton />)

      const button = screen.getByRole('button', { name: /give feedback/i })
      await user.click(button)

      const modal = screen.getByTestId('feedback-modal')
      expect(modal).toHaveAttribute('data-open', 'true')
    })

    it('should track feedback view event when modal opens', async () => {
      const user = userEvent.setup()
      const trackSpy = vi.spyOn(analytics, 'trackFeedbackEvent')
      render(<FeedbackButton />)

      const button = screen.getByRole('button', { name: /give feedback/i })
      await user.click(button)

      expect(trackSpy).toHaveBeenCalledWith('view')
    })

    it('should add breadcrumb when modal opens', async () => {
      const user = userEvent.setup()
      const breadcrumbSpy = vi.spyOn(monitoring, 'addBreadcrumb')
      render(<FeedbackButton />)

      const button = screen.getByRole('button', { name: /give feedback/i })
      await user.click(button)

      expect(breadcrumbSpy).toHaveBeenCalledWith(
        'Feedback modal opened',
        'user_action'
      )
    })

    it('should close modal when close is triggered', async () => {
      const user = userEvent.setup()
      render(<FeedbackButton />)

      const button = screen.getByRole('button', { name: /give feedback/i })
      await user.click(button)

      const modal = screen.getByTestId('feedback-modal')
      expect(modal).toHaveAttribute('data-open', 'true')

      const closeButton = screen.getByText('Close Modal')
      await user.click(closeButton)

      await waitFor(() => {
        expect(modal).toHaveAttribute('data-open', 'false')
      })
    })

    it('should be able to open modal multiple times', async () => {
      const user = userEvent.setup()
      render(<FeedbackButton />)

      const button = screen.getByRole('button', { name: /give feedback/i })

      // Open first time
      await user.click(button)
      let modal = screen.getByTestId('feedback-modal')
      expect(modal).toHaveAttribute('data-open', 'true')

      // Close
      const closeButton = screen.getByText('Close Modal')
      await user.click(closeButton)

      // Open again
      await user.click(button)
      modal = screen.getByTestId('feedback-modal')
      expect(modal).toHaveAttribute('data-open', 'true')
    })
  })

  describe('Accessibility', () => {
    it('should have accessible label for fixed button', () => {
      render(<FeedbackButton position="fixed" />)

      const button = screen.getByRole('button', { name: /give feedback/i })
      expect(button).toHaveAttribute('aria-label', 'Give feedback')
      expect(button).toHaveAttribute('title', 'Give feedback')
    })

    it('should have accessible label for inline button', () => {
      render(<FeedbackButton position="inline" />)

      const button = screen.getByRole('button', { name: /give feedback/i })
      expect(button).toBeInTheDocument()
    })

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup()
      render(<FeedbackButton />)

      const button = screen.getByRole('button', { name: /give feedback/i })

      // Focus the button
      await user.tab()
      expect(button).toHaveFocus()

      // Activate with keyboard
      await user.keyboard('{Enter}')

      const modal = screen.getByTestId('feedback-modal')
      expect(modal).toHaveAttribute('data-open', 'true')
    })
  })

  describe('Edge Cases', () => {
    it('should handle rapid clicks gracefully', async () => {
      const user = userEvent.setup()
      const trackSpy = vi.spyOn(analytics, 'trackFeedbackEvent')
      render(<FeedbackButton />)

      const button = screen.getByRole('button', { name: /give feedback/i })

      // Click multiple times rapidly
      await user.click(button)
      await user.click(button)
      await user.click(button)

      // Modal should be open
      const modal = screen.getByTestId('feedback-modal')
      expect(modal).toHaveAttribute('data-open', 'true')

      // Should track each view
      expect(trackSpy).toHaveBeenCalledTimes(3)
    })

    it('should work with empty className', () => {
      render(<FeedbackButton className="" />)

      const button = screen.getByRole('button', { name: /give feedback/i })
      expect(button).toBeInTheDocument()
    })

    it('should maintain state across re-renders', async () => {
      const user = userEvent.setup()
      const { rerender } = render(<FeedbackButton position="fixed" />)

      const button = screen.getByRole('button', { name: /give feedback/i })
      await user.click(button)

      const modal = screen.getByTestId('feedback-modal')
      expect(modal).toHaveAttribute('data-open', 'true')

      // Re-render with same props
      rerender(<FeedbackButton position="fixed" />)

      // Modal should still be open
      expect(modal).toHaveAttribute('data-open', 'true')
    })
  })
})