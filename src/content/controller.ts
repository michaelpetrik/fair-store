import { BannerRenderer } from './bannerRenderer';
import { DomainBlacklist } from './domainBlacklist';
import { OverlayRenderer } from './overlayRenderer';

export class ScamBannerController {
  constructor(
    private readonly documentRef: Document,
    private readonly locationRef: Pick<Location, 'hostname'>,
    private readonly blacklist: DomainBlacklist,
    private readonly bannerRenderer: BannerRenderer,
    private readonly overlayRenderer: OverlayRenderer,
  ) { }

  public init(): void {
    const attemptRender = () => {
      if (this.blacklist.contains(this.locationRef.hostname)) {
        this.bannerRenderer.render();
        this.overlayRenderer.render();
      }
    };

    if (this.isDocumentReady()) {
      attemptRender();
      return;
    }

    this.documentRef.addEventListener('DOMContentLoaded', attemptRender, {
      once: true,
    });
  }

  private isDocumentReady(): boolean {
    const state = this.documentRef.readyState;
    return state === 'complete' || state === 'interactive';
  }
}