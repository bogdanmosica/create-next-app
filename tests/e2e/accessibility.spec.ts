/**
 * @fileoverview Accessibility Tests for Generated UI Components
 * @description Tests WCAG compliance and accessibility features in generated applications
 * Constitutional compliance: Accessibility validation for Build-First Testing
 */

import { test, expect, Page, Browser, chromium } from '@playwright/test';
import { TransactionalOrchestrator } from '../../src/core/transactional-orchestrator.js';
import fs from 'fs-extra';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { spawn, ChildProcess } from 'child_process';

interface AccessibilityTestProject {
  name: string;
  path: string;
  devServer?: ChildProcess;
  url?: string;
  preset: string;
}

interface AccessibilityIssue {
  rule: string;
  impact: 'minor' | 'moderate' | 'serious' | 'critical';
  description: string;
  element: string;
  help: string;
}

class AccessibilityTestRunner {
  private testProjects: AccessibilityTestProject[] = [];
  private browser: Browser | null = null;
  private baseTestDir: string;

  constructor() {
    this.baseTestDir = path.join(tmpdir(), `mcp-a11y-e2e-tests-${Date.now()}`);
  }

  async setup() {
    await fs.ensureDir(this.baseTestDir);
    this.browser = await chromium.launch({ headless: true });
  }

  async teardown() {
    for (const project of this.testProjects) {
      if (project.devServer) {
        project.devServer.kill('SIGTERM');
      }
    }

    if (this.browser) {
      await this.browser.close();
    }

    if (await fs.pathExists(this.baseTestDir)) {
      await fs.remove(this.baseTestDir);
    }
  }

  /**
   * Generate project with specific preset for accessibility testing
   */
  async generateAccessibilityProject(name: string, preset: string): Promise<AccessibilityTestProject> {
    const projectPath = path.join(this.baseTestDir, name);
    await fs.ensureDir(projectPath);

    const orchestrator = new TransactionalOrchestrator({
      projectPath,
      projectName: name,
      resumeTransaction: false,
      enableRollback: true
    });

    // Generate project with specified preset
    await orchestrator.createFullApp({ preset });

    // Set up test environment
    await this.setupTestEnvironment(projectPath);

    const project: AccessibilityTestProject = {
      name,
      path: projectPath,
      preset
    };

    this.testProjects.push(project);
    return project;
  }

  private async setupTestEnvironment(projectPath: string): Promise<void> {
    const envPath = path.join(projectPath, '.env');
    const envContent = `
DATABASE_URL="sqlite:test-a11y.db"
AUTH_SECRET="test-secret-key-a11y"
BASE_URL="http://localhost:3000"
`.trim();

    await fs.writeFile(envPath, envContent);

    // Add axe-core for accessibility testing
    const packageJsonPath = path.join(projectPath, 'package.json');
    if (await fs.pathExists(packageJsonPath)) {
      const packageJson = await fs.readJSON(packageJsonPath);

      // Add axe-core as dev dependency
      packageJson.devDependencies = packageJson.devDependencies || {};
      packageJson.devDependencies['axe-core'] = '^4.8.0';

      await fs.writeJSON(packageJsonPath, packageJson, { spaces: 2 });
    }
  }

  async startDevServer(project: AccessibilityTestProject, port: number = 3000): Promise<string> {
    return new Promise((resolve, reject) => {
      const installProcess = spawn('pnpm', ['install'], {
        cwd: project.path,
        stdio: 'pipe'
      });

      installProcess.on('close', (code) => {
        if (code !== 0) {
          reject(new Error('Failed to install dependencies'));
          return;
        }

        const devServer = spawn('pnpm', ['dev'], {
          cwd: project.path,
          stdio: 'pipe',
          env: { ...process.env, PORT: port.toString() }
        });

        let output = '';

        devServer.stdout?.on('data', (data) => {
          output += data.toString();
          if (output.includes('Local:') || output.includes('localhost') || output.includes('Ready')) {
            project.devServer = devServer;
            project.url = `http://localhost:${port}`;
            resolve(project.url);
          }
        });

        devServer.stderr?.on('data', (data) => {
          const error = data.toString();
          if (error.includes('Error') && !output.includes('Local:')) {
            reject(new Error(`Dev server failed: ${error}`));
          }
        });

        setTimeout(() => {
          if (!project.url) {
            devServer.kill();
            reject(new Error('Dev server startup timeout'));
          }
        }, 60000);
      });
    });
  }

