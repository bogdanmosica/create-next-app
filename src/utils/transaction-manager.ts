/**
 * @fileoverview Transaction Manager for Multi-Step Operations
 * @description Provides checkpoint/rollback capabilities for complex setup operations
 * Prevents losing all work when a step fails in the middle of a long process
 */

import fs from "fs-extra";
import path from "node:path";
import { runCommand } from "../runners/command-runner.js";

export interface TransactionStep {
  id: string;
  name: string;
  type: 'command' | 'file' | 'tool';
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'rolled_back';
  created?: string[];  // Files/directories created
  modified?: string[]; // Files modified (with backups)
  commands?: string[]; // Commands executed  
  startTime?: number;
  endTime?: number;
  error?: string;
}

export interface TransactionState {
  id: string;
  projectPath: string;
  startTime: number;
  status: 'running' | 'completed' | 'failed' | 'rolled_back';
  steps: TransactionStep[];
  backupPath?: string;
}

export class TransactionManager {
  private state: TransactionState;
  private statePath: string;

  constructor(projectPath: string, transactionId?: string) {
    this.state = {
      id: transactionId || `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      projectPath: path.resolve(projectPath),
      startTime: Date.now(),
      status: 'running',
      steps: []
    };
    
    // Store transaction files in parent directory to avoid conflicts with create-next-app
    const parentDir = path.dirname(this.state.projectPath);
    const projectName = path.basename(this.state.projectPath);
    this.statePath = path.join(parentDir, `.mcp-transaction-${projectName}.json`);
    this.state.backupPath = path.join(parentDir, `.mcp-backup-${projectName}`);
  }

  /**
   * Load existing transaction state from disk
   */
  static async loadTransaction(projectPath: string): Promise<TransactionManager | null> {
    // Look for transaction file in parent directory with new naming pattern
    const parentDir = path.dirname(path.resolve(projectPath));
    const projectName = path.basename(path.resolve(projectPath));
    const statePath = path.join(parentDir, `.mcp-transaction-${projectName}.json`);
    
    if (!await fs.pathExists(statePath)) {
      return null;
    }

    try {
      const state = await fs.readJSON(statePath) as TransactionState;
      const manager = new TransactionManager(projectPath, state.id);
      manager.state = state;
      return manager;
    } catch (error) {
      console.error(`[WARN] Failed to load transaction state: ${error}`);
      return null;
    }
  }

  /**
   * Save current transaction state to disk
   */
  async saveState(): Promise<void> {
    try {
      await fs.ensureDir(path.dirname(this.statePath));
      await fs.writeJSON(this.statePath, this.state, { spaces: 2 });
    } catch (error) {
      console.error(`[WARN] Failed to save transaction state: ${error}`);
    }
  }

  /**
   * Create a backup before modifying files
   */
  private async createBackup(filePath: string): Promise<string> {
    if (!this.state.backupPath) {
      throw new Error('Backup path not initialized');
    }

    const relativePath = path.relative(this.state.projectPath, filePath);
    const backupFilePath = path.join(this.state.backupPath, relativePath);
    
    if (await fs.pathExists(filePath)) {
      await fs.ensureDir(path.dirname(backupFilePath));
      await fs.copy(filePath, backupFilePath);
      console.error(`[BACKUP] Created backup: ${relativePath}`);
    }
    
    return backupFilePath;
  }

  /**
   * Start a new step in the transaction
   */
  async startStep(stepId: string, name: string, type: TransactionStep['type']): Promise<TransactionStep> {
    const step: TransactionStep = {
      id: stepId,
      name,
      type,
      status: 'in_progress',
      created: [],
      modified: [],
      commands: [],
      startTime: Date.now()
    };

    this.state.steps.push(step);
    await this.saveState();
    
    console.error(`[TRANSACTION] Started step: ${name}`);
    return step;
  }

  /**
   * Mark a step as completed
   */
  async completeStep(stepId: string, created?: string[], modified?: string[]): Promise<void> {
    const step = this.state.steps.find(s => s.id === stepId);
    if (!step) {
      throw new Error(`Step ${stepId} not found`);
    }

    step.status = 'completed';
    step.endTime = Date.now();
    step.created = created || [];
    step.modified = modified || [];

    await this.saveState();
    console.error(`[TRANSACTION] Completed step: ${step.name} (${((step.endTime - (step.startTime || 0)) / 1000).toFixed(2)}s)`);
  }

  /**
   * Mark a step as failed
   */
  async failStep(stepId: string, error: string): Promise<void> {
    const step = this.state.steps.find(s => s.id === stepId);
    if (!step) {
      throw new Error(`Step ${stepId} not found`);
    }

    step.status = 'failed';
    step.endTime = Date.now();
    step.error = error;

    this.state.status = 'failed';
    await this.saveState();
    
    console.error(`[TRANSACTION] Failed step: ${step.name} - ${error}`);
  }

  /**
   * Execute a command with transaction tracking
   */
  async executeCommand(stepId: string, command: string, cwd?: string): Promise<string> {
    const step = this.state.steps.find(s => s.id === stepId);
    if (!step) {
      throw new Error(`Step ${stepId} not found`);
    }

    const workDir = cwd || this.state.projectPath;
    
    try {
      console.error(`[TRANSACTION] Executing: ${command}`);
      const result = await runCommand(command, workDir);
      
      step.commands = step.commands || [];
      step.commands.push(`${command} (in ${workDir})`);
      
      await this.saveState();
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      await this.failStep(stepId, errorMsg);
      throw error;
    }
  }

  /**
   * Create a file with transaction tracking
   */
  async createFile(stepId: string, filePath: string, content: string): Promise<void> {
    const step = this.state.steps.find(s => s.id === stepId);
    if (!step) {
      throw new Error(`Step ${stepId} not found`);
    }

    const fullPath = path.resolve(this.state.projectPath, filePath);
    
    try {
      // Backup if file exists
      if (await fs.pathExists(fullPath)) {
        await this.createBackup(fullPath);
        step.modified = step.modified || [];
        step.modified.push(filePath);
      } else {
        step.created = step.created || [];
        step.created.push(filePath);
      }

      await fs.ensureDir(path.dirname(fullPath));
      await fs.writeFile(fullPath, content);
      await this.saveState();
      
      console.error(`[TRANSACTION] Created file: ${filePath}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      await this.failStep(stepId, errorMsg);
      throw error;
    }
  }

