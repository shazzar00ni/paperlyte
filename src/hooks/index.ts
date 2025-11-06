/**
 * Custom hooks barrel export
 *
 * Centralized export point for all custom hooks in the application.
 */

export { useNoteOperations } from './useNoteOperations'
export type { UseNoteOperationsReturn } from './useNoteOperations'

export {
  useKeyboardShortcut,
  useKeyboardShortcuts,
} from './useKeyboardShortcuts'
export type { KeyboardShortcut } from './useKeyboardShortcuts'

export { useAutoSave } from './useAutoSave'
export type { UseAutoSaveOptions, UseAutoSaveReturn } from './useAutoSave'

export { useFocusMode } from './useFocusMode'
export type { UseFocusModeOptions, UseFocusModeReturn } from './useFocusMode'

export { useAsyncOperation, useAsyncOperations } from './useAsyncOperation'
export type {
  AsyncOperationOptions,
  AsyncOperationState,
  UseAsyncOperationReturn,
} from './useAsyncOperation'
