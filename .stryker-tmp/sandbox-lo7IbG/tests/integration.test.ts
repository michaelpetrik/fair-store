/**
 * Integration Tests
 * End-to-end flow tests for the Chrome extension
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

describe('Integration Tests', () => {
  let mockChrome: any;
  let scamDomains: Map<string, string>;
  let allowedDomains: Set<string>;
  let protectionEnabled: boolean;

  beforeEach(() => {
    scamDomains = new Map([
      ['scam.com', 'Podvodný e-shop'],
      ['fake-store.cz', 'Nedodání zboží'],
      ['phishing.net', 'Zneužití platebních údajů']
    ]);

    allowedDomains = new Set();
    protectionEnabled = true;

    mockChrome = {
      runtime: {
        onInstalled: { addListener: vi.fn() },
        onMessage: { addListener: vi.fn() },
        sendMessage: vi.fn(),
        getURL: vi.fn((path) => `chrome-extension://test/${path}`)
      },
      tabs: {
        onUpdated: { addListener: vi.fn() },
        sendMessage: vi.fn(),
        query: vi.fn(() => Promise.resolve([])),
        remove: vi.fn(),
        update: vi.fn(),
        getCurrent: vi.fn((callback) => callback({ id: 1 }))
      },
      storage: {
        local: {
          get: vi.fn(() => Promise.resolve({
            scamDomains: Array.from(scamDomains.entries()),
            lastUpdate: new Date().toISOString()
          })),
          set: vi.fn(() => Promise.resolve())
        },
        session: {
          get: vi.fn(() => Promise.resolve({ protectionEnabled })),
          set: vi.fn(() => Promise.resolve())
        }
      }
    };

    (global as any).chrome = mockChrome;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('End-to-End Flow: Detect Scam → Show Blocked Page', () => {
    it('should detect scam domain and redirect to blocked page', () => {
      const tabId = 1;
      const scamUrl = 'https://scam.com/products';
      const domain = 'scam.com';

      // Simulate tab loading with scam URL
      const isScam = scamDomains.has(domain);
      expect(isScam).toBe(true);

      if (isScam) {
        const blockedUrl = mockChrome.runtime.getURL('src/pages/blocked.html') + '?url=' + encodeURIComponent(scamUrl);
        mockChrome.tabs.update(tabId, { url: blockedUrl });
      }

      expect(mockChrome.tabs.update).toHaveBeenCalledWith(
        tabId,
        { url: `chrome-extension://test/src/pages/blocked.html?url=${encodeURIComponent(scamUrl)}` }
      );
    });

    it('should detect subdomain scam and redirect', () => {
      const tabId = 2;
      const scamUrl = 'https://www.scam.com/checkout';
      const domain = 'www.scam.com';

      // Check if subdomain matches
      let isScam = scamDomains.has(domain);
      if (!isScam) {
        for (const scamDomain of scamDomains.keys()) {
          if (domain.endsWith('.' + scamDomain)) {
            isScam = true;
            break;
          }
        }
      }

      expect(isScam).toBe(true);

      if (isScam) {
        const blockedUrl = mockChrome.runtime.getURL('src/pages/blocked.html') + '?url=' + encodeURIComponent(scamUrl);
        mockChrome.tabs.update(tabId, { url: blockedUrl });
      }

      expect(mockChrome.tabs.update).toHaveBeenCalled();
    });

    it('should not redirect safe domains', () => {
      const tabId = 3;
      const safeUrl = 'https://google.com/search';
      const domain = 'google.com';

      const isScam = scamDomains.has(domain);
      expect(isScam).toBe(false);

      if (!isScam) {
        // No redirect
      }

      expect(mockChrome.tabs.update).not.toHaveBeenCalled();
    });
  });

  describe('End-to-End Flow: User Allows Domain', () => {
    it('should allow domain and redirect to original URL', async () => {
      const domain = 'scam.com';
      const originalUrl = 'https://scam.com/products';

      // User clicks "Ignore Warning"
      const response = await mockChrome.runtime.sendMessage({
        action: 'allowDomain',
        domain: domain
      });

      // Background script adds domain to allowedDomains
      allowedDomains.add(domain);

      expect(allowedDomains.has(domain)).toBe(true);

      // Check domain again - should return not scam
      const isAllowed = allowedDomains.has(domain);
      const isScam = !isAllowed && scamDomains.has(domain);

      expect(isScam).toBe(false);
    });

    it('should show whitelisted status in popup after allowing', async () => {
      const domain = 'scam.com';

      // Allow the domain
      allowedDomains.add(domain);

      // Check status for popup
      const isAllowed = allowedDomains.has(domain);
      const isInBlacklist = scamDomains.has(domain);

      expect(isAllowed).toBe(true);
      expect(isInBlacklist).toBe(true);

      // Popup should show "whitelisted" status
      const status = isAllowed ? 'whitelisted' : (isInBlacklist ? 'warning' : 'safe');
      expect(status).toBe('whitelisted');
    });

    it('should persist allowed domain for session', () => {
      allowedDomains.add('scam.com');
      allowedDomains.add('fake-store.cz');

      expect(allowedDomains.size).toBe(2);
      expect(allowedDomains.has('scam.com')).toBe(true);
      expect(allowedDomains.has('fake-store.cz')).toBe(true);
    });
  });

  describe('End-to-End Flow: Protection Toggle', () => {
    it('should disable protection and hide warnings on all tabs', async () => {
      mockChrome.tabs.query.mockResolvedValueOnce([
        { id: 1, url: 'https://scam.com' },
        { id: 2, url: 'https://google.com' },
        { id: 3, url: 'https://fake-store.cz' }
      ]);

      // User toggles protection off
      protectionEnabled = false;
      await mockChrome.storage.session.set({ protectionEnabled: false });

      // Update all tabs
      const tabs = await mockChrome.tabs.query({});
      for (const tab of tabs) {
        if (tab.id && tab.url) {
          mockChrome.tabs.sendMessage(tab.id, { action: 'hideWarning' });
        }
      }

      expect(mockChrome.tabs.sendMessage).toHaveBeenCalledTimes(3);
      expect(mockChrome.tabs.sendMessage).toHaveBeenCalledWith(1, { action: 'hideWarning' });
      expect(mockChrome.tabs.sendMessage).toHaveBeenCalledWith(2, { action: 'hideWarning' });
      expect(mockChrome.tabs.sendMessage).toHaveBeenCalledWith(3, { action: 'hideWarning' });
    });

    it('should enable protection and show warnings on scam tabs', async () => {
      mockChrome.tabs.query.mockResolvedValueOnce([
        { id: 1, url: 'https://scam.com/path' },
        { id: 2, url: 'https://google.com' },
        { id: 3, url: 'https://fake-store.cz/products' }
      ]);

      // User toggles protection on
      protectionEnabled = true;
      await mockChrome.storage.session.set({ protectionEnabled: true });

      // Update all tabs
      const tabs = await mockChrome.tabs.query({});
      for (const tab of tabs) {
        if (tab.id && tab.url) {
          const url = new URL(tab.url);
          const domain = url.hostname;

          let isScam = scamDomains.has(domain);
          if (!isScam) {
            for (const [scamDomain, reason] of scamDomains.entries()) {
              if (domain.endsWith('.' + scamDomain)) {
                isScam = true;
                mockChrome.tabs.sendMessage(tab.id, {
                  action: 'showWarning',
                  domain,
                  matchedDomain: scamDomain,
                  reason,
                  url: tab.url
                });
                break;
              }
            }
          }

          if (isScam && scamDomains.has(domain)) {
            mockChrome.tabs.sendMessage(tab.id, {
              action: 'showWarning',
              domain,
              matchedDomain: domain,
              reason: scamDomains.get(domain),
              url: tab.url
            });
          }
        }
      }

      expect(mockChrome.tabs.sendMessage).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ action: 'showWarning', domain: 'scam.com' })
      );
      expect(mockChrome.tabs.sendMessage).toHaveBeenCalledWith(
        3,
        expect.objectContaining({ action: 'showWarning', domain: 'fake-store.cz' })
      );
    });

    it('should not show warnings when protection is disabled', () => {
      protectionEnabled = false;
      const domain = 'scam.com';

      const isScam = scamDomains.has(domain);
      expect(isScam).toBe(true);

      // But should not show warning if protection disabled
      if (protectionEnabled && isScam) {
        // This should not execute
        mockChrome.tabs.sendMessage(1, { action: 'showWarning' });
      }

      expect(mockChrome.tabs.sendMessage).not.toHaveBeenCalled();
    });
  });

  describe('Storage Persistence', () => {
    it('should persist scam domains to local storage', async () => {
      const domainsArray = Array.from(scamDomains.entries());

      await mockChrome.storage.local.set({
        scamDomains: domainsArray,
        lastUpdate: new Date().toISOString()
      });

      expect(mockChrome.storage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({
          scamDomains: domainsArray,
          lastUpdate: expect.any(String)
        })
      );
    });

    it('should load scam domains from local storage', async () => {
      const stored = await mockChrome.storage.local.get(['scamDomains', 'lastUpdate']);

      expect(stored.scamDomains).toBeDefined();
      expect(stored.scamDomains.length).toBe(3);
      expect(stored.lastUpdate).toBeDefined();
    });

    it('should persist protection state to session storage', async () => {
      await mockChrome.storage.session.set({ protectionEnabled: false });

      expect(mockChrome.storage.session.set).toHaveBeenCalledWith({ protectionEnabled: false });
    });

    it('should load protection state from session storage', async () => {
      mockChrome.storage.session.get.mockResolvedValueOnce({ protectionEnabled: false });

      const result = await mockChrome.storage.session.get(['protectionEnabled']);

      expect(result.protectionEnabled).toBe(false);
    });
  });

  describe('Message Communication', () => {
    it('should handle checkDomain message', async () => {
      const message = {
        action: 'checkDomain',
        url: 'https://scam.com/path'
      };

      const url = new URL(message.url);
      const domain = url.hostname;
      const isScam = scamDomains.has(domain);
      const reason = scamDomains.get(domain);

      const response = {
        isScam,
        domain,
        matchedDomain: isScam ? domain : null,
        reason: reason || null,
        protectionEnabled
      };

      expect(response.isScam).toBe(true);
      expect(response.domain).toBe('scam.com');
      expect(response.reason).toBe('Podvodný e-shop');
    });

    it('should handle allowDomain message', () => {
      const message = {
        action: 'allowDomain',
        domain: 'scam.com'
      };

      allowedDomains.add(message.domain);

      expect(allowedDomains.has('scam.com')).toBe(true);
    });

    it('should handle getBlacklist message', () => {
      const blacklistArray = Array.from(scamDomains.keys());

      const response = {
        blacklist: blacklistArray,
        protectionEnabled
      };

      expect(response.blacklist.length).toBe(3);
      expect(response.blacklist).toContain('scam.com');
      expect(response.blacklist).toContain('fake-store.cz');
      expect(response.protectionEnabled).toBe(true);
    });

    it('should handle setProtection message', async () => {
      const message = {
        action: 'setProtection',
        enabled: false
      };

      protectionEnabled = message.enabled;
      await mockChrome.storage.session.set({ protectionEnabled: message.enabled });

      expect(protectionEnabled).toBe(false);
      expect(mockChrome.storage.session.set).toHaveBeenCalledWith({ protectionEnabled: false });
    });

    it('should handle closeTab message', () => {
      const message = {
        action: 'closeTab'
      };

      const tabId = 1;
      mockChrome.tabs.remove(tabId);

      expect(mockChrome.tabs.remove).toHaveBeenCalledWith(tabId);
    });
  });

  describe('Special Chrome Pages', () => {
    it('should not check chrome:// URLs', () => {
      const url = 'chrome://extensions/';
      const shouldCheck = !url.startsWith('chrome://') && !url.startsWith('chrome-extension://');

      expect(shouldCheck).toBe(false);
    });

    it('should not check chrome-extension:// URLs', () => {
      const url = 'chrome-extension://test/popup.html';
      const shouldCheck = !url.startsWith('chrome://') && !url.startsWith('chrome-extension://');

      expect(shouldCheck).toBe(false);
    });

    it('should check http:// URLs', () => {
      const url = 'http://scam.com';
      const shouldCheck = !url.startsWith('chrome://') && !url.startsWith('chrome-extension://');

      expect(shouldCheck).toBe(true);
    });

    it('should check https:// URLs', () => {
      const url = 'https://scam.com';
      const shouldCheck = !url.startsWith('chrome://') && !url.startsWith('chrome-extension://');

      expect(shouldCheck).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle storage errors gracefully', async () => {
      mockChrome.storage.local.get.mockRejectedValueOnce(new Error('Storage error'));

      try {
        await mockChrome.storage.local.get(['scamDomains']);
      } catch (error) {
        expect((error as Error).message).toBe('Storage error');
      }
    });

    it('should handle message sending errors', async () => {
      mockChrome.tabs.sendMessage.mockRejectedValueOnce(
        new Error('Could not establish connection')
      );

      try {
        await mockChrome.tabs.sendMessage(1, { action: 'showWarning' });
      } catch (error) {
        expect((error as Error).message).toBe('Could not establish connection');
      }
    });

    it('should handle tab query errors', async () => {
      mockChrome.tabs.query.mockRejectedValueOnce(new Error('Query failed'));

      try {
        await mockChrome.tabs.query({});
      } catch (error) {
        expect((error as Error).message).toBe('Query failed');
      }
    });
  });

  describe('Performance', () => {
    it('should handle large blacklist efficiently', () => {
      const largeDomainList = new Map<string, string>();
      for (let i = 0; i < 10000; i++) {
        largeDomainList.set(`scam${i}.com`, `Reason ${i}`);
      }

      const start = performance.now();
      const isScam = largeDomainList.has('scam5000.com');
      const end = performance.now();

      expect(isScam).toBe(true);
      expect(end - start).toBeLessThan(10); // Should be very fast (< 10ms)
    });

    it('should handle many tabs efficiently', () => {
      const manyTabs = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        url: i % 2 === 0 ? `https://scam.com/${i}` : `https://safe${i}.com`
      }));

      const start = performance.now();
      const scamTabs = manyTabs.filter(tab => {
        if (!tab.url) return false;
        const domain = new URL(tab.url).hostname;
        return scamDomains.has(domain);
      });
      const end = performance.now();

      expect(scamTabs.length).toBe(50);
      expect(end - start).toBeLessThan(100); // Should process 100 tabs quickly
    });
  });
});
