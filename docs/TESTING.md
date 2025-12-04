# Fair Store - Testing Guide

## Testing Strategy

Fair Store uses a multi-layered testing approach:

1. **Unit Tests** - Test individual functions
2. **Integration Tests** - Test component interactions
3. **Manual Tests** - User acceptance testing
4. **Security Tests** - Verify no data leaks or vulnerabilities

## Running Tests

### Quick Start

```bash
# Run all tests once
npm test

# Watch mode (re-run on file changes)
npm run test:watch

# With coverage report
npm run test:coverage
```

### Test Framework

- **Framework**: [Vitest](https://vitest.dev/) (fast Vite-native test runner)
- **Assertions**: Built-in `expect` API
- **Mocking**: Vitest's built-in mocking
- **Coverage**: v8 code coverage

## Unit Tests

### Background Service Worker Tests

**Location**: `tests/background.test.ts`

#### Domain Cleaning

```typescript
import { describe, it, expect } from 'vitest';
import { cleanDomain } from '../src/background';

describe('cleanDomain', () => {
  it('should extract hostname from URL', () => {
    expect(cleanDomain('https://www.example.com/path')).toBe('www.example.com');
  });

  it('should handle URLs without protocol', () => {
    expect(cleanDomain('example.com')).toBe('example.com');
  });

  it('should lowercase domain', () => {
    expect(cleanDomain('EXAMPLE.COM')).toBe('example.com');
  });

  it('should remove port numbers', () => {
    expect(cleanDomain('example.com:8080')).toBe('example.com');
  });

  it('should handle query strings', () => {
    expect(cleanDomain('example.com/page?q=test')).toBe('example.com');
  });

  it('should return empty string for invalid input', () => {
    expect(cleanDomain('')).toBe('');
    expect(cleanDomain(null)).toBe('');
  });
});
```

#### CSV Parsing

```typescript
import { parseCSV } from '../src/background';

describe('parseCSV', () => {
  it('should parse semicolon-delimited CSV', () => {
    const csv = 'scam.com;Podvodný e-shop\nfake.cz;Neexistující zboží';
    const result = parseCSV(csv);

    expect(result.size).toBe(2);
    expect(result.get('scam.com')).toBe('Podvodný e-shop');
    expect(result.get('fake.cz')).toBe('Neexistující zboží');
  });

  it('should parse comma-delimited CSV', () => {
    const csv = 'scam.com,Podvodný e-shop\nfake.cz,Neexistující zboží';
    const result = parseCSV(csv);

    expect(result.size).toBe(2);
  });

  it('should strip quotes from values', () => {
    const csv = '"scam.com";"Podvodný e-shop"';
    const result = parseCSV(csv);

    expect(result.get('scam.com')).toBe('Podvodný e-shop');
  });

  it('should use default reason if missing', () => {
    const csv = 'scam.com;';
    const result = parseCSV(csv);

    expect(result.get('scam.com')).toBe('Zařazeno do seznamu rizikových e-shopů ČOI');
  });

  it('should skip empty lines', () => {
    const csv = 'scam.com;Reason\n\n\nfake.cz;Reason2';
    const result = parseCSV(csv);

    expect(result.size).toBe(2);
  });

  it('should handle malformed CSV gracefully', () => {
    const csv = 'invalid;;;data;;;';
    expect(() => parseCSV(csv)).not.toThrow();
  });
});
```

#### Domain Checking

```typescript
import { checkDomain, scamDomains, allowedDomains } from '../src/background';

describe('checkDomain', () => {
  beforeEach(() => {
    scamDomains.clear();
    allowedDomains.clear();
    scamDomains.set('scam.com', 'Podvodný e-shop');
    scamDomains.set('fake.cz', 'Neexistující zboží');
  });

  it('should detect exact scam domain match', () => {
    const result = checkDomain('scam.com');

    expect(result.isScam).toBe(true);
    expect(result.reason).toBe('Podvodný e-shop');
    expect(result.matchedDomain).toBe('scam.com');
  });

  it('should detect subdomain of scam domain', () => {
    const result = checkDomain('www.scam.com');

    expect(result.isScam).toBe(true);
    expect(result.matchedDomain).toBe('scam.com');
  });

  it('should return safe for non-scam domain', () => {
    const result = checkDomain('safe-shop.cz');

    expect(result.isScam).toBe(false);
    expect(result.reason).toBeNull();
  });

  it('should respect allowed domains', () => {
    allowedDomains.add('scam.com');
    const result = checkDomain('scam.com');

    expect(result.isScam).toBe(false);
  });

  it('should be case-insensitive', () => {
    const result = checkDomain('SCAM.COM');

    expect(result.isScam).toBe(true);
  });
});
```

#### URL Extraction

```typescript
import { extractDomain } from '../src/background';

describe('extractDomain', () => {
  it('should extract domain from HTTPS URL', () => {
    expect(extractDomain('https://example.com/path')).toBe('example.com');
  });

  it('should extract domain from HTTP URL', () => {
    expect(extractDomain('http://example.com')).toBe('example.com');
  });

  it('should handle subdomains', () => {
    expect(extractDomain('https://www.example.com')).toBe('www.example.com');
  });

  it('should return empty string for invalid URL', () => {
    expect(extractDomain('not a url')).toBe('');
  });

  it('should return empty string for chrome:// URLs', () => {
    expect(extractDomain('chrome://extensions/')).toBe('');
  });
});
```

## Integration Tests

### Message Passing

```typescript
import { chrome } from 'jest-chrome';

describe('Background message handling', () => {
  beforeEach(() => {
    // Reset mocks
    chrome.runtime.sendMessage.mockClear();
  });

  it('should respond to checkDomain message', async () => {
    const message = { action: 'checkDomain', url: 'https://scam.com' };

    const response = await new Promise(resolve => {
      chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
        if (msg.action === 'checkDomain') {
          resolve(sendResponse({
            isScam: true,
            domain: 'scam.com',
            reason: 'Podvodný e-shop'
          }));
        }
      });
      chrome.runtime.sendMessage(message);
    });

    expect(response.isScam).toBe(true);
  });

  it('should respond to getBlacklist message', async () => {
    const response = await chrome.runtime.sendMessage({ action: 'getBlacklist' });

    expect(response).toHaveProperty('blacklist');
    expect(response).toHaveProperty('protectionEnabled');
    expect(Array.isArray(response.blacklist)).toBe(true);
  });

  it('should respond to setProtection message', async () => {
    const response = await chrome.runtime.sendMessage({
      action: 'setProtection',
      enabled: false
    });

    expect(response.success).toBe(true);
    expect(response.protectionEnabled).toBe(false);
  });

  it('should respond to allowDomain message', async () => {
    const response = await chrome.runtime.sendMessage({
      action: 'allowDomain',
      domain: 'scam.com'
    });

    expect(response.success).toBe(true);
  });
});
```

### Storage Operations

```typescript
describe('Storage operations', () => {
  beforeEach(() => {
    chrome.storage.local.get.mockClear();
    chrome.storage.local.set.mockClear();
  });

  it('should cache scam domains after loading', async () => {
    await loadScamDomains();

    expect(chrome.storage.local.set).toHaveBeenCalledWith(
      expect.objectContaining({
        scamDomains: expect.any(Array),
        lastUpdate: expect.any(String)
      })
    );
  });

  it('should load from cache when network fails', async () => {
    // Mock network failure
    global.fetch = vi.fn(() => Promise.reject(new Error('Network error')));

    // Mock cached data
    chrome.storage.local.get.mockResolvedValue({
      scamDomains: [['scam.com', 'Reason']],
      lastUpdate: '2025-01-01T00:00:00.000Z'
    });

    await loadScamDomains();

    expect(scamDomains.size).toBeGreaterThan(0);
  });
});
```

## Manual Testing

### Test Plan

#### 1. Installation

- [ ] Extension installs without errors
- [ ] Icon appears in Chrome toolbar
- [ ] CSV loads from ČOI on first install
- [ ] Console shows "Loaded X domains from ČOI"

#### 2. Popup UI

- [ ] Clicking icon opens popup
- [ ] Popup shows correct status for current tab
- [ ] Statistics display (e.g., "1500 rizikových e-shopů")
- [ ] Toggle switch is interactive
- [ ] All buttons are clickable
- [ ] Modal dialogs open/close correctly

#### 3. Domain Checking

Test URLs (use ČOI list or mock domains):

- [ ] Navigate to safe domain → No redirect
- [ ] Navigate to scam domain → Redirects to blocked page
- [ ] Blocked page shows domain name
- [ ] Blocked page shows reason from ČOI

#### 4. Protection Toggle

- [ ] Toggle off → Confirmation modal appears
- [ ] Confirm disable → Protection disabled
- [ ] Navigate to scam domain → No redirect (when disabled)
- [ ] Toggle on → Protection enabled
- [ ] Navigate to scam domain → Redirects again

#### 5. "Continue Anyway"

- [ ] Navigate to scam domain → Blocked page
- [ ] Click "Continue anyway" → Navigates to original URL
- [ ] Navigate to same domain again → No redirect (session whitelist)
- [ ] Restart browser → Navigate to domain → Redirects (whitelist cleared)

#### 6. Error Handling

- [ ] Disconnect internet → Extension uses cache
- [ ] Corrupt cache → Falls back to local CSV (if present)
- [ ] No data available → Extension shows error in popup

#### 7. Performance

- [ ] Popup opens in < 300ms
- [ ] Domain check takes < 10ms
- [ ] CSV parsing completes in < 100ms
- [ ] No memory leaks after 100 navigations

### Test Environments

Test on:
- [ ] Chrome (latest)
- [ ] Chrome (v100)
- [ ] Chromium
- [ ] Edge (Chromium-based)

Test on:
- [ ] Windows 10/11
- [ ] macOS
- [ ] Linux (Ubuntu)

## Security Testing

### 1. Permission Audit

```bash
# Check manifest permissions
cat manifest.json | grep -A10 permissions

# Verify no excessive permissions
# Should only have: storage, tabs, host_permissions (ČOI)
```

### 2. Network Traffic Audit

**Expected network requests**:
- `https://www.coi.gov.cz/userdata/files/...` (CSV fetch)

**Prohibited requests**:
- Any analytics domains
- Any tracking domains
- Any non-ČOI domains

**Test**:
```bash
# Monitor network with Chrome DevTools
# 1. Open background service worker inspector
# 2. Go to Network tab
# 3. Install extension
# 4. Verify only ČOI request
```

### 3. Storage Audit

```javascript
// In background console:
chrome.storage.local.get(null, (data) => {
  console.log('Stored data:', data);
  // Verify: No personal data, only scam domains & timestamp
});
```

### 4. Code Injection Test

Verify no dynamic code execution:

```bash
# Search for dangerous patterns
grep -r "eval(" src/
grep -r "innerHTML" src/
grep -r "document.write" src/

# All should return nothing (or safe usage)
```

### 5. XSS Testing

Test popup with malicious domain names:

```javascript
// Add fake scam domain with XSS payload
scamDomains.set('<script>alert("XSS")</script>.com', 'Test');

// Navigate to trigger display
// Verify: No alert, text displayed safely
```

## Performance Testing

### Benchmarks

```javascript
// In background console:

// Test 1: Domain check speed
console.time('checkDomain');
for (let i = 0; i < 10000; i++) {
  checkDomain('example' + i + '.com');
}
console.timeEnd('checkDomain');
// Target: < 100ms for 10,000 checks

// Test 2: CSV parsing speed
console.time('parseCSV');
const result = parseCSV(largeCsvText);
console.timeEnd('parseCSV');
// Target: < 100ms for 1000 domains

// Test 3: Memory usage
console.log(performance.memory);
// Target: < 10MB total
```

### Load Testing

```javascript
// Simulate heavy usage
async function loadTest() {
  for (let i = 0; i < 1000; i++) {
    await chrome.runtime.sendMessage({
      action: 'checkDomain',
      url: 'https://example' + i + '.com'
    });
  }
}

console.time('loadTest');
await loadTest();
console.timeEnd('loadTest');
// Target: < 5 seconds for 1000 checks
```

## Automated Testing (Future)

### End-to-End Tests with Playwright

```typescript
import { test, expect } from '@playwright/test';

test('should block scam domain', async ({ page, context }) => {
  // Load extension
  await context.addExtension('./dist');

  // Navigate to scam domain
  await page.goto('https://scam.com');

  // Verify redirect to blocked page
  await expect(page).toHaveURL(/blocked\.html/);
  await expect(page.locator('#domain-name')).toContainText('scam.com');
});

test('should allow safe domain', async ({ page, context }) => {
  await context.addExtension('./dist');

  await page.goto('https://safe-shop.cz');

  // No redirect
  await expect(page).toHaveURL('https://safe-shop.cz');
});
```

## Continuous Integration

### GitHub Actions (Future)

```yaml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm test
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3
```

## Coverage Goals

- **Unit Tests**: > 80% code coverage
- **Integration Tests**: All message APIs covered
- **Manual Tests**: All user flows tested
- **Security Tests**: Pass all checks

## Test Data

### Mock CSV Data

```csv
scam-shop.cz;Podvodný e-shop, neexistující zboží
fake-store.com;Nereagují na reklamace
phishing-site.net;Kradou platební údaje
```

### Test Domains

**Safe** (should not redirect):
- `google.com`
- `seznam.cz`
- `alza.cz`

**Scam** (should redirect):
- Use actual domains from ČOI list
- Or mock domains in test environment

## Reporting Bugs

When filing a bug report, include:

1. **Steps to reproduce**
2. **Expected behavior**
3. **Actual behavior**
4. **Chrome version**
5. **Extension version**
6. **Console errors** (screenshot)
7. **Network logs** (if relevant)

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Chrome Extension Testing](https://developer.chrome.com/docs/extensions/mv3/tut_testing/)
- [Playwright for Extensions](https://playwright.dev/docs/chrome-extensions)

---

**Test coverage**: Run `npm run test:coverage` and open `coverage/index.html` to view detailed report.
