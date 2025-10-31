import {
  Activity,
  AlertTriangle,
  BarChart3,
  Download,
  Eye,
  FileText,
  TrendingUp,
  Users,
} from 'lucide-react'
import React, { useEffect, useState } from 'react'
import Header from '../components/Header'
import { dataService } from '../services/dataService'
import { trackFeatureUsage } from '../utils/analytics'
import { monitoring } from '../utils/monitoring'

/**
 * @interface AnalyticsData
 * @description Dashboard analytics data structure
 * @property {number} totalUsers - Total registered users
 * @property {number} totalNotes - Total notes created
 * @property {number} activeUsers - Currently active users
 * @property {number} errorCount - Number of errors in time range
 * @property {Object} performanceMetrics - App performance metrics
 * @property {Array} topFeatures - Most used features with trends
 * @property {Array} errorReports - Recent error reports
 */
interface AnalyticsData {
  totalUsers: number
  totalNotes: number
  activeUsers: number
  errorCount: number
  performanceMetrics: {
    avgLoadTime: number
    avgRenderTime: number
    memoryUsage: number
  }
  topFeatures: Array<{
    name: string
    usage: number
    trend: 'up' | 'down' | 'stable'
  }>
  errorReports: Array<{
    id: string
    message: string
    count: number
    lastSeen: string
  }>
}

/**
 * @component AdminDashboard
 * @description Administrative dashboard for monitoring app health and usage
 * Features:
 * - User and note statistics
 * - Performance metrics (load time, memory usage)
 * - Feature usage tracking with trends
 * - Error monitoring and reporting
 * - Time range filtering (7d, 30d, 90d)
 * - Waitlist export functionality
 * 
 * Note: Currently uses mock data for most metrics (MVP)
 * Future: Will integrate with PostHog and Sentry APIs
 * @returns {React.ReactElement} Admin dashboard with metrics cards
 */
