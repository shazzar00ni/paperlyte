import { useState } from 'react'
import './styles/App.css' 
import Header from './components/Header'
import Footer from './components/Footer'
import LandingPage from './pages/LandingPage'
import WaitlistModal from './components/WaitlistModal'

function App() {
  const [isWaitlistOpen, setIsWaitlistOpen] = useState(false)

  const handleWaitlistClick = () => {
    setIsWaitlistOpen(true)
  }

  return (
    <div className='App min-h-screen flex flex-col'>
      <Header onWaitlistClick={handleWaitlistClick} />
      <main className='flex-1'>
        <LandingPage onWaitlistClick={handleWaitlistClick} />
      </main>
      <Footer />
      
      {/* Global Waitlist Modal */}
      <WaitlistModal
        isOpen={isWaitlistOpen}
        onClose={() => setIsWaitlistOpen(false)}
      />
    </div>
  )
}

export default App
