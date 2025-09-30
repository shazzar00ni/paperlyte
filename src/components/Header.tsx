import React from 'react'
import { PenTool } from 'lucide-react'
import { trackNavigationEvent } from '../utils/analytics'

interface HeaderProps {
  onWaitlistClick?: () => void
}

const Header: React.FC<HeaderProps> = ({ onWaitlistClick }) => {
  const handleNavClick = (item: string) => {
    trackNavigationEvent('menu_click', { item })
  }

  const handleWaitlistClick = () => {
    handleNavClick('waitlist_cta')
    if (onWaitlistClick) {
      onWaitlistClick()
    }
  }

  const handleLogoClick = () => {
    handleNavClick('logo')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <header className='bg-white shadow-sm border-b border-gray-200'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='flex justify-between items-center h-16'>
          {/* Logo */}
          <button
            onClick={handleLogoClick}
            className='flex items-center space-x-2 font-bold text-xl text-dark hover:opacity-80 transition-opacity'
          >
            <PenTool className='h-6 w-6 text-primary' />
            <span>Paperlyte</span>
          </button>

          {/* Navigation */}
          <nav className='hidden md:flex items-center space-x-8'>
            <a
              href='#features'
              className='text-gray-600 hover:text-dark transition-colors'
              onClick={() => handleNavClick('features')}
            >
              Features
            </a>
            <a
              href='#demo'
              className='text-gray-600 hover:text-dark transition-colors'
              onClick={() => handleNavClick('demo')}
            >
              Demo
            </a>
            <a
              href='#pricing'
              className='text-gray-600 hover:text-dark transition-colors'
              onClick={() => handleNavClick('pricing')}
            >
              Pricing
            </a>
          </nav>

          {/* CTA Button */}
          <button
            className='btn-primary btn-md'
            onClick={handleWaitlistClick}
          >
            Join Waitlist
          </button>
        </div>
      </div>
    </header>
  )
}

export default Header
