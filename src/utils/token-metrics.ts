/**
 * @fileoverview Token Metrics System
 * @description Tracks token usage, provides optimization recommendations, and monitors MCP efficiency
 */

export interface TokenMetrics {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  templateSize: number;
  responseSize: number;
  efficiency: number; // Code generated per token
  timestamp: Date;
}

export interface ToolMetrics {
  toolName: string;
  metrics: TokenMetrics;
  executionTime: number;
  filesGenerated: number;
  averageFileSize: number;
}

export class TokenTracker {
  private static metrics: Map<string, ToolMetrics[]> = new Map();
  private static sessionMetrics: TokenMetrics[] = [];

  /**
   * Estimate token count from text (approximation: 1 token ≈ 4 characters)
   */
  static estimateTokens(text: string): number {
    // More accurate estimation based on research:
    // - Average token length: 4 characters
    // - Punctuation and spaces: ~20% overhead
    // - Code tokens are typically shorter than prose
    const chars = text.length;
    const estimatedTokens = Math.ceil(chars / 3.5); // Slightly better for code
    return estimatedTokens;
  }

  /**
   * Track token usage for a tool execution
   */
  static trackTool(
    toolName: string,
    templateContent: string,
    responseContent: string,
    executionTime: number,
    filesGenerated: number = 1
  ): ToolMetrics {
    const inputTokens = this.estimateTokens(templateContent);
    const outputTokens = this.estimateTokens(responseContent);
    const totalTokens = inputTokens + outputTokens;
    
    const metrics: TokenMetrics = {
      inputTokens,
      outputTokens,
      totalTokens,
      templateSize: templateContent.length,
      responseSize: responseContent.length,
      efficiency: responseContent.length / totalTokens, // Characters per token
      timestamp: new Date(),
    };

    const toolMetric: ToolMetrics = {
      toolName,
      metrics,
      executionTime,
      filesGenerated,
      averageFileSize: responseContent.length / filesGenerated,
    };

    // Store metrics
    if (!this.metrics.has(toolName)) {
      this.metrics.set(toolName, []);
    }
    this.metrics.get(toolName)!.push(toolMetric);
    this.sessionMetrics.push(metrics);

    return toolMetric;
  }

  /**
   * Get metrics for a specific tool
   */
  static getToolMetrics(toolName: string): ToolMetrics[] {
    return this.metrics.get(toolName) || [];
  }

  /**
   * Get session summary
   */
  static getSessionSummary(): {
    totalTokens: number;
    totalTools: number;
    averageTokensPerTool: number;
    mostExpensiveTool: string;
    tokenEfficiency: number;
  } {
    const totalTokens = this.sessionMetrics.reduce((sum, m) => sum + m.totalTokens, 0);
    const totalTools = this.sessionMetrics.length;
    
    // Find most expensive tool
    let maxTokens = 0;
    let mostExpensiveTool = 'none';
    
    for (const [toolName, metrics] of this.metrics.entries()) {
      const toolTotal = metrics.reduce((sum, m) => sum + m.metrics.totalTokens, 0);
      if (toolTotal > maxTokens) {
        maxTokens = toolTotal;
        mostExpensiveTool = toolName;
      }
    }

    return {
      totalTokens,
      totalTools,
      averageTokensPerTool: totalTools > 0 ? totalTokens / totalTools : 0,
      mostExpensiveTool,
      tokenEfficiency: totalTokens > 0 ? 
        this.sessionMetrics.reduce((sum, m) => sum + m.responseSize, 0) / totalTokens : 0,
    };
  }

  /**
   * Get optimization recommendations
   */
  static getOptimizationRecommendations(): string[] {
    const recommendations: string[] = [];
    const summary = this.getSessionSummary();

    // High token usage warning
    if (summary.totalTokens > 50000) {
      recommendations.push("⚠️ HIGH TOKEN USAGE: Consider breaking large operations into smaller tools");
    }

    // Low efficiency warning
    if (summary.tokenEfficiency < 2.0) {
      recommendations.push("🔧 LOW EFFICIENCY: Templates may be too verbose - consider using smaller, focused templates");
    }

    // Tool-specific recommendations
    for (const [toolName, metrics] of this.metrics.entries()) {
      const avgTokens = metrics.reduce((sum, m) => sum + m.metrics.totalTokens, 0) / metrics.length;
      
      if (avgTokens > 10000) {
        recommendations.push(`📊 ${toolName}: High token usage (${Math.round(avgTokens)} avg) - consider splitting functionality`);
      }

      const avgEfficiency = metrics.reduce((sum, m) => sum + m.metrics.efficiency, 0) / metrics.length;
      if (avgEfficiency < 1.5) {
        recommendations.push(`⚡ ${toolName}: Low efficiency (${avgEfficiency.toFixed(2)} chars/token) - optimize templates`);
      }
    }

    // Generic recommendations
    if (recommendations.length === 0) {
      recommendations.push("✅ Token usage is within reasonable limits");
      if (summary.tokenEfficiency > 3.0) {
        recommendations.push("🎯 Excellent token efficiency!");
      }
    }

    return recommendations;
  }