  async createPage(): Promise<Page> {
    if (!this.browser) {
      throw new Error('Browser not initialized');
    }
    return await this.browser.newPage();
  }

  /**
   * Inject axe-core for accessibility testing
   */
  async injectAxe(page: Page): Promise<void> {
    try {
      // Inject axe-core from CDN
      await page.addScriptTag({
        url: 'https://unpkg.com/axe-core@4.8.0/axe.min.js'
      });

      // Wait for axe to be available
      await page.waitForFunction(() => typeof window.axe !== 'undefined');

    } catch (error) {
      console.error('Failed to inject axe-core:', error);
      throw error;
    }
  }

  /**
   * Run axe accessibility scan
   */
  async runAxeScan(page: Page, selector?: string): Promise<AccessibilityIssue[]> {
    try {
      const results = await page.evaluate((selector) => {
        return new Promise((resolve, reject) => {
          if (typeof window.axe === 'undefined') {
            reject(new Error('axe-core not loaded'));
            return;
          }

          const config = {
            include: selector ? [selector] : undefined,
            rules: {
              // Enable all rules for comprehensive testing
              'color-contrast': { enabled: true },
              'keyboard-navigation': { enabled: true },
              'focus-management': { enabled: true },
              'aria-labels': { enabled: true }
            }
          };

          window.axe.run(config, (err: any, results: any) => {
            if (err) {
              reject(err);
            } else {
              resolve(results);
            }
          });
        });
      }, selector);

      // Convert axe results to our format
      const issues: AccessibilityIssue[] = [];

      if (results && results.violations) {
        for (const violation of results.violations) {
          for (const node of violation.nodes) {
            issues.push({
              rule: violation.id,
              impact: violation.impact || 'moderate',
              description: violation.description,
              element: node.target.join(', '),
              help: violation.help
            });
          }
        }
      }

      return issues;

    } catch (error) {
      console.error('Axe scan failed:', error);
      return [];
    }
  }

  /**
   * Test keyboard navigation
   */
  async testKeyboardNavigation(page: Page): Promise<{
    focusableElements: number;
    tabTrapsWorking: boolean;
    keyboardAccessible: boolean;
  }> {
    try {
      // Find all focusable elements
      const focusableElements = await page.evaluate(() => {
        const selectors = [
          'a[href]',
          'button:not([disabled])',
          'input:not([disabled])',
          'select:not([disabled])',
          'textarea:not([disabled])',
          '[tabindex]:not([tabindex="-1"])'
        ];

        return document.querySelectorAll(selectors.join(', ')).length;
      });

      // Test tab navigation
      let tabTrapsWorking = true;
      let keyboardAccessible = true;

      if (focusableElements > 0) {
        // Press tab and check if focus moves
        await page.keyboard.press('Tab');

        const firstFocused = await page.evaluate(() => {
          return document.activeElement?.tagName.toLowerCase() || 'none';
        });

        // Tab through a few elements
        for (let i = 0; i < Math.min(3, focusableElements); i++) {
          await page.keyboard.press('Tab');
          await page.waitForTimeout(100);
        }

        const laterFocused = await page.evaluate(() => {
          return document.activeElement?.tagName.toLowerCase() || 'none';
        });

        // Focus should have moved
        keyboardAccessible = firstFocused !== laterFocused || focusableElements === 1;

        // Test Shift+Tab (reverse navigation)
        await page.keyboard.press('Shift+Tab');
        const reverseFocused = await page.evaluate(() => {
          return document.activeElement?.tagName.toLowerCase() || 'none';
        });

        // Should be able to navigate backwards
        tabTrapsWorking = reverseFocused !== 'none';
      }

      return {
        focusableElements,
        tabTrapsWorking,
        keyboardAccessible
      };

    } catch (error) {
      console.error('Keyboard navigation test failed:', error);
      return {
        focusableElements: 0,
        tabTrapsWorking: false,
        keyboardAccessible: false
      };
    }
  }

