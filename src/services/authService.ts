import type {
  AuthUser,
  AuthToken,
  AuthSession,
  AuthError,
  LoginCredentials,
  SignupCredentials,
  PasswordResetRequest,
  PasswordResetConfirm,
  OAuthConfig,
  OAuthResponse,
  AuthProvider,
} from '../types'
import { monitoring } from '../utils/monitoring'

/**
 * Authentication Service - Abstraction layer for authentication
 *
 * CURRENT IMPLEMENTATION: localStorage simulation (MVP phase)
 * FUTURE MIGRATION: Will be replaced with API calls in Q4 2025
 *
 * This abstraction layer ensures easy migration from localStorage to API
 * without changing component code.
 *
 * API Endpoints (Future):
 * - POST /api/auth/signup
 * - POST /api/auth/login
 * - POST /api/auth/logout
 * - POST /api/auth/refresh
 * - POST /api/auth/reset-password
 * - POST /api/auth/oauth/google
 * - POST /api/auth/oauth/apple
 */

/**
 * @interface RateLimitEntry
 * @description Tracks rate limiting attempts for authentication operations
 * @property {number} count - Number of authentication attempts made
 * @property {number} resetAt - Timestamp when rate limit resets (milliseconds since epoch)
 */
interface RateLimitEntry {
  count: number
  resetAt: number
}

class AuthService {
  private storagePrefix = 'paperlyte_auth_'
  private sessionKey = `${this.storagePrefix}session`
  private usersKey = `${this.storagePrefix}users`
  private rateLimitKey = `${this.storagePrefix}rate_limit_`

  // Rate limiting: 5 attempts per 15 minutes
  private readonly MAX_ATTEMPTS = 5
  private readonly RATE_LIMIT_WINDOW = 15 * 60 * 1000 // 15 minutes in ms

  // Token expiry: 24 hours for access token, 7 days for refresh token
  private readonly ACCESS_TOKEN_EXPIRY = 24 * 60 * 60 * 1000 // 24 hours
  private readonly REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60 * 1000 // 7 days

  /**
   * @function getFromStorage
   * @description Retrieves and parses data from localStorage
   * @template T - Type of data to retrieve
   * @param {string} key - localStorage key
   * @returns {T | null} Parsed data or null if not found/error
   * @private
   */
  private getFromStorage<T>(key: string): T | null {
    try {
      const data = localStorage.getItem(key)
      return data ? JSON.parse(data) : null
    } catch (error) {
      monitoring.logError(error as Error, {
        feature: 'auth_service',
        action: 'get_from_storage',
        additionalData: { key },
      })
      return null
    }
  }

  /**
   * @function saveToStorage
   * @description Serializes and saves data to localStorage
   * @template T - Type of data to save
   * @param {string} key - localStorage key
   * @param {T} data - Data to serialize and save
   * @returns {boolean} True if saved successfully, false otherwise
   * @private
   */
  private saveToStorage<T>(key: string, data: T): boolean {
    try {
      localStorage.setItem(key, JSON.stringify(data))
      return true
    } catch (error) {
      monitoring.logError(error as Error, {
        feature: 'auth_service',
        action: 'save_to_storage',
        additionalData: { key },
      })
      return false
    }
  }

  /**
   * @function removeFromStorage
   * @description Removes data from localStorage with error handling
   * @param {string} key - localStorage key to remove
   * @private
   */
  private removeFromStorage(key: string): void {
    try {
      localStorage.removeItem(key)
    } catch (error) {
      monitoring.logError(error as Error, {
        feature: 'auth_service',
        action: 'remove_from_storage',
        additionalData: { key },
      })
    }
  }

  /**
   * @function checkRateLimit
   * @description Implements rate limiting to prevent brute force attacks
   * Allows MAX_ATTEMPTS (5) within RATE_LIMIT_WINDOW (15 minutes)
   * @param {string} identifier - User identifier (email or username)
   * @returns {boolean} True if rate limit not exceeded, false otherwise
   * @private
   */
  private checkRateLimit(identifier: string): boolean {
    const key = `${this.rateLimitKey}${identifier}`
    const now = Date.now()
    const rateLimit = this.getFromStorage<RateLimitEntry>(key)

    if (!rateLimit || now > rateLimit.resetAt) {
      // First attempt or window expired
      this.saveToStorage(key, {
        count: 1,
        resetAt: now + this.RATE_LIMIT_WINDOW,
      })
      return true
    }

    if (rateLimit.count >= this.MAX_ATTEMPTS) {
      return false
    }

    // Increment attempt count
    this.saveToStorage(key, {
      count: rateLimit.count + 1,
      resetAt: rateLimit.resetAt,
    })
    return true
  }

