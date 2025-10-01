import React, { useEffect, useState } from 'react'
import {
  Cloud,
  CloudOff,
  RefreshCw,
  AlertTriangle,
  Check,
  Clock,
} from 'lucide-react'
import type { SyncStatus, SyncMetadata } from '../types'
import { syncEngine } from '../services/syncEngine'
import { trackFeatureUsage } from '../utils/analytics'
import { monitoring } from '../utils/monitoring'

interface SyncStatusIndicatorProps {
  status?: SyncStatus
  compact?: boolean
  showLastSync?: boolean
}

/**
 * SyncStatusIndicator - Displays current sync status
 *
 * Shows visual feedback about sync state and provides quick access to sync info
 */
const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({
  status = 'synced',
  compact = false,
  showLastSync = true,
}) => {
  const [syncMetadata, setSyncMetadata] = useState<SyncMetadata | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    loadSyncMetadata()
    trackFeatureUsage('sync_status_indicator', 'view')
  }, [])

  const loadSyncMetadata = async () => {
    try {
      const metadata = await syncEngine.getSyncMetadata()
      setSyncMetadata(metadata)
    } catch (error) {
      monitoring.logError(error as Error, {
        feature: 'sync_status_indicator',
        action: 'load_metadata',
      })
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    trackFeatureUsage('sync_status_indicator', 'manual_refresh')

    try {
      await loadSyncMetadata()
    } finally {
      setTimeout(() => setIsRefreshing(false), 1000)
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'synced':
        return <Check className='w-4 h-4' />
      case 'syncing':
        return <RefreshCw className='w-4 h-4 animate-spin' />
      case 'conflict':
        return <AlertTriangle className='w-4 h-4' />
      case 'error':
        return <CloudOff className='w-4 h-4' />
      case 'pending':
        return <Clock className='w-4 h-4' />
      default:
        return <Cloud className='w-4 h-4' />
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'synced':
        return 'text-green-600'
      case 'syncing':
        return 'text-blue-600'
      case 'conflict':
        return 'text-orange-600'
      case 'error':
        return 'text-red-600'
      case 'pending':
        return 'text-gray-600'
      default:
        return 'text-gray-400'
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'synced':
        return 'Synced'
      case 'syncing':
        return 'Syncing...'
      case 'conflict':
        return 'Conflict'
      case 'error':
        return 'Sync Error'
      case 'pending':
        return 'Pending'
      default:
        return 'Unknown'
    }
  }

  const formatLastSync = (timestamp: string | null) => {
    if (!timestamp) return 'Never'

    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}d ago`
  }

  if (compact) {
    return (
      <div
        className={`flex items-center gap-1 ${getStatusColor()}`}
        title={getStatusText()}
      >
        {getStatusIcon()}
      </div>
    )
  }

  return (
    <div className='flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200'>
      <div className={`flex items-center gap-2 ${getStatusColor()}`}>
        {getStatusIcon()}
        <span className='text-sm font-medium'>{getStatusText()}</span>
      </div>

      {showLastSync && syncMetadata && (
        <>
          <span className='text-gray-300'>|</span>
          <span className='text-xs text-gray-500'>
            Last sync: {formatLastSync(syncMetadata.lastSyncTime)}
          </span>
        </>
      )}

      {syncMetadata && syncMetadata.conflictCount > 0 && (
        <>
          <span className='text-gray-300'>|</span>
          <span className='text-xs text-orange-600 font-medium'>
            {syncMetadata.conflictCount} conflict
            {syncMetadata.conflictCount > 1 ? 's' : ''}
          </span>
        </>
      )}

      <button
        onClick={handleRefresh}
        className='ml-auto p-1 rounded hover:bg-gray-100 transition-colors'
        disabled={isRefreshing}
        title='Refresh sync status'
      >
        <RefreshCw
          className={`w-3 h-3 text-gray-400 ${isRefreshing ? 'animate-spin' : ''}`}
        />
      </button>
    </div>
  )
}

export default SyncStatusIndicator
