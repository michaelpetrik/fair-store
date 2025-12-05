// Background service worker for Fair Store extension
// Monitors navigation and checks domains against ČOI database

// URL of ČOI risk list
const COI_CSV_URL = 'https://www.coi.gov.cz/userdata/files/dokumenty-ke-stazeni/open-data/rizikove-seznam.csv';

// Rate limiting for API calls
const RATE_LIMIT_MS = 60000; // 1 minute minimum between fetches
let lastFetchAttempt = 0;

// Store domains with their reasons (persistent in local storage)
export let scamDomains = new Map<string, string>();

// Store allowed domains for the current session (user clicked "Continue")
// This resets on every session start (browser restart)
export let allowedDomains = new Set<string>();

// Store last update timestamp
let lastUpdate: string | null = null;

// Protection state - defaults to TRUE, stored in session storage
// Resets to TRUE on every session start
let protectionEnabled = true;

// ============================================================================
// INPUT VALIDATION & SANITIZATION
// ============================================================================

/**
 * Validate and sanitize URL input
 * Prevents XSS and injection attacks
 */
function sanitizeUrl(url: string): string | null {
    if (!url || typeof url !== 'string') return null;

    // Remove control characters and null bytes
    const cleaned = url.replace(/[\x00-\x1F\x7F]/g, '');

    // Validate URL format
    try {
        const parsed = new URL(cleaned);
        // Only allow http and https protocols
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            return null;
        }
        return parsed.href;
    } catch {
        return null;
    }
}

/**
 * Validate and sanitize domain input
 * Prevents DNS rebinding and other attacks
 */
function sanitizeDomain(domain: string): string | null {
    if (!domain || typeof domain !== 'string') return null;

    // Remove control characters and null bytes
    let cleaned = domain.trim().toLowerCase();
    cleaned = cleaned.replace(/[\x00-\x1F\x7F]/g, '');

    // Remove protocol if present
    cleaned = cleaned.replace(/^https?:\/\//, '');

    // Remove path, query, and fragment
    cleaned = cleaned.split('/')[0].split('?')[0].split('#')[0];

    // Remove port if present
    cleaned = cleaned.split(':')[0];

    // Validate domain format
    const domainRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i;
    if (!domainRegex.test(cleaned)) {
        return null;
    }

    // Check for minimum length
    if (cleaned.length < 3) return null;

    // Reject localhost and internal domains
    if (cleaned === 'localhost' || cleaned.endsWith('.local') || cleaned.endsWith('.localhost')) {
        return null;
    }

    return cleaned;
}

/**
 * Validate message sender to prevent unauthorized access
 */
function isValidSender(sender: chrome.runtime.MessageSender): boolean {
    // Message must be from our extension
    if (!sender.id || sender.id !== chrome.runtime.id) {
        console.warn('Rejected message from unauthorized extension:', sender.id);
        return false;
    }

    // If from a tab, validate the URL
    if (sender.tab?.url) {
        const url = sender.tab.url;
        // Only allow messages from extension pages or the blocked page
        if (!url.startsWith('chrome-extension://') && !url.includes('blocked.html')) {
            console.warn('Rejected message from unauthorized URL:', url);
            return false;
        }
    }

    return true;
}

// ============================================================================
// LIFECYCLE EVENTS
// ============================================================================

/**
 * Called when extension is installed or updated
 * FR-1.1: Fetch blacklist on extension install
 */
chrome.runtime.onInstalled.addListener(async () => {
    console.log('Fair Store extension installed/updated');

    // FR-2.1: Protection is ON by default
    protectionEnabled = true;
    await chrome.storage.session.set({ protectionEnabled: true });

    // FR-5.1: Whitelist is empty at session start
    allowedDomains.clear();

    // FR-1.1: Fetch blacklist on install
    await loadScamDomains();
});

/**
 * Called when browser starts a new session
 * FR-1.2: Fetch blacklist on browser startup
 */
chrome.runtime.onStartup.addListener(async () => {
    console.log('Browser session started');

    // FR-2.1: Protection is ON by default at every session start
    protectionEnabled = true;
    await chrome.storage.session.set({ protectionEnabled: true });

    // FR-5.1, FR-5.5: Whitelist clears on session start
    allowedDomains.clear();

    // FR-1.2: Fetch blacklist on browser startup
    await loadScamDomains();
});

// ============================================================================
// CSV PARSING
// ============================================================================

/**
 * Parse CSV file from ČOI
 * FR-1.7: Handle Windows-1250 encoding from ČOI CSV
 */
export function parseCSV(csvText: string): Map<string, string> {
    const domains = new Map<string, string>();
    try {
        const lines = csvText.trim().split('\n');
        if (lines.length === 0) return domains;

        const delimiter = lines[0].includes(';') ? ';' : ',';

        // ČOI CSV has no header row, start from line 0
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            // Strip both double quotes and single quotes
            const columns = line.split(delimiter).map(c =>
                c.trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '')
            );

            let domain = columns[0];
            const reason = columns[1] || 'Zařazeno do seznamu rizikových e-shopů ČOI';
            domain = cleanDomain(domain);

            if (domain) {
                domains.set(domain, reason);
            }
        }
    } catch (error) {
        console.error('Error parsing CSV:', error);
    }
    return domains;
}

