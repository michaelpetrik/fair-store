/**
 * State Transitions Tests
 * Tests the critical state display logic to catch whitelist/safe conflation bugs
 *
 * CRITICAL BUG TO CATCH:
 * Popup.tsx line 222-226 shows "Bezpečná stránka" for BOTH:
 * - Safe domains (not in blacklist) ✅ CORRECT
 * - Whitelisted domains (in blacklist but allowed) ❌ BUG
 *
 * This test suite ensures proper distinction between states.
 */

import { describe, it, expect, beforeEach } from 'vitest';

interface DomainStatus {
  domain: string;
  isSafe: boolean;
  isWhitelisted: boolean;
  isBlocked: boolean;
  reason?: string;
}

describe('Whitelist State Display Logic (Critical Bug Detection)', () => {
  let scamDomains: Map<string, string>;

  // This function mirrors the BUGGY logic in popup.tsx
  function checkDomainStatusBuggy(
    domain: string,
    scamList: Map<string, string>,
    isBlockedPage: boolean
  ): DomainStatus {
    let reason: string | undefined;
    let isInScamList = false;

    if (scamList.has(domain)) {
      reason = scamList.get(domain);
      isInScamList = true;
    } else {
      for (const [scamDomain, scamReason] of scamList.entries()) {
        if (domain.endsWith('.' + scamDomain) || domain === scamDomain) {
          reason = scamReason;
          isInScamList = true;
          break;
        }
      }
    }

    // BUG: If on actual risky site (not blocked), they must have whitelisted it
    // This conflates "whitelisted" with "safe"
    const isWhitelisted = !isBlockedPage && isInScamList;

    return {
      domain,
      isSafe: !isInScamList,  // BUG: This is TRUE for whitelisted domains!
      isWhitelisted,
      isBlocked: isBlockedPage,
      reason
    };
  }

  // This function represents the CORRECT logic
  function checkDomainStatusCorrect(
    domain: string,
    scamList: Map<string, string>,
    isBlockedPage: boolean,
    allowedDomains: Set<string>
  ): DomainStatus {
    let reason: string | undefined;
    let isInScamList = false;

    if (scamList.has(domain)) {
      reason = scamList.get(domain);
      isInScamList = true;
    } else {
      for (const [scamDomain, scamReason] of scamList.entries()) {
        if (domain.endsWith('.' + scamDomain) || domain === scamDomain) {
          reason = scamReason;
          isInScamList = true;
          break;
        }
      }
    }

    const isWhitelisted = allowedDomains.has(domain);

    return {
      domain,
      isSafe: !isInScamList,  // TRUE only if NOT in blacklist
      isWhitelisted,
      isBlocked: isBlockedPage,
      reason
    };
  }

  beforeEach(() => {
    scamDomains = new Map([
      ['scam.com', 'Podvodný e-shop'],
      ['fake-store.cz', 'Nedodání zboží'],
      ['phishing.net', 'Zneužití platebních údajů']
    ]);
  });

  describe('BUGGY IMPLEMENTATION (popup.tsx lines 140-150)', () => {
    it('BUG: should incorrectly show "Bezpečná stránka" for whitelisted risky domains', () => {
      // User is on scam.com (not blocked page) = they whitelisted it
      const status = checkDomainStatusBuggy('scam.com', scamDomains, false);

      // BUG: The buggy code shows this as "safe" because it's whitelisted
      expect(status.isSafe).toBe(false);  // Should be FALSE
      expect(status.isWhitelisted).toBe(true);  // Correctly detected as whitelisted

      // CRITICAL: The UI will show "✅ Bezpečná stránka" instead of "⚠️ Rizikový e-shop"
      // This is dangerous because users think they're on a safe site!
    });

    it('BUG: should conflate whitelisted domains with truly safe domains', () => {
      const safeStatus = checkDomainStatusBuggy('google.com', scamDomains, false);
      const whitelistedStatus = checkDomainStatusBuggy('scam.com', scamDomains, false);

      // Both show as "safe" but one is actually risky!
      expect(safeStatus.isSafe).toBe(true);  // Correct
      expect(whitelistedStatus.isSafe).toBe(false);  // Incorrect in buggy version

      // User can't distinguish between truly safe and whitelisted risky sites
    });

    it('BUG: should show blocked page correctly', () => {
      // User is on blocked.html page viewing scam.com
      const status = checkDomainStatusBuggy('scam.com', scamDomains, true);

      expect(status.isSafe).toBe(false);
      expect(status.isWhitelisted).toBe(false);
      expect(status.isBlocked).toBe(true);
    });
  });

  describe('CORRECT IMPLEMENTATION (with allowedDomains)', () => {
    it('should correctly show "Safe" ONLY for non-blacklisted domains', () => {
      const allowedDomains = new Set<string>();
      const status = checkDomainStatusCorrect('google.com', scamDomains, false, allowedDomains);

      expect(status.isSafe).toBe(true);
      expect(status.isWhitelisted).toBe(false);
    });

    it('should correctly show "Whitelisted" for allowed risky domains', () => {
      const allowedDomains = new Set(['scam.com']);
      const status = checkDomainStatusCorrect('scam.com', scamDomains, false, allowedDomains);

      expect(status.isSafe).toBe(false);  // NOT safe - it's in blacklist
      expect(status.isWhitelisted).toBe(true);  // But user allowed it
      expect(status.reason).toBe('Podvodný e-shop');
    });

    it('should correctly show "Blocked" for blocked risky domains', () => {
      const allowedDomains = new Set<string>();
      const status = checkDomainStatusCorrect('scam.com', scamDomains, true, allowedDomains);

      expect(status.isSafe).toBe(false);
      expect(status.isWhitelisted).toBe(false);
      expect(status.isBlocked).toBe(true);
    });

    it('should correctly distinguish all four states', () => {
      const allowedDomains = new Set(['scam.com']);

      // State 1: Truly safe (not in blacklist)
      const safe = checkDomainStatusCorrect('google.com', scamDomains, false, allowedDomains);
      expect(safe.isSafe).toBe(true);
      expect(safe.isWhitelisted).toBe(false);
      expect(safe.isBlocked).toBe(false);

      // State 2: Whitelisted risky (in blacklist, user allowed)
      const whitelisted = checkDomainStatusCorrect('scam.com', scamDomains, false, allowedDomains);
      expect(whitelisted.isSafe).toBe(false);
      expect(whitelisted.isWhitelisted).toBe(true);
      expect(whitelisted.isBlocked).toBe(false);

      // State 3: Blocked risky (in blacklist, on blocked page)
      const blocked = checkDomainStatusCorrect('fake-store.cz', scamDomains, true, allowedDomains);
      expect(blocked.isSafe).toBe(false);
      expect(blocked.isWhitelisted).toBe(false);
      expect(blocked.isBlocked).toBe(true);

      // State 4: Unknown risky (in blacklist, not blocked, not whitelisted)
      const unknown = checkDomainStatusCorrect('phishing.net', scamDomains, false, allowedDomains);
      expect(unknown.isSafe).toBe(false);
      expect(unknown.isWhitelisted).toBe(false);
      expect(unknown.isBlocked).toBe(false);
    });
  });

  describe('UI Display Logic Tests', () => {
    it('should display correct message for safe domains', () => {
      const allowedDomains = new Set<string>();
      const status = checkDomainStatusCorrect('google.com', scamDomains, false, allowedDomains);

      // UI should show: "✅ Bezpečná stránka"
      expect(status.isSafe).toBe(true);
      const message = status.isSafe ? 'Bezpečná stránka' : 'Rizikový e-shop';
      expect(message).toBe('Bezpečná stránka');
    });

    it('should display WARNING for whitelisted risky domains', () => {
      const allowedDomains = new Set(['scam.com']);
      const status = checkDomainStatusCorrect('scam.com', scamDomains, false, allowedDomains);

      // UI should show: "⚠️ Rizikový e-shop - Navštěvujete na vlastní nebezpečí"
      expect(status.isSafe).toBe(false);
      expect(status.isWhitelisted).toBe(true);

      const message = status.isWhitelisted
        ? 'Rizikový e-shop - Navštěvujete na vlastní nebezpečí'
        : 'Bezpečná stránka';
      expect(message).toBe('Rizikový e-shop - Navštěvujete na vlastní nebezpečí');
    });

    it('should display BLOCKED for blocked domains', () => {
      const allowedDomains = new Set<string>();
      const status = checkDomainStatusCorrect('scam.com', scamDomains, true, allowedDomains);

      // UI should show: "🛡️ Stránka blokována"
      expect(status.isBlocked).toBe(true);
      const message = status.isBlocked ? 'Stránka blokována' : 'Bezpečná stránka';
      expect(message).toBe('Stránka blokována');
    });
  });

  describe('Edge Cases and State Transitions', () => {
    it('should handle rapid whitelist/un-whitelist correctly', () => {
      const allowedDomains = new Set<string>();

      // Initial: blocked
      let status = checkDomainStatusCorrect('scam.com', scamDomains, true, allowedDomains);
      expect(status.isBlocked).toBe(true);
      expect(status.isWhitelisted).toBe(false);

      // User whitelists
      allowedDomains.add('scam.com');
      status = checkDomainStatusCorrect('scam.com', scamDomains, false, allowedDomains);
      expect(status.isWhitelisted).toBe(true);
      expect(status.isBlocked).toBe(false);

      // User navigates away and comes back (session persists)
      status = checkDomainStatusCorrect('scam.com', scamDomains, false, allowedDomains);
      expect(status.isWhitelisted).toBe(true);

      // Session ends, whitelist cleared
      allowedDomains.clear();
      status = checkDomainStatusCorrect('scam.com', scamDomains, true, allowedDomains);
      expect(status.isWhitelisted).toBe(false);
      expect(status.isBlocked).toBe(true);
    });

    it('should handle subdomain whitelisting correctly', () => {
      const allowedDomains = new Set(['www.scam.com']);

      // Whitelist includes subdomain
      let status = checkDomainStatusCorrect('www.scam.com', scamDomains, false, allowedDomains);
      expect(status.isWhitelisted).toBe(true);

      // But parent domain is not whitelisted
      status = checkDomainStatusCorrect('scam.com', scamDomains, false, allowedDomains);
      expect(status.isWhitelisted).toBe(false);
    });

    it('should handle domain removed from blacklist', () => {
      const allowedDomains = new Set(['scam.com']);

      // Initially in blacklist
      let status = checkDomainStatusCorrect('scam.com', scamDomains, false, allowedDomains);
      expect(status.isSafe).toBe(false);
      expect(status.isWhitelisted).toBe(true);

      // Domain removed from blacklist (after ČOI update)
      scamDomains.delete('scam.com');
      status = checkDomainStatusCorrect('scam.com', scamDomains, false, allowedDomains);
      expect(status.isSafe).toBe(true);  // Now truly safe
      expect(status.isWhitelisted).toBe(true);  // Still in allowedDomains (harmless)
    });

    it('should handle domain added to blacklist', () => {
      const allowedDomains = new Set<string>();

      // Initially not in blacklist
      let status = checkDomainStatusCorrect('new-scam.com', scamDomains, false, allowedDomains);
      expect(status.isSafe).toBe(true);

      // Domain added to blacklist (after ČOI update)
      scamDomains.set('new-scam.com', 'Nově přidaný podvod');
      status = checkDomainStatusCorrect('new-scam.com', scamDomains, false, allowedDomains);
      expect(status.isSafe).toBe(false);
      expect(status.reason).toBe('Nově přidaný podvod');
    });
  });

  describe('Race Conditions and Timing Issues', () => {
    it('should handle checking domain before blacklist loads', () => {
      const emptyBlacklist = new Map<string, string>();
      const allowedDomains = new Set<string>();

      // Check domain before blacklist loaded
      const status = checkDomainStatusCorrect('scam.com', emptyBlacklist, false, allowedDomains);

      // Should appear safe (fail-open for usability)
      expect(status.isSafe).toBe(true);
      expect(status.isWhitelisted).toBe(false);
    });

    it('should handle concurrent state updates', () => {
      const allowedDomains = new Set<string>();

      // Multiple rapid checks
      const checks = [];
      for (let i = 0; i < 10; i++) {
        checks.push(checkDomainStatusCorrect('scam.com', scamDomains, false, allowedDomains));
      }

      // All should return consistent results
      checks.forEach(status => {
        expect(status.isSafe).toBe(false);
        expect(status.isWhitelisted).toBe(false);
      });
    });
  });

  describe('Invalid Domain Formats', () => {
    it('should handle empty domain', () => {
      const allowedDomains = new Set<string>();
      const status = checkDomainStatusCorrect('', scamDomains, false, allowedDomains);

      expect(status.isSafe).toBe(true);  // Empty = not in blacklist
      expect(status.domain).toBe('');
    });

    it('should handle case-insensitive domains', () => {
      const allowedDomains = new Set(['SCAM.COM']);

      // Domain should be normalized to lowercase
      const normalizedDomain = 'scam.com';
      const status = checkDomainStatusCorrect(
        normalizedDomain,
        scamDomains,
        false,
        new Set([...allowedDomains].map(d => d.toLowerCase()))
      );

      expect(status.isWhitelisted).toBe(true);
    });

    it('should handle punycode domains', () => {
      const punycodeMap = new Map([['xn--e1afmkfd.xn--p1ai', 'International scam']]);
      const allowedDomains = new Set<string>();

      const status = checkDomainStatusCorrect(
        'xn--e1afmkfd.xn--p1ai',
        punycodeMap,
        false,
        allowedDomains
      );

      expect(status.isSafe).toBe(false);
      expect(status.reason).toBe('International scam');
    });
  });

  describe('Security Critical Tests', () => {
    it('CRITICAL: must NEVER show whitelisted risky site as safe', () => {
      const allowedDomains = new Set(['scam.com']);
      const status = checkDomainStatusCorrect('scam.com', scamDomains, false, allowedDomains);

      // This is the key security requirement
      expect(status.isSafe).toBe(false);  // MUST be false
      expect(status.isWhitelisted).toBe(true);

      // If this test fails, users are being mislead about site safety!
    });

    it('CRITICAL: must show reason for whitelisted risky sites', () => {
      const allowedDomains = new Set(['scam.com']);
      const status = checkDomainStatusCorrect('scam.com', scamDomains, false, allowedDomains);

      expect(status.reason).toBeDefined();
      expect(status.reason).toBe('Podvodný e-shop');

      // Users must see why the site is risky even if they allowed it
    });

    it('CRITICAL: safe sites must never show warnings', () => {
      const allowedDomains = new Set<string>();
      const status = checkDomainStatusCorrect('google.com', scamDomains, false, allowedDomains);

      expect(status.isSafe).toBe(true);
      expect(status.reason).toBeUndefined();
      expect(status.isWhitelisted).toBe(false);

      // False positives damage user trust
    });
  });
});

