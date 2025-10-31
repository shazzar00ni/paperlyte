import React, { useState, useEffect } from 'react'
import {
  BarChart3,
  Users,
  FileText,
  AlertTriangle,
  TrendingUp,
  Activity,
  Eye,
  Download,
} from 'lucide-react'
import { trackFeatureUsage } from '../utils/analytics'
import { monitoring } from '../utils/monitoring'
import { dataService } from '../services/dataService'

/**
 * @interface AnalyticsData
 * @description Defines the structure for the analytics data displayed on the dashboard.
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
 * @description A dashboard for administrators to view analytics, performance metrics, and error reports.
 * It fetches and displays both real and simulated data for demonstration purposes.
 * @returns {React.ReactElement} The rendered admin dashboard component.
 */
const AdminDashboard: React.FC = () => {
  // State for storing analytics data.
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  // State to manage the loading status.
  const [isLoading, setIsLoading] = useState(true)
  // State for the selected time range (e.g., '7d', '30d').
  const [timeRange, setTimeRange] = useState('7d')

  // Effect to load data when the component mounts or the time range changes.
  useEffect(() => {
    trackFeatureUsage('admin_dashboard', 'view')
    monitoring.addBreadcrumb('Admin dashboard loaded', 'navigation')
    loadAnalyticsData()
  }, [timeRange])

  /**
   * @function loadAnalyticsData
   * @description Fetches analytics data from the data service and simulates API calls for other metrics.
   * It combines real data (like note and waitlist counts) with mock data for a comprehensive view.
   */
  const loadAnalyticsData = async () => {
    setIsLoading(true)
    try {
      // Fetch real storage information from the data service.
      const storageInfo = await dataService.getStorageInfo()

      // Simulate a network delay for fetching other metrics.
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Set the analytics data with a combination of real and mock data.
      setAnalyticsData({
        totalUsers: 1247 + storageInfo.waitlistCount, // Includes actual waitlist signups.
        totalNotes: storageInfo.notesCount, // Uses the real notes count.
        activeUsers: 342,
        errorCount: 23,
        performanceMetrics: {
          avgLoadTime: 1.2,
          avgRenderTime: 0.3,
          memoryUsage: storageInfo.storageUsed / (1024 * 1024), // Convert bytes to MB.
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
      // Log any errors that occur during data fetching.
      monitoring.logError(error as Error, {
        feature: 'admin_dashboard',
        action: 'load_data',
      })
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * @function exportData
   * @description Exports notes and waitlist data to a JSON file.
   * It uses the data service to fetch the data and then constructs a downloadable blob.
   */
  const exportData = async () => {
    trackFeatureUsage('admin_dashboard', 'export_data')
    try {
      // Fetch the data to be exported from the data service.
      const data = await dataService.exportData()

      // Structure the data for the JSON file.
      const exportData = {
        exportDate: new Date().toISOString(),
        notes: data.notes,
        waitlist: data.waitlist,
        summary: {
          totalNotes: data.notes.length,
          totalWaitlistEntries: data.waitlist.length,
        },
      }

      // Create a blob and trigger a download.
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
      // Log errors and notify the user if the export fails.
      monitoring.logError(error as Error, {
        feature: 'admin_dashboard',
        action: 'export_data_failed',
      })
      alert('Export failed. Please try again.')
    }
  }

  // Display a loading skeleton while the data is being fetched.
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
    <div className='min-h-screen bg-background p-6'>
      <div className='max-w-7xl mx-auto'>
        {/* Dashboard Header */}
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
            {/* Time range selector */}
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
            {/* Export data button */}
            <button
              onClick={exportData}
              className='btn-secondary btn-md flex items-center space-x-2'
            >
              <Download className='h-4 w-4' />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Key Metrics Cards */}
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

        {/* Detailed Charts and Reports */}
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8'>
          {/* Feature Usage Section */}
          <div className='card'>
            <div className='flex items-center space-x-2 mb-4'>
              <BarChart3 className='h-5 w-5 text-primary' />
              <h3 className='text-lg font-semibold text-dark'>Feature Usage</h3>
            </div>
            <div className='space-y-4'>
              {analyticsData?.topFeatures.map((feature, index) => (
                <div key={index} className='flex items-center justify-between'>
                  <div className='flex items-center space-x-3'>
                    <span className='text-dark font-medium'>
                      {feature.name}
                    </span>
                    <div className='flex items-center space-x-1'>
                      {/* Trend indicator icon */}
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
                    {/* Usage progress bar */}
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

          {/* Performance Metrics Section */}
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
                  {analyticsData?.performanceMetrics.memoryUsage.toFixed(2)}MB
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Error Reports Table */}
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
  )
}

export default AdminDashboard
