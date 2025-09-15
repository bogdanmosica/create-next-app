/**
 * @fileoverview Enhanced Error Handler with Recovery Suggestions
 * @description Provides user-friendly error messages and actionable recovery steps
 * Improves UX by translating technical errors into helpful guidance
 */

export interface ErrorContext {
  operation: string;
  step?: string;
  preset?: string;
  features?: Record<string, boolean>;
  projectPath?: string;
}

export interface ErrorSuggestion {
  message: string;
  actions: string[];
  severity: 'error' | 'warning' | 'info';
  recoverable: boolean;
}

export class EnhancedErrorHandler {
  /**
   * Process error and provide helpful suggestions
   */
  static handleError(error: Error, context: ErrorContext): ErrorSuggestion {
    const errorMessage = error.message.toLowerCase();
    
    // System requirement errors
    if (errorMessage.includes('node') && errorMessage.includes('version')) {
      return {
        message: 'Node.js version compatibility issue',
        actions: [
          'Update to Node.js 18+ (recommended: latest LTS)',
          'Use nvm to manage Node.js versions',
          'Check: node --version'
        ],
        severity: 'error',
        recoverable: true
      };
    }

    if (errorMessage.includes('pnpm') && errorMessage.includes('not found')) {
      return {
        message: 'pnpm package manager not installed',
        actions: [
          'Install pnpm: npm install -g pnpm',
          'Or use npm instead (less optimal)',
          'Verify installation: pnpm --version'
        ],
        severity: 'error',
        recoverable: true
      };
    }

    // Permission and access errors
    if (errorMessage.includes('permission denied') || errorMessage.includes('eacces')) {
      return {
        message: 'Permission denied - insufficient file system access',
        actions: [
          'Run with administrator privileges',
          'Check folder permissions',
          'Try a different project directory',
          'On Windows: Run terminal as administrator'
        ],
        severity: 'error',
        recoverable: true
      };
    }

    if (errorMessage.includes('enoent') || errorMessage.includes('no such file')) {
      return {
        message: 'File or directory not found',
        actions: [
          'Verify project path exists and is writable',
          'Create parent directories manually',
          'Check for special characters in path',
          'Try shorter path (Windows path length limit)'
        ],
        severity: 'error',
        recoverable: true
      };
    }

    // Network and registry errors
    if (errorMessage.includes('network') || errorMessage.includes('timeout') || errorMessage.includes('registry')) {
      return {
        message: 'Network or package registry issue',
        actions: [
          'Check internet connection',
          'Try again (temporary registry issues)',
          'Switch registry: pnpm set registry https://registry.npmjs.org/',
          'Use VPN if behind corporate firewall'
        ],
        severity: 'warning',
        recoverable: true
      };
    }

    // Disk space errors
    if (errorMessage.includes('enospc') || errorMessage.includes('disk') || errorMessage.includes('space')) {
      return {
        message: 'Insufficient disk space',
        actions: [
          'Free up disk space (need ~500MB for full setup)',
          'Run disk cleanup',
          'Choose different drive/directory',
          'Clear npm/pnpm cache: pnpm store prune'
        ],
        severity: 'error',
        recoverable: true
      };
    }

    // Feature dependency errors
    if (errorMessage.includes('dependency not met') || errorMessage.includes('requires')) {
      const missingFeatures = this.extractMissingFeatures(errorMessage, context);
      return {
        message: 'Feature dependency not satisfied',
        actions: [
          `Enable required features: ${missingFeatures.join(', ')}`,
          'Use a different preset that includes dependencies',
          'Manually enable dependencies in features config',
          'Check preset documentation for requirements'
        ],
        severity: 'error',
        recoverable: true
      };
    }

    // Git-related errors
    if (errorMessage.includes('git') && (errorMessage.includes('not found') || errorMessage.includes('command'))) {
      return {
        message: 'Git not installed or not in PATH',
        actions: [
          'Install Git from https://git-scm.com/',
          'Add Git to system PATH',
          'Restart terminal after installation',
          'Skip git workflow features if not needed'
        ],
        severity: 'warning',
        recoverable: true
      };
    }

    // Database connection errors
    if (errorMessage.includes('database') || errorMessage.includes('postgres') || errorMessage.includes('connection')) {
      return {
        message: 'Database setup or connection issue',
        actions: [
          'Install PostgreSQL locally or use cloud service',
          'Update DATABASE_URL in .env file',
          'Run: pnpm db:push to sync schema',
          'Check database service is running'
        ],
        severity: 'warning',
        recoverable: true
      };
    }

    // TypeScript compilation errors
    if (errorMessage.includes('typescript') || errorMessage.includes('tsc') || errorMessage.includes('type error')) {
      return {
        message: 'TypeScript compilation error',
        actions: [
          'Run: pnpm build to see full error details',
          'Check for conflicting type definitions',
          'Update dependencies: pnpm update',
          'Clear node_modules and reinstall'
        ],
        severity: 'error',
        recoverable: true
      };
    }

    // Port already in use
    if (errorMessage.includes('port') && errorMessage.includes('use')) {
      return {
        message: 'Development server port already in use',
        actions: [
          'Stop other development servers',
          'Use different port: pnpm dev --port 3001',
          'Kill process using port: lsof -ti:3000 | xargs kill',
          'Check for background processes'
        ],
        severity: 'warning',
        recoverable: true
      };
    }

    // Generic build/setup errors
    if (errorMessage.includes('build') || errorMessage.includes('install')) {
      return {
        message: 'Build or installation failure',
        actions: [
          'Clear cache: pnpm store prune',
          'Delete node_modules and package-lock files',
          'Reinstall: rm -rf node_modules && pnpm install',
          'Try with npm instead: npm install'
        ],
        severity: 'error',
        recoverable: true
      };
    }

    // Fallback for unknown errors
    return {
      message: 'Unexpected error occurred',
      actions: [
        'Check the error message above for specific details',
        'Try running the command again',
        'Use rollback feature to restore clean state',
        'Report issue with error details if problem persists'
      ],
      severity: 'error',
      recoverable: false
    };
  }

