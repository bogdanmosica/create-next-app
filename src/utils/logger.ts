/**
 * @fileoverview Structured Logging System
 * @description Proper logging system to replace confusing console.error usage
 * Provides clear log levels, formatting, and better debugging experience
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  category: string;
  message: string;
  data?: any;
  duration?: number;
}

export interface LoggerConfig {
  level: LogLevel;
  showTimestamp: boolean;
  showCategory: boolean;
  colorOutput: boolean;
  outputFile?: string;
}

const DEFAULT_CONFIG: LoggerConfig = {
  level: LogLevel.INFO,
  showTimestamp: false,
  showCategory: true,
  colorOutput: true
};

export class Logger {
  private static config: LoggerConfig = DEFAULT_CONFIG;
  private static entries: LogEntry[] = [];
  private category: string;

  constructor(category: string) {
    this.category = category;
  }

  /**
   * Configure logger globally
   */
  static configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Create a logger for a specific category
   */
  static create(category: string): Logger {
    return new Logger(category);
  }

  /**
   * Debug level logging (only shown in debug mode)
   */
  debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  /**
   * Info level logging (general information)
   */
  info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }

  /**
   * Warning level logging (potential issues)
   */
  warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }

  /**
   * Error level logging (actual problems)
   */
  error(message: string, data?: any): void {
    this.log(LogLevel.ERROR, message, data);
  }

  /**
   * Log with timing information
   */
  timed<T>(message: string, fn: () => T | Promise<T>): T | Promise<T> {
    const start = Date.now();
    this.debug(`Starting: ${message}`);

    const result = fn();

    if (result instanceof Promise) {
      return result.then(
        (value) => {
          const duration = Date.now() - start;
          this.debug(`Completed: ${message}`, { duration: `${duration}ms` });
          return value;
        },
        (error) => {
          const duration = Date.now() - start;
          this.error(`Failed: ${message}`, { duration: `${duration}ms`, error });
          throw error;
        }
      ) as T;
    } else {
      const duration = Date.now() - start;
      this.debug(`Completed: ${message}`, { duration: `${duration}ms` });
      return result;
    }
  }

  /**
   * Create a progress logger for step-by-step operations
   */
  progress(totalSteps: number): ProgressLogger {
    return new ProgressLogger(this, totalSteps);
  }

  /**
   * Internal logging method
   */
  private log(level: LogLevel, message: string, data?: any): void {
    if (level < Logger.config.level) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      category: this.category,
      message,
      data
    };

    Logger.entries.push(entry);
    this.output(entry);
  }

  /**
   * Output log entry to console
   */
  private output(entry: LogEntry): void {
    const { config } = Logger;
    
    let output = '';

    // Timestamp
    if (config.showTimestamp) {
      output += `[${entry.timestamp.toISOString()}] `;
    }

    // Level and category with colors/emojis
    const levelInfo = this.formatLevel(entry.level);
    if (config.showCategory) {
      output += `${levelInfo.icon} [${entry.category.toUpperCase()}] `;
    } else {
      output += `${levelInfo.icon} `;
    }

    // Message
    output += entry.message;

    // Data
    if (entry.data) {
      output += ` ${this.formatData(entry.data)}`;
    }

    // Output to appropriate stream
    const outputFn = entry.level >= LogLevel.ERROR ? console.error : console.log;
    
    if (config.colorOutput) {
      outputFn(`${levelInfo.color}${output}\x1b[0m`);
    } else {
      outputFn(output);
    }
  }

  /**
   * Format log level with colors and icons
   */
  private formatLevel(level: LogLevel): { icon: string; color: string } {
    switch (level) {
      case LogLevel.DEBUG:
        return { icon: '🔍', color: '\x1b[36m' }; // Cyan
      case LogLevel.INFO:
        return { icon: 'ℹ️', color: '\x1b[32m' }; // Green
      case LogLevel.WARN:
        return { icon: '⚠️', color: '\x1b[33m' }; // Yellow
      case LogLevel.ERROR:
        return { icon: '❌', color: '\x1b[31m' }; // Red
      default:
        return { icon: '📝', color: '\x1b[0m' }; // Reset
    }
  }

  /**
   * Format additional data
   */
  private formatData(data: any): string {
    if (typeof data === 'string') {
      return data;
    }
    if (typeof data === 'object') {
      try {
        return JSON.stringify(data, null, 2);
      } catch {
        return '[Complex Object]';
      }
    }
    return String(data);
  }

  /**
   * Get all log entries
   */
  static getEntries(): LogEntry[] {
    return [...this.entries];
  }

  /**
   * Clear log entries
   */
  static clear(): void {
    this.entries = [];
  }

  /**
   * Export logs to file
   */
  static async exportLogs(filePath: string): Promise<void> {
    const fs = await import('fs-extra');
    const content = this.entries.map(entry => {
      const timestamp = entry.timestamp.toISOString();
      const level = LogLevel[entry.level];
      const data = entry.data ? ` ${JSON.stringify(entry.data)}` : '';
      return `[${timestamp}] ${level} [${entry.category}] ${entry.message}${data}`;
    }).join('\n');
    
    await fs.writeFile(filePath, content, 'utf8');
  }
}

/**
 * Progress logger for step-by-step operations
 */
export class ProgressLogger {
  private currentStep = 0;
  private totalSteps: number;
  private logger: Logger;
  private startTime: number;

  constructor(logger: Logger, totalSteps: number) {
    this.logger = logger;
    this.totalSteps = totalSteps;
    this.startTime = Date.now();
  }

  /**
   * Log start of operation
   */
  start(message: string): void {
    this.logger.info(`🚀 Starting: ${message} (${this.totalSteps} steps)`);
  }

  /**
   * Log step progress
   */
  step(stepName: string): void {
    this.currentStep++;
    const percentage = Math.round((this.currentStep / this.totalSteps) * 100);
    const progress = this.createProgressBar(percentage);
    
    this.logger.info(`${progress} Step ${this.currentStep}/${this.totalSteps}: ${stepName}`);
  }

  /**
   * Log step completion
   */
  stepCompleted(stepName: string, duration?: number): void {
    const durationText = duration ? ` (${duration}ms)` : '';
    this.logger.info(`✅ Completed: ${stepName}${durationText}`);
  }

  /**
   * Log step failure
   */
  stepFailed(stepName: string, error: string): void {
    this.logger.error(`❌ Failed: ${stepName}`, { error });
  }

  /**
   * Log completion of entire operation
   */
  complete(message: string): void {
    const totalDuration = Date.now() - this.startTime;
    this.logger.info(`🎉 Completed: ${message}`, { 
      totalSteps: this.totalSteps, 
      duration: `${totalDuration}ms` 
    });
  }

  /**
   * Create visual progress bar
   */
  private createProgressBar(percentage: number, width: number = 20): string {
    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;
    const filledBar = '█'.repeat(filled);
    const emptyBar = '░'.repeat(empty);
    return `[${filledBar}${emptyBar}] ${percentage}%`;
  }
}

// Convenience functions for common categories
export const createLogger = (category: string) => Logger.create(category);

// Pre-configured loggers for common use cases
export const mcpLogger = Logger.create('MCP');
export const toolLogger = Logger.create('TOOL');
export const transactionLogger = Logger.create('TRANSACTION');
export const validationLogger = Logger.create('VALIDATION');
export const configLogger = Logger.create('CONFIG');

// Global logger configuration
export const configureLogging = (config: Partial<LoggerConfig>) => {
  Logger.configure(config);
};

// Logger class is already exported above