# Fair Store - Deployment Guide

## Overview

This guide covers building, packaging, and publishing the Fair Store extension to the Chrome Web Store.

## Pre-Deployment Checklist

### 1. Code Quality

- [ ] All tests pass (`npm test`)
- [ ] No console errors in production build
- [ ] TypeScript compiles without errors (`npm run build`)
- [ ] Code follows style guidelines
- [ ] All TODO comments resolved or documented

### 2. Functionality

- [ ] Extension loads without errors
- [ ] All features work as expected
- [ ] CSV loads from ČOI successfully
- [ ] Domain checking works correctly
- [ ] Popup UI displays properly
- [ ] Blocked page appears for scam domains
- [ ] "Continue anyway" functionality works
- [ ] Protection toggle works

### 3. Documentation

- [ ] README.md is up-to-date
- [ ] CHANGELOG.md updated with new version
- [ ] All documentation files reviewed
- [ ] Screenshots updated (if UI changes)
- [ ] Privacy policy reviewed

### 4. Version

- [ ] `manifest.json` version updated
- [ ] `package.json` version matches manifest
- [ ] Git tag created for version
- [ ] CHANGELOG.md includes version notes

### 5. Assets

- [ ] All icons (16x16, 48x48, 128x128) present
- [ ] Screenshots for Web Store (1280x800 or 640x400)
- [ ] Promotional images (if needed)

## Build Process

### 1. Clean Previous Build

```bash
rm -rf dist/
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run Tests

```bash
npm test
```

### 4. Build Extension

```bash
npm run build
```

This creates the `dist/` directory with:
- Compiled JavaScript
- Manifest file
- Assets (icons, HTML, CSS)
- Optimized and minified code

### 5. Verify Build

```bash
# Check dist/ contents
ls -la dist/

# Verify manifest
cat dist/manifest.json

