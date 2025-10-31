import React, { useState, useEffect } from 'react'
import { Save, Tag, Search, PlusCircle, Trash2 } from 'lucide-react'
import { trackNoteEvent, trackFeatureUsage } from '../utils/analytics'
import { monitoring } from '../utils/monitoring'
import { dataService } from '../services/dataService'
import RichTextEditor from '../components/RichTextEditor'
import ConfirmationModal from '../components/ConfirmationModal'
import type { Note } from '../types'

/**
 * @component NoteEditor
 * @description The main interface for creating, editing, and managing notes.
 * It features a sidebar for note navigation and a rich text editor for content.
 * @returns {React.ReactElement} The rendered note editor component.
 */
const NoteEditor: React.FC = () => {
  // State for the list of all notes.
  const [notes, setNotes] = useState<Note[]>([])
  // State for the currently selected note.
  const [currentNote, setCurrentNote] = useState<Note | null>(null)
  // State for the search input.
  const [searchQuery, setSearchQuery] = useState('')
  // State to indicate loading, e.g., during a save operation.
  const [isLoading, setIsLoading] = useState(false)
  // State to control the delete confirmation modal.
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  // State to hold the note that is about to be deleted.
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null)
  // State to indicate that a delete operation is in progress.
  const [isDeleting, setIsDeleting] = useState(false)

  // Effect to load notes when the component mounts.
  useEffect(() => {
    trackFeatureUsage('note_editor', 'view')
    monitoring.addBreadcrumb('Note editor loaded', 'navigation')
    loadNotes()
  }, [])

  /**
   * @function loadNotes
   * @description Fetches all notes from the data service and populates the state.
   * It sets the first note as the current note if available.
   */
  const loadNotes = async () => {
    try {
      const savedNotes = await dataService.getNotes()
      setNotes(savedNotes)
      if (savedNotes.length > 0) {
        setCurrentNote(savedNotes[0])
      }
    } catch (error) {
      monitoring.logError(error as Error, {
        feature: 'note_editor',
        action: 'load_notes',
      })
    }
  }

  /**
   * @function createNewNote
   * @description Creates a new, empty note and saves it.
   * The new note is then set as the current note.
   */
  const createNewNote = async () => {
    const newNote: Note = {
      id: crypto.randomUUID(),
      title: 'Untitled Note',
      content: '',
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const success = await dataService.saveNote(newNote)
    if (success) {
      const updatedNotes = [newNote, ...notes]
      setNotes(updatedNotes)
      setCurrentNote(newNote)
      trackNoteEvent('create', { noteId: newNote.id })
    } else {
      monitoring.logError(new Error('Failed to create new note'), {
        feature: 'note_editor',
        action: 'create_note_failed',
      })
    }
  }

  /**
   * @function updateCurrentNote
   * @description Updates the properties of the current note and saves the changes.
   * @param {Partial<Note>} updates - An object with the note properties to update.
   */
  const updateCurrentNote = async (updates: Partial<Note>) => {
    if (!currentNote) return

    const updatedNote = {
      ...currentNote,
      ...updates,
      updatedAt: new Date().toISOString(),
    }

    const success = await dataService.saveNote(updatedNote)
    if (success) {
      const updatedNotes = notes.map(note =>
        note.id === currentNote.id ? updatedNote : note
      )
      setNotes(updatedNotes)
      setCurrentNote(updatedNote)
      trackNoteEvent('edit', {
        noteId: currentNote.id,
        field: Object.keys(updates)[0],
      })
    } else {
      monitoring.logError(new Error('Failed to update note'), {
        feature: 'note_editor',
        action: 'update_note_failed',
        additionalData: { noteId: currentNote.id },
      })
    }
  }

  /**
   * @function saveCurrentNote
   * @description A placeholder for a manual save action.
   * Simulates a save delay and logs the event.
   */
  const saveCurrentNote = async () => {
    if (!currentNote) return

    setIsLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 500))
      trackNoteEvent('save', { noteId: currentNote.id })
      monitoring.addBreadcrumb('Note saved', 'user_action', {
        noteId: currentNote.id,
      })
    } catch (error) {
      monitoring.logError(error as Error, {
        feature: 'note_editor',
        action: 'save_note',
        additionalData: { noteId: currentNote.id },
      })
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * @function handleDeleteNote
   * @description Initiates the note deletion process by opening a confirmation modal.
   * @param {Note} note - The note to be deleted.
   * @param {React.MouseEvent} e - The mouse event, used to stop propagation.
   */
  const handleDeleteNote = (note: Note, e: React.MouseEvent) => {
    e.stopPropagation() // Prevents the note from being selected when clicking the delete button.
    setNoteToDelete(note)
    setIsDeleteModalOpen(true)
  }

  /**
   * @function confirmDeleteNote
   * @description Deletes the selected note after confirmation.
   * It updates the notes list and selects a new current note.
   */
  const confirmDeleteNote = async () => {
    if (!noteToDelete) return

    setIsDeleting(true)
    try {
      const success = await dataService.deleteNote(noteToDelete.id)
      if (success) {
        const updatedNotes = notes.filter(note => note.id !== noteToDelete.id)
        setNotes(updatedNotes)

        // If the deleted note was the current one, select the next available note.
        if (currentNote?.id === noteToDelete.id) {
          setCurrentNote(updatedNotes.length > 0 ? updatedNotes[0] : null)
        }

        trackNoteEvent('delete', { noteId: noteToDelete.id })
        monitoring.addBreadcrumb('Note deleted', 'user_action', {
          noteId: noteToDelete.id,
        })

        // Reset the delete modal state.
        setIsDeleteModalOpen(false)
        setNoteToDelete(null)
      } else {
        monitoring.logError(new Error('Failed to delete note'), {
          feature: 'note_editor',
          action: 'delete_note_failed',
          additionalData: { noteId: noteToDelete.id },
        })
      }
    } catch (error) {
      monitoring.logError(error as Error, {
        feature: 'note_editor',
        action: 'delete_note',
        additionalData: { noteId: noteToDelete.id },
      })
    } finally {
      setIsDeleting(false)
    }
  }

  /**
   * @function cancelDeleteNote
   * @description Closes the delete confirmation modal without deleting the note.
   */
  const cancelDeleteNote = () => {
    setIsDeleteModalOpen(false)
    setNoteToDelete(null)
  }

  // Filter the notes based on the search query.
  const filteredNotes = notes.filter(
    note =>
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.tags.some(tag =>
        tag.toLowerCase().includes(searchQuery.toLowerCase())
      )
  )

  return (
    <div className='h-screen flex bg-background'>
      {/* Sidebar for note navigation and creation. */}
      <div className='w-80 bg-white border-r border-gray-200 flex flex-col'>
        {/* Search Input */}
        <div className='p-4 border-b border-gray-200'>
          <div className='relative'>
            <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4' />
            <input
              type='text'
              placeholder='Search notes...'
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value)
                trackFeatureUsage('search', 'query', { query: e.target.value })
              }}
              className='input pl-10 text-sm'
            />
          </div>
        </div>

        {/* New Note Button */}
        <div className='p-4'>
          <button
            onClick={createNewNote}
            className='btn-primary btn-md w-full flex items-center justify-center space-x-2'
          >
            <PlusCircle className='h-4 w-4' />
            <span>New Note</span>
          </button>
        </div>

        {/* List of Notes */}
        <div className='flex-1 overflow-y-auto'>
          {filteredNotes.map(note => (
            <div
              key={note.id}
              onClick={() => {
                setCurrentNote(note)
                trackFeatureUsage('note_list', 'select_note', {
                  noteId: note.id,
                })
              }}
              className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors group ${
                currentNote?.id === note.id
                  ? 'bg-primary/5 border-l-4 border-l-primary'
                  : ''
              }`}
            >
              <div className='flex items-start justify-between'>
                <div className='flex-1 min-w-0'>
                  <h3 className='font-medium text-dark truncate'>
                    {note.title}
                  </h3>
                  <p className='text-sm text-gray-600 mt-1 line-clamp-2'>
                    {note.content || 'No content yet...'}
                  </p>
                  <div className='flex items-center justify-between mt-2'>
                    <div className='flex flex-wrap gap-1'>
                      {note.tags.slice(0, 2).map((tag, index) => (
                        <span
                          key={index}
                          className='px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded'
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <span className='text-xs text-gray-400'>
                      {new Date(note.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                {/* Delete button, shown on hover. */}
                <button
                  onClick={e => handleDeleteNote(note, e)}
                  disabled={isDeleteModalOpen || isDeleting}
                  className='ml-2 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 focus:text-red-600 focus:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 disabled:opacity-50 disabled:cursor-not-allowed'
                  title='Delete note'
                  aria-label={`Delete note "${note.title}"`}
                >
                  <Trash2 className='h-4 w-4' />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main editor area. */}
      <div className='flex-1 flex flex-col'>
        {currentNote ? (
          <>
            {/* Header with note title and actions. */}
            <div className='bg-white border-b border-gray-200 p-4 flex items-center justify-between'>
              <input
                type='text'
                value={currentNote.title}
                onChange={e => updateCurrentNote({ title: e.target.value })}
                className='text-xl font-semibold text-dark bg-transparent border-none outline-none flex-1'
                placeholder='Note title...'
              />
              <div className='flex items-center space-x-2'>
                <button className='btn-ghost btn-sm flex items-center space-x-1'>
                  <Tag className='h-4 w-4' />
                  <span>Tags</span>
                </button>
                <button
                  onClick={saveCurrentNote}
                  disabled={isLoading}
                  className='btn-primary btn-sm flex items-center space-x-1'
                >
                  <Save className='h-4 w-4' />
                  <span>{isLoading ? 'Saving...' : 'Save'}</span>
                </button>
              </div>
            </div>

            {/* Rich text editor for the note content. */}
            <div className='flex-1'>
              <RichTextEditor
                content={currentNote.content}
                onChange={content => updateCurrentNote({ content })}
                placeholder='Start writing your thoughts...'
                className='h-full'
                disabled={isLoading}
              />
            </div>
          </>
        ) : (
          // Placeholder screen when no note is selected.
          <div className='flex-1 flex items-center justify-center text-gray-500'>
            <div className='text-center'>
              <PlusCircle className='h-12 w-12 mx-auto mb-4 text-gray-300' />
              <p className='text-lg'>Select a note to start editing</p>
              <p className='text-sm'>or create a new one</p>
            </div>
          </div>
        )}
      </div>

      {/* Modal for confirming note deletion. */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={cancelDeleteNote}
        title='Delete Note'
        message={`Are you sure you want to delete "${noteToDelete?.title}"? This action cannot be undone.`}
        confirmText='Delete'
        cancelText='Cancel'
        confirmVariant='danger'
        onConfirm={confirmDeleteNote}
        isLoading={isDeleting}
      />
    </div>
  )
}

export default NoteEditor
