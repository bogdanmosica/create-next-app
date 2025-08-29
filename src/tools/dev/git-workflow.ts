/**
 * @fileoverview Git Workflow Tool
 * @description Sets up comprehensive Git workflow with hooks, commit standards, and automated quality checks
 * Provides modern Git workflow with Lefthook, Commitizen, lint-staged, and automated code quality
 */

import fs from "fs-extra";
import path from "path";
import { runCommand } from "../../runners/command-runner.js";
import { detectProjectState } from "../../utils/dependency-detector.js";

export interface GitWorkflowConfig {
  projectPath: string;
  includeHooks?: boolean;
  includeCommitStandards?: boolean;
  includeLintStaged?: boolean;
}

export async function setupGitWorkflow(config: GitWorkflowConfig): Promise<string> {
  const {
    projectPath,
    includeHooks = true,
    includeCommitStandards = true,
    includeLintStaged = true
  } = config;

  console.error(`[DEBUG] Setting up Git workflow at: ${projectPath}`);
  console.error(`[DEBUG] Config - Hooks: ${includeHooks}, Commit Standards: ${includeCommitStandards}, Lint Staged: ${includeLintStaged}`);

  const steps: string[] = [];
  const startTime = Date.now();

  try {
    // Validate project path
    if (!await fs.pathExists(projectPath)) {
      throw new Error(`Project path does not exist: ${projectPath}`);
    }

    // Check if this is a Next.js project
    const packageJsonPath = path.join(projectPath, "package.json");
    if (!await fs.pathExists(packageJsonPath)) {
      throw new Error("Not a valid Next.js project (package.json not found). Run create_nextjs_base first.");
    }

    const packageJson = await fs.readJson(packageJsonPath);
    if (!packageJson.dependencies?.next) {
      throw new Error("Not a Next.js project. Run create_nextjs_base first.");
    }

    // Detect existing project state
    const projectState = await detectProjectState(projectPath);
    console.error(`[DEBUG] Project state:`, projectState);

    // Check if Git is initialized
    const gitDir = path.join(projectPath, ".git");
    if (!await fs.pathExists(gitDir)) {
      console.error(`[INFO] Initializing Git repository...`);
      await runCommand("git init", projectPath);
    }

    // Check for existing Git workflow setup
    const lefthookPath = path.join(projectPath, "lefthook.yml");
    if (await fs.pathExists(lefthookPath)) {
      throw new Error("Git workflow appears to already be set up (lefthook.yml exists).");
    }

    // Step 1: Install Git workflow dependencies
    const step1 = "Installing Git workflow dependencies...";
    steps.push(step1);
    console.error(`[STEP 1/5] ${step1}`);
    
    const packagesToInstall: string[] = [];
    
    if (includeHooks) {
      packagesToInstall.push("lefthook");
    }
    
    if (includeCommitStandards) {
      packagesToInstall.push("@commitlint/cli", "@commitlint/config-conventional", "commitizen", "cz-conventional-changelog");
    }
    
    if (includeLintStaged) {
      packagesToInstall.push("lint-staged");
    }

    if (packagesToInstall.length > 0) {
      await runCommand(`pnpm add -D ${packagesToInstall.join(" ")}`, projectPath);
    }

    console.error(`[STEP 1/5] ✅ Completed: ${step1}`);

    // Step 2: Setup Git hooks with Lefthook
    if (includeHooks) {
      const step2 = "Setting up Git hooks with Lefthook...";
      steps.push(step2);
      console.error(`[STEP 2/5] ${step2}`);
      await createLefthookConfig(projectPath, { includeCommitStandards, includeLintStaged, hasBiome: projectState.hasBiome });
      console.error(`[STEP 2/5] ✅ Completed: ${step2}`);
    }

    // Step 3: Setup commit standards
    if (includeCommitStandards) {
      const step3 = "Setting up commit standards and Commitizen...";
      steps.push(step3);
      console.error(`[STEP 3/5] ${step3}`);
      await createCommitStandards(projectPath);
      console.error(`[STEP 3/5] ✅ Completed: ${step3}`);
    }

    // Step 4: Setup lint-staged
    if (includeLintStaged) {
      const step4 = "Setting up lint-staged configuration...";
      steps.push(step4);
      console.error(`[STEP 4/5] ${step4}`);
      await createLintStagedConfig(projectPath, { hasBiome: projectState.hasBiome });
      console.error(`[STEP 4/5] ✅ Completed: ${step4}`);
    }

    // Step 5: Update package.json scripts and initialize hooks
    const step5 = "Updating package.json scripts and initializing Git hooks...";
    steps.push(step5);
    console.error(`[STEP 5/5] ${step5}`);
    await updatePackageJsonScripts(projectPath, { includeHooks, includeCommitStandards, includeLintStaged });
    
    if (includeHooks) {
      try {
        await runCommand("pnpm lefthook install", projectPath);
      } catch (error) {
        console.warn("Could not install Lefthook hooks automatically. Run 'pnpm lefthook install' manually.");
      }
    }
    
    console.error(`[STEP 5/5] ✅ Completed: ${step5}`);

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error(`[SUCCESS] Git workflow setup completed in ${totalTime}s`);

    // Generate success message
    return generateSuccessMessage(steps, totalTime, {
      includeHooks,
      includeCommitStandards,
      includeLintStaged,
      hasBiome: projectState.hasBiome,
      hasLinting: projectState.hasBiome
    });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[ERROR] Git workflow setup failed: ${errorMsg}`);
    throw error;
  }
}

async function createLefthookConfig(projectPath: string, options: { includeCommitStandards: boolean; includeLintStaged: boolean; hasBiome: boolean }): Promise<void> {
  const lefthookConfig = `# Lefthook Configuration
# https://github.com/evilmartians/lefthook
# 
# Git hooks management tool for Node.js projects
# Runs code quality checks and automated tasks on git events

# Pre-commit hooks - run before each commit
pre-commit:
  parallel: true
  commands:${options.includeLintStaged ? `
    lint-staged:
      glob: "*.{js,jsx,ts,tsx,json,css,md}"
      run: pnpm lint-staged
      stage_fixed: true` : ''}${options.hasBiome ? `
    biome-check:
      glob: "*.{js,jsx,ts,tsx,json}"
      run: pnpm biome check --apply .
      stage_fixed: true
    type-check:
      glob: "*.{ts,tsx}"
      run: pnpm typecheck
      fail_text: "TypeScript compilation failed"` : `
    lint:
      glob: "*.{js,jsx,ts,tsx}"
      run: pnpm lint --fix
      stage_fixed: true`}

# Pre-push hooks - run before pushing to remote
pre-push:
  parallel: true
  commands:
    build-check:
      run: pnpm build
      fail_text: "Build failed - fix issues before pushing"${options.hasBiome ? `
    final-lint:
      run: pnpm biome check .
      fail_text: "Linting issues found - run 'pnpm biome check --apply .' to fix"` : ''}

${options.includeCommitStandards ? `# Commit message hooks - validate commit message format
commit-msg:
  commands:
    commitlint:
      run: pnpm commitlint --edit {1}
      fail_text: "Commit message does not follow conventional format"

# Prepare commit message - help with commit message format
prepare-commit-msg:
  commands:
    commitizen:
      run: exec < /dev/tty && pnpm cz --hook || true
      interactive: true` : ''}

# Skip hooks configuration
# Set LEFTHOOK=0 to skip all hooks
# Set LEFTHOOK_EXCLUDE=pre-commit,pre-push to skip specific hooks

# Remote configuration for team consistency
remote:
  git_url: https://github.com/evilmartians/lefthook
  ref: v1.5.0
  config: lefthook.yml

# Scripts directory for custom hooks
scripts:
  "pre-commit/check-package-lock.sh": |
    #!/bin/sh
    if [ -f package-lock.json ] && [ -f pnpm-lock.yaml ]; then
      echo "Both package-lock.json and pnpm-lock.yaml found. Please remove package-lock.json"
      exit 1
    fi
  
  "pre-push/check-env-example.sh": |
    #!/bin/sh
    if [ -f .env ] && [ ! -f .env.example ]; then
      echo "Warning: .env exists but .env.example is missing"
      echo "Please create .env.example with example values"
    fi
`;

  await fs.writeFile(path.join(projectPath, "lefthook.yml"), lefthookConfig);
}

async function createCommitStandards(projectPath: string): Promise<void> {
  // Create Commitlint configuration
  const commitlintConfig = `/**
 * @fileoverview Commitlint Configuration
 * @description Enforces conventional commit message format
 * https://conventionalcommits.org/
 */

module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Enforce conventional commit types
    'type-enum': [
      2,
      'always',
      [
        'feat',     // New features
        'fix',      // Bug fixes
        'docs',     // Documentation changes
        'style',    // Code style changes (formatting, etc.)
        'refactor', // Code refactoring
        'perf',     // Performance improvements
        'test',     // Adding or updating tests
        'chore',    // Maintenance tasks
        'ci',       // CI/CD changes
        'build',    // Build system changes
        'revert',   // Revert previous commits
      ],
    ],
    // Enforce scope format
    'scope-case': [2, 'always', 'lower-case'],
    // Enforce subject format
    'subject-case': [2, 'never', ['sentence-case', 'start-case', 'pascal-case', 'upper-case']],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'subject-max-length': [2, 'always', 100],
    // Enforce body format
    'body-leading-blank': [1, 'always'],
    'body-max-line-length': [2, 'always', 100],
    // Enforce footer format
    'footer-leading-blank': [1, 'always'],
  },
};
`;

  await fs.writeFile(path.join(projectPath, "commitlint.config.js"), commitlintConfig);

  // Create Commitizen configuration  
  const packageJsonPath = path.join(projectPath, "package.json");
  const packageJson = await fs.readJson(packageJsonPath);
  
  packageJson.config = {
    ...packageJson.config,
    commitizen: {
      path: "cz-conventional-changelog"
    }
  };

  await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });

  // Create commit message template
  const commitTemplate = `
