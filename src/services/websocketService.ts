import type { Note } from '../types'
import { monitoring } from '../utils/monitoring'

/**
 * WebSocket Service - Manages real-time sync via WebSocket connection
 *
 * Features:
 * - Auto-reconnection with exponential backoff
 * - Heartbeat/ping-pong mechanism
 * - Connection state management
 * - Event-based architecture for real-time updates
 * - Graceful degradation when WebSocket unavailable
 *
 * @example
 * ```typescript
 * // Initialize and connect
 * await websocketService.connect('wss://api.paperlyte.com/sync')
 *
 * // Listen for note updates
 * websocketService.on('note_updated', (note) => {
 *   console.log('Note updated:', note)
 * })
 *
 * // Send note update
 * websocketService.send('note_update', { noteId: '123', content: 'New content' })
 *
 * // Disconnect
 * websocketService.disconnect()
 * ```
 */

export type ConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error'

export type WebSocketEvent =
  | 'note_updated'
  | 'note_deleted'
  | 'sync_required'
  | 'connection_state_changed'
  | 'error'

export interface WebSocketMessage<T = unknown> {
  type: string
  payload: T
  timestamp: string
}

export interface NoteUpdatePayload {
  note: Note
  userId?: string
}

export interface NoteDeletePayload {
  noteId: string
  userId?: string
}

export interface SyncRequiredPayload {
  reason: string
}

// Event handler type
type EventHandler<T = unknown> = (data: T) => void

class WebSocketService {
  private ws: WebSocket | null = null
  private wsUrl: string | null = null
  private connectionState: ConnectionState = 'disconnected'
  private reconnectAttempts = 0
  private maxReconnectAttempts = 10
  private reconnectDelay = 1000 // Start with 1 second
  private maxReconnectDelay = 30000 // Max 30 seconds
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null
  private heartbeatTimeout: ReturnType<typeof setTimeout> | null = null
  private readonly heartbeatIntervalMs = 30000 // Send ping every 30s
  private readonly heartbeatTimeoutMs = 5000 // Expect pong within 5s
  private eventHandlers: Map<string, Set<EventHandler>> = new Map()
  private isManualDisconnect = false

