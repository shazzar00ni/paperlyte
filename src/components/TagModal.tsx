import React, { useState, useEffect } from 'react'
import { X, Plus, Tag } from 'lucide-react'

interface TagModalProps {
  isOpen: boolean
  onClose: () => void
  tags: string[]
  onSave: (tags: string[]) => void
}

/**
 * Modal for managing note tags
 * Allows adding and removing tags with keyboard support
 */
const TagModal: React.FC<TagModalProps> = ({
  isOpen,
  onClose,
  tags,
  onSave,
}) => {
  const [localTags, setLocalTags] = useState<string[]>(tags)
  const [newTag, setNewTag] = useState('')

  useEffect(() => {
    setLocalTags(tags)
  }, [tags, isOpen])

  const handleAddTag = () => {
    const trimmedTag = newTag.trim().toLowerCase()
    if (trimmedTag && !localTags.includes(trimmedTag)) {
      setLocalTags([...localTags, trimmedTag])
      setNewTag('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setLocalTags(localTags.filter(tag => tag !== tagToRemove))
  }

  const handleSave = () => {
    onSave(localTags)
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddTag()
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50'>
      <div className='bg-white rounded-lg shadow-xl max-w-md w-full mx-4'>
        {/* Header */}
        <div className='flex items-center justify-between p-6 border-b border-gray-200'>
          <div className='flex items-center space-x-2'>
            <Tag className='h-5 w-5 text-primary' />
            <h2 className='text-xl font-semibold text-dark'>Manage Tags</h2>
          </div>
          <button
            onClick={onClose}
            className='p-1 text-gray-400 hover:text-dark rounded-full hover:bg-gray-100 transition-colors'
            aria-label='Close modal'
          >
            <X className='h-5 w-5' />
          </button>
        </div>

        {/* Content */}
        <div className='p-6'>
          {/* Add Tag Input */}
          <div className='flex space-x-2 mb-4'>
            <input
              type='text'
              value={newTag}
              onChange={e => setNewTag(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder='Add a tag...'
              className='input flex-1'
              autoFocus
            />
            <button
              onClick={handleAddTag}
              disabled={!newTag.trim()}
              className='btn-primary btn-md flex items-center space-x-1'
              title='Add tag'
            >
              <Plus className='h-4 w-4' />
              <span>Add</span>
            </button>
          </div>

          {/* Tags List */}
          <div className='space-y-2'>
            {localTags.length === 0 ? (
              <p className='text-gray-500 text-center py-4'>
                No tags yet. Add some to organize your notes!
              </p>
            ) : (
              <div className='flex flex-wrap gap-2'>
                {localTags.map((tag, index) => (
                  <div
                    key={index}
                    className='flex items-center space-x-2 px-3 py-2 bg-primary/10 text-primary rounded-full'
                  >
                    <span className='text-sm font-medium'>{tag}</span>
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className='p-0.5 hover:bg-primary/20 rounded-full transition-colors'
                      aria-label={`Remove tag ${tag}`}
                    >
                      <X className='h-3 w-3' />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className='flex items-center justify-end space-x-3 p-6 border-t border-gray-200'>
          <button onClick={onClose} className='btn-ghost btn-md'>
            Cancel
          </button>
          <button onClick={handleSave} className='btn-primary btn-md'>
            Save Tags
          </button>
        </div>
      </div>
    </div>
  )
}

export default TagModal
