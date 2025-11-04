import { Cloud, RefreshCw } from 'lucide-react'
import { ReactNode } from 'react'
import { dataService } from '../../services/dataService'
import { trackUserAction } from '../../utils/analytics'
import { monitoring } from '../../utils/monitoring'
import FeatureErrorBoundary from './FeatureErrorBoundary'

interface SyncErrorBoundaryProps {
  children: ReactNode
  onReset?: () => void
}

/**
 * Error boundary for sync-related features
 * Handles sync failures gracefully with offline-first messaging
 *
 * @param children - ReactNode content to render within the error boundary (typically sync-related components)
 * @param onReset - Optional callback function to execute on error recovery (if omitted, performs page reload)
 * @returns JSX.Element wrapping children with sync-specific error handling
 * @author Paperlyte Team
 */
export function SyncErrorBoundary({
  children,
  onReset,
}: SyncErrorBoundaryProps) {
  const handleReset = async (resetError: () => void) => {
    try {
      monitoring.addBreadcrumb('sync_error_boundary_reset', 'user', {
        hasCustomReset: !!onReset,
      })

      // Clear any corrupted sync state using dataService abstraction
      await dataService.removeItem('sync_state')

      monitoring.addBreadcrumb('Sync state cleared', 'info', {
        action: 'clear_sync_state',
      })

      // Always clear the error boundary state first
      resetError()

      if (onReset) {
        // When custom reset handler exists, call it after clearing error state
        // This allows SPA navigation without page reload
        onReset()
      } else {
        // No custom handler - perform full page reload
        window.location.reload()
      }
    } catch (error) {
      monitoring.logError(error as Error, {
        feature: 'sync_error_boundary',
        action: 'handle_reset',
      })
    }
  }

  const customFallback = (error: Error, resetError: () => void) => (
    <div className='flex min-h-[300px] items-center justify-center bg-gray-50 p-6'>
      <div className='max-w-md text-center'>
        <div className='mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-blue-100'>
          <Cloud className='h-8 w-8 text-blue-600' aria-hidden='true' />
        </div>

        <h2 className='mb-2 text-xl font-bold text-gray-900'>
          Sync Temporarily Unavailable
        </h2>

        <p className='mb-6 text-gray-600'>
          We&apos;re having trouble syncing your notes right now. Your notes are
          still safe on this device.
        </p>

        {error.message && (
          <div className='mb-6 rounded-lg bg-blue-50 p-4 text-left'>
            <p className='text-sm text-blue-800'>{error.message}</p>
          </div>
        )}

        <button
          onClick={async () => {
            trackUserAction('retry_sync', {
              feature: 'sync_error_boundary',
              errorMessage: error.message,
            })
            // handleReset() clears error boundary state, clears sync state, then calls custom onReset or reloads
            await handleReset(resetError)
          }}
          aria-label='Retry sync'
          className='flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700'
        >
          <RefreshCw className='h-4 w-4' aria-hidden='true' />
          Retry Sync
        </button>

        <p className='mt-4 text-sm text-gray-500'>
          Sync will automatically resume when the connection is restored.
        </p>
      </div>
    </div>
  )

  return (
    <FeatureErrorBoundary
      featureName='sync_engine'
      fallback={customFallback}
      onReset={onReset}
    >
      {children}
    </FeatureErrorBoundary>
  )
}

export default SyncErrorBoundary
