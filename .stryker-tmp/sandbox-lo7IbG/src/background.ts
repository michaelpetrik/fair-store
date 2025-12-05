// Background service worker for Fair Store extension
// Monitors navigation and checks domains against ČOI database

// URL of ČOI risk list
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
const COI_CSV_URL = stryMutAct_9fa48("218") ? "" : (stryCov_9fa48("218"), 'https://www.coi.gov.cz/userdata/files/dokumenty-ke-stazeni/open-data/rizikove-seznam.csv');

// Store domains with their reasons (persistent in local storage)
export let scamDomains = new Map<string, string>();

// Store allowed domains for the current session (user clicked "Continue")
// This resets on every session start (browser restart)
export let allowedDomains = new Set<string>();

// Store last update timestamp
let lastUpdate: string | null = null;

// Protection state - defaults to TRUE, stored in session storage
// Resets to TRUE on every session start
let protectionEnabled = stryMutAct_9fa48("219") ? false : (stryCov_9fa48("219"), true);

// ============================================================================
// LIFECYCLE EVENTS
// ============================================================================

/**
 * Called when extension is installed or updated
 * FR-1.1: Fetch blacklist on extension install
 */
chrome.runtime.onInstalled.addListener(async () => {
  if (stryMutAct_9fa48("220")) {
    {}
  } else {
    stryCov_9fa48("220");
    console.log(stryMutAct_9fa48("221") ? "" : (stryCov_9fa48("221"), 'Fair Store extension installed/updated'));

    // FR-2.1: Protection is ON by default
    protectionEnabled = stryMutAct_9fa48("222") ? false : (stryCov_9fa48("222"), true);
    await chrome.storage.session.set(stryMutAct_9fa48("223") ? {} : (stryCov_9fa48("223"), {
      protectionEnabled: stryMutAct_9fa48("224") ? false : (stryCov_9fa48("224"), true)
    }));

    // FR-5.1: Whitelist is empty at session start
    allowedDomains.clear();

    // FR-1.1: Fetch blacklist on install
    await loadScamDomains();
  }
});

/**
 * Called when browser starts a new session
 * FR-1.2: Fetch blacklist on browser startup
 */
chrome.runtime.onStartup.addListener(async () => {
  if (stryMutAct_9fa48("225")) {
    {}
  } else {
    stryCov_9fa48("225");
    console.log(stryMutAct_9fa48("226") ? "" : (stryCov_9fa48("226"), 'Browser session started'));

    // FR-2.1: Protection is ON by default at every session start
    protectionEnabled = stryMutAct_9fa48("227") ? false : (stryCov_9fa48("227"), true);
    await chrome.storage.session.set(stryMutAct_9fa48("228") ? {} : (stryCov_9fa48("228"), {
      protectionEnabled: stryMutAct_9fa48("229") ? false : (stryCov_9fa48("229"), true)
    }));

    // FR-5.1, FR-5.5: Whitelist clears on session start
    allowedDomains.clear();

    // FR-1.2: Fetch blacklist on browser startup
    await loadScamDomains();
  }
});

// ============================================================================
// CSV PARSING
// ============================================================================

/**
 * Parse CSV file from ČOI
 * FR-1.7: Handle Windows-1250 encoding from ČOI CSV
 */
