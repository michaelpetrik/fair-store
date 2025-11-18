// Fair Store Extension Popup Script

// Backend URL pro nahlášení podezřelých stránek
const REPORT_BACKEND_URL = 'https://api.fair-store.cz/report'; // TODO: Replace with actual backend

document.addEventListener('DOMContentLoaded', async () => {
  await checkCurrentTab();
  await loadStats();
  await loadProtectionState();
  setupEventListeners();
});

// Kontrola aktuální záložky
async function checkCurrentTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.url) {
      return;
    }

    // Přeskočit speciální stránky prohlížeče
    if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      updateStatus('safe', 'Speciální stránka prohlížeče', 'Nelze kontrolovat systémové stránky.');
      return;
    }

    const response = await chrome.runtime.sendMessage({
      action: 'checkDomain',
      url: tab.url
    });

    if (response && response.isScam) {
      updateStatus('warning', '⚠️ Varování!', `Tato stránka (${response.domain}) je v databázi ČOI jako rizikový e-shop.`);
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

// Načtení statistik
async function loadStats() {
  try {
    // Počet domén z úložiště (načteno z ČOI CSV)
    const result = await chrome.storage.local.get(['scamDomains', 'warningsCount']);

    const domainsCount = result.scamDomains ? result.scamDomains.length : 0;
    document.getElementById('domains-count').textContent = domainsCount;

    // Počet zobrazených varování
    const warningsCount = result.warningsCount || 0;
    document.getElementById('warnings-count').textContent = warningsCount;
  } catch (error) {
    console.error('Chyba při načítání statistik:', error);
    document.getElementById('domains-count').textContent = '0';
    document.getElementById('warnings-count').textContent = '0';
  }
}

// Načtení stavu ochrany
async function loadProtectionState() {
  try {
    const result = await chrome.storage.session.get(['protectionEnabled']);
    const isEnabled = result.protectionEnabled !== false; // Default true

    const toggle = document.getElementById('protection-toggle');
    const statusText = document.getElementById('toggle-status');

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
  // Toggle ochrany
  const protectionToggle = document.getElementById('protection-toggle');
  if (protectionToggle) {
    protectionToggle.addEventListener('change', handleProtectionToggle);
  }

  // Nahlásit podezřelý e-shop
  const reportBtn = document.getElementById('report-btn');
  if (reportBtn) {
    reportBtn.addEventListener('click', handleReportStore);
  }

  // Ohodnotit rozšíření
  const rateBtn = document.getElementById('rate-btn');
  if (rateBtn) {
    rateBtn.addEventListener('click', () => {
      // TODO: Po zveřejnění v Chrome Web Store nahraďte YOUR_EXTENSION_ID skutečným ID rozšíření
      // ID najdete v URL po publikaci: https://chrome.google.com/webstore/detail/<EXTENSION_ID>
      chrome.tabs.create({
        url: 'https://chrome.google.com/webstore/detail/YOUR_EXTENSION_ID/reviews'
      });
    });
  }

  // O rozšíření
  const aboutBtn = document.getElementById('about-btn');
  if (aboutBtn) {
    aboutBtn.addEventListener('click', () => {
      showModal('about-modal');
    });
  }

  // Modální dialogy
  const confirmDisableBtn = document.getElementById('confirm-disable-btn');
  if (confirmDisableBtn) {
    confirmDisableBtn.addEventListener('click', confirmDisableProtection);
  }

  const cancelDisableBtn = document.getElementById('cancel-disable-btn');
  if (cancelDisableBtn) {
    cancelDisableBtn.addEventListener('click', () => {
      // Zrušit a vrátit toggle zpět
      document.getElementById('protection-toggle').checked = true;
      hideModal('disable-modal');
    });
  }

  const closeAboutBtn = document.getElementById('close-about-btn');
  if (closeAboutBtn) {
    closeAboutBtn.addEventListener('click', () => {
      hideModal('about-modal');
    });
  }

  // Zavřít modální dialog kliknutím mimo
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        hideModal(modal.id);
        // Pokud je to disable modal, vrátit toggle
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
    // Uživatel chce vypnout - zobrazit varování
    showModal('disable-modal');
  } else {
    // Uživatel chce zapnout - aktivovat okamžitě
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
    await chrome.storage.session.set({ protectionEnabled: false });
    await chrome.runtime.sendMessage({ action: 'setProtection', enabled: false });

    const statusText = document.getElementById('toggle-status');
    statusText.innerHTML = '<span class="status-inactive">Vypnuto - Nejste chráněni!</span>';

    console.log('Ochrana vypnuta pro tuto relaci');
  } catch (error) {
    console.error('Chyba při vypínání ochrany:', error);
  }
}

// Zapnutí ochrany
async function enableProtection() {
  try {
    await chrome.storage.session.set({ protectionEnabled: true });
    await chrome.runtime.sendMessage({ action: 'setProtection', enabled: true });

    const statusText = document.getElementById('toggle-status');
    statusText.innerHTML = '<span class="status-active">Aktivní - Chráněno ČOI daty</span>';

    console.log('Ochrana zapnuta');
  } catch (error) {
    console.error('Chyba při zapínání ochrany:', error);
  }
}

// Nahlásit podezřelý e-shop
async function handleReportStore() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.url) {
      alert('Nelze získat URL aktuální stránky.');
      return;
    }

    // Přeskočit speciální stránky
    if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      alert('Tuto stránku nelze nahlásit.');
      return;
    }

    const reportBtn = document.getElementById('report-btn');
    const originalText = reportBtn.innerHTML;

    // Zobrazit loading stav
    reportBtn.disabled = true;
    reportBtn.innerHTML = '<svg class="spinner" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="4" fill="none" stroke-linecap="round"/></svg> Odesílání...';

    // Odeslat na backend
    try {
      const response = await fetch(REPORT_BACKEND_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: tab.url,
          title: tab.title,
          timestamp: new Date().toISOString(),
          reportedBy: 'fair-store-extension',
          version: '1.1.0'
        })
      });

      if (response.ok) {
        alert('✅ Děkujeme! Podezřelá stránka byla úspěšně nahlášena.\n\nNáš tým prověří hlášení a případně přidá stránku do databáze.');
      } else {
        throw new Error('Chyba serveru');
      }
    } catch (fetchError) {
      // Pokud backend není dostupný, otevřít GitHub issue
      console.warn('Backend není dostupný, používám GitHub fallback:', fetchError);

      const issueTitle = `Nahlášení podezřelého e-shopu: ${tab.title}`;
      const issueBody = `
**URL stránky:** ${tab.url}

**Důvod nahlášení:**
(Prosím popište, proč považujete tuto stránku za podezřelou)

**Další informace:**
- Datum: ${new Date().toLocaleString('cs-CZ')}
- Nahlášeno přes: Fair Store rozšíření v${chrome.runtime.getManifest().version}
      `.trim();

      const githubUrl = `https://github.com/michaelpetrik/fair-store/issues/new?title=${encodeURIComponent(issueTitle)}&body=${encodeURIComponent(issueBody)}`;

      chrome.tabs.create({ url: githubUrl });

      alert('📝 Otevřel se formulář pro nahlášení na GitHubu.\n\nProsím doplňte důvod nahlášení a odešlete.');
    }

    // Obnovit původní stav tlačítka
    reportBtn.disabled = false;
    reportBtn.innerHTML = originalText;

  } catch (error) {
    console.error('Chyba při nahlašování:', error);
    alert('❌ Došlo k chybě při nahlašování. Prosím zkuste to znovu.');

    const reportBtn = document.getElementById('report-btn');
    reportBtn.disabled = false;
  }
}

// Zobrazit modální dialog
function showModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('hidden');
    // Fokus na první tlačítko v modálu
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
