/**
 * @fileoverview Test Utilities
 * @description Helper functions for MCP tool testing
 */

import fs from "fs-extra";
import path from "path";
import { runCommand } from "../runners/command-runner.js";

export interface ProjectValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate a Next.js project structure
 */
export async function validateNextJsProject(projectPath: string): Promise<ProjectValidationResult> {
  const result: ProjectValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
  };

  try {
    // Check package.json
    const packageJsonPath = path.join(projectPath, "package.json");
    if (!(await fs.pathExists(packageJsonPath))) {
      result.errors.push("package.json not found");
      result.isValid = false;
    } else {
      const packageJson = await fs.readJSON(packageJsonPath);
      
      if (!packageJson.dependencies?.next) {
        result.errors.push("Next.js not found in dependencies");
        result.isValid = false;
      }

      if (!packageJson.scripts?.dev) {
        result.warnings.push("No dev script found in package.json");
      }

      if (!packageJson.scripts?.build) {
        result.warnings.push("No build script found in package.json");
      }
    }

    // Check Next.js config
    const nextConfigPath = path.join(projectPath, "next.config.js");
    const nextConfigMjsPath = path.join(projectPath, "next.config.mjs");
    
    if (!(await fs.pathExists(nextConfigPath)) && !(await fs.pathExists(nextConfigMjsPath))) {
      result.warnings.push("No Next.js config file found");
    }

    // Check app directory structure
    const appDirPath = path.join(projectPath, "app");
    if (!(await fs.pathExists(appDirPath))) {
      result.errors.push("App directory not found");
      result.isValid = false;
    } else {
      const layoutPath = path.join(appDirPath, "layout.tsx");
      const pagePath = path.join(appDirPath, "page.tsx");
      
      if (!(await fs.pathExists(layoutPath))) {
        result.errors.push("App layout.tsx not found");
        result.isValid = false;
      }

      if (!(await fs.pathExists(pagePath))) {
        result.errors.push("App page.tsx not found");
        result.isValid = false;
      }
    }

    // Check Tailwind config
    const tailwindConfigPath = path.join(projectPath, "tailwind.config.ts");
    if (!(await fs.pathExists(tailwindConfigPath))) {
      result.warnings.push("Tailwind config not found");
    }

  } catch (error) {
    result.errors.push(`Validation error: ${error instanceof Error ? error.message : String(error)}`);
    result.isValid = false;
  }

  return result;
}

/**
 * Check if TypeScript compiles without errors
 */
export async function checkTypeScriptCompilation(projectPath: string): Promise<boolean> {
  try {
    // Check if TypeScript is configured
    const tsConfigPath = path.join(projectPath, "tsconfig.json");
    if (!(await fs.pathExists(tsConfigPath))) {
      console.warn("No tsconfig.json found, skipping TypeScript compilation check");
      return true;
    }

    // Try to compile TypeScript
    await runCommand("npx tsc --noEmit", projectPath);
    return true;
  } catch (error) {
    console.error("TypeScript compilation failed:", error);
    return false;
  }
}

/**
 * Check if a project builds successfully
 */
export async function checkProjectBuilds(projectPath: string): Promise<boolean> {
  try {
    await runCommand("pnpm build", projectPath);
    return true;
  } catch (error) {
    console.error("Project build failed:", error);
    return false;
  }
}

/**
 * Check if linting passes
 */
export async function checkLinting(projectPath: string): Promise<boolean> {
  try {
    const packageJsonPath = path.join(projectPath, "package.json");
    if (!(await fs.pathExists(packageJsonPath))) {
      return true; // No package.json, skip linting check
    }

    const packageJson = await fs.readJSON(packageJsonPath);
    
    // Check for Biome
    if (packageJson.devDependencies?.["@biomejs/biome"]) {
      await runCommand("pnpm biome check .", projectPath);
      return true;
    }

    // Check for ESLint
    if (packageJson.devDependencies?.["eslint"]) {
      await runCommand("pnpm lint", projectPath);
      return true;
    }

    return true; // No linter configured
  } catch (error) {
    console.error("Linting failed:", error);
    return false;
  }
}

