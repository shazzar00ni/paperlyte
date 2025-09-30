import React, { useEffect } from 'react'
import { CheckCircle, Zap, Shield, Smartphone, Search, Tag, FileText, Sparkles } from 'lucide-react'
import { trackUserAction } from '../utils/analytics'
import { monitoring } from '../utils/monitoring'
import DemoCarousel from '../components/DemoCarousel'
import Testimonials from '../components/Testimonials'
import Pricing from '../components/Pricing'

interface LandingPageProps {
  onWaitlistClick?: () => void
}

const LandingPage: React.FC<LandingPageProps> = ({ onWaitlistClick }) => {
  useEffect(() => {
    // Track landing page view
    trackUserAction('landing_page_view')
    monitoring.addBreadcrumb('Landing page loaded', 'navigation')
  }, [])

  const handleWaitlistClick = () => {
    trackUserAction('waitlist_click_landing')
    if (onWaitlistClick) {
      onWaitlistClick()
    }
  }

  const features = [
    {
      icon: <Zap className='h-6 w-6' />,
      title: 'Lightning Fast',
      description: 'Ideas saved instantly—never lose your spark.',
    },
    {
      icon: <Shield className='h-6 w-6' />,
      title: 'Private & Secure',
      description: 'End-to-end encrypted, ad-free experience.',
    },
    {
      icon: <Smartphone className='h-6 w-6' />,
      title: 'Works Everywhere',
      description: 'Web, tablet, and mobile—sync across all devices.',
    },
    {
      icon: <Search className='h-6 w-6' />,
      title: 'Smart Search',
      description: 'Find anything instantly with powerful search.',
    },
    {
      icon: <Tag className='h-6 w-6' />,
      title: 'Organize Effortlessly',
      description: 'Tag, group, and organize your thoughts.',
    },
    {
      icon: <CheckCircle className='h-6 w-6' />,
      title: 'Minimal by Design',
      description: 'Only the tools that matter, nothing more.',
    },
  ]

  return (
    <div className='flex flex-col'>
      {/* Hero Section */}
      <section className='relative bg-gradient-to-br from-primary/10 to-accent/10 py-20 overflow-hidden'>
        {/* Animated Paper Elements */}
        <div className='absolute inset-0 pointer-events-none'>
          <div className='absolute top-10 left-10 opacity-20 animate-float'>
            <FileText className='h-16 w-16 text-primary' />
          </div>
          <div className='absolute top-20 right-20 opacity-15 animate-float-delayed-1'>
            <Sparkles className='h-12 w-12 text-accent' />
          </div>
          <div className='absolute bottom-20 left-20 opacity-10 animate-float-delayed-2'>
            <FileText className='h-20 w-20 text-primary' />
          </div>
          <div className='absolute bottom-32 right-16 opacity-20 animate-float-delayed-3'>
            <Sparkles className='h-8 w-8 text-accent' />
          </div>
        </div>

        <div className='relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center'>
          <h1 className='text-4xl md:text-6xl font-bold text-dark mb-6'>
            Your thoughts deserve a
            <span className='text-gradient'> lightning-fast</span> home
          </h1>
          <p className='text-xl text-gray-600 mb-8 max-w-3xl mx-auto'>
            Paperlyte is the distraction-free note-taking app that saves your
            ideas instantly. Write, draw, organize—all in one serene canvas.
          </p>
          <div className='flex flex-col sm:flex-row gap-4 justify-center'>
            <button
              onClick={handleWaitlistClick}
              className='btn-primary btn-lg animation-glow'
            >
              Join the Waitlist
            </button>
            <button
              onClick={() => trackUserAction('demo_request')}
              className='btn-secondary btn-lg'
            >
              Watch Demo
            </button>
          </div>
          
          {/* Early Access Badge */}
          <div className='mt-8 inline-flex items-center px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full text-sm text-gray-700 shadow-sm'>
            <Sparkles className='h-4 w-4 mr-2 text-primary' />
            Join 10,000+ creators on the waitlist
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id='features' className='py-20 bg-white'>
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
                className='card hover:shadow-lg transition-all hover:-translate-y-1'
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

      {/* Demo Carousel Section */}
      <section id='demo'>
        <DemoCarousel />
      </section>

      {/* Testimonials Section */}
      <Testimonials />

      {/* Pricing Section */}
      <Pricing onWaitlistClick={handleWaitlistClick} />

      {/* Final CTA Section */}
      <section className='py-20 bg-gradient-to-r from-primary to-accent text-white'>
        <div className='max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center'>
          <h2 className='text-3xl md:text-4xl font-bold mb-4'>
            Ready to transform your note-taking?
          </h2>
          <p className='text-xl opacity-90 mb-8'>
            Join thousands of creators who are already on the waitlist
          </p>
          <button 
            onClick={handleWaitlistClick} 
            className='btn-secondary btn-lg bg-white text-primary hover:bg-gray-50'
          >
            Get Early Access
          </button>
        </div>
      </section>
    </div>
  )
}

export default LandingPage
