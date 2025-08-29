# setup_git_workflow Tool

## Overview
Implemented the `setup_git_workflow` tool which creates a comprehensive Git workflow with modern development practices including Git hooks, commit standards, and automated quality checks for Next.js projects.

## Implementation Details

### Files Created
- `src/tools/dev/git-workflow.ts` - Main tool implementation
- Complete Git workflow system with automation and quality gates

### Dependencies Added
Git workflow packages installed via pnpm:
- **Git Hooks**: `lefthook` (fast Git hooks manager)
- **Commit Standards**: `@commitlint/cli`, `@commitlint/config-conventional`, `commitizen`, `cz-conventional-changelog`
- **Staged Files**: `lint-staged` (run linters on staged files only)

### Configuration Options
```typescript
interface GitWorkflowConfig {
  projectPath: string;                    // Required: Project directory
  includeHooks?: boolean;                 // Default: true - Git hooks with Lefthook
  includeCommitStandards?: boolean;       // Default: true - Conventional commits
  includeLintStaged?: boolean;           // Default: true - Lint staged files only
}
```

### Steps Performed (5 Steps)
1. **Install Dependencies** - Git workflow packages and automation tools
2. **Setup Git Hooks** - Lefthook configuration with pre-commit and pre-push hooks
3. **Setup Commit Standards** - Conventional commits with Commitizen and Commitlint
4. **Setup Lint-Staged** - Run linters only on staged files for performance
5. **Update Scripts** - Package.json scripts and Git hooks initialization

### Generated Project Structure
```
project/
├── lefthook.yml                        # Git hooks configuration
├── commitlint.config.js               # Commit message linting rules
├── .lintstagedrc.json                 # Staged file linting configuration  
├── .gitmessage                        # Git commit message template
└── package.json                       # Updated with workflow scripts
```

## Usage Examples

### Full Setup (Recommended)
```typescript
{
  "tool": "setup_git_workflow",
  "input": {
    "projectPath": "/path/to/project"
  }
}
```

### Custom Configuration
```typescript
{
  "tool": "setup_git_workflow",
  "input": {
    "projectPath": "/path/to/project",
    "includeHooks": true,
    "includeCommitStandards": true,
    "includeLintStaged": false
  }
}
```

### Hooks Only
```typescript
{
  "tool": "setup_git_workflow",
  "input": {
    "projectPath": "/path/to/project",
    "includeCommitStandards": false,
    "includeLintStaged": false
  }
}
```

## Generated Code Examples

### Lefthook Configuration
```yaml
# lefthook.yml
# Pre-commit hooks - run before each commit
pre-commit:
  parallel: true
  commands:
    lint-staged:
      glob: "*.{js,jsx,ts,tsx,json,css,md}"
      run: pnpm lint-staged
      stage_fixed: true
    biome-check:
      glob: "*.{js,jsx,ts,tsx,json}"
      run: pnpm biome check --apply .
      stage_fixed: true
    type-check:
      glob: "*.{ts,tsx}"
      run: pnpm typecheck
      fail_text: "TypeScript compilation failed"

# Pre-push hooks - run before pushing to remote
pre-push:
  parallel: true
  commands:
    build-check:
      run: pnpm build
      fail_text: "Build failed - fix issues before pushing"
    final-lint:
      run: pnpm biome check .
      fail_text: "Linting issues found"

# Commit message validation
commit-msg:
  commands:
    commitlint:
      run: pnpm commitlint --edit {1}
      fail_text: "Commit message does not follow conventional format"
```

### Commitlint Configuration
```javascript
// commitlint.config.js
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // New features
        'fix',      // Bug fixes
        'docs',     // Documentation changes
        'style',    // Code style changes
        'refactor', // Code refactoring
        'perf',     // Performance improvements
        'test',     // Adding or updating tests
        'chore',    // Maintenance tasks
        'ci',       // CI/CD changes
        'build',    // Build system changes
        'revert',   // Revert previous commits
      ],
    ],
    'subject-case': [2, 'never', ['sentence-case', 'start-case', 'pascal-case', 'upper-case']],
    'subject-max-length': [2, 'always', 100],
  },
};
```

