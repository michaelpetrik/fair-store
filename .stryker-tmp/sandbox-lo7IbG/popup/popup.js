// Fair Store Extension Popup Script

// Backend URL pro nahlášení podezřelých stránek
const REPORT_BACKEND_URL = 'https://api.fair-store.cz/report'; // TODO: Replace with actual backend

document.addEventListener('DOMContentLoaded', async () => {
  await loadProtectionState(); // Load toggle state first
  await checkCurrentTab(); // Then check tab and update status text
  await loadStats();
  setupEventListeners();
});

// Kontrola aktuální záložky
async function checkCurrentTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      updateStatus('safe', 'Speciální stránka prohlížeče', 'Nelze kontrolovat systémové stránky.');
      return;
    }

    const response = await chrome.runtime.sendMessage({
      action: 'checkDomain',
      url: tab.url
    });

    if (response && response.isScam) {
      if (response.isWhitelisted) {
        // Domain is on risk list BUT user whitelisted it
        updateStatus('whitelisted', '⚠️ Stránka na seznamu rizik - Povoleno uživatelem',
          `Tato stránka (${response.domain}) je v databázi ČOI jako rizikový e-shop, ale vy jste povolili přístup kliknutím na "Pokračovat" na blokovací stránce.`);
      } else if (response.protectionEnabled) {
        updateStatus('warning', '⚠️ Varování!', `Tato stránka (${response.domain}) je v databázi ČOI jako rizikový e-shop.`);
      } else {
        updateStatus('warning', '⚠️ Stránka je riziková', `Ochrana je vypnutá, ale tato stránka je v databázi ČOI. Doporučujeme ochranu zapnout.`);
      }
    } else {
      updateStatus('safe', 'Stránka je bezpečná', 'Tato stránka není v databázi rizikových e-shopů ČOI.');
    }
  } catch (error) {
    console.error('Chyba při kontrole záložky:', error);
    updateStatus('safe', 'Chyba při kontrole', 'Nepodařilo se zkontrolovat aktuální stránku.');
  }
}

// Aktualizace stavového indikátoru
function updateStatus(type, title, message) {
  const indicator = document.getElementById('status-indicator');
  const statusTitle = document.getElementById('status-title');
  const statusMessage = document.getElementById('status-message');

  // Remove all status classes
  indicator.classList.remove('safe', 'warning', 'whitelisted');

  if (type === 'warning') {
    indicator.classList.add('warning');
  } else if (type === 'whitelisted') {
    // Whitelisted domains get amber/yellow styling (between safe and warning)
    indicator.classList.add('whitelisted');
  } else {
    indicator.classList.add('safe');
  }

  statusTitle.textContent = title;
  statusMessage.textContent = message;
}

// Načtení statistik
async function loadStats() {
  try {
    const result = await chrome.storage.local.get(['scamDomains']);
    const domainsCount = result.scamDomains ? result.scamDomains.length : 0;
    const domainsCountEl = document.getElementById('domains-count');
    if (domainsCountEl) {
      domainsCountEl.textContent = domainsCount;
    }
  } catch (error) {
    console.error('Chyba při načítání statistik:', error);
    const domainsCountEl = document.getElementById('domains-count');
    if (domainsCountEl) {
      domainsCountEl.textContent = '0';
    }
  }
}

// Načtení globálního stavu ochrany
async function loadProtectionState() {
  try {
    const result = await chrome.storage.session.get(['protectionEnabled']);
    const isEnabled = result.protectionEnabled !== false; // Default true

    const toggle = document.getElementById('protection-toggle');
    const statusText = document.getElementById('toggle-status');
    
    toggle.disabled = false; // Toggle should always be usable
    toggle.checked = isEnabled;

    if (isEnabled) {
      statusText.innerHTML = '<span class="status-active">Aktivní - Chráněno ČOI daty</span>';
    } else {
      statusText.innerHTML = '<span class="status-inactive">Vypnuto - Nejste chráněni!</span>';
    }
  } catch (error) {
    console.error('Chyba při načítání stavu ochrany:', error);
  }
}

// Nastavení event listenerů
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
      document.getElementById('protection-toggle').checked = true;
      hideModal('disable-modal');
    });
  }

  const closeAboutBtn = document.getElementById('close-about-btn');
  if (closeAboutBtn) {
    closeAboutBtn.addEventListener('click', () => hideModal('about-modal'));
  }

  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        hideModal(modal.id);
        if (modal.id === 'disable-modal') {
          document.getElementById('protection-toggle').checked = true;
        }
      }
    });
  });
}

// Zpracování toggle ochrany
async function handleProtectionToggle(e) {
  const isEnabled = e.target.checked;
  if (!isEnabled) {
    showModal('disable-modal');
  } else {
    await enableProtection();
  }
}

// Potvrzení vypnutí ochrany
async function confirmDisableProtection() {
  await disableProtection();
  hideModal('disable-modal');
}

// Vypnutí ochrany
async function disableProtection() {
  try {
    await chrome.runtime.sendMessage({ action: 'setProtection', enabled: false });
    const statusText = document.getElementById('toggle-status');
    statusText.innerHTML = '<span class="status-inactive">Vypnuto - Nejste chráněni!</span>';
    console.log('Ochrana vypnuta pro tuto relaci');
    await checkCurrentTab(); // Refresh main status
  } catch (error) {
    console.error('Chyba při vypínání ochrany:', error);
  }
}

// Zapnutí ochrany
async function enableProtection() {
  try {
    await chrome.runtime.sendMessage({ action: 'setProtection', enabled: true });
    const statusText = document.getElementById('toggle-status');
    statusText.innerHTML = '<span class="status-active">Aktivní - Chráněno ČOI daty</span>';
    console.log('Ochrana zapnuta');
    await checkCurrentTab(); // Refresh main status
  } catch (error) {
    console.error('Chyba při zapínání ochrany:', error);
  }
}

// Nahlásit podezřelý e-shop
async function handleReportStore() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      alert('Tuto stránku nelze nahlásit.');
      return;
    }
    const reportBtn = document.getElementById('report-btn');
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
          version: '1.1.0'
        })
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
    document.getElementById('report-btn').disabled = false;
  }
}

// Zobrazit modální dialog
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

// Skrýt modální dialog
function hideModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('hidden');
  }
}
