import { BannerRenderer } from './bannerRenderer';
import { DomainBlacklist } from './domainBlacklist';
import { ScamBannerController } from './controller';

const BLACKLISTED_DOMAINS = Object.freeze(['google.com', 'kaufland.cz'] as const);

const bannerRenderer = new BannerRenderer(document, {
  id: 'fair-store-scam-banner',
  text: 'SCAM STORE',
  styles: {
    position: 'absolute',
    top: '0',
    left: '0',
    right: '0',
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

const controller = new ScamBannerController(
  document,
  window.location,
  new DomainBlacklist(BLACKLISTED_DOMAINS),
  bannerRenderer,
);

controller.init();
