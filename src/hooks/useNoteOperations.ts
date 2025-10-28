/**
 * Custom hook for note CRUD operations
 *
 * Extracts note creation, updating, deletion, and loading logic
 * from components for better testability and reuse.
 */

import { useCallback, useState } from 'react'
import { dataService } from '../services/dataService'
import type { Note } from '../types'
import { trackNoteEvent } from '../utils/analytics'
import { monitoring } from '../utils/monitoring'

export interface UseNoteOperationsReturn {
  notes: Note[]
  currentNote: Note | null
  isLoading: boolean
  setCurrentNote: (note: Note | null) => void
  loadNotes: () => Promise<void>
  createNote: () => Promise<void>
  updateNote: (updates: Partial<Note>) => Promise<boolean>
  deleteNote: (noteId: string) => Promise<boolean>
  selectNote: (note: Note) => void
}

export function useNoteOperations(): UseNoteOperationsReturn {
  const [notes, setNotes] = useState<Note[]>([])
  const [currentNote, setCurrentNote] = useState<Note | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  /**
   * Load all notes from storage
   */
  const loadNotes = useCallback(async () => {
    setIsLoading(true)
    try {
      const savedNotes = await dataService.getNotes()
      setNotes(savedNotes)

      // Auto-select first note if available
      if (savedNotes.length > 0 && !currentNote) {
        setCurrentNote(savedNotes[0])
      }

      monitoring.addBreadcrumb('Notes loaded', 'info', {
        count: savedNotes.length,
      })
    } catch (error) {
      monitoring.logError(error as Error, {
        feature: 'note_operations',
        action: 'load_notes',
      })
    } finally {
      setIsLoading(false)
    }
  }, [currentNote])

  /**
   * Create a new note
   */
  const createNote = useCallback(async () => {
    const newNote: Note = {
      id: crypto.randomUUID(),
      title: 'Untitled Note',
      content: '',
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    setIsLoading(true)
    try {
      const success = await dataService.saveNote(newNote)

      if (success) {
        const updatedNotes = [newNote, ...notes]
        setNotes(updatedNotes)
        setCurrentNote(newNote)

        trackNoteEvent('create', { noteId: newNote.id })
        monitoring.addBreadcrumb('Note created', 'user_action', {
          noteId: newNote.id,
        })
      } else {
        throw new Error('Failed to save new note')
      }
    } catch (error) {
      monitoring.logError(error as Error, {
        feature: 'note_operations',
        action: 'create_note',
      })
    } finally {
      setIsLoading(false)
    }
  }, [notes])

  /**
   * Update the current note
   */
  const updateNote = useCallback(
    async (updates: Partial<Note>): Promise<boolean> => {
      if (!currentNote) {
        monitoring.addBreadcrumb(
          'Attempted to update note with no current note',
          'warning'
        )
        return false
      }

      const updatedNote: Note = {
        ...currentNote,
        ...updates,
        updatedAt: new Date().toISOString(),
      }

      try {
        const success = await dataService.saveNote(updatedNote)

        if (success) {
          // Update notes list
          const updatedNotes = notes.map(note =>
            note.id === currentNote.id ? updatedNote : note
          )
          setNotes(updatedNotes)
          setCurrentNote(updatedNote)

          trackNoteEvent('edit', {
            noteId: currentNote.id,
            field: Object.keys(updates)[0],
          })

          return true
        }

        return false
      } catch (error) {
        monitoring.logError(error as Error, {
          feature: 'note_operations',
          action: 'update_note',
          additionalData: { noteId: currentNote.id },
        })
        return false
      }
    },
    [currentNote, notes]
  )

  /**
   * Delete a note (soft delete)
   */
  const deleteNote = useCallback(
    async (noteId: string): Promise<boolean> => {
      setIsLoading(true)
      try {
        const success = await dataService.deleteNote(noteId)

        if (success) {
          const updatedNotes = notes.filter(note => note.id !== noteId)
          setNotes(updatedNotes)

          // If we deleted the current note, select another one
          if (currentNote?.id === noteId) {
            setCurrentNote(updatedNotes.length > 0 ? updatedNotes[0] : null)
          }

          trackNoteEvent('delete', { noteId })
          monitoring.addBreadcrumb('Note deleted', 'user_action', { noteId })

          return true
        }

        return false
      } catch (error) {
        monitoring.logError(error as Error, {
          feature: 'note_operations',
          action: 'delete_note',
          additionalData: { noteId },
        })
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [notes, currentNote]
  )

  /**
   * Select a note to view/edit
   */
  const selectNote = useCallback((note: Note) => {
    setCurrentNote(note)
    monitoring.addBreadcrumb('Note selected', 'user_action', {
      noteId: note.id,
    })
  }, [])

  return {
    notes,
    currentNote,
    isLoading,
    setCurrentNote,
    loadNotes,
    createNote,
    updateNote,
    deleteNote,
    selectNote,
  }
}
