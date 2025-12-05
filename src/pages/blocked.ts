import './blocked.css';
// Logic for the blocked page

/**
 * Sanitize text for display - prevents XSS attacks
 */
function sanitizeText(text: string): string {
    if (!text || typeof text !== 'string') return '';
    // Remove control characters and limit length
    return text.replace(/[\x00-\x1F\x7F]/g, '').substring(0, 500);
}

/**
 * Validate and sanitize URL
 */
function validateUrl(url: string): string | null {
    if (!url || typeof url !== 'string') return null;

    try {
        const parsed = new URL(url);
        // Only allow http and https
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            return null;
        }
        return parsed.href;
    } catch {
        return null;
    }
}

/**
 * Safely set text content - always use textContent, never innerHTML
 */
function safeSetText(elementId: string, text: string): void {
    const element = document.getElementById(elementId);
    if (element) {
        // Use textContent to prevent XSS
        element.textContent = sanitizeText(text);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const originalUrl = params.get('url');

    if (!originalUrl) {
        // Safe error message - use textContent
        const h1 = document.createElement('h1');
        h1.textContent = 'Chyba: Neplatná URL';
        document.body.innerHTML = '';
        document.body.appendChild(h1);
        return;
    }

    // Security: Validate URL before processing
    const validatedUrl = validateUrl(originalUrl);
    if (!validatedUrl) {
        const h1 = document.createElement('h1');
        h1.textContent = 'Chyba: Neplatná URL';
        document.body.innerHTML = '';
        document.body.appendChild(h1);
        return;
    }

    let domain: string;
    try {
        domain = new URL(validatedUrl).hostname;
    } catch {
        const h1 = document.createElement('h1');
        h1.textContent = 'Chyba: Neplatná URL';
        document.body.innerHTML = '';
        document.body.appendChild(h1);
        return;
    }

    // Security: Use textContent to prevent XSS
    safeSetText('domain-name', domain);

    // Load reason from storage
    try {
        const result = await chrome.storage.local.get(['scamDomains']);
        const rawDomains = result.scamDomains as [string, string][] | undefined;
        const scamDomains = new Map<string, string>(rawDomains || []);

        // Find the reason (exact match or suffix match)
        let reason = scamDomains.get(domain);
        if (!reason) {
            for (const [scamDomain, scamReason] of scamDomains.entries()) {
                if (domain.endsWith('.' + scamDomain) || domain === scamDomain) {
                    reason = scamReason;
                    break;
                }
            }
        }

        // Security: Sanitize reason text before displaying
        safeSetText('reason-text', reason || 'Důvod nebyl nalezen.');
    } catch (error) {
        console.error('Failed to load reason:', error);
        safeSetText('reason-text', 'Nepodařilo se načíst důvod.');
    }

    // Event Listeners

    // Toggle details
    const toggleBtn = document.getElementById('fair-store-toggle-details');
    const detailsContent = document.getElementById('fair-store-details-content');
    const chevron = document.querySelector('.fair-store-chevron') as HTMLElement;

    if (toggleBtn && detailsContent) {
        toggleBtn.addEventListener('click', () => {
            const isExpanded = toggleBtn.getAttribute('aria-expanded') === 'true';
            toggleBtn.setAttribute('aria-expanded', (!isExpanded).toString());

            if (isExpanded) {
                detailsContent.classList.remove('expanded');
                if (chevron) chevron.style.transform = 'rotate(0deg)';
            } else {
                detailsContent.classList.add('expanded');
                if (chevron) chevron.style.transform = 'rotate(180deg)';
            }
        });
    }

    // Close Tab / Go to Safety
    document.getElementById('fair-store-close-tab')?.addEventListener('click', () => {
        // Try to close the tab
        chrome.tabs.getCurrent((tab) => {
            if (tab && tab.id) {
                chrome.tabs.remove(tab.id);
            } else {
                // Fallback if not opened as a tab (unlikely) or script context issue
                window.location.href = 'https://www.google.com';
            }
        });
    });

    // Ignore Warning (Allow Domain)
    document.getElementById('fair-store-ignore-warning')?.addEventListener('click', async () => {
        try {
            // Security: Validate domain before sending
            if (!domain || typeof domain !== 'string') {
                throw new Error('Invalid domain');
            }

            // Send message to background to allow this domain
            const response = await chrome.runtime.sendMessage({
                action: 'allowDomain',
                domain: domain
            });

            // Security: Check response
            if (!response || !response.success) {
                throw new Error(response?.error || 'Failed to allow domain');
            }

            // Security: Validate URL before redirect
            const safeUrl = validateUrl(validatedUrl);
            if (!safeUrl) {
                throw new Error('Invalid URL for redirect');
            }

            // Redirect back to the original URL
            window.location.href = safeUrl;
        } catch (error) {
            console.error('Failed to allow domain:', error);
            // Safe alert - browser sanitizes alert text
            alert('Chyba: Nepodařilo se udělit výjimku.');
        }
    });
});
