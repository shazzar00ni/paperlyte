import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest'
import { syncEngine } from '../syncEngine'
import { websocketService } from '../websocketService'
import type { Note } from '../../types'

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3

  readyState = MockWebSocket.CONNECTING
  url: string
  protocol: string | string[]
  onopen: ((event: Event) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null

  constructor(url: string, protocols?: string | string[]) {
    this.url = url
    this.protocol = protocols || ''
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN
      if (this.onopen) {
        this.onopen(new Event('open'))
      }
    }, 0)
  }

  send(): void {
    // Mock send
  }

  close(code?: number, reason?: string): void {
    this.readyState = MockWebSocket.CLOSED
    if (this.onclose) {
      this.onclose(
        new CloseEvent('close', {
          code: code || 1000,
          reason: reason || '',
          wasClean: true,
        })
      )
    }
  }

  addEventListener(
    type: string,
    listener: EventListener,
    options?: { once?: boolean }
  ): void {
    if (type === 'open' && this.onopen === null) {
      this.onopen = listener as (event: Event) => void
      if (options?.once && this.readyState === MockWebSocket.OPEN) {
        setTimeout(() => {
          if (this.onopen) {
            this.onopen(new Event('open'))
          }
        }, 0)
      }
    }
  }

  removeEventListener(): void {
    // Mock implementation
  }
}

global.WebSocket = MockWebSocket as unknown as typeof WebSocket

// Mock IndexedDB to force localStorage usage
vi.mock('../../utils/dataMigration', () => ({
  isIndexedDBAvailable: () => false,
}))

