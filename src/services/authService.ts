// Import necessary types and utilities.
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
 * @class AuthService
 * @description Provides an abstraction layer for all authentication-related functionality.
 *
 * @summary
 * This service is designed to simulate a full-featured authentication system using `localStorage`.
 * It's intended for MVP development and will be replaced with actual API calls in the future.
 * The abstraction ensures that component code will not need to change when migrating to a real backend.
 *
 * @property {string} storagePrefix - Prefix for all `localStorage` keys to avoid collisions.
 * @property {string} sessionKey - Key for storing the current user session.
 * @property {string} usersKey - Key for storing the list of registered users.
 * @property {string} rateLimitKey - Prefix for rate limiting keys.
 */
// Rate limiting configuration
interface RateLimitEntry {
  count: number
  resetAt: number
}

class AuthService {
  private storagePrefix = 'paperlyte_auth_'
  private sessionKey = `${this.storagePrefix}session`
  private usersKey = `${this.storagePrefix}users`
  private rateLimitKey = `${this.storagePrefix}rate_limit_`

  // Constants for rate limiting and token expiry.
  private readonly MAX_ATTEMPTS = 5
  private readonly RATE_LIMIT_WINDOW = 15 * 60 * 1000 // 15 minutes in ms
  private readonly ACCESS_TOKEN_EXPIRY = 24 * 60 * 60 * 1000 // 24 hours
  private readonly REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60 * 1000 // 7 days

  /**
   * @private
   * @method getFromStorage
   * @description Safely retrieves and parses data from `localStorage`.
   * @param {string} key - The key to retrieve.
   * @returns {T | null} The parsed data or null if not found or an error occurs.
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
   * @private
   * @method saveToStorage
   * @description Safely saves data to `localStorage`.
   * @param {string} key - The key to save to.
   * @param {T} data - The data to be stored.
   * @returns {boolean} - True if successful, false otherwise.
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
   * @private
   * @method removeFromStorage
   * @description Safely removes an item from `localStorage`.
   * @param {string} key - The key to remove.
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
   * @private
   * @method checkRateLimit
   * @description Implements a simple rate limiting mechanism.
   * @param {string} identifier - A unique identifier for the action being rate-limited (e.g., 'login_email@example.com').
   * @returns {boolean} - True if the action is allowed, false if it's rate-limited.
   */
  private checkRateLimit(identifier: string): boolean {
    const key = `${this.rateLimitKey}${identifier}`
    const now = Date.now()
    const rateLimit = this.getFromStorage<RateLimitEntry>(key)

    if (!rateLimit || now > rateLimit.resetAt) {
      // If it's the first attempt or the window has expired, reset the limit.
      this.saveToStorage(key, {
        count: 1,
        resetAt: now + this.RATE_LIMIT_WINDOW,
      })
      return true
    }

    if (rateLimit.count >= this.MAX_ATTEMPTS) {
      // If the attempt count is exceeded, block the request.
      return false
    }

    // Increment the attempt count.
    this.saveToStorage(key, {
      count: rateLimit.count + 1,
      resetAt: rateLimit.resetAt,
    })
    return true
  }

  /**
   * @private
   * @method hashPassword
   * @description Simulates password hashing. In a real application, this would be done on the server with a library like bcrypt.
   * @param {string} password - The password to hash.
   * @returns {Promise<string>} The hashed password.
   */
  private async hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(password + 'paperlyte_salt') // Simple salting for simulation.
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  /**
   * @private
   * @method verifyPassword
   * @description Verifies a password against a simulated hash.
   * @param {string} password - The plain-text password.
   * @param {string} hash - The hash to compare against.
   * @returns {Promise<boolean>} - True if the password is valid.
   */
  private async verifyPassword(
    password: string,
    hash: string
  ): Promise<boolean> {
    const inputHash = await this.hashPassword(password)
    return inputHash === hash
  }

  /**
   * @private
   * @method generateToken
   * @description Generates a unique, random token.
   * @returns {string} A new token.
   */
  private generateToken(): string {
    return crypto.randomUUID() + '.' + Date.now().toString(36)
  }

  /**
   * @private
   * @method createAuthToken
   * @description Creates a new set of authentication tokens.
   * @returns {AuthToken} An object containing the access and refresh tokens.
   */
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
   * @private
   * @method validateEmail
   * @description Validates an email address format.
   * @param {string} email - The email to validate.
   * @returns {AuthError | null} An error object if validation fails, otherwise null.
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

