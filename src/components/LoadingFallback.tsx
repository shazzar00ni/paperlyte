import React from 'react'

/**
 * Loading fallback component for lazy-loaded routes
 * Provides a centered loading indicator with consistent styling
 */
const LoadingFallback: React.FC = () => {
  return (
    <div className='flex h-screen w-full items-center justify-center bg-gray-50 dark:bg-gray-900'>
      <div className='text-center'>
        <div
          className='mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent'
          role='status'
          aria-label='Loading'
        >
          <span className='sr-only'>Loading...</span>
        </div>
        <p className='text-gray-600 dark:text-gray-400'>Loading...</p>
      </div>
    </div>
  )
}

export default LoadingFallback
