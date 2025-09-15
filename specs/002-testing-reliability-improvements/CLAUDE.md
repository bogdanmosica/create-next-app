# Copilot Agent Context: Testing & Reliability Improvements

## Recent Changes
- Added standardized `nextjs-tests` folder for all Next.js implementation tests
- Defined contract and failing tests for orchestration logic and rollback
- Resolved all technical unknowns in research.md

## Technologies
- TypeScript (latest)
- Node.js (latest)
- Next.js (latest)
- Biome (linting)
- pnpm (package management)
- Jest (unit/integration testing)

## Project Structure
- All Next.js tests in `tests/nextjs-tests/`
- Orchestration logic and TransactionalOrchestrator as libraries in `src/core/`
- Contracts and failing tests in `specs/002-testing-reliability-improvements/contracts/`

## Constitution Compliance
- TDD enforced: Tests written and fail before implementation
- Integration tests for new libraries and contract changes
- Structured logging and audit logs for rollback/cleanup
- Documentation required for all public APIs and CLI commands

## Token Efficiency
- Context kept under 150 lines
- Only new tech/context added
- Manual additions preserved between markers
