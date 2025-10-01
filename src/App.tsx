import './styles/App.css'
import LandingPage from './pages/LandingPage'
import NoteEditor from './pages/NoteEditor'

function App() {
  // Temporarily show NoteEditor for testing
  // TODO: Add routing
  const showEditor = window.location.pathname === '/editor'

  return (
    <div className='App'>{showEditor ? <NoteEditor /> : <LandingPage />}</div>
  )
}

export default App
