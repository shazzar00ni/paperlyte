import { CheckCircle, Search, Shield, Smartphone, Tag, Zap } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import DemoCarousel from '../components/DemoCarousel'
import WaitlistModal from '../components/WaitlistModal'
import { trackUserAction, trackWaitlistEvent } from '../utils/analytics'
import { monitoring } from '../utils/monitoring'

/**
 * @component LandingPage
 * @description The main landing page for the application. It showcases the features,
 * includes a demo carousel, and provides multiple calls-to-action to join the waitlist.
 * @returns {React.ReactElement} The rendered landing page.
 */
const LandingPage: React.FC = () => {
  // State to control the visibility of the waitlist modal.
  const [isWaitlistOpen, setIsWaitlistOpen] = useState(false)

  // Effect to track the landing page view and add a monitoring breadcrumb on mount.
  useEffect(() => {
    trackUserAction('landing_page_view')
    monitoring.addBreadcrumb('Landing page loaded', 'navigation')
  }, [])

  /**
   * @function handleWaitlistClick
   * @description Opens the waitlist modal and tracks the event.
   */
  const handleWaitlistClick = () => {
    setIsWaitlistOpen(true)
    trackWaitlistEvent('view')
  }

  // An array of features to be displayed in the features section.
  const features = [
    {
      icon: <Zap className='h-6 w-6' />,
      title: 'Launches Instantly',
      description:
        'Start writing in under 3 seconds—faster than any other note app.',
    },
    {
      icon: <Shield className='h-6 w-6' />,
      title: 'Your Data Stays Yours',
      description:
        'Notes stored locally on your device—no cloud, no tracking, complete privacy.',
    },
    {
      icon: <Smartphone className='h-6 w-6' />,
      title: 'Works Everywhere',
      description:
        'Beautiful on desktop, tablet, and mobile—no app download required.',
    },
    {
      icon: <Search className='h-6 w-6' />,
      title: 'Find Anything in Milliseconds',
      description:
        'Search through all your notes instantly as you type—no waiting.',
    },
    {
      icon: <Tag className='h-6 w-6' />,
      title: 'Never Lose Your Work',
      description:
        'Auto-saves as you type with visual confirmation—write worry-free.',
    },
    {
      icon: <CheckCircle className='h-6 w-6' />,
      title: 'Zero Learning Curve',
      description:
        'Just start typing—rich formatting with keyboard shortcuts that feel natural.',
    },
  ]

  return (
    <div className='flex flex-col'>
      {/* Hero Section: The main introduction to the product. */}
      <section className='bg-gradient-to-br from-primary/10 to-accent/10 py-20'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center'>
          <h1 className='text-4xl md:text-6xl font-bold text-dark mb-6'>
            Finally, note-taking that feels
            <span className='text-gradient'> effortless</span>
          </h1>
          <p className='text-xl text-gray-600 mb-8 max-w-3xl mx-auto'>
            Paperlyte is the lightning-fast, beautifully minimal note app that
            gets out of your way. No accounts, no complexity, no bloat—just you
            and your ideas.
          </p>
          <div className='flex flex-col sm:flex-row gap-4 justify-center'>
            {/* CTA to open the waitlist modal. */}
            <button
              onClick={handleWaitlistClick}
              className='btn-primary btn-lg animation-glow'
            >
              Start Writing Now
            </button>
            {/* Button to track interest in the demo. */}
            <button
              onClick={() => trackUserAction('demo_request')}
              className='btn-secondary btn-lg'
            >
              See 30-Second Demo
            </button>
          </div>
        </div>
      </section>

      {/* Demo Section: Showcases the product in action. */}
      <section className='py-20 bg-gray-50'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='text-center mb-12'>
            <h2 className='text-3xl md:text-4xl font-bold text-dark mb-4'>
              See Paperlyte in action
            </h2>
            <p className='text-xl text-gray-600'>
              Discover how effortless note-taking can be
            </p>
          </div>
          <DemoCarousel />
        </div>
      </section>

      {/* Features Section: Highlights the key benefits of the product. */}
      <section className='py-20 bg-white'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='text-center mb-16'>
            <h2 className='text-3xl md:text-4xl font-bold text-dark mb-4'>
              Everything you need, nothing you don&apos;t
            </h2>
            <p className='text-xl text-gray-600'>
              Built for creators, thinkers, and note-taking enthusiasts
            </p>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8'>
            {/* Map over the features array to display each feature card. */}
            {features.map((feature, index) => (
              <div
                key={index}
                className='card hover:shadow-lg transition-shadow'
              >
                <div className='text-primary mb-4'>{feature.icon}</div>
                <h3 className='text-xl font-semibold text-dark mb-2'>
                  {feature.title}
                </h3>
                <p className='text-gray-600'>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section: A final call-to-action to encourage sign-ups. */}
      <section className='py-20 bg-gray-50'>
        <div className='max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center'>
          <h2 className='text-3xl md:text-4xl font-bold text-dark mb-4'>
            Why wait? Start taking better notes today
          </h2>
          <p className='text-xl text-gray-600 mb-8'>
            Join thousands who&apos;ve discovered note-taking without the
            friction
          </p>
          <button onClick={handleWaitlistClick} className='btn-primary btn-lg'>
            Try Paperlyte Now
          </button>
        </div>
      </section>

      {/* Waitlist Modal: Hidden by default, shown when `isWaitlistOpen` is true. */}
      <WaitlistModal
        isOpen={isWaitlistOpen}
        onClose={() => setIsWaitlistOpen(false)}
      />
    </div>
  )
}

export default LandingPage
