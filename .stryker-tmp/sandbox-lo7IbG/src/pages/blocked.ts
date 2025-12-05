function stryNS_9fa48() {
  var g = typeof globalThis === 'object' && globalThis && globalThis.Math === Math && globalThis || new Function("return this")();
  var ns = g.__stryker__ || (g.__stryker__ = {});
  if (ns.activeMutant === undefined && g.process && g.process.env && g.process.env.__STRYKER_ACTIVE_MUTANT__) {
    ns.activeMutant = g.process.env.__STRYKER_ACTIVE_MUTANT__;
  }
  function retrieveNS() {
    return ns;
  }
  stryNS_9fa48 = retrieveNS;
  return retrieveNS();
}
stryNS_9fa48();
function stryCov_9fa48() {
  var ns = stryNS_9fa48();
  var cov = ns.mutantCoverage || (ns.mutantCoverage = {
    static: {},
    perTest: {}
  });
  function cover() {
    var c = cov.static;
    if (ns.currentTestId) {
      c = cov.perTest[ns.currentTestId] = cov.perTest[ns.currentTestId] || {};
    }
    var a = arguments;
    for (var i = 0; i < a.length; i++) {
      c[a[i]] = (c[a[i]] || 0) + 1;
    }
  }
  stryCov_9fa48 = cover;
  cover.apply(null, arguments);
}
function stryMutAct_9fa48(id) {
  var ns = stryNS_9fa48();
  function isActive(id) {
    if (ns.activeMutant === id) {
      if (ns.hitCount !== void 0 && ++ns.hitCount > ns.hitLimit) {
        throw new Error('Stryker: Hit count limit reached (' + ns.hitCount + ')');
      }
      return true;
    }
    return false;
  }
  stryMutAct_9fa48 = isActive;
  return isActive(id);
}
import './blocked.css';
// Logic for the blocked page

