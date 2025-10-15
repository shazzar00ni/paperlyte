import type { EncryptedData } from '../types'
import { monitoring } from '../utils/monitoring'

/**
 * Encryption Service - Client-side end-to-end encryption
 *
 * Uses Web Crypto API for secure encryption/decryption
 * - AES-GCM 256-bit encryption (authenticated encryption)
 * - PBKDF2 key derivation with 100,000 iterations
 * - Secure random IV generation for each encryption
 * - Zero-knowledge architecture (keys never leave client)
 *
 * IMPORTANT: This is client-side encryption only. The server never
 * has access to unencrypted content or encryption keys.
 */

class EncryptionService {
  private static readonly ALGORITHM = 'AES-GCM'
  private static readonly KEY_LENGTH = 256
  private static readonly IV_LENGTH = 12 // 96 bits for AES-GCM
  private static readonly PBKDF2_ITERATIONS = 100000
  private static readonly SALT_LENGTH = 16 // 128 bits

  /**
   * Derive an encryption key from a password using PBKDF2
   *
   * @param password - User password
   * @param salt - Salt as Uint8Array
   * @returns CryptoKey for encryption/decryption
   */
  async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    try {
      // Import the password as key material
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(password),
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
      )

      // Derive the key using PBKDF2
      return await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt,
          iterations: EncryptionService.PBKDF2_ITERATIONS,
          hash: 'SHA-256',
        },
        keyMaterial,
        {
          name: EncryptionService.ALGORITHM,
          length: EncryptionService.KEY_LENGTH,
        },
        false, // not extractable
        ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
      )
    } catch (error) {
      monitoring.logError(error as Error, {
        feature: 'encryption_service',
        action: 'derive_key',
      })
      throw new Error('Failed to derive encryption key')
    }
  }

  /**
   * Generate a random salt for key derivation
   *
   * @returns Uint8Array containing random salt
   */
  generateSalt(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(EncryptionService.SALT_LENGTH))
  }

  /**
   * Generate a random encryption key
   *
   * @returns CryptoKey for encryption/decryption
   */
  async generateKey(): Promise<CryptoKey> {
    try {
      return await crypto.subtle.generateKey(
        {
          name: EncryptionService.ALGORITHM,
          length: EncryptionService.KEY_LENGTH,
        },
        true, // extractable for wrapping
        ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
      )
    } catch (error) {
      monitoring.logError(error as Error, {
        feature: 'encryption_service',
        action: 'generate_key',
      })
      throw new Error('Failed to generate encryption key')
    }
  }

  /**
   * Encrypt plaintext data
   *
   * @param plaintext - Data to encrypt
   * @param key - CryptoKey for encryption
   * @returns EncryptedData with ciphertext and IV
   */
  async encrypt(plaintext: string, key: CryptoKey): Promise<EncryptedData> {
    try {
      // Generate random IV
      const iv = crypto.getRandomValues(
        new Uint8Array(EncryptionService.IV_LENGTH)
      )

      // Encode plaintext to bytes
      const encoded = new TextEncoder().encode(plaintext)

      // Encrypt the data
      const encrypted = await crypto.subtle.encrypt(
        { name: EncryptionService.ALGORITHM, iv },
        key,
        encoded
      )

      // Convert to base64 for storage
      return {
        ciphertext: this.arrayBufferToBase64(encrypted),
        iv: this.uint8ArrayToBase64(iv),
        algorithm: EncryptionService.ALGORITHM,
      }
    } catch (error) {
      monitoring.logError(error as Error, {
        feature: 'encryption_service',
        action: 'encrypt',
      })
      throw new Error('Failed to encrypt data')
    }
  }

  /**
   * Decrypt encrypted data
   *
   * @param encryptedData - EncryptedData with ciphertext and IV
   * @param key - CryptoKey for decryption
   * @returns Decrypted plaintext
   */
  async decrypt(encryptedData: EncryptedData, key: CryptoKey): Promise<string> {
    try {
      // Convert from base64
      const ciphertext = this.base64ToArrayBuffer(encryptedData.ciphertext)
      const iv = this.base64ToUint8Array(encryptedData.iv)

      // Decrypt the data
      const decrypted = await crypto.subtle.decrypt(
        { name: EncryptionService.ALGORITHM, iv },
        key,
        ciphertext
      )

      // Decode to string
      return new TextDecoder().decode(decrypted)
    } catch (error) {
      monitoring.logError(error as Error, {
        feature: 'encryption_service',
        action: 'decrypt',
      })
      throw new Error('Failed to decrypt data')
    }
  }

  /**
   * Wrap (encrypt) an encryption key with a master key
   * Used to store per-note keys encrypted with the user's master key
   *
   * @param keyToWrap - Key to wrap
   * @param wrappingKey - Master key for wrapping
   * @returns Object with wrapped key and IV in base64
   */
  async wrapKey(
    keyToWrap: CryptoKey,
    wrappingKey: CryptoKey
  ): Promise<{ wrappedKey: string; iv: string }> {
    try {
      // Generate IV for wrapping
      const iv = crypto.getRandomValues(
        new Uint8Array(EncryptionService.IV_LENGTH)
      )

      const wrapped = await crypto.subtle.wrapKey(
        'raw',
        keyToWrap,
        wrappingKey,
        {
          name: EncryptionService.ALGORITHM,
          iv,
        }
      )

      return {
        wrappedKey: this.arrayBufferToBase64(wrapped),
        iv: this.uint8ArrayToBase64(iv),
      }
    } catch (error) {
      monitoring.logError(error as Error, {
        feature: 'encryption_service',
        action: 'wrap_key',
      })
      throw new Error('Failed to wrap encryption key')
    }
  }

  /**
   * Unwrap (decrypt) an encryption key with a master key
   *
   * @param wrappedKeyData - Object with wrapped key and IV in base64
   * @param unwrappingKey - Master key for unwrapping
   * @returns Unwrapped CryptoKey
   */
  async unwrapKey(
    wrappedKeyData: { wrappedKey: string; iv: string },
    unwrappingKey: CryptoKey
  ): Promise<CryptoKey> {
    try {
      const keyData = this.base64ToArrayBuffer(wrappedKeyData.wrappedKey)
      const iv = this.base64ToUint8Array(wrappedKeyData.iv)

      return await crypto.subtle.unwrapKey(
        'raw',
        keyData,
        unwrappingKey,
        {
          name: EncryptionService.ALGORITHM,
          iv,
        },
        {
          name: EncryptionService.ALGORITHM,
          length: EncryptionService.KEY_LENGTH,
        },
        true, // extractable (might need to wrap again)
        ['encrypt', 'decrypt']
      )
    } catch (error) {
      monitoring.logError(error as Error, {
        feature: 'encryption_service',
        action: 'unwrap_key',
      })
      throw new Error('Failed to unwrap encryption key')
    }
  }

  /**
   * Helper: Convert ArrayBuffer to base64 string
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }

  /**
   * Helper: Convert base64 string to ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    // Return a copy of the buffer to ensure it's a proper ArrayBuffer
    return bytes.buffer.slice(0)
  }

  /**
   * Helper: Convert Uint8Array to base64 string
   */
  private uint8ArrayToBase64(array: Uint8Array): string {
    let binary = ''
    for (let i = 0; i < array.byteLength; i++) {
      binary += String.fromCharCode(array[i])
    }
    return btoa(binary)
  }

  /**
   * Helper: Convert base64 string to Uint8Array
   */
  private base64ToUint8Array(base64: string): Uint8Array {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes
  }
}

// Export singleton instance
export const encryptionService = new EncryptionService()

// Export for testing
export default encryptionService
