# Fair Store - Pseudocode

## Overview
This document describes the core logic flows of the Fair Store Chrome extension in pseudocode format.

---

## 1. Extension Lifecycle

### 1.1 On Extension Install
```pseudocode
FUNCTION onInstalled():
    LOG "Extension installed"
    
    # Initialize protection as enabled
    SET protectionEnabled = TRUE
    CALL saveProtectionState(TRUE)
    
    # Initialize empty whitelist
    SET allowedDomains = EMPTY_SET
    
    # Fetch fresh blacklist
    CALL loadScamDomains()
END FUNCTION
```

### 1.2 On Browser Startup (Session Start)
```pseudocode
FUNCTION onStartup():
    LOG "Browser session started"
    
    # Reset protection to enabled (always starts ON)
    SET protectionEnabled = TRUE
    CALL saveProtectionState(TRUE)
    
    # Clear session whitelist (it's in-memory, so already empty)
    SET allowedDomains = EMPTY_SET
    
    # Fetch fresh blacklist
    CALL loadScamDomains()
END FUNCTION
```

### 1.3 Load Scam Domains
```pseudocode
FUNCTION loadScamDomains():
    TRY:
        # Attempt to fetch from government website
        response = FETCH COI_CSV_URL
        
        IF response.ok THEN:
            csvText = DECODE(response.body, "windows-1250")
            domains = CALL parseCSV(csvText)
            
            SET scamDomains = domains
            SET lastUpdate = NOW()
            
            CALL saveToStorage(scamDomains, lastUpdate)
            LOG "Loaded {domains.size} domains from ČOI"
            RETURN
        ELSE:
            THROW "HTTP error: {response.status}"
        END IF
        
    CATCH networkError:
        LOG "Network fetch failed: {networkError}"
    END TRY
    
    # Fallback: Load from cache
    TRY:
        stored = CALL loadFromStorage()
        IF stored.scamDomains IS NOT EMPTY THEN:
            SET scamDomains = stored.scamDomains
            SET lastUpdate = stored.lastUpdate
            LOG "Loaded {scamDomains.size} domains from cache"
            RETURN
        END IF
    CATCH storageError:
        LOG "Storage fallback failed: {storageError}"
    END TRY
    
    # Final fallback: Local bundled CSV
    TRY:
        localCsv = FETCH "/rizikove-seznam.csv"
        IF localCsv.ok THEN:
            domains = CALL parseCSV(localCsv.body)
            SET scamDomains = domains
            LOG "Loaded {domains.size} domains from local CSV"
        END IF
    CATCH localError:
        LOG "All fallbacks failed"
    END TRY
END FUNCTION
```

---

## 2. CSV Parsing

### 2.1 Parse CSV
```pseudocode
FUNCTION parseCSV(csvText: String) -> Map<String, String>:
    domains = NEW Map()
    
    lines = SPLIT csvText BY newline
    
    IF lines IS EMPTY THEN:
        RETURN domains
    END IF
    
    # Detect delimiter (ČOI uses semicolon)
    delimiter = IF lines[0] CONTAINS ";" THEN ";" ELSE ","
    
    FOR EACH line IN lines:
        line = TRIM(line)
        IF line IS EMPTY THEN CONTINUE
        
        columns = SPLIT line BY delimiter
        
        # Column 0: domain, Column 1: reason
        domain = CALL cleanDomain(columns[0])
        reason = columns[1] OR "Zařazeno do seznamu rizikových e-shopů ČOI"
        
        IF domain IS NOT EMPTY THEN:
            domains.SET(domain, reason)
        END IF
    END FOR
    
    RETURN domains
END FUNCTION
```

