/**
 * Domain Matching Tests
 * Tests for domain extraction, validation, and matching logic
 */

// Mock functions from background.js
function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.toLowerCase();
  } catch (error) {
    console.error('Invalid URL:', url);
    return '';
  }
}

function checkDomain(domain, scamDomains) {
  domain = domain.toLowerCase();
  // Check for exact match
  if (scamDomains.has(domain)) {
    return {
      isScam: true,
      reason: scamDomains.get(domain),
      matchedDomain: domain
    };
  }

  // Check for subdomain match (e.g., www.example.com matches example.com)
  for (const [scamDomain, reason] of scamDomains.entries()) {
    if (domain.endsWith('.' + scamDomain)) {
      return {
        isScam: true,
        reason: reason,
        matchedDomain: scamDomain
      };
    }
  }

  return {
    isScam: false,
    reason: null,
    matchedDomain: null
  };
}

describe('Domain Extraction', () => {
  describe('extractDomain', () => {
    test('should extract domain from http URL', () => {
      expect(extractDomain('http://example.com')).toBe('example.com');
    });

    test('should extract domain from https URL', () => {
      expect(extractDomain('https://example.com')).toBe('example.com');
    });

    test('should extract domain from URL with path', () => {
      expect(extractDomain('https://example.com/path/to/page')).toBe('example.com');
    });

    test('should extract domain from URL with query string', () => {
      expect(extractDomain('https://example.com?param=value')).toBe('example.com');
    });

    test('should extract domain from URL with hash', () => {
      expect(extractDomain('https://example.com#section')).toBe('example.com');
    });

    test('should extract domain from URL with port', () => {
      expect(extractDomain('https://example.com:8080')).toBe('example.com');
    });

    test('should extract subdomain', () => {
      expect(extractDomain('https://www.example.com')).toBe('www.example.com');
      expect(extractDomain('https://shop.example.com')).toBe('shop.example.com');
    });

    test('should convert domain to lowercase', () => {
      expect(extractDomain('https://EXAMPLE.COM')).toBe('example.com');
      expect(extractDomain('https://ExAmPlE.CoM')).toBe('example.com');
    });

    test('should handle chrome:// URLs', () => {
      expect(extractDomain('chrome://extensions/')).toBe('extensions');
    });

    test('should handle chrome-extension:// URLs', () => {
      const result = extractDomain('chrome-extension://abcdef123456/popup.html');
      expect(result).toBeTruthy();
    });

    test('should handle invalid URLs', () => {
      expect(extractDomain('not-a-url')).toBe('');
      expect(extractDomain('')).toBe('');
      expect(extractDomain('javascript:void(0)')).toBe(''); // Should be empty
    });

    test('should handle URLs with authentication', () => {
      expect(extractDomain('https://user:pass@example.com')).toBe('example.com');
    });

    test('should handle internationalized domains', () => {
      expect(extractDomain('https://münchen.de')).toBe('xn--mnchen-3ya.de');
    });

    test('should handle localhost', () => {
      expect(extractDomain('http://localhost:3000')).toBe('localhost');
    });

    test('should handle IP addresses', () => {
      expect(extractDomain('http://192.168.1.1')).toBe('192.168.1.1');
      expect(extractDomain('http://127.0.0.1:8080')).toBe('127.0.0.1');
    });
  });
});