### Lint-Staged Configuration
```json
{
  "*.{js,jsx,ts,tsx}": [
    "pnpm biome check --apply --no-errors-on-unmatched",
    "pnpm biome format --write --no-errors-on-unmatched"
  ],
  "*.{json,md,yml,yaml}": [
    "pnpm biome format --write --no-errors-on-unmatched"
  ],
  "*.{css,scss}": [
    "pnpm prettier --write"
  ],
  "package.json": [
    "pnpm sort-package-json"
  ]
}
```

### Package.json Scripts
```json
{
  "scripts": {
    "prepare": "lefthook install",
    "hooks:install": "lefthook install", 
    "hooks:uninstall": "lefthook uninstall",
    "commit": "cz",
    "commit:retry": "cz --retry",
    "commit:check": "commitlint --from HEAD~1 --to HEAD --verbose",
    "lint-staged": "lint-staged",
    "qa": "pnpm lint && pnpm typecheck && pnpm build",
    "qa:fix": "pnpm lint --fix && pnpm format"
  }
}
```

## Dependencies
- **Requires**: `create_nextjs_base` must be run first
- **Git Integration**: Requires Git repository (initializes if needed)
- **Linting Integration**: Works with Biome or ESLint setups
- **Auto-detects**: Adapts to existing linting and formatting tools

## Git Workflow Features

### Automated Quality Gates
- **Pre-commit Hooks**: Prevent commits with linting errors or TypeScript issues
- **Pre-push Hooks**: Ensure builds succeed before pushing to remote
- **Lint-Staged**: Run linters only on changed files for speed
- **TypeScript Checking**: Compile-time error prevention

### Commit Standards
- **Conventional Commits**: Standardized commit message format
- **Interactive Commits**: Commitizen guides users through proper format
- **Message Validation**: Commitlint enforces conventional format
- **Semantic Versioning**: Commit format enables automatic version bumping

### Team Consistency
- **Automatic Setup**: Hooks install automatically via `pnpm install`
- **Shared Configuration**: All team members get same quality checks
- **Skip Options**: `LEFTHOOK=0` to bypass hooks when needed
- **CI/CD Ready**: Same scripts work in continuous integration

## Security Features

### Code Quality Enforcement
- **Mandatory Linting**: Pre-commit hooks prevent bad code from entering repository
- **TypeScript Validation**: Compile-time error checking before commits
- **Build Verification**: Pre-push hooks ensure builds succeed
- **Consistent Formatting**: Automatic code formatting on commit

### Commit Message Security
- **Format Validation**: Prevents malicious or unclear commit messages
- **Length Limits**: Enforces reasonable commit message lengths
- **Type Enforcement**: Requires proper commit types (feat, fix, etc.)
- **Scope Validation**: Optional scope formatting requirements

## Error Handling
- ✅ **Missing Git**: Initializes Git repository if needed
- ✅ **Duplicate Setup**: Prevents overwriting existing Lefthook configuration
- ✅ **Package Installation**: Handles Git workflow package failures
- ✅ **Hook Installation**: Graceful handling of hook setup failures

## Git Workflow Process

### Development Workflow
1. **Make Changes** → Developer modifies code
2. **Stage Files** → `git add .` stages changes
3. **Pre-commit Hooks** → Automatic linting, formatting, type checking
4. **Commit** → `pnpm commit` guides through conventional format
5. **Pre-push Hooks** → Build verification before pushing
6. **Push** → Clean, tested code reaches repository

