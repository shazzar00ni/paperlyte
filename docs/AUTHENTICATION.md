# Authentication System Documentation

## Overview

Paperlyte implements a comprehensive authentication system supporting multiple authentication methods:

- Email/password registration and login
- Google OAuth 2.0
- Apple Sign-In
- JWT token-based authentication with refresh tokens
- Password reset functionality
- Session management
- Rate limiting and CSRF protection

## Architecture

### Current Implementation (MVP)

The authentication system is implemented as a service abstraction layer (`authService.ts`) that simulates API calls using localStorage. This allows the frontend to be fully functional while maintaining an API-ready architecture for future backend integration.

**Key Files:**

- `src/services/authService.ts`: Authentication service implementation
- `src/types/index.ts`: Authentication types and interfaces
- `src/services/__tests__/authService.test.ts`: Comprehensive test suite

### Future Backend Integration

The service is designed to easily migrate to a real API backend. Simply replace the localStorage operations with fetch/axios calls while maintaining the same interface.

## Usage Examples

### Email/Password Authentication

#### Sign Up

```typescript
import { authService } from './services/authService'
import type { SignupCredentials } from './types'

const credentials: SignupCredentials = {
  email: 'user@example.com',
  password: 'SecurePassword123',
  name: 'Jane Doe',
}

const result = await authService.signup(credentials)

if (result.error) {
  console.error('Signup failed:', result.error.message)
  // Handle specific error codes
  switch (result.error.code) {
    case 'EMAIL_EXISTS':
      // Show "Email already registered" message
      break
    case 'WEAK_PASSWORD':
      // Show password requirements
      break
    // ... other cases
  }
} else {
  console.log('Signed up successfully:', result.session?.user)
  // Save session, redirect to app, etc.
}
```

#### Login

```typescript
import { authService } from './services/authService'
import type { LoginCredentials } from './types'

const credentials: LoginCredentials = {
  email: 'user@example.com',
  password: 'SecurePassword123',
}

const result = await authService.login(credentials)

if (result.error) {
  console.error('Login failed:', result.error.message)
} else {
  console.log('Logged in successfully:', result.session?.user)
}
```

### OAuth Authentication

#### Google OAuth

```typescript
import { authService } from './services/authService'
import type { OAuthConfig } from './types'

const googleConfig: OAuthConfig = {
  clientId: process.env.VITE_GOOGLE_CLIENT_ID!,
  redirectUri: `${window.location.origin}/auth/callback`,
  scopes: ['openid', 'email', 'profile'],
  provider: 'google',
}

// Initiate OAuth flow
const { url, state } = await authService.oauthSignIn('google', googleConfig)

// Redirect user to OAuth provider
window.location.href = url

// After OAuth provider redirects back to your callback URL:
// Extract code and state from URL parameters
const urlParams = new URLSearchParams(window.location.search)
const code = urlParams.get('code')
const state = urlParams.get('state')

if (code && state) {
  const result = await authService.oauthCallback({ code, state })

  if (result.error) {
    console.error('OAuth failed:', result.error.message)
  } else {
    console.log('OAuth successful:', result.session?.user)
  }
}
```

#### Apple Sign-In

Same as Google OAuth, but use `'apple'` as the provider:

```typescript
const appleConfig: OAuthConfig = {
  clientId: process.env.VITE_APPLE_CLIENT_ID!,
  redirectUri: `${window.location.origin}/auth/callback`,
  scopes: ['name', 'email'],
  provider: 'apple',
}

const { url, state } = await authService.oauthSignIn('apple', appleConfig)
```

### Session Management

#### Get Current Session

```typescript
const session = await authService.getSession()

if (session) {
  console.log('User is authenticated:', session.user)
  console.log('Access token:', session.token.accessToken)
} else {
  console.log('No active session')
  // Redirect to login
}
```

#### Logout

```typescript
const result = await authService.logout()

if (result.success) {
  console.log('Logged out successfully')
  // Redirect to home page
}
```

