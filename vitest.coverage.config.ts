import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Test environment configuration
    environment: 'node',
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov', 'json'],
      reportsDirectory: './coverage',
      
      // Coverage thresholds
      thresholds: {
        global: {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85
        },
        // Higher thresholds for critical components
        './src/core/': {
          branches: 95,
          functions: 95,
          lines: 95,
          statements: 95
        },
        './src/tools/': {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      },
      
      // Include patterns
      include: [
        'src/**/*.{ts,tsx}',
        '!src/**/*.d.ts',
        '!src/**/*.test.{ts,tsx}',
        '!src/**/*.spec.{ts,tsx}',
        '!src/templates/**/*',
        '!src/testing/**/*'
      ],
      
      // Exclude patterns
      exclude: [
        'node_modules/',
        'coverage/',
        'dist/',
        '.next/',
        'tests/',
        '**/*.config.{ts,js}',
        '**/*.d.ts',
        '**/index.ts',
        'src/templates/',
        'src/testing/'
      ],
      
      // Coverage watermarks for color coding
      watermarks: {
        statements: [85, 95],
        functions: [85, 95],
        branches: [85, 95],
        lines: [85, 95]
      }
    },
    
    // Test file patterns
    include: [
      'tests/**/*.{test,spec}.{ts,tsx}',
      'src/**/*.{test,spec}.{ts,tsx}'
    ],
    
    // Test timeout
    testTimeout: 30000,
    
    // Setup files
    setupFiles: [],
    
    // Global test configuration
    globals: true,
    
    // Reporter configuration
    reporters: ['verbose', 'html'],
    outputFile: {
      html: './coverage/test-results.html'
    }
  },
  
  // Resolve configuration
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@tests': path.resolve(__dirname, './tests')
    }
  }
});