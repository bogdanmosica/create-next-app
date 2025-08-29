/**
 * @fileoverview Token-Aware Tool Wrapper
 * @description Wraps MCP tools with automatic token tracking and optimization
 */

import { TokenTracker, TemplateOptimizer } from './token-metrics.js';

export interface TokenBudget {
  maxTokensPerTool?: number;
  maxTokensPerSession?: number;
  enableOptimization?: boolean;
  enableCompression?: boolean;
}

export interface WrappedToolResult {
  result: string;
  tokenMetrics: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    efficiency: number;
  };
  warnings: string[];
  optimizationSuggestions: string[];
}

export class TokenAwareWrapper {
  private static budget: TokenBudget = {
    maxTokensPerTool: 20000,
    maxTokensPerSession: 100000,
    enableOptimization: true,
    enableCompression: true,
  };

  /**
   * Configure token budget
   */
  static configureBudget(budget: Partial<TokenBudget>): void {
    this.budget = { ...this.budget, ...budget };
  }

  /**
   * Wrap a tool function with token tracking
   */
  static wrapTool<T extends any[], R>(
    toolName: string,
    toolFunction: (...args: T) => Promise<string>,
    templateExtractor?: (...args: T) => string
  ) {
    return async (...args: T): Promise<WrappedToolResult> => {
      const startTime = Date.now();
      const warnings: string[] = [];
      const optimizationSuggestions: string[] = [];

      // Check session budget
      const sessionSummary = TokenTracker.getSessionSummary();
      if (this.budget.maxTokensPerSession && sessionSummary.totalTokens > this.budget.maxTokensPerSession) {
        warnings.push(`Session token limit exceeded: ${sessionSummary.totalTokens} > ${this.budget.maxTokensPerSession}`);
      }

      // Extract template content if extractor provided
      let templateContent = '';
      if (templateExtractor) {
        templateContent = templateExtractor(...args);
        
        // Compress template if enabled
        if (this.budget.enableCompression) {
          const originalSize = templateContent.length;
          templateContent = TemplateOptimizer.compressTemplate(templateContent);
          const compressionRatio = (originalSize - templateContent.length) / originalSize;
          
          if (compressionRatio > 0.1) {
            optimizationSuggestions.push(`Template compressed by ${(compressionRatio * 100).toFixed(1)}%`);
          }
        }
      }

      // Execute the original tool
      let result: string;
      try {
        result = await toolFunction(...args);
      } catch (error) {
        // Track failed execution
        TokenTracker.trackTool(toolName, templateContent, '', Date.now() - startTime, 0);
        throw error;
      }

      const executionTime = Date.now() - startTime;

      // Track token usage
      const toolMetrics = TokenTracker.trackTool(
        toolName,
        templateContent,
        result,
        executionTime,
        this.estimateFilesGenerated(result)
      );

      // Check tool-specific budget
      if (this.budget.maxTokensPerTool && toolMetrics.metrics.totalTokens > this.budget.maxTokensPerTool) {
        warnings.push(`Tool token limit exceeded: ${toolMetrics.metrics.totalTokens} > ${this.budget.maxTokensPerTool}`);
        optimizationSuggestions.push(`Consider splitting ${toolName} into smaller, more focused tools`);
      }

      // Efficiency warnings
      if (toolMetrics.metrics.efficiency < 1.5) {
        warnings.push(`Low token efficiency: ${toolMetrics.metrics.efficiency.toFixed(2)} chars/token`);
        optimizationSuggestions.push(`Optimize ${toolName} templates to reduce token usage`);
      }

      // Add tool-specific optimization suggestions
      if (this.budget.enableOptimization) {
        const suggestions = this.generateToolOptimizations(toolName, toolMetrics);
        optimizationSuggestions.push(...suggestions);
      }

      // Create optimized result if needed
      let finalResult = result;
      if (this.budget.enableOptimization && toolMetrics.metrics.totalTokens > 15000) {
        finalResult = this.optimizeResult(result, toolName);
        if (finalResult !== result) {
          const savings = TokenTracker.estimateTokens(result) - TokenTracker.estimateTokens(finalResult);
          optimizationSuggestions.push(`Result optimized: saved ~${savings} tokens`);
        }
      }

      return {
        result: finalResult,
        tokenMetrics: {
          inputTokens: toolMetrics.metrics.inputTokens,
          outputTokens: toolMetrics.metrics.outputTokens,
          totalTokens: toolMetrics.metrics.totalTokens,
          efficiency: toolMetrics.metrics.efficiency,
        },
        warnings,
        optimizationSuggestions,
      };
    };
  }

