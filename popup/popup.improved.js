/**
 * Fair Store Extension Popup Script
 * Provides user interface for protection status and settings
 *
 * @author Michael Petrik
 * @license MIT
 */

/** Backend URL for reporting suspicious stores (fallback to GitHub if unavailable) */
const REPORT_BACKEND_URL = 'https://api.fair-store.cz/report';

/** Maximum retries for failed operations */
const MAX_RETRIES = 3;

/** Retry delay in milliseconds */
const RETRY_DELAY = 1000;

/**
 * Initialize popup when DOM is ready
 * Loads protection state, checks current tab, and loads stats in parallel
 */
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Load all data in parallel for better performance
    await Promise.all([
      loadProtectionState(),
      checkCurrentTab(),
      loadStats()
    ]);
    setupEventListeners();
  } catch (error) {
    console.error('Chyba při inicializaci popup:', error);
    showError('Nepodařilo se načíst data rozšíření. Zkuste popup zavřít a znovu otevřít.');
  }
});

/**
 * Check current tab and update status display
 * Handles errors gracefully and provides user-friendly messages
 */
async function checkCurrentTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      updateStatus('safe', 'Speciální stránka prohlížeče', 'Nelze kontrolovat systémové stránky.');
      return;
    }

    const response = await sendMessageWithRetry({
      action: 'checkDomain',
      url: tab.url
    });

    if (response && response.isScam) {
      if (response.protectionEnabled) {
        updateStatus('warning', '⚠️ Varování!', `Tato stránka (${response.domain}) je v databázi ČOI jako rizikový e-shop.`);
      } else {
        updateStatus('warning', '⚠️ Stránka je riziková', 'Ochrana je vypnutá, ale tato stránka je v databázi ČOI. Doporučujeme ochranu zapnout.');
      }
    } else {
      updateStatus('safe', 'Stránka je bezpečná', 'Tato stránka není v databázi rizikových e-shopů ČOI.');
    }
  } catch (error) {
    console.error('Chyba při kontrole záložky:', error);
    updateStatus('error', 'Chyba při kontrole', 'Nepodařilo se zkontrolovat aktuální stránku. Zkontrolujte připojení k internetu.');
  }
}

/**
 * Update status indicator in popup
 *
 * @param {('safe'|'warning'|'error')} type - Status type
 * @param {string} title - Status title text
 * @param {string} message - Detailed status message
 */
function updateStatus(type, title, message) {
  const indicator = document.getElementById('status-indicator');
  const statusTitle = document.getElementById('status-title');
  const statusMessage = document.getElementById('status-message');

  if (!indicator || !statusTitle || !statusMessage) {
    console.error('Status elements not found in DOM');
    return;
  }

  // Reset all classes
  indicator.classList.remove('warning', 'safe', 'error');

  // Add appropriate class
  if (type === 'warning') {
    indicator.classList.add('warning');
  } else if (type === 'error') {
    indicator.classList.add('error');
  } else {
    indicator.classList.add('safe');
  }

  statusTitle.textContent = title;
  statusMessage.textContent = message;
}

/**
 * Load statistics (number of scam domains)
 * Uses cached data with retry logic
 */
async function loadStats() {
  try {
    const result = await chrome.storage.local.get(['scamDomains']);
    const domainsCount = result.scamDomains ? result.scamDomains.length : 0;
    const domainsCountEl = document.getElementById('domains-count');
    if (domainsCountEl) {
      domainsCountEl.textContent = domainsCount.toLocaleString('cs-CZ');
    }
  } catch (error) {
    console.error('Chyba při načítání statistik:', error);
    const domainsCountEl = document.getElementById('domains-count');
    if (domainsCountEl) {
      domainsCountEl.textContent = 'N/A';
    }
  }
}

/**
 * Load global protection state from session storage
 * Defaults to enabled if no state is stored
 */
async function loadProtectionState() {
  try {
    const result = await chrome.storage.session.get(['protectionEnabled']);
    const isEnabled = result.protectionEnabled !== false; // Default true

    const toggle = document.getElementById('protection-toggle');
    const statusText = document.getElementById('toggle-status');

    if (!toggle || !statusText) {
      console.error('Protection toggle elements not found');
      return;
    }

    toggle.disabled = false; // Toggle should always be usable
    toggle.checked = isEnabled;

    if (isEnabled) {
      statusText.innerHTML = '<span class="status-active">Aktivní - Chráněno ČOI daty</span>';
    } else {
      statusText.innerHTML = '<span class="status-inactive">Vypnuto - Nejste chráněni!</span>';
    }
  } catch (error) {
    console.error('Chyba při načítání stavu ochrany:', error);
    showError('Nepodařilo se načíst stav ochrany.');
  }
}

/**
 * Setup event listeners for all interactive elements
 */
