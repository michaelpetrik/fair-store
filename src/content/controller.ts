import { BannerRenderer } from './bannerRenderer';
import { DomainBlacklist } from './domainBlacklist';

export class ScamBannerController {
  constructor(
    private readonly documentRef: Document,
    private readonly locationRef: Pick<Location, 'hostname'>,
    private readonly blacklist: DomainBlacklist,
    private readonly bannerRenderer: BannerRenderer,
  ) { }

  public init(): void {
    const attemptRender = () => {
      if (this.blacklist.contains(this.locationRef.hostname)) {
        console.log("shit this is serious");
        this.bannerRenderer.render();
      }
      else {
        console.log("!!!!!!!! this is not serious\n " + this.locationRef.hostname + "\n" + this.blacklist);
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
