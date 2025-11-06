import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Note } from '../types'
import { useAutoSave } from './useAutoSave'

// Mock monitoring module
vi.mock('../utils/monitoring', () => ({
  monitoring: {
    logError: vi.fn(),
    addBreadcrumb: vi.fn(),
  },
}))

// Helper to advance timers without getting stuck
async function advanceTimersAndFlush(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

describe('useAutoSave', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    await vi.runOnlyPendingTimersAsync()
    vi.useRealTimers()
  })

  describe('shallowEqual comparison (via behavior)', () => {
    it('should not trigger save when data has not changed', async () => {
      const mockSave = vi.fn().mockResolvedValue(true)
      const note: Note = {
        id: '1',
        title: 'Test',
        content: 'Content',
        tags: ['tag1'],
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01',
      }

      const { rerender } = renderHook(
        ({ data }) => useAutoSave(data, { onSave: mockSave, delay: 500 }),
        { initialProps: { data: note } }
      )

      // Rerender with same data (different object reference)
      rerender({ data: { ...note } })

      // Fast-forward time
      await vi.advanceTimersByTimeAsync(600)

      // Should not trigger save since data is shallowly equal
      expect(mockSave).not.toHaveBeenCalled()
    })

    it('should trigger save when data has changed', async () => {
      const mockSave = vi.fn().mockResolvedValue(true)
      const note: Note = {
        id: '1',
        title: 'Test',
        content: 'Content',
        tags: ['tag1'],
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01',
      }

      const { rerender } = renderHook(
        ({ data }) => useAutoSave(data, { onSave: mockSave, delay: 500 }),
        { initialProps: { data: note } }
      )

      // Rerender with modified data
      act(() => {
        rerender({ data: { ...note, title: 'Modified' } })
      })

      // Fast-forward time past the delay
      await advanceTimersAndFlush(600)

      await waitFor(() => {
        expect(mockSave).toHaveBeenCalledTimes(1)
        expect(mockSave).toHaveBeenCalledWith({ ...note, title: 'Modified' })
      })
    })

    it('should correctly detect array changes', async () => {
      const mockSave = vi.fn().mockResolvedValue(true)
      const note: Note = {
        id: '1',
        title: 'Test',
        content: 'Content',
        tags: ['tag1', 'tag2'],
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01',
      }

      const { rerender } = renderHook(
        ({ data }) => useAutoSave(data, { onSave: mockSave, delay: 500 }),
        { initialProps: { data: note } }
      )

      // Rerender with same tags (different array reference)
      rerender({ data: { ...note, tags: ['tag1', 'tag2'] } })

      // Fast-forward time
      await vi.advanceTimersByTimeAsync(600)

      // Should not trigger save since tags array is shallowly equal
      expect(mockSave).not.toHaveBeenCalled()
    })

    it('should trigger save when array content changes', async () => {
      const mockSave = vi.fn().mockResolvedValue(true)
      const note: Note = {
        id: '1',
        title: 'Test',
        content: 'Content',
        tags: ['tag1', 'tag2'],
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01',
      }

      const { rerender } = renderHook(
        ({ data }) => useAutoSave(data, { onSave: mockSave, delay: 500 }),
        { initialProps: { data: note } }
      )

      // Rerender with modified tags
      rerender({ data: { ...note, tags: ['tag1', 'tag3'] } })

      // Fast-forward time and run async operations
      await advanceTimersAndFlush(5000)

      await waitFor(() => {
        expect(mockSave).toHaveBeenCalledTimes(1)
      })
    })

    it('should handle optional fields correctly', async () => {
      const mockSave = vi.fn().mockResolvedValue(true)
      const note: Note = {
        id: '1',
        title: 'Test',
        content: 'Content',
        tags: [],
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01',
        wordCount: 10,
      }

      const { rerender } = renderHook(
        ({ data }) => useAutoSave(data, { onSave: mockSave, delay: 500 }),
        { initialProps: { data: note } }
      )

      // Rerender with same data including optional fields
      rerender({ data: { ...note, wordCount: 10 } })

      // Fast-forward time
      await vi.advanceTimersByTimeAsync(600)

      // Should not trigger save since data is equal
      expect(mockSave).not.toHaveBeenCalled()
    })

    it('should detect when optional field value changes', async () => {
      const mockSave = vi.fn().mockResolvedValue(true)
      const note: Note = {
        id: '1',
        title: 'Test',
        content: 'Content',
        tags: [],
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01',
        wordCount: 10,
      }

      const { rerender } = renderHook(
        ({ data }) => useAutoSave(data, { onSave: mockSave, delay: 500 }),
        { initialProps: { data: note } }
      )

      // Rerender with changed optional field
      rerender({ data: { ...note, wordCount: 15 } })

      // Fast-forward time and run async operations
      await advanceTimersAndFlush(5000)

      await waitFor(() => {
        expect(mockSave).toHaveBeenCalledTimes(1)
      })
    })

    it('should handle property order independence', async () => {
      const mockSave = vi.fn().mockResolvedValue(true)

      // Create note with specific property order
      const note1: Note = {
        id: '1',
        title: 'Test',
        content: 'Content',
        tags: ['tag1'],
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01',
      }

      // Create note with different property order but same values
      const note2: Note = {
        updatedAt: '2023-01-01',
        createdAt: '2023-01-01',
        tags: ['tag1'],
        content: 'Content',
        title: 'Test',
        id: '1',
      }

      const { rerender } = renderHook(
        ({ data }) => useAutoSave(data, { onSave: mockSave, delay: 500 }),
        { initialProps: { data: note1 } }
      )

      // Rerender with different property order
      rerender({ data: note2 })

      // Fast-forward time
      await vi.advanceTimersByTimeAsync(600)

      // Should not trigger save since properties are equal regardless of order
      expect(mockSave).not.toHaveBeenCalled()
    })
  })

  describe('basic auto-save functionality', () => {
    it('should trigger save after delay', async () => {
      const mockSave = vi.fn().mockResolvedValue(true)
      const note: Note = {
        id: '1',
        title: 'Test',
        content: 'Content',
        tags: [],
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01',
      }

      // Start with no data, then set data to trigger auto-save
      const { rerender } = renderHook(
        ({ data }) => useAutoSave(data, { onSave: mockSave, delay: 1000 }),
        { initialProps: { data: null } }
      )

      // Now provide data to trigger auto-save
      act(() => {
        rerender({ data: note })
      })

      // Fast-forward time past the delay
      await advanceTimersAndFlush(1100)

      await waitFor(() => {
        expect(mockSave).toHaveBeenCalledTimes(1)
        expect(mockSave).toHaveBeenCalledWith(note)
      })
    })

    it('should debounce multiple changes', async () => {
      const mockSave = vi.fn().mockResolvedValue(true)
      const note1: Note = {
        id: '1',
        title: 'Test 1',
        content: 'Content',
        tags: [],
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01',
      }

      const { rerender } = renderHook(
        ({ data }) => useAutoSave(data, { onSave: mockSave, delay: 500 }),
        { initialProps: { data: note1 } }
      )

      // Make multiple changes rapidly
      rerender({ data: { ...note1, title: 'Test 2' } })
      await vi.advanceTimersByTimeAsync(200)

      rerender({ data: { ...note1, title: 'Test 3' } })
      await vi.advanceTimersByTimeAsync(200)

      rerender({ data: { ...note1, title: 'Test 4' } })

      // Fast-forward to trigger save
      await advanceTimersAndFlush(5000)

      await waitFor(() => {
        // Should only save once with final value
        expect(mockSave).toHaveBeenCalledTimes(1)
        expect(mockSave).toHaveBeenCalledWith({ ...note1, title: 'Test 4' })
      })
    })

    it('should not trigger save when disabled', async () => {
      const mockSave = vi.fn().mockResolvedValue(true)
      const note: Note = {
        id: '1',
        title: 'Test',
        content: 'Content',
        tags: [],
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01',
      }

      const { rerender } = renderHook(
        ({ data }) => useAutoSave(data, { onSave: mockSave, enabled: false }),
        { initialProps: { data: note } }
      )

      rerender({ data: { ...note, title: 'Modified' } })

      // Fast-forward time
      await vi.advanceTimersByTimeAsync(2000)

      // Should not save when disabled
      expect(mockSave).not.toHaveBeenCalled()
    })

    it('should not trigger save when data is null', async () => {
      const mockSave = vi.fn().mockResolvedValue(true)

      renderHook(() => useAutoSave(null, { onSave: mockSave }))

      // Fast-forward time
      await vi.advanceTimersByTimeAsync(2000)

      // Should not save when data is null
      expect(mockSave).not.toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    it('should handle save errors when onSave rejects', async () => {
      const { monitoring } = await import('../utils/monitoring')

      const mockSave = vi.fn().mockRejectedValue(new Error('Save failed'))
      const note: Note = {
        id: '1',
        title: 'Test',
        content: 'Content',
        tags: [],
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01',
      }

      // Start with null then provide data to trigger save
      const { result, rerender } = renderHook(
        ({ data }) => useAutoSave(data, { onSave: mockSave, delay: 500 }),
        { initialProps: { data: null } }
      )

      act(() => {
        rerender({ data: note })
      })

      // Trigger auto-save
      await advanceTimersAndFlush(600)

      await waitFor(() => {
        expect(result.current.isSaving).toBe(false)
        expect(result.current.saveSuccess).toBe(false)
      })

      // Verify monitoring.logError was called
      expect(monitoring.logError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Save failed' }),
        expect.objectContaining({
          feature: 'auto_save',
          action: 'perform_save',
        })
      )
    })

    it('should handle save errors when onSave returns false', async () => {
      const { monitoring } = await import('../utils/monitoring')

      const mockSave = vi.fn().mockResolvedValue(false)
      const note: Note = {
        id: '1',
        title: 'Test',
        content: 'Content',
        tags: [],
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01',
      }

      const { result, rerender } = renderHook(
        ({ data }) => useAutoSave(data, { onSave: mockSave, delay: 500 }),
        { initialProps: { data: null } }
      )

      act(() => {
        rerender({ data: note })
      })

      // Trigger auto-save
      await advanceTimersAndFlush(600)

      await waitFor(() => {
        expect(result.current.saveSuccess).toBe(false)
      })

      // Verify monitoring breadcrumb was called for failure
      expect(monitoring.addBreadcrumb).toHaveBeenCalledWith(
        'Auto-save failed',
        'warning'
      )
    })

    it('should call onSaveComplete callback with false on error', async () => {
      const mockSave = vi.fn().mockRejectedValue(new Error('Save failed'))
      const mockOnSaveComplete = vi.fn()
      const note: Note = {
        id: '1',
        title: 'Test',
        content: 'Content',
        tags: [],
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01',
      }

      const { rerender } = renderHook(
        ({ data }) =>
          useAutoSave(data, {
            onSave: mockSave,
            delay: 500,
            onSaveComplete: mockOnSaveComplete,
          }),
        { initialProps: { data: null } }
      )

      act(() => {
        rerender({ data: note })
      })

      // Trigger auto-save
      await advanceTimersAndFlush(600)

      await waitFor(() => {
        expect(mockOnSaveComplete).toHaveBeenCalledWith(false)
      })
    })
  })

  describe('debounce cleanup on unmount', () => {
    it('should cancel pending save when unmounted', async () => {
      const mockSave = vi.fn().mockResolvedValue(true)
      const note: Note = {
        id: '1',
        title: 'Test',
        content: 'Content',
        tags: [],
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01',
      }

      const { unmount } = renderHook(() =>
        useAutoSave(note, { onSave: mockSave, delay: 1000 })
      )

      // Advance time partway through delay
      await vi.advanceTimersByTimeAsync(500)

      // Unmount before save triggers
      unmount()

      // Advance past the original save time
      await vi.advanceTimersByTimeAsync(600)

      // Save should not have been called
      expect(mockSave).not.toHaveBeenCalled()
    })

    it('should cancel pending save on data change before delay completes', async () => {
      const mockSave = vi.fn().mockResolvedValue(true)
      const note1: Note = {
        id: '1',
        title: 'Test 1',
        content: 'Content',
        tags: [],
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01',
      }

      const { rerender } = renderHook(
        ({ data }) => useAutoSave(data, { onSave: mockSave, delay: 1000 }),
        { initialProps: { data: note1 } }
      )

      // Advance time partway through delay
      await vi.advanceTimersByTimeAsync(500)

      // Change data, which should cancel previous timer
      rerender({ data: { ...note1, title: 'Test 2' } })

      // Advance to where first save would have triggered
      await vi.advanceTimersByTimeAsync(600)

      // Should not have saved yet
      expect(mockSave).not.toHaveBeenCalled()

      // Advance to complete new delay
      await advanceTimersAndFlush(5000)

      // Now save should trigger with updated data
      await waitFor(() => {
        expect(mockSave).toHaveBeenCalledTimes(1)
        expect(mockSave).toHaveBeenCalledWith(
          expect.objectContaining({ title: 'Test 2' })
        )
      })
    })
  })

  describe('monitoring integration', () => {
    it('should add breadcrumb on successful save', async () => {
      const { monitoring } = await import('../utils/monitoring')

      const mockSave = vi.fn().mockResolvedValue(true)
      const note: Note = {
        id: '1',
        title: 'Test',
        content: 'Content',
        tags: [],
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01',
      }

      const { rerender } = renderHook(
        ({ data }) => useAutoSave(data, { onSave: mockSave, delay: 500 }),
        { initialProps: { data: null } }
      )

      act(() => {
        rerender({ data: note })
      })

      // Trigger auto-save
      await advanceTimersAndFlush(600)

      await waitFor(() => {
        expect(monitoring.addBreadcrumb).toHaveBeenCalledWith(
          'Auto-save successful',
          'info'
        )
      })
    })

    it('should add breadcrumb when save already in progress', async () => {
      const { monitoring } = await import('../utils/monitoring')

      const mockSave = vi
        .fn()
        .mockImplementation(
          () => new Promise(resolve => setTimeout(() => resolve(true), 200))
        )
      const note: Note = {
        id: '1',
        title: 'Test',
        content: 'Content',
        tags: [],
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01',
      }

      const { result, rerender } = renderHook(
        ({ data }) => useAutoSave(data, { onSave: mockSave, delay: 100 }),
        { initialProps: { data: null } }
      )

      // Provide data to trigger save
      act(() => {
        rerender({ data: note })
      })

      // Advance past delay to trigger save
      await advanceTimersAndFlush(150)

      await waitFor(() => {
        expect(result.current.isSaving).toBe(true)
      })

      // Try to trigger another save while first is in progress
      await result.current.triggerSave()

      // Should have logged warning breadcrumb
      expect(monitoring.addBreadcrumb).toHaveBeenCalledWith(
        'Save already in progress, skipping',
        'warning'
      )
    })

    it('should log error with context when save fails', async () => {
      const { monitoring } = await import('../utils/monitoring')

      const testError = new Error('Network error')
      const mockSave = vi.fn().mockRejectedValue(testError)
      const note: Note = {
        id: '1',
        title: 'Test',
        content: 'Content',
        tags: [],
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01',
      }

      const { rerender } = renderHook(
        ({ data }) => useAutoSave(data, { onSave: mockSave, delay: 500 }),
        { initialProps: { data: null } }
      )

      act(() => {
        rerender({ data: note })
      })

      // Trigger auto-save
      await advanceTimersAndFlush(600)

      await waitFor(() => {
        expect(monitoring.logError).toHaveBeenCalledWith(testError, {
          feature: 'auto_save',
          action: 'perform_save',
        })
      })
    })
  })

  describe('manual save', () => {
    it('should allow manual save trigger', async () => {
      const mockSave = vi.fn().mockResolvedValue(true)
      const note: Note = {
        id: '1',
        title: 'Test',
        content: 'Content',
        tags: [],
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01',
      }

      const { result } = renderHook(() =>
        useAutoSave(note, { onSave: mockSave })
      )

      await result.current.triggerSave()

      expect(mockSave).toHaveBeenCalledTimes(1)
      expect(mockSave).toHaveBeenCalledWith(note)
    })

    it('should handle errors when manual save (triggerSave) rejects', async () => {
      const { monitoring } = await import('../utils/monitoring')

      const testError = new Error('Manual save failed')
      const mockSave = vi.fn().mockRejectedValue(testError)
      const note: Note = {
        id: '1',
        title: 'Test',
        content: 'Content',
        tags: [],
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01',
      }

      const { result } = renderHook(() =>
        useAutoSave(note, { onSave: mockSave })
      )

      // Trigger manual save
      await result.current.triggerSave()

      // Verify the mock was called
      expect(mockSave).toHaveBeenCalledTimes(1)
      expect(mockSave).toHaveBeenCalledWith(note)

      // Wait for hook state to update after error
      await waitFor(() => {
        expect(result.current.isSaving).toBe(false)
        expect(result.current.saveSuccess).toBe(false)
      })

      // Verify error was logged to monitoring
      await waitFor(() => {
        expect(monitoring.logError).toHaveBeenCalledWith(
          testError,
          expect.objectContaining({
            feature: 'auto_save',
            action: 'perform_save',
          })
        )
      })
    })

    it('should handle errors when manual save throws synchronously', async () => {
      const { monitoring } = await import('../utils/monitoring')

      const testError = new Error('Synchronous error')
      const mockSave = vi.fn().mockImplementation(() => {
        throw testError
      })
      const note: Note = {
        id: '1',
        title: 'Test',
        content: 'Content',
        tags: [],
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01',
      }

      const { result } = renderHook(() =>
        useAutoSave(note, { onSave: mockSave })
      )

      // Trigger manual save - should handle synchronous throw
      await result.current.triggerSave()

      // Verify save was attempted
      expect(mockSave).toHaveBeenCalledTimes(1)

      // Verify hook reflects error state
      await waitFor(() => {
        expect(result.current.isSaving).toBe(false)
        expect(result.current.saveSuccess).toBe(false)
      })

      // Verify error was logged
      await waitFor(() => {
        expect(monitoring.logError).toHaveBeenCalledWith(
          testError,
          expect.objectContaining({
            feature: 'auto_save',
            action: 'perform_save',
          })
        )
      })
    })
  })

  describe('save state tracking', () => {
    it('should track saving state', async () => {
      const mockSave = vi
        .fn()
        .mockImplementation(
          () => new Promise(resolve => setTimeout(() => resolve(true), 100))
        )
      const note: Note = {
        id: '1',
        title: 'Test',
        content: 'Content',
        tags: [],
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01',
      }

      const { result, rerender } = renderHook(
        ({ data }: { data: Note | null }) =>
          useAutoSave(data, { onSave: mockSave, delay: 100 }),
        { initialProps: { data: null as Note | null } }
      )

      expect(result.current.isSaving).toBe(false)

      // Provide data to trigger save
      act(() => {
        rerender({ data: note as Note | null })
      })

      // Advance to trigger save
      await advanceTimersAndFlush(150)

      await waitFor(() => {
        expect(result.current.isSaving).toBe(true)
      })

      // Wait for save to complete
      await advanceTimersAndFlush(200)

      await waitFor(() => {
        expect(result.current.isSaving).toBe(false)
        expect(result.current.saveSuccess).toBe(true)
      })
    })

    it('should track save failure', async () => {
      const mockSave = vi.fn().mockResolvedValue(false)
      const note: Note = {
        id: '1',
        title: 'Test',
        content: 'Content',
        tags: [],
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01',
      }

      const { result, rerender } = renderHook(
        ({ data }: { data: Note | null }) =>
          useAutoSave(data, { onSave: mockSave, delay: 100 }),
        { initialProps: { data: null as Note | null } }
      )

      act(() => {
        rerender({ data: note as Note | null })
      })

      // Trigger save
      await advanceTimersAndFlush(200)

      await waitFor(() => {
        expect(result.current.saveSuccess).toBe(false)
      })
    })

    it('should handle save rejection with error', async () => {
      const mockSave = vi.fn().mockRejectedValue(new Error('save failed'))
      const note: Note = {
        id: '1',
        title: 'Test',
        content: 'Content',
        tags: [],
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01',
      }

      const { result, rerender } = renderHook(
        ({ data }: { data: Note | null }) =>
          useAutoSave(data, { onSave: mockSave, delay: 100 }),
        { initialProps: { data: null as Note | null } }
      )

      expect(result.current.isSaving).toBe(false)
      expect(result.current.saveSuccess).toBe(null)

      // Provide data to trigger save
      act(() => {
        rerender({ data: note as Note | null })
      })

      // Advance timers to trigger the save and let it complete
      await advanceTimersAndFlush(200)

      // Wait for save to complete with error
      await waitFor(() => {
        expect(result.current.isSaving).toBe(false)
        expect(result.current.saveSuccess).toBe(false)
      })

      // Verify the mock was called
      expect(mockSave).toHaveBeenCalledTimes(1)
      expect(mockSave).toHaveBeenCalledWith(note)
    })
  })
})
