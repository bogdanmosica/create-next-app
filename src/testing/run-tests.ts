#!/usr/bin/env node

/**
 * @fileoverview MCP Test CLI
 * @description Command line interface for running MCP tool tests
 */

import { MCPTestRunner } from './test-runner.js';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'run';

  switch (command) {
    case 'run':
      await runTests();
      break;
    case 'cleanup':
      await cleanupTests();
      break;
    case 'help':
      showHelp();
      break;
    default:
      console.error(`❌ Unknown command: ${command}`);
      showHelp();
      process.exit(1);
  }
}

async function runTests() {
  console.log('🚀 Starting MCP Tool Testing...\n');
  
  const runner = new MCPTestRunner();
  
  try {
    const results = await runner.runAllTests();
    
    const failedTests = results.filter(r => !r.success);
    if (failedTests.length > 0) {
      console.log(`\n⚠️  Some tests failed. Check the test output above for details.`);
      process.exit(1);
    } else {
      console.log(`\n🎉 All tests passed! MCP tools are working correctly.`);
    }
  } catch (error) {
    console.error(`💥 Test execution failed:`, error);
    process.exit(1);
  }
}

async function cleanupTests() {
  console.log('🧹 Cleaning up test projects...');
  
  const runner = new MCPTestRunner();
  await runner.cleanupTestProjects();
  
  console.log('✅ Cleanup complete!');
}

function showHelp() {
  console.log(`
🧪 MCP Tool Testing CLI

Usage: tsx src/testing/run-tests.ts [command]

Commands:
  run     Run all MCP tool tests (default)
  cleanup Clean up test projects directory
  help    Show this help message

Examples:
  tsx src/testing/run-tests.ts run
  tsx src/testing/run-tests.ts cleanup

The test runner will:
1. Create real Next.js projects using MCP tools
2. Validate that all expected files and packages are created
3. Run integration tests between different tools
4. Generate a comprehensive test report

Test projects are created in 'next_test_projects/' directory.
You can inspect these projects manually after testing.
  `);
}

main().catch(console.error);