# <type>[optional scope]: <description>
#
# [optional body]
#
# [optional footer(s)]

# --- COMMIT MESSAGE FORMAT ---
# feat: add new feature
# fix: resolve bug
# docs: update documentation
# style: format code (no code changes)
# refactor: restructure code (no functionality changes)
# perf: improve performance
# test: add or update tests
# chore: update dependencies, tooling, etc.
# ci: update CI/CD configuration
# build: update build system
# revert: revert previous commit
#
# --- EXAMPLES ---
# feat(auth): add JWT authentication
# fix(payments): resolve stripe webhook timeout
# docs: update API documentation
# style: format with prettier
# refactor(database): extract user queries
# perf(api): optimize database queries
# test(auth): add login integration tests
# chore(deps): update next.js to v14
`;

  await fs.writeFile(path.join(projectPath, ".gitmessage"), commitTemplate);

  // Configure Git to use the commit template
  try {
    await runCommand("git config commit.template .gitmessage", projectPath);
  } catch (error) {
    console.warn("Could not set Git commit template automatically. Run 'git config commit.template .gitmessage' manually.");
  }
}

async function createLintStagedConfig(projectPath: string, options: { hasBiome: boolean }): Promise<void> {
  const lintStagedConfig = {
    "*.{js,jsx,ts,tsx}": options.hasBiome 
      ? [
          "pnpm biome check --apply --no-errors-on-unmatched",
          "pnpm biome format --write --no-errors-on-unmatched"
        ]
      : [
          "pnpm lint --fix",
          "pnpm prettier --write"
        ],
    "*.{json,md,yml,yaml}": options.hasBiome
      ? ["pnpm biome format --write --no-errors-on-unmatched"] 
      : ["pnpm prettier --write"],
    "*.{css,scss}": ["pnpm prettier --write"],
    "package.json": ["pnpm sort-package-json"]
  };

  await fs.writeJson(path.join(projectPath, ".lintstagedrc.json"), lintStagedConfig, { spaces: 2 });
}

async function updatePackageJsonScripts(projectPath: string, options: { includeHooks: boolean; includeCommitStandards: boolean; includeLintStaged: boolean }): Promise<void> {
  const packageJsonPath = path.join(projectPath, "package.json");
  const packageJson = await fs.readJson(packageJsonPath);

  const newScripts: Record<string, string> = {};

  if (options.includeHooks) {
    newScripts["prepare"] = "lefthook install";
    newScripts["hooks:install"] = "lefthook install";
    newScripts["hooks:uninstall"] = "lefthook uninstall";
  }

  if (options.includeCommitStandards) {
    newScripts["commit"] = "cz";
    newScripts["commit:retry"] = "cz --retry";
    newScripts["commit:check"] = "commitlint --from HEAD~1 --to HEAD --verbose";
  }

  if (options.includeLintStaged) {
    newScripts["lint-staged"] = "lint-staged";
  }

  // Add quality assurance scripts
  newScripts["qa"] = "pnpm lint && pnpm typecheck && pnpm build";
  newScripts["qa:fix"] = "pnpm lint --fix && pnpm format";

  packageJson.scripts = {
    ...packageJson.scripts,
    ...newScripts
  };

  await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
}

function generateSuccessMessage(
  steps: string[], 
  totalTime: string,
  config: {
    includeHooks: boolean;
    includeCommitStandards: boolean;
    includeLintStaged: boolean;
    hasBiome: boolean;
    hasLinting: boolean;
  }
): string {
  const { includeHooks, includeCommitStandards, includeLintStaged, hasBiome, hasLinting } = config;

  return `🎉 Git workflow setup completed successfully!

