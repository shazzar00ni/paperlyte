---
title: '[ENHANCEMENT] Improve email validation in WaitlistModal'
labels: ['enhancement', 'validation', 'medium-priority']
assignees: ''
---

## Feature Description

The current email validation in `WaitlistModal.tsx` uses a basic regex pattern that may accept invalid email addresses. We should implement more robust email validation.

## Current Implementation

**File**: `src/components/WaitlistModal.tsx`  
**Line 37**: `if (!/\S+@\S+\.\S+/.test(formData.email))`

## Issues with Current Approach

1. **Too permissive**: Accepts emails like `test@domain` (missing TLD)
2. **No RFC compliance**: Doesn't follow RFC 5322 email standards
3. **Security concerns**: May allow malformed addresses that cause issues downstream
4. **User experience**: Accepts invalid emails that will fail later

## Proposed Solution

### Option 1: Enhanced Regex Pattern

```typescript
const emailRegex =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
```

### Option 2: Validation Library

Use a dedicated validation library like `validator.js` or `zod`:

```typescript
import validator from 'validator'

const isValidEmail = validator.isEmail(formData.email, {
  allow_display_name: false,
  require_tld: true,
})
```

### Option 3: HTML5 + Custom Validation

```typescript
const validateEmail = (email: string): boolean => {
  // Use browser's built-in validation as first check
  const input = document.createElement('input')
  input.type = 'email'
  input.value = email

  if (!input.validity.valid) return false

  // Additional custom checks
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254 // RFC 5321 limit
}
```

## User Stories

**As a user filling out the waitlist form:**

- I want clear feedback when my email format is invalid
- I want to know immediately if there's an issue, not after submission
- I expect common email formats to be accepted
- I expect obviously invalid emails to be rejected

## Acceptance Criteria

- [ ] Implement robust email validation following RFC standards
- [ ] Provide clear, helpful error messages
- [ ] Validate on both input change and form submission
- [ ] Handle edge cases (international domains, plus addressing, etc.)
- [ ] Maintain good user experience with real-time feedback
- [ ] Include comprehensive test coverage for validation logic

## Test Cases to Cover

```typescript
// Valid emails
✅ user@domain.com
✅ user.name@domain.co.uk
✅ user+tag@domain.org
✅ user@subdomain.domain.com

// Invalid emails
❌ user@domain
❌ @domain.com
❌ user@@domain.com
❌ user@.domain.com
❌ user@domain..com
❌ spaces @domain.com
```

## Implementation Approach

1. **Research validation libraries** vs custom implementation
2. **Update validation function** in WaitlistModal
3. **Add real-time validation** on input blur/change
4. **Improve error messaging** with specific guidance
5. **Add comprehensive tests** for all scenarios
6. **Consider accessibility** for screen readers

## Priority

**Medium** - Improves data quality and user experience, but not blocking MVP.

## Additional Context

This affects the quality of waitlist data and user trust. Better validation reduces support requests and improves conversion rates.

Consider international email standards and accessibility requirements for global users.
