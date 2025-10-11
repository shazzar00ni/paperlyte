import React, { useState } from 'react'
import { PenTool, Twitter, Github } from 'lucide-react'
import FeedbackModal from './FeedbackModal'
import InterviewScheduleModal from './InterviewScheduleModal'

const Footer: React.FC = () => {
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false)
  const [isInterviewOpen, setIsInterviewOpen] = useState(false)

  return (
    <>
      <footer className='bg-gray-50 border-t border-gray-200'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12'>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8'>
            {/* Brand */}
            <div className='col-span-1 md:col-span-2 lg:col-span-2'>
              <div className='flex items-center space-x-2 mb-4'>
                <PenTool className='h-6 w-6 text-primary' />
                <span className='font-bold text-xl text-dark'>Paperlyte</span>
              </div>
              <p className='text-gray-600 mb-4 max-w-md'>
                Lightning fast, distraction-free note-taking app. Ideas saved
                instantly—never lose your spark.
              </p>
              <div className='flex space-x-4'>
                <a
                  href='#'
                  className='text-gray-400 hover:text-primary transition-colors'
                >
                  <Twitter className='h-5 w-5' />
                </a>
                <a
                  href='#'
                  className='text-gray-400 hover:text-primary transition-colors'
                >
                  <Github className='h-5 w-5' />
                </a>
              </div>
            </div>

            {/* Product */}
            <div>
              <h3 className='font-semibold text-dark mb-4'>Product</h3>
              <ul className='space-y-2 text-gray-600'>
                <li>
                  <a href='#' className='hover:text-dark transition-colors'>
                    Features
                  </a>
                </li>
                <li>
                  <a href='#' className='hover:text-dark transition-colors'>
                    Pricing
                  </a>
                </li>
                <li>
                  <a href='#' className='hover:text-dark transition-colors'>
                    Security
                  </a>
                </li>
                <li>
                  <a href='#' className='hover:text-dark transition-colors'>
                    Roadmap
                  </a>
                </li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h3 className='font-semibold text-dark mb-4'>Company</h3>
              <ul className='space-y-2 text-gray-600'>
                <li>
                  <a href='#' className='hover:text-dark transition-colors'>
                    About
                  </a>
                </li>
                <li>
                  <a href='#' className='hover:text-dark transition-colors'>
                    Privacy
                  </a>
                </li>
                <li>
                  <a href='#' className='hover:text-dark transition-colors'>
                    Terms
                  </a>
                </li>
                <li>
                  <a href='#' className='hover:text-dark transition-colors'>
                    Contact
                  </a>
                </li>
              </ul>
            </div>

            {/* Feedback */}
            <div>
              <h3 className='font-semibold text-dark mb-4'>Feedback</h3>
              <ul className='space-y-2 text-gray-600'>
                <li>
                  <button
                    onClick={() => setIsFeedbackOpen(true)}
                    className='hover:text-dark transition-colors text-left'
                  >
                    Give Feedback
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setIsInterviewOpen(true)}
                    className='hover:text-dark transition-colors text-left'
                  >
                    User Interview
                  </button>
                </li>
              </ul>
            </div>
          </div>

          <div className='border-t border-gray-200 mt-8 pt-8 text-center text-gray-500'>
            <p>&copy; 2024 Paperlyte. All rights reserved.</p>
          </div>
        </div>

        {/* Feedback Modal */}
        <FeedbackModal
          isOpen={isFeedbackOpen}
          onClose={() => setIsFeedbackOpen(false)}
        />

        {/* Interview Schedule Modal */}
        <InterviewScheduleModal
          isOpen={isInterviewOpen}
          onClose={() => setIsInterviewOpen(false)}
        />
      </footer>
    </>
  )
}

export default Footer