### Token Management

#### Refresh Access Token

```typescript
const session = await authService.getSession()

if (session) {
  const result = await authService.refreshToken(session.token.refreshToken)

  if (result.error) {
    console.error('Token refresh failed:', result.error.message)
    // Session expired, redirect to login
  } else {
    console.log('Token refreshed:', result.token)
    // Update stored session with new tokens
  }
}
```

#### Validate Token

```typescript
const isValid = await authService.validateToken(accessToken)

if (!isValid) {
  console.log('Token is invalid or expired')
  // Attempt to refresh or redirect to login
}
```

### Password Reset

#### Request Password Reset

```typescript
const result = await authService.requestPasswordReset({
  email: 'user@example.com',
})

if (result.success) {
  console.log('Reset email sent (if account exists)')
  // Show success message
} else {
  console.error('Reset request failed:', result.error?.message)
}
```

#### Confirm Password Reset

```typescript
// After user clicks reset link with token
const result = await authService.confirmPasswordReset({
  token: resetToken,
  newPassword: 'NewSecurePassword123',
})

if (result.success) {
  console.log('Password reset successful')
  // Redirect to login
} else {
  console.error('Password reset failed:', result.error?.message)
}
```

## React Integration Example

### Authentication Context

```typescript
import React, { createContext, useContext, useEffect, useState } from 'react'
import { authService } from '../services/authService'
import type { AuthSession } from '../types'

interface AuthContextType {
  session: AuthSession | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  signup: (email: string, password: string, name: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Load session on mount
    authService.getSession().then(session => {
      setSession(session)
      setLoading(false)
    })
  }, [])

  const login = async (email: string, password: string) => {
    const result = await authService.login({ email, password })
    if (result.error) {
      throw new Error(result.error.message)
    }
    setSession(result.session!)
  }

  const logout = async () => {
    await authService.logout()
    setSession(null)
  }

  const signup = async (email: string, password: string, name: string) => {
    const result = await authService.signup({ email, password, name })
    if (result.error) {
      throw new Error(result.error.message)
    }
    setSession(result.session!)
  }

  return (
    <AuthContext.Provider value={{ session, loading, login, logout, signup }}>
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
```

### Protected Route Component

```typescript
import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()

  if (loading) {
    return <div>Loading...</div>
  }

  if (!session) {
    return <Navigate to="/login" />
  }

  return <>{children}</>
}
```

## Security Features

### Password Requirements

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number

### Rate Limiting

All authentication endpoints enforce rate limiting:

- **Max Attempts:** 5 per email address
- **Window:** 15 minutes
- **Protected Endpoints:**
  - Signup
  - Login
  - Password reset requests

When rate limit is exceeded, users receive:

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many attempts. Please try again later."
  }
}
```

### CSRF Protection

OAuth flows use state tokens to prevent CSRF attacks:

- Unique state token generated for each OAuth request
- State stored with 5-minute expiry
- State validated on OAuth callback
- Mismatched or expired states rejected

### Token Security

**Access Tokens:**

- Valid for 24 hours
- Used for API authentication
- Should be stored securely (not in localStorage if possible)

**Refresh Tokens:**

- Valid for 7 days
- Used to obtain new access tokens
- Rotated on each refresh for added security

**Best Practices:**

```typescript
// Check token expiry before API calls
const session = await authService.getSession()

if (!session) {
  // Redirect to login
  return
}

