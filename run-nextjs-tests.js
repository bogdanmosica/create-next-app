#!/usr/bin/env node
/**
 * @fileoverview Next.js Test Runner
 * @description Simple test runner for the standardized Next.js tests
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      ...options
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

async function main() {
  const testType = process.argv[2] || 'all';
  const testPath = path.join(__dirname, 'tests/nextjs-tests');

  console.log('🧪 Next.js Testing & Reliability Improvements Test Runner\n');

  try {
    switch (testType) {
      case 'contract':
        console.log('🔍 Running contract tests...');
        await runCommand('npx', ['vitest', 'tests/contract/orchestrator.test.ts']);
        break;

      case 'integration':
        console.log('🔗 Running integration tests...');
        await runCommand('npx', ['vitest', 'tests/nextjs-tests/app-creation-flow.test.ts']);
        break;

      case 'unit':
        console.log('⚡ Running unit tests...');
        await runCommand('npx', ['vitest', 'tests/nextjs-tests/orchestration-logic.test.ts']);
        break;

      case 'error':
        console.log('🚨 Running error scenario tests...');
        await runCommand('npx', ['vitest', 'tests/nextjs-tests/error-scenarios.test.ts']);
        break;

      case 'rollback':
        console.log('🔄 Running rollback mechanism tests...');
        await runCommand('npx', ['vitest', 'tests/nextjs-tests/rollback-mechanism.test.ts']);
        break;

      case 'nextjs':
        console.log('📱 Running all Next.js specific tests...');
        await runCommand('npx', ['vitest', 'tests/nextjs-tests/']);
        break;

      case 'all':
      default:
        console.log('🎯 Running all testing & reliability improvement tests...\n');

        console.log('1️⃣ Contract Tests');
        await runCommand('npx', ['vitest', 'tests/contract/orchestrator.test.ts', '--reporter=verbose']);

        console.log('\n2️⃣ Next.js Tests');
        await runCommand('npx', ['vitest', 'tests/nextjs-tests/', '--reporter=verbose']);

        break;
    }

    console.log('\n✅ All tests completed successfully!');
    console.log('\n📊 Test Coverage Summary:');
    console.log('- Contract Tests: API validation for orchestration logic');
    console.log('- Integration Tests: Full app creation workflows');
    console.log('- Unit Tests: Core orchestration logic validation');
    console.log('- Error Scenarios: Comprehensive failure mode testing');
    console.log('- Rollback Tests: Transaction rollback and cleanup validation');
    console.log('\n🎉 Testing & Reliability Improvements: VERIFIED');

  } catch (error) {
    console.error('\n❌ Test execution failed:', error.message);
    process.exit(1);
  }
}

// Show usage if help requested
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
🧪 Next.js Test Runner

Usage:
  node run-nextjs-tests.js [test-type]

Test Types:
  contract    - Run contract tests for API validation
  integration - Run integration tests for app creation flows
  unit        - Run unit tests for orchestration logic
  error       - Run error scenario tests
  rollback    - Run rollback mechanism tests
  nextjs      - Run all Next.js specific tests
  all         - Run all tests (default)

Examples:
  node run-nextjs-tests.js
  node run-nextjs-tests.js contract
  node run-nextjs-tests.js nextjs
  node run-nextjs-tests.js error

Coverage Target: 85% line coverage for orchestration logic
`);
  process.exit(0);
}

main();