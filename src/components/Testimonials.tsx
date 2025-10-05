import React from 'react'
import { Star, Quote } from 'lucide-react'

interface Testimonial {
  id: string
  name: string
  role: string
  company: string
  content: string
  rating: number
  avatar: string
}

// Generate avatar placeholder SVG
const generateAvatarPlaceholder = (name: string): string => {
  const initials = name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
  
  // Generate a consistent color based on the name
  const colors = [
    '#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6'
  ]
  const colorIndex = name.charCodeAt(0) % colors.length
  const bgColor = colors[colorIndex]
  
  const svg = `<svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">
    <rect width="64" height="64" fill="${bgColor}"/>
    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="white" font-family="sans-serif" font-size="24" font-weight="600">${initials}</text>
  </svg>`
  
  const bytes = new TextEncoder().encode(svg)
  const binary = Array.from(bytes, byte => String.fromCharCode(byte)).join('')
  return `data:image/svg+xml;base64,${btoa(binary)}`
}

const Testimonials: React.FC = () => {
  const testimonials: Testimonial[] = [
    {
      id: '1',
      name: 'Sarah Chen',
      role: 'Product Manager',
      company: 'TechFlow',
      content: 'Paperlyte has completely transformed how I capture and organize my thoughts. The speed is incredible - I never lose an idea again.',
      rating: 5,
      avatar: generateAvatarPlaceholder('Sarah Chen')
    },
    {
      id: '2',
      name: 'Marcus Johnson',
      role: 'Writer & Researcher',
      company: 'Freelance',
      content: 'Finally, a note-taking app that gets out of my way. Clean, fast, and powerful. Perfect for my writing workflow.',
      rating: 4,
      avatar: generateAvatarPlaceholder('Marcus Johnson')
    },
    {
      id: '3',
      name: 'Elena Rodriguez',
      role: 'UX Designer',
      company: 'DesignLab',
      content: 'The minimal design and lightning-fast performance make this my go-to app for brainstorming and project planning.',
      rating: 5,
      avatar: generateAvatarPlaceholder('Elena Rodriguez')
    },
    {
      id: '4',
      name: 'David Park',
      role: 'Student',
      company: 'MIT',
      content: 'Paperlyte helps me stay organized with my coursework. The tagging system is intuitive and the search is incredibly fast.',
      rating: 4,
      avatar: generateAvatarPlaceholder('David Park')
    },
    {
      id: '5',
      name: 'Priya Sharma',
      role: 'Content Creator',
      company: 'YouTube',
      content: 'I use Paperlyte for all my video scripts and content ideas. The distraction-free environment is exactly what I needed.',
      rating: 5,
      avatar: generateAvatarPlaceholder('Priya Sharma')
    },
    {
      id: '6',
      name: 'Alex Thompson',
      role: 'Software Engineer',
      company: 'StartupXYZ',
      content: 'As a developer, I appreciate the clean architecture and fast performance. Great for technical notes and documentation.',
      rating: 5,
      avatar: generateAvatarPlaceholder('Alex Thompson')
    }
  ]

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Star
        key={index}
        className={`h-4 w-4 ${
          index < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
        }`}
      />
    ))
  }

  return (
    <section className='py-20 bg-gray-50'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        {/* Section Header */}
        <div className='text-center mb-16'>
          <h2 className='text-3xl md:text-4xl font-bold text-dark mb-4'>
            Loved by thousands of creators
          </h2>
          <p className='text-xl text-gray-600'>
            See what our beta users are saying about Paperlyte
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12'>
          {testimonials.map((testimonial) => (
            <div
              key={testimonial.id}
              className='bg-white rounded-xl p-6 shadow-sm hover:shadow-lg transition-shadow relative'
            >
              {/* Quote Icon */}
              <div className='absolute top-4 right-4 text-primary opacity-20'>
                <Quote className='h-6 w-6' />
              </div>

              {/* Rating */}
              <div className='flex items-center mb-4'>
                {renderStars(testimonial.rating)}
              </div>

              {/* Content */}
              <p className='text-gray-700 mb-6 leading-relaxed'>
                "{testimonial.content}"
              </p>

              {/* Author */}
              <div className='flex items-center'>
                <img
                  src={testimonial.avatar}
                  alt={`${testimonial.name} avatar`}
                  className='w-12 h-12 rounded-full mr-4'
                />
                <div>
                  <h4 className='font-semibold text-dark'>
                    {testimonial.name}
                  </h4>
                  <p className='text-sm text-gray-600'>
                    {testimonial.role} at {testimonial.company}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Stats Section */}
        <div className='grid grid-cols-1 md:grid-cols-3 gap-8 text-center'>
          <div className='bg-white rounded-xl p-8 shadow-sm'>
            <div className='text-3xl font-bold text-primary mb-2'>10,000+</div>
            <p className='text-gray-600'>Beta Users</p>
          </div>
          <div className='bg-white rounded-xl p-8 shadow-sm'>
            <div className='text-3xl font-bold text-primary mb-2'>99.9%</div>
            <p className='text-gray-600'>Uptime</p>
          </div>
          <div className='bg-white rounded-xl p-8 shadow-sm'>
            <div className='text-3xl font-bold text-primary mb-2'>4.9/5</div>
            <p className='text-gray-600'>User Rating</p>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Testimonials