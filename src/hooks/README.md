# Custom React Hooks

This directory contains reusable custom React hooks for Paperlyte.

## `useKeyboardShortcut`

A custom hook for registering keyboard shortcuts that automatically handles both Ctrl (Windows/Linux) and Cmd (Mac) modifiers.

### Usage

```typescript
import { useKeyboardShortcut } from '../hooks/useKeyboardShortcut'

function MyComponent() {
  // Basic usage - Cmd/Ctrl + S
  useKeyboardShortcut('s', () => {
    console.log('Save triggered!')
  }, { ctrl: true })

  // With shift modifier - Cmd/Ctrl + Shift + S
  useKeyboardShortcut('s', () => {
    console.log('Save As triggered!')
  }, { ctrl: true, shift: true })

  // Conditionally enabled
  const [isEnabled, setIsEnabled] = useState(true)
  useKeyboardShortcut('n', createNewNote, {
    ctrl: true,
    enabled: isEnabled
  })

  return <div>My Component</div>
}
```

### Parameters

- `key` (string): The key to listen for (e.g., 's', 'n', 'f')
- `callback` (function): Function to call when shortcut is pressed
- `options` (object):
  - `ctrl` (boolean, default: true): Require Ctrl/Cmd key
  - `shift` (boolean, default: false): Require Shift key
  - `alt` (boolean, default: false): Require Alt key
  - `enabled` (boolean, default: true): Whether the shortcut is active

### Features

- ✅ Cross-platform: Automatically handles Ctrl (Windows/Linux) and Cmd (Mac)
- ✅ Smart input detection: Ignores shortcuts when typing in text fields (except Cmd+S, Cmd+N)
- ✅ Prevents default browser behavior
- ✅ Easy to enable/disable dynamically
- ✅ Multiple modifiers support (Ctrl + Shift + Alt combinations)

### Best Practices

1. **Keep shortcuts consistent**: Use the same key combinations as popular applications (e.g., Cmd+S for save)
2. **Allow Cmd+S everywhere**: Users expect Cmd+S to work even when typing in an editor
3. **Provide visual hints**: Show keyboard shortcuts in tooltips and placeholders
4. **Document shortcuts**: Keep the keyboard shortcuts reference updated

### Examples in Paperlyte

See `src/pages/NoteEditor.tsx` for implementation examples:

- Cmd+N: Create new note
- Cmd+S: Save current note
- Cmd+F: Focus search input
