import { render } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import './popup.css';

interface DomainStatus {
  domain: string;
  isSafe: boolean;
  isWhitelisted: boolean;
  isBlacklisted: boolean; // NEW: Explicitly track blacklist status
  reason?: string;
  isBlockedPage: boolean;
}

/**
 * Sanitize text for display - prevents XSS attacks
 */
function sanitizeText(text: string): string {
  if (!text || typeof text !== 'string') return '';
  // Remove control characters and limit length
  return text.replace(/[\x00-\x1F\x7F]/g, '').substring(0, 500);
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
          try {
            targetDomain = new URL(originalUrl).hostname;
          } catch {
            setLoading(false);
            return;
          }
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

      // Security: Query background script for domain status
      try {
        const response = await chrome.runtime.sendMessage({
          action: 'checkDomain',
          url: tab.url
        });

        if (response && response.domain) {
          targetDomain = response.domain;

          const isBlacklisted = response.isScam;
          const isWhitelisted = response.isWhitelisted;

          setStatus({
            domain: sanitizeText(targetDomain),
            isSafe: !isBlacklisted,
            isBlacklisted: isBlacklisted,
            isWhitelisted: isWhitelisted,
            reason: response.reason ? sanitizeText(response.reason) : undefined,
            isBlockedPage: isBlockedPage
          });
        }
      } catch (error) {
        console.error('Failed to query background:', error);
      }

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
      <div className="container loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="container">
      <header className="header">
        <img src="/icons/fair_store.png" alt="Fair Store" className="logo" />
        <div className="protection-switch">
          <label className="toggle">
            <input
              type="checkbox"
              checked={protection.enabled}
              onChange={toggleProtection}
            />
            <span className="slider"></span>
          </label>
        </div>
      </header>

      {!protection.enabled && (
        <div className="protection-off-banner">
          Ochrana je vypnuta
        </div>
      )}

      <main className="main-content">
        {status ? (
          <div className={`status-card ${status.isSafe ? 'safe' : status.isWhitelisted ? 'whitelisted' : 'danger'}`}>
            <div className="status-icon">
              {status.isSafe ? '✅' : status.isWhitelisted ? '⚠️' : '⛔'}
            </div>
            <h2 className="domain-name">{status.domain}</h2>
            <div className="status-badge">
              {status.isSafe ? 'BEZPEČNÁ STRÁNKA' : status.isWhitelisted ? 'RIZIKO (POVOLENO)' : 'RIZIKOVÝ E-SHOP'}
            </div>

            {!status.isSafe && (
              <div className="reason-text">
                {status.reason || 'Důvod neuveden'}
              </div>
            )}
          </div>
        ) : (
          <div className="status-card unknown">
            <div className="status-icon">❓</div>
            <p>Neznámá stránka</p>
          </div>
        )}
      </main>

      <footer className="footer">
        <div className="db-info">
          <div className="db-stats">
            <span className="db-count">{protection.blacklistCount.toLocaleString()}</span>
            <span className="db-label">e-shopů v databázi ČOI</span>
          </div>
          <div className="db-update">
            Poslední aktualizace: {formatDate(protection.lastUpdate)}
          </div>
        </div>
        <button
          className={`refresh-btn ${refreshing ? 'spinning' : ''}`}
          onClick={handleRefresh}
          disabled={refreshing}
          title="Aktualizovat databázi"
        >
          🔄
        </button>
      </footer>
    </div>
  );
}

render(<Popup />, document.getElementById('root')!);
