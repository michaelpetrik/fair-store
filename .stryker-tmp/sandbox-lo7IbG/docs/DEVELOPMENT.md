# Fair Store - Development Guide

## Getting Started

### Prerequisites

- **Node.js**: v18 or higher
- **npm**: v9 or higher
- **Chrome/Chromium**: Latest version
- **Git**: For version control
- **Code Editor**: VS Code recommended

### Initial Setup

1. **Clone the repository**:
```bash
git clone https://github.com/michaelpetrik/fair-store.git
cd fair-store
```

2. **Install dependencies**:
```bash
npm install
```

3. **Build the extension**:
```bash
npm run build
```

4. **Load in Chrome**:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right)
   - Click "Load unpacked"
   - Select the `dist` folder from the project

## Project Structure

```
fair-store/
├── src/
│   ├── background.ts          # Background service worker
│   └── pages/
│       ├── blocked.html       # Warning page HTML
│       └── blocked.ts         # Warning page script
├── popup/
│   ├── popup.html             # Popup UI HTML
│   ├── popup.js               # Popup logic
│   └── popup.css              # Popup styles
├── icons/
│   ├── icon16.png             # 16x16 icon
│   ├── icon48.png             # 48x48 icon
│   └── icon128.png            # 128x128 icon
├── docs/
│   ├── ARCHITECTURE.md        # System architecture
│   ├── API.md                 # Message API docs
│   ├── PERMISSIONS.md         # Permission justification
│   ├── DEVELOPMENT.md         # This file
│   ├── TESTING.md             # Testing guide
│   └── DEPLOYMENT.md          # Deployment guide
├── tests/
│   └── background.test.ts     # Unit tests
├── manifest.json              # Extension manifest (MV3)
├── package.json               # NPM dependencies
├── vite.config.ts             # Build configuration
├── tsconfig.json              # TypeScript config
└── README.md                  # User documentation
```

## Development Workflow

### 1. Make Changes

Edit source files in `src/`, `popup/`, or other directories.

### 2. Build

```bash
npm run build
```

This compiles TypeScript and bundles the extension into `dist/`.

### 3. Reload Extension

- Go to `chrome://extensions/`
- Click the reload icon for Fair Store
- Or press `Ctrl+R` (Windows/Linux) / `Cmd+R` (Mac) on the extensions page

### 4. Test Changes

- Click extension icon to test popup
- Navigate to test URLs to verify domain checking
- Check console for errors: Right-click extension icon → "Inspect popup"

### 5. Run Tests

```bash
npm test                # Run all tests
npm run test:watch      # Watch mode
npm run test:coverage   # With coverage report
```

## Build System

### Vite Configuration

The project uses **Vite** with **@crxjs/vite-plugin** for Chrome extension bundling.

**Key features**:
- Hot module replacement (HMR) in development
- TypeScript compilation
- Automatic manifest generation
- Asset optimization

**Configuration** (`vite.config.ts`):
```typescript
import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json';

export default defineConfig({
  plugins: [crx({ manifest })],
  build: {
    rollupOptions: {
      input: {
        background: 'src/background.ts',
        blocked: 'src/pages/blocked.ts',
        popup: 'popup/popup.js'
      }
    }
  }
});
```

### TypeScript Configuration

**Compiler options** (`tsconfig.json`):
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM"],
    "types": ["chrome"],
    "strict": true,
    "esModuleInterop": true
  }
}
```

## Code Style Guidelines

### TypeScript/JavaScript

**Naming conventions**:
```typescript
// Variables & functions: camelCase
const scamDomains = new Map();
function loadScamDomains() { }

// Constants: UPPER_SNAKE_CASE
const COI_CSV_URL = 'https://...';

// Classes & Interfaces: PascalCase
interface DomainCheckResult { }
class DomainChecker { }

// Private properties: prefix with underscore
class Foo {
  private _cache: Map;
}
```

**Code formatting**:
- **Indentation**: 4 spaces (not tabs)
- **Line length**: Max 120 characters
- **Semicolons**: Required
- **Quotes**: Single quotes for strings
- **Trailing commas**: Yes (for multi-line)

**Example**:
```typescript
const domains = new Map<string, string>([
    ['scam.com', 'Podvodný e-shop'],
    ['fake.cz', 'Neexistující zboží'],
]);
```

### JSDoc Comments

All public functions must have JSDoc comments:

```typescript
/**
 * Clean and normalize domain string
 *
 * @param domain - Raw domain string (may include protocol, path, etc.)
 * @returns Cleaned domain name in lowercase (e.g., "example.com")
 *
 * @example
 * cleanDomain("https://www.example.com/path") === "www.example.com"
 * cleanDomain("example.com:8080") === "example.com"
 */
export function cleanDomain(domain: string): string {
    // Implementation...
}
```

### HTML/CSS

**HTML**:
- Semantic tags (`<button>`, `<section>`, `<header>`)
- Accessible (ARIA labels where needed)
- Valid HTML5

**CSS**:
- BEM naming: `.block__element--modifier`
- Mobile-first responsive design
- CSS custom properties for theming

## Debugging

### Console Logging

**Background worker**:
```bash
chrome://extensions/ → Fair Store → "service worker" link → Console
```

**Popup**:
```bash
Right-click extension icon → "Inspect popup" → Console
```

**Content/Blocked page**:
```bash
F12 on the page → Console
```

### Breakpoints

Set breakpoints in DevTools Sources tab:
- Background: `chrome-extension://<id>/src/background.js`
- Popup: `chrome-extension://<id>/popup/popup.js`

### Common Issues

**Issue**: Extension not loading
- **Solution**: Check `manifest.json` syntax with JSON validator

**Issue**: "Service worker registration failed"
- **Solution**: Syntax error in `background.ts` - check console