export function parseCSV(csvText: string): Map<string, string> {
  if (stryMutAct_9fa48("230")) {
    {}
  } else {
    stryCov_9fa48("230");
    const domains = new Map<string, string>();
    try {
      if (stryMutAct_9fa48("231")) {
        {}
      } else {
        stryCov_9fa48("231");
        const lines = stryMutAct_9fa48("232") ? csvText.split('\n') : (stryCov_9fa48("232"), csvText.trim().split(stryMutAct_9fa48("233") ? "" : (stryCov_9fa48("233"), '\n')));
        if (stryMutAct_9fa48("236") ? lines.length !== 0 : stryMutAct_9fa48("235") ? false : stryMutAct_9fa48("234") ? true : (stryCov_9fa48("234", "235", "236"), lines.length === 0)) return domains;
        const delimiter = lines[0].includes(stryMutAct_9fa48("237") ? "" : (stryCov_9fa48("237"), ';')) ? stryMutAct_9fa48("238") ? "" : (stryCov_9fa48("238"), ';') : stryMutAct_9fa48("239") ? "" : (stryCov_9fa48("239"), ',');

        // ČOI CSV has no header row, start from line 0
        for (let i = 0; stryMutAct_9fa48("242") ? i >= lines.length : stryMutAct_9fa48("241") ? i <= lines.length : stryMutAct_9fa48("240") ? false : (stryCov_9fa48("240", "241", "242"), i < lines.length); stryMutAct_9fa48("243") ? i-- : (stryCov_9fa48("243"), i++)) {
          if (stryMutAct_9fa48("244")) {
            {}
          } else {
            stryCov_9fa48("244");
            const line = stryMutAct_9fa48("245") ? lines[i] : (stryCov_9fa48("245"), lines[i].trim());
            if (stryMutAct_9fa48("248") ? false : stryMutAct_9fa48("247") ? true : stryMutAct_9fa48("246") ? line : (stryCov_9fa48("246", "247", "248"), !line)) continue;

            // Strip both double quotes and single quotes
            const columns = line.split(delimiter).map(stryMutAct_9fa48("249") ? () => undefined : (stryCov_9fa48("249"), c => stryMutAct_9fa48("250") ? c.replace(/^"|"$/g, '').replace(/^'|'$/g, '') : (stryCov_9fa48("250"), c.trim().replace(stryMutAct_9fa48("252") ? /^"|"/g : stryMutAct_9fa48("251") ? /"|"$/g : (stryCov_9fa48("251", "252"), /^"|"$/g), stryMutAct_9fa48("253") ? "Stryker was here!" : (stryCov_9fa48("253"), '')).replace(stryMutAct_9fa48("255") ? /^'|'/g : stryMutAct_9fa48("254") ? /'|'$/g : (stryCov_9fa48("254", "255"), /^'|'$/g), stryMutAct_9fa48("256") ? "Stryker was here!" : (stryCov_9fa48("256"), '')))));
            let domain = columns[0];
            const reason = stryMutAct_9fa48("259") ? columns[1] && 'Zařazeno do seznamu rizikových e-shopů ČOI' : stryMutAct_9fa48("258") ? false : stryMutAct_9fa48("257") ? true : (stryCov_9fa48("257", "258", "259"), columns[1] || (stryMutAct_9fa48("260") ? "" : (stryCov_9fa48("260"), 'Zařazeno do seznamu rizikových e-shopů ČOI')));
            domain = cleanDomain(domain);
            if (stryMutAct_9fa48("262") ? false : stryMutAct_9fa48("261") ? true : (stryCov_9fa48("261", "262"), domain)) {
              if (stryMutAct_9fa48("263")) {
                {}
              } else {
                stryCov_9fa48("263");
                domains.set(domain, reason);
              }
            }
          }
        }
      }
    } catch (error) {
      if (stryMutAct_9fa48("264")) {
        {}
      } else {
        stryCov_9fa48("264");
        console.error(stryMutAct_9fa48("265") ? "" : (stryCov_9fa48("265"), 'Error parsing CSV:'), error);
      }
    }
    return domains;
  }
}

/**
 * Clean domain string - extract hostname from URL or domain string
 */
