// Jest setup: keep console available but quiet in tests
import { vi } from 'vitest';
const realConsole = { ...console };
global.console = {
  ...realConsole,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};