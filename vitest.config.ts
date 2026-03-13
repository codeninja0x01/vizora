import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: ['vitest.root.config.ts', 'editor/vitest.config.ts'],
    // packages/openvideo uses browser-mode Vitest (Playwright provider);
    // run those separately via: pnpm --filter openvideo test
  },
});