### 2.2 Clean Domain
```pseudocode
FUNCTION cleanDomain(input: String) -> String:
    IF input IS EMPTY THEN:
        RETURN ""
    END IF
    
    # Remove quotes
    domain = REMOVE_QUOTES(input)
    
    TRY:
        # Try to parse as URL
        IF NOT domain STARTS WITH "http" THEN:
            domain = "http://" + domain
        END IF
        
        url = PARSE_URL(domain)
        RETURN LOWERCASE(url.hostname)
        
    CATCH:
        # Fallback: manual parsing
        domain = REMOVE_PROTOCOL(domain)
        domain = SPLIT domain BY "/" TAKE FIRST
        domain = SPLIT domain BY "?" TAKE FIRST
        domain = SPLIT domain BY ":" TAKE FIRST
        RETURN LOWERCASE(TRIM(domain))
    END TRY
END FUNCTION
```

---

## 3. Page Navigation Protection

### 3.1 On Tab Update
```pseudocode
FUNCTION onTabUpdated(tabId, changeInfo, tab):
    # Only process when page starts loading
    IF changeInfo.status != "loading" THEN RETURN
    IF tab.url IS EMPTY THEN RETURN
    
    url = tab.url
    
    # Skip internal Chrome pages
    IF url STARTS WITH "chrome://" THEN RETURN
    IF url STARTS WITH "chrome-extension://" THEN RETURN
    
    # Step 1: Check if protection is enabled
    IF NOT protectionEnabled THEN:
        # Protection is OFF - allow page (no action)
        RETURN
    END IF
    
    # Extract domain from URL
    domain = CALL extractDomain(url)
    IF domain IS EMPTY THEN RETURN
    
    # Step 2: Check if domain is on blacklist
    result = CALL checkDomain(domain)
    
    IF NOT result.isScam THEN:
        # Not on blacklist - allow page
        RETURN
    END IF
    
    # Step 3: Check if domain is whitelisted
    # (checkDomain already handles this internally)
    # If we reach here, domain is malicious AND not whitelisted
    
    LOG "Risky e-shop detected: {domain}"
    blockedUrl = CREATE_BLOCKED_PAGE_URL(url)
    CALL redirectTab(tabId, blockedUrl)
END FUNCTION
```

### 3.2 Check Domain
```pseudocode
FUNCTION checkDomain(domain: String) -> CheckResult:
    domain = LOWERCASE(domain)
    
    # First check: Is domain whitelisted?
    IF allowedDomains CONTAINS domain THEN:
        RETURN { isScam: FALSE, reason: NULL, matchedDomain: NULL }
    END IF
    
    # Second check: Exact match in blacklist
    IF scamDomains HAS domain THEN:
        RETURN { 
            isScam: TRUE, 
            reason: scamDomains.GET(domain),
            matchedDomain: domain 
        }
    END IF
    
    # Third check: Subdomain match (e.g., www.scam.com -> scam.com)
    FOR EACH [scamDomain, reason] IN scamDomains:
        IF domain ENDS WITH "." + scamDomain THEN:
            RETURN {
                isScam: TRUE,
                reason: reason,
                matchedDomain: scamDomain
            }
        END IF
    END FOR
    
    # Not found in blacklist
    RETURN { isScam: FALSE, reason: NULL, matchedDomain: NULL }
END FUNCTION
```

### 3.3 Extract Domain
```pseudocode
FUNCTION extractDomain(url: String) -> String:
    TRY:
        parsed = PARSE_URL(url)
        RETURN LOWERCASE(parsed.hostname)
    CATCH:
        RETURN ""
    END TRY
END FUNCTION
```

---

## 4. Blocked Page Actions

### 4.1 Close Tab
```pseudocode
FUNCTION onCloseTabClick():
    tab = CALL getCurrentTab()
    
    IF tab EXISTS AND tab.id EXISTS THEN:
        CALL closeTab(tab.id)
    ELSE:
        # Fallback: redirect to safe page
        REDIRECT TO "https://www.google.com"
    END IF
END FUNCTION
```

### 4.2 Proceed Anyway (Add to Whitelist)
```pseudocode
FUNCTION onProceedClick(domain: String, originalUrl: String):
    TRY:
        # Send message to background to whitelist domain
        response = CALL sendMessage({
            action: "allowDomain",
            domain: domain
        })
        
        IF response.success THEN:
            # Redirect to original URL
            REDIRECT TO originalUrl
        ELSE:
            SHOW_ERROR "Failed to add exception"
        END IF
        
    CATCH error:
        LOG "Failed to allow domain: {error}"
        SHOW_ERROR "Failed to add exception"
    END TRY
END FUNCTION
```

