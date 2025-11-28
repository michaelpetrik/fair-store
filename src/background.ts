// Background service worker for Fair Store extension
// Monitors navigation and checks domains against ČOI database

// URL of ČOI risk list
const COI_CSV_URL = 'https://www.coi.gov.cz/userdata/files/dokumenty-ke-stazeni/open-data/rizikove-seznam.csv';

// Store domains with their reasons
export let scamDomains = new Map<string, string>();
// Store allowed domains for the current session (user clicked "Continue")
export let allowedDomains = new Set<string>();

let lastUpdate: string | null = null;

// Initialize on install
chrome.runtime.onInstalled.addListener(async () => {
    console.log('Fair Store extension installed');
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

// Load scam domains
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

// Extract domain from URL
export function extractDomain(url: string): string {
    try {
        return new URL(url).hostname.toLowerCase();
    } catch (error) {
        return '';
    }
}

// Check if domain is in scam list
export function checkDomain(domain: string): { isScam: boolean, reason: string | null, matchedDomain: string | null } {
    domain = domain.toLowerCase();
    if (allowedDomains.has(domain)) {
        return { isScam: false, reason: null, matchedDomain: null };
    }

    if (scamDomains.has(domain)) {
        return { isScam: true, reason: scamDomains.get(domain) || null, matchedDomain: domain };
    }
    for (const [scamDomain, reason] of scamDomains.entries()) {
        if (domain.endsWith('.' + scamDomain)) {
            // Check if allowed (e.g. sub.scam.com might be allowed if we allowed scam.com? No, usually we allow exact domain)
            // But if user allowed "scam.com", we should probably allow "www.scam.com".
            // For now, simple exact match on allowedDomains.
            return { isScam: true, reason: reason, matchedDomain: scamDomain };
        }
    }
    return { isScam: false, reason: null, matchedDomain: null };
}

// Listen for tab updates to redirect risky sites
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'loading' && tab.url) {
        const url = tab.url;
        // Skip internal pages
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

// Handle messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
                protectionEnabled: true
            });
        })();
        return true;
    }
});