  /**
   * Password hashing simulation (bcrypt will be used in backend)
   */
  private async hashPassword(password: string): Promise<string> {
    // Simulate bcrypt hashing - in production, this happens server-side
    // Using a simple hash for MVP simulation
    const encoder = new TextEncoder()
    const data = encoder.encode(password + 'paperlyte_salt')
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  private async verifyPassword(
    password: string,
    hash: string
  ): Promise<boolean> {
    const inputHash = await this.hashPassword(password)
    return inputHash === hash
  }

  /**
   * Token generation
   */
  private generateToken(): string {
    return crypto.randomUUID() + '.' + Date.now().toString(36)
  }

  private createAuthToken(): AuthToken {
    const now = Date.now()
    return {
      accessToken: this.generateToken(),
      refreshToken: this.generateToken(),
      expiresAt: new Date(now + this.ACCESS_TOKEN_EXPIRY).toISOString(),
      tokenType: 'Bearer',
    }
  }

  /**
   * Input validation
   */
  private validateEmail(email: string): AuthError | null {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email || email.trim().length === 0) {
      return {
        code: 'INVALID_EMAIL',
        message: 'Email is required',
        field: 'email',
      }
    }
    if (!emailRegex.test(email)) {
      return {
        code: 'INVALID_EMAIL',
        message: 'Please enter a valid email address',
        field: 'email',
      }
    }
    return null
  }

  private validatePassword(password: string): AuthError | null {
    if (!password || password.length < 8) {
      return {
        code: 'INVALID_PASSWORD',
        message: 'Password must be at least 8 characters long',
        field: 'password',
      }
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return {
        code: 'WEAK_PASSWORD',
        message:
          'Password must contain at least one uppercase letter, one lowercase letter, and one number',
        field: 'password',
      }
    }
    return null
  }

  private validateName(name: string): AuthError | null {
    if (!name || name.trim().length === 0) {
      return {
        code: 'INVALID_NAME',
        message: 'Name is required',
        field: 'name',
      }
    }
    if (name.trim().length < 2) {
      return {
        code: 'INVALID_NAME',
        message: 'Name must be at least 2 characters long',
        field: 'name',
      }
    }
    return null
  }

  /**
   * User management helpers
   */
  private getUsers(): AuthUser[] {
    return this.getFromStorage<AuthUser[]>(this.usersKey) || []
  }

  private saveUsers(users: AuthUser[]): boolean {
    return this.saveToStorage(this.usersKey, users)
  }

  private findUserByEmail(email: string): AuthUser | null {
    const users = this.getUsers()
    return (
      users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null
    )
  }

