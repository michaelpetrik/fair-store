# Fair Store Tests

Comprehensive test suite for the Fair Store Chrome Extension.

## Quick Start

```bash
# Install dependencies (first time only)
npm install

# Run all tests
npm test

# Run tests with coverage report
npm run test:coverage

# Run tests in watch mode (for development)
npm run test:watch
```

## Test Files

### Automated Tests

| File | Purpose | Test Count | Coverage |
|------|---------|------------|----------|
| `csv-parser.test.js` | CSV parsing logic, domain cleaning | 25+ | ~95% |
| `domain-matching.test.js` | Domain extraction, matching algorithms | 40+ | ~98% |
| `content-script.test.js` | XSS protection, DOM manipulation | 30+ | ~90% |

**Total: 95+ automated tests**

### Documentation

| File | Purpose |
|------|---------|
| `MANUAL_TESTING.md` | Step-by-step manual testing procedures (49 test scenarios) |
| `TEST_COVERAGE.md` | Comprehensive coverage documentation and metrics |
| `README.md` | This file - testing overview and quick start |

## Test Categories

### 1. CSV Parser Tests

Tests the parsing of ČOI CSV data with various formats:

```bash
npm test csv-parser.test.js
```

**Covered:**
- ✅ Semicolon vs comma delimiters
- ✅ Quoted values
- ✅ Empty lines and malformed data
- ✅ Various column names
- ✅ Domain cleaning (protocols, paths, ports)
- ✅ Special characters (Czech háčky, čárky)
- ✅ Edge cases (empty CSV, missing columns)

### 2. Domain Matching Tests

Tests domain extraction and matching logic:

```bash
npm test domain-matching.test.js
```

**Covered:**
- ✅ Domain extraction from URLs
- ✅ Exact domain matching
- ✅ Subdomain matching (www.example.com → example.com)
- ✅ Case-insensitive matching
- ✅ International domains
- ✅ Performance with large datasets
- ✅ Edge cases (IP addresses, localhost, chrome://)

### 3. Content Script Tests

Tests warning popup and XSS protection:

```bash
npm test content-script.test.js
```

**Covered:**
- ✅ HTML escaping (XSS prevention)
- ✅ DOM element creation
- ✅ Button interactions
- ✅ Details toggle functionality
- ✅ Safe display of untrusted data
- ✅ Edge cases (long strings, Unicode)

## Manual Testing

For UI, browser-specific, and integration testing:

1. Read `MANUAL_TESTING.md`
2. Load extension in Chrome (Developer mode)
3. Follow test scenarios step-by-step
4. Check off completed tests
5. Report issues on GitHub

**49 manual test scenarios covering:**
- Extension installation & startup
- Warning popup display & interactions
- CSV data fetching & parsing
- Performance & responsive design
- Browser compatibility
- Security & privacy

## Coverage Report

After running tests with coverage:

```bash
npm run test:coverage
```

Open `coverage/lcov-report/index.html` in your browser to see detailed coverage.

**Current Coverage:**
- CSV Parser: ~95%
- Domain Matching: ~98%
- Content Script: ~90%
- **Overall: ~95%**

## Writing New Tests

### Test Structure

```javascript
describe('Feature Name', () => {
  describe('specific functionality', () => {
    test('should handle normal case', () => {
      // Arrange
      const input = 'test';

      // Act
      const result = functionUnderTest(input);

      // Assert
      expect(result).toBe('expected');
    });

    test('should handle edge case', () => {
      // Test edge cases
    });
  });
});
```

### Best Practices

1. **Test One Thing**: Each test should verify one specific behavior
2. **Use Descriptive Names**: `should handle empty string` not `test1`
3. **Cover Edge Cases**: Empty, null, very long, special characters
4. **Include Comments**: Explain complex test logic
5. **Keep Tests Fast**: Unit tests should run in milliseconds
6. **Mock External Dependencies**: Don't rely on network, filesystem

### Example

```javascript
describe('cleanDomain', () => {
  test('should remove http protocol', () => {
    expect(cleanDomain('http://example.com')).toBe('example.com');
  });

  test('should handle empty string', () => {
    expect(cleanDomain('')).toBe('');
  });

  test('should handle null', () => {
    expect(cleanDomain(null)).toBe('');
  });
});
```

## Debugging Tests

### Run Single Test File

```bash
npm test csv-parser.test.js
```

### Run Single Test

```bash
npm test -- -t "should handle empty string"
```

### Verbose Output

```bash
npm test -- --verbose
```

### Debug in VS Code

Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand", "--no-cache"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

## Test Data

### Sample CSV for Testing

```csv
url;důvod
example-scam.com;Podvodný e-shop
fake-shop.cz;Nedodání zboží
bad-store.net;Zneužití platebních údajů
```

### Edge Case Data

```csv
url;důvod
<script>alert(1)</script>.com;XSS test
háčky-čárky.cz;Důvod s háčky: ěščřžýáíé
;Empty domain test
UPPERCASE.COM;Case test
```

## Continuous Integration

### GitHub Actions (Future)

```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm test
      - run: npm run test:coverage
```

## Troubleshooting

### Tests Not Running

```bash
# Clear Jest cache
npx jest --clearCache

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Coverage Not Generating

```bash
# Ensure coverage directory is writable
chmod -R 755 coverage/

# Run with verbose output
npm run test:coverage -- --verbose
```

### Performance Issues

```bash
# Run tests in parallel (default)
npm test

# Run tests sequentially (slower but uses less memory)
npm test -- --runInBand
```

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Best Practices](https://testingjavascript.com/)
- [Chrome Extension Testing](https://developer.chrome.com/docs/extensions/mv3/tut_testing/)

## Contributing

1. Write tests for all new features
2. Maintain >90% coverage
3. Update `TEST_COVERAGE.md` with new scenarios
4. Add manual tests for UI changes
5. Run full test suite before submitting PR

## Questions?

- Check `TEST_COVERAGE.md` for detailed documentation
- Read `MANUAL_TESTING.md` for manual test procedures
- Open an issue on GitHub

---

**Happy Testing! 🧪✅**
