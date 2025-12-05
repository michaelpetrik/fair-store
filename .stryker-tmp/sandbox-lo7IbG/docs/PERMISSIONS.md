# Fair Store - Permissions Documentation

## Why Each Permission is Needed

Fair Store uses the **minimum required permissions** to function. This document explains why each permission is necessary and what it's used for.

## Declared Permissions

### 1. `storage`

**Declared in `manifest.json`**:
```json
"permissions": ["storage"]
```

**Why it's needed**:
- **Caching scam domains** from ČOI for offline use
- **Storing last update timestamp** to track data freshness
- **Saving user preferences** (protection enabled/disabled state)

**What it allows**:
- Read/write to `chrome.storage.local` (persistent storage)
- Read/write to `chrome.storage.session` (temporary storage)

**Usage in code**:
```javascript
// Cache scam domains
await chrome.storage.local.set({
  scamDomains: Array.from(scamDomains.entries()),
  lastUpdate: new Date().toISOString()
});

// Load from cache
const stored = await chrome.storage.local.get(['scamDomains', 'lastUpdate']);
```

**Privacy impact**: ⭐ **None** - Only stores public scam domain list and user preferences locally

---

### 2. `tabs`

**Declared in `manifest.json`**:
```json
"permissions": ["tabs"]
```

**Why it's needed**:
- **Monitor navigation** to check domains before page loads
- **Redirect to warning page** when scam domain is detected
- **Get active tab** in popup to check current site
- **Open links** (rating, GitHub) from popup

**What it allows**:
- Access to `chrome.tabs.onUpdated` listener (navigation monitoring)
- Access to `chrome.tabs.query()` (get active tab)
- Access to `chrome.tabs.update()` (redirect to warning page)
- Access to `chrome.tabs.create()` (open new tabs)
- Access to `chrome.tabs.remove()` (close dangerous tabs)

**Usage in code**:
```javascript
// Monitor navigation
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading' && tab.url) {
    const domain = extractDomain(tab.url);
    if (checkDomain(domain).isScam) {
      chrome.tabs.update(tabId, { url: blockedUrl });
    }
  }
});

// Get current tab in popup
const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
```

**Privacy impact**: ⭐ **Minimal** - Can see URLs but doesn't log or transmit them

**Why we can't use `activeTab` instead**:
- `activeTab` only grants access when user clicks extension icon
- We need `chrome.tabs.onUpdated` which requires full `tabs` permission
- Navigation monitoring must work continuously, not just when popup is open

---

### 3. `host_permissions`

**Declared in `manifest.json`**:
```json
"host_permissions": ["https://www.coi.gov.cz/*"]
```

**Why it's needed**:
- **Fetch CSV data** from Czech Trade Inspection (ČOI) website
- **Keep scam list updated** with official government data

**What it allows**:
- Network requests to `https://www.coi.gov.cz/*` only
- Cannot access any other websites

**Usage in code**:
```javascript
const response = await fetch(
  'https://www.coi.gov.cz/userdata/files/dokumenty-ke-stazeni/open-data/rizikove-seznam.csv'
);
const csvText = await response.text();
```

**Privacy impact**: ⭐ **None** - Only fetches public CSV file, no user data sent

---

## Permissions We DON'T Use

### ❌ `cookies`
**Not needed** - We don't access or manipulate cookies

### ❌ `history`
**Not needed** - We don't track or access browsing history

### ❌ `webRequest` / `webRequestBlocking`
**Not needed** - We redirect via `tabs.update()`, not by blocking requests

### ❌ `<all_urls>`
**Not needed** - We only monitor navigation events, don't inject scripts

### ❌ `declarativeNetRequest`
**Not needed** - Simple redirect via tabs API is sufficient

### ❌ `downloads`
**Not needed** - No file download functionality

### ❌ `bookmarks`
**Not needed** - Don't access bookmarks

### ❌ `geolocation`
**Not needed** - No location tracking

### ❌ `notifications`
**Not needed** - Use in-page warnings instead

## Permission Justification Summary

| Permission | Needed? | Why | Alternative? |
|------------|---------|-----|--------------|
| `storage` | ✅ Yes | Cache scam domains offline | ❌ None - essential for offline use |
| `tabs` | ✅ Yes | Monitor navigation & redirect | ❌ `activeTab` insufficient (no onUpdated) |
| `host_permissions` (ČOI) | ✅ Yes | Fetch official scam list | ❌ None - need data source |

**Total permissions: 3 (minimal)**

## Privacy Guarantee

