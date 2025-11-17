# WebSocket Real-Time Sync

This document describes the WebSocket real-time synchronization feature implemented for Paperlyte.

## Overview

The WebSocket service provides real-time bidirectional communication between the client and server, enabling instant synchronization of notes across devices and sessions. The implementation includes auto-reconnection with exponential backoff, heartbeat mechanism, and comprehensive error handling.

## Architecture

### Components

1. **WebSocket Service** (`src/services/websocketService.ts`)
   - Core WebSocket connection management
   - Auto-reconnection with exponential backoff
   - Heartbeat/ping-pong mechanism
   - Event-based pub/sub system

2. **Sync Engine Integration** (`src/services/syncEngine.ts`)
   - Integration with existing sync engine
   - Real-time note update handlers
   - Callback system for components

## Features

### Connection Management

- **Auto-connect**: Establishes WebSocket connection to specified server URL
- **Authentication**: Supports token-based authentication via Sec-WebSocket-Protocol header (secure, not exposed in URLs or logs)
- **Connection timeout**: 10-second timeout for initial connection
- **State tracking**: Monitors connection state (disconnected, connecting, connected, reconnecting, error)

### Auto-Reconnection

The service automatically attempts to reconnect when the connection is lost:

- **Exponential backoff**: Delays increase from 1s to 30s maximum
- **Max attempts**: Stops after 10 failed reconnection attempts
- **Smart retry**: Only reconnects on unintentional disconnections

### Heartbeat Mechanism

Maintains connection health through periodic ping/pong:

- **Ping interval**: Every 30 seconds
- **Pong timeout**: Expects response within 5 seconds
- **Auto-recovery**: Closes and reconnects if heartbeat fails

### Event System

Event-driven architecture for handling real-time updates:

```typescript
// Supported events
type WebSocketEvent =
  | 'note_updated' // Note was updated on server
  | 'note_deleted' // Note was deleted on server
  | 'sync_required' // Full sync needed
  | 'connection_state_changed' // Connection state changed
  | 'error' // Error occurred
```

## Usage

### Basic Setup

```typescript
import { syncEngine } from './services/syncEngine'

// Enable real-time sync
const wsUrl = 'wss://api.paperlyte.com/sync'
const token = 'your-auth-token' // Optional

const connected = await syncEngine.enableRealtimeSync(wsUrl, token)

if (connected) {
  console.log('Real-time sync enabled')
}
```

### Receiving Real-time Updates

```typescript
// Register callback for note updates
syncEngine.onRealtimeUpdate(note => {
  console.log('Note updated:', note)
  // Update your UI with the new note data
})

// Unregister callback when component unmounts
syncEngine.offRealtimeUpdate(callback)
```

### Sending Updates

```typescript
// Send note update to server
const note = {
  id: 'note-123',
  title: 'Updated Title',
  content: 'Updated content',
  // ... other note properties
}

syncEngine.sendNoteUpdate(note)

// Send note deletion
syncEngine.sendNoteDelete('note-123', 'user-id')
```

### Checking Connection Status

```typescript
// Check if real-time sync is active
if (syncEngine.isRealtimeSyncActive()) {
  console.log('Real-time sync is active')
}

// Get detailed connection state
const state = syncEngine.getRealtimeConnectionState()
// Returns: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error'
```

### Disabling Real-time Sync

```typescript
// Disconnect and disable real-time sync
syncEngine.disableRealtimeSync()
```

## Message Format

### Client → Server

```typescript
{
  "type": "note_update" | "note_delete" | "ping",
  "payload": {
    // Event-specific data
  },
  "timestamp": "2025-01-17T14:27:39.502Z"
}
```

#### Note Update Message

```json
{
  "type": "note_update",
  "payload": {
    "note": {
      "id": "note-123",
      "title": "My Note",
      "content": "Note content",
      "tags": ["tag1", "tag2"],
      "createdAt": "2025-01-17T14:00:00.000Z",
      "updatedAt": "2025-01-17T14:27:39.502Z"
    },
    "userId": "user-123"
  },
  "timestamp": "2025-01-17T14:27:39.502Z"
}
```

#### Note Delete Message

```json
{
  "type": "note_delete",
  "payload": {
    "noteId": "note-123",
    "userId": "user-123"
  },
  "timestamp": "2025-01-17T14:27:39.502Z"
}
```

### Server → Client

```typescript
{
  "type": "note_updated" | "note_deleted" | "sync_required" | "pong",
  "payload": {
    // Event-specific data
  },
  "timestamp": "2025-01-17T14:27:39.502Z"
}
```

#### Note Updated Message

