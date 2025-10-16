# Client-Side Encryption Implementation

## Overview

Paperlyte now supports client-side end-to-end encryption for notes before they are synced to the cloud. This implementation follows zero-knowledge architecture principles where encryption keys never leave the client.

## Architecture

### Key Components

1. **Encryption Service** (`src/services/encryptionService.ts`)
   - Uses Web Crypto API (native browser crypto)
   - AES-GCM 256-bit authenticated encryption
   - PBKDF2 key derivation with 100,000 iterations
   - Secure random IV generation for each encryption operation

2. **Key Management Service** (`src/services/keyManagementService.ts`)
   - Master key derivation from user password
   - Per-note encryption key generation
   - Key wrapping (encrypting keys with master key)
   - Secure key storage in localStorage

3. **Sync Engine Integration** (`src/services/syncEngine.ts`)
   - Automatic encryption before cloud sync
   - Automatic decryption after cloud retrieval
   - Transparent to the application layer

### Encryption Flow

```
User Password
    ↓ (PBKDF2 + Salt)
Master Key (in memory only, never stored)
    ↓ (wraps)
Note Keys (stored encrypted)
    ↓ (encrypts)
Note Content (encrypted before sync)
```

## Usage

### Initialization

To enable encryption, initialize the key manager with a password:

```typescript
import { keyManagementService } from './services/keyManagementService'

// Initialize encryption (e.g., during login)
await keyManagementService.initializeFromPassword(userPassword)
```

### Syncing with Encryption

Once initialized, encryption happens automatically during sync:

```typescript
import { syncEngine } from './services/syncEngine'

// Sync notes - encryption happens automatically if key manager is initialized
const result = await syncEngine.syncNotes(localNotes)
```

### Clearing Keys (Logout)

```typescript
// Clear master key from memory
keyManagementService.clearMasterKey()
```

## Security Features

### Zero-Knowledge Architecture

- **Master key is never stored** - Only derived from password when needed
- **Keys never leave the client** - All encryption/decryption happens locally
- **Per-note encryption** - Each note has its own encryption key
- **Authenticated encryption** - AES-GCM provides both confidentiality and integrity

### Key Hierarchy

1. **User Password** → **Master Key** (PBKDF2-derived)
2. **Master Key** → Wraps **Note Keys**
3. **Note Keys** → Encrypt **Note Content**

### Cryptographic Specifications

- **Algorithm**: AES-GCM (Galois/Counter Mode)
- **Key Length**: 256 bits
- **IV Length**: 96 bits (12 bytes)
- **Key Derivation**: PBKDF2-SHA256 with 100,000 iterations
- **Salt**: 128 bits (16 bytes), randomly generated and stored

## Data Models

### Note Interface (Extended)

```typescript
interface Note {
  // ... existing fields ...

  // Encryption metadata
  isEncrypted?: boolean
  encryptedContent?: string
  encryptedTitle?: string
  encryptionKeyId?: string
  encryptionIv?: string
}
```

### Encryption Types

```typescript
interface EncryptedData {
  ciphertext: string
  iv: string
  algorithm: 'AES-GCM'
}

interface EncryptionKey {
  id: string
  encryptedKey: string
  keyIv: string
  createdAt: string
}
```

## UI Components

### Encryption Badge

Visual indicator for encrypted notes:

```typescript
import EncryptionBadge from './components/EncryptionBadge'

<EncryptionBadge isEncrypted={note.isEncrypted} size="md" showText />
```

### Sync Status with Encryption

Updated sync status indicator shows encryption state:

```typescript
import SyncStatusIndicator from './components/SyncStatusIndicator'

<SyncStatusIndicator
  status="synced"
  showEncryption={true}
/>
```

## Testing

Comprehensive test coverage includes:

### Encryption Service Tests

- Key generation and derivation
- Encryption/decryption operations
- Unicode and edge case handling
- Key wrapping and unwrapping
- End-to-end encryption workflow

### Key Management Tests

- Password-based initialization
- Note key generation and retrieval
- Key persistence across sessions
- Encryption metadata tracking

### Test Configuration

Web Crypto API is polyfilled in tests using Node.js crypto:

```typescript
// src/test-setup.ts
import crypto from 'crypto'

if (!globalThis.crypto) {
  Object.defineProperty(globalThis, 'crypto', {
    value: crypto.webcrypto,
    writable: true,
  })
}
```

## Migration Considerations

### Current State (MVP)

- Encryption is **optional** - notes sync unencrypted if key manager not initialized
- Local-only encryption (simulated cloud in localStorage)
- No authentication system yet

### Future Enhancements (Q4 2025 - Q1 2026)

1. **User Authentication Integration**
   - Derive master key from user login password
   - Secure key exchange during authentication

2. **Real Cloud API**
   - Replace simulated cloud storage with actual API
   - Encrypted notes stored on server
   - Server never has access to encryption keys

3. **Key Rotation**
   - Periodic key rotation support
   - Re-encryption of existing notes

4. **Recovery Mechanisms**
   - Key backup/recovery options
   - Multi-device key synchronization

## Security Best Practices

### For Developers

1. **Never log encryption keys** - Even in development
2. **Use secure random** - Always use crypto.getRandomValues()
3. **Validate inputs** - Check all user inputs before encryption
4. **Handle errors securely** - Don't leak information in error messages
5. **Test thoroughly** - Include security-focused test cases

### For Users (Future Documentation)

1. **Use strong passwords** - Key derivation is only as strong as the password
2. **Don't share passwords** - Zero-knowledge means we can't recover data
3. **Keep devices secure** - Master key exists in memory during session
4. **Log out when done** - Clears master key from memory

## Performance Considerations

- **Async operations** - All encryption operations are asynchronous
- **Minimal overhead** - Web Crypto API is hardware-accelerated
- **Batch processing** - Sync engine handles multiple notes efficiently
- **Lazy initialization** - Key manager only initializes when needed

## Limitations & Known Issues

1. **Test Coverage** - Some edge case tests still failing (27/30 passing)
2. **No key rotation** - Single key per note for lifetime
3. **No multi-device sync** - Key management across devices not implemented
4. **Recovery options** - No way to recover encrypted data if password lost

## References

- [Web Crypto API Specification](https://www.w3.org/TR/WebCryptoAPI/)
- [NIST Guidelines for Password-Based Key Derivation](https://pages.nist.gov/800-63-3/sp800-63b.html)
- [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)

## Related Documentation

- `simple-scribbles/security-implementation-guide.md` - Original implementation plan
- `docs/security-recommendations.md` - Security audit checklist
- `SECURITY.md` - Security policy and reporting

---

Last Updated: 2025-10-15
Version: 0.1.0 (MVP)