const AdminDashboard: React.FC = () => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('7d')

  // Load dashboard data when time range changes
  useEffect(() => {
    trackFeatureUsage('admin_dashboard', 'view')
    monitoring.addBreadcrumb('Admin dashboard loaded', 'navigation')
    loadAnalyticsData()
  }, [timeRange])

  /**
   * @function loadAnalyticsData
   * @description Fetches analytics data from storage and simulates API metrics
   * Combines real storage data with mock analytics for MVP
   */
  const loadAnalyticsData = async () => {
    setIsLoading(true)
    try {
      // Get real data from storage for notes and waitlist counts
      const storageInfo = await dataService.getStorageInfo()

      // Simulate API call for other metrics - in real app, this would fetch from PostHog/Sentry APIs
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Mock data with real storage counts
      setAnalyticsData({
        totalUsers: 1247 + storageInfo.waitlistCount, // Include actual waitlist signups
        totalNotes: storageInfo.notesCount, // Use real notes count
        activeUsers: 342,
        errorCount: 23,
        performanceMetrics: {
          avgLoadTime: 1.2,
          avgRenderTime: 0.3,
          memoryUsage: storageInfo.storageUsed / (1024 * 1024), // Convert to MB
        },
        topFeatures: [
          { name: 'Note Editor', usage: 78, trend: 'up' },
          { name: 'Search', usage: 45, trend: 'stable' },
          {
            name: 'Waitlist',
            usage: Math.min(100, (storageInfo.waitlistCount / 50) * 100),
            trend: 'up',
          },
          { name: 'Landing Page', usage: 89, trend: 'down' },
        ],
        errorReports: [
          {
            id: '1',
            message: 'Failed to save note',
            count: 12,
            lastSeen: '2 hours ago',
          },
          {
            id: '2',
            message: 'Network timeout',
            count: 8,
            lastSeen: '5 hours ago',
          },
          {
            id: '3',
            message: 'Validation error',
            count: 3,
            lastSeen: '1 day ago',
          },
        ],
      })
    } catch (error) {
      monitoring.logError(error as Error, {
        feature: 'admin_dashboard',
        action: 'load_data',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const exportData = async () => {
    trackFeatureUsage('admin_dashboard', 'export_data')
    try {
      // Use data service to export real data
      const data = await dataService.exportData()

      // Create downloadable JSON file
      const exportData = {
        exportDate: new Date().toISOString(),
        notes: data.notes,
        waitlist: data.waitlist,
        summary: {
          totalNotes: data.notes.length,
          totalWaitlistEntries: data.waitlist.length,
        },
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `paperlyte-data-export-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      monitoring.logError(error as Error, {
        feature: 'admin_dashboard',
        action: 'export_data_failed',
      })
      alert('Export failed. Please try again.')
    }
  }

  if (isLoading) {
    return (
      <div className='min-h-screen bg-background p-6'>
        <div className='max-w-7xl mx-auto'>
          <div className='animate-pulse'>
            <div className='h-8 bg-gray-200 rounded w-1/4 mb-8'></div>
            <div className='grid grid-cols-1 md:grid-cols-4 gap-6 mb-8'>
              {[...Array(4)].map((_, i) => (
                <div key={i} className='card'>
                  <div className='h-16 bg-gray-200 rounded'></div>
                </div>
              ))}
            </div>
            <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
              <div className='card h-64 bg-gray-100'></div>
              <div className='card h-64 bg-gray-100'></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <Header />
      <div className='min-h-screen bg-background p-6'>
        <div className='max-w-7xl mx-auto'>
          {/* Header */}
          <div className='flex justify-between items-center mb-8'>
            <div>
              <h1 className='text-3xl font-bold text-dark'>
                Analytics Dashboard
              </h1>
              <p className='text-gray-600'>
                Monitor app performance and user behavior
              </p>
            </div>
            <div className='flex items-center space-x-4'>
              <select
                value={timeRange}
                onChange={e => setTimeRange(e.target.value)}
                className='input text-sm'
              >
                <option value='24h'>Last 24 hours</option>
                <option value='7d'>Last 7 days</option>
                <option value='30d'>Last 30 days</option>
                <option value='90d'>Last 90 days</option>
              </select>
              <button
                onClick={exportData}
                className='btn-secondary btn-md flex items-center space-x-2'
              >
                <Download className='h-4 w-4' />
                <span>Export</span>
              </button>
            </div>
          </div>

          {/* Metrics Cards */}
          <div className='grid grid-cols-1 md:grid-cols-4 gap-6 mb-8'>
            <div className='card'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-gray-600 text-sm'>Total Users</p>
                  <p className='text-2xl font-bold text-dark'>
                    {analyticsData?.totalUsers}
                  </p>
                </div>
                <Users className='h-8 w-8 text-primary' />
              </div>
            </div>

            <div className='card'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-gray-600 text-sm'>Total Notes</p>
                  <p className='text-2xl font-bold text-dark'>
                    {analyticsData?.totalNotes}
                  </p>
                </div>
                <FileText className='h-8 w-8 text-primary' />
              </div>
            </div>

            <div className='card'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-gray-600 text-sm'>Active Users</p>
                  <p className='text-2xl font-bold text-dark'>
                    {analyticsData?.activeUsers}
                  </p>
                </div>
                <Activity className='h-8 w-8 text-green-500' />
              </div>
            </div>

            <div className='card'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-gray-600 text-sm'>Error Reports</p>
                  <p className='text-2xl font-bold text-dark'>
                    {analyticsData?.errorCount}
                  </p>
                </div>
                <AlertTriangle className='h-8 w-8 text-red-500' />
              </div>
            </div>
          </div>

          {/* Charts and Details */}
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8'>
            {/* Feature Usage */}
            <div className='card'>
              <div className='flex items-center space-x-2 mb-4'>
                <BarChart3 className='h-5 w-5 text-primary' />
                <h3 className='text-lg font-semibold text-dark'>
                  Feature Usage
                </h3>
              </div>
              <div className='space-y-4'>
                {analyticsData?.topFeatures.map((feature, index) => (
                  <div
                    key={index}
                    className='flex items-center justify-between'
                  >
                    <div className='flex items-center space-x-3'>
                      <span className='text-dark font-medium'>
                        {feature.name}
                      </span>
                      <div className='flex items-center space-x-1'>
                        <TrendingUp
                          className={`h-4 w-4 ${
                            feature.trend === 'up'
                              ? 'text-green-500'
                              : feature.trend === 'down'
                                ? 'text-red-500 transform rotate-180'
                                : 'text-gray-400'
                          }`}
                        />
                      </div>
                    </div>
                    <div className='flex items-center space-x-2'>
                      <div className='w-20 bg-gray-200 rounded-full h-2'>
                        <div
                          className='h-2 bg-primary rounded-full'
                          style={{ width: `${feature.usage}%` }}
                        ></div>
                      </div>
                      <span className='text-sm text-gray-600'>
                        {feature.usage}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Performance Metrics */}
            <div className='card'>
              <div className='flex items-center space-x-2 mb-4'>
                <Activity className='h-5 w-5 text-primary' />
                <h3 className='text-lg font-semibold text-dark'>Performance</h3>
              </div>
              <div className='space-y-4'>
                <div className='flex justify-between items-center'>
                  <span className='text-gray-600'>Avg Load Time</span>
                  <span className='font-medium text-dark'>
                    {analyticsData?.performanceMetrics.avgLoadTime}s
                  </span>
                </div>
                <div className='flex justify-between items-center'>
                  <span className='text-gray-600'>Avg Render Time</span>
                  <span className='font-medium text-dark'>
                    {analyticsData?.performanceMetrics.avgRenderTime}s
                  </span>
                </div>
                <div className='flex justify-between items-center'>
                  <span className='text-gray-600'>Memory Usage</span>
                  <span className='font-medium text-dark'>
                    {analyticsData?.performanceMetrics.memoryUsage}MB
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Error Reports */}
          <div className='card'>
            <div className='flex items-center space-x-2 mb-4'>
              <AlertTriangle className='h-5 w-5 text-red-500' />
              <h3 className='text-lg font-semibold text-dark'>
                Recent Error Reports
              </h3>
            </div>
            <div className='overflow-x-auto'>
              <table className='w-full'>
                <thead className='border-b border-gray-200'>
                  <tr>
                    <th className='text-left py-2 text-gray-600 font-medium'>
                      Error
                    </th>
                    <th className='text-left py-2 text-gray-600 font-medium'>
                      Count
                    </th>
                    <th className='text-left py-2 text-gray-600 font-medium'>
                      Last Seen
                    </th>
                    <th className='text-left py-2 text-gray-600 font-medium'>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {analyticsData?.errorReports.map(error => (
                    <tr key={error.id} className='border-b border-gray-100'>
                      <td className='py-3 text-dark'>{error.message}</td>
                      <td className='py-3 text-gray-600'>{error.count}</td>
                      <td className='py-3 text-gray-600'>{error.lastSeen}</td>
                      <td className='py-3'>
                        <button className='text-primary hover:text-primary/80 text-sm flex items-center space-x-1'>
                          <Eye className='h-4 w-4' />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default AdminDashboard