```json
{
  "type": "note_updated",
  "payload": {
    "note": {
      "id": "note-123",
      "title": "Updated Note",
      "content": "Updated content",
      "tags": ["tag1"],
      "createdAt": "2025-01-17T14:00:00.000Z",
      "updatedAt": "2025-01-17T14:30:00.000Z"
    },
    "userId": "user-456"
  },
  "timestamp": "2025-01-17T14:30:00.000Z"
}
```

#### Sync Required Message

```json
{
  "type": "sync_required",
  "payload": {
    "reason": "server_update"
  },
  "timestamp": "2025-01-17T14:27:39.502Z"
}
```

## Configuration

### Connection Settings

```typescript
// In websocketService.ts
private reconnectDelay = 1000          // Initial reconnection delay (1s)
private maxReconnectDelay = 30000      // Maximum reconnection delay (30s)
private maxReconnectAttempts = 10      // Max reconnection attempts
private heartbeatIntervalMs = 30000    // Heartbeat interval (30s)
private heartbeatTimeoutMs = 5000      // Heartbeat timeout (5s)
```

### Customizing Settings

To customize these settings, modify the constants in `websocketService.ts` or extend the service:

```typescript
class CustomWebSocketService extends WebSocketService {
  constructor() {
    super()
    this.maxReconnectDelay = 60000 // 60 seconds
    this.maxReconnectAttempts = 20 // 20 attempts
  }
}
```

## Error Handling

The service includes comprehensive error handling:

1. **Connection errors**: Logged and trigger reconnection
2. **Message parsing errors**: Caught and logged without disrupting the service
3. **Handler errors**: Individual handler errors don't affect other handlers
4. **Network errors**: Automatically trigger reconnection logic

All errors are integrated with Sentry monitoring for tracking and debugging.

## Monitoring and Logging

### Breadcrumbs

The service adds breadcrumbs for key events:

- Connection state changes
- Message send/receive
- Reconnection attempts
- Heartbeat timeouts

### Error Logging

Errors are logged with context:

- Feature: `websocket_service` or `sync_engine`
- Action: Specific operation that failed
- Additional data: Relevant context

## Testing

### Unit Tests

Run WebSocket service tests:

```bash
npm test src/services/__tests__/websocketService.test.ts
```

### Integration Tests

Run SyncEngine WebSocket integration tests:

```bash
npm test src/services/__tests__/syncEngine.websocket.test.ts
```

### Test Coverage

- Connection management (connect, disconnect, timeout)
- Auto-reconnection with exponential backoff
- Heartbeat mechanism (ping/pong)
- Message sending and receiving
- Event handlers (register, unregister, multiple handlers)
- Error handling (connection failures, malformed messages)
- Connection state transitions

## Browser Compatibility

WebSocket is supported in all modern browsers:

- Chrome 16+
- Firefox 11+
- Safari 7+
- Edge (all versions)
- Opera 12.1+

For older browsers, the application gracefully degrades to polling-based sync.

## Security Considerations

1. **Authentication**: Always use authentication tokens for WebSocket connections. Tokens are sent via Sec-WebSocket-Protocol header (not in URL parameters) to prevent exposure in server logs and intermediaries.
2. **WSS Protocol**: Use secure WebSocket (wss://) in production
3. **Input Validation**: Both client and server validate all incoming messages against expected schema. Messages with missing or invalid fields are rejected.
4. **Rate Limiting**: Server should implement rate limiting per connection
5. **Token Expiration**: Handle token expiration and refresh gracefully
6. **Message Schema Validation**: All incoming WebSocket messages are validated before processing to prevent malformed or malicious data from causing application errors

## Future Enhancements

Potential improvements for future versions:

1. **Compression**: Add WebSocket message compression
2. **Binary Protocol**: Use binary format (e.g., Protocol Buffers) for efficiency
3. **Presence**: Add user presence indicators
4. **Collaborative Editing**: Real-time collaborative note editing
5. **Push Notifications**: Integrate with browser push notifications
6. **Metrics**: Add detailed connection metrics and analytics

## Troubleshooting

### Connection Issues

**Problem**: WebSocket fails to connect

- Check server URL and authentication token
- Verify network connectivity
- Check browser console for errors
- Ensure server is running and accessible

**Problem**: Frequent reconnections

- Check network stability
- Verify server health
- Review heartbeat timeout settings
- Check server logs for issues

### Performance Issues

**Problem**: High memory usage

- Check for memory leaks in event handlers
- Verify cleanup of event listeners on unmount
- Monitor WebSocket message frequency

**Problem**: Slow message delivery

- Check network latency
- Verify server processing time
- Consider message batching for high-frequency updates

## Support

For issues or questions:

- GitHub Issues: https://github.com/shazzar00ni/paperlyte/issues
- Documentation: https://github.com/shazzar00ni/paperlyte/docs

## License

This implementation is part of Paperlyte and is licensed under the MIT License.
