# MCP Tool Testing System

This directory contains a comprehensive testing system for the Next.js MCP tools. The tests work by actually creating real Next.js projects using the MCP tools and validating the results.

## Overview

The testing system validates that:
- ✅ All MCP tools execute successfully
- ✅ Generated files and directories are created correctly
- ✅ Required packages are installed
- ✅ Projects have proper structure and configuration
- ✅ TypeScript compiles without errors
- ✅ Tool combinations work together seamlessly

## Quick Start

```bash
# Install testing dependency
pnpm add -D tsx

# Run all tests
pnpm test

# Clean up test projects
pnpm test:cleanup

# Show help
pnpm test:help
```

## Test Cases

The testing system includes these comprehensive test scenarios:

### 1. Basic Next.js Setup
- **Tools**: `create_nextjs_base`
- **Validates**: Core Next.js project with shadcn/ui components
- **Expected**: package.json, Next.js config, Tailwind, UI components

### 2. Core Tools Setup  
- **Tools**: `create_nextjs_base` + `setup_biome_linting` + `setup_vscode_config`
- **Validates**: Development environment setup
- **Expected**: Biome config, VSCode settings, linting rules

### 3. Database Integration
- **Tools**: Drizzle ORM + environment variables
- **Validates**: Database setup with type-safe configuration
- **Expected**: Drizzle config, models, environment validation

### 4. Authentication System
- **Tools**: JWT auth + protected routes
- **Validates**: Complete authentication flow
- **Expected**: Session management, middleware, auth components

### 5. Stripe Payments
- **Tools**: Stripe payments + webhooks
- **Validates**: Payment processing integration
- **Expected**: Payment components, webhook handlers, Stripe config

### 6. Team Management System
- **Tools**: Multi-tenant team management
- **Validates**: Team/member management with roles
- **Expected**: Team models, permissions, UI components

### 7. Advanced Form Handling
- **Tools**: React Hook Form + Zod + React Query
- **Validates**: Modern form management system
- **Expected**: Form components, validation schemas, query integration

### 8. Complete SaaS Application
- **Tools**: All major tools combined
- **Validates**: Full SaaS application setup
- **Expected**: All features working together seamlessly

## File Structure

```
src/testing/
├── README.md              # This documentation
├── test-runner.ts          # Main test execution engine
├── run-tests.ts           # CLI interface for running tests
└── test-utils.ts          # Helper functions for validation
```

## How Tests Work

1. **Project Creation**: Each test creates a real Next.js project in `next_test_projects/`
2. **Tool Execution**: Runs the specified MCP tools in sequence
3. **File Validation**: Checks that expected files and directories are created
4. **Package Validation**: Verifies required npm packages are installed
5. **Structure Validation**: Ensures proper Next.js project structure
6. **Integration Checks**: Custom validation logic for complex scenarios

## Test Output

The test runner provides detailed output:

```
🧪 Starting MCP Tool Testing Suite
📁 Test directory: D:\...\next_test_projects

🔬 Running test: Basic Next.js Setup
✅ Basic Next.js Setup - PASSED (12.34s)

🔬 Running test: Core Tools Setup  
✅ Core Tools Setup - PASSED (8.76s)

...

📊 MCP TOOL TESTING SUMMARY
============================================================
📋 Total Tests: 8
✅ Passed: 8
❌ Failed: 0
⏱️  Total Duration: 67.89s
📁 Test Directory: D:\...\next_test_projects

🎉 All tests passed! MCP tools are working correctly.
```

## Test Projects

Test projects are created in the `next_test_projects/` directory:

```
next_test_projects/
├── basic-next-js-setup/           # Basic Next.js test
├── core-tools-setup/              # Core tools test
├── database-integration/          # Database test
├── authentication-system/         # Auth test
├── stripe-payments/               # Payment test
├── team-management-system/        # Team management test
├── advanced-form-handling/        # Form handling test
└── complete-saas-application/     # Full SaaS test
```

## Manual Inspection

After running tests, you can manually inspect the generated projects:

```bash
# Navigate to a test project
cd next_test_projects/complete-saas-application

# Install dependencies
pnpm install

# Try building the project
pnpm build

# Start development server
pnpm dev
```

## Cleanup

Test projects are automatically preserved for manual inspection. Clean them up when done:

```bash
# Clean up all test projects
pnpm test:cleanup

# Or manually delete
rm -rf next_test_projects/
```

## Debugging Failed Tests

When tests fail, the output will show:

1. **Which tool failed** and the error message
2. **Missing files** that should have been created
3. **Missing packages** that should have been installed
4. **Validation errors** for project structure

Example failure output:

```
❌ Authentication System - FAILED (15.67s)
   ❌ Tool setup_authentication_jwt failed: Database is required
   ❌ Expected file not found: lib/auth/session.ts
   ❌ Expected package not installed: jose
```

## Adding New Tests

To add a new test case, edit `test-runner.ts` and add to the `getTestCases()` method:

```typescript
{
  name: "My New Test",
  description: "Test description",
  tools: [
    { name: "create_nextjs_base", config: {} },
    { name: "my_new_tool", config: { option: true } }
  ],
  expectedFiles: [
    "my-new-file.ts",
    "components/my-component.tsx"
  ],
  expectedPackages: ["my-package"],
  validationChecks: [
    { type: 'file-exists', description: 'My file exists', check: 'my-file.ts' }
  ]
}
```

## CI Integration

The testing system is designed to work in CI environments:

```yaml
# GitHub Actions example
- name: Test MCP Tools
  run: |
    pnpm install
    pnpm build
    pnpm test

- name: Cleanup
  if: always()
  run: pnpm test:cleanup
```

## Performance Notes

- Tests create real Next.js projects, so they take time
- Each test is independent and creates a fresh project
- Complete test suite takes ~60-90 seconds
- Test projects use ~50-100MB each

## Troubleshooting

**Tests fail with "command not found":**
- Ensure `pnpm` is installed and in PATH
- Run `pnpm install` first to install dependencies

**TypeScript compilation errors:**
- Tests may reveal actual bugs in generated code
- Check the test project manually for TypeScript errors

**Permission errors:**
- Ensure write permissions to the project directory
- On Windows, run terminal as administrator if needed

**Network timeouts:**
- Tests require internet for package installation
- Consider running tests with longer timeouts in CI