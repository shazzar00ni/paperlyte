import {
  Maximize2,
  Menu,
  PlusCircle,
  Save,
  Search,
  Tag,
  Trash2,
  X,
} from 'lucide-react'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import ConfirmationModal from '../components/ConfirmationModal'
import RichTextEditor from '../components/RichTextEditor'
import TagModal from '../components/TagModal'
import { dataService } from '../services/dataService'
import type { Note } from '../types'
import { trackFeatureUsage, trackNoteEvent } from '../utils/analytics'
import { monitoring } from '../utils/monitoring'

const NoteEditor: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([])
  const [currentNote, setCurrentNote] = useState<Note | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [focusMode, setFocusMode] = useState(false)
  const [isTagModalOpen, setIsTagModalOpen] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const focusModeRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Define exitFocusMode before useEffect to avoid reference errors
  const exitFocusMode = useCallback(() => {
    setFocusMode(false)
    trackFeatureUsage('focus_mode', 'exit')
    monitoring.addBreadcrumb('Focus Mode exited', 'user_action')
  }, [])

  useEffect(() => {
    // Track editor page view
    trackFeatureUsage('note_editor', 'view')
    monitoring.addBreadcrumb('Note editor loaded', 'navigation')

    // Load notes from localStorage
    loadNotes()
  }, [])

  // Focus Mode event handlers
  useEffect(() => {
    if (!focusMode) return

    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        exitFocusMode()
      }
    }

    const handleClickOutside = (e: MouseEvent) => {
      if (
        focusModeRef.current &&
        !focusModeRef.current.contains(e.target as Node)
      ) {
        exitFocusMode()
      }
    }

    document.addEventListener('keydown', handleEscapeKey)
    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      document.removeEventListener('keydown', handleEscapeKey)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [focusMode, exitFocusMode])

  const loadNotes = async () => {
    try {
      // Use data service for persistence (currently localStorage, will be API in Q4 2025)
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

  const createNewNote = useCallback(async () => {
    const newNote: Note = {
      id: crypto.randomUUID(),
      title: 'Untitled Note',
      content: '',
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // Save the new note using data service
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
  }, [notes])

  const updateCurrentNote = async (updates: Partial<Note>) => {
    if (!currentNote) return

    const updatedNote = {
      ...currentNote,
      ...updates,
      updatedAt: new Date().toISOString(),
    }

    // Save individual note using data service
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

  const saveCurrentNote = useCallback(async () => {
    if (!currentNote) return

    setIsLoading(true)
    try {
      // Simulate save delay
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
  }, [currentNote])

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyboardShortcuts = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input/textarea
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Allow Ctrl+S and Ctrl+F even in contenteditable
        if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'f')) {
          // Continue to handle these shortcuts
        } else {
          return
        }
      }

      // Ctrl/Cmd + S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        saveCurrentNote()
      }

      // Ctrl/Cmd + F to focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }

      // Ctrl/Cmd + N to create new note
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault()
        createNewNote()
      }

      // Ctrl/Cmd + T to open tag modal
      if ((e.ctrlKey || e.metaKey) && e.key === 't' && currentNote) {
        e.preventDefault()
        setIsTagModalOpen(true)
      }
    }

    document.addEventListener('keydown', handleKeyboardShortcuts)

    return () => {
      document.removeEventListener('keydown', handleKeyboardShortcuts)
    }
  }, [currentNote, createNewNote, saveCurrentNote])

  const handleDeleteNote = (note: Note, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent note selection when clicking delete
    setNoteToDelete(note)
    setIsDeleteModalOpen(true)
  }

  const confirmDeleteNote = async () => {
    if (!noteToDelete) return

    setIsDeleting(true)
    try {
      const success = await dataService.deleteNote(noteToDelete.id)
      if (success) {
        const updatedNotes = notes.filter(note => note.id !== noteToDelete.id)
        setNotes(updatedNotes)

        // If we deleted the current note, select the first remaining note or clear selection
        if (currentNote?.id === noteToDelete.id) {
          setCurrentNote(updatedNotes.length > 0 ? updatedNotes[0] : null)
        }

        trackNoteEvent('delete', { noteId: noteToDelete.id })
        monitoring.addBreadcrumb('Note deleted', 'user_action', {
          noteId: noteToDelete.id,
        })

        // Close modal and reset state
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

  const cancelDeleteNote = () => {
    setIsDeleteModalOpen(false)
    setNoteToDelete(null)
  }

  const handleSaveTags = async (tags: string[]) => {
    if (!currentNote) return

    await updateCurrentNote({ tags })
    trackNoteEvent('edit', {
      noteId: currentNote.id,
      field: 'tags',
      tagCount: tags.length,
    })
  }

  const enterFocusMode = () => {
    setFocusMode(true)
    trackFeatureUsage('focus_mode', 'enter')
    monitoring.addBreadcrumb('Focus Mode entered', 'user_action')
  }

  const filteredNotes = (notes || []).filter(
    note =>
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.tags.some(tag =>
        tag.toLowerCase().includes(searchQuery.toLowerCase())
      )
  )

  return (
    <div className='h-screen flex bg-background relative'>
      {/* Mobile Sidebar Backdrop */}
      {isSidebarOpen && (
        <div
          className='fixed inset-0 bg-black bg-opacity-50 z-10 md:hidden'
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden='true'
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed md:static inset-y-0 left-0 z-20 w-80 bg-white border-r border-gray-200 flex flex-col transform transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Sidebar Header with Close Button (Mobile) */}
        <div className='p-4 border-b border-gray-200 md:hidden flex items-center justify-between'>
          <h2 className='text-lg font-semibold text-dark'>Notes</h2>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className='p-2 rounded-lg hover:bg-gray-100 transition-colors'
            aria-label='Close sidebar'
          >
            <X className='h-5 w-5 text-gray-600' />
          </button>
        </div>

        {/* Search */}
        <div className='p-4 border-b border-gray-200'>
          <div className='relative'>
            <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4' />
            <input
              type='text'
              placeholder='Search notes...'
              value={searchQuery}
              ref={searchInputRef}
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

        {/* Notes List */}
        <div className='flex-1 overflow-y-auto'>
          {filteredNotes.map(note => (
            <div
              key={note.id}
              onClick={() => {
                setCurrentNote(note)
                setIsSidebarOpen(false) // Close sidebar on mobile when note is selected
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

      {/* Editor */}
      <div className='flex-1 flex flex-col'>
        {currentNote ? (
          <>
            {/* Editor Header */}
            <div className='bg-white border-b border-gray-200 p-4 flex items-center justify-between gap-2'>
              {/* Mobile Menu Button */}
              <button
                type="button"
                onClick={() => setIsSidebarOpen(true)}
                className='md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0'
                aria-label='Open sidebar'
              >
                <Menu className='h-5 w-5 text-gray-600' />
              </button>

              <input
                type='text'
                value={currentNote.title}
                onChange={e => updateCurrentNote({ title: e.target.value })}
                className='text-lg md:text-xl font-semibold text-dark bg-transparent border-none outline-none flex-1 min-w-0'
                placeholder='Note title...'
              />
              <div className='flex items-center space-x-2 flex-shrink-0'>
                <button
                  onClick={() => setIsTagModalOpen(true)}
                  className='btn-ghost btn-sm flex items-center space-x-1'
                  title='Manage Tags (Ctrl+T)'
                >
                  <Tag className='h-4 w-4' />
                  <span className='hidden sm:inline'>Tags</span>
                  {currentNote.tags.length > 0 && (
                    <span className='ml-1 px-2 py-0.5 bg-primary text-white text-xs rounded-full'>
                      {currentNote.tags.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={enterFocusMode}
                  className='btn-ghost btn-sm flex items-center space-x-1'
                  title='Enter Focus Mode'
                >
                  <Maximize2 className='h-4 w-4' />
                  <span className='hidden sm:inline'>Focus</span>
                </button>
                <button
                  onClick={saveCurrentNote}
                  disabled={isLoading}
                  className='btn-primary btn-sm flex items-center space-x-1'
                >
                  <Save className='h-4 w-4' />
                  <span className='hidden sm:inline'>
                    {isLoading ? 'Saving...' : 'Save'}
                  </span>
                </button>
              </div>
            </div>

            {/* Editor Content */}
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
          <div className='flex-1 flex flex-col items-center justify-center text-gray-500'>
            {/* Mobile Menu Button for Empty State */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className='md:hidden mb-4 p-3 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors flex items-center space-x-2'
              aria-label='Open notes list'
            >
              <Menu className='h-5 w-5' />
              <span>Open Notes</span>
            </button>
            <div className='text-center'>
              <PlusCircle className='h-12 w-12 mx-auto mb-4 text-gray-300' />
              <p className='text-lg'>Select a note to start editing</p>
              <p className='text-sm'>or create a new one</p>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
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

      {/* Tag Management Modal */}
      {currentNote && (
        <TagModal
          isOpen={isTagModalOpen}
          onClose={() => setIsTagModalOpen(false)}
          tags={currentNote.tags}
          onSave={handleSaveTags}
        />
      )}

      {/* Focus Mode Overlay */}
      {focusMode && currentNote && (
        <div className='fixed inset-0 bg-background z-50 flex items-center justify-center p-4'>
          <div
            ref={focusModeRef}
            className='w-full max-w-4xl h-full flex flex-col bg-white rounded-lg shadow-lg p-8'
          >
            {/* Focus Mode Header */}
            <div className='flex items-center justify-between mb-6'>
              <input
                type='text'
                value={currentNote.title}
                onChange={e => updateCurrentNote({ title: e.target.value })}
                className='text-3xl font-bold text-dark bg-transparent border-none outline-none flex-1'
                placeholder='Note title...'
              />
              <button
                onClick={exitFocusMode}
                className='ml-4 p-2 text-gray-400 hover:text-dark hover:bg-gray-100 rounded-full transition-colors'
                title='Exit Focus Mode (ESC)'
                aria-label='Exit Focus Mode'
              >
                <X className='h-6 w-6' />
              </button>
            </div>

            {/* Focus Mode Content */}
            <div className='flex-1 overflow-hidden'>
              <RichTextEditor
                content={currentNote.content}
                onChange={content => updateCurrentNote({ content })}
                placeholder='Start writing your thoughts...'
                className='h-full text-lg'
                disabled={isLoading}
              />
            </div>

            {/* Focus Mode Footer - Save Status */}
            <div className='mt-4 flex items-center justify-center text-sm text-gray-500'>
              {isLoading ? (
                <span className='flex items-center space-x-2'>
                  <Save className='h-4 w-4 animate-pulse' />
                  <span>Saving...</span>
                </span>
              ) : (
                <span className='flex items-center space-x-2'>
                  <Save className='h-4 w-4' />
                  <span>Auto-saved</span>
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default NoteEditor