  /**
   * Generate detailed metrics report
   */
  static generateReport(): string {
    const summary = this.getSessionSummary();
    const recommendations = this.getOptimizationRecommendations();

    let report = `
📊 **TOKEN USAGE REPORT**

## Summary
- **Total Tokens Used**: ${summary.totalTokens.toLocaleString()}
- **Tools Executed**: ${summary.totalTools}
- **Average per Tool**: ${Math.round(summary.averageTokensPerTool).toLocaleString()} tokens
- **Most Expensive**: ${summary.mostExpensiveTool}
- **Efficiency**: ${summary.tokenEfficiency.toFixed(2)} chars/token

## Tool Breakdown
`;

    for (const [toolName, metrics] of this.metrics.entries()) {
      const totalTokens = metrics.reduce((sum, m) => sum + m.metrics.totalTokens, 0);
      const avgTokens = totalTokens / metrics.length;
      const avgTime = metrics.reduce((sum, m) => sum + m.executionTime, 0) / metrics.length;

      report += `
### ${toolName}
- **Uses**: ${metrics.length}
- **Total Tokens**: ${totalTokens.toLocaleString()}
- **Average**: ${Math.round(avgTokens).toLocaleString()} tokens
- **Avg Time**: ${avgTime.toFixed(2)}s
- **Files Generated**: ${metrics.reduce((sum, m) => sum + m.filesGenerated, 0)}
`;
    }

    report += `
## Recommendations
${recommendations.map(r => `- ${r}`).join('\n')}

## Token Optimization Tips
- **Break Large Tools**: Split complex tools into smaller, focused ones
- **Use Lazy Loading**: Only generate templates when needed
- **Template Compression**: Remove redundant code and comments from templates
- **Conditional Generation**: Only include features that are actually used
- **Reference External Files**: Instead of inline templates, reference external files
`;

    return report;
  }

  /**
   * Clear session metrics
   */
  static clearSession(): void {
    this.sessionMetrics = [];
    this.metrics.clear();
  }

  /**
   * Export metrics data
   */
  static exportMetrics(): {
    session: TokenMetrics[];
    tools: Record<string, ToolMetrics[]>;
    summary: ReturnType<typeof TokenTracker.getSessionSummary>;
  } {
    return {
      session: this.sessionMetrics,
      tools: Object.fromEntries(this.metrics.entries()),
      summary: this.getSessionSummary(),
    };
  }
}

/**
 * Template optimization utilities
 */
export class TemplateOptimizer {
  /**
   * Compress template by removing extra whitespace and comments
   */
  static compressTemplate(template: string): string {
    return template
      // Remove single-line comments (but keep JSDoc)
      .replace(/^\s*\/\/(?!\/).*$/gm, '')
      // Remove extra blank lines
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      // Remove trailing whitespace
      .replace(/[ \t]+$/gm, '')
      // Remove leading whitespace from non-indented lines
      .split('\n')
      .map(line => line.trimStart() === line ? line.trim() : line)
      .join('\n')
      .trim();
  }

  /**
   * Split large template into smaller chunks
   */
  static splitTemplate(template: string, maxSize: number = 2000): string[] {
    if (template.length <= maxSize) {
      return [template];
    }

    const chunks: string[] = [];
    const lines = template.split('\n');
    let currentChunk = '';

    for (const line of lines) {
      if (currentChunk.length + line.length > maxSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = line;
      } else {
        currentChunk += (currentChunk ? '\n' : '') + line;
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  /**
   * Calculate template efficiency score
   */
  static calculateEfficiency(template: string, generatedCode: string): number {
    const templateTokens = TokenTracker.estimateTokens(template);
    const codeTokens = TokenTracker.estimateTokens(generatedCode);
    
    // Efficiency = (generated code tokens) / (template tokens)
    // Higher is better (more code generated per template token)
    return templateTokens > 0 ? codeTokens / templateTokens : 0;
  }
}