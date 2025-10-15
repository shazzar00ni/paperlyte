import { describe, it, expect, beforeEach, vi } from 'vitest'
import { encryptionService } from '../encryptionService'

describe('EncryptionService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Key Generation', () => {
    it('should generate a random salt', () => {
      const salt1 = encryptionService.generateSalt()
      const salt2 = encryptionService.generateSalt()

      expect(salt1).toBeInstanceOf(Uint8Array)
      expect(salt1.length).toBe(16) // 128 bits
      expect(salt1).not.toEqual(salt2) // Should be random
    })

    it('should generate a random encryption key', async () => {
      const key = await encryptionService.generateKey()

      expect(key).toBeDefined()
      expect(key.type).toBe('secret')
      expect(key.algorithm).toEqual({
        name: 'AES-GCM',
        length: 256,
      })
    })

    it('should derive key from password and salt', async () => {
      const password = 'test-password-123'
      const salt = encryptionService.generateSalt()

      const key = await encryptionService.deriveKey(password, salt)

      expect(key).toBeDefined()
      expect(key.type).toBe('secret')
      expect(key.algorithm).toEqual({
        name: 'AES-GCM',
        length: 256,
      })
    })

    it('should derive same key from same password and salt', async () => {
      const password = 'test-password-123'
      const salt = encryptionService.generateSalt()

      const key1 = await encryptionService.deriveKey(password, salt)
      const key2 = await encryptionService.deriveKey(password, salt)

      // Export keys to compare (for testing only)
      const exported1 = await crypto.subtle.exportKey('raw', key1)
      const exported2 = await crypto.subtle.exportKey('raw', key2)

      expect(new Uint8Array(exported1)).toEqual(new Uint8Array(exported2))
    })
  })

  describe('Encryption and Decryption', () => {
    it('should encrypt and decrypt plaintext correctly', async () => {
      const plaintext = 'Hello, World! This is a test.'
      const key = await encryptionService.generateKey()

      const encrypted = await encryptionService.encrypt(plaintext, key)

      expect(encrypted).toHaveProperty('ciphertext')
      expect(encrypted).toHaveProperty('iv')
      expect(encrypted.algorithm).toBe('AES-GCM')
      expect(encrypted.ciphertext).not.toBe(plaintext)

      const decrypted = await encryptionService.decrypt(encrypted, key)
      expect(decrypted).toBe(plaintext)
    })

    it('should produce different ciphertext for same plaintext due to random IV', async () => {
      const plaintext = 'Same message'
      const key = await encryptionService.generateKey()

      const encrypted1 = await encryptionService.encrypt(plaintext, key)
      const encrypted2 = await encryptionService.encrypt(plaintext, key)

      expect(encrypted1.ciphertext).not.toBe(encrypted2.ciphertext)
      expect(encrypted1.iv).not.toBe(encrypted2.iv)

      // Both should decrypt to the same plaintext
      const decrypted1 = await encryptionService.decrypt(encrypted1, key)
      const decrypted2 = await encryptionService.decrypt(encrypted2, key)

      expect(decrypted1).toBe(plaintext)
      expect(decrypted2).toBe(plaintext)
    })

    it('should encrypt and decrypt unicode text', async () => {
      const plaintext = '你好世界 🌍 Hello World! émojis 🎉'
      const key = await encryptionService.generateKey()

      const encrypted = await encryptionService.encrypt(plaintext, key)
      const decrypted = await encryptionService.decrypt(encrypted, key)

      expect(decrypted).toBe(plaintext)
    })

    it('should encrypt empty string', async () => {
      const plaintext = ''
      const key = await encryptionService.generateKey()

      const encrypted = await encryptionService.encrypt(plaintext, key)
      const decrypted = await encryptionService.decrypt(encrypted, key)

      expect(decrypted).toBe(plaintext)
    })

    it('should encrypt very long text', async () => {
      const plaintext = 'A'.repeat(10000)
      const key = await encryptionService.generateKey()

      const encrypted = await encryptionService.encrypt(plaintext, key)
      const decrypted = await encryptionService.decrypt(encrypted, key)

      expect(decrypted).toBe(plaintext)
      expect(decrypted.length).toBe(10000)
    })

    it('should fail to decrypt with wrong key', async () => {
      const plaintext = 'Secret message'
      const key1 = await encryptionService.generateKey()
      const key2 = await encryptionService.generateKey()

      const encrypted = await encryptionService.encrypt(plaintext, key1)

      await expect(encryptionService.decrypt(encrypted, key2)).rejects.toThrow()
    })

    it('should fail to decrypt with tampered ciphertext', async () => {
      const plaintext = 'Secret message'
      const key = await encryptionService.generateKey()

      const encrypted = await encryptionService.encrypt(plaintext, key)

      // Tamper with ciphertext
      const tamperedEncrypted = {
        ...encrypted,
        ciphertext: encrypted.ciphertext.slice(0, -4) + 'XXXX',
      }

      await expect(
        encryptionService.decrypt(tamperedEncrypted, key)
      ).rejects.toThrow()
    })
  })

  describe('Key Wrapping', () => {
    it('should wrap and unwrap a key', async () => {
      const keyToWrap = await encryptionService.generateKey()
      const wrappingKey = await encryptionService.generateKey()

      const wrapped = await encryptionService.wrapKey(keyToWrap, wrappingKey)

      expect(wrapped).toBeTruthy()
      expect(wrapped).toHaveProperty('wrappedKey')
      expect(wrapped).toHaveProperty('iv')
      expect(typeof wrapped.wrappedKey).toBe('string')
      expect(typeof wrapped.iv).toBe('string')

      const unwrapped = await encryptionService.unwrapKey(wrapped, wrappingKey)

      expect(unwrapped).toBeDefined()
      expect(unwrapped.type).toBe('secret')

      // Test that unwrapped key works the same as original
      const plaintext = 'Test message'
      const encrypted = await encryptionService.encrypt(plaintext, keyToWrap)
      const decrypted = await encryptionService.decrypt(encrypted, unwrapped)

      expect(decrypted).toBe(plaintext)
    })

    it('should fail to unwrap with wrong wrapping key', async () => {
      const keyToWrap = await encryptionService.generateKey()
      const wrappingKey1 = await encryptionService.generateKey()
      const wrappingKey2 = await encryptionService.generateKey()

      const wrapped = await encryptionService.wrapKey(keyToWrap, wrappingKey1)

      await expect(
        encryptionService.unwrapKey(wrapped, wrappingKey2)
      ).rejects.toThrow()
    })
  })

  describe('Integration Tests', () => {
    it('should perform complete encryption workflow with derived key', async () => {
      const password = 'user-password-123'
      const salt = encryptionService.generateSalt()
      const masterKey = await encryptionService.deriveKey(password, salt)

      // Generate a note key
      const noteKey = await encryptionService.generateKey()

      // Wrap the note key with master key
      const wrappedNoteKeyData = await encryptionService.wrapKey(
        noteKey,
        masterKey
      )

      // Encrypt some content with note key
      const plaintext = 'This is my secret note content'
      const encrypted = await encryptionService.encrypt(plaintext, noteKey)

      // Simulate storage and retrieval
      // User logs back in with password
      const derivedMasterKey = await encryptionService.deriveKey(password, salt)

      // Unwrap the note key
      const unwrappedNoteKey = await encryptionService.unwrapKey(
        wrappedNoteKeyData,
        derivedMasterKey
      )

      // Decrypt the content
      const decrypted = await encryptionService.decrypt(
        encrypted,
        unwrappedNoteKey
      )

      expect(decrypted).toBe(plaintext)
    })
  })
})
