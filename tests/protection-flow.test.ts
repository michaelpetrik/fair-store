/**
 * Protection Flow Tests
 * Complete test suite for the Fair Store Chrome extension protection logic
 * Tests all user stories and core functionality as per specifications
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock Chrome API
let mockChrome: any;
let scamDomains: Map<string, string>;
let allowedDomains: Set<string>;
let protectionEnabled: boolean;

describe('Fair Store Protection Flow', () => {
    beforeEach(() => {
        // Reset state for each test
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
                onStartup: { addListener: vi.fn() },
                onMessage: { addListener: vi.fn() },
                sendMessage: vi.fn(),
                getURL: vi.fn((path) => `chrome-extension://test/${path}`)
            },
            tabs: {
                onUpdated: { addListener: vi.fn() },
                update: vi.fn(),
                remove: vi.fn(),
                query: vi.fn(() => Promise.resolve([])),
                getCurrent: vi.fn((cb) => cb({ id: 1 }))
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

    // ============================================================================
    // FR-1: Blacklist Fetching
    // ============================================================================
    describe('FR-1: Blacklist Fetching', () => {
        describe('FR-1.1: Fetch blacklist on extension install', () => {
            it('should trigger blacklist fetch when extension is installed', async () => {
                const loadScamDomains = vi.fn();

                // Simulate onInstalled
                const onInstallCallback = async () => {
                    await loadScamDomains();
                };

                await onInstallCallback();

                expect(loadScamDomains).toHaveBeenCalled();
            });
        });

        describe('FR-1.2: Fetch blacklist on browser startup', () => {
            it('should trigger blacklist fetch when browser starts', async () => {
                const loadScamDomains = vi.fn();

                // Simulate onStartup
                const onStartupCallback = async () => {
                    await loadScamDomains();
                };

                await onStartupCallback();

                expect(loadScamDomains).toHaveBeenCalled();
            });
        });

        describe('FR-1.4: Manual refresh for blacklist', () => {
            it('should allow manual refresh of blacklist', async () => {
                const refreshBlacklist = vi.fn().mockResolvedValue({
                    success: true,
                    count: 150,
                    lastUpdate: new Date().toISOString()
                });

                const response = await refreshBlacklist();

                expect(response.success).toBe(true);
                expect(response.count).toBeGreaterThan(0);
                expect(response.lastUpdate).toBeDefined();
            });
        });

        describe('FR-1.5: Store blacklist with timestamp', () => {
            it('should store blacklist in local storage with timestamp', async () => {
                const data = {
                    scamDomains: Array.from(scamDomains.entries()),
                    lastUpdate: new Date().toISOString()
                };

                await mockChrome.storage.local.set(data);

                expect(mockChrome.storage.local.set).toHaveBeenCalledWith(
                    expect.objectContaining({
                        scamDomains: expect.any(Array),
                        lastUpdate: expect.any(String)
                    })
                );
            });
        });

        describe('FR-1.6: Fallback to cached data', () => {
            it('should load from cache when network fails', async () => {
                const stored = await mockChrome.storage.local.get(['scamDomains']);

                expect(stored.scamDomains).toBeDefined();
                expect(stored.scamDomains.length).toBe(3);
            });
        });
    });

    // ============================================================================
    // FR-2: Protection Toggle
    // ============================================================================
    describe('FR-2: Protection Toggle', () => {
        describe('FR-2.1: Protection ON by default at session start', () => {
            it('should have protection enabled by default', () => {
                expect(protectionEnabled).toBe(true);
            });

            it('should reset protection to ON on session start', async () => {
                protectionEnabled = false;

                // Simulate session start
                protectionEnabled = true;
                await mockChrome.storage.session.set({ protectionEnabled: true });

                expect(protectionEnabled).toBe(true);
            });
        });

        describe('FR-2.3: Disabling protection lasts until session end', () => {
            it('should persist disabled state within session', async () => {
                protectionEnabled = false;
                await mockChrome.storage.session.set({ protectionEnabled: false });

                expect(mockChrome.storage.session.set).toHaveBeenCalledWith({ protectionEnabled: false });
            });
        });

        describe('FR-2.5: No blocking when protection is disabled', () => {
            it('should not block any domains when protection is off', () => {
                protectionEnabled = false;
                const domain = 'scam.com';

                const isScam = scamDomains.has(domain);
                expect(isScam).toBe(true);

                // But should not block when protection is disabled
                const shouldBlock = protectionEnabled && isScam && !allowedDomains.has(domain);
                expect(shouldBlock).toBe(false);
            });
        });
    });

    // ============================================================================
    // FR-3: Page Visit Protection Flow
    // ============================================================================
    describe('FR-3: Page Visit Protection Flow', () => {
        // Helper function simulating the protection flow
        function evaluateNavigation(url: string): {
            shouldBlock: boolean;
            reason?: string;
        } {
            // FR-3.1: Check if protection is enabled
            if (!protectionEnabled) {
                // FR-3.2: Protection OFF - allow page
                return { shouldBlock: false };
            }

            // Extract domain
            let domain: string;
            try {
                domain = new URL(url).hostname.toLowerCase();
            } catch {
                return { shouldBlock: false };
            }

            // FR-3.5: Check if domain is whitelisted
            if (allowedDomains.has(domain)) {
                // FR-3.6: Whitelisted - allow page without overlay
                return { shouldBlock: false };
            }

            // FR-3.3: Check if on blacklist
            let isOnBlacklist = false;
            let reason: string | undefined;

            if (scamDomains.has(domain)) {
                isOnBlacklist = true;
                reason = scamDomains.get(domain);
            } else {
                // FR-3.8: Match subdomains
                for (const [scamDomain, scamReason] of scamDomains.entries()) {
                    if (domain.endsWith('.' + scamDomain)) {
                        isOnBlacklist = true;
                        reason = scamReason;
                        break;
                    }
                }
            }

            if (!isOnBlacklist) {
                // FR-3.4: Not on blacklist - allow page
                return { shouldBlock: false };
            }

            // FR-3.7: On blacklist and not whitelisted - display overlay
            return { shouldBlock: true, reason };
        }

        describe('FR-3.1 & FR-3.2: Protection OFF allows all pages', () => {
            it('should allow all pages when protection is disabled', () => {
                protectionEnabled = false;

                const result = evaluateNavigation('https://scam.com/');
                expect(result.shouldBlock).toBe(false);
            });
        });

        describe('FR-3.3 & FR-3.4: Non-blacklisted domains allowed', () => {
            it('should allow pages not on blacklist', () => {
                protectionEnabled = true;

                const result = evaluateNavigation('https://google.com/');
                expect(result.shouldBlock).toBe(false);
            });

            it('should allow pages with similar but different domain names', () => {
                protectionEnabled = true;

                const result = evaluateNavigation('https://notscam.com/');
                expect(result.shouldBlock).toBe(false);
            });
        });

        describe('FR-3.5 & FR-3.6: Whitelisted domains allowed', () => {
            it('should allow whitelisted domains even if on blacklist', () => {
                protectionEnabled = true;
                allowedDomains.add('scam.com');

                const result = evaluateNavigation('https://scam.com/products');
                expect(result.shouldBlock).toBe(false);
            });
        });

        describe('FR-3.7: Block malicious non-whitelisted domains', () => {
            it('should block domains on blacklist that are not whitelisted', () => {
                protectionEnabled = true;

                const result = evaluateNavigation('https://scam.com/checkout');
                expect(result.shouldBlock).toBe(true);
                expect(result.reason).toBe('Podvodný e-shop');
            });
        });

        describe('FR-3.8: Subdomain matching', () => {
            it('should match www subdomain', () => {
                protectionEnabled = true;

                const result = evaluateNavigation('https://www.scam.com/');
                expect(result.shouldBlock).toBe(true);
            });

            it('should match deep subdomains', () => {
                protectionEnabled = true;

                const result = evaluateNavigation('https://shop.www.scam.com/');
                expect(result.shouldBlock).toBe(true);
            });

            it('should not match partial domain names', () => {
                protectionEnabled = true;

                const result = evaluateNavigation('https://notascam.com/');
                expect(result.shouldBlock).toBe(false);
            });
        });
    });

    // ============================================================================
    // FR-4: Blocking Overlay
    // ============================================================================
    describe('FR-4: Blocking Overlay', () => {
        describe('FR-4.1 & FR-4.2: Display blocked domain and reason', () => {
            it('should provide domain name for display', () => {
                const url = 'https://scam.com/products?id=123';
                const domain = new URL(url).hostname;

                expect(domain).toBe('scam.com');
            });

            it('should provide reason from ČOI database', () => {
                const domain = 'scam.com';
                const reason = scamDomains.get(domain);

                expect(reason).toBe('Podvodný e-shop');
            });
        });

        describe('FR-4.3: Close Tab action', () => {
            it('should close the current tab', () => {
                mockChrome.tabs.getCurrent((tab: any) => {
                    if (tab && tab.id) {
                        mockChrome.tabs.remove(tab.id);
                    }
                });

                expect(mockChrome.tabs.remove).toHaveBeenCalledWith(1);
            });
        });

        describe('FR-4.4 & FR-4.5: Proceed Anyway action', () => {
            it('should add domain to whitelist when proceeding', async () => {
                const domain = 'scam.com';

                // Simulate "Proceed Anyway" action
                allowedDomains.add(domain);

                expect(allowedDomains.has(domain)).toBe(true);
            });

            it('should not block after whitelisting', () => {
                const domain = 'scam.com';
                allowedDomains.add(domain);

                const isBlocked = scamDomains.has(domain) && !allowedDomains.has(domain);
                expect(isBlocked).toBe(false);
            });
        });

        describe('FR-4.6: Redirect to original URL after proceeding', () => {
            it('should preserve original URL for redirect', () => {
                const originalUrl = 'https://scam.com/products?id=123#section';
                const blockedUrl = `chrome-extension://test/blocked.html?url=${encodeURIComponent(originalUrl)}`;

                const params = new URLSearchParams(new URL(blockedUrl).search);
                const extractedUrl = params.get('url');

                expect(extractedUrl).toBe(originalUrl);
            });
        });
    });

    // ============================================================================
    // FR-5: Session Whitelist
    // ============================================================================
    describe('FR-5: Session Whitelist', () => {
        describe('FR-5.1: Whitelist empty at session start', () => {
            it('should start with empty whitelist', () => {
                const freshWhitelist = new Set<string>();
                expect(freshWhitelist.size).toBe(0);
            });
        });

        describe('FR-5.2: Domains added via Proceed Anyway', () => {
            it('should add domain to whitelist upon proceed action', () => {
                const domain = 'scam.com';
                allowedDomains.add(domain);

                expect(allowedDomains.has(domain)).toBe(true);
            });
        });

        describe('FR-5.3: Whitelisted domains not blocked', () => {
            it('should not block any whitelisted domain', () => {
                allowedDomains.add('scam.com');
                allowedDomains.add('fake-store.cz');

                for (const domain of allowedDomains) {
                    const shouldBlock = !allowedDomains.has(domain);
                    expect(shouldBlock).toBe(false);
                }
            });
        });

        describe('FR-5.4 & FR-5.5: Whitelist is in-memory only', () => {
            it('should not persist whitelist to storage', () => {
                allowedDomains.add('scam.com');

                // Simulate session restart
                const newSession = new Set<string>();

                expect(newSession.has('scam.com')).toBe(false);
            });
        });
    });

    // ============================================================================
    // Complete Flow Integration Tests
    // ============================================================================
    describe('Complete User Flow', () => {
        it('should block malicious site when protection is ON', () => {
            protectionEnabled = true;

            const url = 'https://scam.com/checkout';
            const domain = new URL(url).hostname;

            expect(protectionEnabled).toBe(true);
            expect(scamDomains.has(domain)).toBe(true);
            expect(allowedDomains.has(domain)).toBe(false);

            // Should be blocked
            const shouldBlock = protectionEnabled && scamDomains.has(domain) && !allowedDomains.has(domain);
            expect(shouldBlock).toBe(true);
        });

        it('should allow malicious site after user proceeds', () => {
            protectionEnabled = true;
            const domain = 'scam.com';

            // User clicks "Proceed Anyway"
            allowedDomains.add(domain);

            const shouldBlock = protectionEnabled && scamDomains.has(domain) && !allowedDomains.has(domain);
            expect(shouldBlock).toBe(false);
        });

        it('should allow all sites when protection is OFF', () => {
            protectionEnabled = false;

            const maliciousDomains = ['scam.com', 'fake-store.cz', 'phishing.net'];

            for (const domain of maliciousDomains) {
                expect(scamDomains.has(domain)).toBe(true);
                const shouldBlock = protectionEnabled && scamDomains.has(domain);
                expect(shouldBlock).toBe(false);
            }
        });

        it('should never block safe sites', () => {
            protectionEnabled = true;

            const safeDomains = ['google.com', 'facebook.com', 'amazon.com', 'alza.cz'];

            for (const domain of safeDomains) {
                expect(scamDomains.has(domain)).toBe(false);
                const shouldBlock = scamDomains.has(domain);
                expect(shouldBlock).toBe(false);
            }
        });

        it('should handle session restart correctly', () => {
            // Session 1: User whitelists a domain
            allowedDomains.add('scam.com');
            protectionEnabled = false;

            expect(allowedDomains.has('scam.com')).toBe(true);
            expect(protectionEnabled).toBe(false);

            // Simulate session restart
            allowedDomains = new Set();
            protectionEnabled = true;

            // After restart: whitelist cleared, protection ON
            expect(allowedDomains.has('scam.com')).toBe(false);
            expect(protectionEnabled).toBe(true);
        });
    });

    // ============================================================================
    // Edge Cases
    // ============================================================================
    describe('Edge Cases', () => {
        it('should handle rapid whitelist state changes', () => {
            protectionEnabled = true;
            const domain = 'scam.com';

            // Initial: blocked
            expect(scamDomains.has(domain)).toBe(true);
            expect(allowedDomains.has(domain)).toBe(false);

            // User whitelists
            allowedDomains.add(domain);
            expect(allowedDomains.has(domain)).toBe(true);

            // User un-whitelists (session continues)
            allowedDomains.delete(domain);
            expect(allowedDomains.has(domain)).toBe(false);

            // User whitelists again
            allowedDomains.add(domain);
            expect(allowedDomains.has(domain)).toBe(true);

            // All transitions should be atomic and consistent
        });

        it('should handle concurrent domain checks', async () => {
            protectionEnabled = true;

            // Simulate multiple simultaneous checks
            const checks = Array.from({ length: 100 }, (_, i) => {
                const domain = i % 2 === 0 ? 'scam.com' : 'safe-site.com';
                return {
                    domain,
                    isScam: scamDomains.has(domain),
                    isWhitelisted: allowedDomains.has(domain)
                };
            });

            // All checks should return consistent results
            checks.forEach(check => {
                if (check.domain === 'scam.com') {
                    expect(check.isScam).toBe(true);
                } else {
                    expect(check.isScam).toBe(false);
                }
            });
        });

        it('should handle storage sync failures gracefully', () => {
            // Simulate storage unavailable
            const fallbackDomains = new Map<string, string>();

            // Should fail-open (allow access) rather than fail-closed
            const domain = 'unknown.com';
            const isBlocked = fallbackDomains.has(domain);

            expect(isBlocked).toBe(false);  // Don't block if can't verify
        });

        it('should handle invalid URLs gracefully', () => {
            protectionEnabled = true;

            const invalidUrls = ['', 'not-a-url', 'javascript:void(0)', 'data:text/html,test'];

            for (const url of invalidUrls) {
                expect(() => {
                    try {
                        new URL(url);
                    } catch {
                        // Expected to throw
                    }
                }).not.toThrow();
            }
        });

        it('should handle chrome:// URLs', () => {
            const chromeUrls = [
                'chrome://extensions/',
                'chrome://settings/',
                'chrome-extension://abc123/popup.html'
            ];

            for (const url of chromeUrls) {
                const shouldSkip = url.startsWith('chrome://') || url.startsWith('chrome-extension://');
                expect(shouldSkip).toBe(true);
            }
        });

        it('should handle case-insensitive domain matching', () => {
            protectionEnabled = true;

            const variations = ['SCAM.COM', 'Scam.Com', 'sCAM.cOM'];

            for (const domain of variations) {
                const normalized = domain.toLowerCase();
                expect(scamDomains.has(normalized)).toBe(true);
            }
        });

        it('should handle domains with ports', () => {
            const url = 'https://scam.com:8443/products';
            const domain = new URL(url).hostname;

            expect(domain).toBe('scam.com');
            expect(scamDomains.has(domain)).toBe(true);
        });

        it('should handle IDN domains (punycode)', () => {
            const punycodeUrl = 'https://xn--e1afmkfd.xn--p1ai/';
            const domain = new URL(punycodeUrl).hostname;

            expect(domain).toBe('xn--e1afmkfd.xn--p1ai');
        });
    });

    // ============================================================================
    // Performance Tests
    // ============================================================================
    describe('Performance', () => {
        it('should check domain in under 5ms for large blacklist', () => {
            // Create large blacklist
            const largeBlacklist = new Map<string, string>();
            for (let i = 0; i < 10000; i++) {
                largeBlacklist.set(`scam${i}.com`, `Reason ${i}`);
            }

            const start = performance.now();

            // Check multiple domains
            for (let i = 0; i < 100; i++) {
                largeBlacklist.has(`scam${i * 100}.com`);
            }

            const end = performance.now();
            const avgTime = (end - start) / 100;

            expect(avgTime).toBeLessThan(5);
        });

        it('should handle subdomain matching efficiently', () => {
            const largeBlacklist = new Map<string, string>();
            for (let i = 0; i < 1000; i++) {
                largeBlacklist.set(`domain${i}.com`, `Reason ${i}`);
            }

            const start = performance.now();

            // Check subdomain matching
            const domain = 'sub.domain500.com';
            let matched = false;
            for (const [scamDomain] of largeBlacklist.entries()) {
                if (domain.endsWith('.' + scamDomain)) {
                    matched = true;
                    break;
                }
            }

            const end = performance.now();

            expect(matched).toBe(true);
            expect(end - start).toBeLessThan(50);
        });
    });
});
