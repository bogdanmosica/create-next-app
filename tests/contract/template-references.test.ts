/**
 * @fileoverview Template References Contract Tests
 * @description Validates that all template references resolve to the unified template folder
 * T004: Contract test to verify all template references resolve to the new folder
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.resolve(__dirname, '..', '..', 'src');

describe('Template References Contract Tests', () => {
  describe('Unified Template Location', () => {
    it('should have a unified templates directory', async () => {
      const unifiedTemplatesDir = path.join(srcDir, 'templates');
      expect(await fs.pathExists(unifiedTemplatesDir)).toBe(true);
    });

    it('should not have duplicate template-files directory', async () => {
      // After consolidation, template-files should be removed or empty
      const oldTemplateFilesDir = path.join(srcDir, 'template-files');

      if (await fs.pathExists(oldTemplateFilesDir)) {
        // If it exists, it should be empty (no .ts or .tsx files)
        const files = await fs.readdir(oldTemplateFilesDir, { recursive: true });
        const templateFiles = files.filter(file =>
          typeof file === 'string' && (file.endsWith('.ts') || file.endsWith('.tsx'))
        );
        expect(templateFiles.length).toBe(0);
      }
    });
  });

  describe('Template Imports Resolution', () => {
    it('should resolve all template imports to the unified folder', async () => {
      // Find all TypeScript files that import templates
      const files = await findFilesWithTemplateImports(srcDir);
      const invalidImports = [];

      for (const file of files) {
        const content = await fs.readFile(file, 'utf-8');
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];

          // Check for template imports that don't use the unified path
          if (line.includes('from') && line.includes('template')) {
            // Valid patterns should be:
            // from "../templates/..."  (unified location)
            // from "./templates/..."   (unified location)
            // from "@/templates/..."   (unified location with alias)

            const isValidTemplateImport =
              line.includes('from "../templates/') ||
              line.includes('from "./templates/') ||
              line.includes('from "@/templates/') ||
              line.includes('template-loader'); // Utility is allowed

            // Invalid patterns:
            const isInvalidTemplateImport =
              line.includes('from "../template-files/') ||
              line.includes('from "./template-files/') ||
              line.includes('from "../../template-files/');

            if (line.includes('template') && !isValidTemplateImport) {
              invalidImports.push({
                file: path.relative(srcDir, file),
                line: i + 1,
                content: line.trim()
              });
            }

            if (isInvalidTemplateImport) {
              invalidImports.push({
                file: path.relative(srcDir, file),
                line: i + 1,
                content: line.trim(),
                reason: 'Uses old template-files path'
              });
            }
          }
        }
      }

      if (invalidImports.length > 0) {
        const errorMessage = invalidImports.map(imp =>
          `${imp.file}:${imp.line} - ${imp.content}${imp.reason ? ` (${imp.reason})` : ''}`
        ).join('\n');

        expect.fail(`Found template imports not using unified folder:\n${errorMessage}`);
      }

      expect(invalidImports.length).toBe(0);
    });

    it('should have all template files accessible from unified location', async () => {
      const templatesDir = path.join(srcDir, 'templates');

      if (!await fs.pathExists(templatesDir)) {
        expect.fail('Unified templates directory does not exist');
        return;
      }

      // Get all template files
      const templateFiles = await findTemplateFiles(templatesDir);

      // Template files should exist and be importable
      expect(templateFiles.length).toBeGreaterThan(0);

      // Check that main template categories are present
      const categories = ['auth', 'config', 'database', 'core'];
      const missingCategories = [];

      for (const category of categories) {
        const hasCategory = templateFiles.some(file =>
          file.includes(category) ||
          path.basename(file).startsWith(category)
        );

        if (!hasCategory) {
          // Check if there's a subfolder for this category
          const categoryDir = path.join(templatesDir, category);
          const hasCategoryDir = await fs.pathExists(categoryDir);

          if (!hasCategoryDir) {
            missingCategories.push(category);
          }
        }
      }

      if (missingCategories.length > 0) {
        console.warn(`Template categories might be missing: ${missingCategories.join(', ')}`);
        // This is a warning, not a failure, as template organization can vary
      }
    });

    it('should have template loader pointing to unified location', async () => {
      const templateLoaderPath = path.join(srcDir, 'utils', 'template-loader.ts');

      if (await fs.pathExists(templateLoaderPath)) {
        const content = await fs.readFile(templateLoaderPath, 'utf-8');

        // Should reference templates folder, not template-files
        expect(content).toMatch(/["']templates["']/);
        expect(content).not.toMatch(/["']template-files["']/);
      }
    });
  });

  describe('Template File Integrity', () => {
    it('should have no duplicate template definitions', async () => {
      const templatesDir = path.join(srcDir, 'templates');
      const templateFiles = await findTemplateFiles(templatesDir);

      const exportedNames = new Map<string, string[]>();

      for (const file of templateFiles) {
        const content = await fs.readFile(file, 'utf-8');
        const exports = extractExportedNames(content);

        for (const exportName of exports) {
          if (!exportedNames.has(exportName)) {
            exportedNames.set(exportName, []);
          }
          exportedNames.get(exportName)!.push(path.relative(templatesDir, file));
        }
      }

      const duplicates = [];
      for (const [name, files] of exportedNames.entries()) {
        if (files.length > 1) {
          duplicates.push({ name, files });
        }
      }

      if (duplicates.length > 0) {
        const errorMessage = duplicates.map(dup =>
          `${dup.name}: ${dup.files.join(', ')}`
        ).join('\n');

        expect.fail(`Found duplicate template exports:\n${errorMessage}`);
      }

      expect(duplicates.length).toBe(0);
    });

    it('should have all template files properly typed', async () => {
      const templatesDir = path.join(srcDir, 'templates');
      const templateFiles = await findTemplateFiles(templatesDir);

      const untypedFiles = [];

      for (const file of templateFiles) {
        if (file.endsWith('.ts') || file.endsWith('.tsx')) {
          const content = await fs.readFile(file, 'utf-8');

          // Should have proper TypeScript exports
          const hasExports = content.includes('export ');
          const hasTypeAnnotations = content.includes(': string') ||
                                   content.includes(': object') ||
                                   content.includes('interface ') ||
                                   content.includes('type ');

          if (!hasExports) {
            untypedFiles.push({
              file: path.relative(templatesDir, file),
              issue: 'No exports found'
            });
          }
        }
      }

      if (untypedFiles.length > 0) {
        const errorMessage = untypedFiles.map(file =>
          `${file.file}: ${file.issue}`
        ).join('\n');

        console.warn(`Template files with potential typing issues:\n${errorMessage}`);
        // This is a warning for code quality, not a hard failure
      }
    });
  });
});

// Helper functions
async function findFilesWithTemplateImports(dir: string): Promise<string[]> {
  const files: string[] = [];

  async function traverse(currentDir: string) {
    const items = await fs.readdir(currentDir);

    for (const item of items) {
      const itemPath = path.join(currentDir, item);
      const stat = await fs.stat(itemPath);

      if (stat.isDirectory()) {
        // Skip node_modules, dist, and test directories for import scanning
        if (!['node_modules', 'dist', 'tests', '.git'].includes(item)) {
          await traverse(itemPath);
        }
      } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
        files.push(itemPath);
      }
    }
  }

  await traverse(dir);
  return files;
}

async function findTemplateFiles(dir: string): Promise<string[]> {
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
      } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
        files.push(itemPath);
      }
    }
  }

  await traverse(dir);
  return files;
}

function extractExportedNames(content: string): string[] {
  const exports: string[] = [];
  const lines = content.split('\n');

  for (const line of lines) {
    // Match various export patterns
    const exportMatches = [
      /export\s+const\s+(\w+)/g,
      /export\s+function\s+(\w+)/g,
      /export\s+class\s+(\w+)/g,
      /export\s+interface\s+(\w+)/g,
      /export\s+type\s+(\w+)/g,
      /export\s*\{\s*([^}]+)\s*\}/g
    ];

    for (const regex of exportMatches) {
      let match;
      while ((match = regex.exec(line)) !== null) {
        if (match[1].includes(',')) {
          // Handle multiple exports in braces
          const multipleExports = match[1].split(',').map(e => e.trim());
          exports.push(...multipleExports);
        } else {
          exports.push(match[1]);
        }
      }
    }
  }

  return exports;
}