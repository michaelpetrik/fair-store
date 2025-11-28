export interface OverlayOptions {
  readonly id: string;
  readonly styles: Record<string, string>;
  readonly domain?: string;
  readonly reason?: string;
}

export class OverlayRenderer {
  private readonly document: Document;
  private readonly options: OverlayOptions;
  private overlayElement: HTMLDivElement | null = null;

  constructor(documentRef: Document, options: OverlayOptions) {
    this.document = documentRef;
    this.options = options;
  }

  public render(): HTMLDivElement | null {
    const existingElement = this.document.getElementById(this.options.id);
    if (existingElement instanceof HTMLDivElement) {
      return existingElement;
    }

    const { body } = this.document;
    if (!body) {
      return null;
    }

    // Create the overlay container
    this.overlayElement = this.document.createElement('div');
    this.overlayElement.id = this.options.id;
    this.applyStyles(this.overlayElement);

    // Create the warning content
    this.overlayElement.innerHTML = this.createWarningHTML();

    // Add event listeners
    this.attachEventListeners(this.overlayElement);

    body.appendChild(this.overlayElement);

    return this.overlayElement;
  }

  private createWarningHTML(): string {
    const domain = this.options.domain || window.location.hostname;
    const reason = this.options.reason || 'Tento e-shop je veden v seznamu rizikových provozoven České obchodní inspekce.';

    return `
      <div class="fair-store-warning-container">
        <div class="fair-store-warning-header">
          <svg class="fair-store-warning-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 9V11M12 15H12.01M5.07183 19H18.9282C20.4678 19 21.4301 17.3333 20.6603 16L13.7321 4C12.9623 2.66667 11.0378 2.66667 10.268 4L3.33978 16C2.56998 17.3333 3.53223 19 5.07183 19Z" 
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <h1 class="fair-store-warning-title">⚠️ Varování: Rizikový e-shop!</h1>
        </div>

        <div class="fair-store-warning-content">
          <p class="fair-store-warning-text">
            Navštívili jste potenciálně <strong>podvodný e-shop</strong>: <strong>${this.escapeHtml(domain)}</strong>
          </p>
          
          <div class="fair-store-warning-source">
            <div class="fair-store-source-badge">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" 
                      stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              Ověřeno podle dat ČOI
            </div>
          </div>

          <div class="fair-store-details-section">
            <button class="fair-store-details-toggle" id="fair-store-toggle-details" aria-expanded="false">
              <svg class="fair-store-chevron" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 9L12 16L5 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              Zobrazit důvod varování
            </button>
            <div class="fair-store-details-content" id="fair-store-details-content">
              <div class="fair-store-coi-reason">
                <h3>Důvod zařazení do seznamu ČOI:</h3>
                <p>${this.escapeHtml(reason)}</p>
              </div>
            </div>
          </div>

          <div class="fair-store-warning-advice">
            <strong>🛡️ Doporučení:</strong> Tuto stránku raději opusťte a nakupujte pouze u ověřených prodejců. 
            Rizikové e-shopy mohou ukrást vaše osobní údaje nebo peníze.
          </div>
        </div>

        <div class="fair-store-warning-actions">
          <button class="fair-store-btn fair-store-btn-primary" id="fair-store-close-tab">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 18L18 6M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Zavřít kartu
          </button>
          <button class="fair-store-btn fair-store-btn-secondary" id="fair-store-ignore-warning">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M13 7H11V13H13V7ZM13 15H11V17H13V15Z" fill="currentColor"/>
              <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z" 
                    stroke="currentColor" stroke-width="2"/>
            </svg>
            Pokračovat na vlastní riziko
          </button>
        </div>

        <div class="fair-store-warning-footer">
          <p>
            Ochrana poskytována rozšířením <strong>Fair Store</strong> · 
            Data: Česká obchodní inspekce
          </p>
        </div>
      </div>
    `;
  }

  private escapeHtml(unsafe: string): string {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private attachEventListeners(overlay: HTMLDivElement): void {
    // Close tab button
    const closeBtn = overlay.querySelector('#fair-store-close-tab');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        window.close();
        // If window.close() doesn't work (e.g., not opened by script), go back
        setTimeout(() => {
          if (window.history.length > 1) {
            window.history.back();
          } else {
            window.location.href = 'about:blank';
          }
        }, 100);
      });
    }

    // Ignore warning button
    const ignoreBtn = overlay.querySelector('#fair-store-ignore-warning');
    if (ignoreBtn) {
      ignoreBtn.addEventListener('click', () => {
        this.remove();
      });
    }

    // Toggle details button
    const toggleBtn = overlay.querySelector('#fair-store-toggle-details');
    const detailsContent = overlay.querySelector('#fair-store-details-content');
    const chevron = overlay.querySelector('.fair-store-chevron');

    if (toggleBtn && detailsContent) {
      toggleBtn.addEventListener('click', () => {
        const isExpanded = toggleBtn.getAttribute('aria-expanded') === 'true';
        toggleBtn.setAttribute('aria-expanded', (!isExpanded).toString());

        if (isExpanded) {
          detailsContent.classList.remove('expanded');
          if (chevron) {
            (chevron as HTMLElement).style.transform = 'rotate(0deg)';
          }
        } else {
          detailsContent.classList.add('expanded');
          if (chevron) {
            (chevron as HTMLElement).style.transform = 'rotate(180deg)';
          }
        }
      });
    }
  }

  private applyStyles(element: HTMLDivElement): void {
    Object.entries(this.options.styles).forEach(([property, value]) => {
      element.style.setProperty(property, value);
    });
  }

  public remove(): void {
    if (this.overlayElement && this.overlayElement.parentNode) {
      this.overlayElement.parentNode.removeChild(this.overlayElement);
      this.overlayElement = null;
    }
  }
}
