---
title: '[BUG] Vitest experiencing memory issues preventing test execution'
labels: ['bug', 'testing', 'high-priority']
assignees: ''
---

## Problem Description

The test suite is experiencing JavaScript heap out of memory errors when running with Vitest, preventing any tests from executing successfully.

## Error Details

```
FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory
```

## Steps to Reproduce

1. Run `npm test` or `npx vitest run`
2. Observe memory allocation failure during test discovery/execution

## Environment

- Node.js: v22.17.1
- Vitest: v3.2.4
- OS: macOS
- Project: React 18 + TypeScript + Vite

## Current Test Setup

- **Test files created**:
  - `src/services/__tests__/dataService.test.ts`
  - `src/components/__tests__/WaitlistModal.test.tsx`
  - `src/test/basic.test.ts`
- **Configuration**: `vite.config.ts` with Vitest setup
- **Dependencies installed**: @testing-library/react, jsdom, etc.

## Investigation Needed

1. **Memory configuration**: Try different Node.js heap sizes
2. **Vitest configuration**: Investigate test environment setup
3. **Dependencies conflict**: Check for memory leaks in test dependencies
4. **Alternative solutions**: Consider Jest migration if Vitest issues persist

## Acceptance Criteria

- [ ] Tests run successfully without memory errors
- [ ] All existing test files execute properly
- [ ] Test suite can be run in CI/CD environment
- [ ] Memory usage is reasonable for project size

## Priority

**High** - Blocking development workflow and code quality assurance.

## Additional Context

Test infrastructure is properly set up with:

- TypeScript support
- React Testing Library
- Mock setup for localStorage and crypto APIs
- Proper test isolation and cleanup

The issue appears to be environmental rather than code-related, as even basic tests fail to execute.
