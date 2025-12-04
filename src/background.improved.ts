/**
 * Background service worker for Fair Store extension
 * Monitors navigation and checks domains against ČOI (Czech Trade Inspection) database
 *
 * @module background
 * @author Michael Petrik
 * @license MIT
 */

/** URL of ČOI risk list CSV file */
const COI_CSV_URL = 'https://www.coi.gov.cz/userdata/files/dokumenty-ke-stazeni/open-data/rizikove-seznam.csv';

/**
 * Map of scam domains with their reasons
 * Key: domain name (e.g., "scam-shop.cz")
 * Value: reason from ČOI (e.g., "Zařazeno do seznamu rizikových e-shopů")
 */
export let scamDomains = new Map<string, string>();

/**
 * Set of domains allowed by user for the current session
 * User clicked "Continue anyway" on the warning page
 */
export let allowedDomains = new Set<string>();

/** ISO timestamp of last successful data update */
let lastUpdate: string | null = null;

/** Global protection state - can be toggled by user */
let protectionEnabled = true;

/**
 * Initialize extension on install
 * Loads scam domains from ČOI
 */
chrome.runtime.onInstalled.addListener(async () => {
    console.log('Fair Store extension installed');
    await loadScamDomains();
});

/**
 * Parse CSV file from ČOI and extract scam domains
 *
 * @param csvText - Raw CSV text content (Windows-1250 encoded)
 * @returns Map of domain -> reason pairs
 *
 * @example
 * const csvText = "scam-shop.cz;Podvodný e-shop\nfake.com;Neexistující zboží";
 * const domains = parseCSV(csvText);
 * // domains.get("scam-shop.cz") === "Podvodný e-shop"
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
            const columns = line.split(delimiter).map(c => c.trim().replace(/^"|"$/g, '').replace(/^'|'$/g, ''));
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
    if (!domain) return '';
    try {
        const urlStr = domain.match(/^https?:\/\//) ? domain : 'http://' + domain;
        const url = new URL(urlStr);
        return url.hostname.toLowerCase();
    } catch (e) {
        return domain.replace(/^https?:\/\//, '').split('/')[0].split('?')[0].split(':')[0].toLowerCase().trim();
    }
}

/**
 * Load scam domains from ČOI web source with fallback mechanisms
 *
 * Priority:
 * 1. Fetch from ČOI website (https://www.coi.gov.cz)
 * 2. Load from cached storage
 * 3. Load from local CSV file
 *
 * @returns Promise that resolves when domains are loaded
 * @throws Never - All errors are caught and logged
 */
