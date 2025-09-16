# Implementation Plan: Consolidate Template Folders

**Branch**: `003-consolidate-template-folders` | **Date**: September 15, 2025 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/003-consolidate-template-folders/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
3. Evaluate Constitution Check section below
4. Execute Phase 0 → research.md
5. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file
6. Re-evaluate Constitution Check section
7. Plan Phase 2 → Describe task generation approach
8. STOP - Ready for /tasks command
```

## Summary
Consolidate all template files into a single folder and update all code and documentation references to use the unified location. Remove redundant folders, resolve any template conflicts, and ensure no functionality is lost. All dynamic and static references will be updated or logged for review.

## Technical Context
**Language/Version**: TypeScript (latest), Node.js (latest)
**Primary Dependencies**: Next.js, pnpm, Biome
**Storage**: N/A (file-based templates)
**Testing**: Vitest, Playwright
**Target Platform**: Cross-platform (Windows, macOS, Linux)
**Project Type**: Single (monorepo)
**Performance Goals**: No measurable impact on build/runtime performance
**Constraints**: Must maintain compatibility with existing codebase and CI/CD
**Scale/Scope**: All template files and references in the repository

## Constitution Check
**Simplicity**:
- Projects: 1 (monorepo)
- Using framework directly: Yes
- Single data model: Yes
- Avoiding patterns: Yes

**Architecture**:
- EVERY feature as library: Yes
- Libraries listed: N/A (feature is a refactor)
- CLI per library: N/A
- Library docs: N/A

**Testing (NON-NEGOTIABLE)**:
- RED-GREEN-Refactor cycle enforced: Yes
- Git commits show tests before implementation: Yes
- Order: Contract→Integration→E2E→Unit strictly followed: Yes
- Real dependencies used: Yes
- Integration tests for: N/A (feature is a refactor)
- FORBIDDEN: Implementation before test, skipping RED phase: No

**Observability**:
- Structured logging included: Yes (where applicable)
- Frontend logs → backend: N/A
- Error context sufficient: Yes

**Versioning**:
- Version number assigned: Yes
- BUILD increments on every change: Yes
- Breaking changes handled: Yes

## Project Structure

### Documentation (this feature)
```
specs/003-consolidate-template-folders/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
└── tasks.md
```

### Source Code (repository root)
```
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/
```

**Structure Decision**: Option 1 (single project)

## Phase 0: Outline & Research
- Research best practices for consolidating template folders in TypeScript/Node.js monorepos
- Research strategies for updating code references to template files
- Research conflict resolution for template files (manual merge, naming conventions)
- Research logging and error handling for missing template references

## Phase 1: Design & Contracts
- Define entities: Template Folder, Template Reference
- Design data-model.md to describe unified folder and reference structure
- Create contracts for template access/update (if applicable)
- Draft quickstart.md for migration steps and validation

## Phase 2: Task Planning Approach
- Generate tasks for:
  - Identifying all template folders and files
  - Merging templates into unified folder
  - Updating all code and documentation references
  - Removing redundant folders
  - Validating migration with tests
  - Logging and error handling for missed references
- Order tasks by dependency (merge before update, update before remove)
- Mark independent tasks for parallel execution

## Complexity Tracking
| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None      | N/A        | N/A                                 |

## Progress Tracking
**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [ ] Complexity deviations documented

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*