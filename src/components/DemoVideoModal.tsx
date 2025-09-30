import React from 'react'
import { X } from 'lucide-react'

interface DemoVideoModalProps {
  isOpen: boolean
  onClose: () => void
  videoTitle: string
  videoDescription: string
}

const DemoVideoModal: React.FC<DemoVideoModalProps> = ({
  isOpen,
  onClose,
  videoTitle,
  videoDescription,
}) => {
  if (!isOpen) return null

  return (
    <div className='modal-overlay' onClick={onClose}>
      <div
        className='modal-content max-w-4xl w-full'
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className='flex justify-between items-center mb-6'>
          <h2 className='text-2xl font-bold text-dark'>{videoTitle}</h2>
          <button
            onClick={onClose}
            className='text-gray-400 hover:text-gray-600 p-1'
            aria-label='Close demo video'
          >
            <X className='h-6 w-6' />
          </button>
        </div>

        {/* Video Container */}
        <div className='relative aspect-video bg-gray-900 rounded-lg overflow-hidden mb-4'>
          {/* Placeholder for video - would be replaced with actual video embed */}
          <div className='absolute inset-0 flex items-center justify-center text-white'>
            <div className='text-center'>
              <div className='text-6xl mb-4'>🎬</div>
              <p className='text-xl font-semibold mb-2'>
                Demo Video Coming Soon
              </p>
              <p className='text-gray-300'>{videoDescription}</p>
            </div>
          </div>
          {/* 
            Future implementation would use an iframe for video:
            <iframe
              src="https://www.youtube.com/embed/VIDEO_ID"
              title={videoTitle}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          */}
        </div>

        {/* Description */}
        <div className='text-gray-600'>
          <p>
            This interactive demo will showcase how to{' '}
            {videoDescription.toLowerCase()}.
          </p>
        </div>

        {/* Action Buttons */}
        <div className='flex justify-end gap-4 mt-6'>
          <button onClick={onClose} className='btn-secondary btn-md'>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default DemoVideoModal
