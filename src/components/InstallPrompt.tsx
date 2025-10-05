import React, { useState, useEffect } from 'react'
import { Download, X } from 'lucide-react'
import { trackUserAction } from '../utils/analytics'

/**
 * InstallPrompt Component
 *
 * Shows a prompt to install the PWA when the browser supports it.
 * Only appears once the user has dismissed it or after a certain time.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    // Check if user has already dismissed the prompt
    const dismissed = localStorage.getItem('pwa-install-prompt-dismissed')
    if (dismissed === 'true') {
      return
    }

    const handler = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault()
      // Stash the event so it can be triggered later
      setDeferredPrompt(e as BeforeInstallPromptEvent)

      // Show the prompt after a short delay to avoid being intrusive
      setTimeout(() => {
        setShowPrompt(true)
      }, 3000) // Show after 3 seconds
    }

    window.addEventListener('beforeinstallprompt', handler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return
    }

    // Show the install prompt
    await deferredPrompt.prompt()

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice

    // Track the user's choice
    trackUserAction(`pwa_install_${outcome}`)

    // Clear the deferredPrompt for later use
    setDeferredPrompt(null)
    setShowPrompt(false)

    if (outcome === 'accepted') {
      localStorage.setItem('pwa-install-prompt-dismissed', 'true')
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    localStorage.setItem('pwa-install-prompt-dismissed', 'true')
    trackUserAction('pwa_install_dismissed')
  }

  if (!showPrompt || !deferredPrompt) {
    return null
  }

  return (
    <div className='fixed bottom-4 right-4 z-50 max-w-sm'>
      <div className='bg-white rounded-lg shadow-2xl border border-gray-200 p-4 flex items-start gap-3'>
        <div className='flex-shrink-0 w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center'>
          <Download className='h-5 w-5 text-white' />
        </div>

        <div className='flex-1 min-w-0'>
          <h3 className='text-sm font-semibold text-dark mb-1'>
            Install Paperlyte
          </h3>
          <p className='text-xs text-gray-600 mb-3'>
            Install the app for faster access and offline use
          </p>

          <div className='flex gap-2'>
            <button
              onClick={handleInstallClick}
              className='btn-primary btn-sm text-xs px-3 py-1'
            >
              Install
            </button>
            <button
              onClick={handleDismiss}
              className='btn-secondary btn-sm text-xs px-3 py-1'
            >
              Not now
            </button>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className='flex-shrink-0 text-gray-400 hover:text-gray-600 -mt-1 -mr-1'
          aria-label='Dismiss install prompt'
        >
          <X className='h-4 w-4' />
        </button>
      </div>
    </div>
  )
}

export default InstallPrompt
