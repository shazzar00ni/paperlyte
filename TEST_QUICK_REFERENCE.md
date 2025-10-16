# Quick Reference: Running the New Tests

## Test Files Created

1. **`tests/helpers/__tests__/lighthouseHelper.test.js`** (713 lines, 46 tests).
   - Tests for Lighthouse CI result parsing.
   - Performance target validation.
   - Mock data generation.

2. **`scripts/__tests__/performance-audit.test.js`** (662 lines, 45 tests).
   - Tests for performance audit orchestration.
   - Build, preview, and Lighthouse execution.
   - Process lifecycle and cleanup.

## Running Tests

```bash
# Run all tests
npm test

# Run only the new tests
npm test tests/helpers/__tests__/lighthouseHelper.test.js
npm test scripts/__tests__/performance-audit.test.js

# Run with coverage
npm run test:coverage

# Run in watch mode (useful for development)
npm run test:watch

# Run all tests (unit + e2e)
npm run test:all
```

## Test Results

Total: **91 test cases** covering:
- ✅ 46 tests for Lighthouse helper utilities.
- ✅ 45 tests for performance audit script.

## Coverage Areas

### Lighthouse Helper
- File reading and parsing.
- Error handling (missing files, invalid JSON).
- Performance target extraction.
- Mock data generation.
- Score rounding and validation.

### Performance Audit
- Build process orchestration.
- Server startup and health checks.
- Lighthouse CI execution.
- Process cleanup and signal handling.
- Full workflow integration.
- Error scenarios and timeouts.

## Test Quality

- **Clear naming conventions** - Each test describes what it validates.
- **Comprehensive mocking** - File system, processes, network calls.
- **Proper cleanup** - No test pollution between runs.
- **Edge case coverage** - Null, undefined, errors, timeouts.
- **Integration tests** - Verify components work together.

## Troubleshooting

If tests fail:
1. Check that all dependencies are installed: `npm install`.
2. Verify Node version: `node --version` (requires >=16.0.0).
3. Clear cache: `npm run clean && npm install`.
4. Check for conflicting processes on port 4173.

## Integration with CI/CD

These tests are automatically run by:
- `npm run ci` - Runs lint, type-check, tests, and build.
- `npm run test:ci` - Runs tests in CI mode.
- GitHub Actions (if configured).