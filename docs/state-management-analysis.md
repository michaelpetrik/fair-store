# State Management Analysis: Whitelist Display Bug

## Executive Summary

**Critical Bug Identified:** When a user whitelists a domain (clicks "Continue" on blocked page), the popup incorrectly displays "✅ Bezpečná stránka" (Safe page) instead of showing a distinct whitelisted status with appropriate warnings.

**Root Cause:** Flawed state inference logic in `popup.tsx` that attempts to deduce whitelist state by checking if user is on the actual risky site vs. blocked page, instead of querying the authoritative state in `background.ts`.

---

## 1. Current State Flow Architecture

### 1.1 State Storage Locations

```
┌─────────────────────────────────────────────────────────────┐
│                     STATE STORAGE LAYERS                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. PERSISTENT (chrome.storage.local)                       │
│     - scamDomains: Map<string, string>                      │
│     - lastUpdate: string (ISO timestamp)                    │
│     ✓ Survives browser restarts                             │
│                                                              │
│  2. SESSION (chrome.storage.session)                        │
│     - protectionEnabled: boolean                            │
│     ✓ Resets on browser restart                             │
│                                                              │
│  3. IN-MEMORY (background.ts module variables)              │
│     - allowedDomains: Set<string>                           │
│     - protectionEnabled: boolean                            │
│     ✓ Resets on browser restart                             │
│     ✓ Cleared on extension reload                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Data Flow Diagram

```
┌──────────────┐         Message          ┌──────────────┐
│  popup.tsx   │ ──────────────────────▶  │ background.ts│
│              │     checkDomain          │              │
│  [UI LAYER]  │                          │ [STATE MGMT] │
│              │ ◀──────────────────────  │              │
└──────────────┘         Response         └──────────────┘
      │                                           │
      │                                           │
      │ Direct Read                               │ Read/Write
      │ chrome.storage.local                      │ chrome.storage.local
      │                                           │
      ▼                                           ▼
┌─────────────────────────────────────────────────────────────┐
│             chrome.storage.local (PERSISTENT)                │
│                                                              │
│  {                                                           │
│    scamDomains: [['scam.com', 'Bad shop'], ...],            │
│    lastUpdate: '2025-12-05T17:00:00.000Z'                   │
│  }                                                           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│          background.ts IN-MEMORY STATE (TRANSIENT)           │
│                                                              │
│  allowedDomains = Set(['scam.com', 'another-risky.com'])    │
│  protectionEnabled = true                                    │
│                                                              │
│  ⚠️ NOT ACCESSIBLE FROM popup.tsx DIRECTLY                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Root Cause Analysis

### 2.1 The Bug Location

**File:** `/Users/michal/Development/freetime/chrome-extension-fair-store/src/popup.tsx`
**Lines:** 140-142

```typescript
// If user is on the actual risky site (NOT on blocked page), they must have whitelisted it
// If they're on the blocked page, it means the site is blocked (not whitelisted)
const isWhitelisted = !isBlockedPage && isInScamList;
```

### 2.2 Why This Logic Is Flawed

**Assumption:** "If user is viewing a risky domain (not on blocked.html), they must have whitelisted it"

**Problem:** This inference is **incorrect** in multiple scenarios:

1. **Race Condition:** User whitelists domain, background.ts adds to `allowedDomains`, popup opens before tab navigation completes
2. **Multiple Tabs:** User has risky site open in multiple tabs, whitelist state differs across tabs
3. **Extension Reload:** Background script reloads, `allowedDomains` clears, but user still on whitelisted site
4. **Navigation Timing:** Popup opens during navigation, before blocking logic executes

### 2.3 Current State Check Flow (BROKEN)

```
popup.tsx checkCurrentDomain():
  ↓
1. Get current tab URL
  ↓
2. Check if URL contains "blocked.html"
  ↓
3. Read scamDomains from chrome.storage.local (bypasses background.ts)
  ↓
4. Check if domain in scamDomains
  ↓
5. INFER whitelist status:
   isWhitelisted = !isBlockedPage && isInScamList
  ↓
6. Display UI based on inference ❌
```

**Critical Flaw:** popup.tsx NEVER queries the authoritative `allowedDomains` set in background.ts!

---

## 3. Domain State Model

### 3.1 All Possible Domain States

```
┌────────────────────────────────────────────────────────────┐
│                    DOMAIN STATE MATRIX                      │
├──────────────┬──────────────┬──────────────┬──────────────┤
│ State ID     │ In Blacklist │ In Whitelist │ Display      │
├──────────────┼──────────────┼──────────────┼──────────────┤
│ UNKNOWN      │ No           │ No           │ Safe ✅      │
│ SAFE         │ No           │ No           │ Safe ✅      │
│ BLOCKED      │ Yes          │ No           │ Blocked 🛡️   │
│ WHITELISTED  │ Yes          │ Yes          │ Whitelisted ⚠│
│ INVALID*     │ No           │ Yes          │ N/A          │
└──────────────┴──────────────┴──────────────┴──────────────┘

* INVALID state should never occur (cannot whitelist non-blacklisted domain)
```

