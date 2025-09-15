# Next.js Tests

This folder contains all tests related to Next.js application generation and functionality. This standardized naming ensures LLM compatibility for test discovery.

## Structure

- `app-creation-flow.test.ts` - Full application creation integration tests
- `error-scenarios.test.ts` - Error handling and recovery testing
- `orchestration-logic.test.ts` - Core orchestration functionality tests
- `rollback-mechanism.test.ts` - Transaction rollback and cleanup tests

## Running Tests

```bash
# Run all Next.js tests
npm test tests/nextjs-tests

# Run specific test files
npm test tests/nextjs-tests/app-creation-flow.test.ts
npm test tests/nextjs-tests/error-scenarios.test.ts
```

## Test Coverage Requirements

- Minimum 85% line coverage for orchestration logic
- All error scenarios must have corresponding tests
- Integration tests for complete app generation flows
- Rollback mechanism validation with cleanup verification