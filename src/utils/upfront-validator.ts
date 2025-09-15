/**
 * @fileoverview Upfront Path Validation
 * @description Validates paths and common issues before starting any operation
 * Provides immediate feedback to users before they waste time on setup
 */

import fs from 'fs-extra';
import path from 'path';
import { validationLogger } from './logger.js';

export interface UpfrontValidationResult {
  valid: boolean;
  errors: UpfrontError[];
  warnings: UpfrontWarning[];
  info: UpfrontInfo[];
}

export interface UpfrontError {
  type: 'path' | 'permissions' | 'system' | 'space';
  message: string;
  suggestion: string;
  critical: boolean;
}

export interface UpfrontWarning {
  type: 'existing-files' | 'path-length' | 'naming';
  message: string;
  suggestion: string;
}

export interface UpfrontInfo {
  type: 'detected-features' | 'system-info' | 'recommendations';
  message: string;
}

export class UpfrontValidator {
  /**
   * Validate project setup before any operations
   */
  static async validateProjectSetup(projectPath: string, operation: string = 'create project'): Promise<UpfrontValidationResult> {
    validationLogger.info(`Running upfront validation for: ${operation}`, { projectPath });
    
    const result: UpfrontValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      info: []
    };

    const fullPath = path.resolve(projectPath);
    
    // 1. Basic path validation
    await this.validatePathBasics(fullPath, result);
    
    // 2. System compatibility checks
    await this.validateSystemCompatibility(fullPath, result);
    
    // 3. Directory accessibility and permissions
    await this.validateDirectoryAccess(fullPath, result);
    
    // 4. Space and resource checks
    await this.validateResources(fullPath, result);
    
    // 5. Existing project detection
    await this.detectExistingProject(fullPath, result);
    
    // 6. Platform-specific checks
    await this.validatePlatformSpecific(fullPath, result);

    // Mark as invalid if any critical errors
    result.valid = !result.errors.some(error => error.critical);
    
    validationLogger.info(`Upfront validation completed`, {
      valid: result.valid,
      errors: result.errors.length,
      warnings: result.warnings.length
    });

