# create-next-app Constitution

## Core Principles

### I. Library-First
Every feature starts as a standalone library. Libraries must be self-contained, independently testable, and documented. Clear purpose required—no organizational-only libraries.

### II. CLI Interface
All major functionality is exposed via CLI. Text in/out protocol: stdin/args → stdout, errors → stderr. Support both JSON and human-readable formats.

### III. Test-First (NON-NEGOTIABLE)
TDD is mandatory: Tests are written, user-approved, and must fail before implementation. Red-Green-Refactor cycle strictly enforced.

### IV. Integration Testing
Integration tests are required for new library contracts, contract changes, inter-service communication, and shared schemas.

### V. Simplicity & Observability
Start simple (YAGNI). Structured logging and text I/O ensure debuggability. Versioning follows MAJOR.MINOR.BUILD format.

## Technology Stack & Constraints
- TypeScript and Node.js are required.
- Next.js is the default framework for app generation.
- All dependencies must be declared in `package.json` and managed via pnpm.
- Code must be compatible with modern VS Code and cross-platform (Windows, macOS, Linux).

## Development Workflow & Quality Gates
- All code changes require review and must pass automated tests.
- Linting and formatting are enforced via Biome.
- Documentation is required for all public APIs and CLI commands.
- Deployment approval is required for major releases.

## Governance
Constitution supersedes all other practices. Amendments require documentation, approval, and a migration plan. All PRs/reviews must verify compliance. Complexity must be justified. Use `how-to.md` and `README.md` for runtime development guidance.

**Version**: 1.0.0 | **Ratified**: 2025-09-15 | **Last Amended**: 2025-09-15