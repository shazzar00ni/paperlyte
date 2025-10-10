import { describe, it, expect, beforeEach, vi } from 'vitest'
import { authService } from '../authService'
import type { SignupCredentials, LoginCredentials } from '../../types'

// Mock monitoring
vi.mock('../../utils/monitoring', () => ({
  monitoring: {
    logError: vi.fn(),
    addBreadcrumb: vi.fn(),
  },
}))

describe('AuthService', () => {
  beforeEach(async () => {
    // Clear localStorage before each test
    localStorage.clear()
    await authService.clearAllAuthData()
  })

  describe('Signup', () => {
    const validCredentials: SignupCredentials = {
      email: 'test@example.com',
      password: 'Test123456',
      name: 'Test User',
    }

    it('should successfully sign up a new user', async () => {
      const result = await authService.signup(validCredentials)

      expect(result.error).toBeUndefined()
      expect(result.session).toBeDefined()
      expect(result.session?.user.email).toBe(
        validCredentials.email.toLowerCase()
      )
      expect(result.session?.user.name).toBe(validCredentials.name)
      expect(result.session?.user.provider).toBe('email')
      expect(result.session?.isAuthenticated).toBe(true)
      expect(result.session?.token.accessToken).toBeDefined()
      expect(result.session?.token.refreshToken).toBeDefined()
    })

    it('should validate email format', async () => {
      const result = await authService.signup({
        ...validCredentials,
        email: 'invalid-email',
      })

      expect(result.error).toBeDefined()
      expect(result.error?.code).toBe('INVALID_EMAIL')
      expect(result.error?.field).toBe('email')
      expect(result.session).toBeUndefined()
    })

    it('should require email', async () => {
      const result = await authService.signup({
        ...validCredentials,
        email: '',
      })

      expect(result.error).toBeDefined()
      expect(result.error?.code).toBe('INVALID_EMAIL')
      expect(result.error?.field).toBe('email')
    })

    it('should validate password length', async () => {
      const result = await authService.signup({
        ...validCredentials,
        password: 'short',
      })

      expect(result.error).toBeDefined()
      expect(result.error?.code).toBe('INVALID_PASSWORD')
      expect(result.error?.field).toBe('password')
    })

    it('should validate password complexity', async () => {
      const result = await authService.signup({
        ...validCredentials,
        password: 'weakpassword',
      })

      expect(result.error).toBeDefined()
      expect(result.error?.code).toBe('WEAK_PASSWORD')
      expect(result.error?.field).toBe('password')
    })

    it('should validate name', async () => {
      const result = await authService.signup({
        ...validCredentials,
        name: '',
      })

      expect(result.error).toBeDefined()
      expect(result.error?.code).toBe('INVALID_NAME')
      expect(result.error?.field).toBe('name')
    })

    it('should validate name length', async () => {
      const result = await authService.signup({
        ...validCredentials,
        name: 'A',
      })

      expect(result.error).toBeDefined()
      expect(result.error?.code).toBe('INVALID_NAME')
      expect(result.error?.field).toBe('name')
    })

    it('should prevent duplicate email registration', async () => {
      await authService.signup(validCredentials)
      const result = await authService.signup(validCredentials)

      expect(result.error).toBeDefined()
      expect(result.error?.code).toBe('EMAIL_EXISTS')
      expect(result.error?.field).toBe('email')
      expect(result.session).toBeUndefined()
    })

    it('should handle email case-insensitively', async () => {
      await authService.signup(validCredentials)
      const result = await authService.signup({
        ...validCredentials,
        email: 'TEST@EXAMPLE.COM',
      })

      expect(result.error).toBeDefined()
      expect(result.error?.code).toBe('EMAIL_EXISTS')
    })

    it('should create a valid session', async () => {
      const result = await authService.signup(validCredentials)

      expect(result.session?.user.id).toBeDefined()
      expect(result.session?.user.createdAt).toBeDefined()
      expect(result.session?.user.updatedAt).toBeDefined()
      expect(result.session?.user.lastLoginAt).toBeDefined()
      expect(result.session?.user.emailVerified).toBe(false)
    })
  })

  describe('Login', () => {
    const credentials: SignupCredentials = {
      email: 'login@example.com',
      password: 'Login123456',
      name: 'Login User',
    }

    beforeEach(async () => {
      await authService.signup(credentials)
      await authService.logout()
    })

    it('should successfully log in with correct credentials', async () => {
      const loginCreds: LoginCredentials = {
        email: credentials.email,
        password: credentials.password,
      }

      const result = await authService.login(loginCreds)

      expect(result.error).toBeUndefined()
      expect(result.session).toBeDefined()
      expect(result.session?.user.email).toBe(credentials.email.toLowerCase())
      expect(result.session?.isAuthenticated).toBe(true)
    })

    it('should reject invalid email', async () => {
      const result = await authService.login({
        email: 'nonexistent@example.com',
        password: credentials.password,
      })

      expect(result.error).toBeDefined()
      expect(result.error?.code).toBe('INVALID_CREDENTIALS')
      expect(result.session).toBeUndefined()
    })

    it('should reject invalid password', async () => {
      const result = await authService.login({
        email: credentials.email,
        password: 'wrongpassword',
      })

      expect(result.error).toBeDefined()
      expect(result.error?.code).toBe('INVALID_CREDENTIALS')
      expect(result.session).toBeUndefined()
    })

    it('should validate email format on login', async () => {
      const result = await authService.login({
        email: 'invalid-email',
        password: credentials.password,
      })

      expect(result.error).toBeDefined()
      expect(result.error?.code).toBe('INVALID_EMAIL')
      expect(result.error?.field).toBe('email')
    })

    it('should require password', async () => {
      const result = await authService.login({
        email: credentials.email,
        password: '',
      })

      expect(result.error).toBeDefined()
      expect(result.error?.code).toBe('INVALID_PASSWORD')
      expect(result.error?.field).toBe('password')
    })

    it('should handle case-insensitive email login', async () => {
      const result = await authService.login({
        email: credentials.email.toUpperCase(),
        password: credentials.password,
      })

      expect(result.error).toBeUndefined()
      expect(result.session).toBeDefined()
    })

    it('should update last login timestamp', async () => {
      const firstLogin = await authService.login({
        email: credentials.email,
        password: credentials.password,
      })
      const firstTimestamp = firstLogin.session?.user.lastLoginAt

      // Wait a bit to ensure timestamp changes
      await new Promise(resolve => setTimeout(resolve, 10))

      await authService.logout()
      const secondLogin = await authService.login({
        email: credentials.email,
        password: credentials.password,
      })
      const secondTimestamp = secondLogin.session?.user.lastLoginAt

      expect(firstTimestamp).toBeDefined()
      expect(secondTimestamp).toBeDefined()
      expect(secondTimestamp).not.toBe(firstTimestamp)
    })
  })

  describe('Rate Limiting', () => {
    it('should enforce rate limiting on signup attempts', async () => {
      const credentials: SignupCredentials = {
        email: 'ratelimit@example.com',
        password: 'Test123456',
        name: 'Rate Limit Test',
      }

      // Make 5 attempts (should all pass rate limit)
      for (let i = 0; i < 5; i++) {
        await authService.signup(credentials)
      }

      // 6th attempt should be rate limited
      const result = await authService.signup(credentials)

      expect(result.error).toBeDefined()
      expect(result.error?.code).toBe('RATE_LIMIT_EXCEEDED')
    })

    it('should enforce rate limiting on login attempts', async () => {
      const credentials: SignupCredentials = {
        email: 'loginrate@example.com',
        password: 'Login123456',
        name: 'Login Rate Test',
      }

      await authService.signup(credentials)

      // Make 5 failed login attempts
      for (let i = 0; i < 5; i++) {
        await authService.login({
          email: credentials.email,
          password: 'wrongpassword',
        })
      }

      // 6th attempt should be rate limited
      const result = await authService.login({
        email: credentials.email,
        password: credentials.password,
      })

      expect(result.error).toBeDefined()
      expect(result.error?.code).toBe('RATE_LIMIT_EXCEEDED')
    })

    it('should enforce rate limiting on password reset', async () => {
      const email = 'resetrate@example.com'

      // Make 5 reset requests
      for (let i = 0; i < 5; i++) {
        await authService.requestPasswordReset({ email })
      }

      // 6th attempt should be rate limited
      const result = await authService.requestPasswordReset({ email })

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.error?.code).toBe('RATE_LIMIT_EXCEEDED')
    })
  })

  describe('Session Management', () => {
    const credentials: SignupCredentials = {
      email: 'session@example.com',
      password: 'Session123456',
      name: 'Session User',
    }

    it('should create and retrieve session', async () => {
      const signupResult = await authService.signup(credentials)
      const session = await authService.getSession()

      expect(session).toBeDefined()
      expect(session?.user.id).toBe(signupResult.session?.user.id)
      expect(session?.isAuthenticated).toBe(true)
    })

    it('should return null when no session exists', async () => {
      const session = await authService.getSession()

      expect(session).toBeNull()
    })

    it('should clear session on logout', async () => {
      await authService.signup(credentials)
      await authService.logout()
      const session = await authService.getSession()

      expect(session).toBeNull()
    })

    it('should generate valid tokens', async () => {
      const result = await authService.signup(credentials)

      expect(result.session?.token.accessToken).toBeDefined()
      expect(result.session?.token.refreshToken).toBeDefined()
      expect(result.session?.token.expiresAt).toBeDefined()
      expect(result.session?.token.tokenType).toBe('Bearer')
    })
  })

  describe('Token Management', () => {
    const credentials: SignupCredentials = {
      email: 'token@example.com',
      password: 'Token123456',
      name: 'Token User',
    }

    it('should validate valid tokens', async () => {
      const result = await authService.signup(credentials)
      const isValid = await authService.validateToken(
        result.session!.token.accessToken
      )

      expect(isValid).toBe(true)
    })

    it('should reject invalid tokens', async () => {
      const isValid = await authService.validateToken('invalid.token.here')

      expect(isValid).toBe(false)
    })

    it('should refresh tokens', async () => {
      const signupResult = await authService.signup(credentials)
      const oldToken = signupResult.session!.token

      const refreshResult = await authService.refreshToken(
        oldToken.refreshToken
      )

      expect(refreshResult.error).toBeUndefined()
      expect(refreshResult.token).toBeDefined()
      expect(refreshResult.token?.accessToken).not.toBe(oldToken.accessToken)
      expect(refreshResult.token?.refreshToken).not.toBe(oldToken.refreshToken)
    })

    it('should reject invalid refresh tokens', async () => {
      const result = await authService.refreshToken('invalid.refresh.token')

      expect(result.error).toBeDefined()
      expect(result.error?.code).toBe('INVALID_TOKEN')
      expect(result.token).toBeUndefined()
    })
  })

  describe('Password Reset', () => {
    const credentials: SignupCredentials = {
      email: 'reset@example.com',
      password: 'Reset123456',
      name: 'Reset User',
    }

    beforeEach(async () => {
      await authService.signup(credentials)
      await authService.logout()
    })

    it('should accept password reset request', async () => {
      const result = await authService.requestPasswordReset({
        email: credentials.email,
      })

      expect(result.success).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should validate email on reset request', async () => {
      const result = await authService.requestPasswordReset({
        email: 'invalid-email',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.error?.code).toBe('INVALID_EMAIL')
    })

    it('should always return success for security (even for non-existent emails)', async () => {
      const result = await authService.requestPasswordReset({
        email: 'nonexistent@example.com',
      })

      // Should return success to not reveal if email exists
      expect(result.success).toBe(true)
    })

    it('should validate new password on reset confirm', async () => {
      const result = await authService.confirmPasswordReset({
        token: 'some-token',
        newPassword: 'weak',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.error?.code).toBe('INVALID_PASSWORD')
    })

    it('should reject invalid reset token', async () => {
      const result = await authService.confirmPasswordReset({
        token: 'invalid-token',
        newPassword: 'NewPassword123',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.error?.code).toBe('INVALID_TOKEN')
    })
  })

  describe('OAuth', () => {
    const googleConfig = {
      clientId: 'google-client-id',
      redirectUri: 'http://localhost:3000/auth/callback',
      scopes: ['openid', 'email', 'profile'],
      provider: 'google' as const,
    }

    it('should initiate OAuth sign-in', async () => {
      const result = await authService.oauthSignIn('google', googleConfig)

      expect(result.url).toBeDefined()
      expect(result.url).toContain('accounts.google.com')
      expect(result.url).toContain(googleConfig.clientId)
      expect(result.url).toContain(encodeURIComponent(googleConfig.redirectUri))
      expect(result.state).toBeDefined()
    })

    it('should initiate Apple OAuth sign-in', async () => {
      const appleConfig = {
        ...googleConfig,
        provider: 'apple' as const,
      }

      const result = await authService.oauthSignIn('apple', appleConfig)

      expect(result.url).toBeDefined()
      expect(result.url).toContain('appleid.apple.com')
      expect(result.state).toBeDefined()
    })

    it('should handle OAuth callback', async () => {
      const { state } = await authService.oauthSignIn('google', googleConfig)

      const result = await authService.oauthCallback({
        code: 'oauth-code',
        state,
      })

      expect(result.error).toBeUndefined()
      expect(result.session).toBeDefined()
      expect(result.session?.user.provider).toBe('google')
      expect(result.session?.isAuthenticated).toBe(true)
    })

    it('should reject OAuth callback with invalid state (CSRF protection)', async () => {
      await authService.oauthSignIn('google', googleConfig)

      const result = await authService.oauthCallback({
        code: 'oauth-code',
        state: 'invalid-state',
      })

      expect(result.error).toBeDefined()
      expect(result.error?.code).toBe('INVALID_STATE')
      expect(result.session).toBeUndefined()
    })
  })

  describe('Data Cleanup', () => {
    it('should clear all authentication data', async () => {
      const credentials: SignupCredentials = {
        email: 'cleanup@example.com',
        password: 'Cleanup123456',
        name: 'Cleanup User',
      }

      await authService.signup(credentials)
      let session = await authService.getSession()
      expect(session).toBeDefined()

      await authService.clearAllAuthData()
      session = await authService.getSession()
      expect(session).toBeNull()
    })
  })

  describe('Security', () => {
    it('should hash passwords (not store in plain text)', async () => {
      const credentials: SignupCredentials = {
        email: 'security@example.com',
        password: 'Security123456',
        name: 'Security User',
      }

      await authService.signup(credentials)

      // Check that password is not stored in plain text anywhere
      const allStorage = Object.keys(localStorage).reduce(
        (acc, key) => {
          acc[key] = localStorage.getItem(key) || ''
          return acc
        },
        {} as Record<string, string>
      )

      const storageString = JSON.stringify(allStorage)
      expect(storageString).not.toContain(credentials.password)
    })

    it('should generate unique tokens', async () => {
      const credentials1: SignupCredentials = {
        email: 'user1@example.com',
        password: 'User123456',
        name: 'User One',
      }

      const credentials2: SignupCredentials = {
        email: 'user2@example.com',
        password: 'User123456',
        name: 'User Two',
      }

      const result1 = await authService.signup(credentials1)
      await authService.logout()
      const result2 = await authService.signup(credentials2)

      expect(result1.session?.token.accessToken).not.toBe(
        result2.session?.token.accessToken
      )
      expect(result1.session?.token.refreshToken).not.toBe(
        result2.session?.token.refreshToken
      )
    })

    it('should normalize email addresses to lowercase', async () => {
      const credentials: SignupCredentials = {
        email: 'UPPERCASE@EXAMPLE.COM',
        password: 'Upper123456',
        name: 'Upper User',
      }

      const result = await authService.signup(credentials)

      expect(result.session?.user.email).toBe('uppercase@example.com')
    })

    it('should trim whitespace from names', async () => {
      const credentials: SignupCredentials = {
        email: 'trim@example.com',
        password: 'Trim123456',
        name: '  Trimmed Name  ',
      }

      const result = await authService.signup(credentials)

      expect(result.session?.user.name).toBe('Trimmed Name')
    })
  })
})