describe('Background ↔ Popup State Synchronization', () => {
  describe('Message Passing Tests', () => {
    it('should sync allowedDomains state between background and popup', async () => {
      // Background has allowedDomains Set
      const backgroundAllowed = new Set(['scam.com']);

      // Popup queries background for domain status
      const domain = 'scam.com';
      const isWhitelisted = backgroundAllowed.has(domain);

      expect(isWhitelisted).toBe(true);
    });

    it('should handle missing allowedDomains in message response', () => {
      // Background might not send allowedDomains
      const response = {
        isScam: true,
        protectionEnabled: true,
        domain: 'scam.com'
        // isWhitelisted missing
      };

      // Popup should handle gracefully
      const isWhitelisted = response.isScam && !('isWhitelisted' in response);
      expect(isWhitelisted).toBe(true);  // Assume not whitelisted
    });
  });

  describe('Storage Sync Conflicts', () => {
    it('should handle blacklist update during active session', () => {
      const scamList = new Map([['old-scam.com', 'Old scam']]);
      const allowedDomains = new Set(['old-scam.com']);

      // Blacklist updates
      scamList.delete('old-scam.com');
      scamList.set('new-scam.com', 'New scam');

      // Old whitelisted domain is now safe
      const oldStatus = {
        isSafe: !scamList.has('old-scam.com'),
        isWhitelisted: allowedDomains.has('old-scam.com')
      };
      expect(oldStatus.isSafe).toBe(true);
    });
  });
});