export async function loadScamDomains(): Promise<void> {
    try {
        console.log('Fetching ČOI risk list from web...');
        const response = await fetch(COI_CSV_URL);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
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

/**
 * Extract domain from full URL
 *
 * @param url - Full URL string
 * @returns Domain name in lowercase, or empty string if invalid
 *
 * @example
 * extractDomain("https://www.example.com/page?q=1") === "www.example.com"
 */
export function extractDomain(url: string): string {
    try {
        return new URL(url).hostname.toLowerCase();
    } catch (error) {
        return '';
    }
}

/**
 * Result of domain safety check
 */
export interface DomainCheckResult {
    /** Whether the domain is identified as a scam */
    isScam: boolean;
    /** Reason from ČOI for flagging this domain (if scam) */
    reason: string | null;
    /** The matched scam domain pattern (may differ from checked domain for subdomains) */
    matchedDomain: string | null;
}

/**
 * Check if domain is in scam list
 *
 * @param domain - Domain to check (will be normalized to lowercase)
 * @returns Check result with scam status, reason, and matched pattern
 *
 * @example
 * checkDomain("safe-shop.cz") === { isScam: false, reason: null, matchedDomain: null }
 * checkDomain("scam.com") === { isScam: true, reason: "Podvodný e-shop", matchedDomain: "scam.com" }
 */
export function checkDomain(domain: string): DomainCheckResult {
    domain = domain.toLowerCase();

    // User explicitly allowed this domain in current session
    if (allowedDomains.has(domain)) {
        return { isScam: false, reason: null, matchedDomain: null };
    }

    // Direct match in scam list
    if (scamDomains.has(domain)) {
        return { isScam: true, reason: scamDomains.get(domain) || null, matchedDomain: domain };
    }

    // Check if it's a subdomain of a scam domain
    for (const [scamDomain, reason] of scamDomains.entries()) {
        if (domain.endsWith('.' + scamDomain)) {
            return { isScam: true, reason: reason, matchedDomain: scamDomain };
        }
    }

    return { isScam: false, reason: null, matchedDomain: null };
}

/**
 * Listen for tab updates to redirect risky sites
 *
 * When a tab starts loading, check if the domain is in the scam list.
 * If yes, redirect to warning page before the dangerous page loads.
 */
chrome.tabs.onUpdated.addListener((tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => {
    if (changeInfo.status === 'loading' && tab.url) {
        const url = tab.url;
        // Skip internal pages (chrome://, chrome-extension://)
        if (url.startsWith('chrome://') || url.startsWith('chrome-extension://')) {
            return;
        }

        const domain = extractDomain(url);
        if (!domain) return;

        const result = checkDomain(domain);
        if (result.isScam) {
            console.log(`⚠️ Rizikový e-shop detekován: ${domain}`);
            const blockedUrl = chrome.runtime.getURL("src/pages/blocked.html") + "?url=" + encodeURIComponent(url);
            chrome.tabs.update(tabId, { url: blockedUrl });
        }
    }
});

/**
 * Message types for communication between extension components
 */
interface ExtensionMessage {
    action: 'allowDomain' | 'getBlacklist' | 'checkDomain' | 'setProtection';
    domain?: string;
    url?: string;
    enabled?: boolean;
}

interface AllowDomainResponse {
    success: boolean;
}

interface GetBlacklistResponse {
    blacklist: string[];
    protectionEnabled: boolean;
}

interface CheckDomainResponse {
    isScam: boolean;
    isWhitelisted: boolean;
    protectionEnabled: boolean;
    domain: string;
    reason?: string | null;
    matchedDomain?: string | null;
}

interface SetProtectionResponse {
    success: boolean;
    protectionEnabled: boolean;
}

type MessageResponse = AllowDomainResponse | GetBlacklistResponse | CheckDomainResponse | SetProtectionResponse;

/**
 * Handle messages from popup and content scripts
 *
 * Supported actions:
 * - allowDomain: User clicked "Continue anyway" - add domain to allowed list
 * - getBlacklist: Get list of all scam domains for display in popup
 * - checkDomain: Check if current tab's domain is in scam list
 * - setProtection: Enable/disable global protection
 */
chrome.runtime.onMessage.addListener((
    message: ExtensionMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: MessageResponse) => void
): boolean => {
    if (message.action === 'allowDomain') {
        const domain = message.domain;
        if (domain) {
            allowedDomains.add(domain.toLowerCase());
            console.log(`Allowed domain: ${domain}`);
            sendResponse({ success: true });
        }
        return true;
    }

    if (message.action === 'getBlacklist') {
        (async () => {
            const blacklistArray = Array.from(scamDomains.keys());
            sendResponse({
                blacklist: blacklistArray,
                protectionEnabled: protectionEnabled
            });
        })();
        return true;
    }

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
            const isWhitelisted = allowedDomains.has(domain.toLowerCase());

            sendResponse({
                isScam: result.isScam,
                isWhitelisted: isWhitelisted,
                protectionEnabled: protectionEnabled,
                domain: domain,
                reason: result.reason,
                matchedDomain: result.matchedDomain
            });
        })();
        return true;
    }

    if (message.action === 'setProtection') {
        (async () => {
            protectionEnabled = message.enabled !== false;
            await chrome.storage.session.set({ protectionEnabled });
            console.log(`Protection ${protectionEnabled ? 'enabled' : 'disabled'}`);
            sendResponse({ success: true, protectionEnabled });
        })();
        return true;
    }

    return false;
});
