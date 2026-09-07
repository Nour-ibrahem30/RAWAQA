import type { Config } from 'jest';

// ts-jest transform tuple — use 'as any' to satisfy Jest's overly-strict types
const tsTransform = {
  '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
} as any;

const config: Config = {
  testTimeout: 30000,
  maxWorkers:  1,

  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/scripts/**',
    '!src/__tests__/**',
  ],

  projects: [
    // ── Unit tests — no DB, no globalSetup ────────────────────────────────
    {
      displayName:     'unit',
      preset:          'ts-jest',
      testEnvironment: 'node',
      testMatch:       ['<rootDir>/src/__tests__/unit/**/*.test.ts'],
      transform:       tsTransform,
    },

    // ── Integration tests — in-memory MongoDB ─────────────────────────────
    {
      displayName:     'integration',
      preset:          'ts-jest',
      testEnvironment: 'node',
      testMatch:       ['<rootDir>/src/__tests__/integration/**/*.test.ts'],
      globalSetup:     '<rootDir>/src/__tests__/setup/globalSetup.ts',
      globalTeardown:  '<rootDir>/src/__tests__/setup/globalTeardown.ts',
      transform:       tsTransform,
    },
  ],
};

export default config;
