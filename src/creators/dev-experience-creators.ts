/**
 * @fileoverview Developer Experience Creators
 * @description Creates files for enhanced developer experience including environment validation,
 * form handling, testing setup, and git hooks configuration
 */

import fs from "fs-extra";
import path from "node:path";
import {
  envConfigTemplate,
  envExampleTemplate,
  envLocalTemplate
} from "../templates/env-templates.js";
import {
  formHooksTemplate,
  formUtilsTemplate,
  formComponentTemplate
} from "../templates/form-templates.js";
import {
  vitestConfigTemplate,
  vitestSetupTemplate,
  testUtilsTemplate,
  mswHandlersTemplate,
  mswServerTemplate,
  playwrightConfigTemplate,
  sampleUnitTestTemplate,
  sampleE2ETestTemplate
} from "../templates/testing-templates.js";
import {
  lefthookConfigTemplate,
  lintStagedConfigTemplate,
  commitlintConfigTemplate,
  commitizenConfigTemplate,
  vscodeTasksTemplate,
  githubWorkflowTemplate
} from "../templates/git-hooks-templates.js";

/**
 * Creates T3 Env configuration for type-safe environment variables
 */
export async function createEnvValidation(projectPath: string): Promise<void> {
  // Create env.ts for runtime validation
  await fs.writeFile(
    path.join(projectPath, "env.ts"),
    envConfigTemplate
  );

  // Create .env.example
  await fs.writeFile(
    path.join(projectPath, ".env.example"),
    envExampleTemplate
  );

  // Create .env.local template (user needs to fill this)
  await fs.writeFile(
    path.join(projectPath, ".env.local.example"),
    envLocalTemplate
  );
}

/**
 * Creates React Hook Form setup and utilities
 */
export async function createFormHandling(projectPath: string): Promise<void> {
  const libPath = path.join(projectPath, "lib");
  const formsPath = path.join(libPath, "forms");
  const componentsPath = path.join(projectPath, "components", "forms");

  // Ensure directories exist
  await fs.ensureDir(formsPath);
  await fs.ensureDir(componentsPath);

  // Create form utilities
  await fs.writeFile(
    path.join(formsPath, "hooks.ts"),
    formHooksTemplate
  );

  await fs.writeFile(
    path.join(formsPath, "utils.ts"),
    formUtilsTemplate
  );

  // Create example form component
  await fs.writeFile(
    path.join(componentsPath, "contact-form.tsx"),
    formComponentTemplate
  );
}

/**
 * Creates comprehensive testing setup with Vitest and Playwright
 */
export async function createTestingSetup(projectPath: string): Promise<void> {
  const testsPath = path.join(projectPath, "tests");
  const e2ePath = path.join(testsPath, "e2e");
  const mocksPath = path.join(testsPath, "mocks");
  const componentsTestPath = path.join(testsPath, "components");

  // Ensure all directories exist first
  await fs.ensureDir(testsPath);
  await fs.ensureDir(e2ePath);
  await fs.ensureDir(mocksPath);
  await fs.ensureDir(componentsTestPath);

  // Create Vitest config
  await fs.writeFile(
    path.join(projectPath, "vitest.config.ts"),
    vitestConfigTemplate
  );

  // Create test setup
  await fs.writeFile(
    path.join(testsPath, "setup.ts"),
    vitestSetupTemplate
  );

  // Create test utils
  await fs.writeFile(
    path.join(testsPath, "test-utils.tsx"),
    testUtilsTemplate
  );

  // Create MSW handlers and server
  await fs.writeFile(
    path.join(mocksPath, "handlers.ts"),
    mswHandlersTemplate
  );

  await fs.writeFile(
    path.join(mocksPath, "server.ts"),
    mswServerTemplate
  );

  // Create Playwright config
  await fs.writeFile(
    path.join(projectPath, "playwright.config.ts"),
    playwrightConfigTemplate
  );

  // Create sample tests (directories already ensured above)
  await fs.writeFile(
    path.join(componentsTestPath, "button.test.tsx"),
    sampleUnitTestTemplate
  );

  await fs.writeFile(
    path.join(e2ePath, "auth.spec.ts"),
    sampleE2ETestTemplate
  );
}

/**
 * Creates Git hooks setup with Lefthook and development workflow
 */
export async function createGitHooksSetup(projectPath: string): Promise<void> {
  const vscodePath = path.join(projectPath, ".vscode");
  const githubPath = path.join(projectPath, ".github", "workflows");

  // Ensure directories exist
  await fs.ensureDir(vscodePath);
  await fs.ensureDir(githubPath);

  // Create Lefthook config
  await fs.writeFile(
    path.join(projectPath, "lefthook.yml"),
    lefthookConfigTemplate
  );

  // Create lint-staged config
  await fs.writeFile(
    path.join(projectPath, ".lintstagedrc.json"),
    lintStagedConfigTemplate
  );

  // Create commitlint config
  await fs.writeFile(
    path.join(projectPath, "commitlint.config.js"),
    commitlintConfigTemplate
  );

  // Create Commitizen config in package.json (will be handled in updatePackageJsonForDevExperience)
  await fs.writeFile(
    path.join(projectPath, ".czrc"),
    commitizenConfigTemplate
  );

  // Create VSCode tasks
  await fs.writeFile(
    path.join(vscodePath, "tasks.json"),
    vscodeTasksTemplate
  );

  // Create GitHub workflow
  await fs.writeFile(
    path.join(githubPath, "ci.yml"),
    githubWorkflowTemplate
  );
}

/**
 * Updates package.json with dev experience scripts and config only
 */
export async function updatePackageJsonForDevExperience(projectPath: string): Promise<void> {
  const packageJsonPath = path.join(projectPath, "package.json");
  const packageJson = await fs.readJSON(packageJsonPath);

  // Add enhanced scripts
  packageJson.scripts = {
    ...packageJson.scripts,
    "typecheck": "tsc --noEmit",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "prepare": "lefthook install",
    "commit": "cz",
  };

  // Add config for commitizen
  packageJson.config = {
    ...packageJson.config,
    "commitizen": {
      "path": "cz-conventional-changelog"
    }
  };

  await fs.writeJSON(packageJsonPath, packageJson, { spaces: 2 });
}