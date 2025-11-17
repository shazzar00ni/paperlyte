import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { indexedDB, STORE_NAMES } from '../indexedDB'

describe('IndexedDB Storage', () => {
  beforeEach(async () => {
    // Close any existing connections
    indexedDB.close()

    // Delete the test database
    const deleteRequest = window.indexedDB.deleteDatabase('paperlyte_db')
    await new Promise<void>((resolve, reject) => {
      deleteRequest.onsuccess = () => resolve()
      deleteRequest.onerror = () => reject(deleteRequest.error)
    })
  })

  afterEach(() => {
    indexedDB.close()
  })

  describe('Initialization', () => {
    it('should initialize database successfully', async () => {
      await expect(indexedDB.init()).resolves.toBeUndefined()
    })

    it('should create required object stores', async () => {
      await indexedDB.init()

      // Try to use the stores (will throw if they don't exist)
      await expect(indexedDB.getAll(STORE_NAMES.NOTES)).resolves.toEqual([])
      await expect(indexedDB.getAll(STORE_NAMES.WAITLIST)).resolves.toEqual([])
      await expect(indexedDB.getAll(STORE_NAMES.METADATA)).resolves.toEqual([])
    })
  })

  describe('CRUD Operations', () => {
    beforeEach(async () => {
      await indexedDB.init()
    })

    it('should put and get an item', async () => {
      const testItem = { id: 'test-1', name: 'Test Item' }

      await indexedDB.put(STORE_NAMES.NOTES, testItem)
      const retrieved = await indexedDB.get(STORE_NAMES.NOTES, 'test-1')

      expect(retrieved).toEqual(testItem)
    })

    it('should get all items from a store', async () => {
      const items = [
        { id: '1', name: 'Item 1' },
        { id: '2', name: 'Item 2' },
        { id: '3', name: 'Item 3' },
      ]

      for (const item of items) {
        await indexedDB.put(STORE_NAMES.NOTES, item)
      }

      const retrieved = await indexedDB.getAll(STORE_NAMES.NOTES)
      expect(retrieved).toHaveLength(3)
    })

    it('should update an existing item', async () => {
      const original = { id: 'test-1', name: 'Original' }
      const updated = { id: 'test-1', name: 'Updated' }

      await indexedDB.put(STORE_NAMES.NOTES, original)
      await indexedDB.put(STORE_NAMES.NOTES, updated)

      const retrieved = await indexedDB.get(STORE_NAMES.NOTES, 'test-1')
      expect(retrieved).toEqual(updated)
    })

    it('should delete an item', async () => {
      const testItem = { id: 'test-1', name: 'Test Item' }

      await indexedDB.put(STORE_NAMES.NOTES, testItem)
      await indexedDB.delete(STORE_NAMES.NOTES, 'test-1')

      const retrieved = await indexedDB.get(STORE_NAMES.NOTES, 'test-1')
      expect(retrieved).toBeUndefined()
    })

    it('should clear all items from a store', async () => {
      const items = [
        { id: '1', name: 'Item 1' },
        { id: '2', name: 'Item 2' },
      ]

      for (const item of items) {
        await indexedDB.put(STORE_NAMES.NOTES, item)
      }

      await indexedDB.clear(STORE_NAMES.NOTES)

      const retrieved = await indexedDB.getAll(STORE_NAMES.NOTES)
      expect(retrieved).toHaveLength(0)
    })

    it('should count items in a store', async () => {
      const items = [
        { id: '1', name: 'Item 1' },
        { id: '2', name: 'Item 2' },
        { id: '3', name: 'Item 3' },
      ]

      for (const item of items) {
        await indexedDB.put(STORE_NAMES.NOTES, item)
      }

      const count = await indexedDB.count(STORE_NAMES.NOTES)
      expect(count).toBe(3)
    })
  })

  describe('Storage Estimation', () => {
    it('should get storage estimate', async () => {
      const estimate = await indexedDB.getStorageEstimate()

      expect(estimate).toHaveProperty('usage')
      expect(estimate).toHaveProperty('quota')
      expect(estimate).toHaveProperty('usagePercentage')

      expect(typeof estimate.usage).toBe('number')
      expect(typeof estimate.quota).toBe('number')
      expect(typeof estimate.usagePercentage).toBe('number')
    })
  })
})
