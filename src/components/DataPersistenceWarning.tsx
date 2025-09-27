import React, { useState, useEffect } from 'react'
import { AlertTriangle, X } from 'lucide-react'

/**
 * Data Persistence Warning Component
 *
 * Informs users about current data storage limitations during MVP phase
 * Will be removed when API integration is complete in Q4 2025
 */
const DataPersistenceWarning: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    // Check if user has previously dismissed this warning
    const dismissed =
      localStorage.getItem('paperlyte_warning_dismissed') === 'true'
    setIsDismissed(dismissed)

    // Show warning after a brief delay if not dismissed
    if (!dismissed) {
      const timer = setTimeout(() => setIsVisible(true), 2000)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleDismiss = () => {
    setIsVisible(false)
    setIsDismissed(true)
    localStorage.setItem('paperlyte_warning_dismissed', 'true')
  }

  if (isDismissed || !isVisible) {
    return null
  }

  return (
    <div className='fixed bottom-4 right-4 max-w-sm bg-yellow-50 border border-yellow-200 rounded-lg shadow-lg p-4 z-50'>
      <div className='flex items-start space-x-3'>
        <AlertTriangle className='h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5' />
        <div className='flex-1'>
          <h4 className='text-sm font-medium text-yellow-800 mb-1'>
            MVP Data Storage
          </h4>
          <p className='text-xs text-yellow-700 mb-2'>
            Your notes are currently stored locally on this device. For full
            data persistence and cross-device sync, please wait for our API
            integration in Q4 2025.
          </p>
          <button
            onClick={handleDismiss}
            className='text-xs text-yellow-800 hover:text-yellow-900 font-medium underline'
          >
            Got it, dismiss
          </button>
        </div>
        <button
          onClick={handleDismiss}
          className='text-yellow-600 hover:text-yellow-800 p-1'
        >
          <X className='h-4 w-4' />
        </button>
      </div>
    </div>
  )
}

export default DataPersistenceWarning
