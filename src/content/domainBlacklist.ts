export type DomainMatchStrategy = (hostname: string, domain: string) => boolean;

const defaultMatchStrategy: DomainMatchStrategy = (hostname, domain) =>
  hostname === domain || hostname.endsWith(`.${domain}`);

export class DomainBlacklist {
  private readonly domains: readonly string[];
  private readonly matchStrategy: DomainMatchStrategy;

  constructor(
    domains: readonly string[],
    matchStrategy: DomainMatchStrategy = defaultMatchStrategy,
  ) {
    this.domains = domains.map(DomainBlacklist.normalizeHost);
    this.matchStrategy = matchStrategy;
  }

  public contains(hostname: string): boolean {
    const normalizedHostname = DomainBlacklist.normalizeHost(hostname);
    return this.domains.some((domain) =>
      this.matchStrategy(normalizedHostname, domain),
    );
  }

  private static normalizeHost(value: string): string {
    return value.trim().toLowerCase();
  }
}