  /**
   * Rollback all completed steps in reverse order
   */
  async rollback(): Promise<void> {
    console.error(`[TRANSACTION] Starting rollback for transaction ${this.state.id}`);
    
    // Process steps in reverse order
    const stepsToRollback = [...this.state.steps]
      .reverse()
      .filter(step => step.status === 'completed');

    for (const step of stepsToRollback) {
      try {
        await this.rollbackStep(step);
      } catch (error) {
        console.error(`[TRANSACTION] Failed to rollback step ${step.name}: ${error}`);
        // Continue with other steps
      }
    }

    this.state.status = 'rolled_back';
    await this.saveState();
    console.error(`[TRANSACTION] Rollback completed`);
  }

  /**
   * Rollback a single step
   */
  private async rollbackStep(step: TransactionStep): Promise<void> {
    console.error(`[TRANSACTION] Rolling back step: ${step.name}`);

    // Remove created files/directories
    if (step.created) {
      for (const filePath of step.created) {
        const fullPath = path.resolve(this.state.projectPath, filePath);
        if (await fs.pathExists(fullPath)) {
          await fs.remove(fullPath);
          console.error(`[ROLLBACK] Removed: ${filePath}`);
        }
      }
    }

    // Restore modified files from backup
    if (step.modified && this.state.backupPath) {
      for (const filePath of step.modified) {
        const fullPath = path.resolve(this.state.projectPath, filePath);
        const backupPath = path.join(this.state.backupPath, filePath);
        
        if (await fs.pathExists(backupPath)) {
          await fs.copy(backupPath, fullPath);
          console.error(`[ROLLBACK] Restored: ${filePath}`);
        }
      }
    }

    step.status = 'rolled_back';
  }

  /**
   * Clean up transaction state and backups
   */
  async cleanup(): Promise<void> {
    try {
      if (this.state.backupPath && await fs.pathExists(this.state.backupPath)) {
        await fs.remove(this.state.backupPath);
      }
      
      if (await fs.pathExists(this.statePath)) {
        await fs.remove(this.statePath);
      }
      
      console.error(`[TRANSACTION] Cleanup completed`);
    } catch (error) {
      console.error(`[WARN] Failed to cleanup transaction: ${error}`);
    }
  }

  /**
   * Get current transaction status
   */
  getStatus(): TransactionState {
    return { ...this.state };
  }

  /**
   * Get completed steps count
   */
  getProgress(): { completed: number; total: number; percentage: number } {
    const completed = this.state.steps.filter(s => s.status === 'completed').length;
    const total = this.state.steps.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return { completed, total, percentage };
  }
}