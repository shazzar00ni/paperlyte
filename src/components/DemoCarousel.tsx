import React, { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react'
import { trackFeatureUsage } from '../utils/analytics'
import { monitoring } from '../utils/monitoring'

interface DemoSlide {
  id: string
  title: string
  description: string
  image: string
  alt: string
}

// Generate SVG placeholder images for demo
const generatePlaceholderSVG = (title: string, color: string) => {
  const svg = `<svg width="600" height="400" viewBox="0 0 600 400" xmlns="http://www.w3.org/2000/svg">
    <rect width="600" height="400" fill="${color}"/>
    <text x="300" y="200" font-family="Inter, system-ui" font-size="24" font-weight="600" fill="white" text-anchor="middle" dominant-baseline="middle">${title}</text>
  </svg>`
  return `data:image/svg+xml;base64,${btoa(svg)}`
}

const demoSlides: DemoSlide[] = [
  {
    id: 'editor',
    title: 'Lightning Fast Editor',
    description:
      'Start writing instantly with our distraction-free interface. No loading screens, no delays.',
    image: generatePlaceholderSVG('✏️ Editor Demo', '#6C63FF'),
    alt: 'Paperlyte editor interface showing clean, minimal design',
  },
  {
    id: 'search',
    title: 'Smart Search & Tags',
    description:
      'Find your notes instantly with intelligent search and flexible tagging system.',
    image: generatePlaceholderSVG('🔍 Search Demo', '#4F46E5'),
    alt: 'Search functionality with tags and filtering options',
  },
  {
    id: 'sync',
    title: 'Seamless Sync (Coming Soon)',
    description:
      'Your notes everywhere, always secure and private with end-to-end encryption.',
    image: generatePlaceholderSVG('🔄 Sync Demo', '#7C3AED'),
    alt: 'Multi-device sync visualization',
  },
  {
    id: 'privacy',
    title: 'Privacy First',
    description:
      'Your thoughts stay yours. No ads, no tracking, no data mining.',
    image: generatePlaceholderSVG('🔒 Privacy Demo', '#059669'),
    alt: 'Privacy and security features illustration',
  },
]

const DemoCarousel: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)

  useEffect(() => {
    trackFeatureUsage('demo_carousel', 'view')
    monitoring.addBreadcrumb('Demo carousel loaded', 'ui')
  }, [])

  useEffect(() => {
    if (!isAutoPlaying) return

    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % demoSlides.length)
    }, 4000) // 4 seconds per slide

    return () => clearInterval(interval)
  }, [isAutoPlaying])

  const goToSlide = (index: number) => {
    setCurrentSlide(index)
    setIsAutoPlaying(false) // Stop autoplay when user manually navigates
    trackFeatureUsage('demo_carousel', 'navigate', { slideIndex: index })
  }

  const nextSlide = () => {
    setCurrentSlide(prev => (prev + 1) % demoSlides.length)
    setIsAutoPlaying(false)
    trackFeatureUsage('demo_carousel', 'next')
  }

  const prevSlide = () => {
    setCurrentSlide(prev => (prev - 1 + demoSlides.length) % demoSlides.length)
    setIsAutoPlaying(false)
    trackFeatureUsage('demo_carousel', 'previous')
  }

  const toggleAutoPlay = () => {
    setIsAutoPlaying(!isAutoPlaying)
    trackFeatureUsage('demo_carousel', isAutoPlaying ? 'pause' : 'play')
  }

  const currentSlideData = demoSlides[currentSlide]

  return (
    <div className='bg-white rounded-2xl shadow-lg overflow-hidden max-w-4xl mx-auto'>
      {/* Header */}
      <div className='px-6 py-4 bg-gradient-to-r from-primary to-primary/80 text-white'>
        <div className='flex items-center justify-between'>
          <h3 className='text-lg font-semibold'>See Paperlyte in Action</h3>
          <button
            onClick={toggleAutoPlay}
            className='p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors duration-200'
            aria-label={isAutoPlaying ? 'Pause slideshow' : 'Play slideshow'}
          >
            {isAutoPlaying ? (
              <Pause className='w-4 h-4' />
            ) : (
              <Play className='w-4 h-4' />
            )}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className='relative aspect-video bg-gray-50'>
        {/* Slide Content */}
        <div className='flex h-full'>
          {/* Image Section */}
          <div className='flex-1 relative overflow-hidden'>
            <img
              src={currentSlideData.image}
              alt={currentSlideData.alt}
              className='w-full h-full object-cover'
              onError={e => {
                // Fallback to placeholder if image fails to load
                const target = e.target as HTMLImageElement
                target.src =
                  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjRjlGQUZCIi8+Cjx0ZXh0IHg9IjIwMCIgeT0iMTUwIiBmb250LWZhbWlseT0iSW50ZXIiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiM2QzYzRkYiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkRlbW8gSW1hZ2U8L3RleHQ+Cjwvc3ZnPgo='
                monitoring.addBreadcrumb(
                  'Demo carousel image load failed',
                  'error',
                  {
                    slideId: currentSlideData.id,
                    imageSrc: currentSlideData.image,
                  }
                )
              }}
            />

            {/* Navigation Arrows */}
            <button
              onClick={prevSlide}
              className='absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/90 hover:bg-white rounded-full shadow-lg transition-all duration-200 hover:scale-110'
              aria-label='Previous slide'
            >
              <ChevronLeft className='w-5 h-5 text-gray-700' />
            </button>

            <button
              onClick={nextSlide}
              className='absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/90 hover:bg-white rounded-full shadow-lg transition-all duration-200 hover:scale-110'
              aria-label='Next slide'
            >
              <ChevronRight className='w-5 h-5 text-gray-700' />
            </button>
          </div>

          {/* Text Section */}
          <div className='flex-1 p-8 flex flex-col justify-center'>
            <h4 className='text-2xl font-semibold text-dark mb-4'>
              {currentSlideData.title}
            </h4>
            <p className='text-gray-600 text-lg leading-relaxed'>
              {currentSlideData.description}
            </p>
          </div>
        </div>
      </div>

      {/* Slide Indicators */}
      <div className='px-6 py-4 bg-gray-50 border-t'>
        <div className='flex justify-center space-x-2'>
          {demoSlides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-3 h-3 rounded-full transition-all duration-200 ${
                index === currentSlide
                  ? 'bg-primary scale-110'
                  : 'bg-gray-300 hover:bg-gray-400'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Progress Bar */}
      {isAutoPlaying && (
        <div className='h-1 bg-gray-200'>
          <div
            className='h-full bg-primary transition-all duration-75 ease-linear'
            style={{
              width: `${((currentSlide + 1) / demoSlides.length) * 100}%`,
            }}
          />
        </div>
      )}
    </div>
  )
}

export default DemoCarousel
