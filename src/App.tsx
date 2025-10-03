import './styles/App.css'
import LandingPage from './pages/LandingPage'
import OfflineIndicator from './components/OfflineIndicator'

function App() {
  return (
    <div className='App'>
      <OfflineIndicator />
      <LandingPage />
    </div>
  )
}

export default App