### 3.2 State Transitions

```
        ┌──────────┐
        │ UNKNOWN  │ (First visit, not in blacklist)
        └────┬─────┘
             │
      ┌──────┴──────┐
      │ Analyze     │
      └──────┬──────┘
             │
      ┌──────▼──────────┐
      │                 │
  ┌───▼────┐       ┌────▼────┐
  │ SAFE   │       │ BLOCKED │
  └────────┘       └────┬────┘
                        │
                 User clicks
                 "Continue"
                        │
                   ┌────▼────────┐
                   │ WHITELISTED │
                   └─────────────┘
                        │
                  Session End
                  (Browser Restart)
                        │
                   ┌────▼────┐
                   │ BLOCKED │
                   └─────────┘
```

### 3.3 State Persistence Rules

| State       | Storage Location           | Lifetime            | Resets On          |
|-------------|----------------------------|---------------------|--------------------|
| BLACKLIST   | chrome.storage.local       | Persistent          | Manual refresh     |
| WHITELIST   | background.ts (Set)        | Session only        | Browser restart    |
| PROTECTION  | chrome.storage.session     | Session only        | Browser restart    |

---

## 4. Message Handler Analysis

### 4.1 Current checkDomain Handler (background.ts:313-340)

```typescript
if (message.action === 'checkDomain') {
    (async () => {
        const url = message.url;
        if (!url) {
            sendResponse({ isScam: false, isWhitelisted: false, protectionEnabled, domain: '' });
            return;
        }

        const domain = extractDomain(url);
        if (!domain) {
            sendResponse({ isScam: false, isWhitelisted: false, protectionEnabled, domain: '' });
            return;
        }

        const result = checkDomain(domain);
        const isWhitelisted = allowedDomains.has(domain.toLowerCase()); // ✅ CORRECT

        sendResponse({
            isScam: result.isScam,
            isWhitelisted: isWhitelisted,  // ✅ Authoritative source
            protectionEnabled: protectionEnabled,
            domain: domain,
            reason: result.reason,
            matchedDomain: result.matchedDomain
        });
    })();
    return true;
}
```

**Status:** ✅ **CORRECT** - background.ts returns authoritative whitelist state

### 4.2 Popup's Broken Logic (popup.tsx:82-156)

```typescript
async function checkCurrentDomain() {
    // ... get tab URL ...

    // ❌ PROBLEM: Reads scamDomains directly from storage
    const result = await chrome.storage.local.get(['scamDomains']);
    const rawDomains = result.scamDomains as [string, string][] | undefined;
    const scamDomains = new Map<string, string>(rawDomains || []);

    // Check if domain is in scam list
    let reason: string | undefined;
    let isInScamList = false;

    if (scamDomains.has(targetDomain)) {
        reason = scamDomains.get(targetDomain);
        isInScamList = true;
    }

    // ❌ CRITICAL BUG: Infers whitelist state instead of querying
    const isWhitelisted = !isBlockedPage && isInScamList;

    setStatus({
        domain: targetDomain,
        isSafe: !isInScamList,
        isWhitelisted: isWhitelisted,  // ❌ WRONG
        reason: reason,
        isBlockedPage: isBlockedPage
    });
}
```

**Problems:**
1. Bypasses background.ts message handler
2. Cannot access `allowedDomains` set (private to background.ts)
3. Infers whitelist state from navigation state (unreliable)
4. No single source of truth

---

## 5. Proposed Solution

### 5.1 Fix: Use Background's checkDomain Message

**Replace popup.tsx logic with proper message handler call:**

```typescript
async function checkCurrentDomain() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (!tab.url) {
            setLoading(false);
            return;
        }

        // ✅ SOLUTION: Use background.ts message handler
        const response = await chrome.runtime.sendMessage({
            action: 'checkDomain',
            url: tab.url
        });

        // Determine if we're on blocked page
        const isBlockedPage = tab.url.includes('blocked.html');

        setStatus({
            domain: response.domain,
            isSafe: !response.isScam && !response.isWhitelisted,  // ✅ Safe = not scam AND not whitelisted
            isWhitelisted: response.isWhitelisted,  // ✅ From authoritative source
            reason: response.reason,
            isBlockedPage: isBlockedPage
        });

        setLoading(false);
    } catch (error) {
        console.error('Failed to check domain:', error);
        setLoading(false);
    }
}
```

