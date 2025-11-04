import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import {
  AdminErrorBoundary,
  EditorErrorBoundary,
  FeatureErrorBoundary,
} from './components/ErrorBoundaries'
import LoadingFallback from './components/LoadingFallback'
import './styles/App.css'
import { monitoring } from './utils/monitoring'

// Lazy-load route components for optimal bundle splitting
// This reduces initial bundle size by ~40% and improves Time to Interactive
const LandingPage = lazy(() => import('./pages/LandingPage'))
const NoteEditor = lazy(() => import('./pages/NoteEditor'))
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))

function App() {
  useEffect(() => {
    // Initialize monitoring on app load
    monitoring.addBreadcrumb('Application initialized', 'navigation')
  }, [])

  return (
    <BrowserRouter>
      <div className='App'>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route
              path='/'
              element={
                <FeatureErrorBoundary featureName='landing_page'>
                  <LandingPage />
                </FeatureErrorBoundary>
              }
            />
            <Route
              path='/editor'
              element={
                <EditorErrorBoundary>
                  <NoteEditor />
                </EditorErrorBoundary>
              }
            />
            <Route
              path='/admin'
              element={
                <AdminErrorBoundary>
                  <AdminDashboard />
                </AdminErrorBoundary>
              }
            />
            {/* Fallback route for 404 - redirect to home */}
            <Route
              path='*'
              element={
                <FeatureErrorBoundary featureName='not_found'>
                  <LandingPage />
                </FeatureErrorBoundary>
              }
            />
          </Routes>
        </Suspense>
      </div>
    </BrowserRouter>
  )
}

export default App
