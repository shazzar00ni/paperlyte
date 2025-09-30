import React, { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Play } from 'lucide-react'
import { trackUserAction } from '../utils/analytics'
import DemoVideoModal from './DemoVideoModal'

interface DemoSlide {
  id: string
  title: string
  description: string
  image: string
  alt: string
}

const DemoCarousel: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false)

  const demoSlides: DemoSlide[] = [
    {
      id: 'note-creation',
      title: 'Lightning-Fast Note Creation',
      description:
        'Start writing immediately with our instant-load editor. No delays, no distractions.',
      image: '/api/placeholder/600/400',
      alt: 'Paperlyte note creation interface',
    },
    {
      id: 'rich-formatting',
      title: 'Rich Text & Markdown Support',
      description:
        'Format your notes beautifully with markdown support and rich text editing.',
      image: '/api/placeholder/600/400',
      alt: 'Rich text formatting in Paperlyte',
    },
    {
      id: 'smart-organization',
      title: 'Smart Organization',
      description:
        'Tag, search, and organize your notes effortlessly with our intelligent system.',
      image: '/api/placeholder/600/400',
      alt: 'Note organization and tagging system',
    },
    {
      id: 'sync-everywhere',
      title: 'Sync Across All Devices',
      description:
        'Access your notes anywhere - web, mobile, tablet. Always in sync.',
      image: '/api/placeholder/600/400',
      alt: 'Cross-device synchronization',
    },
  ]

  useEffect(() => {
    if (isAutoPlaying) {
      const interval = setInterval(() => {
        setCurrentSlide(prev => (prev + 1) % demoSlides.length)
      }, 4000)
      return () => clearInterval(interval)
    }
  }, [isAutoPlaying, demoSlides.length])

  const goToSlide = (index: number) => {
    setCurrentSlide(index)
    setIsAutoPlaying(false)
    trackUserAction('demo_slide_click', { slide: demoSlides[index].id })
  }

  const goToPrevious = () => {
    setCurrentSlide(prev => (prev - 1 + demoSlides.length) % demoSlides.length)
    setIsAutoPlaying(false)
    trackUserAction('demo_navigation', { direction: 'previous' })
  }

  const goToNext = () => {
    setCurrentSlide(prev => (prev + 1) % demoSlides.length)
    setIsAutoPlaying(false)
    trackUserAction('demo_navigation', { direction: 'next' })
  }

  const handlePlayDemo = () => {
    trackUserAction('demo_play_click', {
      slide: demoSlides[currentSlide].id,
      title: demoSlides[currentSlide].title,
    })
    setIsAutoPlaying(false)
    setIsDemoModalOpen(true)
  }

  return (
    <div className='relative bg-white overflow-hidden'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20'>
        <div className='text-center mb-16'>
          <h2 className='text-3xl md:text-4xl font-bold text-dark mb-4'>
            See Paperlyte in Action
          </h2>
          <p className='text-xl text-gray-600 mb-8'>
            Experience the future of note-taking
          </p>
        </div>

        <div className='relative'>
          {/* Main Carousel */}
          <div className='flex items-center justify-center mb-8'>
            <div className='relative max-w-4xl w-full'>
              {/* Demo Image/Video Area */}
              <div className='aspect-video bg-gray-100 rounded-xl overflow-hidden shadow-2xl relative'>
                <img
                  src={demoSlides[currentSlide].image}
                  alt={demoSlides[currentSlide].alt}
                  className='w-full h-full object-cover'
                />

                {/* Play Button Overlay */}
                <div
                  className='absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 hover:bg-opacity-30 transition-all cursor-pointer group'
                  onClick={handlePlayDemo}
                >
                  <div className='bg-primary text-white rounded-full p-4 group-hover:scale-110 transition-transform'>
                    <Play className='h-8 w-8 ml-1' />
                  </div>
                </div>
              </div>

              {/* Navigation Arrows */}
              <button
                onClick={goToPrevious}
                className='absolute left-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-80 hover:bg-opacity-100 rounded-full p-2 shadow-lg transition-all'
                aria-label='Previous demo'
              >
                <ChevronLeft className='h-6 w-6 text-gray-700' />
              </button>

              <button
                onClick={goToNext}
                className='absolute right-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-80 hover:bg-opacity-100 rounded-full p-2 shadow-lg transition-all'
                aria-label='Next demo'
              >
                <ChevronRight className='h-6 w-6 text-gray-700' />
              </button>
            </div>
          </div>

          {/* Demo Info */}
          <div className='text-center mb-8'>
            <h3 className='text-2xl font-bold text-dark mb-2'>
              {demoSlides[currentSlide].title}
            </h3>
            <p className='text-lg text-gray-600 max-w-2xl mx-auto'>
              {demoSlides[currentSlide].description}
            </p>
          </div>

          {/* Slide Indicators */}
          <div className='flex justify-center space-x-2'>
            {demoSlides.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-3 h-3 rounded-full transition-all ${
                  index === currentSlide
                    ? 'bg-primary'
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Demo Video Modal */}
      <DemoVideoModal
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
        videoTitle={demoSlides[currentSlide].title}
        videoDescription={demoSlides[currentSlide].description}
      />
    </div>
  )
}

export default DemoCarousel