# Check file sizes
du -sh dist/*
```

**Expected structure**:
```
dist/
├── manifest.json
├── src/
│   ├── background.js
│   └── pages/
│       ├── blocked.html
│       └── blocked.js
├── popup/
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## Manual Testing (Production Build)

### 1. Load Unpacked Extension

1. Open Chrome: `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `dist/` folder

### 2. Test Core Functionality

- [ ] Extension icon appears
- [ ] Popup opens correctly
- [ ] Navigate to scam domain → redirects to blocked page
- [ ] "Continue anyway" works
- [ ] Protection toggle works
- [ ] Stats display correctly

### 3. Test Edge Cases

- [ ] Offline mode (disconnect internet)
- [ ] Invalid URLs
- [ ] Chrome internal pages (chrome://)
- [ ] Extension pages (chrome-extension://)

## Package for Distribution

### 1. Create ZIP Archive

```bash
cd dist/
zip -r ../fair-store-v1.1.0.zip .
cd ..
```

**Important**:
- Zip from inside `dist/` (not including `dist/` folder itself)
- Manifest must be at root of ZIP
- Max size: 20MB (Chrome Web Store limit)

### 2. Verify ZIP Contents

```bash
unzip -l fair-store-v1.1.0.zip

# Should see:
# manifest.json (at root)
# src/background.js
# popup/popup.html
# icons/*
```

## Chrome Web Store Submission

### 1. Developer Dashboard

URL: https://chrome.google.com/webstore/devconsole

### 2. Create New Item (First Time Only)

1. Pay one-time $5 developer registration fee
2. Click "New Item"
3. Upload ZIP file
4. Fill in metadata

### 3. Update Existing Item

1. Go to item in dashboard
2. Click "Package" tab
3. Upload new ZIP
4. Click "Submit for review"

### 4. Required Metadata

**Store Listing**:
- **Name**: Fair Store - Ochrana před podvodnými e-shopy
- **Summary**: Chrání české spotřebitele pomocí dat České obchodní inspekce (ČOI)
- **Description**: (Full description from README.md)
- **Category**: Shopping
- **Language**: Czech

**Screenshots** (1280x800 or 640x400):
1. Popup showing safe domain
2. Popup showing scam warning
3. Blocked page example
4. Protection toggle

**Promotional Images** (Optional):
- Small tile: 440x280
- Marquee: 1400x560

**Privacy Policy**:
```
Privacy Policy for Fair Store

Data Collection:
- Fair Store does NOT collect any personal data
- All domain checking happens locally in your browser
- No browsing history is tracked or transmitted

Data Sources:
- Scam domain list fetched from Czech Trade Inspection (ČOI)
- URL: https://www.coi.gov.cz/userdata/files/dokumenty-ke-stazeni/open-data/rizikove-seznam.csv

Data Storage:
- Scam domain list cached locally for offline use
- User preferences stored locally (protection on/off)
- No data sent to external servers

Permissions:
- storage: Cache scam domains
- tabs: Monitor navigation and check domains
- host_permissions (ČOI): Fetch official scam list

Contact:
- GitHub: https://github.com/michaelpetrik/fair-store
- Email: [your email]

This extension is open source under MIT license.
```

**Justification** (for permissions):
```
storage: Required to cache scam domains from ČOI for offline use
tabs: Required to monitor navigation and check domains before pages load
host_permissions (www.coi.gov.cz): Required to fetch official scam list from Czech government
```

### 5. Review Process

**Timeline**:
- Initial review: 1-3 business days
- Updates: Few hours to 1 day
- Expedited review available for critical fixes

**Common Rejection Reasons**:
- Excessive permissions
- Missing privacy policy
- Unclear permission justification
- Code obfuscation
- Malicious behavior

**If Rejected**:
1. Read rejection reason carefully
2. Make requested changes
3. Re-submit with explanation

## Version Management

### Semantic Versioning

Follow [Semver](https://semver.org/):

- **Major** (1.0.0 → 2.0.0): Breaking changes
- **Minor** (1.0.0 → 1.1.0): New features (backwards compatible)
- **Patch** (1.0.0 → 1.0.1): Bug fixes

### Update Version

**1. Update manifest.json**:
```json
{
  "version": "1.1.0"
}
```

**2. Update package.json**:
```json
{
  "version": "1.1.0"
}
```

**3. Update CHANGELOG.md**:
```markdown
## [1.1.0] - 2025-01-15

### Added
- Protection toggle in popup
- Session-based domain whitelist

### Fixed
- CSV parsing for malformed data
- Memory leak in domain checker

### Changed
- Improved error handling in popup
```

**4. Git Tag**:
```bash
git tag -a v1.1.0 -m "Release version 1.1.0"
git push origin v1.1.0
```

## Rollback Procedure

If critical bug found after release:

### 1. Quick Fix

```bash
# Create hotfix branch
git checkout -b hotfix/critical-bug

# Fix the bug
# ...

# Test thoroughly
npm test

# Build
npm run build

# Update version (patch)
# manifest.json: 1.1.0 → 1.1.1

# Commit and tag
git commit -am "fix: critical bug in domain checker"
git tag v1.1.1

# Push
git push origin hotfix/critical-bug
git push origin v1.1.1
```

### 2. Emergency Rollback

If fix takes time:

1. Go to Chrome Web Store dashboard
2. Upload previous working version
3. Submit for expedited review
4. Add note: "Emergency rollback due to critical bug"

## Post-Deployment

### 1. Monitor

- [ ] Check Web Store listing is live
- [ ] Monitor reviews for bug reports
- [ ] Watch GitHub issues
- [ ] Check analytics (if implemented)

### 2. Announce

- [ ] Update GitHub README with latest version
- [ ] Post on social media (if applicable)
- [ ] Notify users via update notes in Web Store

### 3. Backup

```bash
# Tag release
git tag v1.1.0

# Archive build
cp fair-store-v1.1.0.zip releases/

# Commit to repository
git add CHANGELOG.md manifest.json package.json
git commit -m "chore: bump version to 1.1.0"
git push origin main
git push --tags
```

## Continuous Deployment (Future)

### GitHub Actions Workflow

```yaml
name: Release
on:
  push:
    tags:
      - 'v*'

jobs:
  build-and-release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install

      - name: Run tests
        run: npm test

      - name: Build extension
        run: npm run build

      - name: Package extension
        run: |
          cd dist
          zip -r ../fair-store-${{ github.ref_name }}.zip .
          cd ..

      - name: Create GitHub Release
        uses: softprops/action-gh-release@v1
        with:
          files: fair-store-${{ github.ref_name }}.zip
          draft: false
          prerelease: false
```

## Security Considerations

### Before Release

- [ ] No API keys or secrets in code
- [ ] No debugging console.logs with sensitive data
- [ ] All dependencies scanned for vulnerabilities
- [ ] Code reviewed for XSS vulnerabilities
- [ ] Permissions minimized

### Vulnerability Scanning

```bash
# Check dependencies
npm audit

# Fix vulnerabilities
npm audit fix

# Manual check
grep -r "API_KEY" src/
grep -r "PASSWORD" src/
grep -r "SECRET" src/
```

## Beta Testing (Optional)

### Private Beta

1. Create beta version: `1.1.0-beta.1`
2. Package extension
3. Share link with testers
4. Collect feedback
5. Fix issues
6. Release stable version

### Public Beta

1. Create separate Web Store listing
2. Mark as "Beta" in name
3. Use different extension ID
4. Promote to stable after testing

## Metrics & Analytics (Future)

**Privacy-Respecting Metrics**:
- Total installs (Web Store provides)
- Version distribution
- Error rates (aggregate only)
- Performance metrics (local collection)

**Never Collect**:
- User identities
- Browsing history
- Visited URLs
- Personal data

## Support Channels

### User Support

- **GitHub Issues**: Bug reports and feature requests
- **Web Store Reviews**: Respond to user reviews
- **Email**: [support email]

### Response Times

- **Critical bugs**: < 24 hours
- **Bug reports**: < 3 days
- **Feature requests**: < 1 week acknowledgment

## Legal Compliance

### Required Documents

- [ ] Privacy Policy (in Web Store)
- [ ] Terms of Service (optional)
- [ ] MIT License (in repository)
- [ ] Disclaimer (in README)

### GDPR Compliance

Fair Store is GDPR-compliant because:
- No personal data collected
- All processing is local
- No data transmitted to servers
- User has full control (can uninstall)

## Resources

- [Chrome Web Store Developer Policies](https://developer.chrome.com/docs/webstore/program-policies/)
- [Extension Manifest Documentation](https://developer.chrome.com/docs/extensions/mv3/manifest/)
- [Web Store Publishing Guide](https://developer.chrome.com/docs/webstore/publish/)

---

**Deployment Checklist**: Use this as a checklist before each release to ensure nothing is missed.