### 5.2 Updated State Display Logic

```typescript
{status && (
    <>
        <div className="domain-info">
            <strong>Doména:</strong> {status.domain}
        </div>

        {/* Priority 1: Check if whitelisted (highest priority) */}
        {status.isWhitelisted ? (
            <div className="status-whitelisted">
                <h2>⚠️ Rizikový e-shop (Povoleno)</h2>
                <p><strong>Navštěvujete tuto stránku na vlastní nebezpečí.</strong></p>
                {status.reason && (
                    <div className="reason">
                        <strong>Důvod zařazení do seznamu ČOI:</strong> {status.reason}
                    </div>
                )}
                <p className="warning-text">
                    Tato doména je v seznamu rizikových e-shopů ČOI.
                    Povolili jste ji na tuto relaci prohlížeče.
                </p>
            </div>

        /* Priority 2: Check if on blocked page */
        ) : status.isBlockedPage ? (
            <div className="status-danger">
                <h2>🛡️ Stránka blokována</h2>
                <p>Tato stránka je blokována pro vaši ochranu.</p>
                {status.reason && (
                    <div className="reason">
                        <strong>Důvod zařazení do seznamu ČOI:</strong> {status.reason}
                    </div>
                )}
            </div>

        /* Priority 3: Safe domain */
        ) : status.isSafe ? (
            <div className="status-safe">
                <h2>✅ Bezpečná stránka</h2>
                <p>Tato doména není v seznamu rizikových e-shopů ČOI.</p>
            </div>

        /* Priority 4: Unknown state */
        ) : (
            <div className="status-info">
                <p>Stav domény nelze určit.</p>
            </div>
        )}
    </>
)}
```

---

## 6. State-to-UI Mapping Requirements

### 6.1 Display Rules Matrix

| Condition                               | Display State        | CSS Class            | Icon | Color  |
|-----------------------------------------|----------------------|----------------------|------|--------|
| !isScam && !isWhitelisted               | Bezpečná stránka     | status-safe          | ✅   | Green  |
| isScam && isWhitelisted                 | Rizikový (Povoleno)  | status-whitelisted   | ⚠️   | Amber  |
| isScam && !isWhitelisted && isBlockedPage | Stránka blokována | status-danger        | 🛡️   | Red    |
| isScam && !isWhitelisted && !isBlockedPage | Should not occur  | status-danger        | 🛡️   | Red    |

### 6.2 Message Content Requirements

#### Safe Domain (Green)
```
✅ Bezpečná stránka

Tato doména není v seznamu rizikových e-shopů ČOI.
```

#### Whitelisted Domain (Amber)
```
⚠️ Rizikový e-shop (Povoleno)

Navštěvujete tuto stránku na vlastní nebezpečí.

Důvod zařazení do seznamu ČOI: [reason]

Tato doména je v seznamu rizikových e-shopů ČOI.
Povolili jste ji na tuto relaci prohlížeče.
```

#### Blocked Domain (Red)
```
🛡️ Stránka blokována

Tato stránka je blokována pro vaši ochranu.

Důvod zařazení do seznamu ČOI: [reason]
```

---

## 7. Critical Issues Summary

### 7.1 Current Bugs

| ID | Issue                                    | Severity | Impact                          |
|----|------------------------------------------|----------|---------------------------------|
| B1 | Popup infers whitelist state             | CRITICAL | Wrong status displayed          |
| B2 | Popup bypasses background.ts handler     | HIGH     | No single source of truth       |
| B3 | Race condition in state detection        | MEDIUM   | Inconsistent status display     |
| B4 | Direct chrome.storage.local read         | MEDIUM   | Bypasses business logic         |

### 7.2 Architectural Issues

1. **No Single Source of Truth:** State scattered across storage API and background.ts memory
2. **Unauthorized Access:** popup.tsx reads blacklist directly, bypassing background.ts
3. **State Inference:** Deducing whitelist from navigation state is fundamentally unreliable
4. **Message Handler Not Used:** Existing correct `checkDomain` handler is available but unused

---

## 8. Implementation Checklist

### 8.1 Required Changes

- [ ] **popup.tsx**: Replace direct storage read with `checkDomain` message
- [ ] **popup.tsx**: Remove whitelist inference logic (`isWhitelisted = !isBlockedPage && isInScamList`)
- [ ] **popup.tsx**: Update state display logic to prioritize whitelist state
- [ ] **popup.tsx**: Update CSS for distinct whitelisted styling (amber/yellow)
- [ ] **popup.tsx**: Update message text for whitelisted domains
- [ ] **Tests**: Update popup.test.ts to verify correct state display
- [ ] **Tests**: Add integration test for whitelist display bug

