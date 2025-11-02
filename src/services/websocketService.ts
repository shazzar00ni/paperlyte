/**
 * WebSocket Service for Real-Time Note Synchronization
 *
 * CURRENT IMPLEMENTATION: Simulated WebSocket for offline-first development
 * FUTURE MIGRATION: Will connect to real WebSocket server when backend is ready
 *
 * Features:
 * - Auto-reconnection on connection loss
 * - Heartbeat/ping-pong to detect dead connections
 * - Graceful degradation when offline
 * - Event-based architecture for easy integration
 */

import { monitoring } from '../utils/monitoring'
import type { Note } from '../types'

export type WebSocketStatus =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'reconnecting'
  | 'error'

export type WebSocketEventType =
  | 'status_change'
  | 'note_update'
  | 'note_delete'
  | 'sync_complete'
  | 'error'

interface WebSocketMessage {
  type: string
  payload: any
  timestamp: string
}

type WebSocketEventHandler = (data: any) => void

class WebSocketService {
  private ws: WebSocket | null = null
  private url: string = ''
  private status: WebSocketStatus = 'disconnected'
  private reconnectAttempts: number = 0
  private maxReconnectAttempts: number = 5
  private reconnectDelay: number = 1000 // Start with 1 second
  private maxReconnectDelay: number = 30000 // Max 30 seconds
  private reconnectTimeout: NodeJS.Timeout | null = null
  private heartbeatInterval: NodeJS.Timeout | null = null
  private heartbeatTimeout: NodeJS.Timeout | null = null
  private eventHandlers: Map<WebSocketEventType, Set<WebSocketEventHandler>> =
    new Map()
  private isSimulated: boolean = true // For MVP, simulate WebSocket