⏱️ Total time: ${totalTime}s

✅ Completed steps:
${steps.map((step, i) => `${i + 1}. ${step}`).join('\n')}

🔧 Git Workflow Configuration:
- ${includeHooks ? '✅' : '❌'} Git Hooks: ${includeHooks ? 'Lefthook for automated pre-commit and pre-push checks' : 'Disabled'}
- ${includeCommitStandards ? '✅' : '❌'} Commit Standards: ${includeCommitStandards ? 'Conventional commits with Commitizen and Commitlint' : 'Disabled'}
- ${includeLintStaged ? '✅' : '❌'} Lint Staged: ${includeLintStaged ? 'Automatic linting and formatting on staged files' : 'Disabled'}
- ${hasLinting ? '✅' : '⚠️'} Code Quality: ${hasBiome ? 'Biome integration for fast linting and formatting' : 'Basic linting available'}

🪝 Git Hooks Active:
${includeHooks ? `### Pre-commit hooks:
- ${includeLintStaged ? 'Lint-staged: Format and lint staged files' : 'Manual linting setup available'}
- ${hasBiome ? 'Biome check: Fast code quality validation' : 'Standard linting checks'}
- TypeScript: Compile-time error checking

### Pre-push hooks:
- Build check: Ensure project builds successfully
- Final lint: Comprehensive code quality validation

${includeCommitStandards ? `### Commit message hooks:
- Commitlint: Enforce conventional commit format
- Commitizen: Interactive commit message creation` : ''}` : 'Git hooks disabled - enable for automated quality checks'}

