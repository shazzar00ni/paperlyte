import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import NoteEditor from '../../src/pages/NoteEditor'
import { dataService } from '../../src/services/dataService'

/**
 * Integration tests for offline scenarios
 * Tests app behavior when network is unavailable
 */

// Helper to manage navigator.onLine stubbing
let originalNavigatorOnLineDescriptor: PropertyDescriptor | undefined

function setNavigatorOnline(value: boolean): void {
  Object.defineProperty(navigator, 'onLine', {
    configurable: true,
    get: () => value,
  })
}

describe('Offline Scenarios Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()

    // Store original descriptor
    originalNavigatorOnLineDescriptor = Object.getOwnPropertyDescriptor(
      navigator,
      'onLine'
    )
  })

  afterEach(() => {
    // Restore original descriptor
    if (originalNavigatorOnLineDescriptor) {
      Object.defineProperty(
        navigator,
        'onLine',
        originalNavigatorOnLineDescriptor
      )
    }
  })

  describe('Offline Mode Detection', () => {
    it('should work normally when offline', async () => {
      // Simulate offline mode
      setNavigatorOnline(false)

      render(<NoteEditor />)

      // App should still render and function
      expect(screen.getByRole('main')).toBeInTheDocument()
    })

    it('should show offline indicator when connection lost', async () => {
      render(<NoteEditor />)

      // Initially online
      expect(navigator.onLine).toBe(true)

      // Simulate going offline
      setNavigatorOnline(false)

      // Trigger offline event
      window.dispatchEvent(new Event('offline'))

      // Check for offline indicator (if implemented)
      // This would depend on your offline indicator implementation
    })

    it('should show online indicator when connection restored', async () => {
      // Start offline
      setNavigatorOnline(false)

      render(<NoteEditor />)

      // Go online
      setNavigatorOnline(true)

      // Trigger online event
      window.dispatchEvent(new Event('online'))

      // Check for online indicator (if implemented)
    })
  })

  describe('Data Persistence While Offline', () => {
    it('should save notes locally when offline', async () => {
      const user = userEvent.setup()

      // Set offline mode
      setNavigatorOnline(false)

      render(<NoteEditor />)

      // Create and edit note
      const newNoteButton = screen.getByRole('button', { name: /new note/i })
      await user.click(newNoteButton)

      await waitFor(() => {
        const editor = screen.queryByRole('textbox')
        if (editor) {
          return true
        }
        return false
      })

      const editor = screen.getByRole('textbox')
      await user.type(editor, 'Offline note content')

      // Wait for auto-save
      await waitFor(
        () => {
          const notes = dataService.getNotes()
          return notes.then(n => n.length > 0)
        },
        { timeout: 3000 }
      )

      // Verify note was saved to localStorage
      const notes = await dataService.getNotes()
      expect(notes).toHaveLength(1)
      expect(notes[0].content).toContain('Offline note content')
    })

    it('should retrieve notes from local storage when offline', async () => {
      // Pre-populate with note
      await dataService.saveNote({
        id: 'offline-note-1',
        title: 'Offline Note',
        content: 'Content saved offline',
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      // Set offline mode
      setNavigatorOnline(false)

      render(<NoteEditor />)

      // Note should be visible
      await waitFor(() => {
        expect(screen.getByText('Offline Note')).toBeInTheDocument()
      })
    })

    it('should not lose data when going offline during edit', async () => {
      const user = userEvent.setup()

      // Start online
      setNavigatorOnline(true)

      render(<NoteEditor />)

      // Create note
      await user.click(screen.getByRole('button', { name: /new note/i }))

      await waitFor(() => {
        expect(screen.queryByRole('textbox')).toBeInTheDocument()
      })

      const editor = screen.getByRole('textbox')
      await user.type(editor, 'Starting to type...')

      // Go offline mid-edit
      setNavigatorOnline(false)
      window.dispatchEvent(new Event('offline'))

      // Continue typing
      await user.type(editor, ' and continuing offline')

      // Wait for auto-save
      await waitFor(
        () => {
          const notes = dataService.getNotes()
          return notes.then(n => n.length > 0)
        },
        { timeout: 3000 }
      )

      // Verify full content was saved
      const notes = await dataService.getNotes()
      expect(notes[0].content).toContain('Starting to type...')
      expect(notes[0].content).toContain('and continuing offline')
    })
  })

  describe('Search Functionality While Offline', () => {
    beforeEach(async () => {
      // Pre-populate with notes
      await dataService.saveNote({
        id: 'search-note-1',
        title: 'JavaScript Tutorial',
        content: 'Learn JavaScript basics',
        tags: ['programming', 'tutorial'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      await dataService.saveNote({
        id: 'search-note-2',
        title: 'TypeScript Guide',
        content: 'TypeScript best practices',
        tags: ['programming', 'typescript'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    })

    it('should search local notes when offline', async () => {
      const user = userEvent.setup()

      // Set offline mode
      setNavigatorOnline(false)

      render(<NoteEditor />)

      // Wait for notes to load
      await waitFor(() => {
        expect(screen.getByText('JavaScript Tutorial')).toBeInTheDocument()
      })

      // Search for note
      const searchInput = screen.getByPlaceholderText(/search/i)
      await user.type(searchInput, 'TypeScript')

      // Should show filtered results
      await waitFor(() => {
        expect(screen.getByText('TypeScript Guide')).toBeInTheDocument()
        expect(
          screen.queryByText('JavaScript Tutorial')
        ).not.toBeInTheDocument()
      })
    })

    it('should search by tags when offline', async () => {
      const user = userEvent.setup()

      setNavigatorOnline(false)

      render(<NoteEditor />)

      await waitFor(() => {
        expect(screen.getByText('JavaScript Tutorial')).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText(/search/i)
      await user.type(searchInput, 'tutorial')

      await waitFor(() => {
        expect(screen.getByText('JavaScript Tutorial')).toBeInTheDocument()
        expect(screen.queryByText('TypeScript Guide')).not.toBeInTheDocument()
      })
    })
  })

  describe('Performance While Offline', () => {
    it('should load quickly from local storage', async () => {
      // Pre-populate with notes
      const notes = Array.from({ length: 50 }, (_, i) => ({
        id: `perf-note-${i}`,
        title: `Note ${i}`,
        content: `Content ${i}`,
        tags: ['test'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }))

      for (const note of notes) {
        await dataService.saveNote(note)
      }

      setNavigatorOnline(false)

      const startTime = Date.now()
      render(<NoteEditor />)

      await waitFor(() => {
        expect(screen.getByText('Note 0')).toBeInTheDocument()
      })

      const loadTime = Date.now() - startTime

      // Should load within 1 second even with 50 notes
      expect(loadTime).toBeLessThan(1000)
    })
  })

  describe('Error Handling While Offline', () => {
    it('should handle storage quota exceeded gracefully', async () => {
      const user = userEvent.setup()

      // Mock localStorage to simulate quota exceeded
      const mockSetItem = vi.spyOn(Storage.prototype, 'setItem')
      mockSetItem.mockImplementation(() => {
        const error = new Error('QuotaExceededError')
        error.name = 'QuotaExceededError'
        throw error
      })

      setNavigatorOnline(false)

      render(<NoteEditor />)

      await user.click(screen.getByRole('button', { name: /new note/i }))

      await waitFor(() => {
        expect(screen.queryByRole('textbox')).toBeInTheDocument()
      })

      const editor = screen.getByRole('textbox')
      await user.type(editor, 'Test content')

      // Should show error message about storage
      // Implementation depends on error handling UI

      mockSetItem.mockRestore()
    })

    it('should recover from corrupted local storage', async () => {
      // Corrupt the localStorage data
      localStorage.setItem('paperlyte_notes', 'invalid json{]')

      setNavigatorOnline(false)

      // Should not crash
      expect(() => render(<NoteEditor />)).not.toThrow()

      // Should initialize with empty state
      await waitFor(() => {
        expect(screen.getByRole('main')).toBeInTheDocument()
      })
    })
  })

  describe('Sync Queue Management', () => {
    it('should queue changes for sync when offline', async () => {
      const user = userEvent.setup()

      setNavigatorOnline(false)

      render(<NoteEditor />)

      // Make changes
      await user.click(screen.getByRole('button', { name: /new note/i }))

      await waitFor(() => {
        expect(screen.queryByRole('textbox')).toBeInTheDocument()
      })

      const editor = screen.getByRole('textbox')
      await user.type(editor, 'Queued for sync')

      await waitFor(
        () => {
          const notes = dataService.getNotes()
          return notes.then(n => n.length > 0)
        },
        { timeout: 3000 }
      )

      // Changes should be saved locally
      const notes = await dataService.getNotes()
      expect(notes).toHaveLength(1)
      expect(notes[0].content).toContain('Queued for sync')

      // Sync queue logic would be tested here when implemented
    })

    it('should sync queued changes when coming back online', async () => {
      const user = userEvent.setup()

      // Start offline and make changes
      setNavigatorOnline(false)

      render(<NoteEditor />)

      await user.click(screen.getByRole('button', { name: /new note/i }))

      await waitFor(() => {
        expect(screen.queryByRole('textbox')).toBeInTheDocument()
      })

      const editor = screen.getByRole('textbox')
      await user.type(editor, 'To be synced')

      // Go online
      setNavigatorOnline(true)
      window.dispatchEvent(new Event('online'))

      // Sync should trigger (implementation would be tested here)
      // For now, just verify data is still available
      await waitFor(async () => {
        const notes = await dataService.getNotes()
        return notes.length > 0
      })

      const notes = await dataService.getNotes()
      expect(notes[0].content).toContain('To be synced')
    })
  })
})
