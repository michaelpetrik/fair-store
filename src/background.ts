// Background service worker for Fair Store extension
// Monitors navigation and checks domains against ČOI database

// URL of ČOI risk list
const COI_CSV_URL = 'https://www.coi.gov.cz/userdata/files/dokumenty-ke-stazeni/open-data/rizikove-seznam.csv';

// Store domains with their reasons
// Format: Map<domain, reason>
export let scamDomains = new Map<string, string>();
let lastUpdate: string | null = null;

// Load scam domains database on installation
chrome.runtime.onInstalled.addListener(async () => {
    console.log('Fair Store extension installed');
    // Set protection to be enabled by default on install
    await chrome.storage.session.set({ protectionEnabled: true });
    await loadScamDomains();
});

// Parse CSV file from ČOI
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

// Clean domain string
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

// Load scam domains from web, with cache and local fallback
export async function loadScamDomains() {
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

    try {
        console.log('Trying to load local CSV fallback...');
        const localResponse = await fetch('/rizikove-seznam.csv');
        if (localResponse.ok) {
            const arrayBuffer = await localResponse.arrayBuffer();
            const decoder = new TextDecoder('windows-1250');
            const csvText = decoder.decode(arrayBuffer);
            const newDomains = parseCSV(csvText);
            scamDomains = newDomains;
            lastUpdate = new Date().toISOString(); // Mark as fresh load from fallback
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

    console.error('All data sources failed. The extension might not work correctly.');
}

// Extract domain from URL
export function extractDomain(url: string): string {
    try {
        return new URL(url).hostname.toLowerCase();
    } catch (error) {
        console.error('Invalid URL:', url);
        return '';
    }
}

// Check if domain is in scam list
export function checkDomain(domain: string): { isScam: boolean, reason: string | null, matchedDomain: string | null } {
    domain = domain.toLowerCase();
    if (scamDomains.has(domain)) {
        return { isScam: true, reason: scamDomains.get(domain) || null, matchedDomain: domain };
    }
    for (const [scamDomain, reason] of scamDomains.entries()) {
        if (domain.endsWith('.' + scamDomain)) {
            return { isScam: true, reason: reason, matchedDomain: scamDomain };
        }
    }
    return { isScam: false, reason: null, matchedDomain: null };
}

// Check if protection is enabled globally
async function isProtectionEnabled(): Promise<boolean> {
    try {
        const result = await chrome.storage.session.get(['protectionEnabled']);
        return result.protectionEnabled !== false; // Default to true
    } catch (error) {
        console.error('Chyba při kontrole stavu ochrany:', error);
        return true; // Default to enabled in case of error
    }
}

// Listen for tab updates
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status === 'loading' && tab.url) {
        const domain = extractDomain(tab.url);
        if (domain && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
            const result = checkDomain(domain);
            if (result.isScam && await isProtectionEnabled()) {
                console.log(`⚠️ Rizikový e-shop detekován: ${domain}`);
                try {
                    await chrome.tabs.sendMessage(tabId, {
                        action: 'showWarning',
                        domain: domain,
                        matchedDomain: result.matchedDomain,
                        reason: result.reason,
                        url: tab.url
                    });
                } catch (error) {
                    console.log('Content script not ready, proactive check will handle it.');
                }
            }
        }
    }
});

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    if (message.action === 'getBlacklist') {
        // Content script requests the blacklist
        const blacklistArray = Array.from(scamDomains.keys());
        const protectionEnabled = await isProtectionEnabled();
        sendResponse({
            blacklist: blacklistArray,
            protectionEnabled: protectionEnabled
        });
        return true;
    }

    if (message.action === 'checkDomain') {
        const domain = extractDomain(message.url);
        const result = checkDomain(domain);
        const protectionEnabled = await isProtectionEnabled();
        sendResponse({
            isScam: result.isScam,
            domain: domain,
            matchedDomain: result.matchedDomain,
            reason: result.reason,
            protectionEnabled: protectionEnabled
        });
        return true;
    }

    if (message.action === 'setProtection') {
        await chrome.storage.session.set({ protectionEnabled: message.enabled });
        await updateAllTabsProtection(message.enabled);
        sendResponse({ success: true });
        console.log(`Ochrana ${message.enabled ? 'zapnuta' : 'vypnuta'}`);
        return true;
    }

    if (message.action === 'closeTab') {
        if (sender.tab && sender.tab.id) {
            await chrome.tabs.remove(sender.tab.id);
            sendResponse({ success: true });
        }
        return true;
    }

    return false;
});

// Helper to update all tabs when global protection is toggled
export async function updateAllTabsProtection(enabled: boolean) {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
        if (tab.id && tab.url) {
            try {
                if (enabled) {
                    const domain = extractDomain(tab.url);
                    const result = checkDomain(domain);
                    if (result.isScam) {
                        await chrome.tabs.sendMessage(tab.id, {
                            action: 'showWarning',
                            domain: domain,
                            matchedDomain: result.matchedDomain,
                            reason: result.reason,
                            url: tab.url
                        });
                    }
                } else {
                    await chrome.tabs.sendMessage(tab.id, { action: 'hideWarning' });
                }
            } catch (error) {
                if (error instanceof Error && !error.message.includes('receiving end does not exist')) {
                  console.log(`Could not update tab ${tab.id}: ${error.message}`);
                }
            }
        }
    }
}

// Initialize on startup
// @ts-ignore
if (typeof module === 'undefined') {
    // Initialize protection state (session storage is cleared on browser restart)
    chrome.storage.session.get(['protectionEnabled'], (result) => {
        if (result.protectionEnabled === undefined) {
            chrome.storage.session.set({ protectionEnabled: true });
        }
    });
    loadScamDomains();
}
