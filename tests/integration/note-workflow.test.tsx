import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { dataService } from '../../src/services/dataService'
import NoteEditor from '../../src/pages/NoteEditor'
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
        expect(screen.getByRole('textbox')).toBeInTheDocument()
      })
      
      // Create a new note by clicking new note button (if exists)
      const newNoteButton = screen.queryByRole('button', { name: /new/i })
      if (newNoteButton) {
        await user.click(newNoteButton)
      }
      
      // Find the title input
      const titleInput = screen.getByDisplayValue(/untitled/i) || screen.getByRole('textbox', { name: /title/i })
      await user.clear(titleInput)
      await user.type(titleInput, 'Test Note Title')
      
      // Find the content editor
      const contentEditor = screen.getByRole('textbox')
      await user.click(contentEditor)
      await user.type(contentEditor, 'This is test note content')
      
      // Wait for auto-save or trigger save
      await waitFor(async () => {
        const notes = await dataService.getNotes()
        expect(notes).toHaveLength(1)
        expect(notes[0].title).toBe('Test Note Title')
        expect(notes[0].content).toContain('This is test note content')
      }, { timeout: 5000 })
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
      
      // Edit the note
      const titleInput = screen.getByDisplayValue('Existing Note')
      await user.clear(titleInput)
      await user.type(titleInput, 'Updated Note Title')
      
      const contentEditor = screen.getByRole('textbox')
      await user.clear(contentEditor)
      await user.type(contentEditor, 'Updated content')
      
      // Verify update was saved
      await waitFor(async () => {
        const notes = await dataService.getNotes()
        const updatedNote = notes.find(n => n.id === 'test-note-1')
        expect(updatedNote?.title).toBe('Updated Note Title')
        expect(updatedNote?.content).toContain('Updated content')
      })
    })

    it('should handle note deletion', async () => {
      const user = userEvent.setup()
      
      // Create multiple notes
      const note1: Note = {
        id: 'note-1',
        title: 'Note 1',
        content: 'Content 1',
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      
      const note2: Note = {
        id: 'note-2',
        title: 'Note 2',
        content: 'Content 2',
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      
      await dataService.saveNote(note1)
      await dataService.saveNote(note2)
      
      render(<NoteEditor />)
      
      // Wait for notes to load
      await waitFor(() => {
        expect(screen.getByText('Note 2')).toBeInTheDocument() // Most recent first
      })
      
      // Find and click delete button (if it exists)
      const deleteButton = screen.queryByRole('button', { name: /delete/i })
      if (deleteButton) {
        await user.click(deleteButton)
        
        // Confirm deletion if there's a confirmation dialog
        const confirmButton = screen.queryByRole('button', { name: /confirm/i })
        if (confirmButton) {
          await user.click(confirmButton)
        }
        
        // Verify note was deleted
        await waitFor(async () => {
          const notes = await dataService.getNotes()
          expect(notes).toHaveLength(1)
          expect(notes[0].id).toBe('note-1')
        })
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
      
      // Find search input
      const searchInput = screen.getByRole('searchbox') || screen.getByPlaceholderText(/search/i)
      
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
      
      // Try to create a note
      const titleInput = screen.getByRole('textbox', { name: /title/i }) || screen.getByDisplayValue(/untitled/i)
      await user.type(titleInput, 'Test Note')
      
      // Should handle error gracefully (no crash)
      expect(screen.getByDisplayValue(/Test Note/)).toBeInTheDocument()
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