function setupEventListeners() {
  const protectionToggle = document.getElementById('protection-toggle');
  if (protectionToggle) {
    protectionToggle.addEventListener('change', handleProtectionToggle);
  }

  const reportBtn = document.getElementById('report-btn');
  if (reportBtn) {
    reportBtn.addEventListener('click', handleReportStore);
  }

  const rateBtn = document.getElementById('rate-btn');
  if (rateBtn) {
    rateBtn.addEventListener('click', () => {
      chrome.tabs.create({ url: 'https://chrome.google.com/webstore/detail/gooohenidgfjghgghdhigagajngphkhc/reviews' });
    });
  }

  const aboutBtn = document.getElementById('about-btn');
  if (aboutBtn) {
    aboutBtn.addEventListener('click', () => showModal('about-modal'));
  }

  const confirmDisableBtn = document.getElementById('confirm-disable-btn');
  if (confirmDisableBtn) {
    confirmDisableBtn.addEventListener('click', confirmDisableProtection);
  }

  const cancelDisableBtn = document.getElementById('cancel-disable-btn');
  if (cancelDisableBtn) {
    cancelDisableBtn.addEventListener('click', () => {
      const toggle = document.getElementById('protection-toggle');
      if (toggle) toggle.checked = true;
      hideModal('disable-modal');
    });
  }

  const closeAboutBtn = document.getElementById('close-about-btn');
  if (closeAboutBtn) {
    closeAboutBtn.addEventListener('click', () => hideModal('about-modal'));
  }

  // Close modals on backdrop click
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        hideModal(modal.id);
        if (modal.id === 'disable-modal') {
          const toggle = document.getElementById('protection-toggle');
          if (toggle) toggle.checked = true;
        }
      }
    });
  });
}

/**
 * Handle protection toggle change
 * @param {Event} e - Change event
 */
async function handleProtectionToggle(e) {
  const isEnabled = e.target.checked;
  if (!isEnabled) {
    showModal('disable-modal');
  } else {
    await enableProtection();
  }
}

/**
 * Confirm disabling protection (after user confirms in modal)
 */
async function confirmDisableProtection() {
  await disableProtection();
  hideModal('disable-modal');
}

/**
 * Disable protection for current session
 */
async function disableProtection() {
  try {
    await sendMessageWithRetry({ action: 'setProtection', enabled: false });
    const statusText = document.getElementById('toggle-status');
    if (statusText) {
      statusText.innerHTML = '<span class="status-inactive">Vypnuto - Nejste chráněni!</span>';
    }
    console.log('Ochrana vypnuta pro tuto relaci');
    await checkCurrentTab(); // Refresh main status
  } catch (error) {
    console.error('Chyba při vypínání ochrany:', error);
    showError('Nepodařilo se vypnout ochranu. Zkuste to znovu.');
  }
}

/**
 * Enable protection
 */
async function enableProtection() {
  try {
    await sendMessageWithRetry({ action: 'setProtection', enabled: true });
    const statusText = document.getElementById('toggle-status');
    if (statusText) {
      statusText.innerHTML = '<span class="status-active">Aktivní - Chráněno ČOI daty</span>';
    }
    console.log('Ochrana zapnuta');
    await checkCurrentTab(); // Refresh main status
  } catch (error) {
    console.error('Chyba při zapínání ochrany:', error);
    showError('Nepodařilo se zapnout ochranu. Zkuste to znovu.');
  }
}

/**
 * Report suspicious store
 * Tries backend first, falls back to GitHub issue creation
 */
async function handleReportStore() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      alert('Tuto stránku nelze nahlásit.');
      return;
    }

    const reportBtn = document.getElementById('report-btn');
    if (!reportBtn) return;

    const originalText = reportBtn.innerHTML;
    reportBtn.disabled = true;
    reportBtn.innerHTML = '<svg class="spinner" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="4" fill="none" stroke-linecap="round"/></svg> Odesílání...';

    try {
      const response = await fetch(REPORT_BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: tab.url,
          title: tab.title,
          timestamp: new Date().toISOString(),
          reportedBy: 'fair-store-extension',
          version: chrome.runtime.getManifest().version
        }),
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });

      if (response.ok) {
        alert('✅ Děkujeme! Podezřelá stránka byla úspěšně nahlášena.');
      } else {
        throw new Error('Chyba serveru');
      }
    } catch (fetchError) {
      console.warn('Backend není dostupný, používám GitHub fallback:', fetchError);
      const issueTitle = `Nahlášení podezřelého e-shopu: ${tab.title}`;
      const issueBody = `URL: ${tab.url}\n\nNahlášeno přes Fair Store v${chrome.runtime.getManifest().version}`;
      const githubUrl = `https://github.com/michaelpetrik/fair-store/issues/new?title=${encodeURIComponent(issueTitle)}&body=${encodeURIComponent(issueBody)}`;
      chrome.tabs.create({ url: githubUrl });
      alert('📝 Otevřel se formulář pro nahlášení na GitHubu.');
    }

    reportBtn.disabled = false;
    reportBtn.innerHTML = originalText;
  } catch (error) {
    console.error('Chyba při nahlašování:', error);
    alert('❌ Došlo k chybě při nahlašování.');
    const reportBtn = document.getElementById('report-btn');
    if (reportBtn) reportBtn.disabled = false;
  }
}

/**
 * Show modal dialog
 * @param {string} modalId - ID of modal element to show
 */
function showModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('hidden');
    setTimeout(() => {
      const firstBtn = modal.querySelector('button');
      if (firstBtn) firstBtn.focus();
    }, 100);
  }
}

/**
 * Hide modal dialog
 * @param {string} modalId - ID of modal element to hide
 */
function hideModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('hidden');
  }
}

/**
 * Show error message to user
 * @param {string} message - Error message to display
 */
function showError(message) {
  updateStatus('error', 'Chyba', message);
}

/**
 * Send message with retry logic
 * @param {Object} message - Message to send
 * @param {number} retries - Number of retries remaining
 * @returns {Promise<any>} Response from background script
 */
async function sendMessageWithRetry(message, retries = MAX_RETRIES) {
  try {
    return await chrome.runtime.sendMessage(message);
  } catch (error) {
    if (retries > 0) {
      console.warn(`Message failed, retrying... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return sendMessageWithRetry(message, retries - 1);
    }
    throw error;
  }
}