// Token is automatically validated by getSession()
// Make API call with valid token
fetch('/api/notes', {
  headers: {
    Authorization: `Bearer ${session.token.accessToken}`,
  },
})
```

### Password Hashing

**Current (MVP):**

- Uses `crypto.subtle.digest` with SHA-256
- Simulates backend hashing for development

**Production:**

- Will use bcrypt with appropriate salt rounds
- Server-side hashing only
- Never send or store plain-text passwords

## Error Handling

### Error Codes

| Code                  | Description                        | Field    |
| --------------------- | ---------------------------------- | -------- |
| `INVALID_EMAIL`       | Email format is invalid            | email    |
| `INVALID_PASSWORD`    | Password doesn't meet requirements | password |
| `WEAK_PASSWORD`       | Password is too weak               | password |
| `INVALID_NAME`        | Name is invalid or too short       | name     |
| `EMAIL_EXISTS`        | Email already registered           | email    |
| `INVALID_CREDENTIALS` | Login failed                       | -        |
| `RATE_LIMIT_EXCEEDED` | Too many attempts                  | -        |
| `INVALID_TOKEN`       | Token is invalid or expired        | -        |
| `TOKEN_EXPIRED`       | Token has expired                  | -        |
| `INVALID_STATE`       | OAuth state mismatch (CSRF)        | -        |
| `STATE_EXPIRED`       | OAuth state expired                | -        |
| `USER_NOT_FOUND`      | User doesn't exist                 | -        |
| `INTERNAL_ERROR`      | Server error                       | -        |

### Error Handling Pattern

```typescript
const result = await authService.login(credentials)

if (result.error) {
  const { code, message, field } = result.error

  // Log error for debugging
  console.error(`Auth error [${code}]:`, message)

  // Show user-friendly message
  switch (code) {
    case 'INVALID_CREDENTIALS':
      setError('Invalid email or password')
      break
    case 'RATE_LIMIT_EXCEEDED':
      setError('Too many attempts. Please try again in 15 minutes.')
      break
    case 'WEAK_PASSWORD':
      setFieldError('password', message)
      break
    default:
      setError('Something went wrong. Please try again.')
  }
}
```

## Testing

The authentication service includes comprehensive tests covering:

- Email/password authentication
- OAuth flows (Google and Apple)
- Token management and validation
- Password reset flows
- Rate limiting
- Security validations
- Error handling

**Run Tests:**

```bash
npm test src/services/__tests__/authService.test.ts
```

**Test Coverage:**

- 42 test cases
- All major authentication flows
- Edge cases and error conditions
- Security features (rate limiting, CSRF, etc.)

## Migration to Backend API

When migrating to a real backend, follow these steps:

1. **Update authService.ts:**

```typescript
// Replace localStorage operations with API calls
async signup(credentials: SignupCredentials) {
  try {
    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    })

    if (!response.ok) {
      const errorData = await response.json()
      return { error: errorData.error }
    }

    const data = await response.json()
    return { session: data.session }
  } catch (error) {
    monitoring.logError(error as Error, {
      feature: 'auth_service',
      action: 'signup',
    })
    return {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred.',
      },
    }
  }
}
```

2. **Backend Requirements:**

- Implement endpoints matching the API specification
- Use bcrypt for password hashing (never client-side)
- Use PostgreSQL for user storage
- Implement JWT with RS256 algorithm
- Add rate limiting middleware
- Set up OAuth providers (Google, Apple)
- Implement email verification
- Add CORS configuration

3. **Security Checklist:**

- [ ] All passwords hashed with bcrypt
- [ ] JWT tokens signed with RS256
- [ ] Token expiry enforced
- [ ] Rate limiting on all auth endpoints
- [ ] CSRF protection for OAuth
- [ ] Input validation on server
- [ ] SQL injection prevention
- [ ] XSS protection
- [ ] HTTPS enforced in production
- [ ] Security headers configured

## Environment Variables

Add these to your `.env` file:

```bash
# OAuth Configuration
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_APPLE_CLIENT_ID=your_apple_client_id

# API Configuration (for production)
VITE_API_BASE_URL=https://api.paperlyte.com/v1
```

## Support

For questions or issues related to authentication:

1. Check this documentation
2. Review test cases in `authService.test.ts`
3. Consult security implementation guide in `simple-scribbles/security-implementation-guide.md`
4. Open an issue on GitHub

## Security Reporting

If you discover a security vulnerability, please email: security@paperlyte.com

Do not open a public issue for security vulnerabilities.
