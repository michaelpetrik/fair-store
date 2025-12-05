# Testing Guide

## Overview

This document describes the testing strategy and tools for the Fair Store Chrome extension.

---

## Test Commands

```bash
# Run all tests once
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run mutation testing (requires compatible Vitest version)
npm run test:mutation
```

---

## Test Structure

```
tests/
├── setup.ts                    # Global test setup (Chrome API mocks)
├── fixtures/                   # Test data fixtures
│   └── rizikove-seznam.csv     # Sample ČOI CSV data
├── protection-flow.test.ts     # Core protection logic tests (FR-1 to FR-5)
├── background.test.ts          # Background script unit tests
├── blocked-page.test.ts        # Blocked page UI tests
├── integration.test.ts         # End-to-end integration tests
├── csv-parser.test.js          # CSV parsing tests
├── domain-matching.test.js     # Domain matching logic tests
├── edge-cases.test.ts          # Edge case and error handling tests
├── real-csv.test.ts            # Tests against real ČOI data
├── popup.test.ts               # Popup logic and behavior tests (FR-6)
├── message-handlers.test.ts    # Message handler tests (Section 5 Pseudocode)
├── content-script.test.js      # Content script tests
└── test_parseCSV.test.ts       # Additional CSV parsing tests
```


---

## Test Categories

### 1. Unit Tests
Test individual functions in isolation.

**Files**: `background.test.ts`, `csv-parser.test.js`, `domain-matching.test.js`

**Coverage**:
- `parseCSV()` - CSV parsing with various formats
- `cleanDomain()` - Domain string normalization
- `extractDomain()` - URL to domain extraction
- `checkDomain()` - Blacklist/whitelist checking

### 2. Integration Tests
Test complete user flows.

**Files**: `integration.test.ts`, `protection-flow.test.ts`

**Scenarios**:
- Detect scam → Show blocked page
- User allows domain → Access granted
- Protection toggle → Enable/disable blocking
- Session management → Whitelist reset

### 3. Component Tests
Test UI components.

**Files**: `blocked-page.test.ts`, `popup.test.tsx`

**Coverage**:
- Blocked page actions (close tab, proceed)
- Popup status display
- Protection toggle UI

### 4. Edge Case Tests
Test boundary conditions and error handling.

**File**: `edge-cases.test.ts`

**Scenarios**:
- Very long domain names
- Special characters (Punycode)
- Malformed URLs
- Empty/null inputs
- Storage errors
- Network failures

---

## Test Coverage

### Functional Requirements Coverage

| Requirement | Test File | Status |
|------------|-----------|--------|
| FR-1.1: Fetch on install | `protection-flow.test.ts` | ✅ |
| FR-1.2: Fetch on startup | `protection-flow.test.ts` | ✅ |
| FR-1.4: Manual refresh | `protection-flow.test.ts` | ✅ |
| FR-1.5: Store with timestamp | `protection-flow.test.ts` | ✅ |
| FR-1.6: Fallback to cache | `protection-flow.test.ts` | ✅ |
| FR-2.1: Protection ON by default | `protection-flow.test.ts` | ✅ |
| FR-2.3: Session-based toggle | `protection-flow.test.ts` | ✅ |
| FR-2.5: No blocking when OFF | `protection-flow.test.ts` | ✅ |
| FR-3.1-3.7: Protection flow | `protection-flow.test.ts` | ✅ |
| FR-3.8: Subdomain matching | `protection-flow.test.ts` | ✅ |
| FR-4.1-4.6: Blocked page | `blocked-page.test.ts` | ✅ |
| FR-5.1-5.5: Session whitelist | `protection-flow.test.ts` | ✅ |

---

## Mutation Testing

Mutation testing validates test suite quality by introducing small changes (mutations) to the code and checking if tests detect them.

### Configuration

The project uses [Stryker Mutator](https://stryker-mutator.io/) for mutation testing.

**Config file**: `stryker.config.json`

```json
{
  "testRunner": "vitest",
  "mutate": ["src/**/*.ts"],
  "thresholds": {
    "high": 80,
    "low": 60,
    "break": 50
  }
}
```

### Thresholds

| Level | Threshold | Meaning |
|-------|-----------|---------|
| High | 80% | Excellent coverage |
| Low | 60% | Needs improvement |
| Break | 50% | Build fails |

### Running Mutation Tests

```bash
npm run test:mutation
```

**Note**: Due to compatibility issues between Stryker Vitest runner and newer Vitest versions (v4+), mutation testing may require:

1. **Downgrade Vitest** to v1.x for full Stryker support
2. **Use alternative** mutation testing approach

### Alternative: Manual Mutation Testing

For critical functions, manually verify test coverage by:

1. Comment out key conditions (e.g., `if (protectionEnabled)`)
2. Run tests - they should fail
3. Restore the code

---

## Writing Tests

### Test Structure

```typescript
describe('Feature Name', () => {
  // Setup
  beforeEach(() => {
    // Reset state
  });

  describe('Scenario', () => {
    it('should do X when Y', () => {
      // Given
      const input = 'test input';
      
      // When
      const result = functionUnderTest(input);
      
      // Then
      expect(result).toBe('expected output');
    });
  });
});
```

### Mocking Chrome API

All tests use a global Chrome API mock defined in `tests/setup.ts`.

```typescript
// Access mock in tests
mockChrome.storage.local.get.mockResolvedValueOnce({
  scamDomains: [['scam.com', 'Bad site']]
});
```

### Testing Async Code

```typescript
it('should handle async operations', async () => {
  const result = await asyncFunction();
  expect(result).toBeDefined();
});
```

---

## Coverage Reports

Run coverage report:

```bash
npm run test:coverage
```

View HTML report:

```bash
open coverage/index.html
```

### Coverage Targets

| Metric | Target |
|--------|--------|
| Lines | ≥ 90% |
| Branches | ≥ 85% |
| Functions | ≥ 90% |
| Statements | ≥ 90% |

---

## CI/CD Integration

Tests run automatically on:
- Pull request creation
- Push to main branch

### GitHub Actions

```yaml
- name: Run tests
  run: npm test

- name: Run coverage
  run: npm run test:coverage
```

---

## Troubleshooting

### Common Issues

1. **Chrome API undefined**
   - Ensure `tests/setup.ts` is loaded
   - Check vitest config includes setup file

2. **Async tests timing out**
   - Increase timeout: `{ timeout: 10000 }`
   - Check for unresolved promises

3. **Mock not applied**
   - Clear mocks in `afterEach()`
   - Verify mock order (mocks before imports)

4. **Mutation testing fails**
   - Check Vitest version compatibility
   - Try running with `--logLevel debug`
