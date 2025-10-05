import './styles/App.css'
import LandingPage from './pages/LandingPage'
import OfflineIndicator from './components/OfflineIndicator'
import InstallPrompt from './components/InstallPrompt'

function App() {
  return (
    <div className='App'>
      <OfflineIndicator />
      <InstallPrompt />
      <LandingPage />
    </div>
  )
}

export default App
