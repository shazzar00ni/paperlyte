import { monitoring } from './monitoring'

/**
 * @fileoverview
 * This file provides a singleton wrapper around the IndexedDB API to simplify its usage.
 * It handles database initialization, schema creation/migration, and provides promisified
 * methods for common database operations (CRUD).
 */

// Define database constants to ensure consistency.
const DB_NAME = 'paperlyte_db'
const DB_VERSION = 1
const NOTES_STORE = 'notes'
const WAITLIST_STORE = 'waitlist'
const METADATA_STORE = 'metadata'

/**
 * @interface IDBConfig
 * @description Optional configuration for the IndexedDBStorage instance.
 */
export interface IDBConfig {
  dbName?: string
  version?: number
}

/**
 * @class IndexedDBStorage
 * @description A wrapper class for IndexedDB that simplifies database operations.
 * It manages the database connection, schema, and provides easy-to-use async methods.
 */
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
   * @method init
   * @description Initializes and opens the IndexedDB database.
   * This method is idempotent; it can be called multiple times but will only initialize the database once.
   * It also handles the creation and upgrading of the database schema.
   * @returns {Promise<void>} A promise that resolves when the database is successfully opened.
   */
  async init(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise
    }
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

      // This event is triggered only when the database version changes.
      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create the object stores (tables) and their indexes.
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

        monitoring.addBreadcrumb('IndexedDB schema upgraded', 'info', {
          oldVersion: event.oldVersion,
          newVersion: event.newVersion,
        })
      }
    })

    return this.initPromise
  }

  /**
   * @method getAll
   * @description Retrieves all items from a specified object store.
   * @param {string} storeName - The name of the object store.
   * @returns {Promise<T[]>} A promise that resolves with an array of items.
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
   * @method get
   * @description Retrieves a single item from an object store by its key.
   * @param {string} storeName - The name of the object store.
   * @param {string} key - The key of the item to retrieve.
   * @returns {Promise<T | undefined>} A promise that resolves with the item, or undefined if not found.
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
   * @method put
   * @description Adds a new item or updates an existing item in an object store.
   * @param {string} storeName - The name of the object store.
   * @param {T} item - The item to add or update.
   * @returns {Promise<void>} A promise that resolves when the operation is complete.
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
   * @method delete
   * @description Deletes an item from an object store by its key.
   * @param {string} storeName - The name of the object store.
   * @param {string} key - The key of the item to delete.
   * @returns {Promise<void>} A promise that resolves when the operation is complete.
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
   * @method clear
   * @description Clears all items from an object store.
   * @param {string} storeName - The name of the object store to clear.
   * @returns {Promise<void>} A promise that resolves when the operation is complete.
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
   * @method count
   * @description Counts the number of items in an object store.
   * @param {string} storeName - The name of the object store.
   * @returns {Promise<number>} A promise that resolves with the total number of items.
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
   * @method getStorageEstimate
   * @description Estimates the storage usage and quota for the application's origin.
   * Uses the `navigator.storage.estimate()` API if available.
   * @returns {Promise<{ usage: number; quota: number; usagePercentage: number }>} An object with storage details.
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
      return { usage: 0, quota: 0, usagePercentage: 0 }
    } catch (error) {
      monitoring.logError(error as Error, {
        feature: 'indexeddb',
        action: 'getStorageEstimate',
      })
      return { usage: 0, quota: 0, usagePercentage: 0 }
    }
  }

  /**
   * @method close
   * @description Closes the database connection.
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

// Export a singleton instance of the storage wrapper to be used throughout the application.
export const indexedDB = new IndexedDBStorage()

// Export store names as a constant object to ensure consistency and prevent typos.
export const STORE_NAMES = {
  NOTES: NOTES_STORE,
  WAITLIST: WAITLIST_STORE,
  METADATA: METADATA_STORE,
} as const