  /**
   * Connect to WebSocket server
   *
   * @param url - WebSocket server URL (e.g., 'wss://api.paperlyte.com/sync')
   * @param token - Optional authentication token
   */
  async connect(url: string, token?: string): Promise<boolean> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      monitoring.addBreadcrumb('WebSocket already connected', 'info')
      return true
    }

    this.wsUrl = url
    this.isManualDisconnect = false
    this.setConnectionState('connecting')

    return new Promise((resolve, reject) => {
      try {
        // Append token to URL if provided
        const wsUrl = token ? `${url}?token=${encodeURIComponent(token)}` : url
        this.ws = new WebSocket(wsUrl)

        // Set up event listeners
        this.ws.onopen = () => {
          monitoring.addBreadcrumb('WebSocket connected', 'info', { url })
          this.setConnectionState('connected')
          this.reconnectAttempts = 0
          this.reconnectDelay = 1000
          this.startHeartbeat()
          resolve(true)
        }

        this.ws.onmessage = event => {
          this.handleMessage(event)
        }

        this.ws.onerror = error => {
          monitoring.logError(new Error('WebSocket error'), {
            feature: 'websocket_service',
            action: 'connection_error',
            additionalData: { error: String(error) },
          })
          this.setConnectionState('error')
        }

        this.ws.onclose = event => {
          monitoring.addBreadcrumb('WebSocket closed', 'info', {
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean,
          })
          this.stopHeartbeat()

          // Only attempt reconnection if not manually disconnected
          if (!this.isManualDisconnect) {
            this.handleReconnection()
          } else {
            this.setConnectionState('disconnected')
          }
        }

        // Set connection timeout
        const connectionTimeout = setTimeout(() => {
          if (this.ws?.readyState !== WebSocket.OPEN) {
            this.ws?.close()
            reject(new Error('WebSocket connection timeout'))
          }
        }, 10000) // 10 second timeout

        // Clear timeout once connected
        this.ws.addEventListener(
          'open',
          () => {
            clearTimeout(connectionTimeout)
          },
          { once: true }
        )
      } catch (error) {
        monitoring.logError(error as Error, {
          feature: 'websocket_service',
          action: 'connect',
        })
        this.setConnectionState('error')
        reject(error)
      }
    })
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.isManualDisconnect = true
    this.stopHeartbeat()
    this.clearReconnectTimeout()

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect')
      this.ws = null
    }

    this.setConnectionState('disconnected')
    monitoring.addBreadcrumb('WebSocket manually disconnected', 'info')
  }

  /**
   * Send message to WebSocket server
   *
   * @param type - Message type
   * @param payload - Message payload
   */
  send<T = unknown>(type: string, payload: T): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      monitoring.addBreadcrumb(
        'Cannot send message: WebSocket not connected',
        'warning',
        { type }
      )
      return false
    }

    try {
      const message: WebSocketMessage<T> = {
        type,
        payload,
        timestamp: new Date().toISOString(),
      }

      this.ws.send(JSON.stringify(message))
      monitoring.addBreadcrumb('WebSocket message sent', 'info', { type })
      return true
    } catch (error) {
      monitoring.logError(error as Error, {
        feature: 'websocket_service',
        action: 'send_message',
        additionalData: { type },
      })
      return false
    }
  }

  /**
   * Register event handler
   *
   * @param event - Event name
   * @param handler - Event handler function
   */
  on<T = unknown>(event: WebSocketEvent, handler: EventHandler<T>): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set())
    }
    this.eventHandlers.get(event)!.add(handler as EventHandler)
  }

  /**
   * Unregister event handler
   *
   * @param event - Event name
   * @param handler - Event handler function
   */
  off<T = unknown>(event: WebSocketEvent, handler: EventHandler<T>): void {
    const handlers = this.eventHandlers.get(event)
    if (handlers) {
      handlers.delete(handler as EventHandler)
    }
  }

  /**
   * Get current connection state
   */
  getConnectionState(): ConnectionState {
    return this.connectionState
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return (
      this.ws?.readyState === WebSocket.OPEN &&
      this.connectionState === 'connected'
    )
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data)

      // Handle heartbeat pong
      if (message.type === 'pong') {
        this.handlePong()
        return
      }

      // Emit event to registered handlers
      this.emit(message.type as WebSocketEvent, message.payload)

      monitoring.addBreadcrumb('WebSocket message received', 'info', {
        type: message.type,
      })
    } catch (error) {
      monitoring.logError(error as Error, {
        feature: 'websocket_service',
        action: 'handle_message',
      })
    }
  }

  /**
   * Emit event to all registered handlers
   */
  private emit<T = unknown>(event: WebSocketEvent, data: T): void {
    const handlers = this.eventHandlers.get(event)
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data)
        } catch (error) {
          monitoring.logError(error as Error, {
            feature: 'websocket_service',
            action: 'emit_event',
            additionalData: { event },
          })
        }
      })
    }
  }

  /**
   * Update connection state and notify listeners
   */
  private setConnectionState(state: ConnectionState): void {
    const previousState = this.connectionState
    this.connectionState = state

    if (previousState !== state) {
      this.emit('connection_state_changed', {
        previousState,
        currentState: state,
      })

      monitoring.addBreadcrumb('WebSocket connection state changed', 'info', {
        from: previousState,
        to: state,
      })
    }
  }

  /**
   * Handle reconnection with exponential backoff
   */
  private handleReconnection(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      monitoring.addBreadcrumb('Max reconnection attempts reached', 'warning', {
        attempts: this.reconnectAttempts,
      })
      this.setConnectionState('error')
      return
    }

    this.setConnectionState('reconnecting')
    this.reconnectAttempts++

    // Calculate delay with exponential backoff
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.maxReconnectDelay
    )

    monitoring.addBreadcrumb('Scheduling WebSocket reconnection', 'info', {
      attempt: this.reconnectAttempts,
      delay,
    })

    this.reconnectTimeout = setTimeout(() => {
      if (this.wsUrl && !this.isManualDisconnect) {
        monitoring.addBreadcrumb('Attempting WebSocket reconnection', 'info', {
          attempt: this.reconnectAttempts,
        })
        this.connect(this.wsUrl).catch(error => {
          monitoring.logError(error as Error, {
            feature: 'websocket_service',
            action: 'reconnect',
            additionalData: { attempt: this.reconnectAttempts },
          })
        })
      }
    }, delay)
  }

  /**
   * Clear reconnection timeout
   */
  private clearReconnectTimeout(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }
  }

  /**
   * Start heartbeat mechanism
   */
  private startHeartbeat(): void {
    this.stopHeartbeat()

    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        // Send ping
        this.send('ping', { timestamp: Date.now() })

        // Set timeout to expect pong
        this.heartbeatTimeout = setTimeout(() => {
          monitoring.addBreadcrumb(
            'Heartbeat timeout - no pong received',
            'warning'
          )
          // Close connection to trigger reconnection
          this.ws?.close(1000, 'Heartbeat timeout')
        }, this.heartbeatTimeoutMs)
      }
    }, this.heartbeatIntervalMs)
  }

  /**
   * Stop heartbeat mechanism
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }

    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout)
      this.heartbeatTimeout = null
    }
  }

  /**
   * Handle pong response from server
   */
  private handlePong(): void {
    // Clear heartbeat timeout since we received pong
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout)
      this.heartbeatTimeout = null
    }
  }

  /**
   * Reset reconnection state (useful for testing)
   */
  resetReconnectionState(): void {
    this.reconnectAttempts = 0
    this.reconnectDelay = 1000
    this.clearReconnectTimeout()
  }
}

// Export singleton instance
export const websocketService = new WebSocketService()

// Export for testing
export default websocketService