  /**
   * Extract missing features from dependency error messages
   */
  private static extractMissingFeatures(errorMessage: string, context: ErrorContext): string[] {
    const features = [];
    
    if (errorMessage.includes('database')) features.push('database');
    if (errorMessage.includes('auth')) features.push('authentication');
    if (errorMessage.includes('payment')) features.push('payments');
    
    return features;
  }

  /**
   * Format error suggestion into user-friendly message
   */
  static formatErrorMessage(suggestion: ErrorSuggestion, context: ErrorContext): string {
    const emoji = suggestion.severity === 'error' ? '❌' : suggestion.severity === 'warning' ? '⚠️' : 'ℹ️';
    const recoverableText = suggestion.recoverable ? '(Recoverable)' : '(Manual fix required)';
    
    let message = `${emoji} **${suggestion.message}** ${recoverableText}\n\n`;
    
    if (context.preset) {
      message += `**Preset**: ${context.preset}\n`;
    }
    
    if (context.step) {
      message += `**Failed Step**: ${context.step}\n`;
    }
    
    message += `**Operation**: ${context.operation}\n\n`;
    message += `**Recovery Actions**:\n`;
    message += suggestion.actions.map((action, index) => `${index + 1}. ${action}`).join('\n');
    
    if (suggestion.recoverable) {
      message += '\n\n💡 **Transaction Recovery**:\n';
      message += '- Your progress is saved - you can resume after fixing the issue\n';
      message += '- Run the same command again to continue from where it failed\n';
      message += '- Use rollback if you need to start fresh\n';
    }
    
    return message;
  }

  /**
   * Check for common system issues before starting
   */
  static async performPreflightCheck(projectPath: string): Promise<ErrorSuggestion[]> {
    const warnings: ErrorSuggestion[] = [];
    
    try {
      // Check Node.js version
      const nodeVersion = process.version;
      const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
      
      if (majorVersion < 18) {
        warnings.push({
          message: `Node.js ${nodeVersion} detected (18+ recommended)`,
          actions: [
            'Update to Node.js 18+ for best compatibility',
            'Some features may not work with older versions'
          ],
          severity: 'warning',
          recoverable: true
        });
      }
      
      // Check for long path on Windows
      if (process.platform === 'win32' && projectPath.length > 200) {
        warnings.push({
          message: 'Project path may be too long for Windows',
          actions: [
            'Use shorter path (Windows has 260 char limit)',
            'Move to root drive (C:\\projects\\my-app)',
            'Enable long path support in Windows'
          ],
          severity: 'warning',
          recoverable: true
        });
      }
      
      // Check available disk space (approximate)
      const stats = await import('fs').then(fs => fs.promises.stat(projectPath.split(/[/\\]/)[0] || '.'));
      // This is a basic check - in real implementation you'd check actual disk space
      
    } catch (error) {
      // Preflight check itself failed - not critical
    }
    
    return warnings;
  }
}