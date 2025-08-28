/**
 * @fileoverview Git Hooks Configuration Templates
 * @description Templates for Lefthook, lint-staged, and commit message standards
 * Includes pre-commit hooks, commit validation, and development workflow automation
 */
export const lefthookConfigTemplate = `# Lefthook configuration
# See: https://github.com/evilmartians/lefthook/blob/master/docs/configuration.md

pre-commit:
  parallel: true
  commands:
    lint-staged:
      run: pnpm exec lint-staged
    typecheck:
      run: pnpm run typecheck
      fail_text: "Type checking failed. Please fix the errors above."

commit-msg:
  commands:
    commitlint:
      run: pnpm exec commitlint --edit {1}

pre-push:
  parallel: true
  commands:
    tests:
      run: pnpm run test
      fail_text: "Tests failed. Please fix failing tests before pushing."
    build:
      run: pnpm run build
      fail_text: "Build failed. Please fix build errors before pushing."`;
export const lintStagedConfigTemplate = `{
  "**/*.{js,jsx,ts,tsx,json,css,md}": [
    "biome format --write"
  ],
  "**/*.{js,jsx,ts,tsx}": [
    "biome lint --apply-unsafe",
    "biome check --apply"
  ],
  "**/*.{ts,tsx}": [
    "bash -c 'pnpm run typecheck'"
  ]
}`;
export const commitlintConfigTemplate = `module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'build',
        'chore',
        'ci',
        'docs',
        'feat',
        'fix',
        'perf',
        'refactor',
        'revert',
        'style',
        'test',
      ],
    ],
    'subject-case': [2, 'never', ['start-case', 'pascal-case', 'upper-case']],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'subject-max-length': [2, 'always', 50],
    'body-max-line-length': [2, 'always', 72],
    'footer-max-line-length': [2, 'always', 72],
  },
};`;
export const commitizenConfigTemplate = `{
  "path": "cz-conventional-changelog",
  "maxHeaderWidth": 50,
  "maxLineWidth": 72,
  "defaultType": "",
  "defaultScope": "",
  "defaultSubject": "",
  "defaultBody": "",
  "defaultIssues": "",
  "types": {
    "feat": {
      "description": "A new feature",
      "title": "Features"
    },
    "fix": {
      "description": "A bug fix",
      "title": "Bug Fixes"
    },
    "docs": {
      "description": "Documentation only changes",
      "title": "Documentation"
    },
    "style": {
      "description": "Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)",
      "title": "Styles"
    },
    "refactor": {
      "description": "A code change that neither fixes a bug nor adds a feature",
      "title": "Code Refactoring"
    },
    "perf": {
      "description": "A code change that improves performance",
      "title": "Performance Improvements"
    },
    "test": {
      "description": "Adding missing tests or correcting existing tests",
      "title": "Tests"
    },
    "build": {
      "description": "Changes that affect the build system or external dependencies (example scopes: gulp, broccoli, npm)",
      "title": "Builds"
    },
    "ci": {
      "description": "Changes to our CI configuration files and scripts (example scopes: Travis, Circle, BrowserStack, SauceLabs)",
      "title": "Continuous Integrations"
    },
    "chore": {
      "description": "Other changes that don't modify src or test files",
      "title": "Chores"
    },
    "revert": {
      "description": "Reverts a previous commit",
      "title": "Reverts"
    }
  }
}`;
export const vscodeTasksTemplate = `{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "dev",
      "type": "shell",
      "command": "pnpm",
      "args": ["dev"],
      "group": "build",
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": false,
        "panel": "shared",
        "showReuseMessage": true,
        "clear": false
      },
      "problemMatcher": []
    },
    {
      "label": "build",
      "type": "shell",
      "command": "pnpm",
      "args": ["build"],
      "group": "build",
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": false,
        "panel": "shared",
        "showReuseMessage": true,
        "clear": false
      },
      "problemMatcher": []
    },
    {
      "label": "test",
      "type": "shell",
      "command": "pnpm",
      "args": ["test"],
      "group": "test",
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": false,
        "panel": "shared",
        "showReuseMessage": true,
        "clear": false
      },
      "problemMatcher": []
    },
    {
      "label": "test:e2e",
      "type": "shell",
      "command": "pnpm",
      "args": ["test:e2e"],
      "group": "test",
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": false,
        "panel": "shared",
        "showReuseMessage": true,
        "clear": false
      },
      "problemMatcher": []
    },
    {
      "label": "lint",
      "type": "shell",
      "command": "pnpm",
      "args": ["lint"],
      "group": "build",
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": false,
        "panel": "shared",
        "showReuseMessage": true,
        "clear": false
      },
      "problemMatcher": []
    },
    {
      "label": "typecheck",
      "type": "shell",
      "command": "pnpm",
      "args": ["typecheck"],
      "group": "build",
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": false,
        "panel": "shared",
        "showReuseMessage": true,
        "clear": false
      },
      "problemMatcher": []
    }
  ]
}`;
export const githubWorkflowTemplate = `name: CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'pnpm'

    - name: Install pnpm
      run: npm install -g pnpm

    - name: Install dependencies
      run: pnpm install

    - name: Type check
      run: pnpm run typecheck

    - name: Lint
      run: pnpm run lint

    - name: Run unit tests
      run: pnpm run test

    - name: Build
      run: pnpm run build

    - name: Install Playwright Browsers
      run: pnpm exec playwright install --with-deps

    - name: Run Playwright tests
      run: pnpm run test:e2e

    - uses: actions/upload-artifact@v4
      if: always()
      with:
        name: playwright-report
        path: playwright-report/
        retention-days: 30`;
//# sourceMappingURL=git-hooks-templates.js.map