  /**
   * Estimate number of files generated from result
   */
  private static estimateFilesGenerated(result: string): number {
    // Count file creation indicators in the result
    const fileIndicators = [
      /Files Created:/i,
      /📁.*Created:/i,
      /✅.*files?:/i,
      /Generated.*files?:/i,
    ];

    for (const indicator of fileIndicators) {
      const match = result.match(indicator);
      if (match) {
        // Try to extract number from context
        const lines = result.split('\n');
        const startIndex = lines.findIndex(line => indicator.test(line));
        if (startIndex >= 0) {
          let fileCount = 0;
          for (let i = startIndex; i < Math.min(startIndex + 20, lines.length); i++) {
            if (lines[i].includes('`') || lines[i].includes('.ts') || lines[i].includes('.tsx')) {
              fileCount++;
            }
          }
          return Math.max(fileCount, 1);
        }
      }
    }

    // Default estimation
    return 1;
  }

  /**
   * Generate tool-specific optimization suggestions
   */
  private static generateToolOptimizations(toolName: string, metrics: any): string[] {
    const suggestions: string[] = [];

    // Tool-specific optimization rules
    const optimizationRules: Record<string, (metrics: any) => string[]> = {
      create_nextjs_app: (m) => {
        const suggestions = [];
        if (m.metrics.totalTokens > 30000) {
          suggestions.push('Consider using individual tools instead of the monolithic create_nextjs_app');
        }
        if (m.filesGenerated > 50) {
          suggestions.push('Large project detected - consider progressive generation');
        }
        return suggestions;
      },

      setup_testing_suite: (m) => {
        if (m.metrics.totalTokens > 15000) {
          return ['Split testing setup into unit tests, E2E tests, and mocking as separate tools'];
        }
        return [];
      },

      setup_authentication_jwt: (m) => {
        if (m.metrics.efficiency < 2.0) {
          return ['Authentication templates are verbose - consider using external file references'];
        }
        return [];
      },

      setup_stripe_payments: (m) => {
        if (m.metrics.totalTokens > 20000) {
          return ['Split Stripe setup into payments and webhooks tools for better efficiency'];
        }
        return [];
      },
    };

    const rule = optimizationRules[toolName];
    if (rule) {
      suggestions.push(...rule(metrics));
    }

    return suggestions;
  }

  /**
   * Optimize result content
   */
  private static optimizeResult(result: string, toolName: string): string {
    let optimized = result;

    // Remove excessive documentation if very long
    if (optimized.length > 20000) {
      // Remove detailed examples but keep essential info
      optimized = optimized.replace(
        /💻 \*\*Usage Examples:\*\*[\s\S]*?(?=\n\n🚀|\n\n💡|\n\n⚠️|\n\n📚|$)/g,
        '\n💻 **Usage Examples:** See generated files for detailed implementation examples.'
      );

      // Compress repetitive sections
      optimized = optimized.replace(
        /(\n- .*){10,}/g,
        (match) => {
          const lines = match.split('\n').filter(l => l.trim());
          const compressed = lines.slice(0, 5).concat(['- ... (and more)']);
          return '\n' + compressed.join('\n');
        }
      );
    }

    // Remove debug information from production responses
    optimized = optimized.replace(/\[DEBUG\].*\n?/g, '');
    optimized = optimized.replace(/console\.error\(.*\);?\n?/g, '');

    return optimized.trim();
  }

  /**
   * Generate token usage summary for session
   */
  static generateTokenSummary(): string {
    const summary = TokenTracker.getSessionSummary();
    const recommendations = TokenTracker.getOptimizationRecommendations();

    return `
## 📊 Token Usage Summary

**Session Stats:**
- Total Tokens: ${summary.totalTokens.toLocaleString()}
- Tools Used: ${summary.totalTools}
- Most Expensive: ${summary.mostExpensiveTool}
- Efficiency: ${summary.tokenEfficiency.toFixed(2)} chars/token

**Recommendations:**
${recommendations.map(r => `- ${r}`).join('\n')}

**Budget Status:**
- Per-tool limit: ${this.budget.maxTokensPerTool?.toLocaleString() || 'No limit'}
- Session limit: ${this.budget.maxTokensPerSession?.toLocaleString() || 'No limit'}
- Optimization: ${this.budget.enableOptimization ? 'Enabled' : 'Disabled'}
`;
  }
}

/**
 * Decorator for automatically wrapping tool functions
 */
export function tokenTracked(toolName: string, templateExtractor?: any) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = TokenAwareWrapper.wrapTool(
      toolName,
      originalMethod.bind(target),
      templateExtractor
    );
    
    return descriptor;
  };
}