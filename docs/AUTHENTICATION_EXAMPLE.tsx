/**
 * Authentication System - React Component Examples
 *
 * This file demonstrates how to use the authentication service
 * in React components. These are examples only and not part of
 * the actual application code.
 */

import React, { useState, useEffect, createContext, useContext } from 'react'
import { authService } from '../src/services/authService'
import type {
  AuthSession,
  SignupCredentials,
  LoginCredentials,
  OAuthConfig,
} from '../src/types'

// ============================================
// 1. Authentication Context Provider
// ============================================

interface AuthContextType {
  session: AuthSession | null
  loading: boolean
  error: string | null
  login: (credentials: LoginCredentials) => Promise<void>
  signup: (credentials: SignupCredentials) => Promise<void>
  logout: () => Promise<void>
  loginWithGoogle: () => Promise<void>
  loginWithApple: () => Promise<void>
  clearError: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Load session on mount
    loadSession()
  }, [])

  const loadSession = async () => {
    try {
      const currentSession = await authService.getSession()
      setSession(currentSession)
    } catch (err) {
      console.error('Failed to load session:', err)
    } finally {
      setLoading(false)
    }
  }

  const login = async (credentials: LoginCredentials) => {
    setError(null)
    setLoading(true)

    try {
      const result = await authService.login(credentials)

      if (result.error) {
        setError(result.error.message)
        return
      }

      setSession(result.session!)
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const signup = async (credentials: SignupCredentials) => {
    setError(null)
    setLoading(true)

    try {
      const result = await authService.signup(credentials)

      if (result.error) {
        setError(result.error.message)
        return
      }

      setSession(result.session!)
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    setError(null)
    setLoading(true)

    try {
      await authService.logout()
      setSession(null)
    } catch (err) {
      setError('Failed to logout')
    } finally {
      setLoading(false)
    }
  }

  const loginWithGoogle = async () => {
    setError(null)

    try {
      const config: OAuthConfig = {
        clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        redirectUri: `${window.location.origin}/auth/callback`,
        scopes: ['openid', 'email', 'profile'],
        provider: 'google',
      }

      const { url } = await authService.oauthSignIn('google', config)
      window.location.href = url
    } catch (err) {
      setError('Failed to initiate Google login')
    }
  }

  const loginWithApple = async () => {
    setError(null)

    try {
      const config: OAuthConfig = {
        clientId: import.meta.env.VITE_APPLE_CLIENT_ID,
        redirectUri: `${window.location.origin}/auth/callback`,
        scopes: ['name', 'email'],
        provider: 'apple',
      }

      const { url } = await authService.oauthSignIn('apple', config)
      window.location.href = url
    } catch (err) {
      setError('Failed to initiate Apple login')
    }
  }

  const clearError = () => setError(null)

  return (
    <AuthContext.Provider
      value={{
        session,
        loading,
        error,
        login,
        signup,
        logout,
        loginWithGoogle,
        loginWithApple,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

// ============================================
// 2. Login Form Component
// ============================================

export function LoginForm() {
  const { login, loginWithGoogle, loginWithApple, error, loading, clearError } =
    useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    await login({ email, password })
  }

  return (
    <div className='max-w-md mx-auto p-6'>
      <h2 className='text-2xl font-bold mb-6'>Login</h2>

      {error && (
        <div className='bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4'>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className='space-y-4'>
        <div>
          <label htmlFor='email' className='block text-sm font-medium mb-2'>
            Email Address
          </label>
          <input
            type='email'
            id='email'
            value={email}
            onChange={e => setEmail(e.target.value)}
            className='w-full px-3 py-2 border rounded-lg'
            required
          />
        </div>

        <div>
          <label htmlFor='password' className='block text-sm font-medium mb-2'>
            Password
          </label>
          <input
            type='password'
            id='password'
            value={password}
            onChange={e => setPassword(e.target.value)}
            className='w-full px-3 py-2 border rounded-lg'
            required
          />
        </div>

        <button
          type='submit'
          disabled={loading}
          className='w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50'
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>

      <div className='mt-6'>
        <div className='relative'>
          <div className='absolute inset-0 flex items-center'>
            <div className='w-full border-t border-gray-300'></div>
          </div>
          <div className='relative flex justify-center text-sm'>
            <span className='px-2 bg-white text-gray-500'>
              Or continue with
            </span>
          </div>
        </div>

        <div className='mt-6 grid grid-cols-2 gap-3'>
          <button
            onClick={loginWithGoogle}
            disabled={loading}
            className='w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50'
          >
            Google
          </button>

          <button
            onClick={loginWithApple}
            disabled={loading}
            className='w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50'
          >
            Apple
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================
// 3. Signup Form Component
// ============================================

export function SignupForm() {
  const { signup, error, loading, clearError } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [passwordErrors, setPasswordErrors] = useState<string[]>([])

  const validatePassword = (pwd: string) => {
    const errors: string[] = []
    if (pwd.length < 8) {
      errors.push('At least 8 characters')
    }
    if (!/[A-Z]/.test(pwd)) {
      errors.push('One uppercase letter')
    }
    if (!/[a-z]/.test(pwd)) {
      errors.push('One lowercase letter')
    }
    if (!/[0-9]/.test(pwd)) {
      errors.push('One number')
    }
    return errors
  }

  const handlePasswordChange = (pwd: string) => {
    setPassword(pwd)
    setPasswordErrors(validatePassword(pwd))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()

    if (passwordErrors.length > 0) {
      return
    }

    await signup({ email, password, name })
  }

  return (
    <div className='max-w-md mx-auto p-6'>
      <h2 className='text-2xl font-bold mb-6'>Create Account</h2>

      {error && (
        <div className='bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4'>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className='space-y-4'>
        <div>
          <label htmlFor='name' className='block text-sm font-medium mb-2'>
            Full Name
          </label>
          <input
            type='text'
            id='name'
            value={name}
            onChange={e => setName(e.target.value)}
            className='w-full px-3 py-2 border rounded-lg'
            required
          />
        </div>

        <div>
          <label htmlFor='email' className='block text-sm font-medium mb-2'>
            Email Address
          </label>
          <input
            type='email'
            id='email'
            value={email}
            onChange={e => setEmail(e.target.value)}
            className='w-full px-3 py-2 border rounded-lg'
            required
          />
        </div>

        <div>
          <label htmlFor='password' className='block text-sm font-medium mb-2'>
            Password
          </label>
          <input
            type='password'
            id='password'
            value={password}
            onChange={e => handlePasswordChange(e.target.value)}
            className='w-full px-3 py-2 border rounded-lg'
            required
          />
          {password && passwordErrors.length > 0 && (
            <div className='mt-2 text-sm text-red-600'>
              <p>Password must contain:</p>
              <ul className='list-disc ml-5'>
                {passwordErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <button
          type='submit'
          disabled={loading || passwordErrors.length > 0}
          className='w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50'
        >
          {loading ? 'Creating account...' : 'Sign Up'}
        </button>
      </form>
    </div>
  )
}

// ============================================
// 4. Password Reset Component
// ============================================

export function PasswordReset() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const result = await authService.requestPasswordReset({ email })

      if (result.error) {
        setError(result.error.message)
      } else {
        setSuccess(true)
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className='max-w-md mx-auto p-6'>
        <div className='bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded'>
          <p>
            If an account exists with that email, you will receive password
            reset instructions shortly.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className='max-w-md mx-auto p-6'>
      <h2 className='text-2xl font-bold mb-6'>Reset Password</h2>

      {error && (
        <div className='bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4'>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className='space-y-4'>
        <div>
          <label htmlFor='email' className='block text-sm font-medium mb-2'>
            Email Address
          </label>
          <input
            type='email'
            id='email'
            value={email}
            onChange={e => setEmail(e.target.value)}
            className='w-full px-3 py-2 border rounded-lg'
            required
          />
        </div>

        <button
          type='submit'
          disabled={loading}
          className='w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50'
        >
          {loading ? 'Sending...' : 'Send Reset Link'}
        </button>
      </form>
    </div>
  )
}

// ============================================
// 5. Protected Route Component
// ============================================

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='text-lg'>Loading...</div>
      </div>
    )
  }

  if (!session) {
    // Redirect to login
    window.location.href = '/login'
    return null
  }

  return <>{children}</>
}

// ============================================
// 6. User Profile Component
// ============================================

export function UserProfile() {
  const { session, logout, loading } = useAuth()

  if (!session) {
    return null
  }

  const { user } = session

  return (
    <div className='max-w-md mx-auto p-6'>
      <h2 className='text-2xl font-bold mb-6'>Profile</h2>

      <div className='bg-white shadow rounded-lg p-6 space-y-4'>
        <div>
          <label className='text-sm text-gray-600'>Name</label>
          <p className='text-lg font-medium'>{user.name}</p>
        </div>

        <div>
          <label className='text-sm text-gray-600'>Email</label>
          <p className='text-lg'>{user.email}</p>
        </div>

        <div>
          <label className='text-sm text-gray-600'>Provider</label>
          <p className='text-lg capitalize'>{user.provider}</p>
        </div>

        <div>
          <label className='text-sm text-gray-600'>Email Verified</label>
          <p className='text-lg'>
            {user.emailVerified ? (
              <span className='text-green-600'>✓ Verified</span>
            ) : (
              <span className='text-yellow-600'>⚠ Not verified</span>
            )}
          </p>
        </div>

        <div>
          <label className='text-sm text-gray-600'>Member Since</label>
          <p className='text-lg'>
            {new Date(user.createdAt).toLocaleDateString()}
          </p>
        </div>

        <button
          onClick={logout}
          disabled={loading}
          className='w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 disabled:opacity-50'
        >
          {loading ? 'Logging out...' : 'Logout'}
        </button>
      </div>
    </div>
  )
}

// ============================================
// 7. OAuth Callback Handler
// ============================================

export function OAuthCallback() {
  const { error, loading } = useAuth()
  const [callbackError, setCallbackError] = useState<string | null>(null)

  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')
      const state = params.get('state')

      if (!code || !state) {
        setCallbackError('Invalid callback parameters')
        return
      }

      const result = await authService.oauthCallback({ code, state })

      if (result.error) {
        setCallbackError(result.error.message)
      } else {
        // Successful login, redirect to app
        window.location.href = '/app'
      }
    }

    handleCallback()
  }, [])

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='text-lg'>Completing login...</div>
      </div>
    )
  }

  if (error || callbackError) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='max-w-md p-6'>
          <div className='bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded'>
            <p className='font-bold'>Authentication Failed</p>
            <p>{error || callbackError}</p>
            <a
              href='/login'
              className='text-blue-600 hover:underline mt-2 block'
            >
              Return to login
            </a>
          </div>
        </div>
      </div>
    )
  }

  return null
}
