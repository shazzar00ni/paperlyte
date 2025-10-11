import { MessageSquare } from 'lucide-react'
import React, { useState } from 'react'
import FeedbackModal from './FeedbackModal'
import { trackFeedbackEvent } from '../utils/analytics'
import { monitoring } from '../utils/monitoring'

interface FeedbackButtonProps {
  position?: 'fixed' | 'inline'
  className?: string
}

const FeedbackButton: React.FC<FeedbackButtonProps> = ({
  position = 'fixed',
  className = '',
}) => {
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false)

  const handleClick = () => {
    setIsFeedbackOpen(true)
    trackFeedbackEvent('view')
    monitoring.addBreadcrumb('Feedback modal opened', 'user_action')
  }

  const baseClassName =
    position === 'fixed'
      ? 'fixed bottom-6 right-6 bg-primary text-white hover:bg-primary-dark shadow-lg hover:shadow-xl transition-all duration-200 rounded-full p-4 z-50'
      : 'btn-secondary btn-md'

  return (
    <>
      <button
        onClick={handleClick}
        className={`${baseClassName} ${className}`}
        aria-label='Give feedback'
        title='Give feedback'
      >
        <MessageSquare className='h-6 w-6' />
        {position === 'inline' && <span className='ml-2'>Give Feedback</span>}
      </button>

      <FeedbackModal
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
      />
    </>
  )
}

export default FeedbackButton
