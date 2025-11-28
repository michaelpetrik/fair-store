import { vi } from 'vitest';

// Mock chrome API globally for all tests
const chrome = {
    runtime: {
        onInstalled: {
            addListener: vi.fn(),
        },
        onMessage: {
            addListener: vi.fn(),
        },
        sendMessage: vi.fn(),
    },
    tabs: {
        onUpdated: {
            addListener: vi.fn(),
        },
        sendMessage: vi.fn(),
        query: vi.fn(() => Promise.resolve([])),
        remove: vi.fn(),
    },
    storage: {
        local: {
            set: vi.fn(() => Promise.resolve()),
            get: vi.fn(() => Promise.resolve({})),
        },
        session: {
            set: vi.fn(() => Promise.resolve()),
            get: vi.fn(() => Promise.resolve({ protectionEnabled: true })),
        },
    },
};

Object.defineProperty(globalThis, 'chrome', {
    value: chrome,
    writable: true,
    configurable: true
});
