import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts } from '../useKeyboardShortcuts';

describe('useKeyboardShortcuts', () => {
  it('should handle shortcuts with the "+" key', () => {
    const handler = jest.fn();
    renderHook(() => useKeyboardShortcuts([{ key: 'ctrl++', handler }]));

    const event = new KeyboardEvent('keydown', { key: '+', ctrlKey: true });
    document.dispatchEvent(event);

    expect(handler).toHaveBeenCalledTimes(1);
  });
});
