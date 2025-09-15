import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'tests/**/*.test.ts',
      'tests/**/*.spec.ts'
    ],
    exclude: [
      'node_modules',
      'dist',
      'next_test_projects'
    ],
    testTimeout: 60000, // 60 seconds for integration tests
    hookTimeout: 30000, // 30 seconds for setup/teardown
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      include: [
        'src/core/**',
        'src/utils/transaction-manager.ts',
        'src/utils/logger.ts'
      ],
      exclude: [
        'src/testing/**',
        'src/templates/**',
        '**/*.d.ts',
        '**/*.test.ts'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 85,
          lines: 85,
          statements: 85
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  }
});