**Issue**: Changes not reflected
- **Solution**: Click reload on `chrome://extensions/`

**Issue**: "Cannot access chrome.tabs"
- **Solution**: Ensure `tabs` permission in manifest

**Issue**: CSV fetch fails
- **Solution**: Check `host_permissions` includes ČOI domain

### Debugging Tools

**Chrome Extension DevTools**:
```bash
chrome://extensions/ → Developer mode → Service worker inspector
```

**Storage Inspector**:
```javascript
// In popup or background console:
chrome.storage.local.get(null, console.log);  // All local storage
chrome.storage.session.get(null, console.log);  // Session storage
```

**Network Inspector**:
```javascript
// Monitor fetch requests in background worker console
fetch = new Proxy(fetch, {
  apply(target, thisArg, args) {
    console.log('Fetching:', args[0]);
    return Reflect.apply(target, thisArg, args);
  }
});
```

## Performance Profiling

### Memory Usage

```javascript
// In background worker console:
console.log('Memory usage:', performance.memory);
console.log('Scam domains:', scamDomains.size);
```

### Domain Check Performance

```javascript
console.time('checkDomain');
const result = checkDomain('example.com');
console.timeEnd('checkDomain');
// Typical: < 1ms for 1000 domains
```

### CSV Parsing Performance

```javascript
console.time('parseCSV');
const domains = parseCSV(csvText);
console.timeEnd('parseCSV');
// Typical: 10-50ms for 1000 domains
```

## Testing Strategy

### Unit Tests

Test individual functions in isolation:

```typescript
import { describe, it, expect } from 'vitest';
import { cleanDomain } from '../src/background';

describe('cleanDomain', () => {
  it('should extract hostname from URL', () => {
    expect(cleanDomain('https://example.com/path')).toBe('example.com');
  });

  it('should lowercase domain', () => {
    expect(cleanDomain('EXAMPLE.COM')).toBe('example.com');
  });

  it('should remove port', () => {
    expect(cleanDomain('example.com:8080')).toBe('example.com');
  });
});
```

### Integration Tests

Test component interactions:

```typescript
describe('Background message handling', () => {
  it('should respond to checkDomain message', async () => {
    const response = await chrome.runtime.sendMessage({
      action: 'checkDomain',
      url: 'https://scam.com'
    });

    expect(response).toMatchObject({
      isScam: true,
      domain: 'scam.com'
    });
  });
});
```

### Manual Testing

**Checklist**:
- [ ] Popup opens and displays status
- [ ] Protection toggle works
- [ ] Scam domains redirect to blocked page
- [ ] "Continue anyway" works on blocked page
- [ ] Stats display correctly
- [ ] CSV loads from ČOI on install
- [ ] Offline mode uses cache
- [ ] Report button opens GitHub

## Git Workflow

### Branching Strategy

```
main              # Production-ready code
├── develop       # Integration branch
├── feature/*     # New features
├── bugfix/*      # Bug fixes
└── hotfix/*      # Urgent production fixes
```

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add domain statistics to popup
fix: handle CSV parsing errors gracefully
docs: update API documentation
test: add unit tests for domain cleaning
refactor: optimize domain matching algorithm
chore: update dependencies
```

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Performance improvement

## Testing
- [ ] Unit tests pass
- [ ] Manual testing completed
- [ ] No console errors

## Screenshots
(if UI changes)
```

## Dependencies

### Production

```json
{
  "preact": "^10.27.2",      # Lightweight React alternative
  "agentdb": "^1.3.9"        # Vector database (if used)
}
```

### Development

```json
{
  "@crxjs/vite-plugin": "^2.0.0-beta.33",  # Chrome extension bundler
  "@types/chrome": "^0.0.258",              # Chrome API types
  "vite": "^7.2.4",                         # Build tool
  "vitest": "^4.0.14",                      # Testing framework
  "typescript": "^5.x"                      # Type checking
}
```

### Adding Dependencies

```bash
# Production dependency
npm install package-name

# Development dependency
npm install -D package-name

# Update all dependencies
npm update

# Check for outdated
npm outdated
```

## Environment Variables

**Not used currently** - Extension is purely client-side.

Future: Could add for development/production builds:
```bash
# .env
VITE_ENV=development
VITE_API_URL=https://api.fair-store.cz
```

## IDE Setup

### VS Code

**Recommended extensions**:
- ESLint
- Prettier
- TypeScript Vue Plugin
- Chrome Extension Tools

**Settings** (`.vscode/settings.json`):
```json
{
  "editor.formatOnSave": true,
  "editor.tabSize": 4,
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

**Debug configuration** (`.vscode/launch.json`):
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "chrome",
      "request": "launch",
      "name": "Debug Extension",
      "url": "chrome://extensions/",
      "webRoot": "${workspaceFolder}"
    }
  ]
}
```

## Continuous Integration

### GitHub Actions (Future)

```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm test
      - run: npm run build
```

## Resources

### Documentation

- [Chrome Extension Docs](https://developer.chrome.com/docs/extensions/)
- [Manifest V3 Migration](https://developer.chrome.com/docs/extensions/mv3/intro/)
- [Chrome APIs](https://developer.chrome.com/docs/extensions/reference/)
- [Vite Docs](https://vitejs.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

### Tools

- [Extension Reloader](https://chrome.google.com/webstore/detail/extensions-reloader/fimgfedafeadlieiabdeeaodndnlbhid)
- [JSON Validator](https://jsonlint.com/)
- [CSV Viewer](https://csvlint.io/)

### Community

- [r/chrome_extensions](https://www.reddit.com/r/chrome_extensions/)
- [Stack Overflow - Chrome Extension Tag](https://stackoverflow.com/questions/tagged/google-chrome-extension)

---

**Happy coding! 🚀**
