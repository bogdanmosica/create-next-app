/**
 * @fileoverview System Requirements Checker
 * @description Validates system requirements before running MCP
 */

import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface SystemRequirements {
  gitVersion: string;
  nodeVersion: string;
  pnpmVersion: string;
}

/**
 * Check Git version requirements
 */
export async function checkGitVersion(): Promise<{ valid: boolean; version?: string; error?: string }> {
  try {
    const { stdout } = await execAsync("git --version");
    const versionMatch = stdout.match(/git version (\d+\.\d+\.\d+)/);
    
    if (!versionMatch) {
      return { valid: false, error: "Could not parse Git version" };
    }
    
    const version = versionMatch[1];
    const [major, minor] = version.split('.').map(Number);
    
    // Git hooks with Lefthook require Git 2.31.0+
    const isValid = major > 2 || (major === 2 && minor >= 31);
    
    return {
      valid: isValid,
      version,
      error: isValid ? undefined : `Git version ${version} is too old. Lefthook requires Git 2.31.0 or newer.`
    };
  } catch (error) {
    return { 
      valid: false, 
      error: `Git not found or not accessible: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Check Node.js version
 */
export async function checkNodeVersion(): Promise<{ valid: boolean; version?: string; error?: string }> {
  try {
    const version = process.version;
    const majorVersion = parseInt(version.slice(1).split('.')[0]);
    
    // Next.js 15 requires Node.js 18+
    const isValid = majorVersion >= 18;
    
    return {
      valid: isValid,
      version,
      error: isValid ? undefined : `Node.js version ${version} is too old. Next.js 15 requires Node.js 18 or newer.`
    };
  } catch (error) {
    return { 
      valid: false, 
      error: `Could not determine Node.js version: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Check pnpm availability
 */
export async function checkPnpmVersion(): Promise<{ valid: boolean; version?: string; error?: string }> {
  try {
    const { stdout } = await execAsync("pnpm --version");
    const version = stdout.trim();
    
    return {
      valid: true,
      version,
    };
  } catch (error) {
    return { 
      valid: false, 
      error: `pnpm not found. Please install pnpm: npm install -g pnpm`
    };
  }
}

/**
 * Run all system requirement checks
 */
export async function checkSystemRequirements(): Promise<{
  valid: boolean;
  checks: {
    git: Awaited<ReturnType<typeof checkGitVersion>>;
    node: Awaited<ReturnType<typeof checkNodeVersion>>;
    pnpm: Awaited<ReturnType<typeof checkPnpmVersion>>;
  };
  warnings: string[];
  errors: string[];
}> {
  const [gitCheck, nodeCheck, pnpmCheck] = await Promise.all([
    checkGitVersion(),
    checkNodeVersion(),
    checkPnpmVersion()
  ]);
  
  const checks = {
    git: gitCheck,
    node: nodeCheck,
    pnpm: pnpmCheck,
  };
  
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Critical errors (will prevent MCP from running)
  if (!nodeCheck.valid) {
    errors.push(nodeCheck.error!);
  }
  if (!pnpmCheck.valid) {
    errors.push(pnpmCheck.error!);
  }
  
  // Warnings (will skip certain features)
  if (!gitCheck.valid) {
    warnings.push(`${gitCheck.error!} Git hooks will be skipped.`);
  }
  
  return {
    valid: errors.length === 0,
    checks,
    warnings,
    errors,
  };
}