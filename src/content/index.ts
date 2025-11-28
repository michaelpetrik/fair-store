import './warning.css';
import { BannerRenderer } from './bannerRenderer';
import { DomainBlacklist } from './domainBlacklist';
import { ScamBannerController } from './controller';
import { OverlayRenderer } from './overlayRenderer'; // Import OverlayRenderer

// Store renderers globally so they can be accessed by message listeners
let bannerRenderer: BannerRenderer | null = null;
let overlayRenderer: OverlayRenderer | null = null;

chrome.runtime.sendMessage({ action: 'getBlacklist' }, (response) => {
  if (chrome.runtime.lastError) {
    console.error(chrome.runtime.lastError);
    return;
  }

  const blacklist = response?.blacklist;
  if (!blacklist || !Array.isArray(blacklist)) {
    console.error('Fair Store: Invalid blacklist received');
    return;
  }

  // Create renderers
  bannerRenderer = new BannerRenderer(document, {
    id: 'fair-store-scam-banner',
    text: 'Rizikový e-shop!',
    styles: {
      position: 'fixed',
      top: '0',
      left: '0',
      right: '0',
      width: '100%',
      padding: '12px 16px',
      'background-color': '#d32f2f',
      color: '#ffffff',
      'font-family': 'sans-serif',
      'font-size': '20px',
      'font-weight': 'bold',
      'text-align': 'center',
      'z-index': '2147483647',
      'box-shadow': '0 2px 6px rgba(0, 0, 0, 0.3)',
      'pointer-events': 'none',
    },
  });

  overlayRenderer = new OverlayRenderer(document, {
    id: 'fair-store-warning-overlay',
    styles: {
      // CSS from warning.css will be applied to #fair-store-warning-overlay
    },
  });

  // Only initialize controller if protection is enabled
  if (response.protectionEnabled) {
    const controller = new ScamBannerController(
      document,
      window.location,
      new DomainBlacklist(blacklist),
      bannerRenderer,
      overlayRenderer,
    );
    controller.init();
  }
});

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'showWarning') {
    if (bannerRenderer && overlayRenderer) {
      bannerRenderer.render();
      overlayRenderer.render();
    }
    sendResponse({ success: true });
    return true;
  }

  if (message.action === 'hideWarning') {
    if (bannerRenderer && overlayRenderer) {
      bannerRenderer.remove();
      overlayRenderer.remove();
    }
    sendResponse({ success: true });
    return true;
  }

  return false;
});
