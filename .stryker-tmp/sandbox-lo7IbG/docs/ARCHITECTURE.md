# Fair Store - Architecture Documentation

## Overview

Fair Store is a Chrome extension that protects Czech consumers from scam e-commerce websites by checking visited domains against the official Czech Trade Inspection (ČOI) database.

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Chrome Extension                     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐    ┌──────────────┐   ┌────────────┐ │
│  │   Popup UI   │◄──►│  Background  │◄──┤  Blocked   │ │
│  │  (popup.js)  │    │  Service     │   │   Page     │ │
│  │              │    │  Worker      │   │ (blocked.  │ │
│  │              │    │ (background. │   │   html)    │ │
│  │              │    │     ts)      │   │            │ │
│  └──────────────┘    └──────┬───────┘   └────────────┘ │
│                             │                           │
│                             │                           │
│  ┌──────────────────────────▼─────────────────────────┐ │
│  │           Chrome Storage API                       │ │
│  │  ┌─────────────┐  ┌──────────────────────────────┐ │ │
│  │  │ Session     │  │ Local Storage                │ │ │
│  │  │ Storage     │  │ - Scam domains cache         │ │ │
│  │  │ - Protection│  │ - Last update timestamp      │ │ │
│  │  │   state     │  │                              │ │ │
│  │  └─────────────┘  └──────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                             │
                             │ Fetch CSV
                             ▼
        ┌────────────────────────────────────┐
        │  ČOI (Czech Trade Inspection)      │
        │  https://www.coi.gov.cz/           │
        │  - rizikove-seznam.csv (Windows-   │
        │    1250 encoding)                  │
        └────────────────────────────────────┘
```

## Components

### 1. Background Service Worker (`src/background.ts`)

**Purpose**: Core logic for domain checking and navigation monitoring

**Responsibilities**:
- Load and parse CSV data from ČOI
- Cache scam domains in Chrome storage
- Monitor tab navigation with `chrome.tabs.onUpdated` listener
- Check domains against scam list
- Redirect to warning page if scam detected
- Handle messages from popup and blocked page

**Key Data Structures**:
```typescript
scamDomains: Map<string, string>      // domain -> reason
allowedDomains: Set<string>           // user-allowed domains (session)
lastUpdate: string | null             // ISO timestamp
protectionEnabled: boolean            // global toggle
```

**Initialization Flow**:
1. On install: Load scam domains from ČOI
2. Priority: Web → Cache → Local fallback
3. Store parsed domains in Chrome storage

### 2. Popup UI (`popup/popup.html`, `popup/popup.js`)

**Purpose**: User interface for viewing protection status and settings

**Features**:
- Display current tab safety status
- Show statistics (number of scam domains)
- Toggle protection on/off
- Report suspicious stores
- Link to extension rating and about page

**Data Flow**:
```
User Opens Popup
    ↓
Load Protection State (parallel)
Load Current Tab Status (parallel)
Load Statistics (parallel)
    ↓
Display Status to User
    ↓
User Interaction (toggle, report, etc.)
    ↓
Send Message to Background
    ↓
Update UI
```

### 3. Blocked Warning Page (`src/pages/blocked.html`, `src/pages/blocked.ts`)

**Purpose**: Full-page warning shown when user navigates to scam site

**Features**:
- Display warning with scam domain
- Show reason from ČOI database
- Two actions:
  - "Close Tab" - Safely exit
  - "Continue Anyway" - Add to allowed list and navigate

**Security**:
- Isolates user from malicious site before it loads
- Prevents accidental data entry on scam sites

## Data Flow

### Navigation Check Flow

```
User Navigates to URL
    ↓
chrome.tabs.onUpdated fires
    ↓
Extract domain from URL
    ↓
Check if domain in allowedDomains? ───Yes──► Allow navigation
    │
    No
    ↓
Check if domain in scamDomains? ───No──► Allow navigation
    │
    Yes
    ↓
Redirect to blocked.html?url=...
    ↓
User sees warning page
    ↓
User chooses action:
  - Close tab ──► chrome.tabs.remove()
  - Continue ──► Add to allowedDomains, navigate to original URL
```

### CSV Loading Flow

```
Extension Install / Browser Start
    ↓
