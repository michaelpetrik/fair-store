import './warning.css';
import { BannerRenderer } from './bannerRenderer';
import { OverlayRenderer } from './overlayRenderer';

// Store renderers globally so they can be accessed by message listeners
let bannerRenderer: BannerRenderer | null = null;
let overlayRenderer: OverlayRenderer | null = null;

// Register message listener IMMEDIATELY to avoid race conditions
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'showWarning') {
    // Create banner if not exists
    if (!bannerRenderer) {
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
    }
    bannerRenderer.render();

    // Create a new overlay with the specific domain and reason from the message
    const warningOverlay = new OverlayRenderer(document, {
      id: 'fair-store-warning-overlay',
      styles: {},
      domain: message.domain || message.matchedDomain,
      reason: message.reason,
    });
    warningOverlay.render();

    sendResponse({ success: true });
    return true;
  }

  if (message.action === 'hideWarning') {
    if (bannerRenderer) {
      bannerRenderer.remove();
    }
    // Remove overlay by ID since we might not have a reference
    const existingOverlay = document.getElementById('fair-store-warning-overlay');
    if (existingOverlay) {
      existingOverlay.remove();
    }
    sendResponse({ success: true });
    return true;
  }

  return false;
});

// Proactively check if current domain is risky
chrome.runtime.sendMessage({ action: 'checkDomain', url: window.location.href }, (response) => {
  if (chrome.runtime.lastError) {
    console.error('Fair Store:', chrome.runtime.lastError);
    return;
  }

  if (response?.isScam && response?.protectionEnabled) {
    // Create banner
    if (!bannerRenderer) {
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
    }
    bannerRenderer.render();

    // Create overlay
    const warningOverlay = new OverlayRenderer(document, {
      id: 'fair-store-warning-overlay',
      styles: {},
      domain: response.domain || response.matchedDomain,
      reason: response.reason,
    });
    warningOverlay.render();
  }
});
