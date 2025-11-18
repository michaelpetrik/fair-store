import { describe, expect, it } from 'vitest';
import { DomainBlacklist, type DomainMatchStrategy } from './domainBlacklist';

describe('DomainBlacklist', () => {
  it('detects exact hostname matches', () => {
    const blacklist = new DomainBlacklist(['google.com']);

    expect(blacklist.contains('google.com')).toBe(true);
  });

  it('detects subdomain matches using default strategy', () => {
    const blacklist = new DomainBlacklist(['google.com']);

    expect(blacklist.contains('maps.google.com')).toBe(true);
  });

  it('ignores domains that do not match', () => {
    const blacklist = new DomainBlacklist(['google.com']);

    expect(blacklist.contains('example.com')).toBe(false);
  });

  it('normalizes hostnames for comparisons', () => {
    const blacklist = new DomainBlacklist([' Google.COM ']);

    expect(blacklist.contains('GOOGLE.com')).toBe(true);
  });

  it('supports custom match strategies', () => {
    const startsWithStrategy: DomainMatchStrategy = (hostname, domain) =>
      hostname.startsWith(domain);
    const blacklist = new DomainBlacklist(['start'], startsWithStrategy);

    expect(blacklist.contains('start-example.com')).toBe(true);
    expect(blacklist.contains('example-start.com')).toBe(false);
  });
});
