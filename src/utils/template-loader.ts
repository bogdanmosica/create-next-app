/**
 * @fileoverview Template Loader Utility
 * @description Loads external template files and provides them as strings
 * This replaces the massive template strings embedded in TypeScript files
 */

import fs from "fs-extra";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Handle both source and compiled paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In source: src/utils/template-loader.ts -> src/template-files/
// In dist: dist/utils/template-loader.js -> src/template-files/
const TEMPLATE_FILES_DIR = __dirname.includes('dist') 
  ? path.join(__dirname, "..", "..", "src", "template-files")
  : path.join(__dirname, "..", "template-files");

/**
 * Load a template file and return its contents as a string
 */
export function loadTemplate(templatePath: string): string {
  const fullPath = path.join(TEMPLATE_FILES_DIR, templatePath);
  
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Template file not found: ${templatePath} (looking in ${fullPath})`);
  }
  
  return fs.readFileSync(fullPath, "utf-8");
}

/**
 * Load multiple template files and return them as an object
 */
export function loadTemplates(templatePaths: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};
  
  for (const [key, templatePath] of Object.entries(templatePaths)) {
    result[key] = loadTemplate(templatePath);
  }
  
  return result;
}

/**
 * Load a JSON template file and return the parsed object
 */
export function loadJsonTemplate<T = any>(templatePath: string): T {
  const content = loadTemplate(templatePath);
  
  try {
    return JSON.parse(content) as T;
  } catch (error) {
    throw new Error(`Failed to parse JSON template ${templatePath}: ${error instanceof Error ? error.message : String(error)}`);
  }
}