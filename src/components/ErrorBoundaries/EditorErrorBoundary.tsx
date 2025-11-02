import { FileText, RefreshCw } from 'lucide-react'
import { ReactNode } from 'react'
import { trackUserAction } from '../../utils/analytics'
import { monitoring } from '../../utils/monitoring'
import FeatureErrorBoundary from './FeatureErrorBoundary'

interface EditorErrorBoundaryProps {
  children: ReactNode
  onReset?: () => void
}

/**
 * Error boundary specifically for the note editor feature
 * Provides editor-specific recovery options and error messaging
 */
export function EditorErrorBoundary({
  children,
  onReset,
}: EditorErrorBoundaryProps) {
  const handleReset = () => {
    try {
      // Add breadcrumb before reset
      monitoring.addBreadcrumb(
        'Editor error boundary reset initiated',
        'user',
        {
          hasCustomReset: !!onReset,
          source: 'error_boundary',
        }
      )

      // Clear any cached editor state
      // Note: Using sessionStorage directly here as editor_draft is transient UI state
      // not managed by dataService (which handles persisted notes/waitlist data)
      sessionStorage.removeItem('editor_draft')

      monitoring.addBreadcrumb('Editor draft cleared from session', 'info', {
        action: 'clear_draft',
      })

      // Track analytics event
      trackUserAction('editor_reset', {
        source: 'error_boundary',
        hasCustomReset: !!onReset,
      })

      if (onReset) {
        onReset()
      } else {
        // Default: reload the page
        window.location.reload()
      }

      // Add breadcrumb after successful reset
      monitoring.addBreadcrumb('Editor reset completed', 'info', {
        action: 'reset_complete',
      })
    } catch (error) {
      // Log error to monitoring
      monitoring.logError(error as Error, {
        feature: 'editor_error_boundary',
        action: 'handle_reset',
      })

      // Track error in analytics
      trackUserAction('editor_reset_failed', {
        source: 'error_boundary',
        errorMessage: (error as Error).message,
      })

      // Fail gracefully - attempt page reload as last resort
      window.location.reload()
    }
  }

  const customFallback = (error: Error, resetError: () => void) => (
    <div
      className='flex min-h-screen items-center justify-center bg-gray-50 p-6'
      role='alert'
    >
      <div className='max-w-lg text-center'>
        <div className='mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-amber-100'>
          <FileText className='h-8 w-8 text-amber-600' aria-hidden='true' />
        </div>

        <h2 className='mb-2 text-2xl font-bold text-gray-900'>Editor Error</h2>

        <p className='mb-6 text-gray-600'>
          The note editor encountered an unexpected error. Recent changes may
          have been saved automatically—please check your notes list.
        </p>

        {error.message && (
          <div className='mb-6 rounded-lg bg-amber-50 p-4 text-left'>
            <p className='text-sm font-medium text-amber-800'>What happened:</p>
            <p className='mt-1 text-sm text-amber-700'>{error.message}</p>
          </div>
        )}

        <div className='space-y-3'>
          <button
            onClick={() => {
              trackUserAction('editor_reload_clicked', {
                source: 'error_boundary',
                errorMessage: error.message,
              })
              resetError()
              handleReset()
            }}
            className='flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700'
          >
            <RefreshCw className='h-4 w-4' aria-hidden='true' />
            Reload Editor
          </button>

          <button
            onClick={() => {
              trackUserAction('editor_return_home_clicked', {
                source: 'error_boundary',
                fromError: true,
              })
              window.location.href = '/'
            }}
            className='flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-3 text-gray-700 hover:bg-gray-50'
          >
            Return to Home
          </button>
        </div>

        <div className='mt-6 rounded-lg bg-blue-50 p-4 text-left'>
          <p className='text-sm font-medium text-blue-900'>
            💡 Quick tips to avoid this:
          </p>
          <ul className='mt-2 space-y-1 text-sm text-blue-800'>
            <li>• Make sure your browser is up to date</li>
            <li>• Clear your browser cache if problems persist</li>
            <li>• Try using a different browser</li>
          </ul>
        </div>
      </div>
    </div>
  )

  return (
    <FeatureErrorBoundary
      featureName='note_editor'
      fallback={customFallback}
      onReset={handleReset}
    >
      {children}
    </FeatureErrorBoundary>
  )
}

export default EditorErrorBoundary
