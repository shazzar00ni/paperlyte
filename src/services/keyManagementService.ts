import type { EncryptionKey, EncryptionMetadata } from '../types'
import { encryptionService } from './encryptionService'
import { monitoring } from '../utils/monitoring'

/**
 * Key Management Service - Secure encryption key management
 *
 * Features:
 * - Master key derivation from user password
 * - Per-note encryption key generation
 * - Secure key storage (encrypted with master key)
 * - Key rotation support
 * - Zero-knowledge architecture
 *
 * Key Hierarchy:
 * 1. User Password → Master Key (PBKDF2)
 * 2. Master Key → wraps per-note keys
 * 3. Per-note keys → encrypt note content
 *
 * IMPORTANT: Master key is never stored, only derived from password
 * when needed. Per-note keys are stored encrypted with master key.
 */

class KeyManagementService {
  private masterKey: CryptoKey | null = null
  private readonly STORAGE_PREFIX = 'paperlyte_encryption_'
  private readonly SALT_KEY = 'salt'
  private readonly KEYS_KEY = 'note_keys'

  /**
   * Initialize the key manager with a password
   * Derives master key from password using stored salt
   *
   * @param password - User password
   */
  async initializeFromPassword(password: string): Promise<void> {
    try {
      const salt = this.getOrCreateSalt()
      this.masterKey = await encryptionService.deriveKey(password, salt)

      monitoring.addBreadcrumb('Key manager initialized', 'info')
    } catch (error) {
      monitoring.logError(error as Error, {
        feature: 'key_management',
        action: 'initialize_from_password',
      })
      throw new Error('Failed to initialize key manager')
    }
  }

  /**
   * Check if key manager is initialized with a master key
   */
  isInitialized(): boolean {
    return this.masterKey !== null
  }

  /**
   * Generate a new encryption key for a note
   *
   * @param noteId - Note ID for key association
   * @returns Key ID for future reference
   */
  async generateNoteKey(noteId: string): Promise<string> {
    if (!this.masterKey) {
      throw new Error('Key manager not initialized')
    }

    try {
      // Generate a new encryption key
      const noteKey = await encryptionService.generateKey()

      // Wrap the key with master key for storage
      const { wrappedKey, iv } = await encryptionService.wrapKey(
        noteKey,
        this.masterKey
      )

      // Store the wrapped key
      const keyId = crypto.randomUUID()
      const encryptionKey: EncryptionKey = {
        id: keyId,
        encryptedKey: wrappedKey,
        keyIv: iv,
        createdAt: new Date().toISOString(),
      }

      await this.storeKey(noteId, encryptionKey)

      monitoring.addBreadcrumb('Note encryption key generated', 'info', {
        noteId,
        keyId,
      })

      return keyId
    } catch (error) {
      monitoring.logError(error as Error, {
        feature: 'key_management',
        action: 'generate_note_key',
        additionalData: { noteId },
      })
      throw new Error('Failed to generate note encryption key')
    }
  }

  /**
   * Get the encryption key for a note
   *
   * @param noteId - Note ID
   * @param keyId - Key ID
   * @returns Decrypted CryptoKey
   */
  async getNoteKey(noteId: string, keyId: string): Promise<CryptoKey> {
    if (!this.masterKey) {
      throw new Error('Key manager not initialized')
    }

    try {
      const encryptionKey = await this.retrieveKey(noteId, keyId)
      if (!encryptionKey) {
        throw new Error('Encryption key not found')
      }

      // Unwrap the key with master key
      return await encryptionService.unwrapKey(
        {
          wrappedKey: encryptionKey.encryptedKey,
          iv: encryptionKey.keyIv,
        },
        this.masterKey
      )
    } catch (error) {
      monitoring.logError(error as Error, {
        feature: 'key_management',
        action: 'get_note_key',
        additionalData: { noteId, keyId },
      })
      throw new Error('Failed to retrieve note encryption key')
    }
  }

  /**
   * Delete encryption key for a note
   *
   * @param noteId - Note ID
   * @param keyId - Key ID
   */
  async deleteNoteKey(noteId: string, keyId: string): Promise<void> {
    try {
      const keys = this.getAllKeys()
      const noteKeys = keys[noteId] || []
      const updatedKeys = noteKeys.filter(k => k.id !== keyId)

      if (updatedKeys.length === 0) {
        delete keys[noteId]
      } else {
        keys[noteId] = updatedKeys
      }

      localStorage.setItem(
        `${this.STORAGE_PREFIX}${this.KEYS_KEY}`,
        JSON.stringify(keys)
      )

      monitoring.addBreadcrumb('Note encryption key deleted', 'info', {
        noteId,
        keyId,
      })
    } catch (error) {
      monitoring.logError(error as Error, {
        feature: 'key_management',
        action: 'delete_note_key',
        additionalData: { noteId, keyId },
      })
    }
  }

