import React from 'react'
import { PenTool, Twitter, Github } from 'lucide-react'

const Footer: React.FC = () => {
  return (
    <footer className='bg-gray-50 border-t border-gray-200'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12'>
        <div className='grid grid-cols-1 md:grid-cols-4 gap-8'>
          {/* Brand */}
          <div className='col-span-1 md:col-span-2'>
            <div className='flex items-center space-x-2 mb-4'>
              <PenTool className='h-6 w-6 text-primary' />
              <span className='font-bold text-xl text-dark'>Paperlyte</span>
            </div>
            <p className='text-gray-600 mb-4 max-w-md'>
              The note-taking app built for thinkers who refuse to let great
              ideas slip away. Capture, organize, and create—all in one
              beautifully simple space.
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
        </div>

        <div className='border-t border-gray-200 mt-8 pt-8 text-center text-gray-500'>
          <p>&copy; 2024 Paperlyte. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
