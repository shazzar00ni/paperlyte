import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { axe } from 'vitest-axe'
import WaitlistModal from '../../src/components/WaitlistModal'
import ConfirmationModal from '../../src/components/ConfirmationModal'
import TagModal from '../../src/components/TagModal'
import LoadingFallback from '../../src/components/LoadingFallback'
import Header from '../../src/components/Header'
import Footer from '../../src/components/Footer'
import SyncStatusIndicator from '../../src/components/SyncStatusIndicator'

/**
 * Accessibility tests for Paperlyte components
 * Uses axe-core to check for WCAG 2.1 Level A and AA violations
 */

describe('Component Accessibility Tests', () => {
  describe('WaitlistModal', () => {
    it('should have no accessibility violations when open', async () => {
      const { container } = render(
        <WaitlistModal isOpen={true} onClose={vi.fn()} onSubmit={vi.fn()} />
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have no accessibility violations when closed', async () => {
      const { container } = render(
        <WaitlistModal isOpen={false} onClose={vi.fn()} onSubmit={vi.fn()} />
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe('ConfirmationModal', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <ConfirmationModal
          isOpen={true}
          title='Confirm Action'
          message='Are you sure you want to proceed?'
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have proper ARIA attributes for danger variant', async () => {
      const { container } = render(
        <ConfirmationModal
          isOpen={true}
          title='Delete Note'
          message='This action cannot be undone.'
          confirmText='Delete'
          variant='danger'
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe('TagModal', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <TagModal
          isOpen={true}
          tags={['work', 'personal']}
          onClose={vi.fn()}
          onAddTag={vi.fn()}
          onRemoveTag={vi.fn()}
        />
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should be keyboard accessible', async () => {
      const { container } = render(
        <TagModal
          isOpen={true}
          tags={[]}
          onClose={vi.fn()}
          onAddTag={vi.fn()}
          onRemoveTag={vi.fn()}
        />
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe('LoadingFallback', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(<LoadingFallback />)

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have proper ARIA live region for loading state', async () => {
      const { container } = render(
        <LoadingFallback message='Loading notes...' />
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe('Header', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(<Header />)

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have proper heading hierarchy', async () => {
      const { container } = render(<Header />)

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe('Footer', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(<Footer />)

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have proper landmark roles', async () => {
      const { container } = render(<Footer />)

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe('SyncStatusIndicator', () => {
    it('should have no violations when synced', async () => {
      const { container } = render(
        <SyncStatusIndicator status='synced' lastSyncTime={new Date()} />
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have no violations when syncing', async () => {
      const { container } = render(<SyncStatusIndicator status='syncing' />)

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have no violations when error state', async () => {
      const { container } = render(
        <SyncStatusIndicator status='error' error='Network error' />
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should announce status changes to screen readers', async () => {
      const { container } = render(<SyncStatusIndicator status='offline' />)

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })
})
