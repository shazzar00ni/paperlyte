# Paperlyte API (Planned)

## Base URL

```
https://api.paperlyte.com/v1
```

## Authentication

The API uses JWT (JSON Web Tokens) for authentication with support for multiple authentication providers.

### Authentication Endpoints

#### Sign Up with Email/Password

```http
POST /api/auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123",
  "name": "Jane Doe"
}
```

**Response:**

```json
{
  "session": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "Jane Doe",
      "provider": "email",
      "emailVerified": false,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "lastLoginAt": "2024-01-01T00:00:00.000Z"
    },
    "token": {
      "accessToken": "jwt.access.token",
      "refreshToken": "jwt.refresh.token",
      "expiresAt": "2024-01-02T00:00:00.000Z",
      "tokenType": "Bearer"
    },
    "isAuthenticated": true
  }
}
```

#### Login with Email/Password

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123"
}
```

**Response:** Same as signup

#### OAuth Sign-In (Google/Apple)

```http
GET /api/auth/oauth/google
GET /api/auth/oauth/apple
```

Redirects to OAuth provider with proper CSRF protection.

#### OAuth Callback

```http
GET /api/auth/oauth/callback?code=auth_code&state=csrf_state
```

**Response:** Session object (same as signup)

#### Refresh Access Token

```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "jwt.refresh.token"
}
```

**Response:**

```json
{
  "token": {
    "accessToken": "new.jwt.access.token",
    "refreshToken": "new.jwt.refresh.token",
    "expiresAt": "2024-01-02T00:00:00.000Z",
    "tokenType": "Bearer"
  }
}
```

#### Request Password Reset

```http
POST /api/auth/reset-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Response:**

```json
{
  "success": true
}
```

#### Confirm Password Reset

```http
POST /api/auth/reset-password/confirm
Content-Type: application/json

{
  "token": "reset_token",
  "newPassword": "NewSecurePassword123"
}
```

**Response:**

```json
{
  "success": true
}
```

#### Logout

```http
POST /api/auth/logout
Authorization: Bearer jwt.access.token
```

**Response:**

```json
{
  "success": true
}
```

### Security Features

- **Password Requirements**: Minimum 8 characters, must contain uppercase, lowercase, and numbers
- **Rate Limiting**: 5 attempts per 15 minutes per email address
- **CSRF Protection**: State tokens for OAuth flows with 5-minute expiry
- **Token Expiry**: Access tokens valid for 24 hours, refresh tokens for 7 days
- **Password Hashing**: bcrypt with appropriate salt rounds

## Data Endpoints

### Waitlist

#### Add to Waitlist

```http
POST /api/waitlist
Content-Type: application/json

{
  "email": "user@example.com",
  "name": "Jane Doe",
  "interest": "student"
}
```

#### List Waitlist Entries (Admin)

```http
GET /api/waitlist
Authorization: Bearer jwt.access.token
```

### Notes

All note endpoints require authentication.

#### Get Notes (Paginated)

```http
GET /api/notes?page=1&limit=20&sortBy=updatedAt&sortOrder=desc&includeDeleted=false
Authorization: Bearer jwt.access.token
```

**Query Parameters:**

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)
- `sortBy` (optional): Sort field - `createdAt`, `updatedAt`, or `title` (default: `updatedAt`)
- `sortOrder` (optional): Sort order - `asc` or `desc` (default: `desc`)
- `includeDeleted` (optional): Include soft-deleted notes (default: false)

**Response:**

```json
{
  "data": [
    {
      "id": "uuid",
      "title": "My Note",
      "content": "Note content",
      "tags": ["work", "important"],
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "wordCount": 2,
      "version": 1,
      "deletedAt": null
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 20,
  "totalPages": 5,
  "hasMore": true
}
```

#### Get Single Note

```http
GET /api/notes/:id
Authorization: Bearer jwt.access.token
```

**Response:**

```json
{
  "id": "uuid",
  "title": "My Note",
  "content": "Note content",
  "tags": ["work", "important"],
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "wordCount": 2,
  "version": 1,
  "deletedAt": null
}
```

#### Create/Update Note

```http
POST /api/notes
Authorization: Bearer jwt.access.token
Content-Type: application/json

{
  "id": "uuid",
  "title": "My Note",
  "content": "Note content",
  "tags": ["work", "important"]
}
```

**Response:**

```json
{
  "id": "uuid",
  "title": "My Note",
  "content": "Note content",
  "tags": ["work", "important"],
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "wordCount": 2,
  "version": 2
}
```

**Notes:**

- Title is required and limited to 255 characters
- Content is optional, max 10MB
- Input is automatically sanitized for XSS prevention
- Word count is calculated automatically
- Version number increments on each update

#### Delete Note (Soft Delete)

```http
DELETE /api/notes/:id
Authorization: Bearer jwt.access.token
```

**Response:**

```json
{
  "success": true,
  "message": "Note deleted successfully",
  "deletedAt": "2024-01-01T00:00:00.000Z"
}
```

**Notes:**

- Notes are soft-deleted (marked with deletedAt timestamp)
- Deleted notes retained for 30 days
- Can be restored within retention period

#### Restore Deleted Note

```http
POST /api/notes/:id/restore
Authorization: Bearer jwt.access.token
```

**Response:**

```json
{
  "success": true,
  "message": "Note restored successfully",
  "note": {
    "id": "uuid",
    "title": "Restored Note",
    "deletedAt": null
  }
}
```

**Notes:**

- Only works for notes deleted within last 30 days
- Returns error if note not found or beyond retention period

## Error Responses

All endpoints return consistent error responses:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "field": "field_name"
  }
}
```

### Common Error Codes

- `INVALID_EMAIL`: Email format is invalid
- `INVALID_PASSWORD`: Password doesn't meet requirements
- `INVALID_CREDENTIALS`: Login failed
- `EMAIL_EXISTS`: Email already registered
- `RATE_LIMIT_EXCEEDED`: Too many attempts
- `INVALID_TOKEN`: Token is invalid or expired
- `INTERNAL_ERROR`: Server error

---