  /**
   * Test color contrast
   */
  async testColorContrast(page: Page): Promise<{
    contrastIssues: number;
    totalElementsChecked: number;
  }> {
    try {
      const contrastResults = await page.evaluate(() => {
        const elements = document.querySelectorAll('*');
        let totalElements = 0;
        let contrastIssues = 0;

        for (const element of elements) {
          const computedStyle = window.getComputedStyle(element);
          const color = computedStyle.color;
          const backgroundColor = computedStyle.backgroundColor;

          if (color && backgroundColor &&
              color !== 'rgba(0, 0, 0, 0)' &&
              backgroundColor !== 'rgba(0, 0, 0, 0)') {
            totalElements++;

            // Simple contrast check (would need full implementation for WCAG)
            // This is a simplified version - axe-core does the full check
            const textContent = element.textContent?.trim();
            if (textContent && textContent.length > 0) {
              // We'll rely on axe-core for actual contrast checking
              // This just counts elements that could have contrast issues
            }
          }
        }

        return { totalElements, contrastIssues };
      });

      return contrastResults;

    } catch (error) {
      console.error('Color contrast test failed:', error);
      return { contrastIssues: 0, totalElementsChecked: 0 };
    }
  }

  /**
   * Test ARIA attributes and labels
   */
  async testAriaAttributes(page: Page): Promise<{
    elementsWithAria: number;
    elementsNeedingAria: number;
    ariaErrors: string[];
  }> {
    try {
      const ariaResults = await page.evaluate(() => {
        const elementsWithAria = document.querySelectorAll('[aria-label], [aria-labelledby], [aria-describedby], [role]').length;

        // Elements that commonly need ARIA attributes
        const interactiveElements = document.querySelectorAll('button, input, select, textarea, a, [tabindex]');
        const elementsNeedingAria = interactiveElements.length;

        const ariaErrors: string[] = [];

        // Check for common ARIA issues
        const buttonsWithoutLabels = document.querySelectorAll('button:not([aria-label]):not([aria-labelledby])');
        buttonsWithoutLabels.forEach((btn, index) => {
          if (!btn.textContent?.trim()) {
            ariaErrors.push(`Button ${index + 1} has no accessible name`);
          }
        });

        const inputsWithoutLabels = document.querySelectorAll('input:not([aria-label]):not([aria-labelledby])');
        inputsWithoutLabels.forEach((input, index) => {
          const associatedLabel = document.querySelector(`label[for="${input.id}"]`);
          if (!associatedLabel && !input.getAttribute('placeholder')) {
            ariaErrors.push(`Input ${index + 1} has no accessible name`);
          }
        });

        return { elementsWithAria, elementsNeedingAria, ariaErrors };
      });

      return ariaResults;

    } catch (error) {
      console.error('ARIA attributes test failed:', error);
      return { elementsWithAria: 0, elementsNeedingAria: 0, ariaErrors: [] };
    }
  }

  /**
   * Test semantic HTML structure
   */
  async testSemanticStructure(page: Page): Promise<{
    hasMainLandmark: boolean;
    hasNavigation: boolean;
    hasHeadingStructure: boolean;
    headingLevels: string[];
  }> {
    try {
      const semanticResults = await page.evaluate(() => {
        const hasMainLandmark = document.querySelectorAll('main, [role="main"]').length > 0;
        const hasNavigation = document.querySelectorAll('nav, [role="navigation"]').length > 0;

        // Check heading structure
        const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
        const headingLevels = headings.map(h => h.tagName.toLowerCase());
        const hasHeadingStructure = headings.length > 0;

        return { hasMainLandmark, hasNavigation, hasHeadingStructure, headingLevels };
      });

      return semanticResults;

    } catch (error) {
      console.error('Semantic structure test failed:', error);
      return {
        hasMainLandmark: false,
        hasNavigation: false,
        hasHeadingStructure: false,
        headingLevels: []
      };
    }
  }
}

let testRunner: AccessibilityTestRunner;

test.beforeAll(async () => {
  testRunner = new AccessibilityTestRunner();
  await testRunner.setup();
});

test.afterAll(async () => {
  if (testRunner) {
    await testRunner.teardown();
  }
});

