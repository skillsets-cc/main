// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: cloudflare({
    workerEntryPoint: {
      path: 'src/worker.ts',
      namedExports: ['ReservationCoordinator'],
    },
  }),
  integrations: [
    react(),
    tailwind(),
  ],
  vite: {
    ssr: {
      external: ['node:buffer'],
    },
  },
});
