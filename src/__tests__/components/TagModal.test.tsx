import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TagModal from '../../components/TagModal'

describe('TagModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    tags: ['javascript', 'typescript'],
    onSave: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render when open', () => {
      render(<TagModal {...defaultProps} />)

      expect(screen.getByText('Manage Tags')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Add a tag...')).toBeInTheDocument()
    })

    it('should not render when closed', () => {
      render(<TagModal {...defaultProps} isOpen={false} />)

      expect(screen.queryByText('Manage Tags')).not.toBeInTheDocument()
    })

    it('should display existing tags', () => {
      render(<TagModal {...defaultProps} />)

      expect(screen.getByText('javascript')).toBeInTheDocument()
      expect(screen.getByText('typescript')).toBeInTheDocument()
    })

    it('should display message when no tags', () => {
      render(<TagModal {...defaultProps} tags={[]} />)

      expect(
        screen.getByText('No tags yet. Add some to organize your notes!')
      ).toBeInTheDocument()
    })
  })

  describe('Adding Tags', () => {
    it('should add a new tag when clicking Add button', async () => {
      const user = userEvent.setup()
      render(<TagModal {...defaultProps} tags={[]} />)

      const input = screen.getByPlaceholderText('Add a tag...')
      const addButton = screen.getByText('Add')

      await user.type(input, 'newtag')
      await user.click(addButton)

      await waitFor(() => {
        expect(screen.getByText('newtag')).toBeInTheDocument()
      })
    })

    it('should add a new tag when pressing Enter', async () => {
      const user = userEvent.setup()
      render(<TagModal {...defaultProps} tags={[]} />)

      const input = screen.getByPlaceholderText('Add a tag...')

      await user.type(input, 'newtag{Enter}')

      await waitFor(() => {
        expect(screen.getByText('newtag')).toBeInTheDocument()
      })
    })

    it('should convert tags to lowercase', async () => {
      const user = userEvent.setup()
      render(<TagModal {...defaultProps} tags={[]} />)

      const input = screen.getByPlaceholderText('Add a tag...')
      await user.type(input, 'UPPERCASE{Enter}')

      await waitFor(() => {
        expect(screen.getByText('uppercase')).toBeInTheDocument()
      })
    })

    it('should trim whitespace from tags', async () => {
      const user = userEvent.setup()
      render(<TagModal {...defaultProps} tags={[]} />)

      const input = screen.getByPlaceholderText('Add a tag...')
      await user.type(input, '  spaced  {Enter}')

      await waitFor(() => {
        expect(screen.getByText('spaced')).toBeInTheDocument()
      })
    })

    it('should not add duplicate tags', async () => {
      const user = userEvent.setup()
      render(<TagModal {...defaultProps} />)

      const input = screen.getByPlaceholderText('Add a tag...')
      await user.type(input, 'javascript{Enter}')

      const tags = screen.getAllByText('javascript')
      expect(tags).toHaveLength(1)
    })

    it('should not add empty tags', async () => {
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(<TagModal {...defaultProps} tags={[]} onSave={onSave} />)

      const input = screen.getByPlaceholderText('Add a tag...')
      await user.type(input, '   {Enter}')

      expect(
        screen.getByText('No tags yet. Add some to organize your notes!')
      ).toBeInTheDocument()
    })

    it('should clear input after adding tag', async () => {
      const user = userEvent.setup()
      render(<TagModal {...defaultProps} tags={[]} />)

      const input = screen.getByPlaceholderText(
        'Add a tag...'
      ) as HTMLInputElement
      await user.type(input, 'newtag{Enter}')

      await waitFor(() => {
        expect(input.value).toBe('')
      })
    })

    it('should disable Add button when input is empty', () => {
      render(<TagModal {...defaultProps} />)

      const addButton = screen.getByRole('button', { name: /add/i })
      expect(addButton).toBeDisabled()
    })
  })

  describe('Removing Tags', () => {
    it('should remove a tag when clicking remove button', async () => {
      const user = userEvent.setup()
      render(<TagModal {...defaultProps} />)

      const removeButtons = screen.getAllByLabelText(/Remove tag/)
      await user.click(removeButtons[0])

      await waitFor(() => {
        expect(screen.queryByText('javascript')).not.toBeInTheDocument()
      })
    })

    it('should remove correct tag when multiple exist', async () => {
      const user = userEvent.setup()
      render(<TagModal {...defaultProps} />)

      const removeButton = screen.getByLabelText('Remove tag typescript')
      await user.click(removeButton)

      await waitFor(() => {
        expect(screen.queryByText('typescript')).not.toBeInTheDocument()
        expect(screen.getByText('javascript')).toBeInTheDocument()
      })
    })
  })

  describe('Saving and Closing', () => {
    it('should call onSave with updated tags when Save is clicked', async () => {
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(<TagModal {...defaultProps} onSave={onSave} />)

      const input = screen.getByPlaceholderText('Add a tag...')
      await user.type(input, 'newtag{Enter}')

      const saveButton = screen.getByText('Save Tags')
      await user.click(saveButton)

      expect(onSave).toHaveBeenCalledWith([
        'javascript',
        'typescript',
        'newtag',
      ])
    })

    it('should call onClose when Save is clicked', async () => {
      const user = userEvent.setup()
      const onClose = vi.fn()
      render(<TagModal {...defaultProps} onClose={onClose} />)

      const saveButton = screen.getByText('Save Tags')
      await user.click(saveButton)

      expect(onClose).toHaveBeenCalled()
    })

    it('should call onClose when Cancel is clicked', async () => {
      const user = userEvent.setup()
      const onClose = vi.fn()
      render(<TagModal {...defaultProps} onClose={onClose} />)

      const cancelButton = screen.getByText('Cancel')
      await user.click(cancelButton)

      expect(onClose).toHaveBeenCalled()
    })

    it('should call onClose when X button is clicked', async () => {
      const user = userEvent.setup()
      const onClose = vi.fn()
      render(<TagModal {...defaultProps} onClose={onClose} />)

      const closeButton = screen.getByLabelText('Close modal')
      await user.click(closeButton)

      expect(onClose).toHaveBeenCalled()
    })

    it('should call onClose when Escape is pressed', async () => {
      const user = userEvent.setup()
      const onClose = vi.fn()
      render(<TagModal {...defaultProps} onClose={onClose} />)

      const input = screen.getByPlaceholderText('Add a tag...')
      await user.type(input, '{Escape}')

      expect(onClose).toHaveBeenCalled()
    })

    it('should not call onSave when Cancel is clicked', async () => {
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(<TagModal {...defaultProps} onSave={onSave} />)

      const cancelButton = screen.getByText('Cancel')
      await user.click(cancelButton)

      expect(onSave).not.toHaveBeenCalled()
    })

    it('should reset tags to original when reopened after cancel', async () => {
      const user = userEvent.setup()
      const { rerender } = render(<TagModal {...defaultProps} />)

      // Add a new tag
      const input = screen.getByPlaceholderText('Add a tag...')
      await user.type(input, 'newtag{Enter}')

      // Click cancel
      const cancelButton = screen.getByText('Cancel')
      await user.click(cancelButton)

      // Reopen modal
      rerender(<TagModal {...defaultProps} isOpen={false} />)
      rerender(<TagModal {...defaultProps} isOpen={true} />)

      // Should not see the new tag that was added but not saved
      expect(screen.queryByText('newtag')).not.toBeInTheDocument()
      expect(screen.getByText('javascript')).toBeInTheDocument()
      expect(screen.getByText('typescript')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should focus input when modal opens', () => {
      render(<TagModal {...defaultProps} />)

      const input = screen.getByPlaceholderText('Add a tag...')
      expect(input).toHaveFocus()
    })

    it('should have proper aria labels', () => {
      render(<TagModal {...defaultProps} />)

      expect(screen.getByLabelText('Close modal')).toBeInTheDocument()
      expect(screen.getByLabelText('Remove tag javascript')).toBeInTheDocument()
      expect(screen.getByLabelText('Remove tag typescript')).toBeInTheDocument()
    })
  })
})