/**
 * Analyze project dependencies
 */
export async function analyzeDependencies(projectPath: string): Promise<{
  dependencies: string[];
  devDependencies: string[];
  missingPeerDependencies: string[];
}> {
  const result = {
    dependencies: [] as string[],
    devDependencies: [] as string[],
    missingPeerDependencies: [] as string[],
  };

  try {
    const packageJsonPath = path.join(projectPath, "package.json");
    if (await fs.pathExists(packageJsonPath)) {
      const packageJson = await fs.readJSON(packageJsonPath);
      
      result.dependencies = Object.keys(packageJson.dependencies || {});
      result.devDependencies = Object.keys(packageJson.devDependencies || {});

      // TODO: Check for missing peer dependencies
      // This would require analyzing node_modules or using npm/pnpm commands
    }
  } catch (error) {
    console.warn("Could not analyze dependencies:", error);
  }

  return result;
}

/**
 * Generate a project health report
 */
export async function generateProjectHealthReport(projectPath: string): Promise<{
  projectPath: string;
  validation: ProjectValidationResult;
  typeScriptCompiles: boolean;
  builds: boolean;
  linting: boolean;
  dependencies: {
    dependencies: string[];
    devDependencies: string[];
    missingPeerDependencies: string[];
  };
}> {
  console.log(`📋 Generating health report for: ${projectPath}`);

  const [validation, typeScriptCompiles, builds, linting, dependencies] = await Promise.all([
    validateNextJsProject(projectPath),
    checkTypeScriptCompilation(projectPath),
    checkProjectBuilds(projectPath),
    checkLinting(projectPath),
    analyzeDependencies(projectPath),
  ]);

  return {
    projectPath,
    validation,
    typeScriptCompiles,
    builds,
    linting,
    dependencies,
  };
}

/**
 * Compare two project structures
 */
export async function compareProjectStructures(
  projectA: string,
  projectB: string
): Promise<{
  commonFiles: string[];
  uniqueToA: string[];
  uniqueToB: string[];
}> {
  const getFileList = async (projectPath: string): Promise<string[]> => {
    const files: string[] = [];
    
    const walk = async (dir: string, relativePath: string = "") => {
      const items = await fs.readdir(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const itemRelativePath = path.join(relativePath, item);
        
        // Skip node_modules and other common ignored directories
        if (item === "node_modules" || item === ".next" || item === "dist") {
          continue;
        }
        
        const stats = await fs.stat(fullPath);
        
        if (stats.isDirectory()) {
          await walk(fullPath, itemRelativePath);
        } else {
          files.push(itemRelativePath);
        }
      }
    };
    
    await walk(projectPath);
    return files.sort();
  };

  const filesA = await getFileList(projectA);
  const filesB = await getFileList(projectB);

  const setA = new Set(filesA);
  const setB = new Set(filesB);

  return {
    commonFiles: filesA.filter(file => setB.has(file)),
    uniqueToA: filesA.filter(file => !setB.has(file)),
    uniqueToB: filesB.filter(file => !setA.has(file)),
  };
}

/**
 * Clean up test projects older than specified days
 */
export async function cleanupOldTestProjects(
  testDir: string,
  olderThanDays: number = 7
): Promise<void> {
  try {
    if (!(await fs.pathExists(testDir))) {
      return;
    }

    const projects = await fs.readdir(testDir);
    const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);

    for (const project of projects) {
      const projectPath = path.join(testDir, project);
      const stats = await fs.stat(projectPath);
      
      if (stats.isDirectory() && stats.mtime.getTime() < cutoffTime) {
        console.log(`🗑️  Removing old test project: ${project}`);
        await fs.remove(projectPath);
      }
    }
  } catch (error) {
    console.warn("Could not cleanup old test projects:", error);
  }
}