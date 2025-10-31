import '@testing-library/jest-dom/vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { dataService } from '../../services/dataService'
import NoteEditor from '../NoteEditor'

// Mock the dataService
vi.mock('../../services/dataService', () => ({
  dataService: {
    getNotes: vi.fn(),
    saveNote: vi.fn(),
    deleteNote: vi.fn(),
  },
}))

// Mock analytics
vi.mock('../../utils/analytics', () => ({
  trackNoteEvent: vi.fn(),
  trackFeatureUsage: vi.fn(),
}))

// Mock monitoring
vi.mock('../../utils/monitoring', () => ({
  monitoring: {
    addBreadcrumb: vi.fn(),
    logError: vi.fn(),
  },
}))

const mockNote = {
  id: 'test-note-1',
  title: 'Test Note',
  content: 'Test content',
  tags: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

describe('NoteEditor - Focus Mode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(dataService.getNotes).mockResolvedValue([mockNote])
    vi.mocked(dataService.saveNote).mockResolvedValue(true)
  })

  it('should display Focus Mode button in editor header', async () => {
    render(<NoteEditor />)

    await waitFor(() => {
      expect(screen.getByText('Test Note')).toBeInTheDocument()
    })

    const focusButton = screen.getByRole('button', { name: /focus/i })
    expect(focusButton).toBeInTheDocument()
    expect(focusButton).toHaveAttribute('title', 'Enter Focus Mode')
  })

  it('should enter Focus Mode when button is clicked', async () => {
    const user = userEvent.setup()
    render(<NoteEditor />)

    await waitFor(() => {
      expect(screen.getByText('Test Note')).toBeInTheDocument()
    })

    const focusButton = screen.getByRole('button', { name: /focus/i })
    await user.click(focusButton)

    // Focus Mode overlay should be visible
    const overlay = screen.getByRole('button', {
      name: /exit focus mode/i,
    }).parentElement
    expect(overlay).toBeInTheDocument()

    // Should show large title input in Focus Mode
    const focusModeTitleInputs = screen.getAllByPlaceholderText('Note title...')
    const largeTitleInput = focusModeTitleInputs.find(input =>
      input.className.includes('text-3xl')
    )
    expect(largeTitleInput).toBeInTheDocument()
  })

  it('should exit Focus Mode when ESC key is pressed', async () => {
    const user = userEvent.setup()
    render(<NoteEditor />)

    await waitFor(() => {
      expect(screen.getByText('Test Note')).toBeInTheDocument()
    })

    // Enter Focus Mode
    const focusButton = screen.getByRole('button', { name: /focus/i })
    await user.click(focusButton)

    // Verify Focus Mode is active
    expect(
      screen.getByRole('button', { name: /exit focus mode/i })
    ).toBeInTheDocument()

    // Press ESC key
    await user.keyboard('{Escape}')

    // Focus Mode should be exited
    await waitFor(() => {
      expect(
        screen.queryByRole('button', { name: /exit focus mode/i })
      ).not.toBeInTheDocument()
    })
  })

  it('should exit Focus Mode when exit button is clicked', async () => {
    const user = userEvent.setup()
    render(<NoteEditor />)

    await waitFor(() => {
      expect(screen.getByText('Test Note')).toBeInTheDocument()
    })

    // Enter Focus Mode
    const focusButton = screen.getByRole('button', { name: /focus/i })
    await user.click(focusButton)

    // Click exit button
    const exitButton = screen.getByRole('button', { name: /exit focus mode/i })
    await user.click(exitButton)

    // Focus Mode should be exited
    await waitFor(() => {
      expect(
        screen.queryByRole('button', { name: /exit focus mode/i })
      ).not.toBeInTheDocument()
    })
  })

  it('should allow editing title in Focus Mode', async () => {
    const user = userEvent.setup()
    render(<NoteEditor />)

    await waitFor(() => {
      expect(screen.getByText('Test Note')).toBeInTheDocument()
    })

    // Enter Focus Mode
    const focusButton = screen.getByRole('button', { name: /focus/i })
    await user.click(focusButton)

    // Find and edit the large title input
    const focusModeTitleInputs = screen.getAllByPlaceholderText('Note title...')
    const largeTitleInput = focusModeTitleInputs.find(input =>
      input.className.includes('text-3xl')
    ) as HTMLInputElement

    await user.clear(largeTitleInput)
    await user.type(largeTitleInput, 'Updated Title')

    expect(largeTitleInput.value).toBe('Updated Title')
  })

  it('should show save status in Focus Mode', async () => {
    const user = userEvent.setup()
    render(<NoteEditor />)

    await waitFor(() => {
      expect(screen.getByText('Test Note')).toBeInTheDocument()
    })

    // Enter Focus Mode
    const focusButton = screen.getByRole('button', { name: /focus/i })
    await user.click(focusButton)

    // Should show auto-saved status
    await waitFor(() => {
      expect(screen.getByText('Auto-saved')).toBeInTheDocument()
    })
  })

  it('should maintain note content when toggling Focus Mode multiple times', async () => {
    const user = userEvent.setup()
    render(<NoteEditor />)

    await waitFor(() => {
      expect(screen.getByText('Test Note')).toBeInTheDocument()
    })

    const focusButton = screen.getByRole('button', { name: /focus/i })

    // Toggle Focus Mode multiple times
    await user.click(focusButton)
    await user.keyboard('{Escape}')
    await user.click(focusButton)
    await user.keyboard('{Escape}')

    // Note content should still be present
    expect(screen.getByText('Test Note')).toBeInTheDocument()
  })

  it('should not show Focus Mode when no note is selected', async () => {
    vi.mocked(dataService.getNotes).mockResolvedValue([])
    render(<NoteEditor />)

    await waitFor(() => {
      expect(
        screen.getByText('Select a note to start editing')
      ).toBeInTheDocument()
    })

    // Focus button should not be visible
    expect(
      screen.queryByRole('button', { name: /focus/i })
    ).not.toBeInTheDocument()
  })
})