  /**
   * Public API: Sign up with email/password
   */
  async signup(
    credentials: SignupCredentials
  ): Promise<{ session?: AuthSession; error?: AuthError }> {
    return new Promise(resolve => {
      setTimeout(async () => {
        try {
          monitoring.addBreadcrumb('Signup attempt', 'auth', {
            email: credentials.email,
          })

          // Rate limiting
          if (!this.checkRateLimit(`signup_${credentials.email}`)) {
            resolve({
              error: {
                code: 'RATE_LIMIT_EXCEEDED',
                message: 'Too many signup attempts. Please try again later.',
              },
            })
            return
          }

          // Validate inputs
          const emailError = this.validateEmail(credentials.email)
          if (emailError) {
            resolve({ error: emailError })
            return
          }

          const passwordError = this.validatePassword(credentials.password)
          if (passwordError) {
            resolve({ error: passwordError })
            return
          }

          const nameError = this.validateName(credentials.name)
          if (nameError) {
            resolve({ error: nameError })
            return
          }

          // Check if user already exists
          if (this.findUserByEmail(credentials.email)) {
            resolve({
              error: {
                code: 'EMAIL_EXISTS',
                message: 'An account with this email already exists',
                field: 'email',
              },
            })
            return
          }

          // Hash password
          const passwordHash = await this.hashPassword(credentials.password)

          // Create user
          const now = new Date().toISOString()
          const newUser: AuthUser = {
            id: crypto.randomUUID(),
            email: credentials.email.toLowerCase(),
            name: credentials.name.trim(),
            provider: 'email',
            emailVerified: false, // Would send verification email in production
            createdAt: now,
            updatedAt: now,
            lastLoginAt: now,
          }

          // Store user with password hash (separate storage for security)
          const users = this.getUsers()
          users.push(newUser)
          this.saveUsers(users)

          // Store password hash separately
          const passwordKey = `${this.storagePrefix}password_${newUser.id}`
          this.saveToStorage(passwordKey, passwordHash)

          // Create session
          const token = this.createAuthToken()
          const session: AuthSession = {
            user: newUser,
            token,
            isAuthenticated: true,
          }

          // Save session
          this.saveToStorage(this.sessionKey, session)

          monitoring.addBreadcrumb('Signup successful', 'auth', {
            userId: newUser.id,
          })

          resolve({ session })
        } catch (error) {
          monitoring.logError(error as Error, {
            feature: 'auth_service',
            action: 'signup',
          })
          resolve({
            error: {
              code: 'INTERNAL_ERROR',
              message: 'An unexpected error occurred. Please try again.',
            },
          })
        }
      }, 100) // Simulate network delay
    })
  }

  /**
   * Public API: Login with email/password
   */
  async login(
    credentials: LoginCredentials
  ): Promise<{ session?: AuthSession; error?: AuthError }> {
    return new Promise(resolve => {
      setTimeout(async () => {
        try {
          monitoring.addBreadcrumb('Login attempt', 'auth', {
            email: credentials.email,
          })

          // Rate limiting
          if (!this.checkRateLimit(`login_${credentials.email}`)) {
            resolve({
              error: {
                code: 'RATE_LIMIT_EXCEEDED',
                message: 'Too many login attempts. Please try again later.',
              },
            })
            return
          }

          // Validate inputs
          const emailError = this.validateEmail(credentials.email)
          if (emailError) {
            resolve({ error: emailError })
            return
          }

          if (!credentials.password) {
            resolve({
              error: {
                code: 'INVALID_PASSWORD',
                message: 'Password is required',
                field: 'password',
              },
            })
            return
          }

          // Find user
          const user = this.findUserByEmail(credentials.email)
          if (!user) {
            resolve({
              error: {
                code: 'INVALID_CREDENTIALS',
                message: 'Invalid email or password',
              },
            })
            return
          }

          // Verify password
          const passwordKey = `${this.storagePrefix}password_${user.id}`
          const passwordHash = this.getFromStorage<string>(passwordKey)

          if (!passwordHash) {
            resolve({
              error: {
                code: 'INTERNAL_ERROR',
                message: 'An unexpected error occurred. Please try again.',
              },
            })
            return
          }

          const isValidPassword = await this.verifyPassword(
            credentials.password,
            passwordHash
          )

          if (!isValidPassword) {
            resolve({
              error: {
                code: 'INVALID_CREDENTIALS',
                message: 'Invalid email or password',
              },
            })
            return
          }

          // Update last login
          const updatedUser: AuthUser = {
            ...user,
            lastLoginAt: new Date().toISOString(),
          }

          const users = this.getUsers()
          const userIndex = users.findIndex(u => u.id === user.id)
          if (userIndex >= 0) {
            users[userIndex] = updatedUser
            this.saveUsers(users)
          }

          // Create session
          const token = this.createAuthToken()
          const session: AuthSession = {
            user: updatedUser,
            token,
            isAuthenticated: true,
          }

          // Save session
          this.saveToStorage(this.sessionKey, session)

          monitoring.addBreadcrumb('Login successful', 'auth', {
            userId: updatedUser.id,
          })

          resolve({ session })
        } catch (error) {
          monitoring.logError(error as Error, {
            feature: 'auth_service',
            action: 'login',
          })
          resolve({
            error: {
              code: 'INTERNAL_ERROR',
              message: 'An unexpected error occurred. Please try again.',
            },
          })
        }
      }, 100) // Simulate network delay
    })
  }

