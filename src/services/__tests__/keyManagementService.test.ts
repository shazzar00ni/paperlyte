import { describe, it, expect, beforeEach, vi } from 'vitest'
import { keyManagementService } from '../keyManagementService'

describe('KeyManagementService', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
    vi.clearAllMocks()
    // Clear master key from memory
    keyManagementService.clearMasterKey()
  })

  describe('Initialization', () => {
    it('should not be initialized by default', () => {
      expect(keyManagementService.isInitialized()).toBe(false)
    })

    it('should initialize from password', async () => {
      const password = 'test-password-123'

      await keyManagementService.initializeFromPassword(password)

      expect(keyManagementService.isInitialized()).toBe(true)
    })

    it('should generate and store salt on first initialization', async () => {
      const password = 'test-password-123'

      await keyManagementService.initializeFromPassword(password)

      // Check that salt is stored
      const salt = localStorage.getItem('paperlyte_encryption_salt')
      expect(salt).toBeTruthy()
      expect(salt).toBeTruthy()
    })

    it('should reuse same salt on subsequent initializations', async () => {
      const password = 'test-password-123'

      await keyManagementService.initializeFromPassword(password)
      const salt1 = localStorage.getItem('paperlyte_encryption_salt')

      // Clear master key and re-initialize
      keyManagementService.clearMasterKey()
      await keyManagementService.initializeFromPassword(password)
      const salt2 = localStorage.getItem('paperlyte_encryption_salt')

      expect(salt1).toBe(salt2)
    })

    it('should clear master key from memory', async () => {
      const password = 'test-password-123'

      await keyManagementService.initializeFromPassword(password)
      expect(keyManagementService.isInitialized()).toBe(true)

      keyManagementService.clearMasterKey()
      expect(keyManagementService.isInitialized()).toBe(false)
    })
  })

  describe('Note Key Management', () => {
    beforeEach(async () => {
      // Initialize key manager before each test
      await keyManagementService.initializeFromPassword('test-password-123')
    })

    it('should generate a note key', async () => {
      const noteId = 'note-1'

      const keyId = await keyManagementService.generateNoteKey(noteId)

      expect(keyId).toBeTruthy()
      expect(typeof keyId).toBe('string')
    })

    it('should retrieve a generated note key', async () => {
      const noteId = 'note-1'

      const keyId = await keyManagementService.generateNoteKey(noteId)
      const key = await keyManagementService.getNoteKey(noteId, keyId)

      expect(key).toBeDefined()
      expect(key.type).toBe('secret')
    })

    it('should fail to generate key when not initialized', async () => {
      keyManagementService.clearMasterKey()

      await expect(
        keyManagementService.generateNoteKey('note-1')
      ).rejects.toThrow('Key manager not initialized')
    })

    it('should fail to retrieve key when not initialized', async () => {
      const noteId = 'note-1'
      const keyId = await keyManagementService.generateNoteKey(noteId)

      keyManagementService.clearMasterKey()

      await expect(
        keyManagementService.getNoteKey(noteId, keyId)
      ).rejects.toThrow('Key manager not initialized')
    })

    it('should store multiple keys for same note', async () => {
      const noteId = 'note-1'

      const keyId1 = await keyManagementService.generateNoteKey(noteId)
      const keyId2 = await keyManagementService.generateNoteKey(noteId)

      expect(keyId1).not.toBe(keyId2)

      const key1 = await keyManagementService.getNoteKey(noteId, keyId1)
      const key2 = await keyManagementService.getNoteKey(noteId, keyId2)

      expect(key1).toBeDefined()
      expect(key2).toBeDefined()
    })

    it('should store keys for different notes', async () => {
      const keyId1 = await keyManagementService.generateNoteKey('note-1')
      const keyId2 = await keyManagementService.generateNoteKey('note-2')

      const key1 = await keyManagementService.getNoteKey('note-1', keyId1)
      const key2 = await keyManagementService.getNoteKey('note-2', keyId2)

      expect(key1).toBeDefined()
      expect(key2).toBeDefined()
    })

    it('should delete a note key', async () => {
      const noteId = 'note-1'
      const keyId = await keyManagementService.generateNoteKey(noteId)

      await keyManagementService.deleteNoteKey(noteId, keyId)

      await expect(
        keyManagementService.getNoteKey(noteId, keyId)
      ).rejects.toThrow()
    })

    it('should fail to retrieve non-existent key', async () => {
      await expect(
        keyManagementService.getNoteKey('note-1', 'non-existent-key')
      ).rejects.toThrow()
    })
  })

  describe('Encryption Metadata', () => {
    it('should return default metadata when not initialized', async () => {
      const metadata = await keyManagementService.getEncryptionMetadata()

      expect(metadata).toEqual({
        isEnabled: false,
        hasPassword: false,
        keyCount: 0,
        lastKeyRotation: null,
      })
    })

    it('should return metadata after initialization', async () => {
      await keyManagementService.initializeFromPassword('test-password-123')

      const metadata = await keyManagementService.getEncryptionMetadata()

      expect(metadata.isEnabled).toBe(true)
      expect(metadata.hasPassword).toBe(true)
      expect(metadata.keyCount).toBe(0)
    })

    it('should track key count', async () => {
      await keyManagementService.initializeFromPassword('test-password-123')

      await keyManagementService.generateNoteKey('note-1')
      await keyManagementService.generateNoteKey('note-2')
      await keyManagementService.generateNoteKey('note-3')

      const metadata = await keyManagementService.getEncryptionMetadata()

      expect(metadata.keyCount).toBe(3)
    })

    it('should update key count after deletion', async () => {
      await keyManagementService.initializeFromPassword('test-password-123')

      const keyId1 = await keyManagementService.generateNoteKey('note-1')
      const keyId2 = await keyManagementService.generateNoteKey('note-2')

      let metadata = await keyManagementService.getEncryptionMetadata()
      expect(metadata.keyCount).toBe(2)

      await keyManagementService.deleteNoteKey('note-1', keyId1)

      metadata = await keyManagementService.getEncryptionMetadata()
      expect(metadata.keyCount).toBe(1)
    })
  })

  describe('Persistence', () => {
    it('should persist keys across re-initialization', async () => {
      const password = 'test-password-123'
      const noteId = 'note-1'

      // First session
      await keyManagementService.initializeFromPassword(password)
      const keyId = await keyManagementService.generateNoteKey(noteId)

      // Clear master key (simulate logout)
      keyManagementService.clearMasterKey()

      // Second session (simulate login)
      await keyManagementService.initializeFromPassword(password)
      const key = await keyManagementService.getNoteKey(noteId, keyId)

      expect(key).toBeDefined()
    })

    it('should fail to retrieve keys with wrong password', async () => {
      const noteId = 'note-1'

      // First session
      await keyManagementService.initializeFromPassword('correct-password')
      const keyId = await keyManagementService.generateNoteKey(noteId)

      // Clear master key (simulate logout)
      keyManagementService.clearMasterKey()

      // Second session with wrong password
      await keyManagementService.initializeFromPassword('wrong-password')

      // Should fail to decrypt wrapped key
      await expect(
        keyManagementService.getNoteKey(noteId, keyId)
      ).rejects.toThrow()
    })
  })
})