document.addEventListener(stryMutAct_9fa48("464") ? "" : (stryCov_9fa48("464"), 'DOMContentLoaded'), async () => {
  if (stryMutAct_9fa48("465")) {
    {}
  } else {
    stryCov_9fa48("465");
    const params = new URLSearchParams(window.location.search);
    const originalUrl = params.get(stryMutAct_9fa48("466") ? "" : (stryCov_9fa48("466"), 'url'));
    if (stryMutAct_9fa48("469") ? false : stryMutAct_9fa48("468") ? true : stryMutAct_9fa48("467") ? originalUrl : (stryCov_9fa48("467", "468", "469"), !originalUrl)) {
      if (stryMutAct_9fa48("470")) {
        {}
      } else {
        stryCov_9fa48("470");
        document.body.innerHTML = stryMutAct_9fa48("471") ? "" : (stryCov_9fa48("471"), '<h1>Chyba: Neplatná URL</h1>');
        return;
      }
    }
    const domain = new URL(originalUrl).hostname;
    document.getElementById(stryMutAct_9fa48("472") ? "" : (stryCov_9fa48("472"), 'domain-name'))!.textContent = domain;

    // Load reason from storage
    try {
      if (stryMutAct_9fa48("473")) {
        {}
      } else {
        stryCov_9fa48("473");
        const result = await chrome.storage.local.get(stryMutAct_9fa48("474") ? [] : (stryCov_9fa48("474"), [stryMutAct_9fa48("475") ? "" : (stryCov_9fa48("475"), 'scamDomains')]));
        const rawDomains = result.scamDomains as [string, string][] | undefined;
        const scamDomains = new Map<string, string>(stryMutAct_9fa48("478") ? rawDomains && [] : stryMutAct_9fa48("477") ? false : stryMutAct_9fa48("476") ? true : (stryCov_9fa48("476", "477", "478"), rawDomains || (stryMutAct_9fa48("479") ? ["Stryker was here"] : (stryCov_9fa48("479"), []))));

        // Find the reason (exact match or suffix match)
        let reason = scamDomains.get(domain);
        if (stryMutAct_9fa48("482") ? false : stryMutAct_9fa48("481") ? true : stryMutAct_9fa48("480") ? reason : (stryCov_9fa48("480", "481", "482"), !reason)) {
          if (stryMutAct_9fa48("483")) {
            {}
          } else {
            stryCov_9fa48("483");
            for (const [scamDomain, scamReason] of scamDomains.entries()) {
              if (stryMutAct_9fa48("484")) {
                {}
              } else {
                stryCov_9fa48("484");
                if (stryMutAct_9fa48("487") ? domain.endsWith('.' + scamDomain) && domain === scamDomain : stryMutAct_9fa48("486") ? false : stryMutAct_9fa48("485") ? true : (stryCov_9fa48("485", "486", "487"), (stryMutAct_9fa48("488") ? domain.startsWith('.' + scamDomain) : (stryCov_9fa48("488"), domain.endsWith((stryMutAct_9fa48("489") ? "" : (stryCov_9fa48("489"), '.')) + scamDomain))) || (stryMutAct_9fa48("491") ? domain !== scamDomain : stryMutAct_9fa48("490") ? false : (stryCov_9fa48("490", "491"), domain === scamDomain)))) {
                  if (stryMutAct_9fa48("492")) {
                    {}
                  } else {
                    stryCov_9fa48("492");
                    reason = scamReason;
                    break;
                  }
                }
              }
            }
          }
        }
        document.getElementById(stryMutAct_9fa48("493") ? "" : (stryCov_9fa48("493"), 'reason-text'))!.textContent = stryMutAct_9fa48("496") ? reason && 'Důvod nebyl nalezen.' : stryMutAct_9fa48("495") ? false : stryMutAct_9fa48("494") ? true : (stryCov_9fa48("494", "495", "496"), reason || (stryMutAct_9fa48("497") ? "" : (stryCov_9fa48("497"), 'Důvod nebyl nalezen.')));
      }
    } catch (error) {
      if (stryMutAct_9fa48("498")) {
        {}
      } else {
        stryCov_9fa48("498");
        console.error(stryMutAct_9fa48("499") ? "" : (stryCov_9fa48("499"), 'Failed to load reason:'), error);
        document.getElementById(stryMutAct_9fa48("500") ? "" : (stryCov_9fa48("500"), 'reason-text'))!.textContent = stryMutAct_9fa48("501") ? "" : (stryCov_9fa48("501"), 'Nepodařilo se načíst důvod.');
      }
    }

    // Event Listeners

    // Toggle details
    const toggleBtn = document.getElementById(stryMutAct_9fa48("502") ? "" : (stryCov_9fa48("502"), 'fair-store-toggle-details'));
    const detailsContent = document.getElementById(stryMutAct_9fa48("503") ? "" : (stryCov_9fa48("503"), 'fair-store-details-content'));
    const chevron = document.querySelector('.fair-store-chevron') as HTMLElement;
    if (stryMutAct_9fa48("506") ? toggleBtn || detailsContent : stryMutAct_9fa48("505") ? false : stryMutAct_9fa48("504") ? true : (stryCov_9fa48("504", "505", "506"), toggleBtn && detailsContent)) {
      if (stryMutAct_9fa48("507")) {
        {}
      } else {
        stryCov_9fa48("507");
        toggleBtn.addEventListener(stryMutAct_9fa48("508") ? "" : (stryCov_9fa48("508"), 'click'), () => {
          if (stryMutAct_9fa48("509")) {
            {}
          } else {
            stryCov_9fa48("509");
            const isExpanded = stryMutAct_9fa48("512") ? toggleBtn.getAttribute('aria-expanded') !== 'true' : stryMutAct_9fa48("511") ? false : stryMutAct_9fa48("510") ? true : (stryCov_9fa48("510", "511", "512"), toggleBtn.getAttribute(stryMutAct_9fa48("513") ? "" : (stryCov_9fa48("513"), 'aria-expanded')) === (stryMutAct_9fa48("514") ? "" : (stryCov_9fa48("514"), 'true')));
            toggleBtn.setAttribute(stryMutAct_9fa48("515") ? "" : (stryCov_9fa48("515"), 'aria-expanded'), (stryMutAct_9fa48("516") ? isExpanded : (stryCov_9fa48("516"), !isExpanded)).toString());
            if (stryMutAct_9fa48("518") ? false : stryMutAct_9fa48("517") ? true : (stryCov_9fa48("517", "518"), isExpanded)) {
              if (stryMutAct_9fa48("519")) {
                {}
              } else {
                stryCov_9fa48("519");
                detailsContent.classList.remove(stryMutAct_9fa48("520") ? "" : (stryCov_9fa48("520"), 'expanded'));
                if (stryMutAct_9fa48("522") ? false : stryMutAct_9fa48("521") ? true : (stryCov_9fa48("521", "522"), chevron)) chevron.style.transform = stryMutAct_9fa48("523") ? "" : (stryCov_9fa48("523"), 'rotate(0deg)');
              }
            } else {
              if (stryMutAct_9fa48("524")) {
                {}
              } else {
                stryCov_9fa48("524");
                detailsContent.classList.add(stryMutAct_9fa48("525") ? "" : (stryCov_9fa48("525"), 'expanded'));
                if (stryMutAct_9fa48("527") ? false : stryMutAct_9fa48("526") ? true : (stryCov_9fa48("526", "527"), chevron)) chevron.style.transform = stryMutAct_9fa48("528") ? "" : (stryCov_9fa48("528"), 'rotate(180deg)');
              }
            }
          }
        });
      }
    }

    // Close Tab / Go to Safety
    stryMutAct_9fa48("529") ? document.getElementById('fair-store-close-tab').addEventListener('click', () => {
      // Try to close the tab
      chrome.tabs.getCurrent(tab => {
        if (tab && tab.id) {
          chrome.tabs.remove(tab.id);
        } else {
          // Fallback if not opened as a tab (unlikely) or script context issue
          window.location.href = 'https://www.google.com';
        }
      });
    }) : (stryCov_9fa48("529"), document.getElementById(stryMutAct_9fa48("530") ? "" : (stryCov_9fa48("530"), 'fair-store-close-tab'))?.addEventListener(stryMutAct_9fa48("531") ? "" : (stryCov_9fa48("531"), 'click'), () => {
      if (stryMutAct_9fa48("532")) {
        {}
      } else {
        stryCov_9fa48("532");
        // Try to close the tab
        chrome.tabs.getCurrent(tab => {
          if (stryMutAct_9fa48("533")) {
            {}
          } else {
            stryCov_9fa48("533");
            if (stryMutAct_9fa48("536") ? tab || tab.id : stryMutAct_9fa48("535") ? false : stryMutAct_9fa48("534") ? true : (stryCov_9fa48("534", "535", "536"), tab && tab.id)) {
              if (stryMutAct_9fa48("537")) {
                {}
              } else {
                stryCov_9fa48("537");
                chrome.tabs.remove(tab.id);
              }
            } else {
              if (stryMutAct_9fa48("538")) {
                {}
              } else {
                stryCov_9fa48("538");
                // Fallback if not opened as a tab (unlikely) or script context issue
                window.location.href = stryMutAct_9fa48("539") ? "" : (stryCov_9fa48("539"), 'https://www.google.com');
              }
            }
          }
        });
      }
    }));

    // Ignore Warning (Allow Domain)
    stryMutAct_9fa48("540") ? document.getElementById('fair-store-ignore-warning').addEventListener('click', async () => {
      try {
        // Send message to background to allow this domain
        await chrome.runtime.sendMessage({
          action: 'allowDomain',
          domain: domain
        });

        // Redirect back to the original URL
        window.location.href = originalUrl;
      } catch (error) {
        console.error('Failed to allow domain:', error);
        alert('Chyba: Nepodařilo se udělit výjimku.');
      }
    }) : (stryCov_9fa48("540"), document.getElementById(stryMutAct_9fa48("541") ? "" : (stryCov_9fa48("541"), 'fair-store-ignore-warning'))?.addEventListener(stryMutAct_9fa48("542") ? "" : (stryCov_9fa48("542"), 'click'), async () => {
      if (stryMutAct_9fa48("543")) {
        {}
      } else {
        stryCov_9fa48("543");
        try {
          if (stryMutAct_9fa48("544")) {
            {}
          } else {
            stryCov_9fa48("544");
            // Send message to background to allow this domain
            await chrome.runtime.sendMessage(stryMutAct_9fa48("545") ? {} : (stryCov_9fa48("545"), {
              action: stryMutAct_9fa48("546") ? "" : (stryCov_9fa48("546"), 'allowDomain'),
              domain: domain
            }));

            // Redirect back to the original URL
            window.location.href = originalUrl;
          }
        } catch (error) {
          if (stryMutAct_9fa48("547")) {
            {}
          } else {
            stryCov_9fa48("547");
            console.error(stryMutAct_9fa48("548") ? "" : (stryCov_9fa48("548"), 'Failed to allow domain:'), error);
            alert(stryMutAct_9fa48("549") ? "" : (stryCov_9fa48("549"), 'Chyba: Nepodařilo se udělit výjimku.'));
          }
        }
      }
    }));
  }
});