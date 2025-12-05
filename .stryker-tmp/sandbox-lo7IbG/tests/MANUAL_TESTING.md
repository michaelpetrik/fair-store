# Manual Testing Guide

This guide covers manual testing procedures for Fair Store extension functionality that cannot be automatically tested.

## Prerequisites

1. Load the extension in Chrome (Developer mode)
2. Open Chrome DevTools Console to monitor logs
3. Have access to the ČOI CSV file or mock data

## Test Scenarios

### 1. Extension Installation & Startup

**Test Case 1.1: Fresh Installation**
- [ ] Load unpacked extension
- [ ] Check console for "Fair Store extension installed"
- [ ] Verify CSV is fetched from ČOI
- [ ] Check console for "✅ Loaded X domains from ČOI"
- [ ] Verify no errors in console

**Test Case 1.2: Extension Reload**
- [ ] Reload extension from chrome://extensions
- [ ] Verify CSV is re-fetched
- [ ] Check that cached data is used if fetch fails
- [ ] Verify domain count is correct

**Test Case 1.3: Offline Mode**
- [ ] Disconnect internet
- [ ] Reload extension
- [ ] Check console for "📦 Loaded X domains from cache"
- [ ] Verify extension still works with cached data

---

### 2. Warning Popup Display

**Test Case 2.1: Navigate to Risky Domain**
- [ ] Find a domain from ČOI list
- [ ] Navigate to the domain
- [ ] Verify warning popup appears immediately
- [ ] Check overlay covers entire viewport
- [ ] Verify red gradient background
- [ ] Verify warning title is visible

**Test Case 2.2: Subdomain Matching**
- [ ] If `example.com` is in list, visit `www.example.com`
- [ ] Verify warning appears
- [ ] Check that matched domain is shown correctly
- [ ] Try multiple subdomain levels (e.g., `shop.www.example.com`)

**Test Case 2.3: Safe Domain - No Warning**
- [ ] Visit google.com
- [ ] Verify NO warning appears
- [ ] Visit wikipedia.org
- [ ] Verify NO warning appears

**Test Case 2.4: Multiple Tabs**
- [ ] Open risky domain in Tab 1
- [ ] Verify warning appears
- [ ] Open same risky domain in Tab 2
- [ ] Verify warning appears in Tab 2
- [ ] Verify warnings are independent

**Test Case 2.5: Navigation After Warning**
- [ ] See warning on risky domain
- [ ] Click browser back button
- [ ] Verify warning is removed
- [ ] Navigate forward
- [ ] Verify warning appears again

---

### 3. Warning Popup Interactions

**Test Case 3.1: Close Tab Button**
- [ ] Click "Zavřít záložku" button
- [ ] Verify tab closes immediately
- [ ] Verify no errors in console

**Test Case 3.2: Ignore Button**
- [ ] Click "Ignorovat a pokračovat" button
- [ ] Verify overlay is removed
- [ ] Verify page content is visible
- [ ] Refresh page
- [ ] Verify warning appears again (not permanently ignored)

**Test Case 3.3: Show Details Toggle**
- [ ] Click "Zobrazit podrobnosti od ČOI"
- [ ] Verify details section expands smoothly
- [ ] Verify ČOI reason is displayed
- [ ] Verify button text changes to "Skrýt podrobnosti"
- [ ] Click again to collapse
- [ ] Verify section collapses smoothly

**Test Case 3.4: ČOI Source Badge**
- [ ] Verify "Oficiální zdroj: ČOI" badge is visible
- [ ] Check that badge has checkmark icon
- [ ] Verify badge styling is correct

---

### 4. Extension Popup UI

**Test Case 4.1: Safe Page**
- [ ] Visit google.com
- [ ] Click extension icon
- [ ] Verify status shows "Stránka je bezpečná"
- [ ] Verify green checkmark icon
- [ ] Verify domain count is shown
- [ ] Verify warnings count is shown

**Test Case 4.2: Risky Page**
- [ ] Visit domain from ČOI list
- [ ] Click extension icon
- [ ] Verify status shows "⚠️ Varování!"
- [ ] Verify red warning indicator
- [ ] Verify domain name is shown

