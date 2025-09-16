# Troubleshooting Guide

> Comprehensive troubleshooting guide for common issues in the Next.js MCP Server project

## Table of Contents
- [Quick Diagnosis](#quick-diagnosis)
- [Test Failures](#test-failures)
- [Environment Issues](#environment-issues)
- [Performance Problems](#performance-problems)
- [Build & Deployment Issues](#build--deployment-issues)
- [Tool-Specific Issues](#tool-specific-issues)
- [Platform-Specific Issues](#platform-specific-issues)
- [Advanced Debugging](#advanced-debugging)

## Quick Diagnosis

### 🔍 First Steps Checklist
Before diving into specific issues, run through this quick checklist:

```bash
# 1. Check environment
node --version    # Should be 18+
npm --version     # Should be 8+

# 2. Clean install
rm -rf node_modules package-lock.json
npm install

# 3. Run basic tests
npm run test:unit
npm run test:integration

# 4. Check configuration
npm run lint
npm run type-check
```

### ⚡ Quick Fixes for Common Issues

| Issue | Quick Fix |
|-------|-----------|
| Tests timing out | Increase timeout: `VITEST_TIMEOUT=60000 npm test` |
| Module not found | `npm install` and check imports |
| Permission errors | Run with appropriate permissions or check file ownership |
| Port conflicts | Kill processes: `npx kill-port 3000` |
| Cache issues | Clear cache: `npm run clean` |

## Test Failures

### 🧪 Unit Test Failures

#### Import/Module Errors
```
Error: Cannot find module '../core/tool-orchestrator'
```

**Solution:**
```bash
# Check file paths and imports
npm run lint:imports

# Verify TypeScript configuration
npm run type-check

# Clear module cache
npm run clean && npm install
```

#### Timeout Errors
```
Error: Test timeout of 5000ms exceeded
```

**Solution:**
```typescript
// Increase timeout for specific tests
it('should handle long operation', async () => {
  // test code
}, 30000); // 30 second timeout

// Or in vitest.config.ts
export default defineConfig({
  test: {
    testTimeout: 30000
  }
});
```

#### Mock Issues
```
Error: Cannot spy on a property that is not defined
```

**Solution:**
```typescript
// Ensure mocks are properly defined
vi.mock('fs-extra', () => ({
  writeFile: vi.fn(),
  readFile: vi.fn(),
  pathExists: vi.fn().mockResolvedValue(true)
}));

// Clear mocks between tests
afterEach(() => {
  vi.clearAllMocks();
});
```

### 🔗 Integration Test Failures

#### Database Connection Issues
```
Error: Connection refused to PostgreSQL
```

**Solution:**
```bash
# Check database status
docker ps | grep postgres

# Restart test database
npm run db:restart:test

# Check connection string
echo $DATABASE_URL

# Manual connection test
psql $DATABASE_URL -c "SELECT 1;"
```

#### API Response Failures
```
Error: Expected 200, received 500
```

**Solution:**
```typescript
// Add detailed error logging
it('should create project successfully', async () => {
  try {
    const response = await request(app)
      .post('/api/tools/create-nextjs-app')
      .send(testData);
      
    if (response.status !== 200) {
      console.error('Response body:', response.body);
      console.error('Response headers:', response.headers);
    }
    
    expect(response.status).toBe(200);
  } catch (error) {
    console.error('Test error:', error);
    throw error;
  }
});
```

### 🎭 E2E Test Failures

#### Browser Launch Issues
```
Error: Browser executable not found
```

**Solution:**
```bash
# Install browsers
npx playwright install

# Install system dependencies
npx playwright install-deps

# Check browser installation
npx playwright --version
```

#### Page Load Timeouts
```
Error: Page.goto: Timeout 30000ms exceeded
```

**Solution:**
```typescript
// Increase timeout
await page.goto(url, { timeout: 60000 });

// Wait for specific element
await page.waitForSelector('[data-testid="app-ready"]');

// Add retry mechanism
const maxRetries = 3;
for (let i = 0; i < maxRetries; i++) {
  try {
    await page.goto(url);
    break;
  } catch (error) {
    if (i === maxRetries - 1) throw error;
    await page.waitForTimeout(1000);
  }
}
```

#### Element Not Found
```
Error: Locator 'button[type="submit"]' not found
```

**Solution:**
```typescript
// Use more robust selectors
await page.click('[data-testid="submit-button"]');

// Wait for element to be visible
await page.waitForSelector('button[type="submit"]', { 
  state: 'visible',
  timeout: 10000 
});

// Check if element exists first
const element = await page.$('button[type="submit"]');
if (!element) {
  console.error('Submit button not found');
  await page.screenshot({ path: 'debug-screenshot.png' });
}
```

## Environment Issues

### 📦 Dependency Conflicts

#### Version Mismatches
```
Error: Package has unmet peer dependencies
```

**Solution:**
```bash
# Check dependency tree
npm ls

# Install peer dependencies
npm install --save-peer

# Force resolution (package.json)
{
  "overrides": {
    "problematic-package": "^1.0.0"
  }
}
```

#### Node.js Version Issues
```
Error: Unsupported engine node
```

**Solution:**
```bash
# Check current version
node --version

# Use correct version with nvm
nvm use 20
nvm alias default 20

# Update package.json engines
{
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=8.0.0"
  }
}
```

### 🔐 Environment Variables

#### Missing Environment Variables
```
Error: DATABASE_URL is not defined
```

**Solution:**
```bash
# Create .env.local file
cp .env.example .env.local

# Set required variables
echo "DATABASE_URL=postgresql://..." >> .env.local

# Verify variables are loaded
npm run env:check
```

#### Environment Variable Type Issues
```
Error: Expected string, received undefined
```

**Solution:**
```typescript
// Add proper validation
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  API_KEY: z.string().min(1),
  PORT: z.string().regex(/^\d+$/).transform(Number).default('3000')
});

const env = envSchema.parse(process.env);
```

### 🗄️ Database Issues

#### Migration Failures
```
Error: relation "users" does not exist
```

**Solution:**
```bash
# Reset database
npm run db:reset

# Run migrations manually
npm run db:migrate

# Check migration status
npm run db:status

# Seed test data
npm run db:seed:test
```

#### Connection Pool Exhaustion
```
Error: Connection pool exhausted
```

**Solution:**
```typescript
// Configure connection pool
const config = {
  connectionString: process.env.DATABASE_URL,
  max: 10, // Maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

// Ensure connections are closed
afterEach(async () => {
  await db.destroy();
});
```

## Performance Problems

### 🐌 Slow Test Execution

#### Test Suite Takes Too Long
```
Test suite completed in 45.2s (very slow)
```

**Solution:**
```typescript
// Run tests in parallel
export default defineConfig({
  test: {
    maxConcurrency: 4,
    pool: 'threads'
  }
});

// Optimize test data
const createTestData = () => ({
  // Minimal required data only
  name: 'test',
  type: 'basic'
});

// Skip slow tests in development
const skipSlow = process.env.SKIP_SLOW_TESTS === 'true';
describe.skipIf(skipSlow)('Slow integration tests', () => {
  // tests
});
```

#### Memory Leaks in Tests
```
Error: JavaScript heap out of memory
```

**Solution:**
```typescript
// Clean up resources
afterEach(async () => {
  // Close connections
  await db.close();
  
  // Clear large objects
  largeTestData = null;
  
  // Force garbage collection (in tests)
  if (global.gc) global.gc();
});

// Increase memory limit
NODE_OPTIONS="--max-old-space-size=4096" npm test
```

### ⚡ Application Performance Issues

#### Project Generation is Slow
```
Template generation taking >30 seconds
```

**Solution:**
```typescript
// Optimize file operations
import pLimit from 'p-limit';

const limit = pLimit(5); // Limit concurrent operations

const fileOperations = files.map(file => 
  limit(() => writeFile(file.path, file.content))
);

await Promise.all(fileOperations);

// Use streaming for large files
import { pipeline } from 'stream/promises';

await pipeline(
  createReadStream(source),
  createWriteStream(destination)
);
```

## Build & Deployment Issues

### 🏗️ Build Failures

#### TypeScript Compilation Errors
```
Error: Type 'unknown' is not assignable to type 'string'
```

**Solution:**
```typescript
// Add proper type guards
function isString(value: unknown): value is string {
  return typeof value === 'string';
}

if (isString(userInput)) {
  // Now TypeScript knows userInput is string
  console.log(userInput.toUpperCase());
}

// Use assertion with validation
import { z } from 'zod';

const userSchema = z.object({
  name: z.string(),
  email: z.string().email()
});

const user = userSchema.parse(unknownData);
```

#### Module Resolution Issues
```
Error: Cannot resolve module '@/components/ui/button'
```

**Solution:**
```json
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"]
    }
  }
}

// Verify paths are correct
npm run type-check -- --listFiles
```

### 🚀 Deployment Issues

#### Package Publishing Failures
```
Error: npm publish failed with exit code 1
```

**Solution:**
```bash
# Check authentication
npm whoami

# Login if needed
npm login

# Check package.json
npm pack --dry-run

# Verify files to be published
cat .npmignore

# Manual publish with verbose output
npm publish --verbose
```

#### Docker Build Issues
```
Error: Docker build failed
```

**Solution:**
```dockerfile
# Multi-stage build for optimization
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Check build logs
docker build --progress=plain .
```

## Tool-Specific Issues

### 🛠️ TransactionalOrchestrator Issues

#### Rollback Failures
```
Error: Rollback operation failed
```

**Solution:**
```typescript
// Add comprehensive error handling
class TransactionalOrchestrator {
  async executeWithRollback(operations: Operation[]) {
    const completedOps: CompletedOperation[] = [];
    
    try {
      for (const op of operations) {
        const result = await this.executeOperation(op);
        completedOps.push({ operation: op, result });
      }
      return { success: true, operations: completedOps };
    } catch (error) {
      console.error('Operation failed, starting rollback:', error);
      
      // Rollback in reverse order
      for (const completedOp of completedOps.reverse()) {
        try {
          await this.rollbackOperation(completedOp);
        } catch (rollbackError) {
          console.error('Rollback failed:', rollbackError);
          // Continue with other rollbacks
        }
      }
      
      throw new Error(`Operation failed: ${error.message}`);
    }
  }
}
```

#### Dependency Resolution Issues
```
Error: Circular dependency detected
```

**Solution:**
```typescript
// Implement topological sorting
class DependencyResolver {
  resolveDependencies(operations: Operation[]): Operation[] {
    const graph = this.buildDependencyGraph(operations);
    const sorted = this.topologicalSort(graph);
    
    if (!sorted) {
      throw new Error('Circular dependency detected in operations');
    }
    
    return sorted;
  }
  
  private topologicalSort(graph: Map<string, string[]>): Operation[] | null {
    // Kahn's algorithm implementation
    const inDegree = new Map<string, number>();
    const result: Operation[] = [];
    
    // Calculate in-degrees
    for (const [node, dependencies] of graph) {
      inDegree.set(node, dependencies.length);
    }
    
    // Process nodes with no dependencies
    const queue = Array.from(inDegree.entries())
      .filter(([_, degree]) => degree === 0)
      .map(([node]) => node);
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      result.push(current);
      
      // Update dependencies
      for (const [node, deps] of graph) {
        if (deps.includes(current)) {
          const newDegree = inDegree.get(node)! - 1;
          inDegree.set(node, newDegree);
          
          if (newDegree === 0) {
            queue.push(node);
          }
        }
      }
    }
    
    return result.length === graph.size ? result : null;
  }
}
```

### 🎯 ToolOrchestrator Issues

#### Tool Registration Failures
```
Error: Tool 'create-nextjs-app' already registered
```

**Solution:**
```typescript
// Add proper tool management
class ToolRegistry {
  private tools = new Map<string, ToolFunction>();
  
  register(tool: ToolFunction, { overwrite = false } = {}) {
    if (this.tools.has(tool.name) && !overwrite) {
      throw new Error(`Tool '${tool.name}' is already registered. Use overwrite: true to replace.`);
    }
    
    this.tools.set(tool.name, tool);
  }
  
  unregister(toolName: string): boolean {
    return this.tools.delete(toolName);
  }
  
  list(): string[] {
    return Array.from(this.tools.keys());
  }
}
```

## Platform-Specific Issues

### 🪟 Windows Issues

#### Path Separator Problems
```
Error: ENOENT: no such file or directory 'src\components\ui\button.tsx'
```

**Solution:**
```typescript
import path from 'path';

// Always use path.join()
const filePath = path.join('src', 'components', 'ui', 'button.tsx');

// Normalize paths
const normalizedPath = path.normalize(userProvidedPath);

// Convert to forward slashes for consistency
const posixPath = filePath.replace(/\\/g, '/');
```

#### Permission Issues
```
Error: EPERM: operation not permitted
```

**Solution:**
```bash
# Run as administrator (if needed)
# Or set proper permissions

# In code, handle permission errors
try {
  await fs.writeFile(filePath, content);
} catch (error) {
  if (error.code === 'EPERM') {
    console.error('Permission denied. Try running as administrator.');
    process.exit(1);
  }
  throw error;
}
```

### 🐧 Linux/Unix Issues

#### File Permissions
```
Error: EACCES: permission denied
```

**Solution:**
```bash
# Set proper permissions
chmod +x scripts/generate-coverage-reports.ts

# Check file ownership
ls -la package.json

# Fix ownership if needed
sudo chown -R $USER:$USER node_modules
```

### 🍎 macOS Issues

#### Gatekeeper Issues
```
Error: "node" cannot be opened because the developer cannot be verified
```

**Solution:**
```bash
# Allow app in System Preferences > Security & Privacy
# Or bypass for development
sudo spctl --master-disable

# Re-enable after development
sudo spctl --master-enable
```

## Advanced Debugging

### 🔍 Debug Mode

#### Enable Comprehensive Debugging
```bash
# Environment variables for debugging
export DEBUG=*
export NODE_OPTIONS="--inspect=0.0.0.0:9229"
export VITEST_DEBUG=true

# Run tests with debugging
npm run test:debug

# Connect debugger (VS Code)
# Add to .vscode/launch.json:
{
  "type": "node",
  "request": "attach",
  "name": "Debug Tests",
  "port": 9229,
  "restart": true
}
```

#### Test-Specific Debugging
```typescript
// Add debug logging to tests
import debug from 'debug';
const log = debug('test:integration');

it('should create project', async () => {
  log('Starting project creation test');
  
  const config = { /* test config */ };
  log('Test config:', config);
  
  const result = await createProject(config);
  log('Creation result:', result);
  
  expect(result.success).toBe(true);
});

// Enable for specific test file
DEBUG=test:integration npm test integration-test.test.ts
```

### 📊 Performance Profiling

#### Profile Test Performance
```typescript
// Add performance markers
performance.mark('test-start');

// Test code here

performance.mark('test-end');
performance.measure('test-duration', 'test-start', 'test-end');

const measurements = performance.getEntriesByType('measure');
console.log('Test duration:', measurements[0].duration, 'ms');
```

#### Memory Usage Monitoring
```typescript
// Monitor memory usage
const formatBytes = (bytes: number) => {
  return Math.round(bytes / 1024 / 1024 * 100) / 100 + ' MB';
};

beforeEach(() => {
  const usage = process.memoryUsage();
  console.log('Memory before test:', {
    rss: formatBytes(usage.rss),
    heapUsed: formatBytes(usage.heapUsed),
    heapTotal: formatBytes(usage.heapTotal)
  });
});

afterEach(() => {
  const usage = process.memoryUsage();
  console.log('Memory after test:', {
    rss: formatBytes(usage.rss),
    heapUsed: formatBytes(usage.heapUsed),
    heapTotal: formatBytes(usage.heapTotal)
  });
});
```

### 🔧 Custom Debug Utilities

#### Debug Helper Functions
```typescript
// Create debug utilities
export class DebugUtils {
  static async captureState(label: string) {
    const state = {
      timestamp: new Date().toISOString(),
      memory: process.memoryUsage(),
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        cwd: process.cwd()
      },
      openHandles: process._getActiveHandles().length,
      openRequests: process._getActiveRequests().length
    };
    
    console.log(`[DEBUG ${label}]`, JSON.stringify(state, null, 2));
    return state;
  }
  
  static async dumpLogs(testName: string) {
    const logDir = path.join(process.cwd(), 'debug-logs');
    await fs.ensureDir(logDir);
    
    const logFile = path.join(logDir, `${testName}-${Date.now()}.log`);
    const logs = console.history || ['No console history available'];
    
    await fs.writeFile(logFile, logs.join('\n'));
    console.log(`Debug logs written to: ${logFile}`);
  }
}

// Use in tests
beforeEach(async () => {
  await DebugUtils.captureState('test-start');
});

afterEach(async () => {
  await DebugUtils.captureState('test-end');
  
  if (currentTest.failed) {
    await DebugUtils.dumpLogs(currentTest.name);
  }
});
```

## Getting Help

### 📞 Support Channels

1. **GitHub Issues**: For bugs and feature requests
2. **Discussions**: For questions and community support
3. **Discord/Slack**: For real-time help (if available)
4. **Documentation**: Check docs/ folder for detailed guides

### 📝 Reporting Issues

When reporting issues, include:

1. **Environment Information**:
   ```bash
   node --version
   npm --version
   npm ls | head -20
   ```

2. **Error Messages**: Full stack traces and error output

3. **Reproduction Steps**: Minimal steps to reproduce the issue

4. **Expected vs Actual Behavior**: What should happen vs what actually happens

5. **Configuration**: Relevant config files and environment variables

### 🔍 Self-Help Resources

- **Error Logs**: Check `logs/` directory for detailed error information
- **Test Reports**: Review test output in `test-results/` directory
- **Coverage Reports**: Check `coverage/` for code coverage insights
- **Performance Metrics**: Review `performance-results/` for bottlenecks

---

**Remember**: Most issues have simple solutions. Start with the basics (clean install, environment check) before diving into complex debugging.