# Fair Store - Chrome Extension

## Project Overview

Fair Store is a Chrome browser extension designed to protect Czech consumers from fraudulent e-commerce websites. The extension actively monitors visited domains and compares them against a database of known scam websites that sell fake or illegal products in the Czech Republic.

When a user visits a flagged domain, the extension displays a prominent red overlay banner warning them that the website is potentially fraudulent.

## Purpose

- **Consumer Protection**: Prevent users from purchasing counterfeit or illegal products
- **Scam Prevention**: Alert users before they engage with fraudulent e-commerce sites
- **Czech Market Focus**: Specifically targets scams affecting the Czech Republic market

## Architecture

### Core Components

1. **Background Script** (`background.js` or `service_worker.js`)
   - Monitors navigation events
   - Manages domain checking logic
   - Coordinates between different parts of the extension

2. **Content Script** (`content.js`)
   - Injected into web pages
   - Displays warning overlay when a scam domain is detected
   - Manages UI interactions on the page

3. **Scam Database** (`scam-domains.json` or similar)
   - Contains list of known fraudulent domains
   - Can be updated periodically
   - May include metadata about each scam (type, severity, etc.)

4. **Manifest File** (`manifest.json`)
   - Extension configuration
   - Permissions (tabs, activeTab, storage)
   - Content Security Policy
   - Background and content script declarations

5. **Warning Overlay UI**
   - CSS for prominent red banner
   - User-friendly warning message in Czech/English
   - Options to proceed anyway or go back

### Technical Flow

```
User visits website
    ↓
Background script detects navigation
    ↓
Extract current domain
    ↓
Check against scam database
    ↓
If match found → Inject content script
    ↓
Display red warning overlay
```

## File Structure

```
fair-store/
├── manifest.json           # Extension manifest (v3)
├── background.js          # Background service worker
├── content/
│   ├── content.js        # Content script
│   └── warning.css       # Warning overlay styles
├── data/
│   └── scam-domains.json # Database of fraudulent domains
├── popup/
│   ├── popup.html        # Extension popup UI
│   ├── popup.js          # Popup logic
│   └── popup.css         # Popup styles
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── package.json
└── README.md
```

## Key Features

### 1. Domain Checking
- Extract and normalize current domain
- Compare against known scam list
- Handle subdomains and variations
- Case-insensitive matching

### 2. Warning Display
- Full-screen red overlay (high visibility)
- Clear warning message in Czech language
- Information about why the site is flagged
- Options: "Go Back" and "Proceed Anyway" (with disclaimer)
- Non-intrusive close option for false positives

### 3. Database Management
- JSON file with scam domains
- Update mechanism (manual or automatic)
- Categorization of scams (counterfeit, illegal goods, etc.)
- Metadata: date added, severity, description

### 4. User Settings (Optional)
- Enable/disable extension
- Whitelist trusted domains
- Report new scam sites
- Update database

## Chrome Extension Manifest V3

This extension should use Manifest V3 (latest standard):

```json
{
  "manifest_version": 3,
  "name": "Fair Store - Scam Detector",
  "version": "1.0.0",
  "description": "Detects fraudulent e-commerce sites in Czech Republic",
  "permissions": [
    "tabs",
    "storage",
    "activeTab"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content/content.js"],
      "css": ["content/warning.css"]
    }
  ],
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  }
}
```

## Development

### Setup
```bash
npm install
```

### Testing
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `fair-store` directory

### Building
- No build step required for basic extension
- For production: minify JS/CSS, optimize images

### Debugging
- Use Chrome DevTools for content scripts
- Use Extension Service Worker DevTools for background script
- Check `chrome://extensions/` for errors

## Legal & Compliance

### Important Considerations
- **Accuracy**: Ensure scam database is accurate to avoid false positives
- **Liability**: Include disclaimers about extension's advisory nature
- **Privacy**: Don't collect or transmit user browsing data
- **Updates**: Keep scam database current and accurate

### Czech Republic Specific
- Warning messages in Czech language
- Focus on Czech consumer protection laws
- Comply with EU GDPR requirements

## Security

- No external API calls (keep data local for privacy)
- Content Security Policy to prevent XSS
- Validate all domain inputs
- Secure storage of user preferences
- No tracking or analytics

## Future Enhancements

1. **Community Reporting**: Allow users to report new scam sites
2. **API Integration**: Connect to Czech consumer protection databases
3. **Risk Scoring**: Categorize threats by severity
4. **Statistics**: Show users how many scams blocked
5. **Multi-language**: Add English, Slovak support
6. **Crowdsourced Database**: Community-maintained scam list
7. **Browser Sync**: Sync settings across devices

## Contributing

When contributing to this project:
1. Test thoroughly with known scam domains
2. Ensure overlay doesn't break legitimate sites
3. Keep database format consistent
4. Update documentation for new features
5. Follow Chrome extension best practices

## Resources

- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)
- [Manifest V3 Migration Guide](https://developer.chrome.com/docs/extensions/mv3/intro/)
- [Content Scripts Guide](https://developer.chrome.com/docs/extensions/mv3/content_scripts/)
- [Czech Trade Inspection Authority](https://www.coi.cz/) - Official scam reports

## License

ISC