  /**
   * Get encryption metadata
   */
  async getEncryptionMetadata(): Promise<EncryptionMetadata> {
    try {
      const hasPassword = this.hasSalt()
      const keys = this.getAllKeys()
      const keyCount = Object.values(keys).reduce(
        (sum, noteKeys) => sum + noteKeys.length,
        0
      )

      return {
        isEnabled: this.isInitialized(), // Reflects active encryption state for current session
        hasPassword,
        keyCount,
        lastKeyRotation: null, // TODO: Implement key rotation tracking
      }
    } catch (error) {
      monitoring.logError(error as Error, {
        feature: 'key_management',
        action: 'get_encryption_metadata',
      })

      return {
        isEnabled: false,
        hasPassword: false,
        keyCount: 0,
        lastKeyRotation: null,
      }
    }
  }

  /**
   * Clear master key from memory (logout)
   */
  clearMasterKey(): void {
    this.masterKey = null
    monitoring.addBreadcrumb('Master key cleared from memory', 'info')
  }

  /**
   * Get or create salt for key derivation
   * 
   * NOTE: Direct localStorage access is used here for encryption keys/salt
   * rather than dataService abstraction. This is intentional for MVP as:
   * 1. Encryption keys are fundamentally different from user data
   * 2. They require immediate synchronous access for security operations
   * 3. Future migration will move to secure storage (e.g., Web Crypto API storage)
   * TODO: Migrate to secure storage mechanism in Q1 2026
   */
  private getOrCreateSalt(): Uint8Array {
    const saltKey = `${this.STORAGE_PREFIX}${this.SALT_KEY}`
    let saltBase64 = localStorage.getItem(saltKey)

    if (!saltBase64) {
      // Generate new salt
      const salt = encryptionService.generateSalt()
      saltBase64 = this.uint8ArrayToBase64(salt)
      localStorage.setItem(saltKey, saltBase64)
      monitoring.addBreadcrumb('New encryption salt generated', 'info')
      return salt
    }

    return this.base64ToUint8Array(saltBase64)
  }

  /**
   * Check if salt exists (indicates encryption is set up)
   */
  private hasSalt(): boolean {
    const saltKey = `${this.STORAGE_PREFIX}${this.SALT_KEY}`
    return localStorage.getItem(saltKey) !== null
  }

  /**
   * Store encrypted key
   */
  private async storeKey(
    noteId: string,
    encryptionKey: EncryptionKey
  ): Promise<void> {
    const keys = this.getAllKeys()

    if (!keys[noteId]) {
      keys[noteId] = []
    }

    // Replace existing key or add new one
    const existingIndex = keys[noteId].findIndex(k => k.id === encryptionKey.id)
    if (existingIndex >= 0) {
      keys[noteId][existingIndex] = encryptionKey
    } else {
      keys[noteId].push(encryptionKey)
    }

    localStorage.setItem(
      `${this.STORAGE_PREFIX}${this.KEYS_KEY}`,
      JSON.stringify(keys)
    )
  }

  /**
   * Retrieve encrypted key
   */
  private async retrieveKey(
    noteId: string,
    keyId: string
  ): Promise<EncryptionKey | null> {
    const keys = this.getAllKeys()
    const noteKeys = keys[noteId] || []
    return noteKeys.find(k => k.id === keyId) || null
  }

  /**
   * Get all stored keys
   */
  private getAllKeys(): Record<string, EncryptionKey[]> {
    try {
      const keysJson = localStorage.getItem(
        `${this.STORAGE_PREFIX}${this.KEYS_KEY}`
      )
      return keysJson ? JSON.parse(keysJson) : {}
    } catch (error) {
      monitoring.logError(error as Error, {
        feature: 'key_management',
        action: 'get_all_keys',
      })
      return {}
    }
  }

  /**
   * Helper: Convert Uint8Array to base64
   */
  private uint8ArrayToBase64(array: Uint8Array): string {
    let binary = ''
    for (let i = 0; i < array.byteLength; i++) {
      binary += String.fromCharCode(array[i])
    }
    return btoa(binary)
  }

  /**
   * Helper: Convert base64 to Uint8Array
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
export const keyManagementService = new KeyManagementService()

// Export for testing
export default keyManagementService