### What We DON'T Do:
- ❌ Track your browsing history
- ❌ Send your data to any server
- ❌ Collect personal information
- ❌ Access cookies or login credentials
- ❌ Inject ads or tracking scripts
- ❌ Monetize user data

### What We DO:
- ✅ Check domains **locally** in your browser
- ✅ Fetch public scam list from government website
- ✅ Cache data **locally** for offline use
- ✅ Store preferences **locally** in browser

### Data Flow Diagram:

```
┌─────────────────────────────────────┐
│ Your Browser (Local)                │
│                                     │
│  ┌──────────────────────────────┐  │
│  │ Fair Store Extension         │  │
│  │ - Checks domains locally     │  │
│  │ - No data sent out           │  │
│  └──────────────────────────────┘  │
│               │                     │
│               │ (Only fetch CSV)    │
│               ▼                     │
│         ČOI Website                 │
│   (Public scam list)                │
└─────────────────────────────────────┘
```

## Comparison with Similar Extensions

| Extension | Permissions Used | Fair Store |
|-----------|------------------|------------|
| AdBlock | `webRequest`, `webRequestBlocking`, `tabs`, `storage`, `<all_urls>` | ✅ Less invasive |
| Privacy Badger | `cookies`, `webRequest`, `tabs`, `storage`, `<all_urls>` | ✅ Less invasive |
| Fair Store | `storage`, `tabs`, `host_permissions` (ČOI only) | ✅ **Minimal** |

## For Security Auditors

### Permission Review Checklist:

- ✅ **Minimal permissions**: Only 3 permissions declared
- ✅ **No sensitive data access**: No cookies, history, passwords
- ✅ **No network tracking**: Only fetches public CSV from government
- ✅ **No content scripts**: No code injection into web pages
- ✅ **Local processing**: All domain checks happen in browser
- ✅ **Open source**: Code is publicly auditable
- ✅ **No external dependencies**: No third-party analytics or SDKs

### Code Audit Points:

**No external network calls except**:
```javascript
// Only to ČOI government website
fetch('https://www.coi.gov.cz/userdata/files/dokumenty-ke-stazeni/open-data/rizikove-seznam.csv')
```

**No user tracking**:
```javascript
// Search for: analytics, tracking, metrics, telemetry
// Result: None found
```

**No data transmission**:
```javascript
// Search for: fetch(), XMLHttpRequest, sendBeacon
// Result: Only ČOI CSV fetch (read-only)
```

## User Control

Users have full control over the extension:

### 1. Disable Protection Temporarily
- Click extension icon → Toggle protection off
- Resets on browser restart (session storage)

### 2. Allow Specific Domains
- When redirected to warning page → Click "Continue anyway"
- Domain added to session whitelist
- Resets on browser restart

### 3. Remove Extension
- Completely removes all data and permissions
- No residual tracking or data

## Chrome Web Store Review

This extension has been designed to pass Chrome Web Store security review:

- ✅ Manifest V3 compliant
- ✅ Minimal permissions with clear justification
- ✅ No remote code execution
- ✅ No obfuscated code
- ✅ Privacy policy (in README)
- ✅ Clear permission warnings
- ✅ User-friendly privacy explanation

## Questions & Answers

### Q: Why do you need `tabs` permission? Can't you use `activeTab`?

**A**: `activeTab` only grants temporary access when the user clicks the extension icon. We need `chrome.tabs.onUpdated` to monitor navigation continuously and protect users **before** they load a dangerous page. This requires the full `tabs` permission.

### Q: Do you track which websites I visit?

**A**: **No.** We check domains locally against a cached list. No browsing data leaves your computer.

### Q: What data do you send to servers?

**A**: **Only**: Fetching the public CSV file from ČOI government website. We don't send any of your data.

### Q: Can you read my passwords or cookies?

**A**: **No.** We don't request those permissions and cannot access that data.

### Q: Is the code open source?

**A**: **Yes.** Full source code is available on GitHub: https://github.com/michaelpetrik/fair-store

## Reporting Security Issues

If you find a security vulnerability:

1. **DO NOT** open a public GitHub issue
2. **Email**: [security contact email]
3. **Include**: Detailed description and reproduction steps
4. **Response time**: Within 48 hours

## License & Disclaimer

- **License**: MIT (open source)
- **Author**: Michael Petrik
- **Source**: https://github.com/michaelpetrik/fair-store
- **Data**: Czech Trade Inspection (ČOI) - official government source
- **Disclaimer**: Provided "as is" without warranty

---

**Last updated**: 2025-12-04
**Extension version**: 1.1.0
