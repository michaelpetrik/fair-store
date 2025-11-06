import { beforeEach, describe, expect, it } from 'vitest';
import { BannerRenderer } from './bannerRenderer';

const createRenderer = (documentRef: Document) =>
  new BannerRenderer(documentRef, {
    id: 'test-banner',
    text: 'SCAM STORE',
    styles: {
      position: 'absolute',
      top: '0',
    },
  });

describe('BannerRenderer', () => {
  let documentRef: Document;

  beforeEach(() => {
    documentRef = document.implementation.createHTMLDocument('test');
  });

  it('creates and appends a banner element to the document body', () => {
    const renderer = createRenderer(documentRef);

    const banner = renderer.render();

    expect(banner).not.toBeNull();
    expect(documentRef.getElementById('test-banner')).toBe(banner);
    expect(banner?.textContent).toBe('SCAM STORE');
    expect(banner?.style.position).toBe('absolute');
  });

  it('returns the existing banner when render is invoked multiple times', () => {
    const renderer = createRenderer(documentRef);

    const firstRender = renderer.render();
    const secondRender = renderer.render();

    expect(secondRender).toBe(firstRender);
  });

  it('returns null when the document body is unavailable', () => {
    const rendererDocument = document.implementation.createHTMLDocument('no-body');
    const body = rendererDocument.body;
    body?.remove();
    Object.defineProperty(rendererDocument, 'body', {
      value: null,
      configurable: true,
    });

    const renderer = createRenderer(rendererDocument);

    expect(renderer.render()).toBeNull();
  });
});
