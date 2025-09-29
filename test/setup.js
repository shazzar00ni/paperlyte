// Jest setup: keep console available but quiet in tests
const realConsole = { ...console };
global.console = {
  ...realConsole,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};