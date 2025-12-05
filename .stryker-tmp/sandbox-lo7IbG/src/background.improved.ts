/**
 * Background service worker for Fair Store extension
 * Monitors navigation and checks domains against ČOI (Czech Trade Inspection) database
 *
 * @module background
 * @author Michael Petrik
 * @license MIT
 */

/** URL of ČOI risk list CSV file */function stryNS_9fa48() {
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
const COI_CSV_URL = stryMutAct_9fa48("0") ? "" : (stryCov_9fa48("0"), 'https://www.coi.gov.cz/userdata/files/dokumenty-ke-stazeni/open-data/rizikove-seznam.csv');

/**
 * Map of scam domains with their reasons
 * Key: domain name (e.g., "scam-shop.cz")
 * Value: reason from ČOI (e.g., "Zařazeno do seznamu rizikových e-shopů")
 */
export let scamDomains = new Map<string, string>();

/**
 * Set of domains allowed by user for the current session
 * User clicked "Continue anyway" on the warning page
 */
export let allowedDomains = new Set<string>();

/** ISO timestamp of last successful data update */
let lastUpdate: string | null = null;

/** Global protection state - can be toggled by user */
let protectionEnabled = stryMutAct_9fa48("1") ? false : (stryCov_9fa48("1"), true);

/**
 * Initialize extension on install
 * Loads scam domains from ČOI
 */
chrome.runtime.onInstalled.addListener(async () => {
  if (stryMutAct_9fa48("2")) {
    {}
  } else {
    stryCov_9fa48("2");
    console.log(stryMutAct_9fa48("3") ? "" : (stryCov_9fa48("3"), 'Fair Store extension installed'));
    await loadScamDomains();
  }
});

/**
 * Parse CSV file from ČOI and extract scam domains
 *
 * @param csvText - Raw CSV text content (Windows-1250 encoded)
 * @returns Map of domain -> reason pairs
 *
 * @example
 * const csvText = "scam-shop.cz;Podvodný e-shop\nfake.com;Neexistující zboží";
 * const domains = parseCSV(csvText);
 * // domains.get("scam-shop.cz") === "Podvodný e-shop"
 */
export function parseCSV(csvText: string): Map<string, string> {
  if (stryMutAct_9fa48("4")) {
    {}
  } else {
    stryCov_9fa48("4");
    const domains = new Map<string, string>();
    try {
      if (stryMutAct_9fa48("5")) {
        {}
      } else {
        stryCov_9fa48("5");
        const lines = stryMutAct_9fa48("6") ? csvText.split('\n') : (stryCov_9fa48("6"), csvText.trim().split(stryMutAct_9fa48("7") ? "" : (stryCov_9fa48("7"), '\n')));
        if (stryMutAct_9fa48("10") ? lines.length !== 0 : stryMutAct_9fa48("9") ? false : stryMutAct_9fa48("8") ? true : (stryCov_9fa48("8", "9", "10"), lines.length === 0)) return domains;
        const delimiter = lines[0].includes(stryMutAct_9fa48("11") ? "" : (stryCov_9fa48("11"), ';')) ? stryMutAct_9fa48("12") ? "" : (stryCov_9fa48("12"), ';') : stryMutAct_9fa48("13") ? "" : (stryCov_9fa48("13"), ',');
        // ČOI CSV has no header row, start from line 0
        for (let i = 0; stryMutAct_9fa48("16") ? i >= lines.length : stryMutAct_9fa48("15") ? i <= lines.length : stryMutAct_9fa48("14") ? false : (stryCov_9fa48("14", "15", "16"), i < lines.length); stryMutAct_9fa48("17") ? i-- : (stryCov_9fa48("17"), i++)) {
          if (stryMutAct_9fa48("18")) {
            {}
          } else {
            stryCov_9fa48("18");
            const line = stryMutAct_9fa48("19") ? lines[i] : (stryCov_9fa48("19"), lines[i].trim());
            if (stryMutAct_9fa48("22") ? false : stryMutAct_9fa48("21") ? true : stryMutAct_9fa48("20") ? line : (stryCov_9fa48("20", "21", "22"), !line)) continue;
            // Strip both double quotes and single quotes
            const columns = line.split(delimiter).map(stryMutAct_9fa48("23") ? () => undefined : (stryCov_9fa48("23"), c => stryMutAct_9fa48("24") ? c.replace(/^"|"$/g, '').replace(/^'|'$/g, '') : (stryCov_9fa48("24"), c.trim().replace(stryMutAct_9fa48("26") ? /^"|"/g : stryMutAct_9fa48("25") ? /"|"$/g : (stryCov_9fa48("25", "26"), /^"|"$/g), stryMutAct_9fa48("27") ? "Stryker was here!" : (stryCov_9fa48("27"), '')).replace(stryMutAct_9fa48("29") ? /^'|'/g : stryMutAct_9fa48("28") ? /'|'$/g : (stryCov_9fa48("28", "29"), /^'|'$/g), stryMutAct_9fa48("30") ? "Stryker was here!" : (stryCov_9fa48("30"), '')))));
            let domain = columns[0];
            const reason = stryMutAct_9fa48("33") ? columns[1] && 'Zařazeno do seznamu rizikových e-shopů ČOI' : stryMutAct_9fa48("32") ? false : stryMutAct_9fa48("31") ? true : (stryCov_9fa48("31", "32", "33"), columns[1] || (stryMutAct_9fa48("34") ? "" : (stryCov_9fa48("34"), 'Zařazeno do seznamu rizikových e-shopů ČOI')));
            domain = cleanDomain(domain);
            if (stryMutAct_9fa48("36") ? false : stryMutAct_9fa48("35") ? true : (stryCov_9fa48("35", "36"), domain)) {
              if (stryMutAct_9fa48("37")) {
                {}
              } else {
                stryCov_9fa48("37");
                domains.set(domain, reason);
              }
            }
          }
        }
      }
    } catch (error) {
      if (stryMutAct_9fa48("38")) {
        {}
      } else {
        stryCov_9fa48("38");
        console.error(stryMutAct_9fa48("39") ? "" : (stryCov_9fa48("39"), 'Error parsing CSV:'), error);
      }
    }
    return domains;
  }
}

/**
 * Clean and normalize domain string
 *
 * @param domain - Raw domain string (may include protocol, path, etc.)
 * @returns Cleaned domain name in lowercase (e.g., "example.com")
 *
 * @example
 * cleanDomain("https://www.example.com/path") === "www.example.com"
 * cleanDomain("example.com:8080") === "example.com"
 */
export function cleanDomain(domain: string): string {
  if (stryMutAct_9fa48("40")) {
    {}
  } else {
    stryCov_9fa48("40");
    if (stryMutAct_9fa48("43") ? false : stryMutAct_9fa48("42") ? true : stryMutAct_9fa48("41") ? domain : (stryCov_9fa48("41", "42", "43"), !domain)) return stryMutAct_9fa48("44") ? "Stryker was here!" : (stryCov_9fa48("44"), '');
    try {
      if (stryMutAct_9fa48("45")) {
        {}
      } else {
        stryCov_9fa48("45");
        const urlStr = domain.match(stryMutAct_9fa48("47") ? /^https:\/\// : stryMutAct_9fa48("46") ? /https?:\/\// : (stryCov_9fa48("46", "47"), /^https?:\/\//)) ? domain : (stryMutAct_9fa48("48") ? "" : (stryCov_9fa48("48"), 'http://')) + domain;
        const url = new URL(urlStr);
        return stryMutAct_9fa48("49") ? url.hostname.toUpperCase() : (stryCov_9fa48("49"), url.hostname.toLowerCase());
      }
    } catch (e) {
      if (stryMutAct_9fa48("50")) {
        {}
      } else {
        stryCov_9fa48("50");
        return stryMutAct_9fa48("52") ? domain.replace(/^https?:\/\//, '').split('/')[0].split('?')[0].split(':')[0].toUpperCase().trim() : stryMutAct_9fa48("51") ? domain.replace(/^https?:\/\//, '').split('/')[0].split('?')[0].split(':')[0].toLowerCase() : (stryCov_9fa48("51", "52"), domain.replace(stryMutAct_9fa48("54") ? /^https:\/\// : stryMutAct_9fa48("53") ? /https?:\/\// : (stryCov_9fa48("53", "54"), /^https?:\/\//), stryMutAct_9fa48("55") ? "Stryker was here!" : (stryCov_9fa48("55"), '')).split(stryMutAct_9fa48("56") ? "" : (stryCov_9fa48("56"), '/'))[0].split(stryMutAct_9fa48("57") ? "" : (stryCov_9fa48("57"), '?'))[0].split(stryMutAct_9fa48("58") ? "" : (stryCov_9fa48("58"), ':'))[0].toLowerCase().trim());
      }
    }
  }
}

/**
 * Load scam domains from ČOI web source with fallback mechanisms
 *
 * Priority:
 * 1. Fetch from ČOI website (https://www.coi.gov.cz)
 * 2. Load from cached storage
 * 3. Load from local CSV file
 *
 * @returns Promise that resolves when domains are loaded
 * @throws Never - All errors are caught and logged
 */
export async function loadScamDomains(): Promise<void> {
  if (stryMutAct_9fa48("59")) {
    {}
  } else {
    stryCov_9fa48("59");
    try {
      if (stryMutAct_9fa48("60")) {
        {}
      } else {
        stryCov_9fa48("60");
        console.log(stryMutAct_9fa48("61") ? "" : (stryCov_9fa48("61"), 'Fetching ČOI risk list from web...'));
        const response = await fetch(COI_CSV_URL);
        if (stryMutAct_9fa48("64") ? false : stryMutAct_9fa48("63") ? true : stryMutAct_9fa48("62") ? response.ok : (stryCov_9fa48("62", "63", "64"), !response.ok)) throw new Error(stryMutAct_9fa48("65") ? `` : (stryCov_9fa48("65"), `HTTP error! status: ${response.status}`));
        const arrayBuffer = await response.arrayBuffer();
        const decoder = new TextDecoder(stryMutAct_9fa48("66") ? "" : (stryCov_9fa48("66"), 'windows-1250'));
        const csvText = decoder.decode(arrayBuffer);
        const newDomains = parseCSV(csvText);
        scamDomains = newDomains;
        lastUpdate = new Date().toISOString();
        await chrome.storage.local.set(stryMutAct_9fa48("67") ? {} : (stryCov_9fa48("67"), {
          scamDomains: Array.from(scamDomains.entries()),
          lastUpdate: lastUpdate
        }));
        console.log(stryMutAct_9fa48("68") ? `` : (stryCov_9fa48("68"), `✅ Loaded ${scamDomains.size} domains from ČOI`));
        return;
      }
    } catch (error) {
      if (stryMutAct_9fa48("69")) {
        {}
      } else {
        stryCov_9fa48("69");
        console.error(stryMutAct_9fa48("70") ? "" : (stryCov_9fa48("70"), 'Failed to load ČOI CSV from web:'), error);
      }
    }

    // Fallback: Load from cache
    try {
      if (stryMutAct_9fa48("71")) {
        {}
      } else {
        stryCov_9fa48("71");
        console.log(stryMutAct_9fa48("72") ? "" : (stryCov_9fa48("72"), 'Trying to load from cache...'));
        const stored = await chrome.storage.local.get(stryMutAct_9fa48("73") ? [] : (stryCov_9fa48("73"), [stryMutAct_9fa48("74") ? "" : (stryCov_9fa48("74"), 'scamDomains'), stryMutAct_9fa48("75") ? "" : (stryCov_9fa48("75"), 'lastUpdate')]));
        if (stryMutAct_9fa48("78") ? stored.scamDomains || stored.scamDomains.length > 0 : stryMutAct_9fa48("77") ? false : stryMutAct_9fa48("76") ? true : (stryCov_9fa48("76", "77", "78"), stored.scamDomains && (stryMutAct_9fa48("81") ? stored.scamDomains.length <= 0 : stryMutAct_9fa48("80") ? stored.scamDomains.length >= 0 : stryMutAct_9fa48("79") ? true : (stryCov_9fa48("79", "80", "81"), stored.scamDomains.length > 0)))) {
          if (stryMutAct_9fa48("82")) {
            {}
          } else {
            stryCov_9fa48("82");
            scamDomains = new Map(stored.scamDomains);
            lastUpdate = stored.lastUpdate;
            console.log(stryMutAct_9fa48("83") ? `` : (stryCov_9fa48("83"), `📦 Loaded ${scamDomains.size} domains from cache`));
            return;
          }
        }
      }
    } catch (storageError) {
      if (stryMutAct_9fa48("84")) {
        {}
      } else {
        stryCov_9fa48("84");
        console.error(stryMutAct_9fa48("85") ? "" : (stryCov_9fa48("85"), 'Failed to load from storage:'), storageError);
      }
    }

    // Fallback: Local CSV
    try {
      if (stryMutAct_9fa48("86")) {
        {}
      } else {
        stryCov_9fa48("86");
        console.log(stryMutAct_9fa48("87") ? "" : (stryCov_9fa48("87"), 'Trying to load local CSV fallback...'));
        const localResponse = await fetch(stryMutAct_9fa48("88") ? "" : (stryCov_9fa48("88"), '/rizikove-seznam.csv'));
        if (stryMutAct_9fa48("90") ? false : stryMutAct_9fa48("89") ? true : (stryCov_9fa48("89", "90"), localResponse.ok)) {
          if (stryMutAct_9fa48("91")) {
            {}
          } else {
            stryCov_9fa48("91");
            const arrayBuffer = await localResponse.arrayBuffer();
            const decoder = new TextDecoder(stryMutAct_9fa48("92") ? "" : (stryCov_9fa48("92"), 'windows-1250'));
            const csvText = decoder.decode(arrayBuffer);
            const newDomains = parseCSV(csvText);
            scamDomains = newDomains;
            lastUpdate = new Date().toISOString();
            await chrome.storage.local.set(stryMutAct_9fa48("93") ? {} : (stryCov_9fa48("93"), {
              scamDomains: Array.from(scamDomains.entries()),
              lastUpdate: lastUpdate
            }));
            console.log(stryMutAct_9fa48("94") ? `` : (stryCov_9fa48("94"), `✅ Loaded ${scamDomains.size} domains from local CSV`));
            return;
          }
        }
      }
    } catch (localError) {
      if (stryMutAct_9fa48("95")) {
        {}
      } else {
        stryCov_9fa48("95");
        console.error(stryMutAct_9fa48("96") ? "" : (stryCov_9fa48("96"), 'Failed to load local CSV:'), localError);
      }
    }
  }
}

/**
 * Extract domain from full URL
 *
 * @param url - Full URL string
 * @returns Domain name in lowercase, or empty string if invalid
 *
 * @example
 * extractDomain("https://www.example.com/page?q=1") === "www.example.com"
 */
export function extractDomain(url: string): string {
  if (stryMutAct_9fa48("97")) {
    {}
  } else {
    stryCov_9fa48("97");
    try {
      if (stryMutAct_9fa48("98")) {
        {}
      } else {
        stryCov_9fa48("98");
        return stryMutAct_9fa48("99") ? new URL(url).hostname.toUpperCase() : (stryCov_9fa48("99"), new URL(url).hostname.toLowerCase());
      }
    } catch (error) {
      if (stryMutAct_9fa48("100")) {
        {}
      } else {
        stryCov_9fa48("100");
        return stryMutAct_9fa48("101") ? "Stryker was here!" : (stryCov_9fa48("101"), '');
      }
    }
  }
}

/**
 * Result of domain safety check
 */
export interface DomainCheckResult {
  /** Whether the domain is identified as a scam */
  isScam: boolean;
  /** Reason from ČOI for flagging this domain (if scam) */
  reason: string | null;
  /** The matched scam domain pattern (may differ from checked domain for subdomains) */
  matchedDomain: string | null;
}

/**
 * Check if domain is in scam list
 *
 * @param domain - Domain to check (will be normalized to lowercase)
 * @returns Check result with scam status, reason, and matched pattern
 *
 * @example
 * checkDomain("safe-shop.cz") === { isScam: false, reason: null, matchedDomain: null }
 * checkDomain("scam.com") === { isScam: true, reason: "Podvodný e-shop", matchedDomain: "scam.com" }
 */
export function checkDomain(domain: string): DomainCheckResult {
  if (stryMutAct_9fa48("102")) {
    {}
  } else {
    stryCov_9fa48("102");
    domain = stryMutAct_9fa48("103") ? domain.toUpperCase() : (stryCov_9fa48("103"), domain.toLowerCase());

    // User explicitly allowed this domain in current session
    if (stryMutAct_9fa48("105") ? false : stryMutAct_9fa48("104") ? true : (stryCov_9fa48("104", "105"), allowedDomains.has(domain))) {
      if (stryMutAct_9fa48("106")) {
        {}
      } else {
        stryCov_9fa48("106");
        return stryMutAct_9fa48("107") ? {} : (stryCov_9fa48("107"), {
          isScam: stryMutAct_9fa48("108") ? true : (stryCov_9fa48("108"), false),
          reason: null,
          matchedDomain: null
        });
      }
    }

    // Direct match in scam list
    if (stryMutAct_9fa48("110") ? false : stryMutAct_9fa48("109") ? true : (stryCov_9fa48("109", "110"), scamDomains.has(domain))) {
      if (stryMutAct_9fa48("111")) {
        {}
      } else {
        stryCov_9fa48("111");
        return stryMutAct_9fa48("112") ? {} : (stryCov_9fa48("112"), {
          isScam: stryMutAct_9fa48("113") ? false : (stryCov_9fa48("113"), true),
          reason: stryMutAct_9fa48("116") ? scamDomains.get(domain) && null : stryMutAct_9fa48("115") ? false : stryMutAct_9fa48("114") ? true : (stryCov_9fa48("114", "115", "116"), scamDomains.get(domain) || null),
          matchedDomain: domain
        });
      }
    }

    // Check if it's a subdomain of a scam domain
    for (const [scamDomain, reason] of scamDomains.entries()) {
      if (stryMutAct_9fa48("117")) {
        {}
      } else {
        stryCov_9fa48("117");
        if (stryMutAct_9fa48("120") ? domain.startsWith('.' + scamDomain) : stryMutAct_9fa48("119") ? false : stryMutAct_9fa48("118") ? true : (stryCov_9fa48("118", "119", "120"), domain.endsWith((stryMutAct_9fa48("121") ? "" : (stryCov_9fa48("121"), '.')) + scamDomain))) {
          if (stryMutAct_9fa48("122")) {
            {}
          } else {
            stryCov_9fa48("122");
            return stryMutAct_9fa48("123") ? {} : (stryCov_9fa48("123"), {
              isScam: stryMutAct_9fa48("124") ? false : (stryCov_9fa48("124"), true),
              reason: reason,
              matchedDomain: scamDomain
            });
          }
        }
      }
    }
    return stryMutAct_9fa48("125") ? {} : (stryCov_9fa48("125"), {
      isScam: stryMutAct_9fa48("126") ? true : (stryCov_9fa48("126"), false),
      reason: null,
      matchedDomain: null
    });
  }
}

/**
 * Listen for tab updates to redirect risky sites
 *
 * When a tab starts loading, check if the domain is in the scam list.
 * If yes, redirect to warning page before the dangerous page loads.
 */
chrome.tabs.onUpdated.addListener((tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => {
  if (stryMutAct_9fa48("127")) {
    {}
  } else {
    stryCov_9fa48("127");
    if (stryMutAct_9fa48("130") ? changeInfo.status === 'loading' || tab.url : stryMutAct_9fa48("129") ? false : stryMutAct_9fa48("128") ? true : (stryCov_9fa48("128", "129", "130"), (stryMutAct_9fa48("132") ? changeInfo.status !== 'loading' : stryMutAct_9fa48("131") ? true : (stryCov_9fa48("131", "132"), changeInfo.status === (stryMutAct_9fa48("133") ? "" : (stryCov_9fa48("133"), 'loading')))) && tab.url)) {
      if (stryMutAct_9fa48("134")) {
        {}
      } else {
        stryCov_9fa48("134");
        const url = tab.url;
        // Skip internal pages (chrome://, chrome-extension://)
        if (stryMutAct_9fa48("137") ? url.startsWith('chrome://') && url.startsWith('chrome-extension://') : stryMutAct_9fa48("136") ? false : stryMutAct_9fa48("135") ? true : (stryCov_9fa48("135", "136", "137"), (stryMutAct_9fa48("138") ? url.endsWith('chrome://') : (stryCov_9fa48("138"), url.startsWith(stryMutAct_9fa48("139") ? "" : (stryCov_9fa48("139"), 'chrome://')))) || (stryMutAct_9fa48("140") ? url.endsWith('chrome-extension://') : (stryCov_9fa48("140"), url.startsWith(stryMutAct_9fa48("141") ? "" : (stryCov_9fa48("141"), 'chrome-extension://')))))) {
          if (stryMutAct_9fa48("142")) {
            {}
          } else {
            stryCov_9fa48("142");
            return;
          }
        }
        const domain = extractDomain(url);
        if (stryMutAct_9fa48("145") ? false : stryMutAct_9fa48("144") ? true : stryMutAct_9fa48("143") ? domain : (stryCov_9fa48("143", "144", "145"), !domain)) return;
        const result = checkDomain(domain);
        if (stryMutAct_9fa48("147") ? false : stryMutAct_9fa48("146") ? true : (stryCov_9fa48("146", "147"), result.isScam)) {
          if (stryMutAct_9fa48("148")) {
            {}
          } else {
            stryCov_9fa48("148");
            console.log(stryMutAct_9fa48("149") ? `` : (stryCov_9fa48("149"), `⚠️ Rizikový e-shop detekován: ${domain}`));
            const blockedUrl = chrome.runtime.getURL(stryMutAct_9fa48("150") ? "" : (stryCov_9fa48("150"), "src/pages/blocked.html")) + (stryMutAct_9fa48("151") ? "" : (stryCov_9fa48("151"), "?url=")) + encodeURIComponent(url);
            chrome.tabs.update(tabId, stryMutAct_9fa48("152") ? {} : (stryCov_9fa48("152"), {
              url: blockedUrl
            }));
          }
        }
      }
    }
  }
});

/**
 * Message types for communication between extension components
 */
interface ExtensionMessage {
  action: 'allowDomain' | 'getBlacklist' | 'checkDomain' | 'setProtection';
  domain?: string;
  url?: string;
  enabled?: boolean;
}
interface AllowDomainResponse {
  success: boolean;
}
interface GetBlacklistResponse {
  blacklist: string[];
  protectionEnabled: boolean;
}
interface CheckDomainResponse {
  isScam: boolean;
  isWhitelisted: boolean;
  protectionEnabled: boolean;
  domain: string;
  reason?: string | null;
  matchedDomain?: string | null;
}
interface SetProtectionResponse {
  success: boolean;
  protectionEnabled: boolean;
}
type MessageResponse = AllowDomainResponse | GetBlacklistResponse | CheckDomainResponse | SetProtectionResponse;

/**
 * Handle messages from popup and content scripts
 *
 * Supported actions:
 * - allowDomain: User clicked "Continue anyway" - add domain to allowed list
 * - getBlacklist: Get list of all scam domains for display in popup
 * - checkDomain: Check if current tab's domain is in scam list
 * - setProtection: Enable/disable global protection
 */
chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender: chrome.runtime.MessageSender, sendResponse: (response: MessageResponse) => void): boolean => {
  if (stryMutAct_9fa48("153")) {
    {}
  } else {
    stryCov_9fa48("153");
    if (stryMutAct_9fa48("156") ? message.action !== 'allowDomain' : stryMutAct_9fa48("155") ? false : stryMutAct_9fa48("154") ? true : (stryCov_9fa48("154", "155", "156"), message.action === (stryMutAct_9fa48("157") ? "" : (stryCov_9fa48("157"), 'allowDomain')))) {
      if (stryMutAct_9fa48("158")) {
        {}
      } else {
        stryCov_9fa48("158");
        const domain = message.domain;
        if (stryMutAct_9fa48("160") ? false : stryMutAct_9fa48("159") ? true : (stryCov_9fa48("159", "160"), domain)) {
          if (stryMutAct_9fa48("161")) {
            {}
          } else {
            stryCov_9fa48("161");
            allowedDomains.add(stryMutAct_9fa48("162") ? domain.toUpperCase() : (stryCov_9fa48("162"), domain.toLowerCase()));
            console.log(stryMutAct_9fa48("163") ? `` : (stryCov_9fa48("163"), `Allowed domain: ${domain}`));
            sendResponse(stryMutAct_9fa48("164") ? {} : (stryCov_9fa48("164"), {
              success: stryMutAct_9fa48("165") ? false : (stryCov_9fa48("165"), true)
            }));
          }
        }
        return stryMutAct_9fa48("166") ? false : (stryCov_9fa48("166"), true);
      }
    }
    if (stryMutAct_9fa48("169") ? message.action !== 'getBlacklist' : stryMutAct_9fa48("168") ? false : stryMutAct_9fa48("167") ? true : (stryCov_9fa48("167", "168", "169"), message.action === (stryMutAct_9fa48("170") ? "" : (stryCov_9fa48("170"), 'getBlacklist')))) {
      if (stryMutAct_9fa48("171")) {
        {}
      } else {
        stryCov_9fa48("171");
        (async () => {
          if (stryMutAct_9fa48("172")) {
            {}
          } else {
            stryCov_9fa48("172");
            const blacklistArray = Array.from(scamDomains.keys());
            sendResponse(stryMutAct_9fa48("173") ? {} : (stryCov_9fa48("173"), {
              blacklist: blacklistArray,
              protectionEnabled: protectionEnabled
            }));
          }
        })();
        return stryMutAct_9fa48("174") ? false : (stryCov_9fa48("174"), true);
      }
    }
    if (stryMutAct_9fa48("177") ? message.action !== 'checkDomain' : stryMutAct_9fa48("176") ? false : stryMutAct_9fa48("175") ? true : (stryCov_9fa48("175", "176", "177"), message.action === (stryMutAct_9fa48("178") ? "" : (stryCov_9fa48("178"), 'checkDomain')))) {
      if (stryMutAct_9fa48("179")) {
        {}
      } else {
        stryCov_9fa48("179");
        (async () => {
          if (stryMutAct_9fa48("180")) {
            {}
          } else {
            stryCov_9fa48("180");
            const url = message.url;
            if (stryMutAct_9fa48("183") ? false : stryMutAct_9fa48("182") ? true : stryMutAct_9fa48("181") ? url : (stryCov_9fa48("181", "182", "183"), !url)) {
              if (stryMutAct_9fa48("184")) {
                {}
              } else {
                stryCov_9fa48("184");
                sendResponse(stryMutAct_9fa48("185") ? {} : (stryCov_9fa48("185"), {
                  isScam: stryMutAct_9fa48("186") ? true : (stryCov_9fa48("186"), false),
                  isWhitelisted: stryMutAct_9fa48("187") ? true : (stryCov_9fa48("187"), false),
                  protectionEnabled,
                  domain: stryMutAct_9fa48("188") ? "Stryker was here!" : (stryCov_9fa48("188"), '')
                }));
                return;
              }
            }
            const domain = extractDomain(url);
            if (stryMutAct_9fa48("191") ? false : stryMutAct_9fa48("190") ? true : stryMutAct_9fa48("189") ? domain : (stryCov_9fa48("189", "190", "191"), !domain)) {
              if (stryMutAct_9fa48("192")) {
                {}
              } else {
                stryCov_9fa48("192");
                sendResponse(stryMutAct_9fa48("193") ? {} : (stryCov_9fa48("193"), {
                  isScam: stryMutAct_9fa48("194") ? true : (stryCov_9fa48("194"), false),
                  isWhitelisted: stryMutAct_9fa48("195") ? true : (stryCov_9fa48("195"), false),
                  protectionEnabled,
                  domain: stryMutAct_9fa48("196") ? "Stryker was here!" : (stryCov_9fa48("196"), '')
                }));
                return;
              }
            }
            const result = checkDomain(domain);
            const isWhitelisted = allowedDomains.has(stryMutAct_9fa48("197") ? domain.toUpperCase() : (stryCov_9fa48("197"), domain.toLowerCase()));
            sendResponse(stryMutAct_9fa48("198") ? {} : (stryCov_9fa48("198"), {
              isScam: result.isScam,
              isWhitelisted: isWhitelisted,
              protectionEnabled: protectionEnabled,
              domain: domain,
              reason: result.reason,
              matchedDomain: result.matchedDomain
            }));
          }
        })();
        return stryMutAct_9fa48("199") ? false : (stryCov_9fa48("199"), true);
      }
    }
    if (stryMutAct_9fa48("202") ? message.action !== 'setProtection' : stryMutAct_9fa48("201") ? false : stryMutAct_9fa48("200") ? true : (stryCov_9fa48("200", "201", "202"), message.action === (stryMutAct_9fa48("203") ? "" : (stryCov_9fa48("203"), 'setProtection')))) {
      if (stryMutAct_9fa48("204")) {
        {}
      } else {
        stryCov_9fa48("204");
        (async () => {
          if (stryMutAct_9fa48("205")) {
            {}
          } else {
            stryCov_9fa48("205");
            protectionEnabled = stryMutAct_9fa48("208") ? message.enabled === false : stryMutAct_9fa48("207") ? false : stryMutAct_9fa48("206") ? true : (stryCov_9fa48("206", "207", "208"), message.enabled !== (stryMutAct_9fa48("209") ? true : (stryCov_9fa48("209"), false)));
            await chrome.storage.session.set(stryMutAct_9fa48("210") ? {} : (stryCov_9fa48("210"), {
              protectionEnabled
            }));
            console.log(stryMutAct_9fa48("211") ? `` : (stryCov_9fa48("211"), `Protection ${protectionEnabled ? stryMutAct_9fa48("212") ? "" : (stryCov_9fa48("212"), 'enabled') : stryMutAct_9fa48("213") ? "" : (stryCov_9fa48("213"), 'disabled')}`));
            sendResponse(stryMutAct_9fa48("214") ? {} : (stryCov_9fa48("214"), {
              success: stryMutAct_9fa48("215") ? false : (stryCov_9fa48("215"), true),
              protectionEnabled
            }));
          }
        })();
        return stryMutAct_9fa48("216") ? false : (stryCov_9fa48("216"), true);
      }
    }
    return stryMutAct_9fa48("217") ? true : (stryCov_9fa48("217"), false);
  }
});