/**
 * Clean domain string - extract hostname from URL or domain string
 * Uses sanitization for security
 */
export function cleanDomain(domain: string): string {
    if (!domain) return '';

    // First try as URL
    try {
        const urlStr = domain.match(/^https?:\/\//) ? domain : 'http://' + domain;
        const url = new URL(urlStr);
        const sanitized = sanitizeDomain(url.hostname);
        return sanitized || '';
    } catch (e) {
        // Fallback to manual parsing with sanitization
        const cleaned = domain
            .replace(/^https?:\/\//, '')
            .split('/')[0]
            .split('?')[0]
            .split(':')[0]
            .toLowerCase()
            .trim();
        const sanitized = sanitizeDomain(cleaned);
        return sanitized || '';
    }
}

// ============================================================================
// BLACKLIST LOADING
// ============================================================================

/**
 * Load scam domains from ČOI website with fallbacks
 * FR-1.5: Store blacklist in local storage with timestamp
 * FR-1.6: Fallback to cached data if network fetch fails
 * Security: Rate limiting and validation
 */
export async function loadScamDomains(): Promise<void> {
    // Rate limiting check
    const now = Date.now();
    if (now - lastFetchAttempt < RATE_LIMIT_MS) {
        console.log('Rate limit: Using cached data');
        // Load from cache instead
        try {
            const stored = await chrome.storage.local.get(['scamDomains', 'lastUpdate']);
            if (stored.scamDomains && stored.scamDomains.length > 0) {
                scamDomains = new Map(stored.scamDomains);
                lastUpdate = stored.lastUpdate;
                console.log(`📦 Loaded ${scamDomains.size} domains from cache`);
                return;
            }
        } catch (storageError) {
            console.error('Failed to load from storage:', storageError);
        }
    }

    lastFetchAttempt = now;

    // Try to fetch from government website
    try {
        console.log('Fetching ČOI risk list from web...');

        // Security: Validate URL before fetching
        const sanitizedUrl = sanitizeUrl(COI_CSV_URL);
        if (!sanitizedUrl) {
            throw new Error('Invalid ČOI URL');
        }

        const response = await fetch(sanitizedUrl, {
            method: 'GET',
            cache: 'no-cache',
            // Security headers
            headers: {
                'Accept': 'text/csv,text/plain,*/*'
            }
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        // Security: Validate content type
        const contentType = response.headers.get('content-type');
        if (contentType && !contentType.includes('text/') && !contentType.includes('csv')) {
            console.warn('Unexpected content type:', contentType);
        }

        const arrayBuffer = await response.arrayBuffer();
        const decoder = new TextDecoder('windows-1250');
        const csvText = decoder.decode(arrayBuffer);
        const newDomains = parseCSV(csvText);

        scamDomains = newDomains;
        lastUpdate = new Date().toISOString();

        await chrome.storage.local.set({
            scamDomains: Array.from(scamDomains.entries()),
            lastUpdate: lastUpdate
        });

        console.log(`✅ Loaded ${scamDomains.size} domains from ČOI`);
        return;
    } catch (error) {
        console.error('Failed to load ČOI CSV from web:', error);
    }

    // Fallback: Load from cache
    try {
        console.log('Trying to load from cache...');
        const stored = await chrome.storage.local.get(['scamDomains', 'lastUpdate']);
        if (stored.scamDomains && stored.scamDomains.length > 0) {
            scamDomains = new Map(stored.scamDomains);
            lastUpdate = stored.lastUpdate;
            console.log(`📦 Loaded ${scamDomains.size} domains from cache`);
            return;
        }
    } catch (storageError) {
        console.error('Failed to load from storage:', storageError);
    }

    // Fallback: Local CSV
    try {
        console.log('Trying to load local CSV fallback...');
        const localResponse = await fetch('/rizikove-seznam.csv');
        if (localResponse.ok) {
            const arrayBuffer = await localResponse.arrayBuffer();
            const decoder = new TextDecoder('windows-1250');
            const csvText = decoder.decode(arrayBuffer);
            const newDomains = parseCSV(csvText);
            scamDomains = newDomains;
            lastUpdate = new Date().toISOString();

            await chrome.storage.local.set({
                scamDomains: Array.from(scamDomains.entries()),
                lastUpdate: lastUpdate
            });

            console.log(`✅ Loaded ${scamDomains.size} domains from local CSV`);
            return;
        }
    } catch (localError) {
        console.error('Failed to load local CSV:', localError);
    }
}

// ============================================================================
// DOMAIN CHECKING
// ============================================================================

/**
 * Extract domain from URL with security validation
 */
export function extractDomain(url: string): string {
    if (!url || typeof url !== 'string') return '';

    try {
        const sanitized = sanitizeUrl(url);
        if (!sanitized) return '';

        const parsed = new URL(sanitized);
        const domain = sanitizeDomain(parsed.hostname);
        return domain || '';
    } catch (error) {
        console.error('Failed to extract domain:', error);
        return '';
    }
}

/**
 * Check if domain is in scam list
 * FR-3.8: Match subdomains (e.g., www.scam.com matches scam.com)
 * FR-3.5, FR-3.6: Check whitelist before blocking
 */
export function checkDomain(domain: string): { isScam: boolean, isWhitelisted: boolean, reason: string | null, matchedDomain: string | null } {
    domain = domain.toLowerCase();

    // FR-3.6: Check whitelist status
    const isWhitelisted = allowedDomains.has(domain);

    // Check exact match
    if (scamDomains.has(domain)) {
        return { isScam: true, isWhitelisted, reason: scamDomains.get(domain) || null, matchedDomain: domain };
    }

    // Check subdomain match (e.g., www.scam.com -> scam.com)
    for (const [scamDomain, reason] of scamDomains.entries()) {
        if (domain.endsWith('.' + scamDomain)) {
            return { isScam: true, isWhitelisted, reason: reason, matchedDomain: scamDomain };
        }
    }

    return { isScam: false, isWhitelisted, reason: null, matchedDomain: null };
}

/**
 * Check if protection is currently enabled
 */
export function isProtectionEnabled(): boolean {
    return protectionEnabled;
}

// ============================================================================
// TAB MONITORING
// ============================================================================

/**
 * Listen for tab updates to redirect risky sites
 * FR-3.1 through FR-3.7: Complete protection flow
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'loading' && tab.url) {
        const url = tab.url;

        // Skip internal pages
        if (url.startsWith('chrome://') || url.startsWith('chrome-extension://')) {
            return;
        }

        // FR-3.1, FR-3.2: Check if protection is enabled
        if (!protectionEnabled) {
            // Protection is OFF - allow page (no action)
            return;
        }

        const domain = extractDomain(url);
        if (!domain) return;

        // FR-3.3 through FR-3.7: Check blacklist and whitelist
        const result = checkDomain(domain);
        if (result.isScam && !result.isWhitelisted) {
            console.log(`⚠️ Rizikový e-shop detekován: ${domain}`);
            const blockedUrl = chrome.runtime.getURL("src/pages/blocked.html") + "?url=" + encodeURIComponent(url);
            chrome.tabs.update(tabId, { url: blockedUrl });
        }
    }
});

// ============================================================================
// MESSAGE HANDLERS
// ============================================================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Security: Validate message sender
    if (!isValidSender(sender)) {
        console.error('Rejected message from unauthorized sender');
        sendResponse({ success: false, error: 'Unauthorized' });
        return false;
    }

    // Security: Validate message structure
    if (!message || typeof message !== 'object' || !message.action) {
        console.error('Invalid message structure');
        sendResponse({ success: false, error: 'Invalid message' });
        return false;
    }

    // FR-5.2: Handle allowDomain message (Proceed Anyway)
    if (message.action === 'allowDomain') {
        const domain = message.domain;
        if (!domain || typeof domain !== 'string') {
            sendResponse({ success: false, error: 'Invalid domain' });
            return false;
        }

        // Security: Sanitize domain before adding to whitelist
        const sanitized = sanitizeDomain(domain);
        if (!sanitized) {
            console.error('Invalid domain format:', domain);
            sendResponse({ success: false, error: 'Invalid domain format' });
            return false;
        }

        allowedDomains.add(sanitized);
        console.log(`Allowed domain: ${sanitized}`);
        sendResponse({ success: true });
        return true;
    }

    // Handle getBlacklist message
    if (message.action === 'getBlacklist') {
        (async () => {
            const blacklistArray = Array.from(scamDomains.keys());
            sendResponse({
                blacklist: blacklistArray,
                protectionEnabled: protectionEnabled,
                lastUpdate: lastUpdate
            });
        })();
        return true;
    }

    // Handle checkDomain message
    if (message.action === 'checkDomain') {
        (async () => {
            const url = message.url;
            if (!url || typeof url !== 'string') {
                sendResponse({ isScam: false, isWhitelisted: false, protectionEnabled, domain: '' });
                return;
            }

            // Security: Sanitize URL before processing
            const sanitizedUrl = sanitizeUrl(url);
            if (!sanitizedUrl) {
                console.error('Invalid URL format:', url);
                sendResponse({ isScam: false, isWhitelisted: false, protectionEnabled, domain: '' });
                return;
            }

            const domain = extractDomain(sanitizedUrl);
            if (!domain) {
                sendResponse({ isScam: false, isWhitelisted: false, protectionEnabled, domain: '' });
                return;
            }

            const result = checkDomain(domain);

            sendResponse({
                isScam: result.isScam,
                isWhitelisted: result.isWhitelisted,
                protectionEnabled: protectionEnabled,
                domain: domain,
                reason: result.reason,
                matchedDomain: result.matchedDomain
            });
        })();
        return true;
    }

    // FR-2.2 through FR-2.4: Handle setProtection message
    if (message.action === 'setProtection') {
        (async () => {
            // Security: Validate boolean input
            if (typeof message.enabled !== 'boolean') {
                sendResponse({ success: false, error: 'Invalid enabled value' });
                return;
            }

            protectionEnabled = message.enabled;
            await chrome.storage.session.set({ protectionEnabled });
            console.log(`Protection ${protectionEnabled ? 'enabled' : 'disabled'}`);
            sendResponse({ success: true, protectionEnabled });
        })();
        return true;
    }

    // FR-1.4: Handle refreshBlacklist message (manual refresh)
    if (message.action === 'refreshBlacklist') {
        (async () => {
            try {
                await loadScamDomains();
                sendResponse({
                    success: true,
                    count: scamDomains.size,
                    lastUpdate: lastUpdate
                });
            } catch (error) {
                sendResponse({
                    success: false,
                    error: (error as Error).message
                });
            }
        })();
        return true;
    }
});
