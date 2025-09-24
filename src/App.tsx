import React, { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { analytics } from './utils/analytics'
import { monitoring, ErrorBoundary } from './utils/monitoring'
import { trackPageView } from './utils/analytics'

// Pages
import LandingPage from './pages/LandingPage'
import NoteEditor from './pages/NoteEditor'
import AdminDashboard from './pages/AdminDashboard'

// Components
import Header from './components/Header'
import Footer from './components/Footer'
import DataPersistenceWarning from './components/DataPersistenceWarning'

function App() {
  useEffect(() => {
    // Initialize analytics and monitoring
    analytics.init()
    monitoring.init()

    // Track initial page load
    trackPageView()
    
    // Add breadcrumb for app initialization
    monitoring.addBreadcrumb('App initialized', 'lifecycle')

    return () => {
      // Cleanup on unmount
      monitoring.cleanup()
    }
  }, [])

  return (
    <ErrorBoundary fallback={(props) => <ErrorFallback {...props} />}>
      <Router>
        <div className="min-h-screen bg-background">
          <Header />
          <main className="flex-1">
            <Routes>
              <Route 
                path="/" 
                element={<LandingPage />} 
              />
              <Route 
                path="/editor" 
                element={<NoteEditor />} 
              />
              <Route 
                path="/admin" 
                element={<AdminDashboard />} 
              />
            </Routes>
          </main>
          <Footer />
          <DataPersistenceWarning />
        </div>
      </Router>
    </ErrorBoundary>
  )
}

// Error fallback component for error boundary
const ErrorFallback: React.FC<{ error: Error; resetError: () => void }> = ({ 
  error, 
  resetError 
}) => {
  useEffect(() => {
    // Log the error
    monitoring.logError(error, {
      feature: 'app_root',
      action: 'render_error'
    })
  }, [error])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="card max-w-md w-full text-center">
        <h2 className="text-xl font-semibold text-dark mb-4">
          Something went wrong
        </h2>
        <p className="text-gray-600 mb-6">
          We've been notified about this issue and are working to fix it.
        </p>
        <button 
          onClick={resetError}
          className="btn-primary btn-md"
        >
          Try again
        </button>
      </div>
    </div>
  )
}

export default App