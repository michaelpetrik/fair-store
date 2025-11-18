/**
 * CSV Parser Tests
 * Tests for parsing ČOI CSV data with various formats and edge cases
 */

// Mock functions from background.js
function parseCSV(csvText) {
  const domains = new Map();

  try {
    const lines = csvText.trim().split('\n');

    if (lines.length === 0) {
      console.warn('CSV file is empty');
      return domains;
    }

    const delimiter = lines[0].includes(';') ? ';' : ',';
    const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));

    let domainIndex = -1;
    let reasonIndex = -1;

    const domainNames = ['url', 'domain', 'doména', 'adresa', 'www'];
    const reasonNames = ['reason', 'důvod', 'duvod', 'popis', 'description'];

    headers.forEach((header, index) => {
      const lowerHeader = header.toLowerCase();
      if (domainNames.some(name => lowerHeader.includes(name))) {
        domainIndex = index;
      }
      if (reasonNames.some(name => lowerHeader.includes(name))) {
        reasonIndex = index;
      }
    });

    if (domainIndex === -1) domainIndex = 0;
    if (reasonIndex === -1 && headers.length > 1) reasonIndex = 1;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const columns = line.split(delimiter).map(c => c.trim().replace(/^"|"$/g, ''));

      if (columns.length > domainIndex) {
        let domain = columns[domainIndex];
        const reason = reasonIndex >= 0 && columns.length > reasonIndex
          ? columns[reasonIndex]
          : 'Zařazeno do seznamu rizikových e-shopů ČOI';

        domain = cleanDomain(domain);

        if (domain) {
          domains.set(domain, reason);
        }
      }
    }
  } catch (error) {
    console.error('Error parsing CSV:', error);
  }

  return domains;
}

function cleanDomain(domain) {
  if (!domain) return '';

  domain = domain.replace(/^https?:\/\//, '');
  domain = domain.split('/')[0];
  domain = domain.split('?')[0];
  domain = domain.split(':')[0];
  domain = domain.toLowerCase().trim();

  return domain;
}

describe('CSV Parser', () => {
  describe('parseCSV', () => {
    test('should parse semicolon-delimited CSV', () => {
      const csv = `url;důvod
example.com;Podvodný e-shop
fake-shop.cz;Nedodání zboží`;

      const result = parseCSV(csv);

      expect(result.size).toBe(2);
      expect(result.get('example.com')).toBe('Podvodný e-shop');
      expect(result.get('fake-shop.cz')).toBe('Nedodání zboží');
    });

    test('should parse comma-delimited CSV', () => {
      const csv = `domain,reason
example.com,Fraudulent shop
test.com,Non-delivery`;

      const result = parseCSV(csv);

      expect(result.size).toBe(2);
      expect(result.get('example.com')).toBe('Fraudulent shop');
      expect(result.get('test.com')).toBe('Non-delivery');
    });

    test('should handle quoted values', () => {
      const csv = `"url";"důvod"
"example.com";"Podvodný e-shop, nedodání zboží"
"test.com";"Problémy s vrácením peněz"`;

      const result = parseCSV(csv);

      expect(result.size).toBe(2);
      expect(result.get('example.com')).toBe('Podvodný e-shop, nedodání zboží');
      expect(result.get('test.com')).toBe('Problémy s vrácením peněz');
    });

    test('should handle empty lines', () => {
      const csv = `url;důvod
example.com;Reason 1

test.com;Reason 2

`;

      const result = parseCSV(csv);

      expect(result.size).toBe(2);
    });

    test('should handle empty CSV', () => {
      const csv = '';
      const result = parseCSV(csv);

      expect(result.size).toBe(0);
    });

    test('should handle CSV with only headers', () => {
      const csv = 'url;důvod';
      const result = parseCSV(csv);

      expect(result.size).toBe(0);
    });

    test('should handle missing reason column', () => {
      const csv = `url
example.com
test.com`;

      const result = parseCSV(csv);

      expect(result.size).toBe(2);
      expect(result.get('example.com')).toBe('Zařazeno do seznamu rizikových e-shopů ČOI');
    });

    test('should handle various column name formats', () => {
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

    test('should clean domains with protocols', () => {
      const csv = `url;důvod
https://example.com;Reason 1
http://test.com;Reason 2`;

      const result = parseCSV(csv);

      expect(result.has('example.com')).toBe(true);
      expect(result.has('test.com')).toBe(true);
      expect(result.has('https://example.com')).toBe(false);
    });

    test('should clean domains with paths', () => {
      const csv = `url;důvod
example.com/path/to/page;Reason 1
test.com/index.html;Reason 2`;

      const result = parseCSV(csv);

      expect(result.has('example.com')).toBe(true);
      expect(result.has('test.com')).toBe(true);
    });

    test('should handle domains with www prefix', () => {
      const csv = `url;důvod
www.example.com;Reason 1`;

      const result = parseCSV(csv);

      expect(result.has('www.example.com')).toBe(true);
    });

    test('should handle malformed rows gracefully', () => {
      const csv = `url;důvod
example.com;Reason 1
;Missing domain
test.com;Reason 2`;

      const result = parseCSV(csv);

      expect(result.size).toBe(2);
      expect(result.has('example.com')).toBe(true);
      expect(result.has('test.com')).toBe(true);
    });

    test('should handle special characters in reasons', () => {
      const csv = `url;důvod
example.com;Důvod s háčky a čárkami: ěščřžýáíé`;

      const result = parseCSV(csv);

      expect(result.get('example.com')).toBe('Důvod s háčky a čárkami: ěščřžýáíé');
    });

    test('should be case-insensitive for domains', () => {
      const csv = `url;důvod
EXAMPLE.COM;Reason 1
Test.COM;Reason 2`;

      const result = parseCSV(csv);

      expect(result.has('example.com')).toBe(true);
      expect(result.has('test.com')).toBe(true);
    });
  });

  describe('cleanDomain', () => {
    test('should remove http protocol', () => {
      expect(cleanDomain('http://example.com')).toBe('example.com');
    });

    test('should remove https protocol', () => {
      expect(cleanDomain('https://example.com')).toBe('example.com');
    });

    test('should remove path', () => {
      expect(cleanDomain('example.com/path/to/page')).toBe('example.com');
    });

    test('should remove query string', () => {
      expect(cleanDomain('example.com?param=value')).toBe('example.com');
    });

    test('should remove port', () => {
      expect(cleanDomain('example.com:8080')).toBe('example.com');
    });

    test('should convert to lowercase', () => {
      expect(cleanDomain('EXAMPLE.COM')).toBe('example.com');
      expect(cleanDomain('ExAmPlE.CoM')).toBe('example.com');
    });

    test('should trim whitespace', () => {
      expect(cleanDomain('  example.com  ')).toBe('example.com');
    });

    test('should handle empty string', () => {
      expect(cleanDomain('')).toBe('');
    });

    test('should handle null/undefined', () => {
      expect(cleanDomain(null)).toBe('');
      expect(cleanDomain(undefined)).toBe('');
    });

    test('should handle complex URLs', () => {
      expect(cleanDomain('https://www.example.com:443/path?query=1#hash')).toBe('www.example.com');
    });

    test('should handle URLs with authentication', () => {
      expect(cleanDomain('https://user:pass@example.com/path')).toBe('user:pass@example.com');
    });

    test('should preserve subdomains', () => {
      expect(cleanDomain('https://shop.example.com')).toBe('shop.example.com');
      expect(cleanDomain('www.example.com')).toBe('www.example.com');
    });
  });
});
