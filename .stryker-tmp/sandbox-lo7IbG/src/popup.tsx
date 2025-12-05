import { render } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import './popup.css';

interface DomainStatus {
  domain: string;
  isSafe: boolean;
  isWhitelisted: boolean;
  reason?: string;
  isBlockedPage: boolean;
}

interface ProtectionState {
  enabled: boolean;
  lastUpdate: string | null;
  blacklistCount: number;
}

export function Popup() {
  const [status, setStatus] = useState<DomainStatus | null>(null);
  const [protection, setProtection] = useState<ProtectionState>({
    enabled: true,
    lastUpdate: null,
    blacklistCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    checkCurrentDomain();
    loadProtectionState();
  }, []);

  async function loadProtectionState() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getBlacklist' });
      setProtection({
        enabled: response.protectionEnabled,
        lastUpdate: response.lastUpdate || null,
        blacklistCount: response.blacklist?.length || 0
      });
    } catch (error) {
      console.error('Failed to load protection state:', error);
    }
  }

  async function toggleProtection() {
    try {
      const newState = !protection.enabled;
      const response = await chrome.runtime.sendMessage({
        action: 'setProtection',
        enabled: newState
      });

      if (response.success) {
        setProtection(prev => ({ ...prev, enabled: response.protectionEnabled }));
      }
    } catch (error) {
      console.error('Failed to toggle protection:', error);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const response = await chrome.runtime.sendMessage({ action: 'refreshBlacklist' });

      if (response.success) {
        setProtection(prev => ({
          ...prev,
          blacklistCount: response.count,
          lastUpdate: response.lastUpdate
        }));
      }
    } catch (error) {
      console.error('Failed to refresh blacklist:', error);
    } finally {
      setRefreshing(false);
    }
  }

  async function checkCurrentDomain() {
    try {
      // Get the current active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab.url) {
        setLoading(false);
        return;
      }

      let targetDomain: string;
      let isBlockedPage = false;

      // Check if we're on the blocked page
      if (tab.url.includes('blocked.html')) {
        isBlockedPage = true;
        // Extract domain from URL parameter
        const url = new URL(tab.url);
        const originalUrl = url.searchParams.get('url');
        if (originalUrl) {
          targetDomain = new URL(originalUrl).hostname;
        } else {
          setLoading(false);
          return;
        }
      } else {
        // Normal page - extract domain from current URL
        try {
          targetDomain = new URL(tab.url).hostname;
        } catch (error) {
          setLoading(false);
          return;
        }
      }

      // Get scam domains and check status
      const result = await chrome.storage.local.get(['scamDomains']);
      const rawDomains = result.scamDomains as [string, string][] | undefined;
      const scamDomains = new Map<string, string>(rawDomains || []);

      // Check if domain is in scam list
      let reason: string | undefined;
      let isInScamList = false;

      if (scamDomains.has(targetDomain)) {
        reason = scamDomains.get(targetDomain);
        isInScamList = true;
      } else {
        // Check for suffix match
        for (const [scamDomain, scamReason] of scamDomains.entries()) {
          if (targetDomain.endsWith('.' + scamDomain) || targetDomain === scamDomain) {
            reason = scamReason;
            isInScamList = true;
            break;
          }
        }
      }

      // If user is on the actual risky site (NOT on blocked page), they must have whitelisted it
      // If they're on the blocked page, it means the site is blocked (not whitelisted)
      const isWhitelisted = !isBlockedPage && isInScamList;

      setStatus({
        domain: targetDomain,
        isSafe: !isInScamList,
        isWhitelisted: isWhitelisted,
        reason: reason,
        isBlockedPage: isBlockedPage
      });

      setLoading(false);
    } catch (error) {
      console.error('Failed to check domain:', error);
      setLoading(false);
    }
  }

  function formatDate(isoString: string | null): string {
    if (!isoString) return 'Nikdy';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('cs-CZ', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Neznámé';
    }
  }

  if (loading) {
    return (
      <div className="container">
        <h1>Fair Store</h1>
        <p>Načítání...</p>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>Fair Store</h1>

      {/* Protection Toggle */}
      <div className="protection-toggle">
        <label className="toggle-label">
          <span>Ochrana</span>
          <div
            className={`toggle-switch ${protection.enabled ? 'active' : ''}`}
            onClick={toggleProtection}
            role="switch"
            aria-checked={protection.enabled}
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && toggleProtection()}
          >
            <div className="toggle-slider"></div>
          </div>
          <span className={`toggle-status ${protection.enabled ? 'on' : 'off'}`}>
            {protection.enabled ? 'Zapnuta' : 'Vypnuta'}
          </span>
        </label>
      </div>

      {/* Protection Disabled Warning */}
      {!protection.enabled && (
        <div className="status-warning">
          <p>⚠️ Ochrana je dočasně vypnuta. Zapne se automaticky při příštím spuštění prohlížeče.</p>
        </div>
      )}

      {/* Domain Status */}
      {status && (
        <>
          <div className="domain-info">
            <strong>Doména:</strong> {status.domain}
          </div>

          {status.isSafe ? (
            <div className="status-safe">
              <h2>✅ Bezpečná stránka</h2>
              <p>Tato doména není v seznamu rizikových e-shopů ČOI.</p>
            </div>
          ) : status.isWhitelisted ? (
            <div className="status-whitelisted">
              <h2>⚠️ Rizikový e-shop</h2>
              <p><strong>Navštěvujete tuto stránku na vlastní nebezpečí.</strong></p>
              {status.reason && (
                <div className="reason">
                  <strong>Důvod zařazení do seznamu ČOI:</strong> {status.reason}
                </div>
              )}
              <p className="warning-text">
                Tato doména je v seznamu rizikových e-shopů ČOI.
                Doporučujeme opatrnost při zadávání osobních údajů nebo platebních informací.
              </p>
            </div>
          ) : status.isBlockedPage ? (
            <div className="status-danger">
              <h2>🛡️ Stránka blokována</h2>
              <p>Tato stránka je blokována pro vaši ochranu.</p>
              {status.reason && (
                <div className="reason">
                  <strong>Důvod zařazení do seznamu ČOI:</strong> {status.reason}
                </div>
              )}
            </div>
          ) : (
            <div className="status-danger">
              <h2>🛡️ Chráněno</h2>
              <p>Tato stránka je blokována extensionem Fair Store.</p>
            </div>
          )}
        </>
      )}

      {!status && (
        <div className="status-info">
          <p>Není k dispozici informace o aktuální stránce.</p>
        </div>
      )}

      {/* Blacklist Info & Refresh */}
      <div className="blacklist-info">
        <div className="info-row">
          <span>Domén v seznamu:</span>
          <strong>{protection.blacklistCount}</strong>
        </div>
        <div className="info-row">
          <span>Poslední aktualizace:</span>
          <strong>{formatDate(protection.lastUpdate)}</strong>
        </div>
        <button
          className="refresh-button"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          {refreshing ? 'Aktualizuji...' : '🔄 Aktualizovat seznam'}
        </button>
      </div>
    </div>
  );
}

render(<Popup />, document.getElementById('root')!);