---

## 5. Message Handlers

### 5.1 Allow Domain Message
```pseudocode
FUNCTION handleAllowDomain(message, sendResponse):
    domain = LOWERCASE(message.domain)
    
    IF domain IS NOT EMPTY THEN:
        # Add to session whitelist
        allowedDomains.ADD(domain)
        LOG "Allowed domain: {domain}"
        sendResponse({ success: TRUE })
    ELSE:
        sendResponse({ success: FALSE })
    END IF
END FUNCTION
```

### 5.2 Check Domain Message
```pseudocode
FUNCTION handleCheckDomain(message, sendResponse):
    url = message.url
    
    IF url IS EMPTY THEN:
        sendResponse({ 
            isScam: FALSE, 
            isWhitelisted: FALSE, 
            protectionEnabled: protectionEnabled,
            domain: "" 
        })
        RETURN
    END IF
    
    domain = CALL extractDomain(url)
    IF domain IS EMPTY THEN:
        sendResponse({ 
            isScam: FALSE, 
            isWhitelisted: FALSE, 
            protectionEnabled: protectionEnabled,
            domain: "" 
        })
        RETURN
    END IF
    
    result = CALL checkDomain(domain)
    isWhitelisted = allowedDomains CONTAINS LOWERCASE(domain)
    
    sendResponse({
        isScam: result.isScam,
        isWhitelisted: isWhitelisted,
        protectionEnabled: protectionEnabled,
        domain: domain,
        reason: result.reason,
        matchedDomain: result.matchedDomain
    })
END FUNCTION
```

### 5.3 Set Protection Message
```pseudocode
FUNCTION handleSetProtection(message, sendResponse):
    enabled = message.enabled != FALSE  # Default to TRUE
    
    SET protectionEnabled = enabled
    CALL saveSessionStorage({ protectionEnabled: enabled })
    
    LOG "Protection {enabled ? 'enabled' : 'disabled'}"
    
    sendResponse({ success: TRUE, protectionEnabled: enabled })
END FUNCTION
```

### 5.4 Get Blacklist Message
```pseudocode
FUNCTION handleGetBlacklist(sendResponse):
    blacklistArray = ARRAY_FROM(scamDomains.KEYS())
    
    sendResponse({
        blacklist: blacklistArray,
        protectionEnabled: protectionEnabled
    })
END FUNCTION
```

### 5.5 Refresh Blacklist Message
```pseudocode
FUNCTION handleRefreshBlacklist(sendResponse):
    TRY:
        AWAIT CALL loadScamDomains()
        
        sendResponse({
            success: TRUE,
            count: scamDomains.SIZE,
            lastUpdate: lastUpdate
        })
        
    CATCH error:
        LOG "Refresh failed: {error}"
        sendResponse({
            success: FALSE,
            error: error.message
        })
    END TRY
END FUNCTION
```

---

## 6. Protection Toggle

### 6.1 Toggle Protection State
```pseudocode
FUNCTION toggleProtection(newState: Boolean):
    SET protectionEnabled = newState
    
    # Persist to session storage
    CALL saveSessionStorage({ protectionEnabled: newState })
    
    LOG "Protection toggled to: {newState}"
    
    # Note: Since protection toggle is temporary (session-only),
    # and blocked pages redirect immediately, we don't need to
    # update existing tabs - they will be handled on next navigation
END FUNCTION
```

---

## 7. Popup UI Logic

