/**
 * CSV Parser Tests for specific 'hostname;'reason'' format
 * This test file is for validating the fix for the CSV parsing issue.
 */

import { describe, it, expect } from 'vitest';
import { parseCSV, cleanDomain } from '../src/background';

describe('parseCSV with specific format', () => {
  it('should parse "hostname;\'reason\'" format without headers', () => {
    const csv = `vintedworld.store;'Jako provozovatel webu není uveden nikdo, stránky jsou tedy zcela anonymní a spotřebitel neví, s kým uzavírá kupní smlouvu a vůči komu může nárokovat svá práva. Před nákupem na těchto stránkách Česká obchodní inspekce varuje.'
another-scam.com;'This is another scam site.'`;

    const result = parseCSV(csv);

    expect(result.size).toBe(2);
    expect(result.has('vintedworld.store')).toBe(true);
    expect(result.get('vintedworld.store')).toBe("Jako provozovatel webu není uveden nikdo, stránky jsou tedy zcela anonymní a spotřebitel neví, s kým uzavírá kupní smlouvu a vůči komu může nárokovat svá práva. Před nákupem na těchto stránkách Česká obchodní inspekce varuje.");
    expect(result.has('another-scam.com')).toBe(true);
    expect(result.get('another-scam.com')).toBe("This is another scam site.");
  });

  it('should handle single line CSV without headers', () => {
    const csv = `single-scam.net;'Just one scam.'`;
    const result = parseCSV(csv);

    expect(result.size).toBe(1);
    expect(result.has('single-scam.net')).toBe(true);
    expect(result.get('single-scam.net')).toBe("Just one scam.");
  });

  it('should handle empty reason gracefully', () => {
    const csv = `no-reason.org;''`;
    const result = parseCSV(csv);

    expect(result.size).toBe(1);
    expect(result.has('no-reason.org')).toBe(true);
    // Empty reason gets default message
    expect(result.get('no-reason.org')).toBe('Zařazeno do seznamu rizikových e-shopů ČOI');
  });

  it('should clean domain from the parsed hostname', () => {
    const csv = `https://www.scam-with-www.co.uk;'Reason.'`;
    const result = parseCSV(csv);

    expect(result.size).toBe(1);
    // cleanDomain preserves www. subdomain but removes protocol
    expect(result.has('www.scam-with-www.co.uk')).toBe(true);
    expect(result.get('www.scam-with-www.co.uk')).toBe("Reason.");
  });

  it('should handle lines with only domain and no reason (uses default reason)', () => {
    const csv = `domain-only.info;`; // Intentionally left reason empty to test default
    const result = parseCSV(csv);

    expect(result.size).toBe(1);
    expect(result.has('domain-only.info')).toBe(true);
    // The current parseCSV function assigns a default reason if column is empty
    expect(result.get('domain-only.info')).toBe('Zařazeno do seznamu rizikových e-shopů ČOI');
  });
});

// Re-using cleanDomain tests from original for sanity check, as it's a dependency
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

  // Note: The original cleanDomain handles null/undefined internally, so providing them as arguments
  // directly might require a slight adjustment to the test or function signature if TypeScript is strict.
  // For JS context, these usually coerce to '', which cleanDomain handles.
  it('should handle null/undefined (coerced to string)', () => {
    expect(cleanDomain(null as any)).toBe(''); // Use 'as any' to bypass TypeScript strictness for testing
    expect(cleanDomain(undefined as any)).toBe('');
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
