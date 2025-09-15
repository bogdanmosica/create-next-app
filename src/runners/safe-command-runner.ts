/**
 * @fileoverview Safe Command Runner with Enhanced Error Handling
 * @description Improved command execution with retry logic, timeouts, validation, and recovery
 * Replaces basic command-runner.ts with production-ready reliability features
 */

import { promisify } from "util";
import { exec, spawn } from "node:child_process";
import fs from "fs-extra";
import path from "node:path";

const execAsync = promisify(exec);

export interface CommandOptions {
  cwd?: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  validateBefore?: () => Promise<boolean>;
  validateAfter?: () => Promise<boolean>;
  env?: Record<string, string>;
  silent?: boolean;
}

export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTime: number;
  retryCount: number;
}

export class SafeCommandRunner {
  private static readonly DEFAULT_TIMEOUT = 300000; // 5 minutes
  private static readonly DEFAULT_RETRIES = 2;
  private static readonly DEFAULT_RETRY_DELAY = 2000; // 2 seconds

  /**
   * Execute a command with enhanced safety features
   */
  static async execute(command: string, options: CommandOptions = {}): Promise<CommandResult> {
    const {
      cwd = process.cwd(),
      timeout = this.DEFAULT_TIMEOUT,
      retries = this.DEFAULT_RETRIES,
      retryDelay = this.DEFAULT_RETRY_DELAY,
      validateBefore,
      validateAfter,
      env = {},
      silent = false
    } = options;

    if (!silent) {
      console.error(`[SAFE_CMD] Executing: ${command}`);
      console.error(`[SAFE_CMD] Working directory: ${cwd}`);
      console.error(`[SAFE_CMD] Timeout: ${timeout}ms, Retries: ${retries}`);
    }

    // Pre-execution validation
    if (validateBefore) {
      const isValid = await validateBefore();
      if (!isValid) {
        throw new Error(`Pre-execution validation failed for command: ${command}`);
      }
    }

    let lastError: Error | null = null;
    let retryCount = 0;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const startTime = Date.now();
        
        if (attempt > 0) {
          if (!silent) {
            console.error(`[SAFE_CMD] Retry attempt ${attempt}/${retries} after ${retryDelay}ms delay`);
          }
          await this.delay(retryDelay);
        }

        const result = await this.executeOnce(command, {
          cwd,
          timeout,
          env: { 
            ...Object.fromEntries(
              Object.entries(process.env).filter(([_, v]) => v !== undefined)
            ) as Record<string, string>, 
            ...env 
          },
          silent
        });

        const executionTime = Date.now() - startTime;

        // Post-execution validation
        if (validateAfter) {
          const isValid = await validateAfter();
          if (!isValid) {
            throw new Error(`Post-execution validation failed for command: ${command}`);
          }
        }

        if (!silent) {
          console.error(`[SAFE_CMD] ✅ Command completed successfully in ${executionTime}ms`);
        }

        return {
          ...result,
          executionTime,
          retryCount: attempt
        };

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        retryCount = attempt;

        if (!silent) {
          console.error(`[SAFE_CMD] ❌ Attempt ${attempt + 1} failed: ${lastError.message}`);
        }

        // Don't retry certain types of errors
        if (this.isNonRetryableError(lastError)) {
          if (!silent) {
            console.error(`[SAFE_CMD] Non-retryable error, aborting retries`);
          }
          break;
        }
      }
    }

    // All attempts failed
    console.error(`[SAFE_CMD] ❌ Command failed after ${retryCount + 1} attempts: ${command}`);
    console.error(`[SAFE_CMD] Final error: ${lastError?.message}`);
    throw new Error(`Command "${command}" failed after ${retryCount + 1} attempts: ${lastError?.message}`);
  }

  /**
   * Execute command once with timeout and proper error handling
   */
  private static async executeOnce(command: string, options: {
    cwd: string;
    timeout: number;
    env: Record<string, string>;
    silent: boolean;
  }): Promise<Omit<CommandResult, 'executionTime' | 'retryCount'>> {
    
    return new Promise((resolve, reject) => {
      const child = spawn('cmd', ['/c', command], {
        cwd: options.cwd,
        env: options.env,
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: false
      });

      let stdout = '';
      let stderr = '';
      let timeoutId: NodeJS.Timeout;

      // Set up timeout
      if (options.timeout > 0) {
        timeoutId = setTimeout(() => {
          child.kill('SIGKILL');
          reject(new Error(`Command timed out after ${options.timeout}ms: ${command}`));
        }, options.timeout);
      }

      // Collect output
      child.stdout?.on('data', (data: Buffer) => {
        const output = data.toString();
        stdout += output;
        if (!options.silent && output.trim()) {
          console.error(`[STDOUT] ${output.trim()}`);
        }
      });

      child.stderr?.on('data', (data: Buffer) => {
        const output = data.toString();
        stderr += output;
        if (!options.silent && output.trim()) {
          console.error(`[STDERR] ${output.trim()}`);
        }
      });

      child.on('close', (code) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        const exitCode = code || 0;

        // Check for actual errors vs warnings
        if (exitCode !== 0) {
          reject(new Error(`Command exited with code ${exitCode}: ${stderr || 'No error message'}`));
          return;
        }

        // Check stderr for errors (but allow warnings)
        if (stderr && this.isActualError(stderr)) {
          reject(new Error(`Command failed with error output: ${stderr}`));
          return;
        }

        resolve({
          stdout,
          stderr,
          exitCode
        });
      });

      child.on('error', (error) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        reject(new Error(`Failed to execute command: ${error.message}`));
      });
    });
  }

  /**
   * Check if error text represents an actual error vs warning
   */
  private static isActualError(stderr: string): boolean {
    const lowerStderr = stderr.toLowerCase();
    
    // These are usually warnings, not errors
    const warningIndicators = [
      'warn',
      'warning',
      'deprecated',
      'notice',
      'info',
      'peer dep',
      'peer dependency',
      'unmet peer dependency',
      'npm warn',
      'npm notice'
    ];

    // These are actual errors
    const errorIndicators = [
      'error:',
      'fatal:',
      'failed',
      'cannot',
      'unable to',
      'permission denied',
      'no such file',
      'syntax error',
      'parse error'
    ];

    // If it contains error indicators and not just warnings
    const hasError = errorIndicators.some(indicator => lowerStderr.includes(indicator));
    const hasOnlyWarnings = warningIndicators.some(indicator => lowerStderr.includes(indicator)) && !hasError;

    return hasError && !hasOnlyWarnings;
  }

  /**
   * Check if an error should not be retried
   */
  private static isNonRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase();
    
    const nonRetryablePatterns = [
      'permission denied',
      'access denied', 
      'command not found',
      'no such file or directory',
      'syntax error',
      'invalid argument',
      'authentication failed',
      'unauthorized',
      'forbidden'
    ];

    return nonRetryablePatterns.some(pattern => message.includes(pattern));
  }

  /**
   * Validate that required commands are available
   */
  static async validateCommands(commands: string[]): Promise<{ command: string; available: boolean; version?: string }[]> {
    const results = [];

    for (const command of commands) {
      try {
        const result = await this.execute(`${command} --version`, { 
          silent: true, 
          timeout: 10000, 
          retries: 0 
        });
        
        results.push({
          command,
          available: true,
          version: result.stdout.trim().split('\n')[0]
        });
      } catch (error) {
        results.push({
          command,
          available: false
        });
      }
    }

    return results;
  }

  /**
   * Validate that a directory exists and is writable
   */
  static async validateDirectory(dirPath: string): Promise<{ exists: boolean; writable: boolean; error?: string }> {
    try {
      const exists = await fs.pathExists(dirPath);
      
      if (!exists) {
        return { exists: false, writable: false };
      }

      // Test writability by creating a temporary file
      const testFile = path.join(dirPath, `.write-test-${Date.now()}`);
      
      try {
        await fs.writeFile(testFile, 'test');
        await fs.remove(testFile);
        return { exists: true, writable: true };
      } catch (writeError) {
        return { 
          exists: true, 
          writable: false, 
          error: writeError instanceof Error ? writeError.message : String(writeError)
        };
      }

    } catch (error) {
      return { 
        exists: false, 
        writable: false, 
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Simple delay utility
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}