describe('Domain Matching', () => {
  describe('checkDomain', () => {
    let scamDomains;

    beforeEach(() => {
      scamDomains = new Map([
        ['example.com', 'Podvodný e-shop'],
        ['fake-shop.cz', 'Nedodání zboží'],
        ['scam.net', 'Zneužití platebních údajů']
      ]);
    });

    test('should match exact domain', () => {
      const result = checkDomain('example.com', scamDomains);

      expect(result.isScam).toBe(true);
      expect(result.reason).toBe('Podvodný e-shop');
      expect(result.matchedDomain).toBe('example.com');
    });

    test('should not match safe domain', () => {
      const result = checkDomain('google.com', scamDomains);

      expect(result.isScam).toBe(false);
      expect(result.reason).toBe(null);
      expect(result.matchedDomain).toBe(null);
    });

    test('should match subdomain to parent domain', () => {
      const result = checkDomain('www.example.com', scamDomains);

      expect(result.isScam).toBe(true);
      expect(result.reason).toBe('Podvodný e-shop');
      expect(result.matchedDomain).toBe('example.com');
    });

    test('should match deep subdomain to parent domain', () => {
      const result = checkDomain('shop.www.example.com', scamDomains);

      expect(result.isScam).toBe(true);
      expect(result.matchedDomain).toBe('example.com');
    });

    test('should not match partial domain names', () => {
      const result = checkDomain('notexample.com', scamDomains);

      expect(result.isScam).toBe(false);
    });

    test('should not match domain as subdomain', () => {
      // example.com is in list, but com.example should not match
      const result = checkDomain('com.example', scamDomains);

      expect(result.isScam).toBe(false);
    });

    test('should handle empty scam list', () => {
      const emptyList = new Map();
      const result = checkDomain('example.com', emptyList);

      expect(result.isScam).toBe(false);
    });

    test('should handle empty domain', () => {
      const result = checkDomain('', scamDomains);

      expect(result.isScam).toBe(false);
    });

    test('should be case-insensitive', () => {
      const result1 = checkDomain('EXAMPLE.COM', scamDomains);
      const result2 = checkDomain('Example.Com', scamDomains);

      expect(result1.isScam).toBe(true);
      expect(result2.isScam).toBe(true);
    });

    test('should match multiple levels of subdomains', () => {
      const testCases = [
        'www.example.com',
        'shop.example.com',
        'admin.shop.example.com',
        'a.b.c.example.com'
      ];

      testCases.forEach(domain => {
        const result = checkDomain(domain, scamDomains);
        expect(result.isScam).toBe(true);
        expect(result.matchedDomain).toBe('example.com');
      });
    });

    test('should match Czech domains correctly', () => {
      const result = checkDomain('fake-shop.cz', scamDomains);

      expect(result.isScam).toBe(true);
      expect(result.reason).toBe('Nedodání zboží');
    });

    test('should handle domains with hyphens', () => {
      const result = checkDomain('www.fake-shop.cz', scamDomains);

      expect(result.isScam).toBe(true);
    });

    test('should not match similar but different domains', () => {
      const testCases = [
        'example.org',
        'example.net',
        'example2.com',
        'myexample.com'
      ];

      testCases.forEach(domain => {
        const result = checkDomain(domain, scamDomains);
        expect(result.isScam).toBe(false);
      });
    });
  });
});

describe('Edge Cases', () => {
  test('should handle very long domain names', () => {
    const longDomain = 'very.long.subdomain.with.many.levels.example.com';
    const scamDomains = new Map([['example.com', 'Test']]);

    const result = checkDomain(longDomain, scamDomains);
    expect(result.isScam).toBe(true);
  });

  test('should handle domains with numbers', () => {
    const scamDomains = new Map([['shop123.com', 'Test']]);

    const result1 = checkDomain('shop123.com', scamDomains);
    const result2 = checkDomain('www.shop123.com', scamDomains);

    expect(result1.isScam).toBe(true);
    expect(result2.isScam).toBe(true);
  });

  test('should handle single-letter domains', () => {
    const scamDomains = new Map([['x.com', 'Test']]);

    const result = checkDomain('x.com', scamDomains);
    expect(result.isScam).toBe(true);
  });

  test('should handle domains with multiple dots in TLD', () => {
    const scamDomains = new Map([['example.co.uk', 'Test']]);

    const result1 = checkDomain('example.co.uk', scamDomains);
    const result2 = checkDomain('www.example.co.uk', scamDomains);

    expect(result1.isScam).toBe(true);
    expect(result2.isScam).toBe(true);
  });

  test('should handle punycode domains', () => {
    const scamDomains = new Map([['xn--e1afmkfd.xn--p1ai', 'Test']]);

    const result = checkDomain('xn--e1afmkfd.xn--p1ai', scamDomains);
    expect(result.isScam).toBe(true);
  });
});

describe('Performance', () => {
  test('should handle large domain lists efficiently', () => {
    const largeDomainList = new Map();
    for (let i = 0; i < 10000; i++) {
      largeDomainList.set(`scam${i}.com`, `Reason ${i}`);
    }

    const start = performance.now();
    const result = checkDomain('scam5000.com', largeDomainList);
    const end = performance.now();

    expect(result.isScam).toBe(true);
    expect(end - start).toBeLessThan(100); // Should complete in less than 100ms
  });

  test('should handle subdomain matching with large lists', () => {
    const largeDomainList = new Map();
    for (let i = 0; i < 10000; i++) {
      largeDomainList.set(`scam${i}.com`, `Reason ${i}`);
    }

    const start = performance.now();
    const result = checkDomain('www.scam5000.com', largeDomainList);
    const end = performance.now();

    expect(result.isScam).toBe(true);
    expect(end - start).toBeLessThan(1000); // Should complete in less than 1 second
  });
});
