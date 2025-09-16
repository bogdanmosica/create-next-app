/**
 * @fileoverview Unified Templates Export
 * @description Central export hub for all template files organized by feature
 * Consolidation of src/templates/* and src/template-files/* into unified structure
 */

// Core templates (environment, documentation, etc.)
export * from './core/env-templates.js';
export * from './core/readme-templates.js';

// Configuration templates (biome, vscode, environment)
export * from './config/biome-config.js';
export * from './config/env-template.js';
export * from './config/biome-custom-rules.js';
export * from './config/nextjs-config.js';
export * from './config/package-config.js';

// Database templates (drizzle, schemas, queries)
export * from './database/drizzle-schema.js';
export * from './database/drizzle-config.js';
export * from './database/schema-templates.js';
export * from './database/query-templates.js';

// Authentication templates (middleware, forms, components)
export * from './auth/middleware-template.js';

// Internationalization templates
export * from './i18n/i18n-templates.js';
export * from './i18n/auth-form-templates.js';
export * from './i18n/i18n-auth-templates.js';

// Forms and validation templates
export * from './forms/form-templates.js';

// Testing templates (vitest, playwright, git hooks)
export * from './testing/testing-templates.js';
export * from './testing/git-hooks-templates.js';

// SaaS and application templates
export * from './saas/saas-lib-templates.js';
export * from './saas/enhanced-structure-templates.js';
export * from './saas/dashboard-templates.js';

// Re-export from consolidated template-files for backward compatibility
// This maintains compatibility while we update imports
export * from './auth/index.js';
export * from './config/index.js';
export * from './database/index.js';