import { monitoring } from './monitoring'

/**
 * IndexedDB Storage Utility
 *
 * Provides a robust wrapper around IndexedDB with:
 * - Error handling and fallbacks
 * - Data migration support
 * - Offline-first behavior
 * - Support for large notes
 */

const DB_NAME = 'paperlyte_db'
const DB_VERSION = 2 // Incremented for feedback and interviews stores
const NOTES_STORE = 'notes'
const WAITLIST_STORE = 'waitlist'
const METADATA_STORE = 'metadata'
const FEEDBACK_STORE = 'feedback'
const INTERVIEWS_STORE = 'interviews'

export interface IDBConfig {
  dbName?: string
  version?: number
}

class IndexedDBStorage {
  private db: IDBDatabase | null = null
  private dbName: string
  private version: number
  private initPromise: Promise<void> | null = null

  constructor(config: IDBConfig = {}) {
    this.dbName = config.dbName || DB_NAME
    this.version = config.version || DB_VERSION
  }

  /**
   * Initialize the database connection
   */
  async init(): Promise<void> {
    // Return existing initialization promise if already in progress
    if (this.initPromise) {
      return this.initPromise
    }

    // Return immediately if already initialized
    if (this.db) {
      return Promise.resolve()
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = window.indexedDB.open(this.dbName, this.version)

      request.onerror = () => {
        const error = new Error(
          `Failed to open IndexedDB: ${request.error?.message}`
        )
        monitoring.logError(error, {
          feature: 'indexeddb',
          action: 'init',
          additionalData: { dbName: this.dbName },
        })
        reject(error)
      }

      request.onsuccess = () => {
        this.db = request.result
        monitoring.addBreadcrumb('IndexedDB initialized successfully', 'info', {
          dbName: this.dbName,
        })
        resolve()
      }

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create object stores if they don't exist
        if (!db.objectStoreNames.contains(NOTES_STORE)) {
          const notesStore = db.createObjectStore(NOTES_STORE, {
            keyPath: 'id',
          })
          notesStore.createIndex('updatedAt', 'updatedAt', { unique: false })
          notesStore.createIndex('createdAt', 'createdAt', { unique: false })
          notesStore.createIndex('tags', 'tags', {
            unique: false,
            multiEntry: true,
          })
        }

        if (!db.objectStoreNames.contains(WAITLIST_STORE)) {
          const waitlistStore = db.createObjectStore(WAITLIST_STORE, {
            keyPath: 'id',
          })
          waitlistStore.createIndex('email', 'email', { unique: true })
          waitlistStore.createIndex('createdAt', 'createdAt', { unique: false })
        }

        if (!db.objectStoreNames.contains(METADATA_STORE)) {
          db.createObjectStore(METADATA_STORE, { keyPath: 'key' })
        }

        if (!db.objectStoreNames.contains(FEEDBACK_STORE)) {
          const feedbackStore = db.createObjectStore(FEEDBACK_STORE, {
            keyPath: 'id',
          })
          feedbackStore.createIndex('createdAt', 'createdAt', { unique: false })
          feedbackStore.createIndex('type', 'type', { unique: false })
          feedbackStore.createIndex('status', 'status', { unique: false })
        }

        if (!db.objectStoreNames.contains(INTERVIEWS_STORE)) {
          const interviewsStore = db.createObjectStore(INTERVIEWS_STORE, {
            keyPath: 'id',
          })
          interviewsStore.createIndex('email', 'email', { unique: false })
          interviewsStore.createIndex('createdAt', 'createdAt', {
            unique: false,
          })
          interviewsStore.createIndex('status', 'status', { unique: false })
        }

        monitoring.addBreadcrumb('IndexedDB schema upgraded', 'info', {
          oldVersion: event.oldVersion,
          newVersion: event.newVersion,
        })
      }
    })

    return this.initPromise
  }

  /**
   * Get all items from a store
   */
  async getAll<T>(storeName: string): Promise<T[]> {
    await this.init()

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      try {
        const transaction = this.db.transaction(storeName, 'readonly')
        const store = transaction.objectStore(storeName)
        const request = store.getAll()

        request.onsuccess = () => {
          resolve(request.result as T[])
        }

        request.onerror = () => {
          const error = new Error(
            `Failed to get all from ${storeName}: ${request.error?.message}`
          )
          monitoring.logError(error, {
            feature: 'indexeddb',
            action: 'getAll',
            additionalData: { storeName },
          })
          reject(error)
        }
      } catch (error) {
        monitoring.logError(error as Error, {
          feature: 'indexeddb',
          action: 'getAll',
          additionalData: { storeName },
        })
        reject(error)
      }
    })
  }

  /**
   * Get a single item by key
   */
  async get<T>(storeName: string, key: string): Promise<T | undefined> {
    await this.init()

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      try {
        const transaction = this.db.transaction(storeName, 'readonly')
        const store = transaction.objectStore(storeName)
        const request = store.get(key)

        request.onsuccess = () => {
          resolve(request.result as T | undefined)
        }

        request.onerror = () => {
          const error = new Error(
            `Failed to get from ${storeName}: ${request.error?.message}`
          )
          monitoring.logError(error, {
            feature: 'indexeddb',
            action: 'get',
            additionalData: { storeName, key },
          })
          reject(error)
        }
      } catch (error) {
        monitoring.logError(error as Error, {
          feature: 'indexeddb',
          action: 'get',
          additionalData: { storeName, key },
        })
        reject(error)
      }
    })
  }

  /**
   * Put (add or update) an item in a store
   */
  async put<T>(storeName: string, item: T): Promise<void> {
    await this.init()

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      try {
        const transaction = this.db.transaction(storeName, 'readwrite')
        const store = transaction.objectStore(storeName)
        const request = store.put(item)

        request.onsuccess = () => {
          resolve()
        }

        request.onerror = () => {
          const error = new Error(
            `Failed to put into ${storeName}: ${request.error?.message}`
          )
          monitoring.logError(error, {
            feature: 'indexeddb',
            action: 'put',
            additionalData: { storeName },
          })
          reject(error)
        }
      } catch (error) {
        monitoring.logError(error as Error, {
          feature: 'indexeddb',
          action: 'put',
          additionalData: { storeName },
        })
        reject(error)
      }
    })
  }

  /**
   * Delete an item from a store
   */
  async delete(storeName: string, key: string): Promise<void> {
    await this.init()

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      try {
        const transaction = this.db.transaction(storeName, 'readwrite')
        const store = transaction.objectStore(storeName)
        const request = store.delete(key)

        request.onsuccess = () => {
          resolve()
        }

        request.onerror = () => {
          const error = new Error(
            `Failed to delete from ${storeName}: ${request.error?.message}`
          )
          monitoring.logError(error, {
            feature: 'indexeddb',
            action: 'delete',
            additionalData: { storeName, key },
          })
          reject(error)
        }
      } catch (error) {
        monitoring.logError(error as Error, {
          feature: 'indexeddb',
          action: 'delete',
          additionalData: { storeName, key },
        })
        reject(error)
      }
    })
  }

  /**
   * Clear all items from a store
   */
  async clear(storeName: string): Promise<void> {
    await this.init()

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      try {
        const transaction = this.db.transaction(storeName, 'readwrite')
        const store = transaction.objectStore(storeName)
        const request = store.clear()

        request.onsuccess = () => {
          resolve()
        }

        request.onerror = () => {
          const error = new Error(
            `Failed to clear ${storeName}: ${request.error?.message}`
          )
          monitoring.logError(error, {
            feature: 'indexeddb',
            action: 'clear',
            additionalData: { storeName },
          })
          reject(error)
        }
      } catch (error) {
        monitoring.logError(error as Error, {
          feature: 'indexeddb',
          action: 'clear',
          additionalData: { storeName },
        })
        reject(error)
      }
    })
  }

  /**
   * Count items in a store
   */
  async count(storeName: string): Promise<number> {
    await this.init()

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      try {
        const transaction = this.db.transaction(storeName, 'readonly')
        const store = transaction.objectStore(storeName)
        const request = store.count()

        request.onsuccess = () => {
          resolve(request.result)
        }

        request.onerror = () => {
          const error = new Error(
            `Failed to count ${storeName}: ${request.error?.message}`
          )
          monitoring.logError(error, {
            feature: 'indexeddb',
            action: 'count',
            additionalData: { storeName },
          })
          reject(error)
        }
      } catch (error) {
        monitoring.logError(error as Error, {
          feature: 'indexeddb',
          action: 'count',
          additionalData: { storeName },
        })
        reject(error)
      }
    })
  }

  /**
   * Get storage estimate
   */
  async getStorageEstimate(): Promise<{
    usage: number
    quota: number
    usagePercentage: number
  }> {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate()
        const usage = estimate.usage || 0
        const quota = estimate.quota || 0
        const usagePercentage = quota > 0 ? (usage / quota) * 100 : 0

        return { usage, quota, usagePercentage }
      }

      // Fallback if storage estimation is not available
      return {
        usage: 0,
        quota: 0,
        usagePercentage: 0,
      }
    } catch (error) {
      monitoring.logError(error as Error, {
        feature: 'indexeddb',
        action: 'getStorageEstimate',
      })
      return {
        usage: 0,
        quota: 0,
        usagePercentage: 0,
      }
    }
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.db.close()
      this.db = null
      this.initPromise = null
      monitoring.addBreadcrumb('IndexedDB connection closed', 'info')
    }
  }
}

// Export singleton instance
export const indexedDB = new IndexedDBStorage()

// Export store names for consistency
export const STORE_NAMES = {
  NOTES: NOTES_STORE,
  WAITLIST: WAITLIST_STORE,
  METADATA: METADATA_STORE,
  FEEDBACK: FEEDBACK_STORE,
  INTERVIEWS: INTERVIEWS_STORE,
} as const
