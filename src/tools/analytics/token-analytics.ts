/**
 * @fileoverview Token Analytics Tool
 * @description Analyzes token usage and provides optimization recommendations for MCP templates
 */

import { TokenTracker, TemplateOptimizer } from '../../utils/token-metrics.js';
import fs from 'fs-extra';
import path from 'node:path';

export interface TokenAnalyticsConfig {
  projectPath?: string;
  analyzeTemplates?: boolean;
  generateReport?: boolean;
  optimizeTemplates?: boolean;
}

/**
 * Analyze token usage and provide optimization recommendations
 */
export async function analyzeTokenUsage(config: TokenAnalyticsConfig): Promise<string> {
  const {
    projectPath,
    analyzeTemplates = true,
    generateReport = true,
    optimizeTemplates = false
  } = config;

  let report = `# 📊 Token Usage Analysis Report\n\n`;
  
  // Get current session metrics
  const sessionSummary = TokenTracker.getSessionSummary();
  const recommendations = TokenTracker.getOptimizationRecommendations();
  
  // Session summary
  report += `## 🎯 Current Session Summary\n\n`;
  report += `- **Total Tokens Used**: ${sessionSummary.totalTokens.toLocaleString()}\n`;
  report += `- **Tools Executed**: ${sessionSummary.totalTools}\n`;
  report += `- **Average per Tool**: ${Math.round(sessionSummary.averageTokensPerTool).toLocaleString()} tokens\n`;
  report += `- **Most Expensive Tool**: ${sessionSummary.mostExpensiveTool}\n`;
  report += `- **Token Efficiency**: ${sessionSummary.tokenEfficiency.toFixed(2)} chars/token\n\n`;

  // Template analysis if requested
  if (analyzeTemplates) {
    report += `## 🔍 Template Analysis\n\n`;
    
    try {
      // Try multiple possible template paths
      const possiblePaths = [
        path.join(process.cwd(), 'src/templates'),
        path.join(__dirname, '../../templates'),
        path.join(__dirname, '../../../src/templates'),
        // Handle when running from different directories
        path.resolve(process.cwd(), 'src/templates'),
      ];
      
      let templatesPath = '';
      for (const checkPath of possiblePaths) {
        if (await fs.pathExists(checkPath)) {
          templatesPath = checkPath;
          break;
        }
      }
      
      if (templatesPath && await fs.pathExists(templatesPath)) {
        const templateFiles = await fs.readdir(templatesPath);
        let totalTemplateSize = 0;
        let totalEstimatedTokens = 0;
        const templateMetrics: Array<{
          file: string;
          size: number;
          tokens: number;
          efficiency: number;
        }> = [];

        for (const file of templateFiles.filter(f => f.endsWith('.ts'))) {
          const filePath = path.join(templatesPath, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const estimatedTokens = TokenTracker.estimateTokens(content);
          
          totalTemplateSize += content.length;
          totalEstimatedTokens += estimatedTokens;
          
          templateMetrics.push({
            file,
            size: content.length,
            tokens: estimatedTokens,
            efficiency: content.length / estimatedTokens
          });
        }

        report += `### Template Files Analysis\n\n`;
        report += `| File | Size (KB) | Est. Tokens | Efficiency |\n`;
        report += `|------|-----------|-------------|------------|\n`;
        
        templateMetrics
          .sort((a, b) => b.tokens - a.tokens)
          .forEach(({ file, size, tokens, efficiency }) => {
            report += `| ${file} | ${(size / 1024).toFixed(1)} | ${tokens.toLocaleString()} | ${efficiency.toFixed(1)} |\n`;
          });

        report += `\n**Total Template Size**: ${(totalTemplateSize / 1024).toFixed(1)} KB (~${totalEstimatedTokens.toLocaleString()} tokens)\n\n`;

        // Optimization suggestions for templates
        const largeTemplates = templateMetrics.filter(t => t.tokens > 5000);
        if (largeTemplates.length > 0) {
          report += `### 🚨 Large Templates (>5K tokens)\n\n`;
          largeTemplates.forEach(({ file, tokens }) => {
            report += `- **${file}**: ${tokens.toLocaleString()} tokens\n`;
          });
          report += `\n💡 **Recommendation**: Consider splitting large templates into smaller, focused modules.\n\n`;
        }

        const inefficientTemplates = templateMetrics.filter(t => t.efficiency < 2.0);
        if (inefficientTemplates.length > 0) {
          report += `### ⚡ Low Efficiency Templates (<2.0 chars/token)\n\n`;
          inefficientTemplates.forEach(({ file, efficiency }) => {
            report += `- **${file}**: ${efficiency.toFixed(2)} chars/token\n`;
          });
          report += `\n💡 **Recommendation**: Remove redundant whitespace and comments from these templates.\n\n`;
        }

      } else {
        report += `Templates directory not found. Searched paths:\n`;
        for (const checkPath of possiblePaths) {
          const exists = await fs.pathExists(checkPath).catch(() => false);
          report += `- ${checkPath} ${exists ? '✅' : '❌'}\n`;
        }
        report += `\n`;
      }

    } catch (error) {
      report += `Error analyzing templates: ${error instanceof Error ? error.message : String(error)}\n\n`;
    }
  }

  // Optimization recommendations
  report += `## 🎯 Optimization Recommendations\n\n`;
  recommendations.forEach(rec => {
    report += `- ${rec}\n`;
  });
  
  // Token budget recommendations
  report += `\n## 💰 Token Budget Guidelines\n\n`;
  report += `### Recommended Limits:\n`;
  report += `- **Per-tool limit**: 15,000 tokens (current: ${sessionSummary.totalTools > 0 ? Math.round(sessionSummary.totalTokens / sessionSummary.totalTools) : 0})\n`;
  report += `- **Session limit**: 100,000 tokens (current: ${sessionSummary.totalTokens.toLocaleString()})\n`;
  report += `- **Template efficiency target**: >3.0 chars/token (current: ${sessionSummary.tokenEfficiency.toFixed(2)})\n\n`;

  // Tool-specific insights
  const toolMetrics = TokenTracker.exportMetrics();
  if (Object.keys(toolMetrics.tools).length > 0) {
    report += `## 🛠️ Tool-Specific Metrics\n\n`;
    
    for (const [toolName, metrics] of Object.entries(toolMetrics.tools)) {
      const avgTokens = metrics.reduce((sum, m) => sum + m.metrics.totalTokens, 0) / metrics.length;
      const avgEfficiency = metrics.reduce((sum, m) => sum + m.metrics.efficiency, 0) / metrics.length;
      
      report += `### ${toolName}\n`;
      report += `- **Average Tokens**: ${Math.round(avgTokens).toLocaleString()}\n`;
      report += `- **Executions**: ${metrics.length}\n`;
      report += `- **Efficiency**: ${avgEfficiency.toFixed(2)} chars/token\n`;
      report += `- **Files Generated**: ${metrics.reduce((sum, m) => sum + m.filesGenerated, 0)}\n\n`;
    }
  }

  // Template optimization suggestions
  if (optimizeTemplates) {
    report += `## 🔧 Template Optimization Actions\n\n`;
    
    try {
      // Use same path resolution logic as template analysis
      const possiblePaths = [
        path.join(process.cwd(), 'src/templates'),
        path.join(__dirname, '../../templates'),
        path.join(__dirname, '../../../src/templates'),
        path.resolve(process.cwd(), 'src/templates'),
      ];
      
      let templatesPath = '';
      for (const checkPath of possiblePaths) {
        if (await fs.pathExists(checkPath)) {
          templatesPath = checkPath;
          break;
        }
      }
      
      if (templatesPath && await fs.pathExists(templatesPath)) {
        const templateFiles = await fs.readdir(templatesPath);
        
        for (const file of templateFiles.filter(f => f.endsWith('.ts'))) {
          const filePath = path.join(templatesPath, file);
          const originalContent = await fs.readFile(filePath, 'utf-8');
          const compressedContent = TemplateOptimizer.compressTemplate(originalContent);
          
          const originalTokens = TokenTracker.estimateTokens(originalContent);
          const compressedTokens = TokenTracker.estimateTokens(compressedContent);
          const savings = originalTokens - compressedTokens;
          const savingsPercent = (savings / originalTokens) * 100;
          
          if (savings > 100) { // Only show significant savings
            report += `### ${file}\n`;
            report += `- **Original**: ${originalTokens.toLocaleString()} tokens\n`;
            report += `- **Compressed**: ${compressedTokens.toLocaleString()} tokens\n`;
            report += `- **Savings**: ${savings.toLocaleString()} tokens (${savingsPercent.toFixed(1)}%)\n\n`;
          }
        }
      }
    } catch (error) {
      report += `Error during template optimization: ${error instanceof Error ? error.message : String(error)}\n\n`;
    }
  }

  // Export data if project path provided
  if (projectPath && generateReport) {
    try {
      const reportPath = path.join(projectPath, 'token-analytics-report.md');
      await fs.writeFile(reportPath, report);
      report += `\n📁 **Report saved to**: ${reportPath}\n`;
    } catch (error) {
      report += `\n⚠️ **Could not save report**: ${error instanceof Error ? error.message : String(error)}\n`;
    }
  }

  return report;
}