import React, { useState, useEffect } from 'react'
import { CheckCircle, Zap, Shield, Smartphone, Search, Tag } from 'lucide-react'
import { trackWaitlistEvent, trackUserAction } from '../utils/analytics'
import { monitoring } from '../utils/monitoring'
import WaitlistModal from '../components/WaitlistModal'
import DemoCarousel from '../components/DemoCarousel'

const LandingPage: React.FC = () => {
  const [isWaitlistOpen, setIsWaitlistOpen] = useState(false)

  useEffect(() => {
    // Track landing page view
    trackUserAction('landing_page_view')
    monitoring.addBreadcrumb('Landing page loaded', 'navigation')
  }, [])

  const handleWaitlistClick = () => {
    setIsWaitlistOpen(true)
    trackWaitlistEvent('view')
  }

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
      {/* Hero Section */}
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
            <button
              onClick={handleWaitlistClick}
              className='btn-primary btn-lg animation-glow'
            >
              Start Writing Now
            </button>
            <button
              onClick={() => trackUserAction('demo_request')}
              className='btn-secondary btn-lg'
            >
              See 30-Second Demo
            </button>
          </div>
        </div>
      </section>

      {/* Demo Section */}
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

      {/* Features Section */}
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

      {/* CTA Section */}
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

      {/* Waitlist Modal */}
      <WaitlistModal
        isOpen={isWaitlistOpen}
        onClose={() => setIsWaitlistOpen(false)}
      />
    </div>
  )
}

export default LandingPage