### Quality Assurance Flow
1. **Lint-Staged** → Only changed files are linted for speed
2. **Auto-Fix** → Fixable issues are corrected automatically
3. **Stage Fixed** → Auto-fixed files are re-staged
4. **Type Check** → TypeScript compilation verification
5. **Build Check** → Full project build verification
6. **Commit Validation** → Message format enforcement

### Team Collaboration Flow
1. **Clone Repository** → Team member clones project
2. **Install Dependencies** → `pnpm install` sets up hooks automatically
3. **Make Changes** → Developer works on features
4. **Consistent Quality** → Same hooks run for all team members
5. **Standard Commits** → All commits follow conventional format
6. **Reliable Builds** → Pre-push hooks prevent broken builds

## Testing
- ✅ **TypeScript Compilation** - No type errors
- ✅ **Lefthook Integration** - Git hooks install and run correctly
- ✅ **Commitlint Validation** - Commit message format enforcement
- ✅ **Lint-Staged Performance** - Only staged files processed
- ✅ **Package Scripts** - All workflow commands functional
- ✅ **Team Setup** - Hooks install automatically for new team members

## Integration
- **Works with**: `create_nextjs_base` (required first)
- **Enhances**: `setup_biome_linting` for faster code quality
- **Complements**: All other tools with consistent quality checks
- **CI/CD Ready**: Same scripts work in continuous integration pipelines

## Output Example
```
🎉 Git workflow setup completed successfully!

⏱️ Total time: 3.2s

✅ Completed steps:
1. Installing Git workflow dependencies...
2. Setting up Git hooks with Lefthook...
3. Setting up commit standards and Commitizen...
4. Setting up lint-staged configuration...
5. Updating package.json scripts and initializing Git hooks...

🔧 Git Workflow Configuration:
- ✅ Git Hooks: Lefthook for automated pre-commit and pre-push checks
- ✅ Commit Standards: Conventional commits with Commitizen and Commitlint
- ✅ Lint Staged: Automatic linting and formatting on staged files
- ✅ Code Quality: Biome integration for fast linting and formatting

🪝 Git Hooks Active:
### Pre-commit hooks:
- Lint-staged: Format and lint staged files
- Biome check: Fast code quality validation
- TypeScript: Compile-time error checking

### Pre-push hooks:
- Build check: Ensure project builds successfully
- Final lint: Comprehensive code quality validation

### Commit message hooks:
- Commitlint: Enforce conventional commit format
- Commitizen: Interactive commit message creation

💻 Available Scripts:
# Git Hooks Management
pnpm prepare              # Install Git hooks (runs automatically)
pnpm hooks:install         # Manually install hooks
pnpm hooks:uninstall       # Remove Git hooks

# Commit Standards
pnpm commit                # Create conventional commit with Commitizen
pnpm commit:retry          # Retry failed commit
pnpm commit:check          # Validate recent commit messages

# Code Quality
pnpm lint-staged           # Run linters on staged files
pnpm qa                    # Full quality check (lint + typecheck + build)
pnpm qa:fix                # Fix code quality issues

💡 Next steps:
1. Try making a commit: `pnpm commit`
2. Hooks are active - commit quality is automated
3. Lint-staged will run on every commit automatically
4. Share the workflow: Team members get hooks automatically via `pnpm install`
5. Configure CI: Use the same quality scripts in your CI pipeline
```

## Benefits
- **Automated Quality**: Pre-commit and pre-push hooks ensure consistent code quality
- **Team Consistency**: All team members get same quality checks automatically
- **Fast Feedback**: Lint-staged runs only on changed files for speed
- **Standard Commits**: Conventional commit format enables semantic versioning
- **CI/CD Ready**: Same quality scripts work in continuous integration

## Next Steps
This tool provides complete Git workflow automation. Users can then:
- Customize hook configuration for specific project needs
- Add additional quality checks or security scans
- Integrate with CI/CD pipelines using the same scripts
- Set up automatic semantic versioning and changelog generation
- Configure advanced commit message templates for specific workflows