# Fair Store - API Documentation

## Inter-Component Message API

This document describes the message-passing API between extension components (popup, background, blocked page).

## Message Protocol

All messages use Chrome's `chrome.runtime.sendMessage()` API with the following structure:

```typescript
interface Message {
  action: string;
  [key: string]: any;
}
```

## Background Service Worker API

### Actions

#### 1. `checkDomain`

Check if a URL's domain is in the scam list.

**Request**:
```typescript
{
  action: 'checkDomain',
  url: string  // Full URL to check
}
```

**Response**:
```typescript
{
  isScam: boolean,              // True if domain is in scam list
  isWhitelisted: boolean,       // True if user allowed this domain
  protectionEnabled: boolean,   // Global protection state
  domain: string,               // Extracted domain name
  reason?: string | null,       // Reason from ČOI (if scam)
  matchedDomain?: string | null // Matched pattern (may differ for subdomains)
}
```

**Example**:
```javascript
// Popup checks current tab
const response = await chrome.runtime.sendMessage({
  action: 'checkDomain',
  url: 'https://scam-shop.cz/product'
});

if (response.isScam) {
  console.log(`Warning: ${response.domain} is a scam!`);
  console.log(`Reason: ${response.reason}`);
}
```

#### 2. `getBlacklist`

Get the full list of scam domains.

**Request**:
```typescript
{
  action: 'getBlacklist'
}
```

**Response**:
```typescript
{
  blacklist: string[],          // Array of scam domain names
  protectionEnabled: boolean    // Global protection state
}
```

**Example**:
```javascript
const response = await chrome.runtime.sendMessage({
  action: 'getBlacklist'
});

console.log(`${response.blacklist.length} scam domains loaded`);
```

#### 3. `setProtection`

Enable or disable global protection.

**Request**:
```typescript
{
  action: 'setProtection',
  enabled: boolean  // True to enable, false to disable
}
```

**Response**:
```typescript
{
  success: boolean,
  protectionEnabled: boolean  // New state
}
```

**Example**:
```javascript
// Disable protection
const response = await chrome.runtime.sendMessage({
  action: 'setProtection',
  enabled: false
});

if (response.success) {
  console.log('Protection disabled');
}
```

#### 4. `allowDomain`

Add domain to allowed list (user clicked "Continue anyway").

**Request**:
```typescript
{
  action: 'allowDomain',
  domain: string  // Domain to allow (e.g., "scam-shop.cz")
}
```

**Response**:
```typescript
{
  success: boolean
}
```

**Example**:
```javascript
// Blocked page - user clicks "Continue"
const domain = new URL(blockedUrl).hostname;
const response = await chrome.runtime.sendMessage({
  action: 'allowDomain',
  domain: domain
});

if (response.success) {
  // Navigate to original URL
  window.location.href = blockedUrl;
}
```

## Storage API

### Local Storage (`chrome.storage.local`)

Persistent storage for cached data.

#### Schema

```typescript
{
  scamDomains: [string, string][],  // [[domain, reason], ...]
  lastUpdate: string                // ISO 8601 timestamp
}
```

#### Usage

**Read**:
```javascript
const result = await chrome.storage.local.get(['scamDomains', 'lastUpdate']);
const domains = new Map(result.scamDomains || []);
console.log(`Last update: ${result.lastUpdate}`);
```

**Write**:
```javascript
await chrome.storage.local.set({
  scamDomains: Array.from(scamDomains.entries()),
  lastUpdate: new Date().toISOString()
});
```

### Session Storage (`chrome.storage.session`)

Temporary storage (cleared on browser restart).

#### Schema

```typescript
{
  protectionEnabled: boolean  // Default: true
}
```

#### Usage

**Read**:
```javascript
const result = await chrome.storage.session.get(['protectionEnabled']);
const enabled = result.protectionEnabled !== false;  // Default true
```

**Write**:
```javascript
await chrome.storage.session.set({ protectionEnabled: false });
```

## CSV Data Format

### Source

**URL**: `https://www.coi.gov.cz/userdata/files/dokumenty-ke-stazeni/open-data/rizikove-seznam.csv`

**Encoding**: Windows-1250

**Format**: CSV with `;` or `,` delimiter

### Structure

```
domain;reason
scam-shop.cz;Podvodný e-shop
fake-store.com;Neexistující zboží
```

