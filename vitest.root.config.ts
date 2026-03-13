import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'root',
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules/**'],
  },
});
