import React from 'react'
import { Check, Zap, Crown, Users } from 'lucide-react'
import { trackUserAction } from '../utils/analytics'

interface PricingTier {
  id: string
  name: string
  price: string
  period: string
  description: string
  features: string[]
  highlighted: boolean
  icon: React.ReactNode
  buttonText: string
  comingSoon?: boolean
}

interface PricingProps {
  onWaitlistClick: () => void
}

const Pricing: React.FC<PricingProps> = ({ onWaitlistClick }) => {
  const pricingTiers: PricingTier[] = [
    {
      id: 'starter',
      name: 'Starter',
      price: 'Free',
      period: 'forever',
      description: 'Perfect for personal note-taking and getting started',
      features: [
        'Up to 1,000 notes',
        'Basic search',
        'Web access',
        'Standard support',
        '5 tags maximum',
        'Basic export (txt, md)'
      ],
      highlighted: false,
      icon: <Zap className='h-6 w-6' />,
      buttonText: 'Join Waitlist',
      comingSoon: true
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '$9',
      period: 'per month',
      description: 'For power users who need advanced features',
      features: [
        'Unlimited notes',
        'Advanced search & filters',
        'All device sync',
        'Priority support',
        'Unlimited tags',
        'Rich export options (PDF, DOCX)',
        'Advanced organization',
        'Collaboration features',
        'Custom themes'
      ],
      highlighted: true,
      icon: <Crown className='h-6 w-6' />,
      buttonText: 'Join Waitlist',
      comingSoon: true
    },
    {
      id: 'team',
      name: 'Team',
      price: '$19',
      period: 'per user/month',
      description: 'Built for teams and organizations',
      features: [
        'Everything in Pro',
        'Team workspaces',
        'Admin controls',
        'SSO integration',
        'Team analytics',
        'Bulk export/import',
        'API access',
        'Custom branding',
        'Dedicated support'
      ],
      highlighted: false,
      icon: <Users className='h-6 w-6' />,
      buttonText: 'Contact Sales',
      comingSoon: true
    }
  ]

  const handlePricingClick = (tierId: string) => {
    trackUserAction('pricing_click', { tier: tierId })
    if (tierId === 'team') {
      // Use location.href for better compatibility
      window.location.href = 'mailto:sales@paperlyte.com?subject=Team Plan Inquiry'
    } else {
      onWaitlistClick()
    }
  }

  return (
    <section id='pricing' className='py-20 bg-white'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        {/* Section Header */}
        <div className='text-center mb-16'>
          <h2 className='text-3xl md:text-4xl font-bold text-dark mb-4'>
            Simple, transparent pricing
          </h2>
          <p className='text-xl text-gray-600 mb-8'>
            Choose the plan that's right for you. Upgrade or downgrade at any time.
          </p>
          
          {/* Coming Soon Badge */}
          <div className='inline-flex items-center px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium mb-8'>
            <Zap className='h-4 w-4 mr-2' />
            Launching Q1 2025 - Join the waitlist for early access
          </div>
        </div>

        {/* Pricing Cards */}
        <div className='grid grid-cols-1 md:grid-cols-3 gap-8 mb-12'>
          {pricingTiers.map((tier) => (
            <div
              key={tier.id}
              className={`relative rounded-2xl p-8 ${
                tier.highlighted
                  ? 'bg-primary text-white shadow-2xl scale-105 border-2 border-primary'
                  : 'bg-white border border-gray-200 shadow-sm hover:shadow-lg'
              } transition-all`}
            >
              {/* Popular Badge */}
              {tier.highlighted && (
                <div className='absolute -top-4 left-1/2 transform -translate-x-1/2'>
                  <div className='bg-accent px-4 py-1 rounded-full text-sm font-medium text-white'>
                    Most Popular
                  </div>
                </div>
              )}

              {/* Icon */}
              <div className={`inline-flex p-3 rounded-xl mb-4 ${
                tier.highlighted ? 'bg-white/20' : 'bg-primary/10'
              }`}>
                <div className={tier.highlighted ? 'text-white' : 'text-primary'}>
                  {tier.icon}
                </div>
              </div>

              {/* Plan Name */}
              <h3 className={`text-2xl font-bold mb-2 ${
                tier.highlighted ? 'text-white' : 'text-dark'
              }`}>
                {tier.name}
              </h3>

              {/* Price */}
              <div className='mb-4'>
                <span className={`text-4xl font-bold ${
                  tier.highlighted ? 'text-white' : 'text-dark'
                }`}>
                  {tier.price}
                </span>
                {tier.price !== 'Free' && (
                  <span className={`text-sm ml-2 ${
                    tier.highlighted ? 'text-white/80' : 'text-gray-600'
                  }`}>
                    {tier.period}
                  </span>
                )}
              </div>

              {/* Description */}
              <p className={`mb-6 ${
                tier.highlighted ? 'text-white/90' : 'text-gray-600'
              }`}>
                {tier.description}
              </p>

              {/* Features */}
              <ul className='space-y-3 mb-8'>
                {tier.features.map((feature, index) => (
                  <li key={index} className='flex items-start'>
                    <Check className={`h-5 w-5 mr-3 mt-0.5 flex-shrink-0 ${
                      tier.highlighted ? 'text-white' : 'text-primary'
                    }`} />
                    <span className={`text-sm ${
                      tier.highlighted ? 'text-white' : 'text-gray-700'
                    }`}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <button
                onClick={() => handlePricingClick(tier.id)}
                className={`w-full py-3 px-6 rounded-lg font-medium transition-all ${
                  tier.highlighted
                    ? 'bg-white text-primary hover:bg-gray-50'
                    : 'bg-primary text-white hover:bg-primary/90'
                }`}
              >
                {tier.buttonText}
              </button>

              {tier.comingSoon && (
                <p className={`text-xs text-center mt-3 ${
                  tier.highlighted ? 'text-white/70' : 'text-gray-500'
                }`}>
                  Available in early 2025
                </p>
              )}
            </div>
          ))}
        </div>

        {/* FAQ Section */}
        <div className='text-center'>
          <h3 className='text-2xl font-bold text-dark mb-4'>
            Questions about pricing?
          </h3>
          <p className='text-gray-600 mb-6'>
            We're here to help. Get in touch with any questions about our plans.
          </p>
          <a
            href='mailto:support@paperlyte.com'
            className='inline-flex items-center text-primary hover:text-primary/80 font-medium'
            onClick={() => trackUserAction('pricing_contact_click')}
          >
            Contact our team →
          </a>
        </div>
      </div>
    </section>
  )
}

export default Pricing