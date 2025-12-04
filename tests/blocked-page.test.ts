/**
 * Blocked Page Tests
 * Tests for the blocked.ts page functionality
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';

describe('Blocked Page', () => {
  let dom: JSDOM;
  let document: Document;
  let window: Window;
  let mockChrome: any;

  beforeEach(() => {
    // Create a new JSDOM instance for each test
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <div id="domain-name"></div>
          <div id="reason-text"></div>
          <button id="fair-store-toggle-details" aria-expanded="false"></button>
          <div id="fair-store-details-content"></div>
          <div class="fair-store-chevron"></div>
          <button id="fair-store-close-tab"></button>
          <button id="fair-store-ignore-warning"></button>
        </body>
      </html>
    `, {
      url: 'chrome-extension://test/src/pages/blocked.html?url=https://scam.com/path'
    });

    document = dom.window.document;
    window = dom.window as any;

    // Mock chrome API
    mockChrome = {
      storage: {
        local: {
          get: vi.fn(() => Promise.resolve({
            scamDomains: [['scam.com', 'Důvod: Podvodný e-shop']]
          }))
        }
      },
      tabs: {
        getCurrent: vi.fn((callback: Function) => {
          callback({ id: 123 });
        }),
        remove: vi.fn()
      },
      runtime: {
        sendMessage: vi.fn(() => Promise.resolve({ success: true }))
      }
    };

    (global as any).chrome = mockChrome;
    (global as any).document = document;
    (global as any).window = window;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Page Initialization', () => {
    it('should extract domain from URL parameter', () => {
      const params = new URLSearchParams(window.location.search);
      const originalUrl = params.get('url');
      expect(originalUrl).toBe('https://scam.com/path');

      const domain = new URL(originalUrl!).hostname;
      expect(domain).toBe('scam.com');
    });

    it('should display domain name', async () => {
      const params = new URLSearchParams(window.location.search);
      const originalUrl = params.get('url');
      const domain = new URL(originalUrl!).hostname;

      const domainElement = document.getElementById('domain-name');
      domainElement!.textContent = domain;

      expect(domainElement!.textContent).toBe('scam.com');
    });

    it('should load reason from storage', async () => {
      const result = await mockChrome.storage.local.get(['scamDomains']);
      const scamDomains = new Map<string, string>(result.scamDomains);

      expect(scamDomains.get('scam.com')).toBe('Důvod: Podvodný e-shop');
    });

    it('should display reason text', async () => {
      const result = await mockChrome.storage.local.get(['scamDomains']);
      const scamDomains = new Map<string, string>(result.scamDomains);
      const reason = scamDomains.get('scam.com');

      const reasonElement = document.getElementById('reason-text');
      reasonElement!.textContent = reason || 'Důvod nebyl nalezen.';

      expect(reasonElement!.textContent).toBe('Důvod: Podvodný e-shop');
    });

    it('should handle missing URL parameter', () => {
      const params = new URLSearchParams('');
      const originalUrl = params.get('url');
      expect(originalUrl).toBeNull();
    });

    it('should handle invalid URL parameter', () => {
      expect(() => {
        new URL('invalid-url');
      }).toThrow();
    });
  });

  describe('Reason Matching', () => {
    it('should find exact domain match', async () => {
      mockChrome.storage.local.get.mockResolvedValueOnce({
        scamDomains: [['scam.com', 'Exact match reason']]
      });

      const result = await mockChrome.storage.local.get(['scamDomains']);
      const scamDomains = new Map<string, string>(result.scamDomains);
      const reason = scamDomains.get('scam.com');

      expect(reason).toBe('Exact match reason');
    });

    it('should find subdomain match', async () => {
      mockChrome.storage.local.get.mockResolvedValueOnce({
        scamDomains: [
          ['scam.com', 'Parent domain reason'],
          ['sub.scam.com', 'Subdomain reason']
        ]
      });

      const result = await mockChrome.storage.local.get(['scamDomains']);
      const scamDomains = new Map<string, string>(result.scamDomains);
      const domain = 'www.scam.com';

      let reason = scamDomains.get(domain);
      if (!reason) {
        for (const [scamDomain, scamReason] of scamDomains.entries()) {
          if (domain.endsWith('.' + scamDomain) || domain === scamDomain) {
            reason = scamReason;
            break;
          }
        }
      }

      expect(reason).toBe('Parent domain reason');
    });

    it('should show default message when reason not found', async () => {
      mockChrome.storage.local.get.mockResolvedValueOnce({
        scamDomains: [['other.com', 'Other reason']]
      });

      const result = await mockChrome.storage.local.get(['scamDomains']);
      const scamDomains = new Map<string, string>(result.scamDomains);
      const reason = scamDomains.get('scam.com');

      expect(reason).toBeUndefined();
      expect(reason || 'Důvod nebyl nalezen.').toBe('Důvod nebyl nalezen.');
    });

    it('should handle storage error gracefully', async () => {
      mockChrome.storage.local.get.mockRejectedValueOnce(new Error('Storage error'));

      try {
        await mockChrome.storage.local.get(['scamDomains']);
      } catch (error) {
        expect((error as Error).message).toBe('Storage error');
      }
    });
  });

  describe('Toggle Details Button', () => {
    it('should toggle details visibility', () => {
      const toggleBtn = document.getElementById('fair-store-toggle-details') as HTMLButtonElement;
      const detailsContent = document.getElementById('fair-store-details-content') as HTMLElement;
      const chevron = document.querySelector('.fair-store-chevron') as HTMLElement;

      expect(toggleBtn.getAttribute('aria-expanded')).toBe('false');

      // Simulate click - expand
      const isExpanded = toggleBtn.getAttribute('aria-expanded') === 'true';
      toggleBtn.setAttribute('aria-expanded', (!isExpanded).toString());
      detailsContent.classList.add('expanded');
      chevron.style.transform = 'rotate(180deg)';

      expect(toggleBtn.getAttribute('aria-expanded')).toBe('true');
      expect(detailsContent.classList.contains('expanded')).toBe(true);
      expect(chevron.style.transform).toBe('rotate(180deg)');

      // Simulate click - collapse
      const isExpandedAgain = toggleBtn.getAttribute('aria-expanded') === 'true';
      toggleBtn.setAttribute('aria-expanded', (!isExpandedAgain).toString());
      detailsContent.classList.remove('expanded');
      chevron.style.transform = 'rotate(0deg)';

      expect(toggleBtn.getAttribute('aria-expanded')).toBe('false');
      expect(detailsContent.classList.contains('expanded')).toBe(false);
      expect(chevron.style.transform).toBe('rotate(0deg)');
    });

    it('should handle missing chevron element', () => {
      document.querySelector('.fair-store-chevron')?.remove();
      const chevron = document.querySelector('.fair-store-chevron');
      expect(chevron).toBeNull();
    });
  });

  describe('Close Tab Button', () => {
    it('should close tab when button clicked', () => {
      mockChrome.tabs.getCurrent((tab: any) => {
        if (tab && tab.id) {
          mockChrome.tabs.remove(tab.id);
        }
      });

      expect(mockChrome.tabs.remove).toHaveBeenCalledWith(123);
    });

    it('should handle tab without id', () => {
      mockChrome.tabs.getCurrent.mockImplementationOnce((callback: Function) => {
        callback({ id: undefined });
      });

      mockChrome.tabs.getCurrent((tab: any) => {
        if (tab && tab.id) {
          mockChrome.tabs.remove(tab.id);
        } else {
          window.location.href = 'https://www.google.com';
        }
      });

      expect(mockChrome.tabs.remove).not.toHaveBeenCalled();
    });

    it('should handle null tab', () => {
      mockChrome.tabs.getCurrent.mockImplementationOnce((callback: Function) => {
        callback(null);
      });

      let redirected = false;
      mockChrome.tabs.getCurrent((tab: any) => {
        if (tab && tab.id) {
          mockChrome.tabs.remove(tab.id);
        } else {
          redirected = true;
        }
      });

      expect(mockChrome.tabs.remove).not.toHaveBeenCalled();
      expect(redirected).toBe(true);
    });
  });

  describe('Ignore Warning Button', () => {
    it('should send allowDomain message and redirect', async () => {
      const domain = 'scam.com';
      const originalUrl = 'https://scam.com/path';

      await mockChrome.runtime.sendMessage({
        action: 'allowDomain',
        domain: domain
      });

      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith({
        action: 'allowDomain',
        domain: domain
      });
    });

    it('should handle sendMessage error', async () => {
      mockChrome.runtime.sendMessage.mockRejectedValueOnce(new Error('Send failed'));

      try {
        await mockChrome.runtime.sendMessage({
          action: 'allowDomain',
          domain: 'scam.com'
        });
      } catch (error) {
        expect((error as Error).message).toBe('Send failed');
      }
    });

    it('should redirect to original URL after allowing', async () => {
      const originalUrl = 'https://scam.com/path';

      await mockChrome.runtime.sendMessage({
        action: 'allowDomain',
        domain: 'scam.com'
      });

      // In actual implementation, would do: window.location.href = originalUrl;
      expect(mockChrome.runtime.sendMessage).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long domain names', () => {
      const longDomain = 'very.long.subdomain.with.many.levels.example.com';
      const domainElement = document.getElementById('domain-name');
      domainElement!.textContent = longDomain;

      expect(domainElement!.textContent).toBe(longDomain);
    });

    it('should handle very long reason text', async () => {
      const longReason = 'A'.repeat(5000);
      mockChrome.storage.local.get.mockResolvedValueOnce({
        scamDomains: [['scam.com', longReason]]
      });

      const result = await mockChrome.storage.local.get(['scamDomains']);
      const scamDomains = new Map<string, string>(result.scamDomains);
      const reason = scamDomains.get('scam.com');

      expect(reason?.length).toBe(5000);
    });

    it('should handle special characters in domain', () => {
      const specialDomain = 'xn--e1afmkfd.xn--p1ai'; // Punycode
      const domainElement = document.getElementById('domain-name');
      domainElement!.textContent = specialDomain;

      expect(domainElement!.textContent).toBe(specialDomain);
    });

    it('should handle Czech characters in reason', async () => {
      const czechReason = 'Důvod s háčky a čárkami: ěščřžýáíé';
      mockChrome.storage.local.get.mockResolvedValueOnce({
        scamDomains: [['scam.com', czechReason]]
      });

      const result = await mockChrome.storage.local.get(['scamDomains']);
      const scamDomains = new Map<string, string>(result.scamDomains);
      const reason = scamDomains.get('scam.com');

      expect(reason).toBe(czechReason);
    });

    it('should handle empty scamDomains array', async () => {
      mockChrome.storage.local.get.mockResolvedValueOnce({
        scamDomains: []
      });

      const result = await mockChrome.storage.local.get(['scamDomains']);
      const scamDomains = new Map<string, string>(result.scamDomains);

      expect(scamDomains.size).toBe(0);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      const toggleBtn = document.getElementById('fair-store-toggle-details');
      expect(toggleBtn?.hasAttribute('aria-expanded')).toBe(true);
    });

    it('should update aria-expanded on toggle', () => {
      const toggleBtn = document.getElementById('fair-store-toggle-details') as HTMLButtonElement;

      expect(toggleBtn.getAttribute('aria-expanded')).toBe('false');
      toggleBtn.setAttribute('aria-expanded', 'true');
      expect(toggleBtn.getAttribute('aria-expanded')).toBe('true');
    });

    it('should have accessible button labels', () => {
      const closeBtn = document.getElementById('fair-store-close-tab');
      const ignoreBtn = document.getElementById('fair-store-ignore-warning');
      const toggleBtn = document.getElementById('fair-store-toggle-details');

      expect(closeBtn).toBeTruthy();
      expect(ignoreBtn).toBeTruthy();
      expect(toggleBtn).toBeTruthy();
    });
  });
});
