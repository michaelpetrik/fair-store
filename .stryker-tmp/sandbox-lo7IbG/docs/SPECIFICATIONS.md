# Fair Store - Chrome Extension Specifications

## Overview
Fair Store is a Chrome extension designed to protect Czech consumers from malicious/scam websites by using the official ČOI (Czech Trade Inspection) database.

---

## Functional Requirements

### FR-1: Blacklist Fetching
**Description**: The extension must fetch and maintain an up-to-date blacklist of malicious domains from the ČOI government website.

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-1.1 | Fetch blacklist on extension install | High |
| FR-1.2 | Fetch blacklist on browser startup (session start) | High |
| FR-1.3 | Fetch blacklist when extension is enabled/re-enabled | High |
| FR-1.4 | Provide manual refresh button for user-initiated updates | Medium |
| FR-1.5 | Store blacklist in local storage with timestamp | High |
| FR-1.6 | Fallback to cached data if network fetch fails | High |
| FR-1.7 | Handle Windows-1250 encoding from ČOI CSV | High |

### FR-2: Protection Toggle
**Description**: Users can temporarily disable protection for the current session.

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-2.1 | Protection is ON by default at every session start | High |
| FR-2.2 | Toggle switch available in popup UI | High |
| FR-2.3 | Disabling protection lasts until session end | High |
| FR-2.4 | Protection state stored in session storage (not persistent) | High |
| FR-2.5 | When protection is disabled, no blocking occurs | High |

### FR-3: Page Visit Protection Flow
**Description**: When user navigates to a webpage, the extension evaluates whether to block it.

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-3.1 | Check if protection is enabled | High |
| FR-3.2 | If protection OFF: allow page load (no action) | High |
| FR-3.3 | If protection ON: check if domain is on blacklist | High |
| FR-3.4 | If NOT on blacklist: allow page load | High |
| FR-3.5 | If ON blacklist: check if domain is whitelisted | High |
| FR-3.6 | If whitelisted: allow page load without overlay | High |
| FR-3.7 | If NOT whitelisted: display blocking overlay | High |
| FR-3.8 | Match subdomains (e.g., www.scam.com matches scam.com) | High |

### FR-4: Blocking Overlay
**Description**: A warning page displayed when user attempts to visit a malicious site.

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-4.1 | Display domain name being blocked | High |
| FR-4.2 | Display reason from ČOI database | High |
| FR-4.3 | Provide "Close Tab" action button | High |
| FR-4.4 | Provide "Proceed Anyway" action button | High |
| FR-4.5 | Proceeding adds domain to session whitelist | High |
| FR-4.6 | After proceeding, redirect to original URL | High |

### FR-5: Session Whitelist
**Description**: Domains the user has explicitly allowed for the current session.

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-5.1 | Whitelist is empty at every session start | High |
| FR-5.2 | Domains added via "Proceed Anyway" on blocked page | High |
| FR-5.3 | Whitelisted domains not blocked during session | High |
| FR-5.4 | Whitelist stored in memory (not persisted) | High |
| FR-5.5 | Whitelist clears on browser restart/session end | High |

### FR-6: Popup UI
**Description**: Extension popup showing current status and controls.

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-6.1 | Display current domain status (safe/blocked/whitelisted) | High |
| FR-6.2 | Show protection toggle switch | High |
| FR-6.3 | Show manual refresh button | Medium |
| FR-6.4 | Display last update timestamp | Low |
| FR-6.5 | Show appropriate warning for whitelisted risky sites | High |

---

## Non-Functional Requirements

### NFR-1: Performance
| ID | Requirement | Target |
|----|-------------|--------|
| NFR-1.1 | Domain check latency | < 5ms |
| NFR-1.2 | Blacklist with 10,000+ entries | Supported |
| NFR-1.3 | Page load impact | Minimal |

### NFR-2: Security
| ID | Requirement |
|----|-------------|
| NFR-2.1 | Minimal Chrome permissions |
| NFR-2.2 | HTTPS only for external requests |
| NFR-2.3 | No tracking or analytics |
| NFR-2.4 | Input sanitization for URLs |

