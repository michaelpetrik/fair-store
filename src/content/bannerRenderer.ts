export interface BannerOptions {
  readonly id: string;
  readonly text: string;
  readonly styles: Record<string, string>;
}

export class BannerRenderer {
  private readonly document: Document;
  private readonly options: BannerOptions;

  constructor(documentRef: Document, options: BannerOptions) {
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

    const banner = this.document.createElement('div');
    banner.id = this.options.id;
    banner.textContent = this.options.text;

    this.applyStyles(banner);
    body.appendChild(banner);

    return banner;
  }

  private applyStyles(element: HTMLDivElement): void {
    Object.entries(this.options.styles).forEach(([property, value]) => {
      element.style.setProperty(property, value);
    });
  }
}