Attempt: Fetch from ČOI website
    │
    ├─Success─► Parse CSV ──► Store in scamDomains ──► Cache in Chrome storage
    │
    └─Fail────► Attempt: Load from Chrome storage cache
                    │
                    ├─Success─► Load into scamDomains
                    │
                    └─Fail────► Attempt: Load local CSV fallback
                                    │
                                    ├─Success─► Parse & cache
                                    │
                                    └─Fail────► Extension has no data
```

## Storage Schema

### Local Storage (`chrome.storage.local`)

```typescript
{
  scamDomains: [string, string][],  // Array of [domain, reason] tuples
  lastUpdate: string                // ISO timestamp
}
```

**Purpose**: Persistent cache of scam domains for offline use

**Updates**: On successful CSV fetch from ČOI

### Session Storage (`chrome.storage.session`)

```typescript
{
  protectionEnabled: boolean  // Default: true
}
```

**Purpose**: Temporary session state (resets on browser restart)

**Use Case**: User can temporarily disable protection without permanent changes

## Security Considerations

### 1. Permissions Minimization
- `storage`: Required for caching scam domains
- `tabs`: Required for `onUpdated` listener and redirection
- `host_permissions`: Only `https://www.coi.gov.cz/*` for CSV fetching

### 2. Content Security
- No `eval()` or dynamic code execution
- All user inputs properly escaped
- CSV parsing with error handling
- Windows-1250 decoding for Czech characters

### 3. Privacy
- No user data collection
- All checks performed locally
- No external API calls except ČOI CSV
- Allowed domains stored only in session (not persistent)

## Performance Optimizations

### 1. Domain Matching
- **Current**: `Map.has()` for O(1) lookup
- **Future**: Consider Trie for subdomain matching

### 2. Data Caching
- Persistent cache prevents repeated network requests
- Fallback mechanism ensures offline functionality

### 3. Popup Loading
- Parallel data loading: `Promise.all([loadState, checkTab, loadStats])`
- Reduces perceived latency

### 4. CSV Parsing
- Single-pass parsing with minimal allocations
- Efficient string operations

## Extension Lifecycle

```
┌─────────────────────────────────────────────────┐
│  Browser Start                                  │
│    └──► Service Worker starts                   │
│         └──► Load scam domains (if not cached)  │
│              └──► Ready for monitoring          │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  User Clicks Extension Icon                     │
│    └──► Popup opens                             │
│         └──► Load current state & check tab     │
│              └──► Display status                │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  User Navigates to URL                          │
│    └──► tabs.onUpdated fires                    │
│         └──► Extract & check domain             │
│              └──► Scam? ──Yes──► Redirect       │
│                   └──No───► Allow               │
└─────────────────────────────────────────────────┘
```

## Technology Stack

- **Manifest Version**: 3 (latest Chrome extension standard)
- **Language**: TypeScript (compiled to JavaScript)
- **Build Tool**: Vite with @crxjs/vite-plugin
- **Testing**: Vitest + Jest
- **UI Framework**: Vanilla JavaScript (no framework dependency)
- **Encoding**: Windows-1250 (for Czech ČOI data)

## Future Enhancements

1. **Performance**:
   - Implement Trie for faster subdomain matching
   - Add Web Worker for CSV parsing
   - Optimize memory usage with bloom filters

2. **Features**:
   - Auto-update check (daily/weekly)
   - Custom user blacklist
   - Whitelist for known safe domains
   - Reporting to community database

3. **User Experience**:
   - Progressive Web App (PWA) support
   - Multi-language support (English, Slovak)
   - Dark mode
   - Detailed statistics dashboard

4. **Security**:
   - Content Security Policy hardening
   - Subresource Integrity (SRI) for scripts
   - Regular security audits

## References

- [Chrome Extension Manifest V3](https://developer.chrome.com/docs/extensions/mv3/)
- [Chrome Storage API](https://developer.chrome.com/docs/extensions/reference/storage/)
- [Chrome Tabs API](https://developer.chrome.com/docs/extensions/reference/tabs/)
- [ČOI Open Data](https://www.coi.cz/informace-o-uradu/otevrena-data/)
