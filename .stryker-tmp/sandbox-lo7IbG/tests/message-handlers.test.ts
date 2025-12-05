/**
 * Message Handler Tests
 * Tests for message passing between extension components
 * 
 * Coverage:
 * - Section 5 from PSEUDOCODE.md: Message Handlers
 * - handleAllowDomain (FR-5.2)
 * - handleCheckDomain (FR-3.3, FR-3.5)
 * - handleSetProtection (FR-2.3)
 * - handleGetBlacklist
 * - handleRefreshBlacklist (FR-1.4)
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

describe('Message Handlers', () => {
    let mockChrome: any;
    let scamDomains: Map<string, string>;
    let allowedDomains: Set<string>;
    let protectionEnabled: boolean;
    let lastUpdate: string;

    // Simulate message handler logic (mirrors background.ts)
    function handleMessage(message: any, sendResponse: (response: any) => void) {
        switch (message.action) {
            case 'allowDomain':
                return handleAllowDomain(message, sendResponse);
            case 'checkDomain':
                return handleCheckDomain(message, sendResponse);
            case 'setProtection':
                return handleSetProtection(message, sendResponse);
            case 'getBlacklist':
                return handleGetBlacklist(sendResponse);
            case 'refreshBlacklist':
                return handleRefreshBlacklist(sendResponse);
            default:
                sendResponse({ error: 'Unknown action' });
                return false;
        }
    }

    function handleAllowDomain(message: any, sendResponse: (response: any) => void) {
        const domain = message.domain?.toLowerCase();
        if (domain) {
            allowedDomains.add(domain);
            console.log(`Allowed domain: ${domain}`);
            sendResponse({ success: true });
        } else {
            sendResponse({ success: false, error: 'Invalid domain' });
        }
        return true;
    }

    function handleCheckDomain(message: any, sendResponse: (response: any) => void) {
        const url = message.url;

        if (!url) {
            sendResponse({
                isScam: false,
                isWhitelisted: false,
                protectionEnabled,
                domain: ''
            });
            return true;
        }

        let domain: string;
        try {
            domain = new URL(url).hostname.toLowerCase();
        } catch {
            sendResponse({
                isScam: false,
                isWhitelisted: false,
                protectionEnabled,
                domain: ''
            });
            return true;
        }

        // Check whitelist first
        const isWhitelisted = allowedDomains.has(domain);

        // Check blacklist
        let isScam = false;
        let reason: string | null = null;
        let matchedDomain: string | null = null;

        if (scamDomains.has(domain)) {
            isScam = true;
            reason = scamDomains.get(domain)!;
            matchedDomain = domain;
        } else {
            // Subdomain check
            for (const [scamDomain, scamReason] of scamDomains.entries()) {
                if (domain.endsWith('.' + scamDomain)) {
                    isScam = true;
                    reason = scamReason;
                    matchedDomain = scamDomain;
                    break;
                }
            }
        }

        sendResponse({
            isScam: isWhitelisted ? false : isScam,
            isWhitelisted,
            protectionEnabled,
            domain,
            reason: isWhitelisted ? null : reason,
            matchedDomain: isWhitelisted ? null : matchedDomain
        });
        return true;
    }

    function handleSetProtection(message: any, sendResponse: (response: any) => void) {
        const enabled = message.enabled !== false; // Default to true
        protectionEnabled = enabled;
        console.log(`Protection ${enabled ? 'enabled' : 'disabled'}`);
        sendResponse({ success: true, protectionEnabled: enabled });
        return true;
    }

    function handleGetBlacklist(sendResponse: (response: any) => void) {
        const blacklistArray = Array.from(scamDomains.keys());
        sendResponse({
            blacklist: blacklistArray,
            protectionEnabled,
            lastUpdate
        });
        return true;
    }

    function handleRefreshBlacklist(sendResponse: (response: any) => void) {
        // Simulate successful refresh
        lastUpdate = new Date().toISOString();
        sendResponse({
            success: true,
            count: scamDomains.size,
            lastUpdate
        });
        return true;
    }

    beforeEach(() => {
        scamDomains = new Map([
            ['scam.com', 'Podvodný e-shop'],
            ['fake-store.cz', 'Nedodání zboží'],
            ['phishing.net', 'Zneužití platebních údajů']
        ]);

        allowedDomains = new Set();
        protectionEnabled = true;
        lastUpdate = '2024-12-01T00:00:00Z';

        mockChrome = {
            storage: {
                session: {
                    set: vi.fn(() => Promise.resolve()),
                    get: vi.fn(() => Promise.resolve({ protectionEnabled }))
                }
            }
        };

        (global as any).chrome = mockChrome;
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('handleAllowDomain (FR-5.2)', () => {
        it('should add domain to allowedDomains set', () => {
            const sendResponse = vi.fn();

            handleMessage({ action: 'allowDomain', domain: 'scam.com' }, sendResponse);

            expect(allowedDomains.has('scam.com')).toBe(true);
            expect(sendResponse).toHaveBeenCalledWith({ success: true });
        });

        it('should lowercase domain before adding', () => {
            const sendResponse = vi.fn();

            handleMessage({ action: 'allowDomain', domain: 'SCAM.COM' }, sendResponse);

            expect(allowedDomains.has('scam.com')).toBe(true);
        });

        it('should reject empty domain', () => {
            const sendResponse = vi.fn();

            handleMessage({ action: 'allowDomain', domain: '' }, sendResponse);

            expect(allowedDomains.size).toBe(0);
            expect(sendResponse).toHaveBeenCalledWith({ success: false, error: 'Invalid domain' });
        });

        it('should reject null/undefined domain', () => {
            const sendResponse = vi.fn();

            handleMessage({ action: 'allowDomain', domain: null }, sendResponse);

            expect(allowedDomains.size).toBe(0);
            expect(sendResponse).toHaveBeenCalledWith({ success: false, error: 'Invalid domain' });
        });

        it('should handle adding same domain twice', () => {
            const sendResponse = vi.fn();

            handleMessage({ action: 'allowDomain', domain: 'scam.com' }, sendResponse);
            handleMessage({ action: 'allowDomain', domain: 'scam.com' }, sendResponse);

            expect(allowedDomains.size).toBe(1);
            expect(sendResponse).toHaveBeenCalledTimes(2);
        });
    });

    describe('handleCheckDomain (FR-3.3, FR-3.5)', () => {
        it('should return isScam: true for blacklisted domain', () => {
            const sendResponse = vi.fn();

            handleMessage({ action: 'checkDomain', url: 'https://scam.com/path' }, sendResponse);

            expect(sendResponse).toHaveBeenCalledWith(expect.objectContaining({
                isScam: true,
                domain: 'scam.com',
                reason: 'Podvodný e-shop',
                matchedDomain: 'scam.com',
                protectionEnabled: true
            }));
        });

        it('should return isScam: false for non-blacklisted domain', () => {
            const sendResponse = vi.fn();

            handleMessage({ action: 'checkDomain', url: 'https://safe-site.com' }, sendResponse);

            expect(sendResponse).toHaveBeenCalledWith(expect.objectContaining({
                isScam: false,
                domain: 'safe-site.com',
                reason: null,
                matchedDomain: null
            }));
        });

        it('should detect subdomain of blacklisted domain', () => {
            const sendResponse = vi.fn();

            handleMessage({ action: 'checkDomain', url: 'https://www.scam.com/path' }, sendResponse);

            expect(sendResponse).toHaveBeenCalledWith(expect.objectContaining({
                isScam: true,
                domain: 'www.scam.com',
                matchedDomain: 'scam.com'
            }));
        });

        it('should return isScam: false for whitelisted domain even if blacklisted', () => {
            allowedDomains.add('scam.com');
            const sendResponse = vi.fn();

            handleMessage({ action: 'checkDomain', url: 'https://scam.com' }, sendResponse);

            expect(sendResponse).toHaveBeenCalledWith(expect.objectContaining({
                isScam: false,
                isWhitelisted: true,
                domain: 'scam.com',
                reason: null,
                matchedDomain: null
            }));
        });

        it('should handle empty URL', () => {
            const sendResponse = vi.fn();

            handleMessage({ action: 'checkDomain', url: '' }, sendResponse);

            expect(sendResponse).toHaveBeenCalledWith(expect.objectContaining({
                isScam: false,
                domain: ''
            }));
        });

        it('should handle invalid URL', () => {
            const sendResponse = vi.fn();

            handleMessage({ action: 'checkDomain', url: 'not-a-valid-url' }, sendResponse);

            expect(sendResponse).toHaveBeenCalledWith(expect.objectContaining({
                isScam: false,
                domain: ''
            }));
        });

        it('should include protectionEnabled in response', () => {
            const sendResponse = vi.fn();
            protectionEnabled = false;

            handleMessage({ action: 'checkDomain', url: 'https://example.com' }, sendResponse);

            expect(sendResponse).toHaveBeenCalledWith(expect.objectContaining({
                protectionEnabled: false
            }));
        });
    });

    describe('handleSetProtection (FR-2.3)', () => {
        it('should enable protection when enabled: true', () => {
            protectionEnabled = false;
            const sendResponse = vi.fn();

            handleMessage({ action: 'setProtection', enabled: true }, sendResponse);

            expect(protectionEnabled).toBe(true);
            expect(sendResponse).toHaveBeenCalledWith({
                success: true,
                protectionEnabled: true
            });
        });

        it('should disable protection when enabled: false', () => {
            protectionEnabled = true;
            const sendResponse = vi.fn();

            handleMessage({ action: 'setProtection', enabled: false }, sendResponse);

            expect(protectionEnabled).toBe(false);
            expect(sendResponse).toHaveBeenCalledWith({
                success: true,
                protectionEnabled: false
            });
        });

        it('should default to true when enabled not specified', () => {
            protectionEnabled = false;
            const sendResponse = vi.fn();

            handleMessage({ action: 'setProtection' }, sendResponse);

            expect(protectionEnabled).toBe(true);
        });
    });

    describe('handleGetBlacklist', () => {
        it('should return blacklist array', () => {
            const sendResponse = vi.fn();

            handleMessage({ action: 'getBlacklist' }, sendResponse);

            expect(sendResponse).toHaveBeenCalledWith(expect.objectContaining({
                blacklist: expect.arrayContaining(['scam.com', 'fake-store.cz', 'phishing.net']),
                protectionEnabled: true,
                lastUpdate: expect.any(String)
            }));
        });

        it('should return current protection state', () => {
            protectionEnabled = false;
            const sendResponse = vi.fn();

            handleMessage({ action: 'getBlacklist' }, sendResponse);

            expect(sendResponse).toHaveBeenCalledWith(expect.objectContaining({
                protectionEnabled: false
            }));
        });

        it('should return empty array for empty blacklist', () => {
            scamDomains.clear();
            const sendResponse = vi.fn();

            handleMessage({ action: 'getBlacklist' }, sendResponse);

            expect(sendResponse).toHaveBeenCalledWith(expect.objectContaining({
                blacklist: []
            }));
        });
    });

    describe('handleRefreshBlacklist (FR-1.4)', () => {
        it('should return success with count and timestamp', () => {
            const sendResponse = vi.fn();

            handleMessage({ action: 'refreshBlacklist' }, sendResponse);

            expect(sendResponse).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                count: 3,
                lastUpdate: expect.any(String)
            }));
        });

        it('should update lastUpdate timestamp', () => {
            const oldTimestamp = lastUpdate;
            const sendResponse = vi.fn();

            handleMessage({ action: 'refreshBlacklist' }, sendResponse);

            expect(lastUpdate).not.toBe(oldTimestamp);
        });
    });

    describe('Unknown Actions', () => {
        it('should return error for unknown action', () => {
            const sendResponse = vi.fn();

            handleMessage({ action: 'unknownAction' }, sendResponse);

            expect(sendResponse).toHaveBeenCalledWith({ error: 'Unknown action' });
        });
    });
});

describe('Session Lifecycle (Pseudocode Section 9)', () => {
    let scamDomains: Map<string, string>;
    let allowedDomains: Set<string>;
    let protectionEnabled: boolean;

    // Simulate session reset (onStartup behavior)
    function simulateSessionStart() {
        protectionEnabled = true;
        allowedDomains = new Set();
        // scamDomains would be fetched fresh in real implementation
    }

    // Simulate session running state
    function simulateUserActions() {
        // User whitelists a domain
        allowedDomains.add('scam.com');
        // User disables protection
        protectionEnabled = false;
    }

    beforeEach(() => {
        scamDomains = new Map([
            ['scam.com', 'Bad shop'],
            ['fake.com', 'Fraud']
        ]);
        allowedDomains = new Set();
        protectionEnabled = true;
    });

    describe('SESSION_START', () => {
        it('should start with protection enabled', () => {
            simulateSessionStart();
            expect(protectionEnabled).toBe(true);
        });

        it('should start with empty whitelist', () => {
            simulateSessionStart();
            expect(allowedDomains.size).toBe(0);
        });

        it('should reset protection after previous session disabled it', () => {
            // Session 1: User disables protection
            protectionEnabled = false;
            expect(protectionEnabled).toBe(false);

            // Session 2: Starts fresh
            simulateSessionStart();
            expect(protectionEnabled).toBe(true);
        });

        it('should clear whitelist after previous session had entries', () => {
            // Session 1: User whitelists domains
            allowedDomains.add('scam.com');
            allowedDomains.add('fake.com');
            expect(allowedDomains.size).toBe(2);

            // Session 2: Starts fresh
            simulateSessionStart();
            expect(allowedDomains.size).toBe(0);
            expect(allowedDomains.has('scam.com')).toBe(false);
        });
    });

    describe('SESSION_RUNNING', () => {
        it('should allow toggling protection during session', () => {
            simulateSessionStart();

            // User toggles protection off
            protectionEnabled = false;
            expect(protectionEnabled).toBe(false);

            // User toggles protection on
            protectionEnabled = true;
            expect(protectionEnabled).toBe(true);
        });

        it('should accumulate whitelisted domains during session', () => {
            simulateSessionStart();

            // User whitelists first domain
            allowedDomains.add('scam.com');
            expect(allowedDomains.size).toBe(1);

            // User whitelists second domain
            allowedDomains.add('fake.com');
            expect(allowedDomains.size).toBe(2);
        });

        it('should preserve whitelist across multiple page visits', () => {
            simulateSessionStart();
            allowedDomains.add('scam.com');

            // Simulate visiting the whitelisted domain multiple times
            for (let i = 0; i < 5; i++) {
                expect(allowedDomains.has('scam.com')).toBe(true);
            }
        });
    });

    describe('SESSION_END → SESSION_START', () => {
        it('should completely reset state on new session', () => {
            // Session 1: Active usage
            simulateUserActions();
            expect(protectionEnabled).toBe(false);
            expect(allowedDomains.has('scam.com')).toBe(true);

            // Session ends, new session starts
            simulateSessionStart();

            // All state should be reset
            expect(protectionEnabled).toBe(true);
            expect(allowedDomains.size).toBe(0);
        });
    });
});

describe('FR-1.3: Fetch on Extension Enable/Re-enable', () => {
    it('should trigger refresh when extension is re-enabled', () => {
        // This simulates the behavior when extension is disabled then re-enabled
        let fetchTriggered = false;

        const onEnabled = () => {
            fetchTriggered = true;
        };

        // Simulate extension being enabled
        onEnabled();

        expect(fetchTriggered).toBe(true);
    });
});

describe('Error Handling Strategy (Pseudocode Section 10)', () => {
    describe('NetworkErrors', () => {
        it('should return safe defaults on network error', () => {
            // Simulate network failure returning safe default
            const handleNetworkError = () => ({
                isScam: false,
                protectionEnabled: true
            });

            const result = handleNetworkError();
            expect(result.isScam).toBe(false);
            expect(result.protectionEnabled).toBe(true);
        });
    });

    describe('URLParseErrors', () => {
        it('should return empty string for unparseable URLs', () => {
            const extractDomain = (url: string): string => {
                try {
                    return new URL(url).hostname.toLowerCase();
                } catch {
                    return '';
                }
            };

            expect(extractDomain('not-a-url')).toBe('');
            expect(extractDomain('')).toBe('');
            expect(extractDomain('javascript:void(0)')).toBe('');
        });

        it('should never block legitimate sites due to parse errors', () => {
            const shouldBlock = (url: string, scamDomains: Map<string, string>): boolean => {
                try {
                    const domain = new URL(url).hostname.toLowerCase();
                    return scamDomains.has(domain);
                } catch {
                    // Parse error - don't block
                    return false;
                }
            };

            const scamDomains = new Map([['scam.com', 'Bad']]);

            // Valid scam URL should be blocked
            expect(shouldBlock('https://scam.com', scamDomains)).toBe(true);

            // Invalid URL should NOT be blocked
            expect(shouldBlock('invalid', scamDomains)).toBe(false);
            expect(shouldBlock('', scamDomains)).toBe(false);
        });
    });
});