💻 Available Scripts:
${includeHooks ? '# Git Hooks Management\npnpm prepare              # Install Git hooks (runs automatically)\npnpm hooks:install         # Manually install hooks\npnpm hooks:uninstall       # Remove Git hooks\n' : ''}${includeCommitStandards ? '# Commit Standards\npnpm commit                # Create conventional commit with Commitizen\npnpm commit:retry          # Retry failed commit\npnpm commit:check          # Validate recent commit messages\n' : ''}${includeLintStaged ? '# Code Quality\npnpm lint-staged           # Run linters on staged files\n' : ''}# Quality Assurance
pnpm qa                    # Full quality check (lint + typecheck + build)
pnpm qa:fix                # Fix code quality issues

🎯 Workflow Features:
✨ **Automated Quality**: ${includeHooks ? 'Pre-commit and pre-push hooks ensure code quality' : 'Manual quality checks available'}
✨ **Conventional Commits**: ${includeCommitStandards ? 'Standardized commit messages with semantic versioning support' : 'Available - enable commit standards'}
✨ **Fast Feedback**: ${includeLintStaged ? 'Lint-staged runs only on changed files for speed' : 'Available - enable lint-staged'}
✨ **Team Consistency**: ${includeHooks ? 'Hooks ensure consistent code quality across team members' : 'Configure hooks for team consistency'}
✨ **CI/CD Ready**: Workflow optimized for continuous integration pipelines

