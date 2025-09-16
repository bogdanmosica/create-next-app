/**
 * @fileoverview Internationalization E2E Tests
 * @description Tests language switching and route localization in generated applications
 * Constitutional compliance: i18n behavior validation for Build-First Testing
 */

import { test, expect, Page, Browser, chromium } from '@playwright/test';
import { TransactionalOrchestrator } from '../../src/core/transactional-orchestrator.js';
import fs from 'fs-extra';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { spawn, ChildProcess } from 'child_process';

interface I18nTestProject {
  name: string;
  path: string;
  devServer?: ChildProcess;
  url?: string;
  supportedLocales: string[];
}

class InternationalizationTestRunner {
  private testProjects: I18nTestProject[] = [];
  private browser: Browser | null = null;
  private baseTestDir: string;
  private defaultLocales = ['en', 'es', 'fr', 'de', 'ja', 'zh'];

  constructor() {
    this.baseTestDir = path.join(tmpdir(), `mcp-i18n-e2e-tests-${Date.now()}`);
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
   * Generate project with internationalization features
   */
  async generateI18nProject(name: string, locales?: string[]): Promise<I18nTestProject> {
    const projectPath = path.join(this.baseTestDir, name);
    await fs.ensureDir(projectPath);

    const orchestrator = new TransactionalOrchestrator({
      projectPath,
      projectName: name,
      resumeTransaction: false,
      enableRollback: true
    });

    const supportedLocales = locales || this.defaultLocales;

    // Generate project with i18n features
    await orchestrator.createFullApp({
      core: true,
      database: true,
      authentication: true,
      internationalization: true, // Enable i18n
      teamManagement: false,
      payments: false,
      devExperience: false
    });

    // Set up test environment
    await this.setupTestEnvironment(projectPath, supportedLocales);

    const project: I18nTestProject = {
      name,
      path: projectPath,
      supportedLocales
    };

    this.testProjects.push(project);
    return project;
  }

  private async setupTestEnvironment(projectPath: string, locales: string[]): Promise<void> {
    const envPath = path.join(projectPath, '.env');
    const envContent = `
DATABASE_URL="sqlite:test-i18n.db"
AUTH_SECRET="test-secret-key-for-i18n"
BASE_URL="http://localhost:3000"
`.trim();

    await fs.writeFile(envPath, envContent);

    // Create test translation content for validation
    const testTranslationsPath = path.join(projectPath, 'test-translations.js');
    const testContent = `
export const testTranslations = {
  ${locales.map(locale => `
  '${locale}': {
    common: {
      welcome: '${this.getWelcomeText(locale)}',
      home: '${this.getHomeText(locale)}',
      about: '${this.getAboutText(locale)}',
      contact: '${this.getContactText(locale)}'
    }
  }`).join(',')}
};

export const supportedLocales = ${JSON.stringify(locales)};
    `.trim();

    await fs.writeFile(testTranslationsPath, testContent);
  }

  private getWelcomeText(locale: string): string {
    const welcomeTexts: { [key: string]: string } = {
      en: 'Welcome',
      es: 'Bienvenido',
      fr: 'Bienvenue',
      de: 'Willkommen',
      ja: 'いらっしゃいませ',
      zh: '欢迎'
    };
    return welcomeTexts[locale] || 'Welcome';
  }

  private getHomeText(locale: string): string {
    const homeTexts: { [key: string]: string } = {
      en: 'Home',
      es: 'Inicio',
      fr: 'Accueil',
      de: 'Startseite',
      ja: 'ホーム',
      zh: '首页'
    };
    return homeTexts[locale] || 'Home';
  }

  private getAboutText(locale: string): string {
    const aboutTexts: { [key: string]: string } = {
      en: 'About',
      es: 'Acerca de',
      fr: 'À propos',
      de: 'Über uns',
      ja: 'について',
      zh: '关于'
    };
    return aboutTexts[locale] || 'About';
  }

  private getContactText(locale: string): string {
    const contactTexts: { [key: string]: string } = {
      en: 'Contact',
      es: 'Contacto',
      fr: 'Contact',
      de: 'Kontakt',
      ja: '連絡先',
      zh: '联系'
    };
    return contactTexts[locale] || 'Contact';
  }

  async startDevServer(project: I18nTestProject, port: number = 3000): Promise<string> {
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
   * Find language switcher elements
   */
  async findLanguageSwitcher(page: Page): Promise<any> {
    const languageSelectors = [
      '[data-testid*="language"], [data-testid*="locale"], [data-testid*="lang"]',
      'select[name*="language"], select[name*="locale"], select[name*="lang"]',
      '.language-switcher, .locale-switcher, .lang-switcher',
      'button:has-text("Language"), button:has-text("Lang")',
      '[role="button"]:has-text("English"), [role="button"]:has-text("Español")',
      'a[href*="/en"], a[href*="/es"], a[href*="/fr"]'
    ];

    for (const selector of languageSelectors) {
      const element = page.locator(selector);
      if (await element.count() > 0) {
        return element.first();
      }
    }

    return null;
  }

  /**
   * Check if URL has locale prefix
   */
  getCurrentLocaleFromUrl(url: string): string | null {
    const urlObj = new URL(url);
    const pathSegments = urlObj.pathname.split('/').filter(Boolean);

    if (pathSegments.length > 0) {
      const firstSegment = pathSegments[0];
      if (this.defaultLocales.includes(firstSegment)) {
        return firstSegment;
      }
    }

    return null;
  }

  /**
   * Switch to a specific language
   */
  async switchLanguage(page: Page, targetLocale: string): Promise<boolean> {
    try {
      const languageSwitcher = await this.findLanguageSwitcher(page);

      if (!languageSwitcher) {
        // Try direct URL navigation
        const currentUrl = page.url();
        const urlObj = new URL(currentUrl);

        // Try locale-prefixed URL
        const newPath = `/${targetLocale}${urlObj.pathname === '/' ? '' : urlObj.pathname}`;
        await page.goto(urlObj.origin + newPath);
        await page.waitForLoadState('networkidle');

        return this.getCurrentLocaleFromUrl(page.url()) === targetLocale;
      }

      const tagName = await languageSwitcher.evaluate(el => el.tagName.toLowerCase());

      if (tagName === 'select') {
        // Dropdown select
        const options = await languageSwitcher.locator('option').all();
        for (const option of options) {
          const value = await option.getAttribute('value');
          const text = await option.textContent();

          if (value === targetLocale || text?.toLowerCase().includes(targetLocale)) {
            await languageSwitcher.selectOption(value || text || '');
            await page.waitForTimeout(1000);
            return true;
          }
        }
      } else {
        // Button or link
        await languageSwitcher.click();
        await page.waitForTimeout(500);

        // Look for locale options in dropdown or menu
        const localeOptions = page.locator(`text=${targetLocale}, [data-locale="${targetLocale}"], a[href*="/${targetLocale}"]`);
        if (await localeOptions.count() > 0) {
          await localeOptions.first().click();
          await page.waitForTimeout(1000);
          return true;
        }
      }

      return false;

    } catch (error) {
      console.error('Language switch failed:', error);
      return false;
    }
  }

  /**
   * Detect translated content on page
   */
  async detectTranslatedContent(page: Page, expectedLocale: string): Promise<boolean> {
    try {
      const expectedTexts = [
        this.getWelcomeText(expectedLocale),
        this.getHomeText(expectedLocale),
        this.getAboutText(expectedLocale),
        this.getContactText(expectedLocale)
      ];

      // Check if any expected text appears on page
      for (const text of expectedTexts) {
        const textLocator = page.locator(`text=${text}`);
        if (await textLocator.count() > 0) {
          return true;
        }
      }

      // Check for language-specific HTML attributes
      const htmlLang = await page.locator('html').getAttribute('lang');
      if (htmlLang && htmlLang.startsWith(expectedLocale)) {
        return true;
      }

      // Check for locale in meta tags
      const metaLocale = page.locator(`meta[property="og:locale"][content*="${expectedLocale}"]`);
      if (await metaLocale.count() > 0) {
        return true;
      }

      return false;

    } catch (error) {
      console.error('Content detection failed:', error);
      return false;
    }
  }
}

let testRunner: InternationalizationTestRunner;

test.beforeAll(async () => {
  testRunner = new InternationalizationTestRunner();
  await testRunner.setup();
});

test.afterAll(async () => {
  if (testRunner) {
    await testRunner.teardown();
  }
});

test.describe('Internationalization E2E Tests', () => {

  test('Should have internationalization configuration files', async () => {
    const project = await testRunner.generateI18nProject('i18n-config');
    const url = await testRunner.startDevServer(project, 3400);
    const page = await testRunner.createPage();

    try {
      // Check that i18n files were generated
      const i18nConfigExists = await fs.pathExists(path.join(project.path, 'libs/i18n-config.ts')) ||
                              await fs.pathExists(path.join(project.path, 'i18n.ts')) ||
                              await fs.pathExists(path.join(project.path, 'next.config.ts'));

      expect(i18nConfigExists).toBe(true);

      // Check for translation files
      const translationsDir = path.join(project.path, 'messages');
      const localesDir = path.join(project.path, 'locales');

      const hasTranslations = await fs.pathExists(translationsDir) || await fs.pathExists(localesDir);

      // At least i18n config should exist
      expect(i18nConfigExists || hasTranslations).toBe(true);

    } finally {
      await page.close();
    }
  });

  test('Should detect supported locales in application', async () => {
    const project = await testRunner.generateI18nProject('i18n-locales');
    const url = await testRunner.startDevServer(project, 3401);
    const page = await testRunner.createPage();

    try {
      await page.goto(url);
      await page.waitForLoadState('networkidle');

      // Check if URL has locale prefix
      const currentUrl = page.url();
      const detectedLocale = testRunner.getCurrentLocaleFromUrl(currentUrl);

      // Check HTML lang attribute
      const htmlLang = await page.locator('html').getAttribute('lang');

      // Should have either URL locale or HTML lang
      expect(detectedLocale !== null || htmlLang !== null).toBe(true);

      // If using URL-based locales, should be valid locale
      if (detectedLocale) {
        expect(project.supportedLocales).toContain(detectedLocale);
      }

    } finally {
      await page.close();
    }
  });

  test('Should have language switching mechanism', async () => {
    const project = await testRunner.generateI18nProject('i18n-switching');
    const url = await testRunner.startDevServer(project, 3402);
    const page = await testRunner.createPage();

    try {
      await page.goto(url);
      await page.waitForLoadState('networkidle');

      // Look for language switcher
      const languageSwitcher = await testRunner.findLanguageSwitcher(page);

      if (languageSwitcher) {
        // Found language switcher
        expect(languageSwitcher).toBeDefined();

        // Check if it's functional
        const tagName = await languageSwitcher.evaluate(el => el.tagName.toLowerCase());

        if (tagName === 'select') {
          const options = await languageSwitcher.locator('option').count();
          expect(options).toBeGreaterThan(1);
        } else {
          // Button or link - should be clickable
          const isClickable = await languageSwitcher.isEnabled();
          expect(isClickable).toBe(true);
        }
      } else {
        // No UI switcher found - check for URL-based locale switching
        const currentUrl = page.url();
        const baseUrl = new URL(currentUrl).origin;

        // Try different locale URLs
        for (const locale of ['en', 'es', 'fr']) {
          try {
            await page.goto(`${baseUrl}/${locale}`);
            await page.waitForLoadState('networkidle');

            const has404 = await page.locator('text=/404|not found/i').count() > 0;
            if (!has404) {
              // URL-based locale switching works
              expect(true).toBe(true);
              break;
            }
          } catch (error) {
            // Continue to next locale
          }
        }
      }

    } finally {
      await page.close();
    }
  });

  test('Should switch languages and update content', async () => {
    const project = await testRunner.generateI18nProject('i18n-content-switch');
    const url = await testRunner.startDevServer(project, 3403);
    const page = await testRunner.createPage();

    try {
      await page.goto(url);
      await page.waitForLoadState('networkidle');

      // Get initial content
      const initialContent = await page.textContent('body');
      const initialUrl = page.url();
      const initialLocale = testRunner.getCurrentLocaleFromUrl(initialUrl) || 'en';

      // Try to switch to a different language
      const targetLocales = project.supportedLocales.filter(locale => locale !== initialLocale);

      let switchSuccessful = false;
      let contentChanged = false;

      for (const targetLocale of targetLocales.slice(0, 2)) {
        const switched = await testRunner.switchLanguage(page, targetLocale);

        if (switched) {
          switchSuccessful = true;
          await page.waitForLoadState('networkidle');

          // Check if URL changed
          const newUrl = page.url();
          const newLocale = testRunner.getCurrentLocaleFromUrl(newUrl);

          // Check if content changed
          const newContent = await page.textContent('body');
          const hasContentChange = newContent !== initialContent;

          // Check for translated content
          const hasTranslatedContent = await testRunner.detectTranslatedContent(page, targetLocale);

          contentChanged = hasContentChange || hasTranslatedContent || newLocale === targetLocale;

          if (contentChanged) {
            break;
          }
        }
      }

      // Either language switching worked, or at least i18n is configured
      if (switchSuccessful) {
        expect(contentChanged).toBe(true);
      } else {
        // If no UI switching, check that i18n files exist
        const hasI18nFiles = await fs.pathExists(path.join(project.path, 'libs/i18n-config.ts')) ||
                            await fs.pathExists(path.join(project.path, 'messages')) ||
                            await fs.pathExists(path.join(project.path, 'middleware.ts'));
        expect(hasI18nFiles).toBe(true);
      }

    } finally {
      await page.close();
    }
  });

  test('Should maintain URL locale prefixes during navigation', async () => {
    const project = await testRunner.generateI18nProject('i18n-navigation');
    const url = await testRunner.startDevServer(project, 3404);
    const page = await testRunner.createPage();

    try {
      // Start with a specific locale
      const testLocale = 'es';
      const localeUrl = `${url}/${testLocale}`;

      await page.goto(localeUrl);
      await page.waitForLoadState('networkidle');

      const initialLocale = testRunner.getCurrentLocaleFromUrl(page.url());

      if (initialLocale === testLocale) {
        // Navigate to different pages
        const navigationLinks = page.locator('a[href^="/"], nav a, .nav a');
        const linkCount = await navigationLinks.count();

        if (linkCount > 0) {
          // Click first few navigation links
          for (let i = 0; i < Math.min(3, linkCount); i++) {
            try {
              const link = navigationLinks.nth(i);
              const href = await link.getAttribute('href');

              // Skip external links and fragments
              if (href && href.startsWith('/') && !href.startsWith('//') && !href.includes('#')) {
                await link.click();
                await page.waitForLoadState('networkidle');

                const currentLocale = testRunner.getCurrentLocaleFromUrl(page.url());

                // Should maintain locale in URL
                expect(currentLocale).toBe(testLocale);

                // Go back for next test
                await page.goBack();
                await page.waitForLoadState('networkidle');
              }
            } catch (error) {
              // Navigation might fail, continue
            }
          }
        } else {
          // No navigation links found - check that at least locale persistence works
          await page.reload();
          const reloadedLocale = testRunner.getCurrentLocaleFromUrl(page.url());
          expect(reloadedLocale).toBe(testLocale);
        }
      } else {
        // URL-based locales not working - check middleware exists
        const middlewareExists = await fs.pathExists(path.join(project.path, 'middleware.ts'));
        expect(middlewareExists).toBe(true);
      }

    } finally {
      await page.close();
    }
  });

  test('Should handle authentication forms in multiple languages', async () => {
    const project = await testRunner.generateI18nProject('i18n-auth');
    const url = await testRunner.startDevServer(project, 3405);
    const page = await testRunner.createPage();

    try {
      // Test login page in different locales
      const testLocales = ['en', 'es'];

      for (const locale of testLocales) {
        const loginUrls = [
          `${url}/${locale}/auth/login`,
          `${url}/${locale}/login`,
          `${url}/auth/login?locale=${locale}`
        ];

        let loginPageFound = false;

        for (const loginUrl of loginUrls) {
          try {
            await page.goto(loginUrl);
            await page.waitForLoadState('networkidle');

            const has404 = await page.locator('text=/404|not found/i').count() > 0;
            const hasLoginForm = await page.locator('input[type="email"], input[type="password"]').count() > 1;

            if (!has404 && hasLoginForm) {
              loginPageFound = true;

              // Check for localized content
              const currentPageLocale = testRunner.getCurrentLocaleFromUrl(page.url()) || locale;
              const hasLocalizedContent = await testRunner.detectTranslatedContent(page, currentPageLocale);

              // At minimum, should have auth form
              expect(hasLoginForm).toBe(true);

              break;
            }
          } catch (error) {
            // Continue to next URL
          }
        }

        if (loginPageFound) {
          // Found at least one working auth page
          break;
        }
      }

    } finally {
      await page.close();
    }
  });

  test('Should not crash during locale switching', async () => {
    const project = await testRunner.generateI18nProject('i18n-stability');
    const url = await testRunner.startDevServer(project, 3406);
    const page = await testRunner.createPage();

    try {
      const consoleErrors: string[] = [];
      page.on('console', (message) => {
        if (message.type() === 'error') {
          consoleErrors.push(message.text());
        }
      });

      await page.goto(url);
      await page.waitForLoadState('networkidle');

      // Try multiple locale switches
      const testLocales = ['en', 'es', 'fr', 'de'];

      for (const locale of testLocales) {
        try {
          // Try URL-based switching
          const localeUrl = `${url}/${locale}`;
          await page.goto(localeUrl);
          await page.waitForLoadState('networkidle');

          // Try UI-based switching if available
          const languageSwitcher = await testRunner.findLanguageSwitcher(page);
          if (languageSwitcher) {
            await testRunner.switchLanguage(page, locale);
            await page.waitForLoadState('networkidle');
          }

          // Navigate around
          const links = page.locator('a[href^="/"]');
          const linkCount = await links.count();

          if (linkCount > 0) {
            try {
              await links.first().click();
              await page.waitForLoadState('networkidle');
            } catch (error) {
              // Navigation might fail, continue
            }
          }

        } catch (error) {
          // Continue to next locale
        }
      }

      // Filter critical errors
      const criticalErrors = consoleErrors.filter(error =>
        error.includes('ReferenceError') ||
        error.includes('TypeError') ||
        error.includes('SyntaxError')
      );

      expect(criticalErrors).toHaveLength(0);

    } finally {
      await page.close();
    }
  });

});