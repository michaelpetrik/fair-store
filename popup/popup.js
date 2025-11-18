// Fair Store Extension Popup Script

document.addEventListener('DOMContentLoaded', async () => {
  await checkCurrentTab();
  await loadStats();
  setupEventListeners();
});

// Check if current tab is on a scam domain
async function checkCurrentTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.url) {
      return;
    }

    // Skip chrome:// and extension pages
    if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      updateStatus('safe', 'Speciální stránka prohlížeče', 'Nelze kontrolovat systémové stránky.');
      return;
    }

    const response = await chrome.runtime.sendMessage({
      action: 'checkDomain',
      url: tab.url
    });

    if (response && response.isScam) {
      updateStatus('warning', '⚠️ Varování!', `Tato stránka (${response.domain}) je označena jako podvodná.`);
    } else {
      updateStatus('safe', 'Stránka je bezpečná', 'Tato stránka není v naší databázi podvodných e-shopů.');
    }
  } catch (error) {
    console.error('Failed to check current tab:', error);
    updateStatus('safe', 'Chyba při kontrole', 'Nepodařilo se zkontrolovat aktuální stránku.');
  }
}

// Update status indicator
function updateStatus(type, title, message) {
  const indicator = document.getElementById('status-indicator');
  const statusTitle = document.getElementById('status-title');
  const statusMessage = document.getElementById('status-message');

  if (type === 'warning') {
    indicator.classList.add('warning');
    indicator.classList.remove('safe');
  } else {
    indicator.classList.add('safe');
    indicator.classList.remove('warning');
  }

  statusTitle.textContent = title;
  statusMessage.textContent = message;
}

// Load statistics
async function loadStats() {
  try {
    // Get number of domains in database
    const response = await fetch(chrome.runtime.getURL('data/scam-domains.json'));
    const data = await response.json();
    const domainsCount = data.domains ? data.domains.length : 0;

    document.getElementById('domains-count').textContent = domainsCount;

    // Get warnings count from storage
    const result = await chrome.storage.local.get(['warningsCount']);
    const warningsCount = result.warningsCount || 0;
    document.getElementById('warnings-count').textContent = warningsCount;
  } catch (error) {
    console.error('Failed to load stats:', error);
  }
}

// Setup event listeners
function setupEventListeners() {
  const reportBtn = document.getElementById('report-btn');

  if (reportBtn) {
    reportBtn.addEventListener('click', () => {
      // Open report form (could be a GitHub issue, Google Form, etc.)
      chrome.tabs.create({
        url: 'https://github.com/michaelpetrik/fair-store/issues/new'
      });
    });
  }
}
