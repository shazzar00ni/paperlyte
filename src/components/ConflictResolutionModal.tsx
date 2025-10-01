import React, { useState } from 'react'
import { X, AlertTriangle, Clock, CheckCircle } from 'lucide-react'
import type { SyncConflict } from '../types'
import { trackFeatureUsage } from '../utils/analytics'
import { monitoring } from '../utils/monitoring'

interface ConflictResolutionModalProps {
  conflict: SyncConflict
  isOpen: boolean
  onClose: () => void
  onResolve: (selectedVersion: 'local' | 'remote') => void
}

/**
 * ConflictResolutionModal - UI for manual conflict resolution
 *
 * Displays both versions of a conflicted note and allows user to choose which to keep
 */
const ConflictResolutionModal: React.FC<ConflictResolutionModalProps> = ({
  conflict,
  isOpen,
  onClose,
  onResolve,
}) => {
  const [selectedVersion, setSelectedVersion] = useState<'local' | 'remote'>(
    'local'
  )
  const [isResolving, setIsResolving] = useState(false)

  if (!isOpen) return null

  const handleResolve = async () => {
    setIsResolving(true)
    trackFeatureUsage('conflict_resolution', 'resolve', {
      version: selectedVersion,
    })

    try {
      onResolve(selectedVersion)
      monitoring.addBreadcrumb('Conflict resolved by user', 'sync', {
        noteId: conflict.noteId,
        selectedVersion,
      })
    } catch (error) {
      monitoring.logError(error as Error, {
        feature: 'conflict_resolution',
        action: 'resolve',
      })
    } finally {
      setIsResolving(false)
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleString()
  }

  const truncateContent = (content: string, maxLength = 200) => {
    if (content.length <= maxLength) return content
    return content.substring(0, maxLength) + '...'
  }

  return (
    <div className='modal-overlay' onClick={onClose}>
      <div
        className='modal-content max-w-4xl'
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className='flex justify-between items-start mb-6'>
          <div className='flex items-start gap-3'>
            <AlertTriangle className='h-6 w-6 text-orange-600 mt-1' />
            <div>
              <h2 className='text-2xl font-bold text-dark'>
                Resolve Sync Conflict
              </h2>
              <p className='text-gray-600 mt-1'>
                This note was modified on multiple devices. Choose which version
                to keep.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className='text-gray-400 hover:text-gray-600 p-1'
            disabled={isResolving}
          >
            <X className='h-6 w-6' />
          </button>
        </div>

        {/* Conflict Info */}
        <div className='mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg'>
          <div className='flex items-center gap-2 text-orange-800'>
            <Clock className='w-4 h-4' />
            <span className='text-sm'>
              Conflict detected on {formatTimestamp(conflict.detectedAt)}
            </span>
          </div>
        </div>

        {/* Version Comparison */}
        <div className='grid grid-cols-2 gap-4 mb-6'>
          {/* Local Version */}
          <button
            onClick={() => setSelectedVersion('local')}
            className={`p-4 rounded-lg border-2 text-left transition-all ${
              selectedVersion === 'local'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className='flex items-center justify-between mb-3'>
              <div className='flex items-center gap-2'>
                <h3 className='font-semibold text-lg'>Local Version</h3>
                {selectedVersion === 'local' && (
                  <CheckCircle className='w-5 h-5 text-blue-600' />
                )}
              </div>
              <span className='text-xs text-gray-500'>This Device</span>
            </div>

            <div className='space-y-2'>
              <div>
                <label className='text-xs text-gray-600 font-medium'>
                  Title
                </label>
                <p className='text-sm text-dark font-medium'>
                  {conflict.localNote.title || 'Untitled'}
                </p>
              </div>

              <div>
                <label className='text-xs text-gray-600 font-medium'>
                  Content Preview
                </label>
                <p className='text-sm text-gray-700'>
                  {truncateContent(conflict.localNote.content)}
                </p>
              </div>

              <div className='flex items-center gap-2 text-xs text-gray-500'>
                <Clock className='w-3 h-3' />
                <span>
                  Modified: {formatTimestamp(conflict.localNote.updatedAt)}
                </span>
              </div>

              {conflict.localNote.tags.length > 0 && (
                <div className='flex flex-wrap gap-1'>
                  {conflict.localNote.tags.map(tag => (
                    <span
                      key={tag}
                      className='px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded'
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </button>

          {/* Remote Version */}
          <button
            onClick={() => setSelectedVersion('remote')}
            className={`p-4 rounded-lg border-2 text-left transition-all ${
              selectedVersion === 'remote'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className='flex items-center justify-between mb-3'>
              <div className='flex items-center gap-2'>
                <h3 className='font-semibold text-lg'>Remote Version</h3>
                {selectedVersion === 'remote' && (
                  <CheckCircle className='w-5 h-5 text-blue-600' />
                )}
              </div>
              <span className='text-xs text-gray-500'>Cloud</span>
            </div>

            <div className='space-y-2'>
              <div>
                <label className='text-xs text-gray-600 font-medium'>
                  Title
                </label>
                <p className='text-sm text-dark font-medium'>
                  {conflict.remoteNote.title || 'Untitled'}
                </p>
              </div>

              <div>
                <label className='text-xs text-gray-600 font-medium'>
                  Content Preview
                </label>
                <p className='text-sm text-gray-700'>
                  {truncateContent(conflict.remoteNote.content)}
                </p>
              </div>

              <div className='flex items-center gap-2 text-xs text-gray-500'>
                <Clock className='w-3 h-3' />
                <span>
                  Modified: {formatTimestamp(conflict.remoteNote.updatedAt)}
                </span>
              </div>

              {conflict.remoteNote.tags.length > 0 && (
                <div className='flex flex-wrap gap-1'>
                  {conflict.remoteNote.tags.map(tag => (
                    <span
                      key={tag}
                      className='px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded'
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </button>
        </div>

        {/* Warning Message */}
        <div className='mb-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg'>
          <p className='text-sm text-yellow-800'>
            <strong>Note:</strong> The version you don&apos;t select will be
            permanently discarded. Make sure to review both versions carefully.
          </p>
        </div>

        {/* Action Buttons */}
        <div className='flex justify-end gap-3'>
          <button
            onClick={onClose}
            className='btn-secondary btn-md'
            disabled={isResolving}
          >
            Cancel
          </button>
          <button
            onClick={handleResolve}
            className='btn-primary btn-md'
            disabled={isResolving}
          >
            {isResolving ? 'Resolving...' : `Keep ${selectedVersion} Version`}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConflictResolutionModal
