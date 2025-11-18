// Background service worker for Fair Store extension
// Monitors navigation and checks domains against scam database

let scamDomains = [];

// Load scam domains database on installation
chrome.runtime.onInstalled.addListener(async () => {
  console.log('Fair Store extension installed');
  await loadScamDomains();
});

// Load scam domains from storage or fetch from data file
async function loadScamDomains() {
  try {
    const response = await fetch(chrome.runtime.getURL('data/scam-domains.json'));
    const data = await response.json();
    scamDomains = data.domains || [];
    console.log(`Loaded ${scamDomains.length} scam domains`);
  } catch (error) {
    console.error('Failed to load scam domains:', error);
    scamDomains = [];
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
function isScamDomain(domain) {
  return scamDomains.some(scamDomain => {
    // Exact match or subdomain match
    return domain === scamDomain || domain.endsWith('.' + scamDomain);
  });
}

// Listen for tab updates (page navigation)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Only check when the page starts loading
  if (changeInfo.status === 'loading' && tab.url) {
    const domain = extractDomain(tab.url);

    // Skip chrome:// and extension pages
    if (domain && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
      if (isScamDomain(domain)) {
        console.log(`⚠️ Scam domain detected: ${domain}`);

        // Send message to content script to show warning
        try {
          await chrome.tabs.sendMessage(tabId, {
            action: 'showWarning',
            domain: domain,
            url: tab.url
          });
        } catch (error) {
          // Content script might not be ready yet, will check on load
          console.log('Content script not ready, will show warning on load');
        }
      }
    }
  }
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'checkDomain') {
    const domain = extractDomain(message.url);
    const isScam = isScamDomain(domain);
    sendResponse({ isScam: isScam, domain: domain });
  }
  return true; // Keep message channel open for async response
});

// Initialize on startup
loadScamDomains();
