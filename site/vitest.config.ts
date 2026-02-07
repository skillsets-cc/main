import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
  },
  resolve: {
    alias: {
      'cloudflare:workers': new URL('./vitest-mocks/cloudflare-workers.ts', import.meta.url).pathname,
      '@/': path.resolve(new URL('.', import.meta.url).pathname, 'src') + '/',
      '@components/': path.resolve(new URL('.', import.meta.url).pathname, 'src/components') + '/',
    },
  },
});
