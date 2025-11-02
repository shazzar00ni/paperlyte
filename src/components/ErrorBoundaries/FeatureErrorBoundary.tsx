import { monitoring } from '@/utils/monitoring'
import { AlertTriangle, Home, RefreshCw } from 'lucide-react'
import { Component, ErrorInfo, ReactNode } from 'react'

/**
 * Props for FeatureErrorBoundary component
 */
interface FeatureErrorBoundaryProps {
  /** Child components to render */
  children: ReactNode
  /** Feature name for error tracking */
  featureName: string
  /** Custom fallback UI (optional) */
  fallback?: (error: Error, resetError: () => void) => ReactNode
  /** Callback when error occurs */
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  /** Custom recovery action */
  onReset?: () => void
  /** Navigate to home using SPA navigation instead of full page reload */
  onNavigateHome?: () => void
}

/**
 * State for FeatureErrorBoundary component
 */
interface FeatureErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

/**
 * Feature-specific error boundary with recovery actions
 *
 * Provides granular error handling for different features with:
 * - Custom fallback UI per feature
 * - User-friendly error messages
 * - Recovery actions (reset, navigate home, etc.)
 * - SPA navigation support (no full page reload)
 * - Automatic error reporting to Sentry
 *
 * @example
 * ```tsx
 * // With SPA navigation using React Router
 * import { useNavigate } from 'react-router-dom'
 *
 * function App() {
 *   const navigate = useNavigate()
 *
 *   return (
 *     <FeatureErrorBoundary
 *       featureName="note_editor"
 *       onReset={() => window.location.reload()}
 *       onNavigateHome={() => navigate('/')}
 *     >
 *       <NoteEditor />
 *     </FeatureErrorBoundary>
 *   )
 * }
 * ```
 */
export class FeatureErrorBoundary extends Component<
  FeatureErrorBoundaryProps,
  FeatureErrorBoundaryState
> {
  constructor(props: FeatureErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(
    error: Error
  ): Partial<FeatureErrorBoundaryState> {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const { featureName, onError } = this.props

    // Log error with feature context
    monitoring.logError(error, {
      feature: featureName,
      action: 'error_boundary_catch',
      additionalData: {
        componentStack: errorInfo.componentStack,
      },
    })

    // Call custom error handler if provided
    if (onError) {
      onError(error, errorInfo)
    }

    this.setState({
      errorInfo,
    })
  }

  resetError = (): void => {
    const { onReset } = this.props

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })

    // Call custom reset handler if provided
    if (onReset) {
      onReset()
    }

    monitoring.addBreadcrumb('Error boundary reset', 'user_action', {
      feature: this.props.featureName,
    })
  }

  handleNavigateHome = (): void => {
    const { onNavigateHome } = this.props

    monitoring.addBreadcrumb(
      'Navigate home from error boundary',
      'navigation',
      {
        feature: this.props.featureName,
      }
    )

    // Use custom navigation if provided (SPA navigation)
    if (onNavigateHome) {
      onNavigateHome()
    } else {
      // Fallback to full page reload as last resort
      // In a proper SPA, this should be replaced with React Router navigation
      window.location.href = '/'
    }
  }

  render(): ReactNode {
    const { hasError, error } = this.state
    const { children, fallback, featureName } = this.props

    if (hasError && error) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback(error, this.resetError)
      }

      // Default fallback UI
      return (
        <div className='flex min-h-[400px] items-center justify-center bg-gray-50 p-6'>
          <div className='max-w-md text-center'>
            <div className='mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-100'>
              <AlertTriangle
                className='h-8 w-8 text-red-600'
                aria-hidden='true'
              />
            </div>

            <h2 className='mb-2 text-2xl font-bold text-gray-900'>
              Something went wrong
            </h2>

            <p className='mb-6 text-gray-600'>
              An error occurred in the {featureName.replace(/_/g, ' ')} feature.
              Don&apos;t worry, your data is safe.
            </p>

            {error.message && (
              <div
                className='mb-6 rounded-lg bg-red-50 p-4 text-left'
                role='alert'
                aria-atomic='true'
              >
                <p className='text-sm font-medium text-red-800'>
                  Error details:
                </p>
                <p className='mt-1 text-sm text-red-700'>{error.message}</p>
              </div>
            )}

            <div className='flex flex-col gap-3 sm:flex-row sm:justify-center'>
              <button
                onClick={this.resetError}
                className='inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700'
              >
                <RefreshCw className='h-4 w-4' />
                Try Again
              </button>

              <button
                onClick={this.handleNavigateHome}
                className='inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-3 text-gray-700 hover:bg-gray-50'
              >
                <Home className='h-4 w-4' />
                Go Home
              </button>
            </div>

            <p className='mt-6 text-sm text-gray-500'>
              If this problem persists, please contact support.
            </p>
          </div>
        </div>
      )
    }

    return children
  }
}

/**
 * Default export for convenience
 */
export default FeatureErrorBoundary
