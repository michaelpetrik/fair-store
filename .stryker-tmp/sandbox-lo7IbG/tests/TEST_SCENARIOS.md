# Test Scenarios & Decision Matrix

This document outlines all possible test scenarios, edge cases, and failure modes for the Fair Store extension. It serves as a checklist to ensure robust quality assurance.

## Status Legend
- ✅ **Done**: Covered by automated tests
- ⚠️ **Partial**: Partially covered or covered by manual tests only
- ❌ **Undone**: Not currently covered, needs implementation
- 🚫 **N/A**: Not applicable or impossible to test in current environment

## 1. Core Logic: Domain Parsing & Matching (`background.js`)

| ID | Scenario | Status | Notes |
|----|----------|--------|-------|
| 1.1 | **Valid Domains** | | |
| 1.1.1 | Standard domain (`example.com`) | ✅ | |
| 1.1.2 | Subdomain (`sub.example.com`) | ✅ | |
| 1.1.3 | Deep subdomain (`a.b.c.example.com`) | ✅ | |
| 1.1.4 | Domain with port (`example.com:8080`) | ✅ | |
| 1.1.5 | Domain with path (`example.com/path`) | ✅ | |
| 1.1.6 | Domain with query (`example.com?q=1`) | ✅ | |
| 1.1.7 | Domain with hash (`example.com#hash`) | ✅ | |
| 1.1.8 | HTTPS protocol | ✅ | |
| 1.1.9 | HTTP protocol | ✅ | |
| 1.1.10 | No protocol (if possible in input) | ✅ | |
| 1.2 | **Special Domains** | | |
| 1.2.1 | Internationalized Domain Names (IDN) | ✅ | e.g., `münchen.de` |
| 1.2.2 | Punycode domains | ✅ | e.g., `xn--...` |
| 1.2.3 | IP Addresses (IPv4) | ✅ | |
| 1.2.4 | IP Addresses (IPv6) | ❌ | Needs verification |
| 1.2.5 | Localhost | ✅ | |
| 1.2.6 | Single letter domains | ✅ | |
| 1.2.7 | TLDs with multiple dots (`co.uk`) | ✅ | |
| 1.3 | **Invalid/Edge Case Inputs** | | |
| 1.3.1 | Empty string | ✅ | |
| 1.3.2 | Null/Undefined | ✅ | |
| 1.3.3 | Non-string input (numbers, objects) | ❌ | |
| 1.3.4 | Malformed URLs (`http:///example.com`) | ⚠️ | Handled by try/catch, but specific cases? |
| 1.3.5 | `javascript:` protocol | ✅ | |
| 1.3.6 | `data:` protocol | ❌ | |
| 1.3.7 | `file:` protocol | ❌ | |
| 1.3.8 | `chrome://` protocol | ✅ | |
| 1.3.9 | `about:blank` | ❌ | |
| 1.3.10 | Extremely long URLs (>2k chars) | ✅ | |
| 1.3.11 | URLs with user/pass auth | ✅ | Fixed in previous step |

## 2. Data Ingestion: CSV Parsing (`background.js`)

| ID | Scenario | Status | Notes |
|----|----------|--------|-------|
| 2.1 | **Standard Formats** | | |
| 2.1.1 | Semicolon delimiter | ✅ | |
| 2.1.2 | Comma delimiter | ✅ | |
| 2.1.3 | Quoted values | ✅ | |
| 2.1.4 | Unquoted values | ✅ | |
| 2.1.5 | Mixed quoting | ❌ | |
| 2.2 | **Structure Variations** | | |
| 2.2.1 | Header row present | ✅ | |
| 2.2.2 | Header row missing | ❌ | Assumes header presence? |
| 2.2.3 | Column order changes | ✅ | |
| 2.2.4 | Extra columns | ✅ | |
| 2.2.5 | Missing columns (reason) | ✅ | |
| 2.3 | **Data Integrity** | | |
| 2.3.1 | Empty file | ✅ | |
| 2.3.2 | Only headers | ✅ | |
| 2.3.3 | Empty lines | ✅ | |
| 2.3.4 | Lines with whitespace only | ✅ | |
| 2.3.5 | Duplicate domains | ❌ | Last one wins? First one? |
| 2.3.6 | Case sensitivity in CSV | ✅ | |
| 2.3.7 | Special characters in content | ✅ | |
| 2.3.8 | Binary/Garbage data | ❌ | |
| 2.3.9 | Huge file (100k+ lines) | ✅ | Performance test exists |

## 3. System & Network (`background.js`)

| ID | Scenario | Status | Notes |
|----|----------|--------|-------|
| 3.1 | **Network Requests** | | |
| 3.1.1 | Successful fetch (200 OK) | ⚠️ | Mocked in tests? |
| 3.1.2 | Network error (offline) | ❌ | |
| 3.1.3 | Server error (500) | ❌ | |
| 3.1.4 | Not found (404) | ❌ | |
| 3.1.5 | Timeout | ❌ | |
| 3.1.6 | Invalid Content-Type | ❌ | |
| 3.2 | **Storage (chrome.storage.local)** | | |
| 3.2.1 | Save success | ⚠️ | |
| 3.2.2 | Load success | ⚠️ | |
| 3.2.3 | Storage quota exceeded | ❌ | |
| 3.2.4 | Storage undefined/unavailable | ❌ | |
| 3.2.5 | Corrupt data in storage | ❌ | |
| 3.3 | **Concurrency & State** | | |
| 3.3.1 | Extension install event | ⚠️ | |
| 3.3.2 | Extension update event | ❌ | |
| 3.3.3 | Browser startup | ⚠️ | |
| 3.3.4 | Race: Check before list loaded | ❌ | |

## 4. Content Script & UI (`content.js`)

| ID | Scenario | Status | Notes |
|----|----------|--------|-------|
| 4.1 | **Injection & Display** | | |
| 4.1.1 | Inject on scam site | ✅ | |
| 4.1.2 | Do not inject on safe site | ✅ | |
| 4.1.3 | Inject on already loaded page | ❌ | |
| 4.1.4 | Inject on dynamic navigation (SPA) | ❌ | |
| 4.2 | **UI Elements** | | |
| 4.2.1 | Overlay rendering | ✅ | |
| 4.2.2 | Text content correctness | ✅ | |
| 4.2.3 | XSS in domain display | ✅ | |
| 4.2.4 | XSS in reason display | ✅ | |
| 4.3 | **Interactions** | | |
| 4.3.1 | Close tab button | ✅ | |
| 4.3.2 | Ignore button | ✅ | |
| 4.3.3 | Details toggle | ✅ | |
| 4.3.4 | Keyboard navigation (Tab) | ⚠️ | Logic exists, test coverage? |
| 4.3.5 | Escape key to close | ⚠️ | Logic exists, test coverage? |
| 4.4 | **Environment** | | |
| 4.4.1 | Conflicting page CSS | ❌ | Does page CSS break overlay? |
| 4.4.2 | Conflicting page JS | ❌ | |
| 4.4.3 | iframe contexts | ❌ | Should it run in iframes? |

## 5. User Configuration

| ID | Scenario | Status | Notes |
|----|----------|--------|-------|
| 5.1 | **Protection Settings** | | |
| 5.1.1 | Protection Enabled (default) | ✅ | |
| 5.1.2 | Protection Disabled | ❌ | Logic exists, needs test |
| 5.1.3 | Toggle while on page | ❌ | |
