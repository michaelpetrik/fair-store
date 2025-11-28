import './blocked.css';
// Logic for the blocked page

document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const originalUrl = params.get('url');

    if (!originalUrl) {
        document.body.innerHTML = '<h1>Chyba: Neplatná URL</h1>';
        return;
    }

    const domain = new URL(originalUrl).hostname;
    document.getElementById('domain-name')!.textContent = domain;

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

        document.getElementById('reason-text')!.textContent = reason || 'Důvod nebyl nalezen.';
    } catch (error) {
        console.error('Failed to load reason:', error);
        document.getElementById('reason-text')!.textContent = 'Nepodařilo se načíst důvod.';
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
    });
});