  /**
   * Public API: OAuth sign-in (Google/Apple)
   */
  async oauthSignIn(
    provider: 'google' | 'apple',
    config: OAuthConfig
  ): Promise<{ url: string; state: string }> {
    return new Promise(resolve => {
      setTimeout(() => {
        try {
          monitoring.addBreadcrumb('OAuth sign-in initiated', 'auth', {
            provider,
          })

          // Generate CSRF state token
          const state = crypto.randomUUID()

          // Build OAuth URL (would be actual provider URLs in production)
          const params = new URLSearchParams({
            client_id: config.clientId,
            redirect_uri: config.redirectUri,
            response_type: 'code',
            scope: config.scopes.join(' '),
            state,
          })

          const baseUrl =
            provider === 'google'
              ? 'https://accounts.google.com/o/oauth2/v2/auth'
              : 'https://appleid.apple.com/auth/authorize'

          const url = `${baseUrl}?${params.toString()}`

          // Store state for verification
          this.saveToStorage(`${this.storagePrefix}oauth_state`, {
            state,
            provider,
            timestamp: Date.now(),
          })

          resolve({ url, state })
        } catch (error) {
          monitoring.logError(error as Error, {
            feature: 'auth_service',
            action: 'oauth_signin',
          })
          throw error
        }
      }, 50)
    })
  }

  /**
   * Public API: Handle OAuth callback
   */
  async oauthCallback(
    response: OAuthResponse
  ): Promise<{ session?: AuthSession; error?: AuthError }> {
    return new Promise(resolve => {
      setTimeout(async () => {
        try {
          monitoring.addBreadcrumb('OAuth callback received', 'auth')

          // Verify state (CSRF protection)
          const storedState = this.getFromStorage<{
            state: string
            provider: AuthProvider
            timestamp: number
          }>(`${this.storagePrefix}oauth_state`)

          if (!storedState || storedState.state !== response.state) {
            resolve({
              error: {
                code: 'INVALID_STATE',
                message: 'Invalid OAuth state. Please try again.',
              },
            })
            return
          }

          // Check state expiry (5 minutes)
          if (Date.now() - storedState.timestamp > 5 * 60 * 1000) {
            resolve({
              error: {
                code: 'STATE_EXPIRED',
                message: 'OAuth state expired. Please try again.',
              },
            })
            return
          }

          // In production, exchange code for tokens with provider
          // For MVP simulation, create a mock user
          const now = new Date().toISOString()
          const mockUser: AuthUser = {
            id: crypto.randomUUID(),
            email: `user_${Date.now()}@${storedState.provider}.com`,
            name: 'OAuth User',
            provider: storedState.provider,
            emailVerified: true,
            createdAt: now,
            updatedAt: now,
            lastLoginAt: now,
          }

          // Check if user exists (by provider ID in production)
          let user = this.findUserByEmail(mockUser.email)

          if (!user) {
            // Create new user
            const users = this.getUsers()
            users.push(mockUser)
            this.saveUsers(users)
            user = mockUser
          } else {
            // Update last login
            user.lastLoginAt = now
            const users = this.getUsers()
            const userIndex = users.findIndex(u => u.id === user!.id)
            if (userIndex >= 0) {
              users[userIndex] = user
              this.saveUsers(users)
            }
          }

          // Create session
          const token = this.createAuthToken()
          const session: AuthSession = {
            user,
            token,
            isAuthenticated: true,
          }

          // Save session
          this.saveToStorage(this.sessionKey, session)

          // Clean up state
          this.removeFromStorage(`${this.storagePrefix}oauth_state`)

          monitoring.addBreadcrumb('OAuth login successful', 'auth', {
            userId: user.id,
            provider: storedState.provider,
          })

          resolve({ session })
        } catch (error) {
          monitoring.logError(error as Error, {
            feature: 'auth_service',
            action: 'oauth_callback',
          })
          resolve({
            error: {
              code: 'INTERNAL_ERROR',
              message: 'An unexpected error occurred. Please try again.',
            },
          })
        }
      }, 100)
    })
  }

