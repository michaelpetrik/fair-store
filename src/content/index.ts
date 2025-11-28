import './warning.css';
import { BannerRenderer } from './bannerRenderer';
import { DomainBlacklist } from './domainBlacklist';
import { ScamBannerController } from './controller';
import { OverlayRenderer } from './overlayRenderer'; // Import OverlayRenderer

chrome.runtime.sendMessage({ action: 'getBlacklist' }, (blacklist) => {
  if (chrome.runtime.lastError) {
    console.error(chrome.runtime.lastError);
    return;
  }

  const bannerRenderer = new BannerRenderer(document, {
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

  // Instantiate OverlayRenderer
  const overlayRenderer = new OverlayRenderer(document, {
    id: 'fair-store-warning-overlay',
    styles: {
      // CSS from warning.css will be applied to #fair-store-warning-overlay
    },
  });


  const controller = new ScamBannerController(
    document,
    window.location,
    new DomainBlacklist(blacklist),
    bannerRenderer,
    overlayRenderer, // Pass overlayRenderer
  );

  controller.init();
});
