import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Define a variable to hold the actual listener functions
let onInstalledListener: Function | undefined;
let onUpdatedListener: Function | undefined;
let onMessageListener: Function | undefined;

// Mock chrome API for functions that interact with it
const chrome = {
    runtime: {
        onInstalled: {
            addListener: vi.fn((listener) => { onInstalledListener = listener; }),
        },
        onMessage: {
            addListener: vi.fn((listener) => { onMessageListener = listener; }),
        },
        sendMessage: vi.fn(), // Mock for runtime.sendMessage
    },
    tabs: {
        onUpdated: {
            addListener: vi.fn((listener) => { onUpdatedListener = listener; }),
        },
        sendMessage: vi.fn(),
        query: vi.fn(() => Promise.resolve([])), // Default mock for query
        remove: vi.fn(),
    },
    storage: {
        local: {
            set: vi.fn(() => Promise.resolve()),
            get: vi.fn(() => Promise.resolve({})),
        },
        session: {
            set: vi.fn(() => Promise.resolve()),
            get: vi.fn(() => Promise.resolve({ protectionEnabled: true })),
        },
    },
};

// Global mock for chrome
Object.defineProperty(globalThis, 'chrome', { value: chrome });

// Mock global fetch
const mockFetch = vi.fn();
Object.defineProperty(globalThis, 'fetch', { value: mockFetch });

// Create a spy for the original loadScamDomains
let originalLoadScamDomains: typeof import('../src/background')['loadScamDomains'];
const loadScamDomainsSpy = vi.fn();

vi.mock('../src/background', async (importOriginal) => {
    const originalModule = await importOriginal<typeof import('../src/background')>();
    originalLoadScamDomains = originalModule.loadScamDomains; // Store original
    return {
        ...originalModule,
        loadScamDomains: loadScamDomainsSpy, // Replace with spy
    };
});

// Import after vi.mock to ensure the mocked version is used
import { parseCSV, cleanDomain, extractDomain, checkDomain, scamDomains, updateAllTabsProtection } from '../src/background';

