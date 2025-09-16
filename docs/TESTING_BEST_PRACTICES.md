# Testing Best Practices Guide

> Comprehensive guide for writing and maintaining high-quality tests in the Next.js MCP Server project

## Table of Contents
- [Testing Philosophy](#testing-philosophy)
- [Test Structure](#test-structure)
- [Test Types](#test-types)
- [Best Practices](#best-practices)
- [Common Patterns](#common-patterns)
- [Performance Guidelines](#performance-guidelines)
- [Error Handling](#error-handling)
- [Debugging Tests](#debugging-tests)

## Testing Philosophy

### Core Principles
1. **Test Behavior, Not Implementation** - Focus on what the code does, not how it does it
2. **Fast Feedback Loop** - Tests should run quickly to enable rapid development
3. **Reliable & Deterministic** - Tests should produce consistent results across environments
4. **Maintainable** - Tests should be easy to understand and modify
5. **Comprehensive Coverage** - Critical paths must be thoroughly tested

### Testing Pyramid
```
    🔺 E2E Tests (Few)
     - User journeys
     - Critical workflows
     - Integration validation

   🔺🔺 Integration Tests (Some)
     - Component interactions
     - External dependencies
     - API contracts

  🔺🔺🔺 Unit Tests (Many)
     - Individual functions
     - Business logic
     - Edge cases
```

## Test Structure

### Standard Test Structure (AAA Pattern)
```typescript
describe('Component/Feature Name', () => {
  // Arrange - Setup
  beforeEach(() => {
    // Common setup
  });

  afterEach(() => {
    // Cleanup
  });

  it('should [expected behavior] when [condition]', () => {
    // Arrange - Test-specific setup
    const input = createTestInput();
    
    // Act - Execute the behavior
    const result = functionUnderTest(input);
    
    // Assert - Verify expectations
    expect(result).toEqual(expectedOutput);
  });
});
```

### File Naming Conventions
```
src/
├── core/
│   ├── tool-orchestrator.ts
│   └── __tests__/
│       └── tool-orchestrator.test.ts
tests/
├── unit/
│   └── tool-orchestrator.test.ts
├── integration/
│   └── tool-orchestrator.integration.test.ts
├── contract/
│   └── tool-orchestrator.contract.test.ts
└── e2e/
    └── tool-orchestrator.e2e.spec.ts
```

## Test Types

### 1. Unit Tests
**Purpose**: Test individual functions/methods in isolation

```typescript
import { validateProjectPath } from '../utils/validation';

describe('validateProjectPath', () => {
  it('should return true for valid absolute paths', () => {
    const validPaths = [
      '/home/user/project',
      'C:\\Users\\user\\project',
      '/var/www/html'
    ];

    validPaths.forEach(path => {
      expect(validateProjectPath(path)).toBe(true);
    });
  });

  it('should return false for invalid paths', () => {
    const invalidPaths = [
      '',
      null,
      undefined,
      'relative/path',
      '../../../etc/passwd'
    ];

    invalidPaths.forEach(path => {
      expect(validateProjectPath(path)).toBe(false);
    });
  });
});
```

### 2. Integration Tests
**Purpose**: Test component interactions and workflows

```typescript
import { TransactionalOrchestrator } from '../core/transactional-orchestrator';
import { ToolOrchestrator } from '../core/tool-orchestrator';

describe('TransactionalOrchestrator Integration', () => {
  let orchestrator: TransactionalOrchestrator;
  let toolOrchestrator: ToolOrchestrator;

  beforeEach(() => {
    toolOrchestrator = new ToolOrchestrator();
    orchestrator = new TransactionalOrchestrator(toolOrchestrator);
  });

  it('should successfully execute and commit a complete workflow', async () => {
    const projectPath = '/tmp/test-project';
    const features = ['core', 'authentication'];

    const result = await orchestrator.executeWorkflow({
      projectPath,
      features,
      rollbackOnError: true
    });

    expect(result.success).toBe(true);
    expect(result.steps).toHaveLength(2);
    expect(result.rollbacks).toHaveLength(0);
  });
});
```

### 3. Contract Tests
**Purpose**: Verify API contracts and interfaces

```typescript
import { NextJSAppCreator } from '../tools/nextjs-app-creator';

describe('NextJSAppCreator Contract', () => {
  let creator: NextJSAppCreator;

  beforeEach(() => {
    creator = new NextJSAppCreator();
  });

  it('should implement required ToolFunction interface', () => {
    expect(creator).toHaveProperty('name');
    expect(creator).toHaveProperty('description');
    expect(creator).toHaveProperty('inputSchema');
    expect(creator).toHaveProperty('handler');
    
    expect(typeof creator.handler).toBe('function');
  });

  it('should validate input according to schema', async () => {
    const invalidInput = { projectPath: '' };
    
    await expect(creator.handler(invalidInput)).rejects.toThrow();
  });
});
```

### 4. E2E Tests
**Purpose**: Test complete user workflows

```typescript
import { test, expect } from '@playwright/test';

test.describe('Next.js App Creation Flow', () => {
  test('should create a complete SaaS application', async ({ page }) => {
    // Navigate to MCP server endpoint
    await page.goto('/api/mcp');

    // Send create app request
    const response = await page.request.post('/api/tools/create-nextjs-app', {
      data: {
        projectPath: '/tmp/test-saas-app',
        preset: 'startup'
      }
    });

    // Verify success response
    expect(response.status()).toBe(200);
    
    const result = await response.json();
    expect(result.success).toBe(true);
    expect(result.filesCreated).toBeGreaterThan(50);
  });
});
```

## Best Practices

### 1. Test Naming
```typescript
// ✅ Good - Descriptive and specific
it('should throw ValidationError when projectPath is empty string', () => {});
it('should create package.json with correct dependencies for startup preset', () => {});
it('should rollback all changes when authentication setup fails', () => {});

// ❌ Bad - Vague or implementation-focused
it('should work', () => {});
it('should call createFile method', () => {});
it('should not throw', () => {});
```

### 2. Test Data Management
```typescript
// ✅ Good - Use factories and builders
const createTestProject = (overrides = {}) => ({
  projectPath: '/tmp/test-project',
  preset: 'minimal',
  features: ['core'],
  ...overrides
});

const createMockFileSystem = () => ({
  writeFile: vi.fn(),
  readFile: vi.fn(),
  pathExists: vi.fn().mockResolvedValue(false)
});

// ✅ Good - Use realistic test data
const samplePackageJson = {
  name: 'test-nextjs-app',
  version: '0.1.0',
  private: true,
  scripts: {
    dev: 'next dev',
    build: 'next build'
  }
};
```

### 3. Mocking Guidelines
```typescript
// ✅ Good - Mock external dependencies
vi.mock('fs-extra', () => ({
  writeFile: vi.fn(),
  readFile: vi.fn(),
  pathExists: vi.fn(),
  ensureDir: vi.fn()
}));

// ✅ Good - Mock at the boundary
vi.mock('../utils/file-operations', () => ({
  createProjectStructure: vi.fn().mockResolvedValue(true)
}));

// ❌ Bad - Avoid mocking internal business logic
vi.mock('../core/transactional-orchestrator'); // Don't mock what you're testing
```

### 4. Assertion Best Practices
```typescript
// ✅ Good - Specific assertions
expect(result.filesCreated).toEqual([
  'package.json',
  'next.config.ts',
  'tailwind.config.ts'
]);

expect(packageJson.dependencies).toMatchObject({
  'next': '^15.0.0',
  'react': '^18.0.0'
});

// ✅ Good - Multiple specific assertions
expect(response.status).toBe(201);
expect(response.body.success).toBe(true);
expect(response.body.projectPath).toBe('/tmp/test-project');

// ❌ Bad - Overly broad assertions
expect(result).toBeTruthy();
expect(result).toMatchSnapshot(); // Use sparingly
```

### 5. Async Test Handling
```typescript
// ✅ Good - Proper async/await
it('should create project files asynchronously', async () => {
  const result = await createNextJSApp(config);
  expect(result.success).toBe(true);
});

// ✅ Good - Handle promises properly
it('should reject with validation error', async () => {
  await expect(createNextJSApp(invalidConfig))
    .rejects
    .toThrow('Invalid project path');
});

// ❌ Bad - Missing await
it('should create project files', () => {
  const result = createNextJSApp(config); // Promise not awaited
  expect(result.success).toBe(true); // Will fail
});
```

## Common Patterns

### 1. Test Setup and Teardown
```typescript
describe('FileOperations', () => {
  let tempDir: string;
  let mockFs: MockFileSystem;

  beforeAll(async () => {
    // One-time setup for all tests
    tempDir = await createTempDirectory();
  });

  afterAll(async () => {
    // One-time cleanup
    await cleanupTempDirectory(tempDir);
  });

  beforeEach(() => {
    // Setup for each test
    mockFs = createMockFileSystem();
  });

  afterEach(() => {
    // Cleanup after each test
    vi.clearAllMocks();
  });
});
```

### 2. Parameterized Tests
```typescript
describe('validatePreset', () => {
  it.each([
    ['minimal', true],
    ['blog', true],
    ['dashboard', true],
    ['startup', true],
    ['enterprise', true],
    ['invalid', false],
    ['', false],
    [null, false]
  ])('should return %s for preset "%s"', (preset, expected) => {
    expect(validatePreset(preset)).toBe(expected);
  });
});
```

### 3. Error Testing Patterns
```typescript
describe('Error Handling', () => {
  it('should throw specific error for invalid input', () => {
    expect(() => {
      validateProjectPath('');
    }).toThrow('Project path cannot be empty');
  });

  it('should handle async errors gracefully', async () => {
    const mockFs = { writeFile: vi.fn().mockRejectedValue(new Error('Permission denied')) };
    
    await expect(
      createProjectFile('/readonly/path', 'content', mockFs)
    ).rejects.toThrow('Permission denied');
  });
});
```

### 4. Conditional Testing
```typescript
describe('Platform-specific tests', () => {
  it.skipIf(process.platform === 'win32')('should handle Unix paths', () => {
    expect(normalizePath('/home/user/project')).toBe('/home/user/project');
  });

  it.runIf(process.platform === 'win32')('should handle Windows paths', () => {
    expect(normalizePath('C:\\Users\\user\\project')).toBe('C:/Users/user/project');
  });
});
```

## Performance Guidelines

### 1. Test Execution Speed
```typescript
// ✅ Good - Fast unit tests
describe('Pure functions', () => {
  it('should validate input quickly', () => {
    const start = performance.now();
    const result = validateInput(testData);
    const duration = performance.now() - start;
    
    expect(result).toBe(true);
    expect(duration).toBeLessThan(1); // Less than 1ms
  });
});

// ⚠️ Acceptable - Slower integration tests
describe('File operations', () => {
  it('should create files within reasonable time', async () => {
    const start = performance.now();
    await createProjectStructure(projectPath);
    const duration = performance.now() - start;
    
    expect(duration).toBeLessThan(5000); // Less than 5 seconds
  });
});
```

### 2. Resource Management
```typescript
// ✅ Good - Clean up resources
afterEach(async () => {
  // Clean up temp files
  await fs.remove(tempProjectPath);
  
  // Clear mocks
  vi.clearAllMocks();
  
  // Reset environment
  process.env = originalEnv;
});
```

### 3. Parallel Test Execution
```typescript
// ✅ Good - Isolated tests can run in parallel
describe.concurrent('Independent validations', () => {
  it('should validate email format', () => {
    expect(validateEmail('test@example.com')).toBe(true);
  });

  it('should validate phone format', () => {
    expect(validatePhone('+1234567890')).toBe(true);
  });
});

// ❌ Bad - Shared state prevents parallelization
describe('Shared state tests', () => {
  let sharedCounter = 0;

  it('should increment counter', () => {
    sharedCounter++;
    expect(sharedCounter).toBe(1);
  });

  it('should increment counter again', () => {
    sharedCounter++;
    expect(sharedCounter).toBe(2); // Will fail in parallel execution
  });
});
```

## Error Handling

### 1. Test Error Scenarios
```typescript
describe('Error scenarios', () => {
  it('should handle file system errors gracefully', async () => {
    const mockFs = {
      writeFile: vi.fn().mockRejectedValue(new Error('ENOSPC: no space left on device'))
    };

    const result = await createNextJSApp(config, mockFs);
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('no space left');
    expect(result.rollback).toBe(true);
  });

  it('should validate all input parameters', () => {
    const invalidInputs = [
      { projectPath: '' },
      { projectPath: null },
      { projectPath: '/valid/path', preset: 'invalid' },
      { projectPath: '/valid/path', features: null }
    ];

    invalidInputs.forEach(input => {
      expect(() => validateInput(input)).toThrow();
    });
  });
});
```

### 2. Timeout Handling
```typescript
describe('Long-running operations', () => {
  it('should timeout for operations that take too long', async () => {
    const slowOperation = () => new Promise(resolve => setTimeout(resolve, 10000));
    
    await expect(
      Promise.race([
        slowOperation(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
      ])
    ).rejects.toThrow('Timeout');
  }, 6000); // Test timeout of 6 seconds
});
```

## Debugging Tests

### 1. Debugging Strategies
```typescript
// ✅ Good - Use descriptive console logs
it('should process complex data structure', () => {
  const input = createComplexTestData();
  console.log('Test input:', JSON.stringify(input, null, 2));
  
  const result = processData(input);
  console.log('Test result:', JSON.stringify(result, null, 2));
  
  expect(result.status).toBe('success');
});

// ✅ Good - Add debug information to assertions
it('should calculate correct totals', () => {
  const items = [{ price: 10 }, { price: 20 }, { price: 30 }];
  const total = calculateTotal(items);
  
  expect(total).toBe(60, `Expected 60, got ${total} for items: ${JSON.stringify(items)}`);
});
```

### 2. Test Isolation Debugging
```typescript
// ✅ Good - Test isolation helpers
describe('Isolated test debugging', () => {
  beforeEach(() => {
    // Reset all environment variables
    process.env = { ...originalEnv };
    
    // Clear all modules from cache
    vi.resetModules();
    
    // Reset all mocks
    vi.clearAllMocks();
  });
});
```

### 3. Snapshot Debugging
```typescript
// ✅ Good - Use snapshots for complex objects (sparingly)
it('should generate expected project structure', () => {
  const structure = generateProjectStructure('startup');
  
  // Update snapshot when intentionally changing structure
  expect(structure).toMatchSnapshot();
  
  // Also add specific assertions for critical parts
  expect(structure.files).toContain('package.json');
  expect(structure.dependencies).toHaveProperty('next');
});
```

## Coverage and Quality Metrics

### 1. Coverage Targets
- **Unit Tests**: 95% line coverage minimum
- **Integration Tests**: 90% line coverage minimum
- **Critical Functions**: 100% branch coverage
- **Error Paths**: 85% coverage minimum

### 2. Quality Indicators
```typescript
// ✅ Good - Test quality metrics
describe('Quality metrics', () => {
  it('should have test for every public method', () => {
    const publicMethods = Object.getOwnPropertyNames(ToolOrchestrator.prototype)
      .filter(name => !name.startsWith('_') && typeof ToolOrchestrator.prototype[name] === 'function');
    
    // Ensure every public method has a test
    publicMethods.forEach(method => {
      expect(testSuite).toHaveTest(method);
    });
  });
});
```

### 3. Documentation Coverage
```typescript
// ✅ Good - Verify documentation exists
it('should have JSDoc comments for all public functions', () => {
  const sourceCode = fs.readFileSync('./src/core/tool-orchestrator.ts', 'utf-8');
  const publicFunctions = extractPublicFunctions(sourceCode);
  
  publicFunctions.forEach(func => {
    expect(func.hasJSDoc).toBe(true);
    expect(func.hasParamDocs).toBe(true);
    expect(func.hasReturnDoc).toBe(true);
  });
});
```

---

## Quick Reference

### Essential Commands
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm run test -- tool-orchestrator.test.ts

# Run tests in watch mode
npm run test:watch

# Debug tests
npm run test:debug

# Generate coverage report
npm run coverage:generate
```

### Common Assertions
```typescript
// Boolean checks
expect(value).toBe(true);
expect(value).toBeTruthy();
expect(value).toBeFalsy();

// Equality checks
expect(value).toBe(expected);           // Strict equality
expect(value).toEqual(expected);        // Deep equality
expect(value).toStrictEqual(expected);  // Strict deep equality

// Async checks
await expect(promise).resolves.toBe(value);
await expect(promise).rejects.toThrow(error);

// Array/Object checks
expect(array).toHaveLength(3);
expect(array).toContain(item);
expect(object).toHaveProperty('key');
expect(object).toMatchObject(partial);

// Function checks
expect(fn).toHaveBeenCalled();
expect(fn).toHaveBeenCalledWith(arg1, arg2);
expect(fn).toHaveBeenCalledTimes(2);
```

### Test Organization
```
tests/
├── __helpers__/          # Test utilities and helpers
├── __fixtures__/         # Test data and fixtures
├── unit/                 # Unit tests
├── integration/          # Integration tests
├── contract/             # Contract tests
├── e2e/                  # End-to-end tests
├── performance/          # Performance tests
└── accessibility/        # Accessibility tests
```

This guide serves as the foundation for maintaining high-quality, reliable tests across the Next.js MCP Server project.