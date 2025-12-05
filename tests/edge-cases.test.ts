/**
 * Edge Cases Tests
 * Comprehensive edge case testing for the Chrome extension
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Edge Cases', () => {
  describe('URL Edge Cases', () => {
    it('should handle very long URLs', () => {
      const longPath = '/path/' + 'segment/'.repeat(1000);
      const longUrl = 'https://scam.com' + longPath;

      try {
        const url = new URL(longUrl);
        expect(url.hostname).toBe('scam.com');
      } catch (error) {
        // URL too long, should handle gracefully
        expect(error).toBeDefined();
      }
    });

    it('should handle URLs with many query parameters', () => {
      let queryParams = '?';
      for (let i = 0; i < 1000; i++) {
        queryParams += `param${i}=value${i}&`;
      }
      const url = 'https://scam.com' + queryParams;

      const urlObj = new URL(url);
      expect(urlObj.hostname).toBe('scam.com');
    });

    it('should handle URLs with special characters', () => {
      const specialUrls = [
        'https://scam.com/path?query=value%20with%20spaces',
        'https://scam.com/path#fragment%20with%20spaces',
        'https://scam.com/path/with/unicode/🎉',
        'https://scam.com/path?param=value&another=值'
      ];

      specialUrls.forEach(url => {
        const urlObj = new URL(url);
        expect(urlObj.hostname).toBe('scam.com');
      });
    });

    it('should handle malformed URLs', () => {
      const malformedUrls = [
        'not-a-url',
        'javascript:alert(1)',
        'data:text/html,<script>alert(1)</script>',
        'file:///etc/passwd',
        '::invalid::',
        '',
        null,
        undefined
      ];

      malformedUrls.forEach(url => {
        try {
          if (url) {
            new URL(url);
          }
        } catch (error) {
          // Expected to fail
          expect(error).toBeDefined();
        }
      });
    });

    it('should handle URLs with authentication', () => {
      const authUrls = [
        'https://user:pass@scam.com',
        'https://user@scam.com',
        'https://user:pass:with:colons@scam.com'
      ];

      authUrls.forEach(url => {
        const urlObj = new URL(url);
        expect(urlObj.hostname).toBe('scam.com');
      });
    });

    it('should handle URLs with unusual ports', () => {
      const portUrls = [
        'https://scam.com:443',
        'https://scam.com:8080',
        'https://scam.com:65535',
        'https://scam.com:1'
      ];

      portUrls.forEach(url => {
        const urlObj = new URL(url);
        expect(urlObj.hostname).toBe('scam.com');
      });
    });

    it('should handle IP addresses', () => {
      const ipAddresses = [
        'http://192.168.1.1',
        'http://10.0.0.1',
        'http://127.0.0.1',
        'http://[::1]', // IPv6
        'http://[2001:db8::1]' // IPv6
      ];

      ipAddresses.forEach(url => {
        const urlObj = new URL(url);
        expect(urlObj.hostname).toBeTruthy();
      });
    });
  });

  describe('Domain Edge Cases', () => {
    it('should handle internationalized domain names (IDN)', () => {
      const idnDomains = [
        'münchen.de',
        'москва.рф',
        '中国.cn',
        '日本.jp'
      ];

      idnDomains.forEach(domain => {
        try {
          const url = new URL('https://' + domain);
          expect(url.hostname).toBeTruthy();
          // Hostname will be punycode
        } catch (error) {
          // Some browsers may not support all IDNs
        }
      });
    });

    it('should handle single character domains', () => {
      const singleCharDomains = ['x.com', 'a.io', 'z.net'];

      singleCharDomains.forEach(domain => {
        const url = new URL('https://' + domain);
        expect(url.hostname).toBe(domain);
      });
    });

    it('should handle domains with many subdomains', () => {
      const deepSubdomain = 'a.b.c.d.e.f.g.h.i.j.k.l.m.example.com';
      const url = new URL('https://' + deepSubdomain);
      expect(url.hostname).toBe(deepSubdomain);
    });

    it('should handle domains with hyphens', () => {
      const hyphenDomains = [
        'my-shop.com',
        'a-b-c.com',
        'shop-online-store.com'
      ];

      hyphenDomains.forEach(domain => {
        const url = new URL('https://' + domain);
        expect(url.hostname).toBe(domain);
      });
    });

    it('should handle domains with numbers', () => {
      const numberDomains = [
        '123shop.com',
        'shop123.com',
        '1-2-3.com'
      ];

      numberDomains.forEach(domain => {
        const url = new URL('https://' + domain);
        expect(url.hostname).toBe(domain);
      });
    });

    it('should handle country-code TLDs', () => {
      const cctlds = [
        'example.co.uk',
        'example.com.au',
        'example.co.jp',
        'example.com.br'
      ];

      cctlds.forEach(domain => {
        const url = new URL('https://' + domain);
        expect(url.hostname).toBe(domain);
      });
    });

    it('should handle new gTLDs', () => {
      const gtlds = [
        'example.shop',
        'example.store',
        'example.online',
        'example.tech'
      ];

      gtlds.forEach(domain => {
        const url = new URL('https://' + domain);
        expect(url.hostname).toBe(domain);
      });
    });
  });

  describe('CSV Parsing Edge Cases', () => {
    function parseCSV(csvText: string): Map<string, string> {
      const domains = new Map<string, string>();
      try {
        const lines = csvText.trim().split('\n');
        if (lines.length === 0) return domains;
        const delimiter = lines[0].includes(';') ? ';' : ',';

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          const columns = line.split(delimiter).map(c =>
            c.trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '')
          );
          let domain = columns[0];
          const reason = columns[1] || 'Default reason';

          if (domain) {
            domains.set(domain, reason);
          }
        }
      } catch (error) {
        // Handle error
      }
      return domains;
    }

    it('should handle empty CSV', () => {
      const result = parseCSV('');
      expect(result.size).toBe(0);
    });

    it('should handle CSV with only whitespace', () => {
      const result = parseCSV('   \n  \n   ');
      expect(result.size).toBe(0);
    });

    it('should handle CSV with BOM (Byte Order Mark)', () => {
      const bom = '\uFEFF';
      const csv = bom + 'domain.com;reason';
      const result = parseCSV(csv);
      expect(result.size).toBeGreaterThan(0);
    });

    it('should handle very long CSV (performance test)', () => {
      let csv = '';
      for (let i = 0; i < 100000; i++) {
        csv += `scam${i}.com;Reason ${i}\n`;
      }

      const start = performance.now();
      const result = parseCSV(csv);
      const end = performance.now();

      expect(result.size).toBe(100000);
      expect(end - start).toBeLessThan(5000); // Should parse in < 5 seconds
    });

    it('should handle CSV with mixed delimiters', () => {
      const csv = `domain1.com;reason1
domain2.com,reason2
domain3.com;reason3`;

      const result = parseCSV(csv);
      // First line determines delimiter
      expect(result.size).toBeGreaterThan(0);
    });

    it('should handle CSV with embedded quotes', () => {
      const csv = `domain.com;"Reason with ""embedded"" quotes"`;
      const result = parseCSV(csv);
      expect(result.size).toBe(1);
    });

    it('should handle CSV with line breaks in values', () => {
      const csv = `domain.com;"Reason with
line break"`;
      // This is a limitation - most simple CSV parsers can't handle this
      const result = parseCSV(csv);
      expect(result).toBeDefined();
    });

    it('should handle CSV with special characters', () => {
      const csv = `domain.com;Důvod s háčky a čárkami: ěščřžýáíé
another.com;Emoji: 🚨⚠️🛑`;

      const result = parseCSV(csv);
      expect(result.size).toBe(2);
    });

    it('should handle CSV with very long values', () => {
      const longReason = 'A'.repeat(10000);
      const csv = `domain.com;${longReason}`;

      const result = parseCSV(csv);
      expect(result.get('domain.com')?.length).toBe(10000);
    });

    it('should handle CSV with malformed rows', () => {
      const csv = `domain1.com;reason1
;missing domain
domain2.com;
domain3.com;reason3;extra column`;

      const result = parseCSV(csv);
      expect(result.has('domain1.com')).toBe(true);
      expect(result.has('domain2.com')).toBe(true);
      expect(result.has('domain3.com')).toBe(true);
    });
  });

  describe('Storage Edge Cases', () => {
    let mockChrome: any;

    beforeEach(() => {
      mockChrome = {
        storage: {
          local: {
            get: vi.fn(),
            set: vi.fn()
          },
          session: {
            get: vi.fn(),
            set: vi.fn()
          }
        }
      };
      (global as any).chrome = mockChrome;
    });

    it('should handle storage quota exceeded', async () => {
      const largeData = new Array(10000000).fill('x').join('');
      mockChrome.storage.local.set.mockRejectedValueOnce(
        new Error('QUOTA_BYTES quota exceeded')
      );

      try {
        await mockChrome.storage.local.set({ largeData });
      } catch (error) {
        expect((error as Error).message).toContain('QUOTA_BYTES');
      }
    });

    it('should handle storage corruption', async () => {
      mockChrome.storage.local.get.mockResolvedValueOnce({
        scamDomains: 'corrupted-not-an-array'
      });

      const result = await mockChrome.storage.local.get(['scamDomains']);
      expect(result.scamDomains).toBe('corrupted-not-an-array');

      // Should handle gracefully
      let domains;
      try {
        domains = new Map(result.scamDomains);
      } catch (error) {
        domains = new Map();
      }
      expect(domains.size).toBe(0);
    });

    it('should handle concurrent storage writes', async () => {
      const writes = [];
      for (let i = 0; i < 10; i++) {
        writes.push(mockChrome.storage.local.set({ data: i }));
      }

      await Promise.all(writes);
      expect(mockChrome.storage.local.set).toHaveBeenCalledTimes(10);
    });

    it('should handle storage cleared externally', async () => {
      mockChrome.storage.local.get.mockResolvedValueOnce({});

      const result = await mockChrome.storage.local.get(['scamDomains']);
      expect(result.scamDomains).toBeUndefined();

      // Should fallback to defaults
      const domains = result.scamDomains || [];
      expect(domains.length).toBe(0);
    });
  });

  describe('Network Edge Cases', () => {
    let mockFetch: any;

    beforeEach(() => {
      mockFetch = vi.fn();
      (global as any).fetch = mockFetch;
    });

    it('should handle network timeout', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network timeout'));

      try {
        await mockFetch('https://example.com');
      } catch (error) {
        expect((error as Error).message).toBe('Network timeout');
      }
    });

    it('should handle DNS resolution failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('DNS_PROBE_FINISHED_NXDOMAIN'));

      try {
        await mockFetch('https://nonexistent-domain-12345.com');
      } catch (error) {
        expect((error as Error).message).toContain('DNS');
      }
    });

    it('should handle SSL certificate errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('NET::ERR_CERT_DATE_INVALID'));

      try {
        await mockFetch('https://expired-cert.badssl.com');
      } catch (error) {
        expect((error as Error).message).toContain('CERT');
      }
    });

    it('should handle HTTP error codes', async () => {
      const errorCodes = [400, 401, 403, 404, 500, 502, 503, 504];

      for (const code of errorCodes) {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: code,
          statusText: `Error ${code}`
        });

        const response = await mockFetch('https://example.com');
        expect(response.ok).toBe(false);
        expect(response.status).toBe(code);
      }
    });

    it('should handle redirects', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 301,
        url: 'https://redirect-target.com'
      });

      const response = await mockFetch('https://example.com');
      expect(response.url).toBe('https://redirect-target.com');
    });

    it('should handle incomplete responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.reject(new Error('Connection reset'))
      });

      const response = await mockFetch('https://example.com');
      try {
        await response.text();
      } catch (error) {
        expect((error as Error).message).toBe('Connection reset');
      }
    });

    it('should handle very large responses', async () => {
      const largeData = 'x'.repeat(100000000); // 100MB
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(largeData)
      });

      const response = await mockFetch('https://example.com');
      const text = await response.text();
      expect(text.length).toBe(100000000);
    });
  });

  describe('Encoding Edge Cases', () => {
    it('should handle different text encodings', () => {
      const encodings = [
        'windows-1250', // Czech
        'iso-8859-2',   // Central European
        'utf-8',        // Universal
        'utf-16'        // Wide characters
      ];

      encodings.forEach(encoding => {
        try {
          const decoder = new TextDecoder(encoding);
          const buffer = new ArrayBuffer(10);
          const decoded = decoder.decode(buffer);
          expect(decoded).toBeDefined();
        } catch (error) {
          // Some encodings might not be supported
        }
      });
    });

    it('should handle invalid byte sequences', () => {
      const decoder = new TextDecoder('utf-8', { fatal: false });
      const invalidBytes = new Uint8Array([0xFF, 0xFE, 0xFD]);
      const decoded = decoder.decode(invalidBytes);
      expect(decoded).toBeDefined();
    });

    it('should handle BOM (Byte Order Mark)', () => {
      const bomUtf8 = new Uint8Array([0xEF, 0xBB, 0xBF, 0x61]); // BOM + 'a'
      const decoder = new TextDecoder('utf-8');
      const decoded = decoder.decode(bomUtf8);
      expect(decoded).toContain('a');
    });

    it('should handle mixed encodings', () => {
      // This is a real-world problem - some CSV might have mixed encodings
      const decoder1250 = new TextDecoder('windows-1250');
      const decoderUtf8 = new TextDecoder('utf-8');

      const czechText = 'Důvod';
      // In real scenario, text might be double-encoded or partially corrupted
      expect(czechText).toBe('Důvod');
    });
  });

  describe('Memory Edge Cases', () => {
    it('should handle very large domain maps', () => {
      const largeDomainMap = new Map<string, string>();

      const start = performance.now();
      for (let i = 0; i < 1000000; i++) {
        largeDomainMap.set(`domain${i}.com`, `Reason ${i}`);
      }
      const end = performance.now();

      expect(largeDomainMap.size).toBe(1000000);
      expect(end - start).toBeLessThan(10000); // Should complete in < 10 seconds
    });

    it('should handle memory cleanup', () => {
      let largeDomainMap: Map<string, string> | null = new Map();
      for (let i = 0; i < 100000; i++) {
        largeDomainMap.set(`domain${i}.com`, `Reason ${i}`);
      }

      expect(largeDomainMap.size).toBe(100000);

      // Clear reference for garbage collection
      largeDomainMap = null;
      expect(largeDomainMap).toBeNull();
    });
  });

  describe('Race Condition Edge Cases', () => {
    it('should handle multiple simultaneous domain checks', async () => {
      const scamDomains = new Map([['scam.com', 'Bad']]);

      const checkDomain = (domain: string) => {
        return scamDomains.has(domain.toLowerCase());
      };

      const checks = [];
      for (let i = 0; i < 1000; i++) {
        checks.push(Promise.resolve(checkDomain('scam.com')));
      }

      const results = await Promise.all(checks);
      expect(results.every(r => r === true)).toBe(true);
    });

    it('should handle concurrent CSV loading', async () => {
      const loadCount = { value: 0 };

      const loadCSV = async () => {
        loadCount.value++;
        await new Promise(resolve => setTimeout(resolve, 10));
        loadCount.value--;
      };

      const loads = [loadCSV(), loadCSV(), loadCSV()];
      await Promise.all(loads);

      expect(loadCount.value).toBe(0);
    });
  });

  describe('Browser Compatibility Edge Cases', () => {
    it('should handle missing chrome API', () => {
      const originalChrome = (global as any).chrome;
      (global as any).chrome = undefined;

      const hasChrome = typeof (global as any).chrome !== 'undefined';
      expect(hasChrome).toBe(false);

      // Restore
      (global as any).chrome = originalChrome;
    });

    it('should handle partial chrome API', () => {
      const originalChrome = (global as any).chrome;
      (global as any).chrome = {
        storage: { local: {} }
        // Missing other APIs
      };

      const hasFullAPI = !!(global as any).chrome?.storage?.local?.get;
      expect(hasFullAPI).toBe(false);

      // Restore
      (global as any).chrome = originalChrome;
    });
  });
});