  /**
   * Initialize WebSocket connection
   * For MVP, this simulates a connection
   */
  connect(url: string = 'ws://localhost:8080/notes'): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      monitoring.addBreadcrumb('WebSocket already connected', 'info')
      return
    }

    this.url = url
    this.setStatus('connecting')

    if (this.isSimulated) {
      // Simulate successful connection
      setTimeout(() => {
        this.setStatus('connected')
        this.reconnectAttempts = 0
        this.startHeartbeat()
        monitoring.addBreadcrumb('Simulated WebSocket connected', 'info')
      }, 500)
      return
    }

    try {
      this.ws = new WebSocket(url)

      this.ws.onopen = () => {
        this.setStatus('connected')
        this.reconnectAttempts = 0
        this.reconnectDelay = 1000
        this.startHeartbeat()
        monitoring.addBreadcrumb('WebSocket connected', 'info', { url })
      }

      this.ws.onmessage = (event: MessageEvent) => {
        this.handleMessage(event.data)
      }

      this.ws.onerror = () => {
        this.setStatus('error')
        monitoring.logError(new Error('WebSocket error'), {
          feature: 'websocket',
          action: 'connection_error',
        })
        this.emit('error', { error: 'Connection error' })
      }

      this.ws.onclose = () => {
        this.setStatus('disconnected')
        this.stopHeartbeat()
        monitoring.addBreadcrumb('WebSocket disconnected', 'warning')
        this.attemptReconnect()
      }
    } catch (error) {
      this.setStatus('error')
      monitoring.logError(error as Error, {
        feature: 'websocket',
        action: 'connect',
      })
      this.attemptReconnect()
    }
  }

  /**
   * Disconnect WebSocket
   */
  disconnect(): void {
    this.stopHeartbeat()
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }

    if (this.ws) {
      this.ws.close()
      this.ws = null
    }

    this.setStatus('disconnected')
    monitoring.addBreadcrumb('WebSocket disconnected manually', 'info')
  }

  /**
   * Send note update through WebSocket
   */
  sendNoteUpdate(note: Note): void {
    if (this.isSimulated) {
      // Simulate sending
      monitoring.addBreadcrumb('Simulated note update sent', 'info', {
        noteId: note.id,
      })
      // Simulate receiving confirmation
      setTimeout(() => {
        this.emit('sync_complete', { noteId: note.id, success: true })
      }, 100)
      return
    }

    if (this.status !== 'connected' || !this.ws) {
      monitoring.addBreadcrumb(
        'Cannot send - WebSocket not connected',
        'warning'
      )
      return
    }

    const message: WebSocketMessage = {
      type: 'note_update',
      payload: note,
      timestamp: new Date().toISOString(),
    }

    try {
      this.ws.send(JSON.stringify(message))
      monitoring.addBreadcrumb('Note update sent via WebSocket', 'info', {
        noteId: note.id,
      })
    } catch (error) {
      monitoring.logError(error as Error, {
        feature: 'websocket',
        action: 'send_note_update',
        additionalData: { noteId: note.id },
      })
    }
  }

  /**
   * Send note delete through WebSocket
   */
  sendNoteDelete(noteId: string): void {
    if (this.isSimulated) {
      monitoring.addBreadcrumb('Simulated note delete sent', 'info', { noteId })
      return
    }

    if (this.status !== 'connected' || !this.ws) {
      monitoring.addBreadcrumb(
        'Cannot send - WebSocket not connected',
        'warning'
      )
      return
    }

    const message: WebSocketMessage = {
      type: 'note_delete',
      payload: { noteId },
      timestamp: new Date().toISOString(),
    }

    try {
      this.ws.send(JSON.stringify(message))
      monitoring.addBreadcrumb('Note delete sent via WebSocket', 'info', {
        noteId,
      })
    } catch (error) {
      monitoring.logError(error as Error, {
        feature: 'websocket',
        action: 'send_note_delete',
        additionalData: { noteId },
      })
    }
  }

  /**
   * Get current connection status
   */
  getStatus(): WebSocketStatus {
    return this.status
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.status === 'connected'
  }

  /**
   * Subscribe to WebSocket events
   */
  on(event: WebSocketEventType, handler: WebSocketEventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set())
    }
    this.eventHandlers.get(event)!.add(handler)
  }

  /**
   * Unsubscribe from WebSocket events
   */
  off(event: WebSocketEventType, handler: WebSocketEventHandler): void {
    const handlers = this.eventHandlers.get(event)
    if (handlers) {
      handlers.delete(handler)
    }
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(data: string): void {
    try {
      const message: WebSocketMessage = JSON.parse(data)

      switch (message.type) {
        case 'note_update':
          this.emit('note_update', message.payload)
          break
        case 'note_delete':
          this.emit('note_delete', message.payload)
          break
        case 'sync_complete':
          this.emit('sync_complete', message.payload)
          break
        case 'pong':
          // Heartbeat response
          this.resetHeartbeatTimeout()
          break
        default:
          monitoring.addBreadcrumb(
            'Unknown WebSocket message type',
            'warning',
            {
              type: message.type,
            }
          )
      }
    } catch (error) {
      monitoring.logError(error as Error, {
        feature: 'websocket',
        action: 'handle_message',
      })
    }
  }

  /**
   * Emit event to all registered handlers
   */
  private emit(event: WebSocketEventType, data: any): void {
    const handlers = this.eventHandlers.get(event)
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data)
        } catch (error) {
          monitoring.logError(error as Error, {
            feature: 'websocket',
            action: 'emit_event',
            additionalData: { event },
          })
        }
      })
    }
  }

  /**
   * Update connection status and notify listeners
   */
  private setStatus(status: WebSocketStatus): void {
    if (this.status !== status) {
      this.status = status
      this.emit('status_change', { status })
      monitoring.addBreadcrumb('WebSocket status changed', 'info', { status })
    }
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      monitoring.addBreadcrumb('Max reconnection attempts reached', 'warning', {
        attempts: this.reconnectAttempts,
      })
      this.setStatus('error')
      return
    }

    this.setStatus('reconnecting')
    this.reconnectAttempts++

    // Exponential backoff
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.maxReconnectDelay
    )

    monitoring.addBreadcrumb('Attempting reconnection', 'info', {
      attempt: this.reconnectAttempts,
      delayMs: delay,
    })

    this.reconnectTimeout = setTimeout(() => {
      this.connect(this.url)
    }, delay)
  }

  /**
   * Start heartbeat to detect dead connections
   */
  private startHeartbeat(): void {
    if (this.isSimulated) return // No heartbeat needed for simulation

    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(
          JSON.stringify({ type: 'ping', timestamp: new Date().toISOString() })
        )

        // Set timeout for pong response
        this.heartbeatTimeout = setTimeout(() => {
          monitoring.addBreadcrumb(
            'Heartbeat timeout - closing connection',
            'warning'
          )
          this.ws?.close()
        }, 5000) // 5 second timeout
      }
    }, 30000) // Send ping every 30 seconds
  }

  /**
   * Stop heartbeat
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
   * Reset heartbeat timeout after receiving pong
   */
  private resetHeartbeatTimeout(): void {
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout)
      this.heartbeatTimeout = null
    }
  }
}

// Export singleton instance
export const websocketService = new WebSocketService()

// Export for testing
export default websocketService
