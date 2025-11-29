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

export function Popup() {
  const [status, setStatus] = useState<DomainStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkCurrentDomain();
  }, []);

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

  if (loading) {
    return (
      <div className="container">
        <h1>Fair Store</h1>
        <p>Načítání...</p>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="container">
        <h1>Fair Store</h1>
        <p>Není k dispozici informace o aktuální stránce.</p>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>Fair Store</h1>

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
    </div>
  );
}

render(<Popup />, document.getElementById('root')!);