**Columns**:
1. `domain` - Domain name (may include protocol, will be cleaned)
2. `reason` - Czech description of why domain is flagged

**Parsing Rules**:
- No header row
- Strip quotes (both `"` and `'`)
- Clean domains: extract hostname, lowercase
- Default reason if missing: "Zařazeno do seznamu rizikových e-shopů ČOI"

## Domain Matching Algorithm

```typescript
function checkDomain(domain: string): DomainCheckResult {
  domain = domain.toLowerCase();

  // 1. Check if user explicitly allowed
  if (allowedDomains.has(domain)) {
    return { isScam: false, reason: null, matchedDomain: null };
  }

  // 2. Check exact match
  if (scamDomains.has(domain)) {
    return {
      isScam: true,
      reason: scamDomains.get(domain),
      matchedDomain: domain
    };
  }

  // 3. Check if subdomain of scam domain
  for (const [scamDomain, reason] of scamDomains.entries()) {
    if (domain.endsWith('.' + scamDomain)) {
      return {
        isScam: true,
        reason: reason,
        matchedDomain: scamDomain
      };
    }
  }

  // 4. Not found - safe
  return { isScam: false, reason: null, matchedDomain: null };
}
```

**Examples**:
- `scam.com` (in list) → ✅ Scam (exact match)
- `www.scam.com` (parent in list) → ✅ Scam (subdomain match)
- `safe-shop.cz` (not in list) → ❌ Safe
- `scam.com` (user allowed) → ❌ Safe (override)

## Error Handling

### Message Sending

```javascript
try {
  const response = await chrome.runtime.sendMessage({ action: 'checkDomain', url });
  // Handle response
} catch (error) {
  console.error('Message failed:', error);
  // Show user-friendly error
  alert('Nepodařilo se zkontrolovat stránku. Zkuste to znovu.');
}
```

### Storage Operations

```javascript
try {
  await chrome.storage.local.set({ scamDomains: data });
} catch (error) {
  console.error('Storage write failed:', error);
  // Continue with in-memory data
}
```

### CSV Loading

```javascript
try {
  const response = await fetch(COI_CSV_URL);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const buffer = await response.arrayBuffer();
  const text = new TextDecoder('windows-1250').decode(buffer);
  // Parse CSV
} catch (error) {
  console.error('CSV load failed:', error);
  // Try cache fallback
}
```

## Performance Considerations

### Message Passing

- Messages are asynchronous - use `await` or `.then()`
- Return `true` from message listener for async responses
- Avoid sending large data (>1MB) - use storage instead

### Storage Access

- `chrome.storage.local`: Persistent, slower
- `chrome.storage.session`: Fast, cleared on restart
- Batch reads with `chrome.storage.local.get([key1, key2])`

### Domain Checking

- `Map.has()` is O(1) for exact lookups
- Subdomain checking is O(n) where n = number of scam domains
- Future: Use Trie for O(m) where m = domain length

## Security Notes

### Input Validation

Always validate message inputs:

```javascript
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'allowDomain') {
    const domain = message.domain;
    if (typeof domain !== 'string' || !domain) {
      sendResponse({ success: false, error: 'Invalid domain' });
      return true;
    }
    // Process...
  }
});
```

### Content Security

- Never use `eval()` on message data
- Escape user input before DOM insertion
- Validate URLs before navigation

## Testing

### Unit Tests

```javascript
// Test message handling
describe('Background messages', () => {
  it('should check domain', async () => {
    const response = await chrome.runtime.sendMessage({
      action: 'checkDomain',
      url: 'https://scam.com'
    });
    expect(response.isScam).toBe(true);
  });
});
```

### Integration Tests

```javascript
// Test full flow
it('should redirect to blocked page', async () => {
  // Navigate to scam domain
  await chrome.tabs.update(tabId, { url: 'https://scam.com' });

  // Wait for redirect
  await waitFor(() => {
    const tab = chrome.tabs.get(tabId);
    expect(tab.url).toContain('blocked.html');
  });
});
```

## Version History

- **v1.1.0**: Added `setProtection` and `checkDomain` messages
- **v1.0.0**: Initial release with `getBlacklist` and `allowDomain`

## Related Documentation

- [Architecture](./ARCHITECTURE.md)
- [Development Guide](./DEVELOPMENT.md)
- [Testing Guide](./TESTING.md)
