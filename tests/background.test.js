// tests/background.test.js

// Mock chrome API
global.chrome = {
  runtime: {
    onInstalled: { addListener: jest.fn() },
    onMessage: { addListener: jest.fn() },
    sendMessage: jest.fn()
  },
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn()
    },
    session: {
      get: jest.fn(),
      set: jest.fn()
    }
  },
  tabs: {
    onUpdated: { addListener: jest.fn() },
    sendMessage: jest.fn(),
    remove: jest.fn()
  }
};

// Mock fetch
global.fetch = jest.fn();

const bg = require('../background');

describe('Background Script', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    bg.scamDomains.clear();
  });

  describe('loadScamDomains', () => {
    test('should load domains from remote CSV', async () => {
      const csvContent = 'url;reason\nexample.com;Bad site';
      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(csvContent)
      });

      await bg.loadScamDomains();

      expect(bg.scamDomains.size).toBe(1);
      expect(bg.scamDomains.get('example.com')).toBe('Bad site');
      expect(chrome.storage.local.set).toHaveBeenCalled();
    });

    test('should fallback to local CSV if remote fails', async () => {
      // Remote fails
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      });

      // Local succeeds
      const localCsvContent = 'url;reason\nlocal-scam.com;Local bad site';
      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(localCsvContent)
      });

      await bg.loadScamDomains();

      expect(bg.scamDomains.size).toBe(1);
      expect(bg.scamDomains.get('local-scam.com')).toBe('Local bad site');
      expect(chrome.storage.local.set).toHaveBeenCalled();
    });
  });

  describe('checkDomain', () => {
    beforeEach(() => {
      bg.scamDomains.set('bad.com', 'Reason 1');
      bg.scamDomains.set('evil.org', 'Reason 2');
    });

    test('should detect exact match', () => {
      const result = bg.checkDomain('bad.com');
      expect(result.isScam).toBe(true);
      expect(result.reason).toBe('Reason 1');
    });

    test('should detect subdomain match', () => {
      const result = bg.checkDomain('sub.evil.org');
      expect(result.isScam).toBe(true);
      expect(result.matchedDomain).toBe('evil.org');
    });

    test('should not detect safe domain', () => {
      const result = bg.checkDomain('good.com');
      expect(result.isScam).toBe(false);
    });
  });
});