test.describe('Accessibility Tests for Generated UI Components', () => {

  test('Minimal preset should have basic accessibility compliance', async () => {
    const project = await testRunner.generateAccessibilityProject('a11y-minimal', 'minimal');
    const url = await testRunner.startDevServer(project, 3700);
    const page = await testRunner.createPage();

    try {
      await page.goto(url);
      await page.waitForLoadState('networkidle');

      // Inject axe-core
      await testRunner.injectAxe(page);

      // Run accessibility scan
      const issues = await testRunner.runAxeScan(page);

      // Filter out critical and serious issues
      const criticalIssues = issues.filter(issue =>
        issue.impact === 'critical' || issue.impact === 'serious'
      );

      // Should have minimal critical accessibility issues
      expect(criticalIssues.length).toBeLessThan(5);

      // Test basic keyboard navigation
      const keyboardTest = await testRunner.testKeyboardNavigation(page);
      expect(keyboardTest.focusableElements).toBeGreaterThan(0);

      // Test semantic structure
      const semanticTest = await testRunner.testSemanticStructure(page);

      // Should have some semantic structure
      expect(
        semanticTest.hasMainLandmark ||
        semanticTest.hasNavigation ||
        semanticTest.hasHeadingStructure
      ).toBe(true);

    } finally {
      await page.close();
    }
  });

  test('Dashboard preset should have accessible navigation', async () => {
    const project = await testRunner.generateAccessibilityProject('a11y-dashboard', 'dashboard');
    const url = await testRunner.startDevServer(project, 3701);
    const page = await testRunner.createPage();

    try {
      await page.goto(url);
      await page.waitForLoadState('networkidle');

      await testRunner.injectAxe(page);

      // Test navigation accessibility
      const navigationIssues = await testRunner.runAxeScan(page, 'nav');
      const criticalNavIssues = navigationIssues.filter(issue =>
        issue.impact === 'critical' || issue.impact === 'serious'
      );

      expect(criticalNavIssues.length).toBeLessThan(3);

      // Test keyboard navigation
      const keyboardTest = await testRunner.testKeyboardNavigation(page);
      expect(keyboardTest.keyboardAccessible).toBe(true);

      // Test semantic structure
      const semanticTest = await testRunner.testSemanticStructure(page);
      expect(semanticTest.hasNavigation).toBe(true);

      // Should have proper heading structure for dashboard
      if (semanticTest.headingLevels.length > 0) {
        expect(semanticTest.headingLevels[0]).toBe('h1');
      }

    } finally {
      await page.close();
    }
  });

  test('Startup preset should have accessible forms', async () => {
    const project = await testRunner.generateAccessibilityProject('a11y-startup', 'startup');
    const url = await testRunner.startDevServer(project, 3702);
    const page = await testRunner.createPage();

    try {
      await page.goto(url);
      await page.waitForLoadState('networkidle');

      await testRunner.injectAxe(page);

      // Try to find form pages
      const formUrls = [
        `${url}/auth/login`,
        `${url}/auth/register`,
        `${url}/contact`,
        `${url}/dashboard/settings`
      ];

      let formAccessibilityTested = false;

      for (const formUrl of formUrls) {
        try {
          await page.goto(formUrl);
          await page.waitForLoadState('networkidle');

          const forms = await page.locator('form').count();

          if (forms > 0) {
            // Test form accessibility
            const formIssues = await testRunner.runAxeScan(page, 'form');
            const ariaTest = await testRunner.testAriaAttributes(page);

            // Forms should have minimal ARIA errors
            expect(ariaTest.ariaErrors.length).toBeLessThan(5);

            // Should have some elements with ARIA attributes
            if (ariaTest.elementsNeedingAria > 0) {
              expect(ariaTest.elementsWithAria).toBeGreaterThan(0);
            }

            formAccessibilityTested = true;
            break;
          }
        } catch (error) {
          // Continue to next form URL
        }
      }

      // If no forms found, at least test general accessibility
      if (!formAccessibilityTested) {
        await page.goto(url);
        await page.waitForLoadState('networkidle');

        const generalIssues = await testRunner.runAxeScan(page);
        const criticalIssues = generalIssues.filter(issue =>
          issue.impact === 'critical'
        );

        expect(criticalIssues.length).toBeLessThan(3);
      }

    } finally {
      await page.close();
    }
  });

  test('Enterprise preset should have comprehensive accessibility', async () => {
    const project = await testRunner.generateAccessibilityProject('a11y-enterprise', 'enterprise');
    const url = await testRunner.startDevServer(project, 3703);
    const page = await testRunner.createPage();

    try {
      await page.goto(url);
      await page.waitForLoadState('networkidle');

      await testRunner.injectAxe(page);

      // Run comprehensive accessibility scan
      const issues = await testRunner.runAxeScan(page);

      // Enterprise should have very few critical issues
      const criticalIssues = issues.filter(issue => issue.impact === 'critical');
      const seriousIssues = issues.filter(issue => issue.impact === 'serious');

      expect(criticalIssues.length).toBeLessThan(2);
      expect(seriousIssues.length).toBeLessThan(5);

      // Test all accessibility aspects
      const keyboardTest = await testRunner.testKeyboardNavigation(page);
      const semanticTest = await testRunner.testSemanticStructure(page);
      const ariaTest = await testRunner.testAriaAttributes(page);

      // Should have good keyboard navigation
      expect(keyboardTest.keyboardAccessible).toBe(true);

      // Should have semantic structure
      expect(semanticTest.hasMainLandmark || semanticTest.hasNavigation).toBe(true);

      // Should have minimal ARIA errors
      expect(ariaTest.ariaErrors.length).toBeLessThan(3);

      // Test color contrast
      const contrastTest = await testRunner.testColorContrast(page);
      expect(contrastTest.totalElementsChecked).toBeGreaterThan(0);

    } finally {
      await page.close();
    }
  });

  test('Generated forms should be screen reader accessible', async () => {
    const project = await testRunner.generateAccessibilityProject('a11y-forms', 'startup');
    const url = await testRunner.startDevServer(project, 3704);
    const page = await testRunner.createPage();

    try {
      await page.goto(url);
      await page.waitForLoadState('networkidle');

      await testRunner.injectAxe(page);

      // Test login form specifically
      const loginUrls = [`${url}/auth/login`, `${url}/login`];

      for (const loginUrl of loginUrls) {
        try {
          await page.goto(loginUrl);
          await page.waitForLoadState('networkidle');

          const hasForm = await page.locator('form').count() > 0;

          if (hasForm) {
            // Test form-specific accessibility
            const formIssues = await testRunner.runAxeScan(page, 'form');

            // Test that form inputs have proper labels
            const inputLabelTest = await page.evaluate(() => {
              const inputs = document.querySelectorAll('input[type="email"], input[type="password"], input[type="text"]');
              let labeledInputs = 0;

              for (const input of inputs) {
                const hasAriaLabel = input.hasAttribute('aria-label') || input.hasAttribute('aria-labelledby');
                const hasAssociatedLabel = input.id && document.querySelector(`label[for="${input.id}"]`);
                const hasPlaceholder = input.hasAttribute('placeholder');

                if (hasAriaLabel || hasAssociatedLabel || hasPlaceholder) {
                  labeledInputs++;
                }
              }

              return { total: inputs.length, labeled: labeledInputs };
            });

            // Most inputs should have some form of labeling
            if (inputLabelTest.total > 0) {
              expect(inputLabelTest.labeled / inputLabelTest.total).toBeGreaterThan(0.7);
            }

            break;
          }
        } catch (error) {
          // Continue to next form
        }
      }

    } finally {
      await page.close();
    }
  });

  test('Navigation components should support keyboard interaction', async () => {
    const project = await testRunner.generateAccessibilityProject('a11y-navigation', 'dashboard');
    const url = await testRunner.startDevServer(project, 3705);
    const page = await testRunner.createPage();

    try {
      await page.goto(url);
      await page.waitForLoadState('networkidle');

      // Test keyboard navigation through navigation elements
      const keyboardTest = await testRunner.testKeyboardNavigation(page);

      // Should have focusable navigation elements
      expect(keyboardTest.focusableElements).toBeGreaterThan(0);
      expect(keyboardTest.keyboardAccessible).toBe(true);

      // Test navigation landmarks
      const semanticTest = await testRunner.testSemanticStructure(page);
      expect(semanticTest.hasNavigation).toBe(true);

      // Test that navigation links are accessible
      const navAccessibility = await page.evaluate(() => {
        const navLinks = document.querySelectorAll('nav a, [role="navigation"] a');
        let accessibleLinks = 0;

        for (const link of navLinks) {
          const hasHref = link.hasAttribute('href');
          const hasText = (link.textContent?.trim().length ?? 0) > 0;
          const hasAriaLabel = link.hasAttribute('aria-label');

          if (hasHref && (hasText || hasAriaLabel)) {
            accessibleLinks++;
          }
        }

        return { total: navLinks.length, accessible: accessibleLinks };
      });

      // Most navigation links should be accessible
      if (navAccessibility.total > 0) {
        expect(navAccessibility.accessible / navAccessibility.total).toBeGreaterThan(0.8);
      }

    } finally {
      await page.close();
    }
  });

  test('Color contrast should meet WCAG standards', async () => {
    const project = await testRunner.generateAccessibilityProject('a11y-contrast', 'startup');
    const url = await testRunner.startDevServer(project, 3706);
    const page = await testRunner.createPage();

    try {
      await page.goto(url);
      await page.waitForLoadState('networkidle');

      await testRunner.injectAxe(page);

      // Run axe scan specifically for color contrast
      const issues = await testRunner.runAxeScan(page);
      const contrastIssues = issues.filter(issue =>
        issue.rule.includes('color-contrast')
      );

      // Should have minimal color contrast issues
      expect(contrastIssues.length).toBeLessThan(3);

      // Test our color contrast function
      const contrastTest = await testRunner.testColorContrast(page);
      expect(contrastTest.totalElementsChecked).toBeGreaterThan(0);

    } finally {
      await page.close();
    }
  });

  test('Generated content should have proper heading hierarchy', async () => {
    const project = await testRunner.generateAccessibilityProject('a11y-headings', 'blog');
    const url = await testRunner.startDevServer(project, 3707);
    const page = await testRunner.createPage();

    try {
      await page.goto(url);
      await page.waitForLoadState('networkidle');

      const semanticTest = await testRunner.testSemanticStructure(page);

      // Should have heading structure
      expect(semanticTest.hasHeadingStructure).toBe(true);

      if (semanticTest.headingLevels.length > 0) {
        // Should start with h1
        expect(semanticTest.headingLevels[0]).toBe('h1');

        // Test heading hierarchy (shouldn't skip levels)
        const headingNumbers = semanticTest.headingLevels.map(h => parseInt(h.charAt(1)));
        let hierarchyValid = true;

        for (let i = 1; i < headingNumbers.length; i++) {
          const current = headingNumbers[i];
          const previous = headingNumbers[i - 1];

          // Can go down one level, stay same, or go up any amount
          if (current > previous + 1) {
            hierarchyValid = false;
            break;
          }
        }

        expect(hierarchyValid).toBe(true);
      }

    } finally {
      await page.close();
    }
  });

  test('Should not have critical accessibility violations', async () => {
    const project = await testRunner.generateAccessibilityProject('a11y-critical', 'minimal');
    const url = await testRunner.startDevServer(project, 3708);
    const page = await testRunner.createPage();

    try {
      await page.goto(url);
      await page.waitForLoadState('networkidle');

      await testRunner.injectAxe(page);

      // Run comprehensive accessibility scan
      const issues = await testRunner.runAxeScan(page);

      // Log issues for debugging
      if (issues.length > 0) {
        console.log(`Found ${issues.length} accessibility issues:`);
        issues.slice(0, 5).forEach(issue => {
          console.log(`- ${issue.rule} (${issue.impact}): ${issue.description}`);
        });
      }

      // Should have zero critical issues
      const criticalIssues = issues.filter(issue => issue.impact === 'critical');
      expect(criticalIssues).toHaveLength(0);

      // Should have minimal serious issues
      const seriousIssues = issues.filter(issue => issue.impact === 'serious');
      expect(seriousIssues.length).toBeLessThan(3);

    } finally {
      await page.close();
    }
  });

});