import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import preact from '@preact/preset-vite';
import manifest from './manifest.json';

export default defineConfig({
  plugins: [preact(), crx({ manifest })],
  build: {
    rollupOptions: {
      input: {
        blocked: 'src/pages/blocked.html'
      }
    }
  }
});









