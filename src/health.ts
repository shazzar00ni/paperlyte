/**
 * Health Check Endpoint
 * Provides deployment verification and system status information
 */

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  version: string
  timestamp: string
  checks: {
    storage: boolean
    analytics: boolean
    monitoring: boolean
  }
  environment: string
  buildInfo: {
    commit?: string
    buildTime?: string
  }
}

/**
 * Check localStorage availability
 */
const checkStorage = (): boolean => {
  try {
    const testKey = '__paperlyte_health_check__'
    localStorage.setItem(testKey, 'test')
    localStorage.removeItem(testKey)
    return true
  } catch {
    return false
  }
}

/**
 * Check analytics availability
 */
const checkAnalytics = (): boolean => {
  return typeof window !== 'undefined' && 'posthog' in window
}

/**
 * Check monitoring availability
 */
const checkMonitoring = (): boolean => {
  return typeof window !== 'undefined' && 'Sentry' in window
}

/**
 * Get health status
 */
export const getHealthStatus = (): HealthStatus => {
  const storageOk = checkStorage()
  const analyticsOk = checkAnalytics()
  const monitoringOk = checkMonitoring()

  // Determine overall status
  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
  if (!storageOk) {
    status = 'unhealthy'
  } else if (!analyticsOk || !monitoringOk) {
    status = 'degraded'
  }

  return {
    status,
    version: import.meta.env.VITE_APP_VERSION || '0.1.0',
    timestamp: new Date().toISOString(),
    checks: {
      storage: storageOk,
      analytics: analyticsOk,
      monitoring: monitoringOk,
    },
    environment: import.meta.env.VITE_ENVIRONMENT || 'development',
    buildInfo: {
      commit: import.meta.env.VITE_COMMIT_SHA,
      buildTime: import.meta.env.VITE_BUILD_TIME,
    },
  }
}

/**
 * Expose health endpoint on window for deployment verification
 */
if (typeof window !== 'undefined') {
  const windowWithHealth = window as unknown as Window & {
    __paperlyte_health: () => HealthStatus
  }
  windowWithHealth.__paperlyte_health = getHealthStatus
}
