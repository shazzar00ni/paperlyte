import {
  Search,
  Edit3,
  FolderTree,
  Globe,
  Users,
  FileText,
  Wifi,
  History,
} from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import DemoCarousel from '../components/DemoCarousel'
import WaitlistModal from '../components/WaitlistModal'
import {
  trackFeatureUsage,
  trackUserAction,
  trackWaitlistEvent,
} from '../utils/analytics'
import { monitoring } from '../utils/monitoring'

const LandingPage: React.FC = () => {
  const [isWaitlistOpen, setIsWaitlistOpen] = useState(false)

  useEffect(() => {
    // Track landing page view
    trackFeatureUsage('landing_page', 'view')
    trackUserAction('landing_page_view')
    monitoring.addBreadcrumb('Landing page loaded', 'navigation')
  }, [])

  const handleWaitlistClick = () => {
    setIsWaitlistOpen(true)
    trackWaitlistEvent('view')
  }

  const features = [
    {
      icon: <Edit3 className='h-6 w-6' />,
      title: 'Distraction-Free Writing',
      description:
        "When inspiration strikes, the last thing you need is clutter. Paperlyte's clean, minimal interface disappears into the background, letting your thoughts take center stage. No distractions, no unnecessary bells and whistles—just you and your ideas.",
    },
    {
      icon: <FolderTree className='h-6 w-6' />,
      title: 'Smart Organization',
      description:
        'Folders, tags, favorites—organize your notes however your brain works best. Create nested structures for complex projects or keep it simple with a flat hierarchy. Paperlyte adapts to your system, not the other way around.',
    },
    {
      icon: <Search className='h-6 w-6' />,
      title: 'Instant Search',
      description:
        "Find anything in seconds. Our powerful search cuts through thousands of notes to surface exactly what you're looking for. Search by keyword, tag, date, or even text within images. Your ideas are never lost again.",
    },
    {
      icon: <Globe className='h-6 w-6' />,
      title: 'Seamless Sync',
      description:
        'Start a thought on your phone during your commute, expand it on your laptop at the coffee shop, and polish it on your tablet before bed. Paperlyte syncs instantly across all your devices, so your notes are always where you need them.',
    },
    {
      icon: <Users className='h-6 w-6' />,
      title: 'Collaborative Workspaces',
      description:
        'Some ideas are better together. Share notebooks with teammates, study groups, or creative partners. Real-time collaboration means everyone stays on the same page—literally.',
    },
    {
      icon: <FileText className='h-6 w-6' />,
      title: 'Rich Formatting',
      description:
        "Sometimes plain text isn't enough. Add images, links, code blocks, tables, and more. Paperlyte supports markdown for speed demons and has a visual editor for everyone else.",
    },
    {
      icon: <Wifi className='h-6 w-6' />,
      title: 'Offline Mode',
      description:
        "Airplane mode? Spotty wifi? No problem. Paperlyte works perfectly offline, syncing your changes the moment you're back online. Never let connectivity kill your creativity.",
    },
    {
      icon: <History className='h-6 w-6' />,
      title: 'Version History',
      description:
        'Made changes you regret? Paperlyte automatically saves versions of your notes so you can always roll back to earlier drafts. Consider it your creative safety net.',
    },
  ]

  const testimonials = [
    {
      quote: "Finally, a notes app that doesn't feel like work.",
      author: 'Maria Chen',
      role: 'Freelance Writer',
    },
    {
      quote: "I've tried them all. Paperlyte is the one that stuck.",
      author: 'James Rodriguez',
      role: 'PhD Candidate',
    },
    {
      quote:
        "My team's brainstorming sessions have never been more productive.",
      author: 'Aisha Patel',
      role: 'Creative Director',
    },
    {
      quote:
        "It's like someone finally understood how my brain actually works.",
      author: 'Taylor Kim',
      role: 'Software Engineer',
    },
    {
      quote:
        'I switched from [competitor] and never looked back. Paperlyte just makes sense.',
      author: 'Devon Walsh',
      role: 'Content Strategist',
    },
  ]

  const faqs = [
    {
      question: 'Is Paperlyte really free?',
      answer:
        "Yes! Our free plan gives you unlimited notes, basic organization tools, and sync across two devices. When you're ready for more power features, our Pro plan is just $8/month.",
    },
    {
      question: 'Can I import my notes from other apps?',
      answer:
        'Absolutely. We support imports from Evernote, Notion, Apple Notes, Google Keep, and plain text files. Making the switch is painless.',
    },
    {
      question: 'What happens to my data?',
      answer:
        "Your notes are encrypted in transit and at rest. We don't read your notes, sell your data, or do anything shady. Your thoughts are yours, full stop.",
    },
    {
      question: 'Do you have a mobile app?',
      answer:
        'Yes! Paperlyte is available on iOS, Android, web, Mac, and Windows. Use it everywhere or pick your favorite platform.',
    },
    {
      question: 'Can I use Paperlyte offline?',
      answer:
        'Definitely. All your notes are available offline, and any changes sync automatically when you reconnect.',
    },
    {
      question: "What's your refund policy?",
      answer:
        "If you're not happy within the first 30 days of upgrading to Pro, we'll refund you—no questions asked.",
    },
    {
      question: 'How is Paperlyte different from [other app]?',
      answer:
        'We focus on doing one thing exceptionally well: note-taking. No bloat, no feature creep, no trying to be your entire life operating system. Just clean, fast, reliable notes.',
    },
  ]

  return (
    <div className='flex flex-col'>
      {/* Hero Section */}
      <section className='bg-gradient-to-br from-primary/10 to-accent/10 py-20'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center'>
          <h1 className='text-4xl md:text-6xl font-bold text-dark mb-6'>
            Your thoughts, organized.
            <span className='text-gradient'> Your ideas, amplified.</span>
          </h1>
          <p className='text-xl text-gray-600 mb-8 max-w-3xl mx-auto'>
            Paperlyte is the note-taking app built for thinkers who refuse to
            let great ideas slip away. Capture, organize, and create—all in one
            beautifully simple space.
          </p>
          <div className='flex flex-col sm:flex-row gap-4 justify-center'>
            <Link
              to='/editor'
              className='btn-primary btn-lg animation-glow'
              onClick={() => trackUserAction('start_writing_clicked')}
            >
              Start taking better notes today
            </Link>
            <button
              onClick={handleWaitlistClick}
              className='btn-secondary btn-lg'
            >
              See how it works
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

      {/* Testimonials Section */}
      <section className='py-20 bg-gray-50'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='text-center mb-16'>
            <h2 className='text-3xl md:text-4xl font-bold text-dark mb-4'>
              Loved by thinkers everywhere
            </h2>
            <p className='text-xl text-gray-600'>
              See what people are saying about Paperlyte
            </p>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8'>
            {testimonials.map(testimonial => (
              <div key={testimonial.author} className='card bg-white'>
                <p className='text-lg text-gray-700 mb-4 italic'>
                  &quot;{testimonial.quote}&quot;
                </p>
                <div className='border-t border-gray-200 pt-4'>
                  <p className='font-semibold text-dark'>
                    {testimonial.author}
                  </p>
                  <p className='text-sm text-gray-500'>{testimonial.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className='py-20 bg-white'>
        <div className='max-w-4xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='text-center mb-16'>
            <h2 className='text-3xl md:text-4xl font-bold text-dark mb-4'>
              Frequently Asked Questions
            </h2>
            <p className='text-xl text-gray-600'>
              Everything you need to know about Paperlyte
            </p>
          </div>

          <div className='space-y-6'>
            {faqs.map(faq => (
              <div key={faq.question} className='card bg-gray-50'>
                <h3 className='text-xl font-semibold text-dark mb-3'>
                  {faq.question}
                </h3>
                <p className='text-gray-600 leading-relaxed'>{faq.answer}</p>
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