  /**
   * Public API: Request password reset
   */
  async requestPasswordReset(
    request: PasswordResetRequest
  ): Promise<{ success: boolean; error?: AuthError }> {
    return new Promise(resolve => {
      setTimeout(() => {
        try {
          monitoring.addBreadcrumb('Password reset requested', 'auth', {
            email: request.email,
          })

          // Rate limiting
          if (!this.checkRateLimit(`reset_${request.email}`)) {
            resolve({
              success: false,
              error: {
                code: 'RATE_LIMIT_EXCEEDED',
                message: 'Too many reset attempts. Please try again later.',
              },
            })
            return
          }

          // Validate email
          const emailError = this.validateEmail(request.email)
          if (emailError) {
            resolve({ success: false, error: emailError })
            return
          }

          // Check if user exists
          const user = this.findUserByEmail(request.email)

          // Always return success for security (don't reveal if email exists)
          // In production, would send email if user exists
          if (user && user.provider === 'email') {
            // Generate reset token
            const resetToken = crypto.randomUUID()
            const resetKey = `${this.storagePrefix}reset_${resetToken}`

            // Store reset token with 1-hour expiry
            this.saveToStorage(resetKey, {
              userId: user.id,
              email: user.email,
              expiresAt: Date.now() + 60 * 60 * 1000,
            })

            monitoring.addBreadcrumb('Password reset token generated', 'auth', {
              userId: user.id,
            })
          }

          resolve({ success: true })
        } catch (error) {
          monitoring.logError(error as Error, {
            feature: 'auth_service',
            action: 'request_password_reset',
          })
          resolve({
            success: false,
            error: {
              code: 'INTERNAL_ERROR',
              message: 'An unexpected error occurred. Please try again.',
            },
          })
        }
      }, 100)
    })
  }

  /**
   * Public API: Confirm password reset
   */
  async confirmPasswordReset(
    confirm: PasswordResetConfirm
  ): Promise<{ success: boolean; error?: AuthError }> {
    return new Promise(resolve => {
      setTimeout(async () => {
        try {
          monitoring.addBreadcrumb('Password reset confirmation', 'auth')

          // Validate new password
          const passwordError = this.validatePassword(confirm.newPassword)
          if (passwordError) {
            resolve({ success: false, error: passwordError })
            return
          }

          // Verify reset token
          const resetKey = `${this.storagePrefix}reset_${confirm.token}`
          const resetData = this.getFromStorage<{
            userId: string
            email: string
            expiresAt: number
          }>(resetKey)

          if (!resetData) {
            resolve({
              success: false,
              error: {
                code: 'INVALID_TOKEN',
                message: 'Invalid or expired reset token',
              },
            })
            return
          }

          // Check expiry
          if (Date.now() > resetData.expiresAt) {
            this.removeFromStorage(resetKey)
            resolve({
              success: false,
              error: {
                code: 'TOKEN_EXPIRED',
                message: 'Reset token has expired. Please request a new one.',
              },
            })
            return
          }

          // Find user
          const users = this.getUsers()
          const userIndex = users.findIndex(u => u.id === resetData.userId)

          if (userIndex < 0) {
            resolve({
              success: false,
              error: {
                code: 'USER_NOT_FOUND',
                message: 'User not found',
              },
            })
            return
          }

          // Update password
          const newPasswordHash = await this.hashPassword(confirm.newPassword)
          const passwordKey = `${this.storagePrefix}password_${resetData.userId}`
          this.saveToStorage(passwordKey, newPasswordHash)

          // Update user timestamp
          users[userIndex].updatedAt = new Date().toISOString()
          this.saveUsers(users)

          // Remove reset token
          this.removeFromStorage(resetKey)

          monitoring.addBreadcrumb('Password reset successful', 'auth', {
            userId: resetData.userId,
          })

          resolve({ success: true })
        } catch (error) {
          monitoring.logError(error as Error, {
            feature: 'auth_service',
            action: 'confirm_password_reset',
          })
          resolve({
            success: false,
            error: {
              code: 'INTERNAL_ERROR',
              message: 'An unexpected error occurred. Please try again.',
            },
          })
        }
      }, 100)
    })
  }

