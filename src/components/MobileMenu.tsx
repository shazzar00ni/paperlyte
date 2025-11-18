import React, { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { X, PenTool, BarChart3 } from 'lucide-react'
import { trackNavigationEvent } from '../utils/analytics'

interface MobileMenuProps {
  isOpen: boolean
  onClose: () => void
}

const MobileMenu: React.FC<MobileMenuProps> = ({ isOpen, onClose }) => {
  // Close menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      // Prevent body scroll when menu is open
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  const handleNavClick = (item: string) => {
    trackNavigationEvent('menu_click', { item, source: 'mobile_menu' })
    onClose()
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className='fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden'
        onClick={onClose}
        aria-hidden='true'
      />

      {/* Menu Panel */}
      <div
        className='fixed inset-y-0 right-0 w-64 bg-white shadow-xl z-50 md:hidden transform transition-transform duration-300 ease-in-out'
        role='dialog'
        aria-modal='true'
        aria-label='Mobile navigation menu'
      >
        <div className='flex flex-col h-full'>
          {/* Header */}
          <div className='flex items-center justify-between p-4 border-b border-gray-200'>
            <div className='flex items-center space-x-2'>
              <PenTool className='h-5 w-5 text-primary' />
              <span className='font-bold text-lg text-dark'>Paperlyte</span>
            </div>
            <button
              onClick={onClose}
              className='p-2 rounded-lg hover:bg-gray-100 transition-colors'
              aria-label='Close menu'
            >
              <X className='h-5 w-5 text-gray-600' />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className='flex-1 p-4'>
            <ul className='space-y-2'>
              <li>
                <Link
                  to='/'
                  className='flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors'
                  onClick={() => handleNavClick('home')}
                >
                  <PenTool className='h-5 w-5' />
                  <span>Home</span>
                </Link>
              </li>
              <li>
                <Link
                  to='/editor'
                  className='flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors'
                  onClick={() => handleNavClick('editor')}
                >
                  <PenTool className='h-5 w-5' />
                  <span>Editor</span>
                </Link>
              </li>
              <li>
                <Link
                  to='/admin'
                  className='flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors'
                  onClick={() => handleNavClick('admin')}
                >
                  <BarChart3 className='h-5 w-5' />
                  <span>Analytics</span>
                </Link>
              </li>
            </ul>
          </nav>

          {/* CTA Button */}
          <div className='p-4 border-t border-gray-200'>
            <button
              className='btn-primary w-full'
              onClick={() => handleNavClick('waitlist_cta')}
            >
              Join Waitlist
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default MobileMenu