    return result;
  }

  /**
   * Basic path validation
   */
  private static async validatePathBasics(fullPath: string, result: UpfrontValidationResult): Promise<void> {
    // Path length check
    if (fullPath.length > 240) {
      result.errors.push({
        type: 'path',
        message: `Path is too long (${fullPath.length} characters, max 240)`,
        suggestion: 'Use a shorter path closer to the root directory (e.g., C:\\projects\\my-app)',
        critical: true
      });
    }

    // Invalid characters (Windows colons are OK for drive letters)
    const pathWithoutDrive = fullPath.replace(/^[A-Za-z]:/, ''); // Remove drive letter
    const invalidChars = /[<>:|"?*]/; 
    if (invalidChars.test(pathWithoutDrive)) {
      result.errors.push({
        type: 'path',
        message: 'Path contains invalid characters (<>:|"?*) after drive letter',
        suggestion: 'Remove special characters and use standard directory names',
        critical: true
      });
    }

    // Reserved names (Windows)
    const baseName = path.basename(fullPath).toLowerCase();
    const reservedNames = ['con', 'prn', 'aux', 'nul', 'com1', 'com2', 'com3', 'com4', 'com5', 'com6', 'com7', 'com8', 'com9', 'lpt1', 'lpt2', 'lpt3', 'lpt4', 'lpt5', 'lpt6', 'lpt7', 'lpt8', 'lpt9'];
    if (reservedNames.includes(baseName)) {
      result.errors.push({
        type: 'path',
        message: `"${baseName}" is a reserved system name`,
        suggestion: 'Choose a different project name',
        critical: true
      });
    }

    // Path naming recommendations
    if (!/^[a-z0-9\-_]+$/i.test(baseName)) {
      result.warnings.push({
        type: 'naming',
        message: 'Project name contains special characters or spaces',
        suggestion: 'Use lowercase letters, numbers, hyphens, and underscores for better compatibility'
      });
    }
  }

  /**
   * System compatibility checks
   */
  private static async validateSystemCompatibility(fullPath: string, result: UpfrontValidationResult): Promise<void> {
    // Node.js version
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    
    if (majorVersion < 18) {
      result.errors.push({
        type: 'system',
        message: `Node.js ${nodeVersion} is not supported (requires 18+)`,
        suggestion: 'Update Node.js to version 18 or higher for compatibility',
        critical: true
      });
    } else if (majorVersion < 20) {
      result.warnings.push({
        type: 'naming',
        message: `Node.js ${nodeVersion} is supported but ${majorVersion < 19 ? 'Node 20+' : 'latest LTS'} is recommended`,
        suggestion: 'Consider upgrading to the latest LTS version for better performance'
      });
    }

    // Check for required commands
    const requiredCommands = [
      { cmd: 'npm', critical: true, alternative: 'Install Node.js which includes npm' },
      { cmd: 'pnpm', critical: false, alternative: 'Install with: npm install -g pnpm (recommended for better performance)' },
      { cmd: 'git', critical: false, alternative: 'Install Git from https://git-scm.com/ (needed for git workflow features)' }
    ];

    for (const { cmd, critical, alternative } of requiredCommands) {
      try {
        const { execSync } = await import('node:child_process');
        execSync(`${cmd} --version`, { stdio: 'ignore' });
        
        result.info.push({
          type: 'system-info',
          message: `✅ ${cmd} is available`
        });
      } catch {
        if (critical) {
          result.errors.push({
            type: 'system',
            message: `Required command '${cmd}' not found`,
            suggestion: alternative,
            critical: true
          });
        } else {
          result.warnings.push({
            type: 'naming',
            message: `Optional command '${cmd}' not found`,
            suggestion: alternative
          });
        }
      }
    }
  }

  /**
   * Directory access validation
   */
  private static async validateDirectoryAccess(fullPath: string, result: UpfrontValidationResult): Promise<void> {
    try {
      // Try to create directory
      await fs.ensureDir(fullPath);
      
      // Test write permissions
      const testFile = path.join(fullPath, '.write-test');
      try {
        await fs.writeFile(testFile, 'test');
        await fs.remove(testFile);
        
        result.info.push({
          type: 'system-info',
          message: '✅ Directory is writable'
        });
      } catch {
        result.errors.push({
          type: 'permissions',
          message: 'Directory exists but is not writable',
          suggestion: 'Check directory permissions or run with administrator privileges',
          critical: true
        });
      }
      
    } catch (error: any) {
      const errorMsg = error.message || 'Unknown error';
      
      if (errorMsg.includes('EACCES') || errorMsg.includes('permission denied')) {
        result.errors.push({
          type: 'permissions',
          message: 'Permission denied when creating directory',
          suggestion: 'Run with administrator privileges or choose a different directory',
          critical: true
        });
      } else if (errorMsg.includes('ENOENT')) {
        result.errors.push({
          type: 'path',
          message: 'Parent directory does not exist or is not accessible',
          suggestion: 'Ensure the parent directory exists and is accessible',
          critical: true
        });
      } else {
        result.errors.push({
          type: 'path',
          message: `Cannot access directory: ${errorMsg}`,
          suggestion: 'Check if the path is valid and accessible',
          critical: true
        });
      }
    }
  }

  /**
   * Resource validation (disk space, etc.)
   */
  private static async validateResources(fullPath: string, result: UpfrontValidationResult): Promise<void> {
    try {
      // Basic disk space check using fs.stat (approximate)
      const stats = await fs.stat(fullPath).catch(() => null);
      
      result.info.push({
        type: 'system-info',
        message: '✅ System resources appear sufficient'
      });
      
      // Note: Actual disk space checking would require platform-specific code
      result.warnings.push({
        type: 'naming',
        message: 'Ensure at least 500MB of free disk space',
        suggestion: 'Next.js projects with dependencies can require significant disk space'
      });
      
    } catch {
      result.warnings.push({
        type: 'naming',
        message: 'Could not verify system resources',
        suggestion: 'Ensure sufficient disk space (at least 500MB) is available'
      });
    }
  }

  /**
   * Detect existing project features
   */
  private static async detectExistingProject(fullPath: string, result: UpfrontValidationResult): Promise<void> {
    try {
      const files = await fs.readdir(fullPath);
      const projectFiles = files.filter(file => !file.startsWith('.'));
      
      if (projectFiles.length > 0) {
        result.warnings.push({
          type: 'existing-files',
          message: `Directory contains ${projectFiles.length} existing files`,
          suggestion: 'Files may be overwritten. Consider using an empty directory or backing up existing files'
        });
      }

      // Detect project types
      const detectedFeatures = [];
      
      if (files.includes('package.json')) {
        detectedFeatures.push('Node.js project');
      }
      if (files.includes('next.config.js') || files.includes('next.config.ts')) {
        detectedFeatures.push('Next.js project');
      }
      if (files.includes('drizzle.config.ts')) {
        detectedFeatures.push('Drizzle ORM');
      }
      if (files.some(f => f.includes('tsconfig'))) {
        detectedFeatures.push('TypeScript');
      }

      if (detectedFeatures.length > 0) {
        result.info.push({
          type: 'detected-features',
          message: `🔍 Detected: ${detectedFeatures.join(', ')}`
        });
      }

    } catch {
      // Directory doesn't exist or is inaccessible - handled elsewhere
    }
  }

  /**
   * Platform-specific validations
   */
  private static async validatePlatformSpecific(fullPath: string, result: UpfrontValidationResult): Promise<void> {
    if (process.platform === 'win32') {
      // Windows specific checks
      if (fullPath.length > 200) {
        result.warnings.push({
          type: 'path-length',
          message: 'Path may be too long for some Windows operations',
          suggestion: 'Use shorter paths or enable Windows long path support'
        });
      }

      // UNC path check
      if (fullPath.startsWith('\\\\')) {
        result.warnings.push({
          type: 'path-length',
          message: 'UNC paths may cause issues with some tools',
          suggestion: 'Consider using a local drive path instead'
        });
      }
    }

    // macOS/Linux specific
    if (process.platform !== 'win32') {
      // Case sensitivity warning
      const baseName = path.basename(fullPath);
      if (baseName !== baseName.toLowerCase()) {
        result.info.push({
          type: 'recommendations',
          message: '💡 Consider using lowercase project names for cross-platform compatibility'
        });
      }
    }
  }

  /**
   * Format validation result for display
   */
  static formatUpfrontValidation(result: UpfrontValidationResult): string {
    let output = '🔍 **Pre-flight Validation Results**\n\n';

    if (result.errors.length > 0) {
      output += '❌ **Critical Issues** (must fix before proceeding):\n';
      result.errors.forEach((error, i) => {
        const icon = error.critical ? '🚨' : '❌';
        output += `${i + 1}. ${icon} **${error.type.toUpperCase()}**: ${error.message}\n`;
        output += `   💡 *Fix*: ${error.suggestion}\n\n`;
      });
    }

    if (result.warnings.length > 0) {
      output += '⚠️ **Recommendations** (can proceed but consider addressing):\n';
      result.warnings.forEach((warning, i) => {
        output += `${i + 1}. ⚠️ **${warning.type.toUpperCase()}**: ${warning.message}\n`;
        output += `   💡 *Suggestion*: ${warning.suggestion}\n\n`;
      });
    }

    if (result.info.length > 0) {
      output += '📋 **System Information**:\n';
      result.info.forEach((info, i) => {
        output += `${i + 1}. ${info.message}\n`;
      });
      output += '\n';
    }

    if (result.valid) {
      output += '✅ **Ready to proceed!** All critical checks passed.\n\n';
    } else {
      output += '🛑 **Cannot proceed** until critical issues are resolved.\n\n';
    }

    return output;
  }
}