  /**
   * @private
   * @method validatePassword
   * @description Validates password strength and length.
   * @param {string} password - The password to validate.
   * @returns {AuthError | null} An error object if validation fails, otherwise null.
   */
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

  /**
   * @private
   * @method validateName
   * @description Validates the user's name.
   * @param {string} name - The name to validate.
   * @returns {AuthError | null} An error object if validation fails, otherwise null.
   */
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

  // --- User Management Helper Methods ---

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
   * @method signup
   * @description Registers a new user with email and password.
   * @param {SignupCredentials} credentials - The user's name, email, and password.
   * @returns {Promise<{ session?: AuthSession; error?: AuthError }>} The new session or an error.
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

          // Apply rate limiting to prevent brute-force attacks.
          if (!this.checkRateLimit(`signup_${credentials.email}`)) {
            resolve({
              error: {
                code: 'RATE_LIMIT_EXCEEDED',
                message: 'Too many signup attempts. Please try again later.',
              },
            })
            return
          }

          // Validate all input fields.
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

          // Check if a user with the same email already exists.
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

          // Hash the password before storing.
          const passwordHash = await this.hashPassword(credentials.password)

          // Create a new user object.
          const now = new Date().toISOString()
          const newUser: AuthUser = {
            id: crypto.randomUUID(),
            email: credentials.email.toLowerCase(),
            name: credentials.name.trim(),
            provider: 'email',
            emailVerified: false, // In a real app, an email verification would be sent.
            createdAt: now,
            updatedAt: now,
            lastLoginAt: now,
          }

          // Save the new user and their password hash.
          const users = this.getUsers()
          users.push(newUser)
          this.saveUsers(users)
          const passwordKey = `${this.storagePrefix}password_${newUser.id}`
          this.saveToStorage(passwordKey, passwordHash)

