/**
 * @fileoverview Command Runner Utility
 * @description Safe command execution with timeout, error handling, and logging
 * Used for running npm commands and system operations during app creation
 */

import { promisify } from "util";
import { exec } from "child_process";

const execAsync = promisify(exec);

export async function runCommand(command: string, cwd: string): Promise<string> {
  try {
    console.error(`[DEBUG] Running command: ${command} in ${cwd}`);
    const { stdout, stderr } = await execAsync(command, { cwd, timeout: 300000 }); // 5 minute timeout
    
    if (stdout) {
      console.error(`[DEBUG] Command stdout: ${stdout.slice(0, 500)}${stdout.length > 500 ? '...' : ''}`);
    }
    
    if (stderr) {
      console.error(`[DEBUG] Command stderr: ${stderr}`);
      // Only throw for actual errors, not warnings
      if (stderr.toLowerCase().includes('error') && !stderr.includes('WARN') && !stderr.includes('warning')) {
        throw new Error(`Command failed with stderr: ${stderr}`);
      }
    }
    
    console.error(`[DEBUG] Command completed successfully`);
    return stdout;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[DEBUG] Command failed: ${command}`);
    console.error(`[DEBUG] Error details: ${errorMsg}`);
    console.error(`[DEBUG] Full error object:`, error);
    throw new Error(`Command "${command}" failed: ${errorMsg}`);
  }
}