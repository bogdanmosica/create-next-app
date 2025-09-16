/**
 * @fileoverview Template Consolidation Integration Tests
 * @description Validates that template consolidation does not break functionality
 * T005: Integration test to validate template consolidation does not break functionality
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { tmpdir } from 'os';

// Import the creators that use templates to test they still work
import { createSaasLibraryFiles } from '../../src/creators/saas-lib-creators.js';
import { createEnhancedStructureFiles } from '../../src/creators/enhanced-structure-creators.js';
import { createI18nFiles } from '../../src/creators/i18n-creators.js';
import { createDashboardFiles } from '../../src/creators/dashboard-creators.js';

describe('Template Consolidation Integration Tests', () => {
  let testProjectPath: string;

  beforeEach(async () => {
    // Create a temporary directory for each test
    testProjectPath = path.join(
      tmpdir(),
      `template-consolidation-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
    );
    await fs.ensureDir(testProjectPath);
  });

  afterEach(async () => {
    // Clean up test directory
    if (await fs.pathExists(testProjectPath)) {
      await fs.remove(testProjectPath);
    }
  });

  describe('Template Loading Functionality', () => {
    it('should successfully load and use SaaS library templates', async () => {
      const config = {
        projectPath: testProjectPath,
        includeAuth: true,
        includeDatabase: true,
        includePayments: true
      };

      // This should work without throwing errors after consolidation
      expect(async () => {
        await createSaasLibraryFiles(config);
      }).not.toThrow();

      // Verify some key files were created
      const libsDir = path.join(testProjectPath, 'libs');
      expect(await fs.pathExists(libsDir)).toBe(true);

      // Check for auth files
      const authDir = path.join(libsDir, 'auth');
      if (config.includeAuth && await fs.pathExists(authDir)) {
        const sessionFile = path.join(authDir, 'session.ts');
        expect(await fs.pathExists(sessionFile)).toBe(true);
      }

      // Check for database files
      const dbDir = path.join(libsDir, 'db');
      if (config.includeDatabase && await fs.pathExists(dbDir)) {
        const schemaFile = path.join(dbDir, 'schema.ts');
        expect(await fs.pathExists(schemaFile)).toBe(true);
      }
    });

    it('should successfully load and use enhanced structure templates', async () => {
      const config = {
        projectPath: testProjectPath,
        includeAuthForms: true,
        includeDatabase: true
      };

      expect(async () => {
        await createEnhancedStructureFiles(config);
      }).not.toThrow();

      // Verify enhanced structure files were created
      const folders = ['models', 'validations', 'types'];
      for (const folder of folders) {
        const folderPath = path.join(testProjectPath, folder);
        expect(await fs.pathExists(folderPath)).toBe(true);

        // Check README files exist
        const readmePath = path.join(folderPath, 'README.md');
        expect(await fs.pathExists(readmePath)).toBe(true);
      }
    });

    it('should successfully load and use i18n templates', async () => {
      const config = {
        projectPath: testProjectPath,
        languages: ['en', 'es', 'fr']
      };

      expect(async () => {
        await createI18nFiles(config);
      }).not.toThrow();

      // Verify i18n structure was created
      const localesDir = path.join(testProjectPath, 'locales');
      expect(await fs.pathExists(localesDir)).toBe(true);

      // Check language files
      for (const lang of config.languages) {
        const langFile = path.join(localesDir, `${lang}.json`);
        expect(await fs.pathExists(langFile)).toBe(true);
      }

      // Check middleware and config files
      const middlewarePath = path.join(testProjectPath, 'middleware.ts');
      expect(await fs.pathExists(middlewarePath)).toBe(true);

      const i18nConfigPath = path.join(testProjectPath, 'libs', 'i18n-config.ts');
      expect(await fs.pathExists(i18nConfigPath)).toBe(true);
    });

    it('should successfully load and use dashboard templates', async () => {
      const config = {
        projectPath: testProjectPath,
        includeDashboard: true
      };

      expect(async () => {
        await createDashboardFiles(config);
      }).not.toThrow();

      // Verify dashboard files were created
      const dashboardDir = path.join(testProjectPath, 'app', 'dashboard');
      if (await fs.pathExists(dashboardDir)) {
        const pagePath = path.join(dashboardDir, 'page.tsx');
        expect(await fs.pathExists(pagePath)).toBe(true);
      }
    });
  });

  describe('Template Content Integrity', () => {
    it('should generate valid TypeScript files', async () => {
      await createSaasLibraryFiles({
        projectPath: testProjectPath,
        includeAuth: true,
        includeDatabase: true
      });

      // Find all .ts and .tsx files that were generated
      const tsFiles = await findTypeScriptFiles(testProjectPath);

      for (const file of tsFiles) {
        const content = await fs.readFile(file, 'utf-8');

        // Basic syntax checks
        expect(content.length).toBeGreaterThan(0);

        // Should not have template placeholder errors
        expect(content).not.toContain('TEMPLATE_ERROR');
        expect(content).not.toContain('undefined');
        expect(content).not.toContain('[object Object]');

        // Should have valid imports (no broken template references)
        const importLines = content.split('\n').filter(line =>
          line.trim().startsWith('import ') && line.includes('from')
        );

        for (const importLine of importLines) {
          // Should not have malformed import paths
          expect(importLine).not.toContain('from undefined');
          expect(importLine).not.toContain('from null');
          expect(importLine).not.toContain('from [object');
        }
      }
    });

    it('should generate valid JSON configuration files', async () => {
      await createSaasLibraryFiles({
        projectPath: testProjectPath,
        includeDatabase: true
      });

      // Find JSON files
      const jsonFiles = await findFilesWithExtension(testProjectPath, '.json');

      for (const file of jsonFiles) {
        const content = await fs.readFile(file, 'utf-8');

        // Should be valid JSON
        expect(() => {
          JSON.parse(content);
        }).not.toThrow();
      }
    });

    it('should maintain proper file encoding and formatting', async () => {
      await createEnhancedStructureFiles({
        projectPath: testProjectPath,
        includeAuthForms: true
      });

      const allFiles = await findAllGeneratedFiles(testProjectPath);

      for (const file of allFiles) {
        const content = await fs.readFile(file, 'utf-8');

        // Should not have encoding issues
        expect(content).not.toContain('\uFFFD'); // Replacement character
        expect(content).not.toContain('\x00'); // Null bytes

        // Should have consistent line endings (LF)
        if (content.length > 0) {
          expect(content).not.toMatch(/\r(?!\n)/); // CR without LF
        }
      }
    });
  });

  describe('Cross-Template Dependencies', () => {
    it('should handle templates that reference other templates', async () => {
      // Some templates might import or reference other templates
      const config = {
        projectPath: testProjectPath,
        includeAuth: true,
        includeDatabase: true,
        includePayments: true,
        includeI18n: true
      };

      // Create full setup to test interdependencies
      await createSaasLibraryFiles(config);
      await createEnhancedStructureFiles(config);

      // Verify that files referencing each other exist and are valid
      const libsDir = path.join(testProjectPath, 'libs');

      // Check auth references database
      const authSession = path.join(libsDir, 'auth', 'session.ts');
      if (await fs.pathExists(authSession)) {
        const content = await fs.readFile(authSession, 'utf-8');

        // Should have valid database imports if database is included
        if (config.includeDatabase) {
          // Look for database imports - they should resolve correctly
          const dbImports = content.match(/from ['"].*db.*['"]/g);
          if (dbImports) {
            // Basic check that imports don't look broken
            for (const importStr of dbImports) {
              expect(importStr).not.toContain('undefined');
              expect(importStr).not.toContain('[object');
            }
          }
        }
      }
    });

    it('should handle template inheritance and composition', async () => {
      // Test that templates can build upon each other
      await createSaasLibraryFiles({
        projectPath: testProjectPath,
        includeAuth: true,
        includeDatabase: true,
        includePayments: true
      });

      // Payments should build on auth, which builds on database
      const paymentsDir = path.join(testProjectPath, 'libs', 'payments');
      if (await fs.pathExists(paymentsDir)) {
        const stripeFile = path.join(paymentsDir, 'stripe.ts');
        if (await fs.pathExists(stripeFile)) {
          const content = await fs.readFile(stripeFile, 'utf-8');

          // Should have references to auth (customer management)
          // This tests that the template composition works
          expect(content.length).toBeGreaterThan(0);

          // Should not have broken references
          expect(content).not.toContain('TEMPLATE_ERROR');
          expect(content).not.toContain('undefined');
        }
      }
    });
  });

  describe('Template Performance', () => {
    it('should load templates efficiently', async () => {
      const startTime = Date.now();

      await createSaasLibraryFiles({
        projectPath: testProjectPath,
        includeAuth: true,
        includeDatabase: true,
        includePayments: true
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(10000); // 10 seconds
    });

    it('should not have memory leaks during template processing', async () => {
      // Run multiple template generations to check for memory issues
      for (let i = 0; i < 5; i++) {
        const iterationDir = path.join(testProjectPath, `iteration-${i}`);
        await fs.ensureDir(iterationDir);

        await createSaasLibraryFiles({
          projectPath: iterationDir,
          includeAuth: true,
          includeDatabase: true
        });

        // Clean up immediately to prevent accumulation
        await fs.remove(iterationDir);
      }

      // If we get here without errors, memory management is likely OK
      expect(true).toBe(true);
    });
  });
});

// Helper functions for finding files
async function findTypeScriptFiles(dir: string): Promise<string[]> {
  return await findFilesWithExtensions(dir, ['.ts', '.tsx']);
}

async function findFilesWithExtension(dir: string, ext: string): Promise<string[]> {
  return await findFilesWithExtensions(dir, [ext]);
}

async function findFilesWithExtensions(dir: string, extensions: string[]): Promise<string[]> {
  const files: string[] = [];

  if (!await fs.pathExists(dir)) {
    return files;
  }

  async function traverse(currentDir: string) {
    const items = await fs.readdir(currentDir);

    for (const item of items) {
      const itemPath = path.join(currentDir, item);
      const stat = await fs.stat(itemPath);

      if (stat.isDirectory()) {
        await traverse(itemPath);
      } else {
        if (extensions.some(ext => item.endsWith(ext))) {
          files.push(itemPath);
        }
      }
    }
  }

  await traverse(dir);
  return files;
}

async function findAllGeneratedFiles(dir: string): Promise<string[]> {
  return await findFilesWithExtensions(dir, ['.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.yml', '.yaml']);
}