### 8.2 Validation Steps

1. ✅ Verify background.ts `checkDomain` returns correct `isWhitelisted`
2. ✅ Verify popup.tsx calls `checkDomain` message instead of direct storage read
3. ✅ Test display states:
   - Safe domain → Green "Bezpečná stránka"
   - Blocked domain → Red "Stránka blokována"
   - Whitelisted domain → Amber "Rizikový e-shop (Povoleno)"
4. ✅ Test state transitions: Blocked → Whitelist → Display updated
5. ✅ Test edge cases: Multiple tabs, extension reload, race conditions

---

## 9. Testing Strategy

### 9.1 Unit Tests

```typescript
describe('Popup State Display', () => {
  it('should display safe status for non-blacklisted domain', async () => {
    mockResponse({ isScam: false, isWhitelisted: false });
    // Assert: Green "Bezpečná stránka"
  });

  it('should display whitelisted status for allowed risky domain', async () => {
    mockResponse({ isScam: true, isWhitelisted: true, reason: 'Bad shop' });
    // Assert: Amber "Rizikový e-shop (Povoleno)"
  });

  it('should display blocked status on blocked.html', async () => {
    mockTab({ url: 'chrome-extension://.../blocked.html?url=...' });
    mockResponse({ isScam: true, isWhitelisted: false });
    // Assert: Red "Stránka blokována"
  });
});
```

### 9.2 Integration Test

```typescript
describe('Whitelist Display Bug', () => {
  it('should show whitelisted status after clicking Continue', async () => {
    // 1. Navigate to risky domain → blocked
    // 2. Click "Continue" → adds to whitelist
    // 3. Open popup
    // 4. Verify: Amber "Rizikový e-shop (Povoleno)"
  });

  it('should reset to blocked after browser restart', async () => {
    // 1. Whitelist domain
    // 2. Simulate browser restart (clear allowedDomains)
    // 3. Navigate to same domain
    // 4. Verify: Blocked again
  });
});
```

---

## 10. Recommendations

### 10.1 Immediate Actions (P0)

1. **Fix popup.tsx state detection** - Use `checkDomain` message handler
2. **Remove whitelist inference logic** - Delete lines 140-142 in popup.tsx
3. **Update display logic** - Prioritize whitelist state over safe state
4. **Add tests** - Verify whitelisted domain displays correctly

### 10.2 Future Improvements (P1)

1. **State synchronization** - Implement state change events from background → popup
2. **Storage consolidation** - Store whitelist in chrome.storage.session for consistency
3. **State validation** - Add assertions to prevent invalid states (e.g., whitelisted non-blacklisted domain)
4. **Error handling** - Handle message handler failures gracefully

### 10.3 Architecture Improvements (P2)

1. **State management library** - Consider Redux/Zustand for complex state
2. **Message bus** - Implement pub/sub for state updates
3. **State snapshots** - Log state transitions for debugging
4. **Type safety** - Stronger TypeScript types for state transitions

---

## Appendix A: State Verification Commands

### Check Background State (Console in background.html)
```javascript
// View whitelist
console.log(allowedDomains);

// View protection state
console.log(protectionEnabled);

// View blacklist size
console.log(scamDomains.size);
```

### Check Storage State (Console in popup)
```javascript
// View persistent blacklist
chrome.storage.local.get(['scamDomains', 'lastUpdate'], console.log);

// View session protection state
chrome.storage.session.get(['protectionEnabled'], console.log);
```

### Trigger State Check (Console in popup)
```javascript
// Query background for domain state
chrome.runtime.sendMessage(
  { action: 'checkDomain', url: 'https://scam.com' },
  console.log
);
```

---

## Appendix B: State Flow Sequence Diagrams

### Correct Flow (Proposed)
```
User → Tab → background.ts → popup.tsx
  1. User whitelists domain (clicks "Continue")
  2. blocked.html sends allowDomain message
  3. background.ts adds to allowedDomains set
  4. User opens popup
  5. popup.tsx sends checkDomain message
  6. background.ts checks allowedDomains
  7. background.ts returns { isWhitelisted: true }
  8. popup.tsx displays amber "Rizikový e-shop (Povoleno)"
```

### Broken Flow (Current)
```
User → Tab → background.ts     popup.tsx
  1. User whitelists domain            (isolated)
  2. background.ts adds to set         |
  3. User opens popup                  |
  4.                                   ▼
  5.                    popup reads chrome.storage.local
  6.                    popup checks if on blocked page
  7.                    popup INFERS whitelist state ❌
  8.                    popup displays WRONG status ❌
```

---

**Document Version:** 1.0
**Date:** 2025-12-05
**Author:** State Management Analyst
**Status:** Analysis Complete - Ready for Implementation
