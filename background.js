// Background service worker for Fair Store extension
// Monitors navigation and checks domains against ČOI database

// URL of ČOI risk list
const COI_CSV_URL = 'https://www.coi.gov.cz/userdata/files/dokumenty-ke-stazeni/open-data/rizikove-seznam.csv';

// Store domains with their reasons
// Format: Map<domain, reason>
let scamDomains = new Map();
let lastUpdate = null;

// Load scam domains database on installation
chrome.runtime.onInstalled.addListener(async () => {
  console.log('Fair Store extension installed');
  await loadScamDomains();
});

// Parse CSV file from ČOI
function parseCSV(csvText) {
  const domains = new Map();

  try {
    // Split into lines
    const lines = csvText.trim().split('\n');

    if (lines.length === 0) {
      console.warn('CSV file is empty');
      return domains;
    }

    // Try to detect delimiter (semicolon or comma)
    const delimiter = lines[0].includes(';') ? ';' : ',';

    // Parse header
    const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));
    console.log('CSV headers:', headers);

    // Find domain and reason column indices
    let domainIndex = -1;
    let reasonIndex = -1;

    // Try different possible column names
    const domainNames = ['url', 'domain', 'doména', 'adresa', 'www'];
    const reasonNames = ['reason', 'důvod', 'duvod', 'popis', 'description'];

    headers.forEach((header, index) => {
      const lowerHeader = header.toLowerCase();
      if (domainNames.some(name => lowerHeader.includes(name))) {
        domainIndex = index;
      }
      if (reasonNames.some(name => lowerHeader.includes(name))) {
        reasonIndex = index;
      }
    });

    // If not found, assume first column is domain, second is reason
    if (domainIndex === -1) domainIndex = 0;
    if (reasonIndex === -1 && headers.length > 1) reasonIndex = 1;

    console.log(`Using column ${domainIndex} for domain, column ${reasonIndex} for reason`);

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const columns = line.split(delimiter).map(c => c.trim().replace(/^"|"$/g, ''));

      if (columns.length > domainIndex) {
        let domain = columns[domainIndex];
        const reason = reasonIndex >= 0 && columns.length > reasonIndex
          ? columns[reasonIndex]
          : 'Zařazeno do seznamu rizikových e-shopů ČOI';

        // Clean domain (remove protocol, path, etc.)
        domain = cleanDomain(domain);

        if (domain) {
          domains.set(domain, reason);
        }
      }
    }

    console.log(`Parsed ${domains.size} domains from CSV`);
  } catch (error) {
    console.error('Error parsing CSV:', error);
  }

  return domains;
}

