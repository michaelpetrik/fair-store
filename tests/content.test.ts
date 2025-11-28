import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock chrome API
const mockSendMessage = vi.fn();
const mockLastError = undefined; // Default no error

global.chrome = {
  runtime: {
    sendMessage: mockSendMessage,
    lastError: mockLastError,
    // @ts-ignore
    onMessage: { addListener: vi.fn(), removeListener: vi.fn() }, // Mock this too
  },
  // @ts-ignore
  tabs: { query: vi.fn() },
  // @ts-ignore
  storage: { session: { get: vi.fn(), set: vi.fn() } },
  // @ts-ignore
  webNavigation: { onCompleted: { addListener: vi.fn() } },
};

// Mock the dependencies
const mockBannerRenderer = vi.fn(() => ({
  render: vi.fn(),
  remove: vi.fn(),
}));
const mockDomainBlacklist = vi.fn(() => ({
  // Mock methods if needed
}));
const mockOverlayRenderer = vi.fn(() => ({
  render: vi.fn(),
  remove: vi.fn(),
}));
const mockScamBannerController = vi.fn(() => ({
  init: vi.fn(),
}));

vi.mock('../src/content/bannerRenderer', () => ({ BannerRenderer: mockBannerRenderer }));
vi.mock('../src/content/domainBlacklist', () => ({ DomainBlacklist: mockDomainBlacklist }));
vi.mock('../src/content/overlayRenderer', () => ({ OverlayRenderer: mockOverlayRenderer }));
vi.mock('../src/content/controller', () => ({ ScamBannerController: mockScamBannerController }));


describe('content/index.ts', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    // Reset chrome.runtime.lastError before each test
    // @ts-ignore
    chrome.runtime.lastError = undefined;
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('should initialize the controller if blacklist is received successfully', async () => {
    mockSendMessage.mockImplementationOnce((message, callback) => {
      callback(['scam.com']); // Simulate successful blacklist reception
    });

    // Dynamically import the module to trigger its execution
    await import('../src/content/index');

    expect(mockSendMessage).toHaveBeenCalledWith({ action: 'getBlacklist' }, expect.any(Function));
    expect(mockBannerRenderer).toHaveBeenCalledWith(document, expect.any(Object));
    expect(mockOverlayRenderer).toHaveBeenCalledWith(document, expect.any(Object));
    expect(mockDomainBlacklist).toHaveBeenCalledWith(['scam.com']);
    expect(mockScamBannerController).toHaveBeenCalledWith(
      document,
      window.location,
      expect.any(mockDomainBlacklist), // Check for instance of mocked class
      expect.any(mockBannerRenderer),
      expect.any(mockOverlayRenderer)
    );
    expect(mockScamBannerController.mock.results[0].value.init).toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('should log an error if chrome.runtime.lastError is present', async () => {
    // Simulate an error during sendMessage
    mockSendMessage.mockImplementationOnce((message, callback) => {
      // @ts-ignore
      chrome.runtime.lastError = { message: 'Test error' };
      callback(undefined);
    });

    await import('../src/content/index');

    expect(mockSendMessage).toHaveBeenCalledWith({ action: 'getBlacklist' }, expect.any(Function));
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.objectContaining({ message: 'Test error' }));
    expect(mockScamBannerController).not.toHaveBeenCalled(); // Controller should not be initialized on error
  });

  it('should handle no blacklist received (empty array)', async () => {
    mockSendMessage.mockImplementationOnce((message, callback) => {
      callback([]); // Simulate empty blacklist
    });

    await import('../src/content/index');

    expect(mockSendMessage).toHaveBeenCalledWith({ action: 'getBlacklist' }, expect.any(Function));
    expect(mockDomainBlacklist).toHaveBeenCalledWith([]);
    expect(mockScamBannerController).toHaveBeenCalled();
    expect(mockScamBannerController.mock.results[0].value.init).toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });
});