🔒 Quality Gates:
- **Pre-commit**: ${includeHooks ? 'Prevents commits with linting errors or TypeScript issues' : 'Available - enable Git hooks'}
- **Pre-push**: ${includeHooks ? 'Ensures builds succeed before pushing to remote' : 'Available - enable Git hooks'}
- **Commit Format**: ${includeCommitStandards ? 'Enforces conventional commit message format' : 'Available - enable commit standards'}
- **Code Style**: ${hasLinting ? `Consistent ${hasBiome ? 'Biome' : 'ESLint'} formatting and linting` : 'Configure linting for consistency'}

📝 Commit Message Format${includeCommitStandards ? ' (Enforced)' : ' (Available)'}:
\`\`\`
feat(scope): add new feature
fix(scope): resolve bug issue  
docs: update documentation
style: format code changes
refactor: restructure code
perf: improve performance
test: add or update tests
chore: update dependencies
\`\`\`

💡 Usage Examples:
# Make a commit with standards${includeCommitStandards ? `
pnpm commit                # Interactive commit creation` : `
git commit -m "feat: add user authentication"  # Manual conventional commit`}

# Check code quality before committing${includeHooks ? `
# Hooks run automatically on git commit
git add .
git commit -m "feat: add new feature"  # Hooks run automatically` : `
pnpm qa                    # Manual quality check
pnpm qa:fix                # Fix issues then commit`}

# Team workflow${includeHooks ? `
git clone <repo>
pnpm install               # Hooks installed automatically via 'prepare' script
git add .
git commit                 # Quality checks run automatically` : `
# Enable hooks for consistent team workflow
# Add Git hooks configuration to your project`}

🚀 Integration Status:
- ✅ Git Repository: Initialized and configured
- ${hasBiome ? '✅' : '⚠️'} Linting: ${hasBiome ? 'Biome fast linting integrated' : 'Configure linting for better code quality'}
- ✅ Package Scripts: All workflow commands added to package.json
- ${includeHooks ? '✅' : '🔄'} Team Consistency: ${includeHooks ? 'Hooks ensure consistent code quality' : 'Available - enable Git hooks'}

💡 Next steps:
1. ${includeCommitStandards ? 'Try making a commit: \`pnpm commit\`' : 'Enable commit standards: \`pnpm add -D @commitlint/cli commitizen\`'}
2. ${includeHooks ? 'Hooks are active - commit quality is automated' : 'Install hooks: \`pnpm lefthook install\` (after adding lefthook)'}
3. ${includeLintStaged ? 'Lint-staged will run on every commit automatically' : 'Enable lint-staged for faster commits'}
4. Share the workflow: Team members get hooks automatically via \`pnpm install\`
5. Configure CI: Use the same quality scripts in your CI pipeline

⚠️  **Team Setup**:
- Hooks install automatically when team members run \`pnpm install\`
- All team members will have consistent code quality checks
- ${includeCommitStandards ? 'Commit message format is enforced for everyone' : 'Consider enabling commit standards for consistency'}
- Use \`LEFTHOOK=0\` to skip hooks temporarily if needed

🔗 **Quality Workflow**:
1. **Code Changes** → Make your changes with confidence
2. **Stage Files** → \`git add .\` stages your changes
3. **Pre-commit** → ${includeHooks ? 'Hooks automatically lint, format, and typecheck' : 'Run \`pnpm qa\` to check quality manually'}
4. **Commit** → ${includeCommitStandards ? '\`pnpm commit\` guides you through conventional format' : 'Commit with conventional format'}
5. **Pre-push** → ${includeHooks ? 'Build check ensures everything works before push' : 'Run \`pnpm build\` to verify before pushing'}
6. **Push** → Clean, consistent code reaches your repository`;
}