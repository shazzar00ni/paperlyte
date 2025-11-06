import DOMPurify from 'dompurify'
import { Home, RefreshCw, Shield } from 'lucide-react'
import { ReactNode } from 'react'
import { dataService } from '../../services/dataService'
import { trackFeatureUsage, trackNavigationEvent } from '../../utils/analytics'
import { monitoring } from '../../utils/monitoring'
import FeatureErrorBoundary from './FeatureErrorBoundary'

interface AdminErrorBoundaryProps {
  children: ReactNode
  onReset?: () => void
}

/**
 * Error boundary for admin dashboard
 * Provides admin-specific error handling and recovery with monitoring and analytics integration
 *
 * @param children - ReactNode content to render within the error boundary (typically admin dashboard components)
 * @param onReset - Optional callback function to execute on error recovery/reset (if omitted, performs page reload)
 *
 * @example
 * ```tsx
 * <AdminErrorBoundary onReset={() => clearAdminState()}>
 *   <AdminDashboard />
 * </AdminErrorBoundary>
 * ```
 */
export function AdminErrorBoundary({
  children,
  onReset,
}: AdminErrorBoundaryProps) {
  const handleReset = async () => {
    monitoring.addBreadcrumb('Admin dashboard reset initiated', 'user', {
      action: 'reset_dashboard',
    })

    try {
      // Clear any cached admin data using dataService
      await dataService.removeSessionItem('admin_filters')

      monitoring.addBreadcrumb('Admin filters cleared from session', 'info', {
        action: 'clear_session',
      })

      trackFeatureUsage('admin_error_boundary', 'reset_dashboard', {
        hasCustomReset: !!onReset,
      })

      if (onReset) {
        onReset()
      } else {
        window.location.reload()
      }
    } catch (error) {
      monitoring.logError(error as Error, {
        feature: 'admin_error_boundary',
        action: 'reset_dashboard',
      })
    }
  }

  const customFallback = (error: Error, resetError: () => void) => {
    // Log the error to monitoring system
    monitoring.logError(error, {
      feature: 'admin_error_boundary',
      action: 'error_caught',
    })

    monitoring.addBreadcrumb('Admin error boundary rendered', 'error', {
      errorMessage: error.message,
      errorName: error.name,
    })

    return (
      <div className='flex min-h-screen items-center justify-center bg-gray-50 p-6'>
        <div className='max-w-md text-center'>
          <div className='mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-purple-100'>
            <Shield className='h-8 w-8 text-purple-600' />
          </div>

          <h2 className='mb-2 text-2xl font-bold text-gray-900'>
            Admin Dashboard Error
          </h2>

          <p className='mb-6 text-gray-600'>
            The admin dashboard encountered an error. No user data has been
            affected.
          </p>

          {error.message && (
            <div
              className='mb-6 rounded-lg bg-purple-50 p-4 text-left'
              role='region'
              aria-live='polite'
              aria-atomic='true'
              aria-label='Error details'
            >
              <p className='text-sm font-medium text-purple-800'>
                Error details:
              </p>
              <p
                className='mt-1 whitespace-pre-wrap break-words text-sm text-purple-700'
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(error.message, {
                    ALLOWED_TAGS: ['br'],
                    ALLOWED_ATTR: [],
                    KEEP_CONTENT: true,
                  }).replace(/\n/g, '<br>'),
                }}
              />
            </div>
          )}

          <div className='space-y-3'>
            <button
              onClick={() => {
                monitoring.addBreadcrumb(
                  'User clicked reload dashboard button',
                  'user',
                  {
                    action: 'reload_dashboard_clicked',
                  }
                )
                trackFeatureUsage('admin_error_boundary', 'reload_dashboard', {
                  errorMessage: error.message,
                })
                resetError()
                handleReset()
              }}
              className='flex w-full items-center justify-center gap-2 rounded-lg bg-purple-600 px-6 py-3 text-white hover:bg-purple-700'
            >
              <RefreshCw className='h-4 w-4' />
              Reload Dashboard
            </button>

            <button
              onClick={() => {
                monitoring.addBreadcrumb(
                  'User clicked return to home button',
                  'user',
                  {
                    action: 'return_home_clicked',
                    fromError: true,
                  }
                )
                trackNavigationEvent('page_change', {
                  from: 'admin_error_boundary',
                  to: 'home',
                  fromError: true,
                })
                window.location.href = '/'
              }}
              className='flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-3 text-gray-700 hover:bg-gray-50'
            >
              <Home className='h-4 w-4' />
              Return to Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <FeatureErrorBoundary
      featureName='admin_dashboard'
      fallback={customFallback}
      onReset={handleReset}
    >
      {children}
    </FeatureErrorBoundary>
  )
}

export default AdminErrorBoundary