### NFR-3: Reliability
| ID | Requirement |
|----|-------------|
| NFR-3.1 | Graceful offline handling |
| NFR-3.2 | Fallback to cached blacklist |
| NFR-3.3 | Error logging without crashes |

### NFR-4: Usability
| ID | Requirement |
|----|-------------|
| NFR-4.1 | Czech language UI |
| NFR-4.2 | Clear visual indicators |
| NFR-4.3 | Accessible (ARIA attributes) |

---

## Data Structures

### Blacklist Storage (chrome.storage.local)
```typescript
{
  scamDomains: [string, string][],  // [[domain, reason], ...]
  lastUpdate: string                 // ISO 8601 timestamp
}
```

### Session Whitelist (in-memory)
```typescript
allowedDomains: Set<string>  // Set of domain strings
```

### Protection State (chrome.storage.session)
```typescript
{
  protectionEnabled: boolean  // Default: true
}
```

---

## State Machine

```
┌─────────────────────────────────────────────────────────────┐
│                    PAGE NAVIGATION                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │ Protection ON?  │
                    └─────────────────┘
                     /              \
                   NO                YES
                   /                  \
                  ▼                    ▼
         ┌──────────────┐    ┌─────────────────┐
         │ ALLOW PAGE   │    │ On Blacklist?   │
         └──────────────┘    └─────────────────┘
                              /              \
                            NO                YES
                            /                  \
                           ▼                    ▼
                  ┌──────────────┐    ┌─────────────────┐
                  │ ALLOW PAGE   │    │ Whitelisted?    │
                  └──────────────┘    └─────────────────┘
                                       /              \
                                     YES               NO
                                     /                  \
                                    ▼                    ▼
                           ┌──────────────┐    ┌─────────────────┐
                           │ ALLOW PAGE   │    │ SHOW OVERLAY    │
                           └──────────────┘    └─────────────────┘
                                                        │
                                               ┌────────┴────────┐
                                               │                 │
                                               ▼                 ▼
                                        ┌───────────┐    ┌──────────────┐
                                        │ CLOSE TAB │    │ ADD TO       │
                                        └───────────┘    │ WHITELIST &  │
                                                         │ REDIRECT     │
                                                         └──────────────┘
```

---

## API Contracts

### Message: checkDomain
```typescript
// Request
{ action: 'checkDomain', url: string }

// Response
{
  isScam: boolean,
  isWhitelisted: boolean,
  protectionEnabled: boolean,
  domain: string,
  reason?: string,
  matchedDomain?: string
}
```

### Message: allowDomain
```typescript
// Request
{ action: 'allowDomain', domain: string }

// Response
{ success: boolean }
```

### Message: setProtection
```typescript
// Request
{ action: 'setProtection', enabled: boolean }

// Response
{ success: boolean, protectionEnabled: boolean }
```

### Message: getBlacklist
```typescript
// Request
{ action: 'getBlacklist' }

// Response
{
  blacklist: string[],
  protectionEnabled: boolean
}
```

### Message: refreshBlacklist
```typescript
// Request
{ action: 'refreshBlacklist' }

// Response
{ success: boolean, count: number, lastUpdate: string }
```

---

## Lifecycle Events

| Event | Action |
|-------|--------|
| `chrome.runtime.onInstalled` | Fetch fresh blacklist, initialize protection ON |
| `chrome.runtime.onStartup` | Fetch fresh blacklist, reset whitelist, protection ON |
| Extension enabled | Fetch fresh blacklist if stale |
| Browser session end | Whitelist cleared automatically (in-memory) |

---

## Test Coverage Requirements

| Area | Minimum Coverage |
|------|------------------|
| Domain matching logic | 95% |
| CSV parsing | 90% |
| Message handlers | 90% |
| Protection flow | 90% |
| UI components | 80% |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 0.0.1 | Initial | Basic functionality |
| 0.1.0 | TBD | Full specification compliance |
