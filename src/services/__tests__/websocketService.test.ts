import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest'
import {
  websocketService,
  type ConnectionState,
  type WebSocketMessage,
} from '../websocketService'

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
    // Simulate async connection
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN
      if (this.onopen) {
        this.onopen(new Event('open'))
      }
    }, 0)
  }

  send(data: string): void {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket is not open')
    }
    // Simulate successful send
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

// Replace global WebSocket with mock
global.WebSocket = MockWebSocket as unknown as typeof WebSocket

describe('WebSocketService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    websocketService.disconnect()
    websocketService.resetReconnectionState()
  })

  afterEach(() => {
    vi.useRealTimers()
    websocketService.disconnect()
  })

  describe('Connection Management', () => {
    it('should connect to WebSocket server', async () => {
      const connectPromise = websocketService.connect('wss://test.com')

      // Fast-forward timers to trigger onopen
      await vi.runAllTimersAsync()

      const result = await connectPromise
      expect(result).toBe(true)
      expect(websocketService.getConnectionState()).toBe('connected')
      expect(websocketService.isConnected()).toBe(true)
    })

    it('should connect with authentication token', async () => {
      const connectPromise = websocketService.connect(
        'wss://test.com',
        'test-token'
      )

      await vi.runAllTimersAsync()
      await connectPromise

      expect(websocketService.isConnected()).toBe(true)
    })

    it('should not connect if already connected', async () => {
      await websocketService.connect('wss://test.com')
      await vi.runAllTimersAsync()

      const result = await websocketService.connect('wss://test.com')
      expect(result).toBe(true)
    })

    it('should disconnect from WebSocket server', async () => {
      await websocketService.connect('wss://test.com')
      await vi.runAllTimersAsync()

      websocketService.disconnect()

      expect(websocketService.getConnectionState()).toBe('disconnected')
      expect(websocketService.isConnected()).toBe(false)
    })

    it('should transition through connection states', async () => {
      const states: ConnectionState[] = []
      websocketService.on('connection_state_changed', (data: any) => {
        states.push(data.currentState)
      })

      const connectPromise = websocketService.connect('wss://test.com')
      await vi.runAllTimersAsync()
      await connectPromise

      expect(states).toContain('connecting')
      expect(states).toContain('connected')
    })
  })

  describe('Message Handling', () => {
    beforeEach(async () => {
      await websocketService.connect('wss://test.com')
      await vi.runAllTimersAsync()
    })

    it('should send message when connected', () => {
      const result = websocketService.send('test_message', {
        data: 'test',
      })

      expect(result).toBe(true)
    })

    it('should not send message when disconnected', () => {
      websocketService.disconnect()

      const result = websocketService.send('test_message', {
        data: 'test',
      })

      expect(result).toBe(false)
    })

    it('should receive and handle messages', async () => {
      const handler = vi.fn()
      websocketService.on('note_updated', handler)

      // Simulate incoming message
      const message: WebSocketMessage = {
        type: 'note_updated',
        payload: { noteId: '123', title: 'Updated Note' },
        timestamp: new Date().toISOString(),
      }

      // Access private ws property for testing
      const ws = (websocketService as any).ws
      if (ws && ws.onmessage) {
        ws.onmessage(
          new MessageEvent('message', { data: JSON.stringify(message) })
        )
      }

      expect(handler).toHaveBeenCalledWith(message.payload)
    })

    it('should handle multiple event handlers', async () => {
      const handler1 = vi.fn()
      const handler2 = vi.fn()

      websocketService.on('note_updated', handler1)
      websocketService.on('note_updated', handler2)

      const message: WebSocketMessage = {
        type: 'note_updated',
        payload: { noteId: '123' },
        timestamp: new Date().toISOString(),
      }

      const ws = (websocketService as any).ws
      if (ws && ws.onmessage) {
        ws.onmessage(
          new MessageEvent('message', { data: JSON.stringify(message) })
        )
      }

      expect(handler1).toHaveBeenCalledTimes(1)
      expect(handler2).toHaveBeenCalledTimes(1)
    })

    it('should unregister event handlers', async () => {
      const handler = vi.fn()
      websocketService.on('note_updated', handler)
      websocketService.off('note_updated', handler)

      const message: WebSocketMessage = {
        type: 'note_updated',
        payload: { noteId: '123' },
        timestamp: new Date().toISOString(),
      }

      const ws = (websocketService as any).ws
      if (ws && ws.onmessage) {
        ws.onmessage(
          new MessageEvent('message', { data: JSON.stringify(message) })
        )
      }

      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe('Auto-Reconnection', () => {
    it('should attempt reconnection on connection loss', async () => {
      await websocketService.connect('wss://test.com')
      await vi.runAllTimersAsync()

      // Simulate connection loss
      const ws = (websocketService as any).ws
      if (ws && ws.onclose) {
        ws.onclose(
          new CloseEvent('close', { code: 1006, reason: '', wasClean: false })
        )
      }

      expect(websocketService.getConnectionState()).toBe('reconnecting')
    })

    it('should use exponential backoff for reconnection', async () => {
      await websocketService.connect('wss://test.com')
      await vi.runAllTimersAsync()

      // Force multiple connection failures
      for (let i = 0; i < 3; i++) {
        const ws = (websocketService as any).ws
        if (ws && ws.onclose) {
          ws.onclose(
            new CloseEvent('close', { code: 1006, reason: '', wasClean: false })
          )
        }
        await vi.advanceTimersByTimeAsync(1000 * Math.pow(2, i))
      }

      // Should be in reconnecting state
      expect(websocketService.getConnectionState()).toBe('reconnecting')
    })

    it('should not reconnect after manual disconnect', async () => {
      await websocketService.connect('wss://test.com')
      await vi.runAllTimersAsync()

      websocketService.disconnect()

      // Connection should be disconnected, not reconnecting
      expect(websocketService.getConnectionState()).toBe('disconnected')

      // Advance timers to check no reconnection happens
      await vi.advanceTimersByTimeAsync(5000)
      expect(websocketService.getConnectionState()).toBe('disconnected')
    })

    it('should stop reconnecting after max attempts', async () => {
      // Set up connection
      await websocketService.connect('wss://test.com')
      await vi.runAllTimersAsync()

      // Mock WebSocket to fail connections
      class FailingMockWebSocket extends MockWebSocket {
        constructor(url: string) {
          super(url)
          setTimeout(() => {
            this.readyState = MockWebSocket.CLOSED
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

      // Trigger multiple reconnection attempts
      for (let i = 0; i < 11; i++) {
        const ws = (websocketService as any).ws
        if (ws && ws.onclose) {
          ws.onclose(
            new CloseEvent('close', { code: 1006, reason: '', wasClean: false })
          )
        }
        await vi.advanceTimersByTimeAsync(30000) // Max delay
      }

      // Should transition to error state after max attempts
      expect(websocketService.getConnectionState()).toBe('error')
    })
  })

  describe('Heartbeat Mechanism', () => {
    beforeEach(async () => {
      await websocketService.connect('wss://test.com')
      await vi.runAllTimersAsync()
    })

    it('should send ping messages periodically', async () => {
      const sendSpy = vi.spyOn(websocketService, 'send')

      // Advance timer to trigger heartbeat
      await vi.advanceTimersByTimeAsync(30000)

      expect(sendSpy).toHaveBeenCalledWith('ping', expect.any(Object))
    })

    it('should handle pong responses', async () => {
      // Send heartbeat
      await vi.advanceTimersByTimeAsync(30000)

      // Simulate pong response
      const message: WebSocketMessage = {
        type: 'pong',
        payload: {},
        timestamp: new Date().toISOString(),
      }

      const ws = (websocketService as any).ws
      if (ws && ws.onmessage) {
        ws.onmessage(
          new MessageEvent('message', { data: JSON.stringify(message) })
        )
      }

      // Should not disconnect after receiving pong
      expect(websocketService.isConnected()).toBe(true)
    })

    it('should disconnect on heartbeat timeout', async () => {
      // Send heartbeat
      await vi.advanceTimersByTimeAsync(30000)

      // Don't send pong, wait for timeout
      await vi.advanceTimersByTimeAsync(5000)

      // Connection should be closed
      expect(websocketService.isConnected()).toBe(false)
    })

    it('should stop heartbeat on disconnect', () => {
      websocketService.disconnect()

      // Advance timer past heartbeat interval
      vi.advanceTimersByTime(30000)

      // No ping should be sent after disconnect
      const sendSpy = vi.spyOn(websocketService, 'send')
      expect(sendSpy).not.toHaveBeenCalled()
    })
  })

  describe('Connection State', () => {
    it('should return correct connection state', async () => {
      expect(websocketService.getConnectionState()).toBe('disconnected')

      const connectPromise = websocketService.connect('wss://test.com')
      expect(websocketService.getConnectionState()).toBe('connecting')

      await vi.runAllTimersAsync()
      await connectPromise

      expect(websocketService.getConnectionState()).toBe('connected')
    })

    it('should report connected status correctly', async () => {
      expect(websocketService.isConnected()).toBe(false)

      await websocketService.connect('wss://test.com')
      await vi.runAllTimersAsync()

      expect(websocketService.isConnected()).toBe(true)

      websocketService.disconnect()
      expect(websocketService.isConnected()).toBe(false)
    })
  })

  describe('Error Handling', () => {
    it('should handle WebSocket errors', async () => {
      await websocketService.connect('wss://test.com')
      await vi.runAllTimersAsync()

      const ws = (websocketService as any).ws
      if (ws && ws.onerror) {
        ws.onerror(new Event('error'))
      }

      expect(websocketService.getConnectionState()).toBe('error')
    })

    it('should handle malformed messages', async () => {
      await websocketService.connect('wss://test.com')
      await vi.runAllTimersAsync()

      const handler = vi.fn()
      websocketService.on('note_updated', handler)

      // Send invalid JSON
      const ws = (websocketService as any).ws
      if (ws && ws.onmessage) {
        ws.onmessage(new MessageEvent('message', { data: 'invalid json' }))
      }

      // Handler should not be called
      expect(handler).not.toHaveBeenCalled()
    })

    it('should handle handler errors gracefully', async () => {
      await websocketService.connect('wss://test.com')
      await vi.runAllTimersAsync()

      const faultyHandler = vi.fn(() => {
        throw new Error('Handler error')
      })
      const goodHandler = vi.fn()

      websocketService.on('note_updated', faultyHandler)
      websocketService.on('note_updated', goodHandler)

      const message: WebSocketMessage = {
        type: 'note_updated',
        payload: { noteId: '123' },
        timestamp: new Date().toISOString(),
      }

      const ws = (websocketService as any).ws
      if (ws && ws.onmessage) {
        ws.onmessage(
          new MessageEvent('message', { data: JSON.stringify(message) })
        )
      }

      // Both handlers should be called despite error in first one
      expect(faultyHandler).toHaveBeenCalled()
      expect(goodHandler).toHaveBeenCalled()
    })
  })

  describe('Connection Timeout', () => {
    it('should timeout if connection takes too long', async () => {
      // Mock WebSocket that never connects
      class SlowMockWebSocket extends MockWebSocket {
        constructor(url: string, protocols?: string | string[]) {
          super(url, protocols)
          // Don't call onopen
        }
      }

      global.WebSocket = SlowMockWebSocket as unknown as typeof WebSocket

      const connectPromise = websocketService.connect('wss://test.com')

      // Advance past connection timeout
      await vi.advanceTimersByTimeAsync(10000)

      await expect(connectPromise).rejects.toThrow('connection timeout')
    })
  })

  describe('Message Validation', () => {
    beforeEach(async () => {
      await websocketService.connect('wss://test.com')
      await vi.runAllTimersAsync()
    })

    it('should reject messages with missing type field', async () => {
      const handler = vi.fn()
      websocketService.on('note_updated', handler)

      const ws = (websocketService as any).ws
      if (ws && ws.onmessage) {
        ws.onmessage(
          new MessageEvent('message', {
            data: JSON.stringify({
              payload: { test: 'data' },
              timestamp: new Date().toISOString(),
            }),
          })
        )
      }

      expect(handler).not.toHaveBeenCalled()
    })

    it('should reject messages with missing timestamp field', async () => {
      const handler = vi.fn()
      websocketService.on('note_updated', handler)

      const ws = (websocketService as any).ws
      if (ws && ws.onmessage) {
        ws.onmessage(
          new MessageEvent('message', {
            data: JSON.stringify({
              type: 'note_updated',
              payload: { test: 'data' },
            }),
          })
        )
      }

      expect(handler).not.toHaveBeenCalled()
    })

    it('should reject messages with missing payload field', async () => {
      const handler = vi.fn()
      websocketService.on('note_updated', handler)

      const ws = (websocketService as any).ws
      if (ws && ws.onmessage) {
        ws.onmessage(
          new MessageEvent('message', {
            data: JSON.stringify({
              type: 'note_updated',
              timestamp: new Date().toISOString(),
            }),
          })
        )
      }

      expect(handler).not.toHaveBeenCalled()
    })

    it('should accept valid messages', async () => {
      const handler = vi.fn()
      websocketService.on('note_updated', handler)

      const message: WebSocketMessage = {
        type: 'note_updated',
        payload: { test: 'data' },
        timestamp: new Date().toISOString(),
      }

      const ws = (websocketService as any).ws
      if (ws && ws.onmessage) {
        ws.onmessage(
          new MessageEvent('message', { data: JSON.stringify(message) })
        )
      }

      expect(handler).toHaveBeenCalledWith(message.payload)
    })
  })
})