**Test Case 4.3: Chrome Pages**
- [ ] Visit chrome://extensions/
- [ ] Click extension icon
- [ ] Verify status shows "Speciální stránka prohlížeče"
- [ ] Verify appropriate message

**Test Case 4.4: Report Button**
- [ ] Click extension icon
- [ ] Click "Nahlásit podvodnou stránku"
- [ ] Verify new tab opens to GitHub issues

---

### 5. CSV Data Handling

**Test Case 5.1: Valid CSV with Semicolons**
```
Mock CSV:
url;důvod
example.com;Podvodný e-shop
fake-shop.cz;Nedodání zboží
```
- [ ] Load extension with mock data
- [ ] Verify both domains are loaded
- [ ] Visit each domain
- [ ] Verify correct reason is shown

**Test Case 5.2: Valid CSV with Commas**
```
Mock CSV:
domain,reason
example.com,Fraudulent shop
```
- [ ] Test comma-delimited CSV
- [ ] Verify parsing works correctly

**Test Case 5.3: CSV with Various Column Names**
- [ ] Test with "URL" column
- [ ] Test with "doména" column
- [ ] Test with "www" column
- [ ] Test with "popis" column for reason
- [ ] Verify all variants work

**Test Case 5.4: Malformed CSV**
- [ ] Test with missing reason column
- [ ] Test with empty lines
- [ ] Test with quoted values
- [ ] Test with special characters in reasons
- [ ] Verify graceful handling

---

### 6. Domain Cleaning & Matching

**Test Case 6.1: Protocol Removal**
- [ ] Add `https://example.com` to CSV
- [ ] Verify domain is cleaned to `example.com`
- [ ] Visit `http://example.com`
- [ ] Verify warning appears

**Test Case 6.2: Path Removal**
- [ ] Add `example.com/path/to/page` to CSV
- [ ] Verify domain is cleaned to `example.com`

**Test Case 6.3: WWW Prefix**
- [ ] Add `www.example.com` to CSV
- [ ] Visit `www.example.com`
- [ ] Verify warning appears
- [ ] Visit `example.com` (without www)
- [ ] Verify warning does NOT appear (strict matching)

**Test Case 6.4: Case Sensitivity**
- [ ] Add `Example.COM` to CSV
- [ ] Verify stored as `example.com`
- [ ] Visit `EXAMPLE.COM`
- [ ] Verify warning appears

---

### 7. Edge Cases

**Test Case 7.1: Very Long Domain Names**
- [ ] Test with 253-character domain name
- [ ] Verify it displays correctly in popup
- [ ] Verify no layout issues

**Test Case 7.2: Very Long Reasons**
- [ ] Test with 10,000-character reason
- [ ] Verify details section is scrollable
- [ ] Verify no performance issues

**Test Case 7.3: Special Characters**
- [ ] Test domain: `háčky-čárky.cz`
- [ ] Test reason: `Důvod s háčky: ěščřžýáíé`
- [ ] Verify all characters display correctly

**Test Case 7.4: XSS Attempts**
- [ ] Add malicious domain: `<script>alert(1)</script>.com`
- [ ] Add malicious reason: `<img src=x onerror=alert(1)>`
- [ ] Verify HTML is escaped
- [ ] Verify no scripts execute
- [ ] Check DevTools Console for errors

**Test Case 7.5: Empty/Null Values**
- [ ] Test empty domain in CSV
- [ ] Test empty reason in CSV
- [ ] Verify graceful handling
- [ ] Verify no crashes

**Test Case 7.6: Large CSV Files**
- [ ] Test with 10,000+ domains
- [ ] Verify parsing completes
- [ ] Check performance (<10 seconds)
- [ ] Verify domain checking is fast (<100ms)

**Test Case 7.7: Network Failures**
- [ ] Block ČOI URL in DevTools Network tab
- [ ] Reload extension
- [ ] Verify fallback to cached data
- [ ] Verify error logged in console

---

### 8. Performance Testing

