#!/usr/bin/env node

/**
 * Simple test script for the token analytics functionality
 */

import { analyzeTokenUsage } from './dist/tools/analytics/token-analytics.js';
import { TokenTracker } from './dist/utils/token-metrics.js';

async function testTokenAnalytics() {
  console.log('🧪 Testing Token Analytics Functionality...\n');
  
  // Simulate some tool usage first
  console.log('📊 Simulating tool usage to generate metrics...');
  
  // Track a simulated tool execution
  TokenTracker.trackTool(
    'create_nextjs_app',
    'This is a sample template content that would be used to create a Next.js app with authentication and payments',
    'Generated a complete Next.js SaaS application with 15 files including authentication, payments, and team management.',
    2500, // 2.5 second execution time
    15 // 15 files generated
  );
  
  TokenTracker.trackTool(
    'setup_testing_suite',
    'Template for setting up testing with Vitest, Playwright, and MSW',
    'Created comprehensive testing setup with unit tests, E2E tests, and API mocking capabilities.',
    1200, // 1.2 second execution time
    8 // 8 files generated
  );
  
  console.log('✅ Simulated tool executions tracked\n');
  
  // Test the analytics tool
  console.log('🔍 Running token usage analysis...');
  
  try {
    const result = await analyzeTokenUsage({
      analyzeTemplates: true,
      generateReport: true,
      optimizeTemplates: false
    });
    
    console.log('📈 Token Analysis Results:');
    console.log('='.repeat(50));
    console.log(result);
    console.log('='.repeat(50));
    
    console.log('\n✅ Token analytics test completed successfully!');
    
  } catch (error) {
    console.error('❌ Token analytics test failed:', error);
    process.exit(1);
  }
}

// Helper function to create a separator line
function repeat(char, count) {
  return new Array(count + 1).join(char);
}

// Run the test
testTokenAnalytics().catch(console.error);