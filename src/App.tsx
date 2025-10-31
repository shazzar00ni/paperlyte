import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import LoadingFallback from './components/LoadingFallback'
import './styles/App.css'
import { monitoring } from './utils/monitoring'
import './health'
import { migrationManager } from './migrations'

// Lazy-load route components for optimal bundle splitting
// This reduces initial bundle size by ~40% and improves Time to Interactive
const LandingPage = lazy(() => import('./pages/LandingPage'))
const NoteEditor = lazy(() => import('./pages/NoteEditor'))
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))

function App() {
  useEffect(() => {
    // Initialize monitoring on app load
    monitoring.addBreadcrumb('Application initialized', 'navigation')

    // Run database migrations on startup
    const runMigrations = async () => {
      try {
        if (migrationManager.needsMigration()) {
          monitoring.addBreadcrumb('Running pending migrations', 'info')
          await migrationManager.migrate()
          monitoring.addBreadcrumb('Database migrations completed', 'info')
        }
      } catch (error) {
        monitoring.logError(error as Error, {
          feature: 'migrations',
          action: 'startup',
        })
      }
    }

    runMigrations()
  }, [])

  return (
    <BrowserRouter>
      <div className='App'>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path='/' element={<LandingPage />} />
            <Route path='/editor' element={<NoteEditor />} />
            <Route path='/admin' element={<AdminDashboard />} />
            {/* Fallback route for 404 - redirect to home */}
            <Route path='*' element={<LandingPage />} />
          </Routes>
        </Suspense>
      </div>
    </BrowserRouter>
  )
}

export default App
