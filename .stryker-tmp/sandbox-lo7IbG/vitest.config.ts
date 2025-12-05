import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['**/tests/**/*.test.js', '**/tests/**/*.test.ts', '**/tests/**/*.test.tsx'],
    coverage: {
      reporter: ['text', 'html'],
      enabled: false,
    },
  },
});