  /**
   * Public API: Refresh access token
   */
  async refreshToken(
    refreshToken: string
  ): Promise<{ token?: AuthToken; error?: AuthError }> {
    return new Promise(resolve => {
      setTimeout(() => {
        try {
          monitoring.addBreadcrumb('Token refresh requested', 'auth')

          // Get current session
          const session = this.getFromStorage<AuthSession>(this.sessionKey)

          if (!session || session.token.refreshToken !== refreshToken) {
            resolve({
              error: {
                code: 'INVALID_TOKEN',
                message: 'Invalid refresh token',
              },
            })
            return
          }

          // Check if refresh token is expired (7 days)
          const tokenIssuedAt = parseInt(
            session.token.refreshToken.split('.')[1],
            36
          )
          if (Date.now() - tokenIssuedAt > this.REFRESH_TOKEN_EXPIRY) {
            resolve({
              error: {
                code: 'TOKEN_EXPIRED',
                message: 'Refresh token expired. Please login again.',
              },
            })
            return
          }

          // Generate new tokens
          const newToken = this.createAuthToken()
          session.token = newToken

          // Update session
          this.saveToStorage(this.sessionKey, session)

          monitoring.addBreadcrumb('Token refreshed successfully', 'auth')

          resolve({ token: newToken })
        } catch (error) {
          monitoring.logError(error as Error, {
            feature: 'auth_service',
            action: 'refresh_token',
          })
          resolve({
            error: {
              code: 'INTERNAL_ERROR',
              message: 'An unexpected error occurred. Please try again.',
            },
          })
        }
      }, 50)
    })
  }

  /**
   * Public API: Get current session
   */
  async getSession(): Promise<AuthSession | null> {
    return new Promise(resolve => {
      setTimeout(() => {
        try {
          const session = this.getFromStorage<AuthSession>(this.sessionKey)

          if (!session || !session.isAuthenticated) {
            resolve(null)
            return
          }

          // Check if access token is expired
          const expiresAt = new Date(session.token.expiresAt).getTime()
          if (Date.now() > expiresAt) {
            monitoring.addBreadcrumb('Session expired', 'auth')
            resolve(null)
            return
          }

          resolve(session)
        } catch (error) {
          monitoring.logError(error as Error, {
            feature: 'auth_service',
            action: 'get_session',
          })
          resolve(null)
        }
      }, 0)
    })
  }

  /**
   * Public API: Logout
   */
  async logout(): Promise<{ success: boolean }> {
    return new Promise(resolve => {
      setTimeout(() => {
        try {
          const session = this.getFromStorage<AuthSession>(this.sessionKey)

          if (session) {
            monitoring.addBreadcrumb('User logged out', 'auth', {
              userId: session.user.id,
            })
          }

          // Remove session
          this.removeFromStorage(this.sessionKey)

          // In production, would also invalidate token server-side

          resolve({ success: true })
        } catch (error) {
          monitoring.logError(error as Error, {
            feature: 'auth_service',
            action: 'logout',
          })
          resolve({ success: false })
        }
      }, 50)
    })
  }

  /**
   * Public API: Validate token
   */
  async validateToken(token: string): Promise<boolean> {
    return new Promise(resolve => {
      setTimeout(() => {
        try {
          const session = this.getFromStorage<AuthSession>(this.sessionKey)

          if (!session || session.token.accessToken !== token) {
            resolve(false)
            return
          }

          // Check expiry
          const expiresAt = new Date(session.token.expiresAt).getTime()
          resolve(Date.now() <= expiresAt)
        } catch (error) {
          monitoring.logError(error as Error, {
            feature: 'auth_service',
            action: 'validate_token',
          })
          resolve(false)
        }
      }, 0)
    })
  }

  /**
   * Admin/Testing: Clear all auth data
   */
  async clearAllAuthData(): Promise<void> {
    return new Promise(resolve => {
      setTimeout(() => {
        try {
          // Clear session
          this.removeFromStorage(this.sessionKey)

          // Clear users
          this.removeFromStorage(this.usersKey)

          // Clear all password hashes
          const users = this.getUsers()
          users.forEach(user => {
            const passwordKey = `${this.storagePrefix}password_${user.id}`
            this.removeFromStorage(passwordKey)
          })

          // Clear rate limits
          Object.keys(localStorage).forEach(key => {
            if (key.startsWith(this.rateLimitKey)) {
              localStorage.removeItem(key)
            }
          })

          monitoring.addBreadcrumb('All auth data cleared', 'auth')
          resolve()
        } catch (error) {
          monitoring.logError(error as Error, {
            feature: 'auth_service',
            action: 'clear_all_auth_data',
          })
          resolve()
        }
      }, 0)
    })
  }
}

// Export singleton instance
export const authService = new AuthService()

// Export for backward compatibility and testing
export default authService