**Test Case 8.1: Page Load Performance**
- [ ] Visit safe domain
- [ ] Measure page load time
- [ ] Should not add >100ms delay

**Test Case 8.2: Warning Display Speed**
- [ ] Visit risky domain
- [ ] Warning should appear within 200ms
- [ ] No visible flickering

**Test Case 8.3: Multiple Rapid Navigations**
- [ ] Navigate to 10 different domains rapidly
- [ ] Verify extension responds to each
- [ ] Verify no memory leaks
- [ ] Check chrome://extensions Task Manager

**Test Case 8.4: CSV Fetch Performance**
- [ ] Monitor network tab during fetch
- [ ] CSV should load in <5 seconds
- [ ] Verify gzip compression is used (if available)

---

### 9. Responsive Design

**Test Case 9.1: Desktop (1920x1080)**
- [ ] Verify popup is centered
- [ ] Verify max-width is respected (600px)
- [ ] Verify all elements are readable

**Test Case 9.2: Laptop (1366x768)**
- [ ] Verify popup fits on screen
- [ ] Verify no scrolling required

**Test Case 9.3: Small Screens (800x600)**
- [ ] Verify popup is responsive
- [ ] Verify buttons stack on mobile
- [ ] Verify all content is accessible

**Test Case 9.4: Browser Zoom**
- [ ] Test at 50% zoom
- [ ] Test at 100% zoom
- [ ] Test at 200% zoom
- [ ] Verify popup remains usable

---

### 10. Browser Compatibility

**Test Case 10.1: Chrome**
- [ ] Test on Chrome 120+
- [ ] Verify all features work
- [ ] Check for console warnings

**Test Case 10.2: Chromium**
- [ ] Test on Chromium
- [ ] Verify manifest v3 compatibility

**Test Case 10.3: Edge**
- [ ] Test on Microsoft Edge
- [ ] Verify extension loads
- [ ] Verify CSV fetch works

**Test Case 10.4: Brave**
- [ ] Test on Brave browser
- [ ] Verify no privacy conflicts

---

### 11. Storage & Persistence

**Test Case 11.1: Chrome Storage**
- [ ] Open chrome://extensions > Service worker > Inspect
- [ ] Run: `chrome.storage.local.get(null, console.log)`
- [ ] Verify `scamDomains` array exists
- [ ] Verify `lastUpdate` timestamp exists

**Test Case 11.2: Storage Persistence**
- [ ] Load extension
- [ ] Close Chrome completely
- [ ] Reopen Chrome
- [ ] Verify extension uses cached data
- [ ] Check lastUpdate timestamp

**Test Case 11.3: Storage Quota**
- [ ] Load large CSV (10,000 domains)
- [ ] Verify storage doesn't exceed quota
- [ ] Check chrome.storage.local.QUOTA_BYTES

---

### 12. Security Testing

**Test Case 12.1: Content Security Policy**
- [ ] Open DevTools Console
- [ ] Check for CSP violations
- [ ] Verify no inline scripts

**Test Case 12.2: XSS Prevention**
- [ ] Try injecting scripts via domain names
- [ ] Try injecting scripts via reasons
- [ ] Verify all content is sanitized

**Test Case 12.3: Data Privacy**
- [ ] Open DevTools Network tab
- [ ] Verify no data sent to external servers
- [ ] Verify only ČOI CSV is fetched
- [ ] Verify no tracking/analytics

---

## Reporting Issues

When you find a bug:
1. Document the exact steps to reproduce
2. Include browser version and OS
3. Attach screenshot if UI-related
4. Include console logs if applicable
5. Report at: https://github.com/michaelpetrik/fair-store/issues

## Test Coverage Summary

- ✅ Installation & Startup
- ✅ Warning Display
- ✅ User Interactions
- ✅ CSV Parsing
- ✅ Domain Matching
- ✅ Edge Cases
- ✅ Performance
- ✅ Responsive Design
- ✅ Browser Compatibility
- ✅ Storage & Persistence
- ✅ Security

---

**Last Updated:** 2025-11-18
**Version:** 1.1.0
