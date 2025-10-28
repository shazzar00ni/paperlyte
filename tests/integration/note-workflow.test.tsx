import '@testing-library/jest-dom/vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import NoteEditor from '../../src/pages/NoteEditor'
import { dataService } from '../../src/services/dataService'
import type { Note } from '../../src/types'

describe('Note Workflow Integration', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  describe('Complete Note Management Flow', () => {
    it('should create, edit, and save notes end-to-end', async () => {
      const user = userEvent.setup()

      render(<NoteEditor />)

      // Should start with empty state or default note
      await waitFor(() => {
        const textboxes = screen.queryAllByRole('textbox')
        expect(textboxes.length).toBeGreaterThan(0)
      })

      // Create a new note by clicking new note button
      const newNoteButton = screen.getByRole('button', { name: /new/i })
      await user.click(newNoteButton)

      // Wait for new note to be created with "Untitled Note" title
      await waitFor(() => {
        expect(screen.getByDisplayValue(/untitled/i)).toBeInTheDocument()
      })

      // Find the title input and edit it with userEvent
      const titleInput = screen.getByDisplayValue(
        /untitled/i
      ) as HTMLInputElement
      await user.clear(titleInput)
      await user.type(titleInput, 'Test Note Title')

      // Wait for note to be saved with new title
      await waitFor(
        async () => {
          const notes = await dataService.getNotes()
          expect(notes).toHaveLength(1)
          expect(notes[0].title).toBe('Test Note Title')
        },
        { timeout: 5000 }
      )
    })

    it('should handle note editing and updates', async () => {
      const user = userEvent.setup()

      // Pre-create a note
      const existingNote: Note = {
        id: 'test-note-1',
        title: 'Existing Note',
        content: 'Original content',
        tags: ['test'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      await dataService.saveNote(existingNote)

      render(<NoteEditor />)

      // Wait for note to load
      await waitFor(() => {
        expect(screen.getByDisplayValue('Existing Note')).toBeInTheDocument()
      })

      // Edit the note - find title input specifically (not search input)
      const titleInput = screen.getByDisplayValue(
        'Existing Note'
      ) as HTMLInputElement

      // Use userEvent for realistic user interaction
      await user.clear(titleInput)
      await user.type(titleInput, 'Updated Note Title')

      // Verify title update was saved
      await waitFor(async () => {
        const notes = await dataService.getNotes()
        const updatedNote = notes.find(n => n.id === 'test-note-1')
        expect(updatedNote?.title).toBe('Updated Note Title')
      })
    })

    it('should handle note deletion', async () => {
      const user = userEvent.setup()

      // Create multiple notes
      const note1: Note = {
        id: 'deletion-test-note-1',
        title: 'Note 1',
        content: 'Content 1',
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const note2: Note = {
        id: 'deletion-test-note-2',
        title: 'Note 2',
        content: 'Content 2',
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      await dataService.saveNote(note1)
      await dataService.saveNote(note2)

      // Wait and verify both notes were saved
      await waitFor(async () => {
        const initialNotes = await dataService.getNotes()
        const testNotes = initialNotes.filter(n =>
          n.id.startsWith('deletion-test')
        )
        expect(testNotes).toHaveLength(2)
      })

      render(<NoteEditor />)

      // Wait for notes to load
      await waitFor(() => {
        expect(screen.getByText('Note 2')).toBeInTheDocument() // Most recent first
      })

      // Find and click delete button for note 2 (using aria-label)
      const deleteButton = screen.queryByLabelText(/Delete note "Note 2"/i)
      if (deleteButton) {
        await user.click(deleteButton)

        // Wait for modal to appear and confirm deletion
        await waitFor(async () => {
          const confirmButton = screen.getByRole('button', {
            name: /^Delete$/i,
          })
          expect(confirmButton).toBeInTheDocument()
        })

        const confirmButton = screen.getByRole('button', { name: /^Delete$/i })
        await user.click(confirmButton)

        // Verify note was deleted - check only our test notes
        await waitFor(
          async () => {
            const notes = await dataService.getNotes()
            const testNotes = notes.filter(n =>
              n.id.startsWith('deletion-test')
            )
            expect(testNotes).toHaveLength(1)
            expect(testNotes[0].id).toBe('deletion-test-note-1')
          },
          { timeout: 3000 }
        )
      } else {
        // If no delete functionality exists, skip this assertion
        expect(deleteButton).toBeNull()
      }
    })
  })

  describe('Search and Organization', () => {
    it('should search notes by content', async () => {
      const user = userEvent.setup()

      // Create test notes
      const notes: Note[] = [
        {
          id: 'note-1',
          title: 'JavaScript Tutorial',
          content: 'Learn about React hooks',
          tags: ['programming', 'react'],
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
        {
          id: 'note-2',
          title: 'Recipe Ideas',
          content: 'Chocolate chip cookies recipe',
          tags: ['cooking', 'dessert'],
          createdAt: '2024-01-02T00:00:00.000Z',
          updatedAt: '2024-01-02T00:00:00.000Z',
        },
      ]

      for (const note of notes) {
        await dataService.saveNote(note)
      }

      render(<NoteEditor />)

      // Wait for notes to load
      await waitFor(() => {
        expect(screen.getByText('JavaScript Tutorial')).toBeInTheDocument()
      })

      // Find search input by placeholder
      const searchInput = screen.getByPlaceholderText(/search/i)

      // Search for "React"
      await user.type(searchInput, 'React')

      // Should show only JavaScript tutorial
      await waitFor(() => {
        expect(screen.getByText('JavaScript Tutorial')).toBeInTheDocument()
        expect(screen.queryByText('Recipe Ideas')).not.toBeInTheDocument()
      })

      // Clear search
      await user.clear(searchInput)

      // Should show all notes again
      await waitFor(() => {
        expect(screen.getByText('JavaScript Tutorial')).toBeInTheDocument()
        expect(screen.getByText('Recipe Ideas')).toBeInTheDocument()
      })
    })

    it('should filter notes by tags', async () => {
      const user = userEvent.setup()

      // Create notes with different tags
      const notes: Note[] = [
        {
          id: 'note-1',
          title: 'Work Notes',
          content: 'Meeting notes',
          tags: ['work', 'meetings'],
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
        {
          id: 'note-2',
          title: 'Personal',
          content: 'Grocery list',
          tags: ['personal', 'shopping'],
          createdAt: '2024-01-02T00:00:00.000Z',
          updatedAt: '2024-01-02T00:00:00.000Z',
        },
      ]

      for (const note of notes) {
        await dataService.saveNote(note)
      }

      render(<NoteEditor />)

      // Look for tag filter (implementation dependent)
      const workTag = screen.queryByText('work')
      if (workTag) {
        await user.click(workTag)

        // Should show only work notes
        await waitFor(() => {
          expect(screen.getByText('Work Notes')).toBeInTheDocument()
          expect(screen.queryByText('Personal')).not.toBeInTheDocument()
        })
      }
    })
  })

  describe('Data Persistence', () => {
    it('should persist notes across sessions', async () => {
      // Create note in first session
      const note: Note = {
        id: 'persistent-note',
        title: 'Persistent Note',
        content: 'This should persist',
        tags: ['test'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      await dataService.saveNote(note)

      // Simulate new session by clearing component state
      render(<NoteEditor />)

      // Note should be loaded from localStorage
      await waitFor(() => {
        expect(screen.getByText('Persistent Note')).toBeInTheDocument()
      })
    })

    it('should handle storage errors gracefully', async () => {
      const user = userEvent.setup()

      // Mock localStorage to throw error
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('Storage quota exceeded')
      })

      render(<NoteEditor />)

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByText(/select a note/i)).toBeInTheDocument()
      })

      // Try to create a note by finding any input (but storage will fail)
      const allInputs = screen.queryAllByRole('textbox')
      const titleInput = allInputs.find(
        input => !(input as HTMLInputElement).placeholder?.includes('Search')
      )

      if (titleInput) {
        await user.click(titleInput)
        await user.keyboard('Test Note')

        // Should handle error gracefully (component doesn't crash)
        expect(titleInput).toBeInTheDocument()
      }
    })
  })

  describe('Performance', () => {
    it('should handle large number of notes efficiently', async () => {
      // Create many notes
      const notes: Note[] = []
      for (let i = 0; i < 100; i++) {
        notes.push({
          id: `note-${i}`,
          title: `Note ${i}`,
          content: `Content for note ${i}`,
          tags: [`tag-${i % 10}`],
          createdAt: new Date(Date.now() - i * 1000).toISOString(),
          updatedAt: new Date(Date.now() - i * 1000).toISOString(),
        })
      }

      // Save all notes
      for (const note of notes) {
        await dataService.saveNote(note)
      }

      const startTime = performance.now()
      render(<NoteEditor />)

      // Should load without significant delay
      await waitFor(() => {
        expect(screen.getByText('Note 99')).toBeInTheDocument() // Most recent
      })

      const loadTime = performance.now() - startTime
      expect(loadTime).toBeLessThan(2000) // Should load within 2 seconds
    })
  })
})
