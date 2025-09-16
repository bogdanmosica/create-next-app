
# Tasks: Consolidate Template Folders

**Input**: Design documents from `/specs/003-consolidate-template-folders/`
**Prerequisites**: plan.md (required), spec.md (requirements)

## Execution Flow (main)
```
1. Load plan.md and spec.md from feature directory
2. Identify all template folders and files in the repository
3. Generate actionable tasks for consolidation, refactoring, and validation
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Phase 3.1: Setup
- [x] T001 Create a list of all template folders and files in the repository
- [x] T002 [P] Document current template folder structure in `/specs/003-consolidate-template-folders/tasks.md`
- [x] T003 [P] Plan unified template folder location and naming conventions

## Phase 3.2: Tests First (TDD)
- [x] T004 [P] Write contract test to verify all template references resolve to the new folder (e.g., `tests/contract/test_template_references.ts`)
- [x] T005 [P] Write integration test to validate template consolidation does not break functionality (e.g., `tests/integration/test_template_consolidation.ts`)

## Phase 3.3: Core Implementation
- [x] T006 Move all template files into the unified folder (e.g., `src/templates/`)
- [x] T007 Update all code references to use the new template folder path
- [x] T008 Update all documentation references to use the new template folder path
- [x] T009 Remove redundant template folders from the repository
- [x] T010 Resolve any template file conflicts (merge or rename as needed)
- [x] T011 Implement logging for any missing or dynamic template references

## Phase 3.4: Integration
- [x] T012 Validate migration with automated tests
- [x] T013 Review and update error handling for template access

## Phase 3.5: Polish
- [x] T014 [P] Write unit tests for template utilities (e.g., `tests/unit/test_template_utils.ts`)
- [x] T015 [P] Update documentation to clarify new template folder usage
- [x] T016 [P] Remove any obsolete references or files

## Dependencies
- Setup (T001-T003) before tests and implementation
- Tests (T004-T005) before core implementation (T006-T011)
- Core implementation before integration (T012-T013)
- Integration before polish (T014-T016)

## Parallel Example
```
# Launch T002-T003 together:
Task: "Document current template folder structure in /specs/003-consolidate-template-folders/tasks.md"
Task: "Plan unified template folder location and naming conventions"

# Launch T004-T005 together:
Task: "Write contract test to verify all template references resolve to the new folder"
Task: "Write integration test to validate template consolidation does not break functionality"

# Launch T014-T016 together:
Task: "Write unit tests for template utilities"
Task: "Update documentation to clarify new template folder usage"
Task: "Remove any obsolete references or files"
```

## Notes
- [P] tasks = different files, no dependencies
- Verify tests fail before implementing
- Commit after each task
- Avoid: vague tasks, same file conflicts

## Validation Checklist
- [x] All template references updated
- [x] All tests come before implementation
- [x] Parallel tasks truly independent
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task

## Implementation Summary
**Status**: ✅ COMPLETED

All 16 tasks (T001-T016) have been successfully implemented:
- Created unified template structure in `src/templates/` with organized subdirectories
- Wrote comprehensive contract and integration tests following TDD principles
- Consolidated all template files from `src/templates/` and `src/template-files/` into unified structure
- Updated all import references across 10+ creator files
- Fixed TypeScript compilation errors (duplicate exports, missing modules)
- Validated consolidation works with custom validation script
- Removed old `src/template-files/` directory
- TypeScript build passes successfully
