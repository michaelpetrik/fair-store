// Content script for Fair Store extension
// Displays warning popup on scam domains

let warningShown = false;

// Check if current page is a scam domain on load
async function checkCurrentPage() {
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'checkDomain',
      url: window.location.href
    });

    if (response && response.isScam) {
      showWarning(response.domain);
    }
  } catch (error) {
    console.error('Failed to check domain:', error);
  }
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'showWarning') {
    showWarning(message.domain);
  }
});

// Create and display warning popup
function showWarning(domain) {
  // Don't show warning twice
  if (warningShown) {
    return;
  }

  warningShown = true;

  // Create overlay container
  const overlay = document.createElement('div');
  overlay.id = 'fair-store-warning-overlay';
  overlay.innerHTML = `
    <div class="fair-store-warning-container">
      <div class="fair-store-warning-header">
        <svg class="fair-store-warning-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <h1 class="fair-store-warning-title">⚠️ VAROVÁNÍ - PODEZŘELÁ STRÁNKA</h1>
      </div>

      <div class="fair-store-warning-content">
        <p class="fair-store-warning-text">
          Tato stránka (<strong>${escapeHtml(domain)}</strong>) je v naší databázi označena jako potenciálně podvodná.
        </p>

        <div class="fair-store-warning-reasons">
          <h3>Důvody varování:</h3>
          <ul>
            <li>Stránka je evidována v databázi podvodných e-shopů</li>
            <li>Uživatelé hlásili problémy s dodáním zboží</li>
            <li>Možnost neoprávněného zneužití platebních údajů</li>
          </ul>
        </div>

        <p class="fair-store-warning-advice">
          <strong>Doporučení:</strong> Důrazně nedoporučujeme na této stránce nakupovat nebo zadávat citlivé osobní údaje.
        </p>
      </div>

      <div class="fair-store-warning-actions">
        <button id="fair-store-close-tab" class="fair-store-btn fair-store-btn-primary">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 18L18 6M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Zavřít záložku
        </button>
        <button id="fair-store-ignore" class="fair-store-btn fair-store-btn-secondary">
          Ignorovat a pokračovat
        </button>
      </div>

      <div class="fair-store-warning-footer">
        <p>Rozšíření Fair Store chrání české spotřebitele před podvodnými e-shopy.</p>
      </div>
    </div>
  `;

  // Inject into page
  document.documentElement.appendChild(overlay);

  // Add event listeners
  const closeTabBtn = document.getElementById('fair-store-close-tab');
  const ignoreBtn = document.getElementById('fair-store-ignore');

  if (closeTabBtn) {
    closeTabBtn.addEventListener('click', () => {
      // Close the current tab
      chrome.runtime.sendMessage({ action: 'closeTab' });
      window.close();
    });
  }

  if (ignoreBtn) {
    ignoreBtn.addEventListener('click', () => {
      // Remove the warning overlay
      overlay.remove();
      warningShown = false;
    });
  }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Check on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', checkCurrentPage);
} else {
  checkCurrentPage();
}