describe('SyncEngine - WebSocket Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    websocketService.disconnect()
    websocketService.resetReconnectionState()
    syncEngine.disableRealtimeSync()
  })

  afterEach(() => {
    websocketService.disconnect()
    syncEngine.disableRealtimeSync()
  })

  describe('Real-time Sync Enablement', () => {
    it('should enable real-time sync successfully', async () => {
      const result = await syncEngine.enableRealtimeSync('wss://test.com')

      expect(result).toBe(true)
      expect(syncEngine.isRealtimeSyncActive()).toBe(true)
    })

    it('should enable real-time sync with authentication token', async () => {
      const result = await syncEngine.enableRealtimeSync(
        'wss://test.com',
        'test-token'
      )

      expect(result).toBe(true)
      expect(syncEngine.isRealtimeSyncActive()).toBe(true)
    })

    it('should disable real-time sync', async () => {
      await syncEngine.enableRealtimeSync('wss://test.com')

      syncEngine.disableRealtimeSync()

      expect(syncEngine.isRealtimeSyncActive()).toBe(false)
    })

    it('should report correct connection state', async () => {
      expect(syncEngine.getRealtimeConnectionState()).toBe('disconnected')

      await syncEngine.enableRealtimeSync('wss://test.com')

      expect(syncEngine.getRealtimeConnectionState()).toBe('connected')
    })
  })

  describe('Sending Updates via WebSocket', () => {
    beforeEach(async () => {
      await syncEngine.enableRealtimeSync('wss://test.com')
    })

    it('should send note update when real-time sync is active', () => {
      const testNote: Note = {
        id: 'note-1',
        title: 'Test Note',
        content: 'Test content',
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const result = syncEngine.sendNoteUpdate(testNote)
      expect(result).toBe(true)
    })

    it('should send note deletion when real-time sync is active', () => {
      const result = syncEngine.sendNoteDelete('note-1', 'user-1')
      expect(result).toBe(true)
    })

    it('should not send updates when real-time sync is disabled', () => {
      syncEngine.disableRealtimeSync()

      const testNote: Note = {
        id: 'note-1',
        title: 'Test Note',
        content: 'Test content',
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const result = syncEngine.sendNoteUpdate(testNote)
      expect(result).toBe(false)
    })

    it('should not send deletions when real-time sync is disabled', () => {
      syncEngine.disableRealtimeSync()

      const result = syncEngine.sendNoteDelete('note-1')
      expect(result).toBe(false)
    })
  })

  describe('Receiving Real-time Updates', () => {
    beforeEach(async () => {
      await syncEngine.enableRealtimeSync('wss://test.com')
    })

    it('should receive and handle real-time note updates', async () => {
      const callback = vi.fn()
      syncEngine.onRealtimeUpdate(callback)

      const updatedNote: Note = {
        id: 'note-1',
        title: 'Updated Note',
        content: 'Updated content',
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      // Simulate incoming WebSocket message
      const ws = (websocketService as any).ws
      if (ws && ws.onmessage) {
        ws.onmessage(
          new MessageEvent('message', {
            data: JSON.stringify({
              type: 'note_updated',
              payload: { note: updatedNote },
              timestamp: new Date().toISOString(),
            }),
          })
        )
      }

      expect(callback).toHaveBeenCalledWith(updatedNote)
    })

    it('should support multiple callbacks for real-time updates', async () => {
      const callback1 = vi.fn()
      const callback2 = vi.fn()

      syncEngine.onRealtimeUpdate(callback1)
      syncEngine.onRealtimeUpdate(callback2)

      const updatedNote: Note = {
        id: 'note-1',
        title: 'Updated Note',
        content: 'Updated content',
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const ws = (websocketService as any).ws
      if (ws && ws.onmessage) {
        ws.onmessage(
          new MessageEvent('message', {
            data: JSON.stringify({
              type: 'note_updated',
              payload: { note: updatedNote },
              timestamp: new Date().toISOString(),
            }),
          })
        )
      }

      expect(callback1).toHaveBeenCalledTimes(1)
      expect(callback2).toHaveBeenCalledTimes(1)
    })

    it('should unregister callbacks correctly', async () => {
      const callback = vi.fn()
      syncEngine.onRealtimeUpdate(callback)
      syncEngine.offRealtimeUpdate(callback)

      const updatedNote: Note = {
        id: 'note-1',
        title: 'Updated Note',
        content: 'Updated content',
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const ws = (websocketService as any).ws
      if (ws && ws.onmessage) {
        ws.onmessage(
          new MessageEvent('message', {
            data: JSON.stringify({
              type: 'note_updated',
              payload: { note: updatedNote },
              timestamp: new Date().toISOString(),
            }),
          })
        )
      }

      expect(callback).not.toHaveBeenCalled()
    })

    it('should handle real-time note deletions', async () => {
      const ws = (websocketService as any).ws
      if (ws && ws.onmessage) {
        ws.onmessage(
          new MessageEvent('message', {
            data: JSON.stringify({
              type: 'note_deleted',
              payload: { noteId: 'note-1', userId: 'user-1' },
              timestamp: new Date().toISOString(),
            }),
          })
        )
      }

      // Should not throw error
      expect(true).toBe(true)
    })

    it('should handle sync required events', async () => {
      const ws = (websocketService as any).ws
      if (ws && ws.onmessage) {
        ws.onmessage(
          new MessageEvent('message', {
            data: JSON.stringify({
              type: 'sync_required',
              payload: { reason: 'server_update' },
              timestamp: new Date().toISOString(),
            }),
          })
        )
      }

      // Should not throw error
      expect(true).toBe(true)
    })
  })

  describe('Connection State Management', () => {
    it('should handle connection state changes', async () => {
      await syncEngine.enableRealtimeSync('wss://test.com')

      expect(syncEngine.getRealtimeConnectionState()).toBe('connected')

      // Simulate disconnection
      syncEngine.disableRealtimeSync()

      expect(syncEngine.getRealtimeConnectionState()).toBe('disconnected')
    })

    it('should not be active when WebSocket disconnects', async () => {
      await syncEngine.enableRealtimeSync('wss://test.com')

      expect(syncEngine.isRealtimeSyncActive()).toBe(true)

      // Simulate connection loss
      const ws = (websocketService as any).ws
      if (ws && ws.onclose) {
        ws.onclose(
          new CloseEvent('close', { code: 1006, reason: '', wasClean: false })
        )
      }

      expect(syncEngine.isRealtimeSyncActive()).toBe(false)
    })
  })

  describe('Error Handling', () => {
    it('should handle failed connection attempts gracefully', async () => {
      // Mock WebSocket to fail immediately
      class FailingMockWebSocket extends MockWebSocket {
        constructor(url: string, protocols?: string | string[]) {
          super(url, protocols)
          setTimeout(() => {
            this.readyState = MockWebSocket.CLOSED
            if (this.onerror) {
              this.onerror(new Event('error'))
            }
            if (this.onclose) {
              this.onclose(
                new CloseEvent('close', {
                  code: 1006,
                  reason: 'Connection failed',
                  wasClean: false,
                })
              )
            }
          }, 0)
        }
      }

      global.WebSocket = FailingMockWebSocket as unknown as typeof WebSocket

      // Should not throw, just return false
      const result = await syncEngine.enableRealtimeSync('wss://test.com')
      expect(result).toBe(false)
      expect(syncEngine.isRealtimeSyncActive()).toBe(false)
    })

    it('should handle callback errors gracefully', async () => {
      await syncEngine.enableRealtimeSync('wss://test.com')

      const faultyCallback = vi.fn(() => {
        throw new Error('Callback error')
      })
      const goodCallback = vi.fn()

      syncEngine.onRealtimeUpdate(faultyCallback)
      syncEngine.onRealtimeUpdate(goodCallback)

      const updatedNote: Note = {
        id: 'note-1',
        title: 'Updated Note',
        content: 'Updated content',
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const ws = (websocketService as any).ws
      if (ws && ws.onmessage) {
        ws.onmessage(
          new MessageEvent('message', {
            data: JSON.stringify({
              type: 'note_updated',
              payload: { note: updatedNote },
              timestamp: new Date().toISOString(),
            }),
          })
        )
      }

      // Both callbacks should be called despite error in first one
      expect(faultyCallback).toHaveBeenCalled()
      expect(goodCallback).toHaveBeenCalled()
    })
  })
})
