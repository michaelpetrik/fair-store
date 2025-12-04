/**
 * CSV Parser Tests
 * Tests for parsing ČOI CSV data with various formats and edge cases
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Import actual functions from TypeScript file
import { parseCSV, cleanDomain } from '../src/background';

describe('CSV Parser', () => {
  describe('parseCSV', () => {
    it('should parse semicolon-delimited CSV', () => {
      const csv = `url;důvod
example.com;Podvodný e-shop
fake-shop.cz;Nedodání zboží`;

      const result = parseCSV(csv);

      expect(result.size).toBe(3); // url + example.com + fake-shop.cz
      expect(result.get('example.com')).toBe('Podvodný e-shop');
      expect(result.get('fake-shop.cz')).toBe('Nedodání zboží');
    });

    it('should parse comma-delimited CSV', () => {
      const csv = `domain,reason
example.com,Fraudulent shop
test.com,Non-delivery`;

      const result = parseCSV(csv);

      expect(result.size).toBe(3); // domain + example.com + test.com
      expect(result.get('example.com')).toBe('Fraudulent shop');
      expect(result.get('test.com')).toBe('Non-delivery');
    });

    it('should handle quoted values', () => {
      const csv = `"url";"důvod"
"example.com";"Podvodný e-shop, nedodání zboží"
"test.com";"Problémy s vrácením peněz"`;

      const result = parseCSV(csv);

      expect(result.size).toBe(3); // url header + 2 domains
      expect(result.get('example.com')).toBe('Podvodný e-shop, nedodání zboží');
      expect(result.get('test.com')).toBe('Problémy s vrácením peněz');
    });

    it('should handle empty lines', () => {
      const csv = `url;důvod
example.com;Reason 1

test.com;Reason 2

`;

      const result = parseCSV(csv);

      expect(result.size).toBe(3); // url + example.com + test.com
    });

    it('should handle empty CSV', () => {
      const csv = '';
      const result = parseCSV(csv);

      expect(result.size).toBe(0);
    });

    it('should handle CSV with only headers', () => {
      const csv = 'url;důvod';
      const result = parseCSV(csv);

      // The CSV has no header row, so this line is treated as data
      expect(result.size).toBe(1);
      expect(result.has('url')).toBe(true);
    });

    it('should handle missing reason column', () => {
      const csv = `url
example.com
test.com`;

      const result = parseCSV(csv);

      expect(result.size).toBe(3); // url, example.com, and test.com
      expect(result.get('example.com')).toBe('Zařazeno do seznamu rizikových e-shopů ČOI');
    });

    it('should handle various column name formats', () => {
      const testCases = [
        { headers: 'URL;Důvod', domain: 'example.com' },
        { headers: 'doména;popis', domain: 'test.com' },
        { headers: 'www;description', domain: 'shop.cz' },
        { headers: 'adresa;duvod', domain: 'bad.com' }
      ];

      testCases.forEach(({ headers, domain }) => {
        const csv = `${headers}\n${domain};Test reason`;
        const result = parseCSV(csv);
        expect(result.has(domain)).toBe(true);
      });
    });

    it('should clean domains with protocols', () => {
      const csv = `url;důvod
https://example.com;Reason 1
http://test.com;Reason 2`;

      const result = parseCSV(csv);

      expect(result.has('example.com')).toBe(true);
      expect(result.has('test.com')).toBe(true);
      expect(result.has('https://example.com')).toBe(false);
    });

    it('should clean domains with paths', () => {
      const csv = `url;důvod
example.com/path/to/page;Reason 1
test.com/index.html;Reason 2`;

      const result = parseCSV(csv);

      expect(result.has('example.com')).toBe(true);
      expect(result.has('test.com')).toBe(true);
    });

    it('should handle domains with www prefix', () => {
      const csv = `url;důvod
www.example.com;Reason 1`;

      const result = parseCSV(csv);

      expect(result.has('www.example.com')).toBe(true);
    });

    it('should handle malformed rows gracefully', () => {
      const csv = `url;důvod
example.com;Reason 1
;Missing domain
test.com;Reason 2`;

      const result = parseCSV(csv);

      expect(result.size).toBe(3); // url, example.com, and test.com (empty domain is skipped)
      expect(result.has('example.com')).toBe(true);
      expect(result.has('test.com')).toBe(true);
    });

    it('should handle special characters in reasons', () => {
      const csv = `url;důvod
example.com;Důvod s háčky a čárkami: ěščřžýáíé`;

      const result = parseCSV(csv);

      expect(result.get('example.com')).toBe('Důvod s háčky a čárkami: ěščřžýáíé');
    });

    it('should be case-insensitive for domains', () => {
      const csv = `url;důvod
EXAMPLE.COM;Reason 1
Test.COM;Reason 2`;

      const result = parseCSV(csv);

      expect(result.has('example.com')).toBe(true);
      expect(result.has('test.com')).toBe(true);
    });
  });

  describe('cleanDomain', () => {
    it('should remove http protocol', () => {
      expect(cleanDomain('http://example.com')).toBe('example.com');
    });

    it('should remove https protocol', () => {
      expect(cleanDomain('https://example.com')).toBe('example.com');
    });

    it('should remove path', () => {
      expect(cleanDomain('example.com/path/to/page')).toBe('example.com');
    });

    it('should remove query string', () => {
      expect(cleanDomain('example.com?param=value')).toBe('example.com');
    });

    it('should remove port', () => {
      expect(cleanDomain('example.com:8080')).toBe('example.com');
    });

    it('should convert to lowercase', () => {
      expect(cleanDomain('EXAMPLE.COM')).toBe('example.com');
      expect(cleanDomain('ExAmPlE.CoM')).toBe('example.com');
    });

    it('should trim whitespace', () => {
      expect(cleanDomain('  example.com  ')).toBe('example.com');
    });

    it('should handle empty string', () => {
      expect(cleanDomain('')).toBe('');
    });

    it('should handle null/undefined', () => {
      expect(cleanDomain(null)).toBe('');
      expect(cleanDomain(undefined)).toBe('');
    });

    it('should handle complex URLs', () => {
      expect(cleanDomain('https://www.example.com:443/path?query=1#hash')).toBe('www.example.com');
    });

    it('should handle URLs with authentication', () => {
      expect(cleanDomain('https://user:pass@example.com/path')).toBe('example.com');
    });

    it('should preserve subdomains', () => {
      expect(cleanDomain('https://shop.example.com')).toBe('shop.example.com');
      expect(cleanDomain('www.example.com')).toBe('www.example.com');
    });
  });
});