describe('background.ts', () => {
    beforeEach(async () => {
        vi.clearAllMocks();
        // Reset the listeners
        onInstalledListener = undefined;
        onUpdatedListener = undefined;
        onMessageListener = undefined;

        // Manually trigger the listener registration by re-importing the module,
        // but only after mocks are set up.
        // This is necessary because Chrome API listeners are typically added on module load.
        await import('../src/background'); // This re-executes the module code, registering listeners
    });

    // Helper to trigger the onUpdated listener
    const triggerOnUpdated = async (tabId: number, changeInfo: any, tab: any) => {
        if (onUpdatedListener) {
            await onUpdatedListener(tabId, changeInfo, tab);
        }
    };

    // Helper to trigger the onMessage listener
    const triggerOnMessage = async (message: any, sender: any, sendResponse: Function) => {
        if (onMessageListener) {
            await onMessageListener(message, sender, sendResponse);
        }
    };


    describe('parseCSV', () => {
        it('should parse a semicolon-delimited CSV correctly (no header)', () => {
            const csv = 'example.com;reason1\nanother.org;reason2';
            const result = parseCSV(csv);
            expect(result.size).toBe(2);
            expect(result.get('example.com')).toBe('reason1');
            expect(result.get('another.org')).toBe('reason2');
        });

        it('should parse a comma-delimited CSV correctly (no header)', () => {
            const csv = 'example.com,reason1\nanother.org,reason2';
            const result = parseCSV(csv);
            expect(result.size).toBe(2);
            expect(result.get('example.com')).toBe('reason1');
            expect(result.get('another.org')).toBe('reason2');
        });

        it('should handle quoted values with double quotes', () => {
            const csv = '"example.com";"reason with spaces"';
            const result = parseCSV(csv);
            expect(result.size).toBe(1);
            expect(result.get('example.com')).toBe('reason with spaces');
        });

        it('should handle quoted values with single quotes (ČOI format)', () => {
            const csv = "example.com;'reason with spaces'";
            const result = parseCSV(csv);
            expect(result.size).toBe(1);
            expect(result.get('example.com')).toBe('reason with spaces');
        });

        it('should handle empty lines and extra whitespace', () => {
            const csv = 'example.com;reason1\n   \n another.org ; reason2 ';
            const result = parseCSV(csv);
            expect(result.size).toBe(2);
            expect(result.get('example.com')).toBe('reason1');
            expect(result.get('another.org')).toBe('reason2');
        });

        it('should return an empty map for an empty CSV', () => {
            const csv = '';
            const result = parseCSV(csv);
            expect(result.size).toBe(0);
        });

        it('should use default reason if reason column is missing or empty', () => {
            const csv = 'example.com;\nanother.org';
            const result = parseCSV(csv);
            expect(result.size).toBe(2);
            expect(result.get('example.com')).toBe('Zařazeno do seznamu rizikových e-shopů ČOI');
            expect(result.get('another.org')).toBe('Zařazeno do seznamu rizikových e-shopů ČOI');
        });

        it('should handle malformed domains', () => {
            const csv = 'https://malformed.com/path?query=abc;malformed-reason';
            const result = parseCSV(csv);
            expect(result.size).toBe(1);
            expect(result.get('malformed.com')).toBe('malformed-reason');
        });
    });

    describe('cleanDomain', () => {
        it('should return empty string for null or undefined input', () => {
            expect(cleanDomain(null as any)).toBe('');
            expect(cleanDomain(undefined as any)).toBe('');
            expect(cleanDomain('')).toBe('');
        });

        it('should remove protocol and path for valid URLs', () => {
            expect(cleanDomain('https://www.example.com/path/to/page?query=123')).toBe('www.example.com');
            expect(cleanDomain('http://example.org:8080/another/path')).toBe('example.org');
        });

        it('should handle domains without protocol', () => {
            expect(cleanDomain('www.test-domain.co.uk')).toBe('www.test-domain.co.uk');
            expect(cleanDomain('sub.example.net')).toBe('sub.example.net');
        });

        it('should convert domain to lowercase', () => {
            expect(cleanDomain('WWW.Example.COM')).toBe('www.example.com');
        });

        it('should trim whitespace', () => {
            expect(cleanDomain('  example.com  ')).toBe('example.com');
        });

        it('should handle domains with query strings or hashes without protocol', () => {
            expect(cleanDomain('example.com/path?query=abc')).toBe('example.com');
            expect(cleanDomain('example.com#hash')).toBe('example.com');
        });

        it('should handle IP addresses', () => {
            expect(cleanDomain('192.168.1.1')).toBe('192.168.1.1');
            expect(cleanDomain('http://127.0.0.1:8000')).toBe('127.0.0.1');
        });

        it('should handle complex domains with multiple dots', () => {
            expect(cleanDomain('www.sub.domain.co.in')).toBe('www.sub.domain.co.in');
        });
    });

    describe('extractDomain', () => {
        it('should extract the hostname from a valid URL', () => {
            expect(extractDomain('https://www.example.com/path')).toBe('www.example.com');
            expect(extractDomain('http://sub.domain.org:8080')).toBe('sub.domain.org');
        });

        it('should convert the domain to lowercase', () => {
            expect(extractDomain('https://WWW.EXAMPLE.COM')).toBe('www.example.com');
        });

        it('should return an empty string for an invalid URL', () => {
            expect(extractDomain('invalid-url')).toBe('');
            expect(extractDomain('ftp://bad-url.com')).toBe('');
        });

        it('should handle chrome:// and chrome-extension:// URLs by returning their host', () => {
            expect(extractDomain('chrome://extensions')).toBe('extensions');
            expect(extractDomain('chrome-extension://abcdefghijklmnopqrstuvwxyz/index.html')).toBe('abcdefghijklmnopqrstuvwxyz');
        });
    });

    describe('checkDomain', () => {
        beforeEach(() => {
            // Reset scamDomains before each test
            scamDomains.clear();
        });

        it('should return isScam: false for a non-scam domain', () => {
            scamDomains.set('scam.com', 'bad');
            const result = checkDomain('safe.com');
            expect(result.isScam).toBe(false);
            expect(result.reason).toBeNull();
            expect(result.matchedDomain).toBeNull();
        });

        it('should return isScam: true for an exact scam domain match', () => {
            scamDomains.set('scam.com', 'bad');
            const result = checkDomain('scam.com');
            expect(result.isScam).toBe(true);
            expect(result.reason).toBe('bad');
            expect(result.matchedDomain).toBe('scam.com');
        });

        it('should return isScam: true for a subdomain of a scam domain', () => {
            scamDomains.set('scam.com', 'bad');
            const result = checkDomain('sub.scam.com');
            expect(result.isScam).toBe(true);
            expect(result.reason).toBe('bad');
            expect(result.matchedDomain).toBe('scam.com');
        });

        it('should return isScam: true for a deep subdomain of a scam domain', () => {
            scamDomains.set('scam.com', 'bad');
            const result = checkDomain('deep.sub.scam.com');
            expect(result.isScam).toBe(true);
            expect(result.reason).toBe('bad');
            expect(result.matchedDomain).toBe('scam.com');
        });

        it('should be case-insensitive for domain checking', () => {
            scamDomains.set('scam.com', 'bad');
            const result = checkDomain('SCAM.COM');
            expect(result.isScam).toBe(true);
            expect(result.reason).toBe('bad');
            expect(result.matchedDomain).toBe('scam.com');

            const resultSub = checkDomain('SUB.SCAM.COM');
            expect(resultSub.isScam).toBe(true);
            expect(resultSub.reason).toBe('bad');
            expect(resultSub.matchedDomain).toBe('scam.com');
        });

        it('should handle domains with different TLDs correctly', () => {
            scamDomains.set('example.co.uk', 'UK scam');
            const result = checkDomain('sub.example.co.uk');
            expect(result.isScam).toBe(true);
            expect(result.reason).toBe('UK scam');
            expect(result.matchedDomain).toBe('example.co.uk');
        });

        it('should not match partial domain names', () => {
            scamDomains.set('example.com', 'bad');
            const result = checkDomain('notexample.com');
            expect(result.isScam).toBe(false);
            expect(result.reason).toBeNull();
            expect(result.matchedDomain).toBeNull();
        });

        it('should handle empty scamDomains map', () => {
            const result = checkDomain('any.com');
            expect(result.isScam).toBe(false);
        });

        it('should handle empty input domain', () => {
            const result = checkDomain('');
            expect(result.isScam).toBe(false);
        });
    });

    describe('loadScamDomains', () => {
        const COI_CSV_URL = 'https://www.coi.gov.cz/userdata/files/dokumenty-ke-stazeni/open-data/rizikove-seznam.csv';
        // ČOI CSV has no header row
        const mockWebCsv = 'web.com;web reason';
        const mockLocalCsv = 'local.com;local reason';
        const mockScamDomainsFromWeb = new Map([['web.com', 'web reason']]);
        const mockScamDomainsFromWebArray = Array.from(mockScamDomainsFromWeb.entries());
        const mockScamDomainsFromLocal = new Map([['local.com', 'local reason']]);
        const mockScamDomainsFromLocalArray = Array.from(mockScamDomainsFromLocal.entries());

        // Helper to convert string to ArrayBuffer (simulating Windows-1250 encoding)
        const stringToArrayBuffer = (str: string): ArrayBuffer => {
            const encoder = new TextEncoder();
            return encoder.encode(str).buffer;
        };

        // Use a describe.each or similar to run these tests against the original function
        // Need to unmock loadScamDomains for this block
        const originalLoadScamDomains = vi.fn(); // Placeholder for the original function

        beforeEach(async () => {
            scamDomains.clear();
            mockFetch.mockReset(); // Reset fetch mock for each test
            // Temporarily replace the spy with the original implementation for this block
            loadScamDomainsSpy.mockImplementation(originalLoadScamDomains);
        });

        afterEach(() => {
            // Restore the spy after this block
            loadScamDomainsSpy.mockRestore();
        });

        it('should load scam domains from the web if successful', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                arrayBuffer: () => Promise.resolve(stringToArrayBuffer(mockWebCsv)),
            });

            await originalLoadScamDomains();

            expect(mockFetch).toHaveBeenCalledWith(COI_CSV_URL);
            expect(scamDomains.size).toBe(1);
            expect(scamDomains.get('web.com')).toBe('web reason');
            expect(chrome.storage.local.set).toHaveBeenCalledWith({
                scamDomains: mockScamDomainsFromWebArray,
                lastUpdate: expect.any(String),
            });
        });

        it('should load scam domains from cache if web fetch fails and cache exists', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Network error')); // Web fetch fails
            chrome.storage.local.get.mockResolvedValueOnce({
                scamDomains: mockScamDomainsFromWebArray,
                lastUpdate: '2023-01-01T00:00:00Z',
            });

            await originalLoadScamDomains();

            expect(mockFetch).toHaveBeenCalledTimes(1);
            expect(chrome.storage.local.get).toHaveBeenCalledWith(['scamDomains', 'lastUpdate']);
            expect(scamDomains.size).toBe(1);
            expect(scamDomains.get('web.com')).toBe('web reason');
            expect(chrome.storage.local.set).not.toHaveBeenCalled(); // Should not set if loaded from cache
        });

        it('should load scam domains from local fallback if web fetch and cache fail', async () => {
            mockFetch
                .mockRejectedValueOnce(new Error('Network error')) // Web fetch fails
                .mockResolvedValueOnce({ // Local fetch succeeds
                    ok: true,
                    arrayBuffer: () => Promise.resolve(stringToArrayBuffer(mockLocalCsv)),
                });
            chrome.storage.local.get.mockResolvedValueOnce({ scamDomains: [] }); // Cache empty

            await originalLoadScamDomains();

            expect(mockFetch).toHaveBeenCalledTimes(2); // First for web, second for local
            expect(scamDomains.size).toBe(1);
            expect(scamDomains.get('local.com')).toBe('local reason');
            expect(chrome.storage.local.set).toHaveBeenCalledWith({
                scamDomains: Array.from(new Map([['local.com', 'local reason']]).entries()),
                lastUpdate: expect.any(String),
            });
        });

        it('should log error if all data sources fail', async () => {
            mockFetch.mockRejectedValue(new Error('All failed')); // Both web and local fetch fail
            chrome.storage.local.get.mockResolvedValueOnce({ scamDomains: [] }); // Cache empty
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            await originalLoadScamDomains();

            expect(consoleErrorSpy).toHaveBeenCalledTimes(3); // Error for web, storage, local
            expect(consoleErrorSpy).toHaveBeenCalledWith('All data sources failed. The extension might not work correctly.');
            consoleErrorSpy.mockRestore();
        });
    });

    describe('isProtectionEnabled', () => {
        // isProtectionEnabled is now exported, so we can import it directly
        // from the mocked background module if we need to
        it('should return true if protectionEnabled is true in session storage', async () => {
            chrome.storage.session.get.mockResolvedValueOnce({ protectionEnabled: true });
            const result = await (await import('../src/background')).isProtectionEnabled();
            expect(result).toBe(true);
            expect(chrome.storage.session.get).toHaveBeenCalledWith(['protectionEnabled']);
        });

        it('should return false if protectionEnabled is false in session storage', async () => {
            chrome.storage.session.get.mockResolvedValueOnce({ protectionEnabled: false });
            const result = await (await import('../src/background')).isProtectionEnabled();
            expect(result).toBe(false);
        });

        it('should return true by default if protectionEnabled is not set', async () => {
            chrome.storage.session.get.mockResolvedValueOnce({});
            const result = await (await import('../src/background')).isProtectionEnabled();
            expect(result).toBe(true);
        });

        it('should return true in case of storage error', async () => {
            chrome.storage.session.get.mockRejectedValueOnce(new Error('Storage error'));
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            const result = await (await import('../src/background')).isProtectionEnabled();
            expect(result).toBe(true);
            expect(consoleErrorSpy).toHaveBeenCalledWith('Chyba při kontrole stavu ochrany:', expect.any(Error));
            consoleErrorSpy.mockRestore();
        });
    });

    describe('chrome.runtime.onInstalled listener', () => {
        it('should set protectionEnabled to true and call loadScamDomains on installation', async () => {
            loadScamDomainsSpy.mockResolvedValue(undefined); // Mock the `loadScamDomains` that's used by the listener
            
            expect(onInstalledListener).toBeDefined();
            await onInstalledListener!();

            expect(chrome.storage.session.set).toHaveBeenCalledWith({ protectionEnabled: true });
            expect(loadScamDomainsSpy).toHaveBeenCalled();
        });
    });

    describe('chrome.tabs.onUpdated listener', () => {
        beforeEach(() => {
            scamDomains.clear();
            scamDomains.set('scam.com', 'Malicious');
            chrome.tabs.sendMessage.mockClear();
            chrome.storage.session.get.mockResolvedValue({ protectionEnabled: true }); // Assume protection is enabled by default
        });

        it('should send showWarning message if a scam domain is detected and protection is enabled', async () => {
            await triggerOnUpdated(1, { status: 'loading' }, { url: 'https://sub.scam.com/path', id: 1 });

            expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
                1,
                {
                    action: 'showWarning',
                    domain: 'sub.scam.com',
                    matchedDomain: 'scam.com',
                    reason: 'Malicious',
                    url: 'https://sub.scam.com/path'
                }
            );
        });

        it('should not send showWarning message if the domain is not a scam', async () => {
            await triggerOnUpdated(1, { status: 'loading' }, { url: 'https://safe.com', id: 1 });
            expect(chrome.tabs.sendMessage).not.toHaveBeenCalled();
        });

        it('should not send showWarning message if protection is disabled', async () => {
            chrome.storage.session.get.mockResolvedValue({ protectionEnabled: false });
            await triggerOnUpdated(1, { status: 'loading' }, { url: 'https://scam.com', id: 1 });
            expect(chrome.tabs.sendMessage).not.toHaveBeenCalled();
        });

        it('should not send showWarning message for chrome:// or chrome-extension:// URLs', async () => {
            await triggerOnUpdated(1, { status: 'loading' }, { url: 'chrome://extensions', id: 1 });
            await triggerOnUpdated(2, { status: 'loading' }, { url: 'chrome-extension://abcdefghijklmnopqrstuvwxyz/index.html', id: 2 });
            expect(chrome.tabs.sendMessage).not.toHaveBeenCalled();
        });

        it('should handle content script not ready gracefully', async () => {
            chrome.tabs.sendMessage.mockRejectedValueOnce(new Error('The message port closed before a response was received.')); // Simulate content script not ready
            const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

            await triggerOnUpdated(1, { status: 'loading' }, { url: 'https://scam.com', id: 1 });

            expect(chrome.tabs.sendMessage).toHaveBeenCalled();
            expect(consoleLogSpy).toHaveBeenCalledWith('Content script not ready, proactive check will handle it.');
            consoleLogSpy.mockRestore();
        });
    });

    describe('chrome.runtime.onMessage listener', () => {
        beforeEach(() => {
            scamDomains.clear();
            scamDomains.set('scam.com', 'Malicious');
            chrome.tabs.sendMessage.mockClear();
            chrome.storage.session.get.mockResolvedValue({ protectionEnabled: true });
        });

        it('should handle "checkDomain" message and send correct response', async () => {
            const sendResponse = vi.fn();
            await triggerOnMessage(
                { action: 'checkDomain', url: 'https://sub.scam.com/path' },
                {},
                sendResponse
            );

            expect(sendResponse).toHaveBeenCalledWith({
                isScam: true,
                domain: 'sub.scam.com',
                matchedDomain: 'scam.com',
                reason: 'Malicious',
                protectionEnabled: true,
            });
        });

        it('should handle "checkDomain" message for a safe domain', async () => {
            const sendResponse = vi.fn();
            await triggerOnMessage(
                { action: 'checkDomain', url: 'https://safe.com' },
                {},
                sendResponse
            );

            expect(sendResponse).toHaveBeenCalledWith({
                isScam: false,
                domain: 'safe.com',
                matchedDomain: null,
                reason: null,
                protectionEnabled: true,
            });
        });

        it('should handle "setProtection" message, update storage and all tabs', async () => {
            const sendResponse = vi.fn();
            
            await triggerOnMessage(
                { action: 'setProtection', enabled: false },
                {},
                sendResponse
            );

            expect(chrome.storage.session.set).toHaveBeenCalledWith({ protectionEnabled: false });
            expect(updateAllTabsProtection).toHaveBeenCalledWith(false); // Now directly importing updateAllTabsProtection
            expect(sendResponse).toHaveBeenCalledWith({ success: true });
            // console.log is mocked globally, so it should be called
            expect(console.log).toHaveBeenCalledWith('Ochrana vypnuta');
        });

        it('should handle "closeTab" message and remove the sender tab', async () => {
            const sendResponse = vi.fn();
            await triggerOnMessage(
                { action: 'closeTab' },
                { tab: { id: 99 } },
                sendResponse
            );

            expect(chrome.tabs.remove).toHaveBeenCalledWith(99);
            expect(sendResponse).toHaveBeenCalledWith({ success: true });
        });

        it('should return false for unknown actions', async () => {
            const sendResponse = vi.fn();
            const result = await triggerOnMessage(
                { action: 'unknownAction' },
                {},
                sendResponse
            );
            expect(result).toBe(false);
            expect(sendResponse).not.toHaveBeenCalled();
        });
    });

    describe('updateAllTabsProtection', () => {
        beforeEach(() => {
            scamDomains.clear();
            scamDomains.set('scam.com', 'Malicious');
            chrome.tabs.sendMessage.mockClear();
            chrome.tabs.query.mockClear();
        });

        it('should send "showWarning" to scam tabs when protection is enabled', async () => {
            chrome.tabs.query.mockResolvedValue([
                { id: 1, url: 'https://safe.com' },
                { id: 2, url: 'https://scam.com/path' },
                { id: 3, url: 'https://sub.scam.com' },
            ]);

            await updateAllTabsProtection(true);

            expect(chrome.tabs.sendMessage).toHaveBeenCalledTimes(2);
            expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
                2,
                {
                    action: 'showWarning',
                    domain: 'scam.com',
                    matchedDomain: 'scam.com',
                    reason: 'Malicious',
                    url: 'https://scam.com/path'
                }
            );
            expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
                3,
                {
                    action: 'showWarning',
                    domain: 'sub.scam.com',
                    matchedDomain: 'scam.com',
                    reason: 'Malicious',
                    url: 'https://sub.scam.com'
                }
            );
        });

        it('should send "hideWarning" to all tabs when protection is disabled', async () => {
            chrome.tabs.query.mockResolvedValue([
                { id: 1, url: 'https://safe.com' },
                { id: 2, url: 'https://scam.com/path' },
            ]);

            await updateAllTabsProtection(false);

            expect(chrome.tabs.sendMessage).toHaveBeenCalledTimes(2);
            expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(1, { action: 'hideWarning' });
            expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(2, { action: 'hideWarning' });
        });

        it('should handle errors when sending messages to tabs', async () => {
            chrome.tabs.query.mockResolvedValue([
                { id: 1, url: 'https://scam.com' },
                { id: 2, url: 'https://another-scam.com' }, // This one will cause an error
            ]);
            scamDomains.set('another-scam.com', 'Another Malicious');
            
            chrome.tabs.sendMessage
                .mockResolvedValueOnce(true) // First message succeeds
                .mockRejectedValueOnce(new Error('Could not establish connection. Receiving end does not exist.')); // Second message fails
            
            const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

            await updateAllTabsProtection(true);

            expect(chrome.tabs.sendMessage).toHaveBeenCalledTimes(2);
            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Could not update tab'));
            consoleLogSpy.mockRestore();
        });

        it('should not send message if tab.id or tab.url is missing', async () => {
            chrome.tabs.query.mockResolvedValue([
                { id: 1, url: 'https://scam.com' },
                { id: undefined, url: 'https://scam.com' },
                { id: 3, url: undefined },
            ]);
            scamDomains.set('scam.com', 'Malicious');

            await updateAllTabsProtection(true);

            expect(chrome.tabs.sendMessage).toHaveBeenCalledTimes(1); // Only for tab with id 1
        });
    });
});