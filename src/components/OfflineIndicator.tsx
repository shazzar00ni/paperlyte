import React, { useState, useEffect } from 'react'
import { WifiOff } from 'lucide-react'

/**
 * OfflineIndicator Component
 *
 * Displays a banner when the user loses internet connectivity.
 * Useful for PWA to inform users about offline state.
 */
const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (isOnline) {
    return null
  }

  return (
    <div className='fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-white px-4 py-2 text-center flex items-center justify-center gap-2 shadow-lg'>
      <WifiOff className='h-5 w-5' />
      <span className='font-medium'>
        You&apos;re offline. Changes will sync when you&apos;re back online.
      </span>
    </div>
  )
}

export default OfflineIndicator
