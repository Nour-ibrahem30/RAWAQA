import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals:     true,
    setupFiles:  ['./src/__tests__/setup/vitest.setup.tsx'],

    // Path aliases matching tsconfig
    alias: {
      '@': path.resolve(__dirname, './src'),
    },

    // Coverage settings
    coverage: {
      provider: 'v8',
      reporter:  ['text', 'lcov'],
      include:   ['src/**/*.{ts,tsx}'],
      exclude:   [
        'src/**/*.d.ts',
        'src/__tests__/**',
        'src/app/global-error.tsx',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