          // Create and save a new session.
          const token = this.createAuthToken()
          const session: AuthSession = {
            user: newUser,
            token,
            isAuthenticated: true,
          }
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
      }, 100) // Simulate network delay.
    })
  }

  /**
   * @method login
   * @description Logs a user in with their email and password.
   * @param {LoginCredentials} credentials - The user's email and password.
   * @returns {Promise<{ session?: AuthSession; error?: AuthError }>} The new session or an error.
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

          // Apply rate limiting.
          if (!this.checkRateLimit(`login_${credentials.email}`)) {
            resolve({
              error: {
                code: 'RATE_LIMIT_EXCEEDED',
                message: 'Too many login attempts. Please try again later.',
              },
            })
            return
          }

          // Validate inputs.
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

          // Find the user by email.
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

          // Verify the password.
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

          // Update the user's last login timestamp.
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

          // Create and save a new session.
          const token = this.createAuthToken()
          const session: AuthSession = {
            user: updatedUser,
            token,
            isAuthenticated: true,
          }
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
      }, 100) // Simulate network delay.
    })
  }

  /**
   * @method oauthSignIn
   * @description Initiates an OAuth sign-in process.
   * @param {'google' | 'apple'} provider - The OAuth provider.
   * @param {OAuthConfig} config - The OAuth configuration.
   * @returns {Promise<{ url: string; state: string }>} The authorization URL and state parameter.
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

          // Generate a state token for CSRF protection.
          const state = crypto.randomUUID()

          // Construct the OAuth URL.
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

          // Store the state for verification upon callback.
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
   * @method oauthCallback
   * @description Handles the callback from an OAuth provider.
   * @param {OAuthResponse} response - The response from the provider.
   * @returns {Promise<{ session?: AuthSession; error?: AuthError }>} The new session or an error.
   */
  async oauthCallback(
    response: OAuthResponse
  ): Promise<{ session?: AuthSession; error?: AuthError }> {
    return new Promise(resolve => {
      setTimeout(async () => {
        try {
          monitoring.addBreadcrumb('OAuth callback received', 'auth')

          // Verify the state to prevent CSRF attacks.
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

          // Check if the state has expired.
          if (Date.now() - storedState.timestamp > 5 * 60 * 1000) {
            resolve({
              error: {
                code: 'STATE_EXPIRED',
                message: 'OAuth state expired. Please try again.',
              },
            })
            return
          }

          // In a real app, the authorization code would be exchanged for tokens.
          // Here, we simulate this by creating a mock user.
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

          // If the user doesn't exist, create them. Otherwise, update their last login time.
          let user = this.findUserByEmail(mockUser.email)
          if (!user) {
            const users = this.getUsers()
            users.push(mockUser)
            this.saveUsers(users)
            user = mockUser
          } else {
            user.lastLoginAt = now
            const users = this.getUsers()
            const userIndex = users.findIndex(u => u.id === user!.id)
            if (userIndex >= 0) {
              users[userIndex] = user
              this.saveUsers(users)
            }
          }

          // Create and save a new session.
          const token = this.createAuthToken()
          const session: AuthSession = {
            user,
            token,
            isAuthenticated: true,
          }
          this.saveToStorage(this.sessionKey, session)
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
   * @method requestPasswordReset
   * @description Initiates a password reset request for a user.
   * @param {PasswordResetRequest} request - The user's email.
   * @returns {Promise<{ success: boolean; error?: AuthError }>} Success status or an error.
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

          // Apply rate limiting.
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

          // Validate the email format.
          const emailError = this.validateEmail(request.email)
          if (emailError) {
            resolve({ success: false, error: emailError })
            return
          }

          // To prevent email enumeration, always return success.
          // In a real application, an email would be sent only if the user exists.
          const user = this.findUserByEmail(request.email)
          if (user && user.provider === 'email') {
            const resetToken = crypto.randomUUID()
            const resetKey = `${this.storagePrefix}reset_${resetToken}`
            this.saveToStorage(resetKey, {
              userId: user.id,
              email: user.email,
              expiresAt: Date.now() + 60 * 60 * 1000, // 1-hour expiry.
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
   * @method confirmPasswordReset
   * @description Confirms a password reset using a token.
   * @param {PasswordResetConfirm} confirm - The reset token and new password.
   * @returns {Promise<{ success: boolean; error?: AuthError }>} Success status or an error.
   */
  async confirmPasswordReset(
    confirm: PasswordResetConfirm
  ): Promise<{ success: boolean; error?: AuthError }> {
    return new Promise(resolve => {
      setTimeout(async () => {
        try {
          monitoring.addBreadcrumb('Password reset confirmation', 'auth')

          // Validate the new password.
          const passwordError = this.validatePassword(confirm.newPassword)
          if (passwordError) {
            resolve({ success: false, error: passwordError })
            return
          }

          // Verify the reset token.
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

          // Find the user and update their password.
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
          const newPasswordHash = await this.hashPassword(confirm.newPassword)
          const passwordKey = `${this.storagePrefix}password_${resetData.userId}`
          this.saveToStorage(passwordKey, newPasswordHash)

          // Update the user's timestamp and clean up the reset token.
          users[userIndex].updatedAt = new Date().toISOString()
          this.saveUsers(users)
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
   * @method refreshToken
   * @description Refreshes an access token using a refresh token.
   * @param {string} refreshToken - The refresh token.
   * @returns {Promise<{ token?: AuthToken; error?: AuthError }>} The new tokens or an error.
   */
  async refreshToken(
    refreshToken: string
  ): Promise<{ token?: AuthToken; error?: AuthError }> {
    return new Promise(resolve => {
      setTimeout(() => {
        try {
          monitoring.addBreadcrumb('Token refresh requested', 'auth')

          // Verify the provided refresh token.
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

          // Check if the refresh token has expired.
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

          // Issue new tokens and update the session.
          const newToken = this.createAuthToken()
          session.token = newToken
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
   * @method getSession
   * @description Retrieves the current authenticated session.
   * @returns {Promise<AuthSession | null>} The current session or null if not authenticated.
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

          // Check if the access token is expired.
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
   * @method logout
   * @description Logs out the current user and clears their session.
   * @returns {Promise<{ success: boolean }>} Success status.
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
          this.removeFromStorage(this.sessionKey)
          // In a real app, the token would also be invalidated on the server.
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
   * @method validateToken
   * @description Validates an access token.
   * @param {string} token - The access token to validate.
   * @returns {Promise<boolean>} True if the token is valid and not expired.
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
   * @method clearAllAuthData
   * @description A utility function for testing and development to clear all authentication data.
   * @returns {Promise<void>}
   */
  async clearAllAuthData(): Promise<void> {
    return new Promise(resolve => {
      setTimeout(() => {
        try {
          this.removeFromStorage(this.sessionKey)
          this.removeFromStorage(this.usersKey)
          const users = this.getUsers()
          users.forEach(user => {
            const passwordKey = `${this.storagePrefix}password_${user.id}`
            this.removeFromStorage(passwordKey)
          })
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

// Export a singleton instance of the service.
export const authService = new AuthService()

// Export the default for backward compatibility and for use in testing.
export default authService