### 7.1 Check Current Domain Status
```pseudocode
FUNCTION checkCurrentDomainForPopup():
    SET loading = TRUE
    
    TRY:
        # Get current active tab
        tabs = AWAIT CALL queryTabs({ active: TRUE, currentWindow: TRUE })
        tab = tabs[0]
        
        IF tab.url IS EMPTY THEN:
            SET loading = FALSE
            RETURN NULL
        END IF
        
        # Check if we're on the blocked page
        IF tab.url CONTAINS "blocked.html" THEN:
            # Extract original domain from URL parameter
            params = PARSE_URL_PARAMS(tab.url)
            originalUrl = params.get("url")
            
            IF originalUrl IS EMPTY THEN:
                SET loading = FALSE
                RETURN NULL
            END IF
            
            domain = CALL extractDomain(originalUrl)
            isBlockedPage = TRUE
        ELSE:
            # Normal page
            domain = CALL extractDomain(tab.url)
            isBlockedPage = FALSE
        END IF
        
        # Get blacklist from storage
        stored = AWAIT CALL getFromStorage(["scamDomains"])
        scamDomains = NEW Map(stored.scamDomains OR [])
        
        # Check if domain is in scam list
        isInScamList = FALSE
        reason = NULL
        
        IF scamDomains HAS domain THEN:
            reason = scamDomains.GET(domain)
            isInScamList = TRUE
        ELSE:
            # Check suffix match
            FOR EACH [scamDomain, scamReason] IN scamDomains:
                IF domain ENDS WITH "." + scamDomain THEN:
                    reason = scamReason
                    isInScamList = TRUE
                    BREAK
                END IF
            END FOR
        END IF
        
        # Determine whitelist status
        # If user is on actual risky site (not blocked page), they whitelisted it
        isWhitelisted = NOT isBlockedPage AND isInScamList
        
        SET loading = FALSE
        RETURN {
            domain: domain,
            isSafe: NOT isInScamList,
            isWhitelisted: isWhitelisted,
            reason: reason,
            isBlockedPage: isBlockedPage
        }
        
    CATCH error:
        LOG "Failed to check domain: {error}"
        SET loading = FALSE
        RETURN NULL
    END TRY
END FUNCTION
```

---

## 8. Decision Flow Summary

```pseudocode
# Complete navigation decision flow
FUNCTION shouldBlockNavigation(url: String) -> Boolean:
    
    # Step 1: Check protection status
    IF NOT protectionEnabled THEN:
        RETURN FALSE  # Allow - protection is off
    END IF
    
    domain = CALL extractDomain(url)
    IF domain IS EMPTY THEN:
        RETURN FALSE  # Allow - can't determine domain
    END IF
    
    # Step 2: Check if on blacklist
    IF NOT (scamDomains HAS domain OR domain IS SUBDOMAIN OF ANY scamDomain) THEN:
        RETURN FALSE  # Allow - not on blacklist
    END IF
    
    # Step 3: Check if whitelisted
    IF allowedDomains CONTAINS domain THEN:
        RETURN FALSE  # Allow - user whitelisted this domain
    END IF
    
    # Block - domain is malicious and not whitelisted
    RETURN TRUE
END FUNCTION
```

---

## 9. Session Lifecycle

```pseudocode
# Session state management
SESSION_START:
    protectionEnabled = TRUE        # Always starts enabled
    allowedDomains = EMPTY_SET      # Always starts empty
    scamDomains = FETCH_FRESH()     # Fetch latest blacklist

SESSION_RUNNING:
    # protectionEnabled can be toggled by user
    # allowedDomains grows as user clicks "Proceed Anyway"
    # scamDomains can be manually refreshed

SESSION_END:
    # allowedDomains is in-memory, automatically cleared
    # protectionEnabled in session storage, automatically cleared
    # scamDomains persists in local storage for offline fallback
```

---

## 10. Error Handling Strategy

```pseudocode
STRATEGY ErrorHandling:
    
    RULE NetworkErrors:
        - Log error for debugging
        - Fallback to cached data
        - Continue with degraded functionality
        - Never crash or block user
    
    RULE StorageErrors:
        - Log error
        - Use in-memory defaults
        - Allow basic protection to work
    
    RULE MessageErrors:
        - Return safe defaults
        - { isScam: FALSE, protectionEnabled: TRUE }
    
    RULE URLParseErrors:
        - Return empty string
        - Skip protection for that navigation
        - Never block legitimate sites by error
END STRATEGY
```
