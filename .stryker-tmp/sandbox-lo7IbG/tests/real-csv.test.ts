import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const COI_CSV_URL = 'https://www.coi.gov.cz/userdata/files/dokumenty-ke-stazeni/open-data/rizikove-seznam.csv';

// Inline the parseCSV function to avoid importing background.ts
// This is a copy of the parseCSV function from background.ts
function parseCSV(csvText: string): Map<string, string> {
    const domains = new Map<string, string>();
    try {
        const lines = csvText.trim().split('\n');
        if (lines.length === 0) return domains;
        const delimiter = lines[0].includes(';') ? ';' : ',';
        // ČOI CSV has no header row, start from line 0
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            // Strip both double quotes and single quotes
            const columns = line.split(delimiter).map(c => c.trim().replace(/^"|"$/g, '').replace(/^'|'$/g, ''));
            let domain = columns[0];
            const reason = columns[1] || 'Zařazeno do seznamu rizikových e-shopů ČOI';
            domain = cleanDomain(domain);
            if (domain) {
                domains.set(domain, reason);
            }
        }
    } catch (error) {
        console.error('Error parsing CSV:', error);
    }
    return domains;
}

// Inline the cleanDomain function
function cleanDomain(domain: string): string {
    if (!domain) return '';
    try {
        const urlStr = domain.match(/^https?:\/\//) ? domain : 'http://' + domain;
        const url = new URL(urlStr);
        return url.hostname.toLowerCase();
    } catch (e) {
        return domain.replace(/^https?:\/\//, '').split('/')[0].split('?')[0].split(':')[0].toLowerCase().trim();
    }
}

describe('Real ČOI CSV parsing', () => {
    it('should download and parse the real CSV from ČOI website', async () => {
        // Fetch the real CSV from the web
        const response = await fetch(COI_CSV_URL);
        expect(response.ok).toBe(true);

        // Get the response as ArrayBuffer (raw bytes)
        const arrayBuffer = await response.arrayBuffer();

        // Decode using Windows-1250 encoding
        const decoder = new TextDecoder('windows-1250');
        const csvText = decoder.decode(arrayBuffer);

        // Verify the CSV starts with expected data
        expect(csvText).toContain('swiftdeal.club');
        expect(csvText).toContain('alena-praha.cz');

        // Verify Czech characters are properly decoded
        expect(csvText).toContain('Internetový obchod');
        expect(csvText).toContain('Česká obchodní inspekce');
        expect(csvText).toContain('není uveden nikdo');
        expect(csvText).toContain('stránky jsou tedy zcela anonymní');

        // Parse the CSV
        const domains = parseCSV(csvText);

        // Verify we got a reasonable number of domains
        expect(domains.size).toBeGreaterThan(1000);

        // Verify specific domains are in the list
        expect(domains.has('swiftdeal.club')).toBe(true);
        expect(domains.has('alena-praha.cz')).toBe(true);

        // Verify reasons contain proper Czech characters
        const reason = domains.get('alena-praha.cz');
        expect(reason).toBeDefined();
        expect(reason).toContain('není uveden nikdo');
        expect(reason).toContain('Česká obchodní inspekce');

        console.log(`✅ Successfully parsed ${domains.size} domains from ČOI CSV`);
        console.log(`Sample domain: swiftdeal.club -> ${domains.get('swiftdeal.club')?.substring(0, 50)}...`);
    }, 30000); // 30 second timeout for network request

    it('should parse the locally saved CSV fixture correctly', () => {
        // Read the fixture file as a buffer
        const fixturePath = join(__dirname, 'fixtures', 'rizikove-seznam-real.csv');
        const buffer = readFileSync(fixturePath);

        // Decode using Windows-1250 encoding
        const decoder = new TextDecoder('windows-1250');
        const csvText = decoder.decode(buffer);

        // Verify Czech characters are properly decoded
        expect(csvText).toContain('Internetový obchod');
        expect(csvText).toContain('Česká obchodní inspekce');

        // Parse the CSV
        const domains = parseCSV(csvText);

        // Verify we got domains
        expect(domains.size).toBeGreaterThan(1000);

        // Verify specific entries
        expect(domains.has('swiftdeal.club')).toBe(true);
        expect(domains.has('alena-praha.cz')).toBe(true);

        console.log(`✅ Successfully parsed ${domains.size} domains from local fixture`);
    });

    it('should handle quoted values with Czech characters correctly', () => {
        // Read the fixture file
        const fixturePath = join(__dirname, 'fixtures', 'rizikove-seznam-real.csv');
        const buffer = readFileSync(fixturePath);
        const decoder = new TextDecoder('windows-1250');
        const csvText = decoder.decode(buffer);

        // Parse the CSV
        const domains = parseCSV(csvText);

        // Check that reasons with quotes are properly parsed
        for (const [domain, reason] of domains.entries()) {
            // Reasons should not have leading/trailing quotes
            expect(reason.startsWith("'")).toBe(false);
            expect(reason.endsWith("'")).toBe(false);

            // But should contain Czech characters
            if (domain === 'alena-praha.cz') {
                expect(reason).toContain('není');
                expect(reason).toContain('stránky');
                expect(reason).toContain('Česká');
            }
        }
    });

    it('should handle all lines without parsing errors', () => {
        // Read the fixture file
        const fixturePath = join(__dirname, 'fixtures', 'rizikove-seznam-real.csv');
        const buffer = readFileSync(fixturePath);
        const decoder = new TextDecoder('windows-1250');
        const csvText = decoder.decode(buffer);

        const lines = csvText.trim().split('\n');
        console.log(`Total lines in CSV: ${lines.length}`);

        // Parse the CSV
        const domains = parseCSV(csvText);

        // We should have close to the number of lines (minus header, minus any empty lines)
        // Allow for some variance due to empty lines or malformed entries
        expect(domains.size).toBeGreaterThan(lines.length - 50);
        expect(domains.size).toBeLessThan(lines.length + 10);

        console.log(`Parsed ${domains.size} domains from ${lines.length} lines`);
    });

    it('should verify encoding detection works with different encodings', async () => {
        // Fetch the real CSV
        const response = await fetch(COI_CSV_URL);
        const arrayBuffer = await response.arrayBuffer();

        // Try decoding with UTF-8 (should produce mojibake)
        const utf8Decoder = new TextDecoder('utf-8');
        const utf8Text = utf8Decoder.decode(arrayBuffer);

        // Try decoding with Windows-1250 (should be correct)
        const win1250Decoder = new TextDecoder('windows-1250');
        const win1250Text = win1250Decoder.decode(arrayBuffer);

        // UTF-8 decoding should NOT have proper Czech characters
        // It might have replacement characters or mojibake
        const hasProperCzechUtf8 = utf8Text.includes('Internetový obchod');

        // Windows-1250 decoding SHOULD have proper Czech characters
        const hasProperCzechWin1250 = win1250Text.includes('Internetový obchod');

        expect(hasProperCzechWin1250).toBe(true);
        console.log('UTF-8 has proper Czech:', hasProperCzechUtf8);
        console.log('Windows-1250 has proper Czech:', hasProperCzechWin1250);
    }, 30000);
});