// Clean domain string (remove http://, www., etc.)
function cleanDomain(domain) {
  if (!domain) return '';

  try {
    // Try to parse as URL
    // If it doesn't have protocol, add one to make URL parser happy
    const urlStr = domain.match(/^https?:\/\//) ? domain : 'http://' + domain;
    const url = new URL(urlStr);
    return url.hostname.toLowerCase();
  } catch (e) {
    // Fallback to manual cleaning
    // Remove protocol
    domain = domain.replace(/^https?:\/\//, '');

    // Remove path and query string
    domain = domain.split('/')[0];
    domain = domain.split('?')[0];

    // Remove port
    domain = domain.split(':')[0];

    // Convert to lowercase
    domain = domain.toLowerCase().trim();

    return domain;
  }
}

// Load scam domains from ČOI CSV
async function loadScamDomains() {
  try {
    console.log('Fetching ČOI risk list...');

    const response = await fetch(COI_CSV_URL, {
      method: 'GET',
      headers: {
        'Accept': 'text/csv, text/plain, */*'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const csvText = await response.text();
    scamDomains = parseCSV(csvText);
    lastUpdate = new Date().toISOString();

    // Store in chrome.storage for persistence
    await chrome.storage.local.set({
      scamDomains: Array.from(scamDomains.entries()),
      lastUpdate: lastUpdate
    });

    console.log(`✅ Loaded ${scamDomains.size} domains from ČOI`);
    console.log(`Last update: ${lastUpdate}`);
  } catch (error) {
    console.error('Failed to load ČOI CSV:', error);

    // Try to load from storage as fallback
    try {
      const stored = await chrome.storage.local.get(['scamDomains', 'lastUpdate']);
      if (stored.scamDomains) {
        scamDomains = new Map(stored.scamDomains);
        lastUpdate = stored.lastUpdate;
        console.log(`📦 Loaded ${scamDomains.size} domains from cache`);
        console.log(`Cache date: ${lastUpdate}`);
      }
    } catch (storageError) {
      console.error('Failed to load from storage:', storageError);
    }
  }
}

// Extract domain from URL
function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.toLowerCase();
  } catch (error) {
    console.error('Invalid URL:', url);
    return '';
  }
}

// Check if domain is in scam list
// Returns { isScam: boolean, reason: string, matchedDomain: string }
function checkDomain(domain) {
  domain = domain.toLowerCase();
  // Check for exact match
  if (scamDomains.has(domain)) {
    return {
      isScam: true,
      reason: scamDomains.get(domain),
      matchedDomain: domain
    };
  }

  // Check for subdomain match (e.g., www.example.com matches example.com)
  for (const [scamDomain, reason] of scamDomains.entries()) {
    if (domain.endsWith('.' + scamDomain)) {
      return {
        isScam: true,
        reason: reason,
        matchedDomain: scamDomain
      };
    }
  }

  return {
    isScam: false,
    reason: null,
    matchedDomain: null
  };
}

// Kontrola, zda je ochrana zapnuta
async function isProtectionEnabled() {
  try {
    const result = await chrome.storage.session.get(['protectionEnabled']);
    // Výchozí hodnota je true (zapnuto)
    return result.protectionEnabled !== false;
  } catch (error) {
    console.error('Chyba při kontrole stavu ochrany:', error);
    return true; // V případě chyby raději zapnuto
  }
}

// Listen for tab updates (page navigation)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Only check when the page starts loading
  if (changeInfo.status === 'loading' && tab.url) {
    const domain = extractDomain(tab.url);

    // Skip chrome:// and extension pages
    if (domain && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
      const result = checkDomain(domain);

      if (result.isScam) {
        // Zkontrolovat, zda je ochrana zapnuta
        const protectionEnabled = await isProtectionEnabled();

        if (!protectionEnabled) {
          console.log(`⚠️ Rizikový e-shop detekován: ${domain}, ale ochrana je vypnuta`);
          return;
        }

        console.log(`⚠️ Rizikový e-shop detekován: ${domain} (shoda: ${result.matchedDomain})`);

        // Send message to content script to show warning
        try {
          await chrome.tabs.sendMessage(tabId, {
            action: 'showWarning',
            domain: domain,
            matchedDomain: result.matchedDomain,
            reason: result.reason,
            url: tab.url
          });
        } catch (error) {
          // Content script might not be ready yet, will check on load
          console.log('Content script není připraven, varování se zobrazí při načtení');
        }
      }
    }
  }
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'checkDomain') {
    const domain = extractDomain(message.url);
    const result = checkDomain(domain);

    // Zkontrolovat stav ochrany
    isProtectionEnabled().then(protectionEnabled => {
      sendResponse({
        isScam: protectionEnabled && result.isScam,
        domain: domain,
        matchedDomain: result.matchedDomain,
        reason: result.reason,
        protectionEnabled: protectionEnabled
      });
    });

    return true; // Asynchronní odpověď
  }

  if (message.action === 'setProtection') {
    // Nastavit stav ochrany
    chrome.storage.session.set({ protectionEnabled: message.enabled }).then(() => {
      console.log(`Ochrana ${message.enabled ? 'zapnuta' : 'vypnuta'}`);
      sendResponse({ success: true });
    });

    return true; // Asynchronní odpověď
  }

  if (message.action === 'closeTab') {
    // Zavřít záložku
    if (sender.tab && sender.tab.id) {
      chrome.tabs.remove(sender.tab.id).then(() => {
        console.log('Záložka s rizikovým e-shopem byla zavřena');
        sendResponse({ success: true });
      }).catch((error) => {
        console.error('Chyba při zavírání záložky:', error);
        sendResponse({ success: false, error: error.message });
      });

      return true; // Asynchronní odpověď
    }
  }

  return false;
});

// Initialize on startup
loadScamDomains();