export function cleanDomain(domain: string): string {
  if (stryMutAct_9fa48("266")) {
    {}
  } else {
    stryCov_9fa48("266");
    if (stryMutAct_9fa48("269") ? false : stryMutAct_9fa48("268") ? true : stryMutAct_9fa48("267") ? domain : (stryCov_9fa48("267", "268", "269"), !domain)) return stryMutAct_9fa48("270") ? "Stryker was here!" : (stryCov_9fa48("270"), '');
    try {
      if (stryMutAct_9fa48("271")) {
        {}
      } else {
        stryCov_9fa48("271");
        const urlStr = domain.match(stryMutAct_9fa48("273") ? /^https:\/\// : stryMutAct_9fa48("272") ? /https?:\/\// : (stryCov_9fa48("272", "273"), /^https?:\/\//)) ? domain : (stryMutAct_9fa48("274") ? "" : (stryCov_9fa48("274"), 'http://')) + domain;
        const url = new URL(urlStr);
        return stryMutAct_9fa48("275") ? url.hostname.toUpperCase() : (stryCov_9fa48("275"), url.hostname.toLowerCase());
      }
    } catch (e) {
      if (stryMutAct_9fa48("276")) {
        {}
      } else {
        stryCov_9fa48("276");
        return stryMutAct_9fa48("278") ? domain.replace(/^https?:\/\//, '').split('/')[0].split('?')[0].split(':')[0].toUpperCase().trim() : stryMutAct_9fa48("277") ? domain.replace(/^https?:\/\//, '').split('/')[0].split('?')[0].split(':')[0].toLowerCase() : (stryCov_9fa48("277", "278"), domain.replace(stryMutAct_9fa48("280") ? /^https:\/\// : stryMutAct_9fa48("279") ? /https?:\/\// : (stryCov_9fa48("279", "280"), /^https?:\/\//), stryMutAct_9fa48("281") ? "Stryker was here!" : (stryCov_9fa48("281"), '')).split(stryMutAct_9fa48("282") ? "" : (stryCov_9fa48("282"), '/'))[0].split(stryMutAct_9fa48("283") ? "" : (stryCov_9fa48("283"), '?'))[0].split(stryMutAct_9fa48("284") ? "" : (stryCov_9fa48("284"), ':'))[0].toLowerCase().trim());
      }
    }
  }
}

// ============================================================================
// BLACKLIST LOADING
// ============================================================================

/**
 * Load scam domains from ČOI website with fallbacks
 * FR-1.5: Store blacklist in local storage with timestamp
 * FR-1.6: Fallback to cached data if network fetch fails
 */
export async function loadScamDomains(): Promise<void> {
  if (stryMutAct_9fa48("285")) {
    {}
  } else {
    stryCov_9fa48("285");
    // Try to fetch from government website
    try {
      if (stryMutAct_9fa48("286")) {
        {}
      } else {
        stryCov_9fa48("286");
        console.log(stryMutAct_9fa48("287") ? "" : (stryCov_9fa48("287"), 'Fetching ČOI risk list from web...'));
        const response = await fetch(COI_CSV_URL);
        if (stryMutAct_9fa48("290") ? false : stryMutAct_9fa48("289") ? true : stryMutAct_9fa48("288") ? response.ok : (stryCov_9fa48("288", "289", "290"), !response.ok)) throw new Error(stryMutAct_9fa48("291") ? `` : (stryCov_9fa48("291"), `HTTP error! status: ${response.status}`));
        const arrayBuffer = await response.arrayBuffer();
        const decoder = new TextDecoder(stryMutAct_9fa48("292") ? "" : (stryCov_9fa48("292"), 'windows-1250'));
        const csvText = decoder.decode(arrayBuffer);
        const newDomains = parseCSV(csvText);
        scamDomains = newDomains;
        lastUpdate = new Date().toISOString();
        await chrome.storage.local.set(stryMutAct_9fa48("293") ? {} : (stryCov_9fa48("293"), {
          scamDomains: Array.from(scamDomains.entries()),
          lastUpdate: lastUpdate
        }));
        console.log(stryMutAct_9fa48("294") ? `` : (stryCov_9fa48("294"), `✅ Loaded ${scamDomains.size} domains from ČOI`));
        return;
      }
    } catch (error) {
      if (stryMutAct_9fa48("295")) {
        {}
      } else {
        stryCov_9fa48("295");
        console.error(stryMutAct_9fa48("296") ? "" : (stryCov_9fa48("296"), 'Failed to load ČOI CSV from web:'), error);
      }
    }

    // Fallback: Load from cache
    try {
      if (stryMutAct_9fa48("297")) {
        {}
      } else {
        stryCov_9fa48("297");
        console.log(stryMutAct_9fa48("298") ? "" : (stryCov_9fa48("298"), 'Trying to load from cache...'));
        const stored = await chrome.storage.local.get(stryMutAct_9fa48("299") ? [] : (stryCov_9fa48("299"), [stryMutAct_9fa48("300") ? "" : (stryCov_9fa48("300"), 'scamDomains'), stryMutAct_9fa48("301") ? "" : (stryCov_9fa48("301"), 'lastUpdate')]));
        if (stryMutAct_9fa48("304") ? stored.scamDomains || stored.scamDomains.length > 0 : stryMutAct_9fa48("303") ? false : stryMutAct_9fa48("302") ? true : (stryCov_9fa48("302", "303", "304"), stored.scamDomains && (stryMutAct_9fa48("307") ? stored.scamDomains.length <= 0 : stryMutAct_9fa48("306") ? stored.scamDomains.length >= 0 : stryMutAct_9fa48("305") ? true : (stryCov_9fa48("305", "306", "307"), stored.scamDomains.length > 0)))) {
          if (stryMutAct_9fa48("308")) {
            {}
          } else {
            stryCov_9fa48("308");
            scamDomains = new Map(stored.scamDomains);
            lastUpdate = stored.lastUpdate;
            console.log(stryMutAct_9fa48("309") ? `` : (stryCov_9fa48("309"), `📦 Loaded ${scamDomains.size} domains from cache`));
            return;
          }
        }
      }
    } catch (storageError) {
      if (stryMutAct_9fa48("310")) {
        {}
      } else {
        stryCov_9fa48("310");
        console.error(stryMutAct_9fa48("311") ? "" : (stryCov_9fa48("311"), 'Failed to load from storage:'), storageError);
      }
    }

    // Fallback: Local CSV
    try {
      if (stryMutAct_9fa48("312")) {
        {}
      } else {
        stryCov_9fa48("312");
        console.log(stryMutAct_9fa48("313") ? "" : (stryCov_9fa48("313"), 'Trying to load local CSV fallback...'));
        const localResponse = await fetch(stryMutAct_9fa48("314") ? "" : (stryCov_9fa48("314"), '/rizikove-seznam.csv'));
        if (stryMutAct_9fa48("316") ? false : stryMutAct_9fa48("315") ? true : (stryCov_9fa48("315", "316"), localResponse.ok)) {
          if (stryMutAct_9fa48("317")) {
            {}
          } else {
            stryCov_9fa48("317");
            const arrayBuffer = await localResponse.arrayBuffer();
            const decoder = new TextDecoder(stryMutAct_9fa48("318") ? "" : (stryCov_9fa48("318"), 'windows-1250'));
            const csvText = decoder.decode(arrayBuffer);
            const newDomains = parseCSV(csvText);
            scamDomains = newDomains;
            lastUpdate = new Date().toISOString();
            await chrome.storage.local.set(stryMutAct_9fa48("319") ? {} : (stryCov_9fa48("319"), {
              scamDomains: Array.from(scamDomains.entries()),
              lastUpdate: lastUpdate
            }));
            console.log(stryMutAct_9fa48("320") ? `` : (stryCov_9fa48("320"), `✅ Loaded ${scamDomains.size} domains from local CSV`));
            return;
          }
        }
      }
    } catch (localError) {
      if (stryMutAct_9fa48("321")) {
        {}
      } else {
        stryCov_9fa48("321");
        console.error(stryMutAct_9fa48("322") ? "" : (stryCov_9fa48("322"), 'Failed to load local CSV:'), localError);
      }
    }
  }
}

// ============================================================================
// DOMAIN CHECKING
// ============================================================================

/**
 * Extract domain from URL
 */
export function extractDomain(url: string): string {
  if (stryMutAct_9fa48("323")) {
    {}
  } else {
    stryCov_9fa48("323");
    try {
      if (stryMutAct_9fa48("324")) {
        {}
      } else {
        stryCov_9fa48("324");
        return stryMutAct_9fa48("325") ? new URL(url).hostname.toUpperCase() : (stryCov_9fa48("325"), new URL(url).hostname.toLowerCase());
      }
    } catch (error) {
      if (stryMutAct_9fa48("326")) {
        {}
      } else {
        stryCov_9fa48("326");
        return stryMutAct_9fa48("327") ? "Stryker was here!" : (stryCov_9fa48("327"), '');
      }
    }
  }
}

/**
 * Check if domain is in scam list
 * FR-3.8: Match subdomains (e.g., www.scam.com matches scam.com)
 * FR-3.5, FR-3.6: Check whitelist before blocking
 */
export function checkDomain(domain: string): {
  isScam: boolean;
  reason: string | null;
  matchedDomain: string | null;
} {
  if (stryMutAct_9fa48("328")) {
    {}
  } else {
    stryCov_9fa48("328");
    domain = stryMutAct_9fa48("329") ? domain.toUpperCase() : (stryCov_9fa48("329"), domain.toLowerCase());

    // FR-3.6: If whitelisted, allow page without overlay
    if (stryMutAct_9fa48("331") ? false : stryMutAct_9fa48("330") ? true : (stryCov_9fa48("330", "331"), allowedDomains.has(domain))) {
      if (stryMutAct_9fa48("332")) {
        {}
      } else {
        stryCov_9fa48("332");
        return stryMutAct_9fa48("333") ? {} : (stryCov_9fa48("333"), {
          isScam: stryMutAct_9fa48("334") ? true : (stryCov_9fa48("334"), false),
          reason: null,
          matchedDomain: null
        });
      }
    }

    // Check exact match
    if (stryMutAct_9fa48("336") ? false : stryMutAct_9fa48("335") ? true : (stryCov_9fa48("335", "336"), scamDomains.has(domain))) {
      if (stryMutAct_9fa48("337")) {
        {}
      } else {
        stryCov_9fa48("337");
        return stryMutAct_9fa48("338") ? {} : (stryCov_9fa48("338"), {
          isScam: stryMutAct_9fa48("339") ? false : (stryCov_9fa48("339"), true),
          reason: stryMutAct_9fa48("342") ? scamDomains.get(domain) && null : stryMutAct_9fa48("341") ? false : stryMutAct_9fa48("340") ? true : (stryCov_9fa48("340", "341", "342"), scamDomains.get(domain) || null),
          matchedDomain: domain
        });
      }
    }

    // Check subdomain match (e.g., www.scam.com -> scam.com)
    for (const [scamDomain, reason] of scamDomains.entries()) {
      if (stryMutAct_9fa48("343")) {
        {}
      } else {
        stryCov_9fa48("343");
        if (stryMutAct_9fa48("346") ? domain.startsWith('.' + scamDomain) : stryMutAct_9fa48("345") ? false : stryMutAct_9fa48("344") ? true : (stryCov_9fa48("344", "345", "346"), domain.endsWith((stryMutAct_9fa48("347") ? "" : (stryCov_9fa48("347"), '.')) + scamDomain))) {
          if (stryMutAct_9fa48("348")) {
            {}
          } else {
            stryCov_9fa48("348");
            return stryMutAct_9fa48("349") ? {} : (stryCov_9fa48("349"), {
              isScam: stryMutAct_9fa48("350") ? false : (stryCov_9fa48("350"), true),
              reason: reason,
              matchedDomain: scamDomain
            });
          }
        }
      }
    }
    return stryMutAct_9fa48("351") ? {} : (stryCov_9fa48("351"), {
      isScam: stryMutAct_9fa48("352") ? true : (stryCov_9fa48("352"), false),
      reason: null,
      matchedDomain: null
    });
  }
}

/**
 * Check if protection is currently enabled
 */
export function isProtectionEnabled(): boolean {
  if (stryMutAct_9fa48("353")) {
    {}
  } else {
    stryCov_9fa48("353");
    return protectionEnabled;
  }
}

// ============================================================================
// TAB MONITORING
// ============================================================================

/**
 * Listen for tab updates to redirect risky sites
 * FR-3.1 through FR-3.7: Complete protection flow
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (stryMutAct_9fa48("354")) {
    {}
  } else {
    stryCov_9fa48("354");
    if (stryMutAct_9fa48("357") ? changeInfo.status === 'loading' || tab.url : stryMutAct_9fa48("356") ? false : stryMutAct_9fa48("355") ? true : (stryCov_9fa48("355", "356", "357"), (stryMutAct_9fa48("359") ? changeInfo.status !== 'loading' : stryMutAct_9fa48("358") ? true : (stryCov_9fa48("358", "359"), changeInfo.status === (stryMutAct_9fa48("360") ? "" : (stryCov_9fa48("360"), 'loading')))) && tab.url)) {
      if (stryMutAct_9fa48("361")) {
        {}
      } else {
        stryCov_9fa48("361");
        const url = tab.url;

        // Skip internal pages
        if (stryMutAct_9fa48("364") ? url.startsWith('chrome://') && url.startsWith('chrome-extension://') : stryMutAct_9fa48("363") ? false : stryMutAct_9fa48("362") ? true : (stryCov_9fa48("362", "363", "364"), (stryMutAct_9fa48("365") ? url.endsWith('chrome://') : (stryCov_9fa48("365"), url.startsWith(stryMutAct_9fa48("366") ? "" : (stryCov_9fa48("366"), 'chrome://')))) || (stryMutAct_9fa48("367") ? url.endsWith('chrome-extension://') : (stryCov_9fa48("367"), url.startsWith(stryMutAct_9fa48("368") ? "" : (stryCov_9fa48("368"), 'chrome-extension://')))))) {
          if (stryMutAct_9fa48("369")) {
            {}
          } else {
            stryCov_9fa48("369");
            return;
          }
        }

        // FR-3.1, FR-3.2: Check if protection is enabled
        if (stryMutAct_9fa48("372") ? false : stryMutAct_9fa48("371") ? true : stryMutAct_9fa48("370") ? protectionEnabled : (stryCov_9fa48("370", "371", "372"), !protectionEnabled)) {
          if (stryMutAct_9fa48("373")) {
            {}
          } else {
            stryCov_9fa48("373");
            // Protection is OFF - allow page (no action)
            return;
          }
        }
        const domain = extractDomain(url);
        if (stryMutAct_9fa48("376") ? false : stryMutAct_9fa48("375") ? true : stryMutAct_9fa48("374") ? domain : (stryCov_9fa48("374", "375", "376"), !domain)) return;

        // FR-3.3 through FR-3.7: Check blacklist and whitelist
        const result = checkDomain(domain);
        if (stryMutAct_9fa48("378") ? false : stryMutAct_9fa48("377") ? true : (stryCov_9fa48("377", "378"), result.isScam)) {
          if (stryMutAct_9fa48("379")) {
            {}
          } else {
            stryCov_9fa48("379");
            console.log(stryMutAct_9fa48("380") ? `` : (stryCov_9fa48("380"), `⚠️ Rizikový e-shop detekován: ${domain}`));
            const blockedUrl = chrome.runtime.getURL(stryMutAct_9fa48("381") ? "" : (stryCov_9fa48("381"), "src/pages/blocked.html")) + (stryMutAct_9fa48("382") ? "" : (stryCov_9fa48("382"), "?url=")) + encodeURIComponent(url);
            chrome.tabs.update(tabId, stryMutAct_9fa48("383") ? {} : (stryCov_9fa48("383"), {
              url: blockedUrl
            }));
          }
        }
      }
    }
  }
});

// ============================================================================
// MESSAGE HANDLERS
// ============================================================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (stryMutAct_9fa48("384")) {
    {}
  } else {
    stryCov_9fa48("384");
    // FR-5.2: Handle allowDomain message (Proceed Anyway)
    if (stryMutAct_9fa48("387") ? message.action !== 'allowDomain' : stryMutAct_9fa48("386") ? false : stryMutAct_9fa48("385") ? true : (stryCov_9fa48("385", "386", "387"), message.action === (stryMutAct_9fa48("388") ? "" : (stryCov_9fa48("388"), 'allowDomain')))) {
      if (stryMutAct_9fa48("389")) {
        {}
      } else {
        stryCov_9fa48("389");
        const domain = message.domain;
        if (stryMutAct_9fa48("391") ? false : stryMutAct_9fa48("390") ? true : (stryCov_9fa48("390", "391"), domain)) {
          if (stryMutAct_9fa48("392")) {
            {}
          } else {
            stryCov_9fa48("392");
            allowedDomains.add(stryMutAct_9fa48("393") ? domain.toUpperCase() : (stryCov_9fa48("393"), domain.toLowerCase()));
            console.log(stryMutAct_9fa48("394") ? `` : (stryCov_9fa48("394"), `Allowed domain: ${domain}`));
            sendResponse(stryMutAct_9fa48("395") ? {} : (stryCov_9fa48("395"), {
              success: stryMutAct_9fa48("396") ? false : (stryCov_9fa48("396"), true)
            }));
          }
        } else {
          if (stryMutAct_9fa48("397")) {
            {}
          } else {
            stryCov_9fa48("397");
            sendResponse(stryMutAct_9fa48("398") ? {} : (stryCov_9fa48("398"), {
              success: stryMutAct_9fa48("399") ? true : (stryCov_9fa48("399"), false)
            }));
          }
        }
        return stryMutAct_9fa48("400") ? false : (stryCov_9fa48("400"), true);
      }
    }

    // Handle getBlacklist message
    if (stryMutAct_9fa48("403") ? message.action !== 'getBlacklist' : stryMutAct_9fa48("402") ? false : stryMutAct_9fa48("401") ? true : (stryCov_9fa48("401", "402", "403"), message.action === (stryMutAct_9fa48("404") ? "" : (stryCov_9fa48("404"), 'getBlacklist')))) {
      if (stryMutAct_9fa48("405")) {
        {}
      } else {
        stryCov_9fa48("405");
        (async () => {
          if (stryMutAct_9fa48("406")) {
            {}
          } else {
            stryCov_9fa48("406");
            const blacklistArray = Array.from(scamDomains.keys());
            sendResponse(stryMutAct_9fa48("407") ? {} : (stryCov_9fa48("407"), {
              blacklist: blacklistArray,
              protectionEnabled: protectionEnabled,
              lastUpdate: lastUpdate
            }));
          }
        })();
        return stryMutAct_9fa48("408") ? false : (stryCov_9fa48("408"), true);
      }
    }

    // Handle checkDomain message
    if (stryMutAct_9fa48("411") ? message.action !== 'checkDomain' : stryMutAct_9fa48("410") ? false : stryMutAct_9fa48("409") ? true : (stryCov_9fa48("409", "410", "411"), message.action === (stryMutAct_9fa48("412") ? "" : (stryCov_9fa48("412"), 'checkDomain')))) {
      if (stryMutAct_9fa48("413")) {
        {}
      } else {
        stryCov_9fa48("413");
        (async () => {
          if (stryMutAct_9fa48("414")) {
            {}
          } else {
            stryCov_9fa48("414");
            const url = message.url;
            if (stryMutAct_9fa48("417") ? false : stryMutAct_9fa48("416") ? true : stryMutAct_9fa48("415") ? url : (stryCov_9fa48("415", "416", "417"), !url)) {
              if (stryMutAct_9fa48("418")) {
                {}
              } else {
                stryCov_9fa48("418");
                sendResponse(stryMutAct_9fa48("419") ? {} : (stryCov_9fa48("419"), {
                  isScam: stryMutAct_9fa48("420") ? true : (stryCov_9fa48("420"), false),
                  isWhitelisted: stryMutAct_9fa48("421") ? true : (stryCov_9fa48("421"), false),
                  protectionEnabled,
                  domain: stryMutAct_9fa48("422") ? "Stryker was here!" : (stryCov_9fa48("422"), '')
                }));
                return;
              }
            }
            const domain = extractDomain(url);
            if (stryMutAct_9fa48("425") ? false : stryMutAct_9fa48("424") ? true : stryMutAct_9fa48("423") ? domain : (stryCov_9fa48("423", "424", "425"), !domain)) {
              if (stryMutAct_9fa48("426")) {
                {}
              } else {
                stryCov_9fa48("426");
                sendResponse(stryMutAct_9fa48("427") ? {} : (stryCov_9fa48("427"), {
                  isScam: stryMutAct_9fa48("428") ? true : (stryCov_9fa48("428"), false),
                  isWhitelisted: stryMutAct_9fa48("429") ? true : (stryCov_9fa48("429"), false),
                  protectionEnabled,
                  domain: stryMutAct_9fa48("430") ? "Stryker was here!" : (stryCov_9fa48("430"), '')
                }));
                return;
              }
            }
            const result = checkDomain(domain);
            const isWhitelisted = allowedDomains.has(stryMutAct_9fa48("431") ? domain.toUpperCase() : (stryCov_9fa48("431"), domain.toLowerCase()));
            sendResponse(stryMutAct_9fa48("432") ? {} : (stryCov_9fa48("432"), {
              isScam: result.isScam,
              isWhitelisted: isWhitelisted,
              protectionEnabled: protectionEnabled,
              domain: domain,
              reason: result.reason,
              matchedDomain: result.matchedDomain
            }));
          }
        })();
        return stryMutAct_9fa48("433") ? false : (stryCov_9fa48("433"), true);
      }
    }

    // FR-2.2 through FR-2.4: Handle setProtection message
    if (stryMutAct_9fa48("436") ? message.action !== 'setProtection' : stryMutAct_9fa48("435") ? false : stryMutAct_9fa48("434") ? true : (stryCov_9fa48("434", "435", "436"), message.action === (stryMutAct_9fa48("437") ? "" : (stryCov_9fa48("437"), 'setProtection')))) {
      if (stryMutAct_9fa48("438")) {
        {}
      } else {
        stryCov_9fa48("438");
        (async () => {
          if (stryMutAct_9fa48("439")) {
            {}
          } else {
            stryCov_9fa48("439");
            protectionEnabled = stryMutAct_9fa48("442") ? message.enabled === false : stryMutAct_9fa48("441") ? false : stryMutAct_9fa48("440") ? true : (stryCov_9fa48("440", "441", "442"), message.enabled !== (stryMutAct_9fa48("443") ? true : (stryCov_9fa48("443"), false)));
            await chrome.storage.session.set(stryMutAct_9fa48("444") ? {} : (stryCov_9fa48("444"), {
              protectionEnabled
            }));
            console.log(stryMutAct_9fa48("445") ? `` : (stryCov_9fa48("445"), `Protection ${protectionEnabled ? stryMutAct_9fa48("446") ? "" : (stryCov_9fa48("446"), 'enabled') : stryMutAct_9fa48("447") ? "" : (stryCov_9fa48("447"), 'disabled')}`));
            sendResponse(stryMutAct_9fa48("448") ? {} : (stryCov_9fa48("448"), {
              success: stryMutAct_9fa48("449") ? false : (stryCov_9fa48("449"), true),
              protectionEnabled
            }));
          }
        })();
        return stryMutAct_9fa48("450") ? false : (stryCov_9fa48("450"), true);
      }
    }

    // FR-1.4: Handle refreshBlacklist message (manual refresh)
    if (stryMutAct_9fa48("453") ? message.action !== 'refreshBlacklist' : stryMutAct_9fa48("452") ? false : stryMutAct_9fa48("451") ? true : (stryCov_9fa48("451", "452", "453"), message.action === (stryMutAct_9fa48("454") ? "" : (stryCov_9fa48("454"), 'refreshBlacklist')))) {
      if (stryMutAct_9fa48("455")) {
        {}
      } else {
        stryCov_9fa48("455");
        (async () => {
          if (stryMutAct_9fa48("456")) {
            {}
          } else {
            stryCov_9fa48("456");
            try {
              if (stryMutAct_9fa48("457")) {
                {}
              } else {
                stryCov_9fa48("457");
                await loadScamDomains();
                sendResponse(stryMutAct_9fa48("458") ? {} : (stryCov_9fa48("458"), {
                  success: stryMutAct_9fa48("459") ? false : (stryCov_9fa48("459"), true),
                  count: scamDomains.size,
                  lastUpdate: lastUpdate
                }));
              }
            } catch (error) {
              if (stryMutAct_9fa48("460")) {
                {}
              } else {
                stryCov_9fa48("460");
                sendResponse(stryMutAct_9fa48("461") ? {} : (stryCov_9fa48("461"), {
                  success: stryMutAct_9fa48("462") ? true : (stryCov_9fa48("462"), false),
                  error: (error as Error).message
                }));
              }
            }
          }
        })();
        return stryMutAct_9fa48("463") ? false : (stryCov_9fa48("463"), true);
      }
    }
  }
});