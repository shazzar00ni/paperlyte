import React from 'react'
import { ShieldCheck } from 'lucide-react'

interface EncryptionBadgeProps {
  isEncrypted?: boolean
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
}

/**
 * EncryptionBadge - Visual indicator for encrypted content
 *
 * Shows a shield icon to indicate encryption status
 */
const EncryptionBadge: React.FC<EncryptionBadgeProps> = ({
  isEncrypted = false,
  size = 'sm',
  showText = false,
}) => {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  }

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  }

  if (!isEncrypted) {
    return null
  }

  return (
    <div
      className='inline-flex items-center gap-1 text-green-600'
      title='This note is encrypted end-to-end'
    >
      <ShieldCheck className={sizeClasses[size]} />
      {showText && (
        <span className={`font-medium ${textSizeClasses[size]}`}>
          Encrypted
        </span>
      )}
    </div>
  )
}

export default EncryptionBadge
