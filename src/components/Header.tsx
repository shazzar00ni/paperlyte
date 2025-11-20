import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { PenTool, BarChart3, Menu } from 'lucide-react'
import { trackNavigationEvent } from '../utils/analytics'
import MobileMenu from './MobileMenu'

const Header: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleNavClick = (item: string) => {
    trackNavigationEvent('menu_click', { item })
  }

  return (
    <>
      <header className='bg-white shadow-sm border-b border-gray-200'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex justify-between items-center h-16'>
            {/* Logo */}
            <Link
              to='/'
              className='flex items-center space-x-2 font-bold text-xl text-dark'
              onClick={() => handleNavClick('logo')}
            >
              <PenTool className='h-6 w-6 text-primary' />
              <span>Paperlyte</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className='hidden md:flex items-center space-x-8'>
              <Link
                to='/editor'
                className='text-gray-600 hover:text-dark transition-colors'
                onClick={() => handleNavClick('editor')}
              >
                Editor
              </Link>
              <Link
                to='/admin'
                className='text-gray-600 hover:text-dark transition-colors flex items-center space-x-1'
                onClick={() => handleNavClick('admin')}
              >
                <BarChart3 className='h-4 w-4' />
                <span>Analytics</span>
              </Link>
            </nav>

            {/* Desktop CTA Button */}
            <div className='hidden md:block'>
              <button
                type="button"
                className='btn-primary btn-md'
                onClick={() => handleNavClick('waitlist_cta')}
              >
                Join Waitlist
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              className='md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors'
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label='Open menu'
              aria-expanded={isMobileMenuOpen}
            >
              <Menu className='h-6 w-6 text-gray-600' />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />
    </>
  )
}

export default Header
