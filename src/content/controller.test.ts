import { describe, expect, it, vi } from 'vitest';
import type { BannerRenderer } from './bannerRenderer';
import { DomainBlacklist } from './domainBlacklist';
import { ScamBannerController } from './controller';

const createRendererMock = () => {
  const render = vi.fn<ReturnType<BannerRenderer['render']>, Parameters<BannerRenderer['render']>>();
  return {
    instance: { render } as unknown as BannerRenderer,
    spy: render,
  };
};

describe('ScamBannerController', () => {
  it('renders the banner immediately when the document is ready and hostname is blacklisted', () => {
    const documentRef = document.implementation.createHTMLDocument('ready');
    Object.defineProperty(documentRef, 'readyState', {
      configurable: true,
      get: () => 'complete',
    });
    const renderer = createRendererMock();
    const controller = new ScamBannerController(
      documentRef,
      { hostname: 'google.com' },
      new DomainBlacklist(['google.com']),
      renderer.instance,
    );

    controller.init();

    expect(renderer.spy).toHaveBeenCalledTimes(1);
  });

  it('does not render when the hostname is not blacklisted', () => {
    const documentRef = document.implementation.createHTMLDocument('ready');
    Object.defineProperty(documentRef, 'readyState', {
      configurable: true,
      get: () => 'complete',
    });
    const renderer = createRendererMock();
    const controller = new ScamBannerController(
      documentRef,
      { hostname: 'example.com' },
      new DomainBlacklist(['google.com']),
      renderer.instance,
    );

    controller.init();

    expect(renderer.spy).not.toHaveBeenCalled();
  });

  it('defers rendering until DOMContentLoaded when the document is still loading', () => {
    const documentRef = document.implementation.createHTMLDocument('loading');
    Object.defineProperty(documentRef, 'readyState', {
      configurable: true,
      get: () => 'loading',
    });
    const renderer = createRendererMock();
    const controller = new ScamBannerController(
      documentRef,
      { hostname: 'google.com' },
      new DomainBlacklist(['google.com']),
      renderer.instance,
    );

    controller.init();

    expect(renderer.spy).not.toHaveBeenCalled();

    documentRef.dispatchEvent(new Event('DOMContentLoaded'));

    expect(renderer.spy).toHaveBeenCalledTimes(1);
  });
});
