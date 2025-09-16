/**
 * @fileoverview Security Validation Tests for Authentication Flows
 * @description Tests security aspects of generated authentication systems
 * Constitutional compliance: Security validation for Build-First Testing
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { TransactionalOrchestrator } from '../../src/core/transactional-orchestrator.js';
import fs from 'fs-extra';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { spawn, ChildProcess } from 'child_process';
import crypto from 'crypto';

interface SecurityTestProject {
  name: string;
  path: string;
  devServer?: ChildProcess;
  url?: string;
  features: {
    authentication: boolean;
    database: boolean;
    protectedRoutes: boolean;
  };
}

interface SecurityTestResult {
  testName: string;
  passed: boolean;
  vulnerabilities: string[];
  recommendations: string[];
}

class SecurityTestRunner {
  private testProjects: SecurityTestProject[] = [];
  private baseTestDir: string;

  constructor() {
    this.baseTestDir = path.join(tmpdir(), `mcp-security-tests-${Date.now()}`);
  }

  /**
   * Generate project with authentication features for security testing
   */
  async generateSecurityProject(
    name: string,
    features: SecurityTestProject['features']
  ): Promise<SecurityTestProject> {
    const projectPath = path.join(this.baseTestDir, name);
    await fs.ensureDir(projectPath);

    const orchestrator = new TransactionalOrchestrator({
      projectPath,
      projectName: name,
      resumeTransaction: false,
      enableRollback: true
    });

    // Generate project with security features
    await orchestrator.createFullApp({
      core: true,
      database: features.database,
      authentication: features.authentication,
      teamManagement: false,
      payments: false,
      devExperience: false,
      internationalization: false
    });

    // Set up test environment
    await this.setupTestEnvironment(projectPath, features);

    const project: SecurityTestProject = {
      name,
      path: projectPath,
      features
    };

    this.testProjects.push(project);
    return project;
  }

  private async setupTestEnvironment(
    projectPath: string,
    features: SecurityTestProject['features']
  ): Promise<void> {
    const envPath = path.join(projectPath, '.env');
    const envContent = `
DATABASE_URL="sqlite:test-security.db"
AUTH_SECRET="${crypto.randomBytes(32).toString('hex')}"
BASE_URL="http://localhost:3000"
NODE_ENV="test"
`.trim();

    await fs.writeFile(envPath, envContent);

    // Create test security data
    const securityTestPath = path.join(projectPath, 'security-test-data.json');
    const testData = {
      testUsers: [
        {
          email: 'admin@test.com',
          password: 'Admin123!@#',
          role: 'admin'
        },
        {
          email: 'user@test.com',
          password: 'User123!@#',
          role: 'user'
        },
        {
          email: 'attacker@malicious.com',
          password: 'password',
          role: 'user'
        }
      ],
      maliciousInputs: [
        '<script>alert("xss")</script>',
        '"; DROP TABLE users; --',
        '../../../etc/passwd',
        '{{7*7}}',
        '${7*7}',
        'javascript:alert("xss")',
        '<img src="x" onerror="alert(1)">',
        '\' OR \'1\'=\'1\' --',
        '%3Cscript%3Ealert%281%29%3C%2Fscript%3E'
      ]
    };

    await fs.writeJSON(securityTestPath, testData, { spaces: 2 });
  }

  async startDevServer(project: SecurityTestProject, port: number = 3000): Promise<string> {
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

  /**
   * Test authentication code for common vulnerabilities
   */
  async testAuthenticationSecurity(project: SecurityTestProject): Promise<SecurityTestResult> {
    const vulnerabilities: string[] = [];
    const recommendations: string[] = [];

    try {
      // Test 1: Check password hashing implementation
      const authFiles = [
        path.join(project.path, 'libs/auth/password.ts'),
        path.join(project.path, 'libs/auth/auth.ts'),
        path.join(project.path, 'actions/auth.ts')
      ];

      let hasPasswordHashing = false;
      let usesSecureHashing = false;

      for (const authFile of authFiles) {
        if (await fs.pathExists(authFile)) {
          const content = await fs.readFile(authFile, 'utf-8');

          // Check for password hashing
          if (content.includes('hash') || content.includes('bcrypt') || content.includes('argon2')) {
            hasPasswordHashing = true;

            // Check for secure hashing algorithms
            if (content.includes('bcrypt') || content.includes('argon2') || content.includes('scrypt')) {
              usesSecureHashing = true;
            }

            // Check for weak hashing
            if (content.includes('md5') || content.includes('sha1') || content.includes('sha256')) {
              vulnerabilities.push('Weak password hashing algorithm detected');
              recommendations.push('Use bcrypt, argon2, or scrypt for password hashing');
            }
          }
        }
      }

      if (!hasPasswordHashing) {
        vulnerabilities.push('No password hashing implementation found');
        recommendations.push('Implement secure password hashing');
      } else if (!usesSecureHashing) {
        vulnerabilities.push('Insecure password hashing method');
        recommendations.push('Use bcrypt or argon2 for password hashing');
      }

      // Test 2: Check session management
      const sessionFiles = [
        path.join(project.path, 'libs/auth/session.ts'),
        path.join(project.path, 'libs/auth/jwt.ts'),
        path.join(project.path, 'middleware.ts')
      ];

      let hasSessionManagement = false;
      let usesSecureJWT = false;

      for (const sessionFile of sessionFiles) {
        if (await fs.pathExists(sessionFile)) {
          const content = await fs.readFile(sessionFile, 'utf-8');

          if (content.includes('jwt') || content.includes('session') || content.includes('token')) {
            hasSessionManagement = true;

            // Check for secure JWT implementation
            if (content.includes('jose') || content.includes('jsonwebtoken')) {
              usesSecureJWT = true;

              // Check for JWT best practices
              if (!content.includes('expiresIn') && !content.includes('exp')) {
                vulnerabilities.push('JWT tokens without expiration');
                recommendations.push('Set expiration time for JWT tokens');
              }

              if (!content.includes('secret') && !content.includes('key')) {
                vulnerabilities.push('JWT without proper secret management');
                recommendations.push('Use strong JWT secrets from environment variables');
              }
            }
          }
        }
      }

      if (!hasSessionManagement) {
        vulnerabilities.push('No session management implementation found');
        recommendations.push('Implement secure session management');
      }

      // Test 3: Check environment variable security
      const envExample = path.join(project.path, '.env.example');
      if (await fs.pathExists(envExample)) {
        const envContent = await fs.readFile(envExample, 'utf-8');

        if (envContent.includes('password') || envContent.includes('secret')) {
          // Check if actual secrets are exposed
          const secretPattern = /=[a-zA-Z0-9+/]{20,}/;
          if (secretPattern.test(envContent)) {
            vulnerabilities.push('Potential secrets in .env.example file');
            recommendations.push('Use placeholder values in .env.example');
          }
        }

        if (!envContent.includes('AUTH_SECRET')) {
          vulnerabilities.push('Missing AUTH_SECRET in environment configuration');
          recommendations.push('Add AUTH_SECRET environment variable');
        }
      }

      // Test 4: Check middleware security
      const middlewarePath = path.join(project.path, 'middleware.ts');
      if (await fs.pathExists(middlewarePath)) {
        const middlewareContent = await fs.readFile(middlewarePath, 'utf-8');

        // Check for CSRF protection
        if (!middlewareContent.includes('csrf') && !middlewareContent.includes('origin')) {
          recommendations.push('Consider implementing CSRF protection in middleware');
        }

        // Check for security headers
        if (!middlewareContent.includes('X-Frame-Options') &&
            !middlewareContent.includes('X-Content-Type-Options')) {
          recommendations.push('Add security headers in middleware');
        }
      }

      return {
        testName: 'Authentication Security',
        passed: vulnerabilities.length === 0,
        vulnerabilities,
        recommendations
      };

    } catch (error) {
      return {
        testName: 'Authentication Security',
        passed: false,
        vulnerabilities: [`Test execution failed: ${error instanceof Error ? error.message : String(error)}`],
        recommendations: ['Fix test execution issues']
      };
    }
  }

  /**
   * Test for SQL injection vulnerabilities
   */
  async testSQLInjection(project: SecurityTestProject): Promise<SecurityTestResult> {
    const vulnerabilities: string[] = [];
    const recommendations: string[] = [];

    try {
      // Look for database query files
      const dbFiles = await this.findFiles(project.path, /\.(ts|js)$/, ['models', 'libs', 'actions']);

      for (const dbFile of dbFiles) {
        const content = await fs.readFile(dbFile, 'utf-8');

        // Check for raw SQL queries
        const rawSQLPattern = /(?:query|execute)\s*\(\s*["`'][^"`']*\${[^}]*}[^"`']*["`']/gi;
        if (rawSQLPattern.test(content)) {
          vulnerabilities.push(`Potential SQL injection in ${path.relative(project.path, dbFile)}`);
          recommendations.push('Use parameterized queries or ORM methods');
        }

        // Check for unsafe string concatenation in SQL
        const concatPattern = /['"`]\s*\+\s*[^+\s]*\s*\+\s*['"`]/g;
        if (concatPattern.test(content) && (content.includes('SELECT') || content.includes('INSERT') || content.includes('UPDATE'))) {
          vulnerabilities.push(`String concatenation in SQL query in ${path.relative(project.path, dbFile)}`);
          recommendations.push('Use parameterized queries instead of string concatenation');
        }

        // Check for Drizzle ORM usage (good practice)
        if (content.includes('drizzle') || content.includes('db.select') || content.includes('db.insert')) {
          // Good - using ORM
        } else if (content.includes('query') || content.includes('execute')) {
          recommendations.push(`Consider using Drizzle ORM in ${path.relative(project.path, dbFile)}`);
        }
      }

      return {
        testName: 'SQL Injection Prevention',
        passed: vulnerabilities.length === 0,
        vulnerabilities,
        recommendations
      };

    } catch (error) {
      return {
        testName: 'SQL Injection Prevention',
        passed: false,
        vulnerabilities: [`Test execution failed: ${error instanceof Error ? error.message : String(error)}`],
        recommendations: ['Fix test execution issues']
      };
    }
  }

  /**
   * Test for Cross-Site Scripting (XSS) vulnerabilities
   */
  async testXSSPrevention(project: SecurityTestProject): Promise<SecurityTestResult> {
    const vulnerabilities: string[] = [];
    const recommendations: string[] = [];

    try {
      // Look for React component files
      const componentFiles = await this.findFiles(project.path, /\.(tsx|jsx)$/, ['components', 'app']);

      for (const componentFile of componentFiles) {
        const content = await fs.readFile(componentFile, 'utf-8');

        // Check for dangerous innerHTML usage
        if (content.includes('dangerouslySetInnerHTML')) {
          vulnerabilities.push(`Potentially unsafe HTML injection in ${path.relative(project.path, componentFile)}`);
          recommendations.push('Sanitize HTML content when using dangerouslySetInnerHTML');
        }

        // Check for eval usage
        if (content.includes('eval(') || content.includes('Function(')) {
          vulnerabilities.push(`Code execution vulnerability in ${path.relative(project.path, componentFile)}`);
          recommendations.push('Avoid using eval() or Function() constructor');
        }

        // Check for direct DOM manipulation that could be unsafe
        const unsafeDOMPattern = /\.innerHTML\s*=\s*[^;]*[`$]/;
        if (unsafeDOMPattern.test(content)) {
          vulnerabilities.push(`Unsafe DOM manipulation in ${path.relative(project.path, componentFile)}`);
          recommendations.push('Use React state and JSX instead of direct DOM manipulation');
        }

        // Check for window.location usage without validation
        if (content.includes('window.location') && !content.includes('validate')) {
          recommendations.push(`Consider validating URL redirects in ${path.relative(project.path, componentFile)}`);
        }
      }

      return {
        testName: 'XSS Prevention',
        passed: vulnerabilities.length === 0,
        vulnerabilities,
        recommendations
      };

    } catch (error) {
      return {
        testName: 'XSS Prevention',
        passed: false,
        vulnerabilities: [`Test execution failed: ${error instanceof Error ? error.message : String(error)}`],
        recommendations: ['Fix test execution issues']
      };
    }
  }

  /**
   * Test authentication bypass vulnerabilities
   */
  async testAuthenticationBypass(project: SecurityTestProject): Promise<SecurityTestResult> {
    const vulnerabilities: string[] = [];
    const recommendations: string[] = [];

    try {
      // Check middleware implementation
      const middlewarePath = path.join(project.path, 'middleware.ts');
      if (await fs.pathExists(middlewarePath)) {
        const middlewareContent = await fs.readFile(middlewarePath, 'utf-8');

        // Check for proper authentication checks
        if (!middlewareContent.includes('auth') && !middlewareContent.includes('session') && !middlewareContent.includes('token')) {
          vulnerabilities.push('Middleware does not implement authentication checks');
          recommendations.push('Implement authentication verification in middleware');
        }

        // Check for proper route protection
        if (middlewareContent.includes('/dashboard') || middlewareContent.includes('/admin')) {
          if (!middlewareContent.includes('redirect') && !middlewareContent.includes('NextResponse.redirect')) {
            vulnerabilities.push('Protected routes may not redirect unauthenticated users');
            recommendations.push('Ensure protected routes redirect to login');
          }
        }

        // Check for authentication bypass patterns
        if (middlewareContent.includes('// TODO') || middlewareContent.includes('// FIXME')) {
          recommendations.push('Complete TODO items in authentication middleware');
        }
      } else if (project.features.protectedRoutes) {
        vulnerabilities.push('No middleware found for route protection');
        recommendations.push('Implement middleware for protecting routes');
      }

      // Check API route protection
      const apiFiles = await this.findFiles(project.path, /route\.(ts|js)$/, ['app/api']);

      for (const apiFile of apiFiles) {
        const content = await fs.readFile(apiFile, 'utf-8');

        // Check if API routes have authentication
        if (content.includes('export async function POST') || content.includes('export async function PUT')) {
          if (!content.includes('auth') && !content.includes('session') && !content.includes('verify')) {
            const relativePath = path.relative(project.path, apiFile);
            if (!relativePath.includes('public') && !relativePath.includes('webhook')) {
              vulnerabilities.push(`API route may lack authentication: ${relativePath}`);
              recommendations.push('Add authentication checks to sensitive API routes');
            }
          }
        }
      }

      return {
        testName: 'Authentication Bypass Prevention',
        passed: vulnerabilities.length === 0,
        vulnerabilities,
        recommendations
      };

    } catch (error) {
      return {
        testName: 'Authentication Bypass Prevention',
        passed: false,
        vulnerabilities: [`Test execution failed: ${error instanceof Error ? error.message : String(error)}`],
        recommendations: ['Fix test execution issues']
      };
    }
  }

  /**
   * Test for insecure direct object references
   */
  async testInsecureDirectObjectReferences(project: SecurityTestProject): Promise<SecurityTestResult> {
    const vulnerabilities: string[] = [];
    const recommendations: string[] = [];

    try {
      // Look for API routes and actions
      const actionFiles = await this.findFiles(project.path, /\.(ts|js)$/, ['actions', 'app/api']);

      for (const actionFile of actionFiles) {
        const content = await fs.readFile(actionFile, 'utf-8');

        // Check for direct ID usage without authorization
        const directIdPattern = /params\.id|searchParams\.get\(['"`]id['"`]\)|\.findUnique\(\s*{\s*where:\s*{\s*id:/g;
        if (directIdPattern.test(content)) {
          if (!content.includes('userId') && !content.includes('authorize') && !content.includes('owner')) {
            const relativePath = path.relative(project.path, actionFile);
            vulnerabilities.push(`Potential insecure direct object reference in ${relativePath}`);
            recommendations.push('Verify user ownership before accessing resources by ID');
          }
        }

        // Check for user context in database queries
        if (content.includes('findMany') || content.includes('findFirst') || content.includes('findUnique')) {
          if (!content.includes('userId') && !content.includes('where') && !content.includes('session')) {
            const relativePath = path.relative(project.path, actionFile);
            recommendations.push(`Consider adding user context to queries in ${relativePath}`);
          }
        }
      }

      return {
        testName: 'Insecure Direct Object References',
        passed: vulnerabilities.length === 0,
        vulnerabilities,
        recommendations
      };

    } catch (error) {
      return {
        testName: 'Insecure Direct Object References',
        passed: false,
        vulnerabilities: [`Test execution failed: ${error instanceof Error ? error.message : String(error)}`],
        recommendations: ['Fix test execution issues']
      };
    }
  }

  /**
   * Test environment and configuration security
   */
  async testConfigurationSecurity(project: SecurityTestProject): Promise<SecurityTestResult> {
    const vulnerabilities: string[] = [];
    const recommendations: string[] = [];

    try {
      // Check .env file
      const envPath = path.join(project.path, '.env');
      if (await fs.pathExists(envPath)) {
        const envContent = await fs.readFile(envPath, 'utf-8');

        // Check for weak secrets
        const secretPattern = /AUTH_SECRET\s*=\s*['"`]?([^'"`\n\r]+)['"`]?/;
        const secretMatch = envContent.match(secretPattern);

        if (secretMatch) {
          const secret = secretMatch[1];
          if (secret.length < 32) {
            vulnerabilities.push('AUTH_SECRET is too short (should be at least 32 characters)');
            recommendations.push('Use a strong, randomly generated AUTH_SECRET');
          }

          if (secret === 'your-secret-key' || secret === 'secret' || secret === 'change-me') {
            vulnerabilities.push('Using default or weak AUTH_SECRET');
            recommendations.push('Generate a strong, unique AUTH_SECRET');
          }
        } else {
          vulnerabilities.push('No AUTH_SECRET found in environment');
          recommendations.push('Set a strong AUTH_SECRET environment variable');
        }

        // Check for exposed secrets in production
        if (envContent.includes('NODE_ENV=production')) {
          if (envContent.includes('localhost') || envContent.includes('127.0.0.1')) {
            vulnerabilities.push('Development URLs in production environment');
            recommendations.push('Use production URLs in production environment');
          }
        }
      }

      // Check Next.js configuration
      const nextConfigPath = path.join(project.path, 'next.config.ts');
      if (await fs.pathExists(nextConfigPath)) {
        const configContent = await fs.readFile(nextConfigPath, 'utf-8');

        // Check for security headers
        if (!configContent.includes('headers') && !configContent.includes('X-Frame-Options')) {
          recommendations.push('Add security headers to Next.js configuration');
        }

        // Check for unsafe configurations
        if (configContent.includes('dangerouslyAllowSVG: true')) {
          vulnerabilities.push('Unsafe SVG configuration in Next.js config');
          recommendations.push('Review SVG security settings');
        }
      }

      // Check package.json for vulnerable dependencies
      const packageJsonPath = path.join(project.path, 'package.json');
      if (await fs.pathExists(packageJsonPath)) {
        const packageJson = await fs.readJSON(packageJsonPath);

        // Check for known vulnerable packages (simplified check)
        const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

        const suspiciousPackages = ['lodash', 'moment', 'request'];
        for (const pkg of suspiciousPackages) {
          if (dependencies[pkg]) {
            recommendations.push(`Consider updating or replacing ${pkg} package for security`);
          }
        }
      }

      return {
        testName: 'Configuration Security',
        passed: vulnerabilities.length === 0,
        vulnerabilities,
        recommendations
      };

    } catch (error) {
      return {
        testName: 'Configuration Security',
        passed: false,
        vulnerabilities: [`Test execution failed: ${error instanceof Error ? error.message : String(error)}`],
        recommendations: ['Fix test execution issues']
      };
    }
  }

  /**
   * Helper to find files recursively
   */
  private async findFiles(basePath: string, pattern: RegExp, directories?: string[]): Promise<string[]> {
    const files: string[] = [];

    const searchDirs = directories ? directories.map(dir => path.join(basePath, dir)) : [basePath];

    for (const searchDir of searchDirs) {
      if (await fs.pathExists(searchDir)) {
        const items = await fs.readdir(searchDir, { withFileTypes: true });

        for (const item of items) {
          const itemPath = path.join(searchDir, item.name);

          if (item.isDirectory() && !item.name.startsWith('.') && item.name !== 'node_modules') {
            files.push(...await this.findFiles(itemPath, pattern));
          } else if (item.isFile() && pattern.test(item.name)) {
            files.push(itemPath);
          }
        }
      }
    }

    return files;
  }

  /**
   * Cleanup all test projects
   */
  async cleanup(): Promise<void> {
    for (const project of this.testProjects) {
      if (project.devServer) {
        project.devServer.kill('SIGTERM');
      }
    }

    if (await fs.pathExists(this.baseTestDir)) {
      await fs.remove(this.baseTestDir);
    }
  }
}

let testRunner: SecurityTestRunner;

beforeAll(async () => {
  testRunner = new SecurityTestRunner();
  await fs.ensureDir(testRunner['baseTestDir']);
});

afterAll(async () => {
  if (testRunner) {
    await testRunner.cleanup();
  }
});

describe('Security Validation Tests', () => {

  it('should have secure authentication implementation', async () => {
    const project = await testRunner.generateSecurityProject('security-auth', {
      authentication: true,
      database: true,
      protectedRoutes: true
    });

    const result = await testRunner.testAuthenticationSecurity(project);

    // Log results for debugging
    if (result.vulnerabilities.length > 0) {
      console.log('Authentication vulnerabilities found:');
      result.vulnerabilities.forEach(vuln => console.log(`- ${vuln}`));
    }

    if (result.recommendations.length > 0) {
      console.log('Authentication recommendations:');
      result.recommendations.forEach(rec => console.log(`- ${rec}`));
    }

    // Should have minimal critical vulnerabilities
    expect(result.vulnerabilities.length).toBeLessThan(2);

    // Should implement password hashing
    const hasPasswordHashing = !result.vulnerabilities.some(v =>
      v.includes('No password hashing') || v.includes('Insecure password hashing')
    );
    expect(hasPasswordHashing).toBe(true);

  }, 120000);

  it('should prevent SQL injection attacks', async () => {
    const project = await testRunner.generateSecurityProject('security-sql', {
      authentication: true,
      database: true,
      protectedRoutes: false
    });

    const result = await testRunner.testSQLInjection(project);

    // Log results
    if (result.vulnerabilities.length > 0) {
      console.log('SQL injection vulnerabilities found:');
      result.vulnerabilities.forEach(vuln => console.log(`- ${vuln}`));
    }

    // Should have no SQL injection vulnerabilities
    expect(result.vulnerabilities.length).toBe(0);
    expect(result.passed).toBe(true);

  }, 120000);

  it('should prevent XSS attacks', async () => {
    const project = await testRunner.generateSecurityProject('security-xss', {
      authentication: true,
      database: true,
      protectedRoutes: false
    });

    const result = await testRunner.testXSSPrevention(project);

    // Log results
    if (result.vulnerabilities.length > 0) {
      console.log('XSS vulnerabilities found:');
      result.vulnerabilities.forEach(vuln => console.log(`- ${vuln}`));
    }

    // Should have minimal XSS vulnerabilities
    expect(result.vulnerabilities.length).toBeLessThan(2);

    // Should not use dangerous patterns
    const hasDangerousPatterns = result.vulnerabilities.some(v =>
      v.includes('innerHTML') || v.includes('eval') || v.includes('Code execution')
    );
    expect(hasDangerousPatterns).toBe(false);

  }, 120000);

  it('should prevent authentication bypass', async () => {
    const project = await testRunner.generateSecurityProject('security-bypass', {
      authentication: true,
      database: true,
      protectedRoutes: true
    });

    const result = await testRunner.testAuthenticationBypass(project);

    // Log results
    if (result.vulnerabilities.length > 0) {
      console.log('Authentication bypass vulnerabilities found:');
      result.vulnerabilities.forEach(vuln => console.log(`- ${vuln}`));
    }

    // Should have proper authentication checks
    const hasAuthBypass = result.vulnerabilities.some(v =>
      v.includes('does not implement authentication') ||
      v.includes('may not redirect unauthenticated')
    );
    expect(hasAuthBypass).toBe(false);

  }, 120000);

  it('should prevent insecure direct object references', async () => {
    const project = await testRunner.generateSecurityProject('security-idor', {
      authentication: true,
      database: true,
      protectedRoutes: true
    });

    const result = await testRunner.testInsecureDirectObjectReferences(project);

    // Log results
    if (result.vulnerabilities.length > 0) {
      console.log('IDOR vulnerabilities found:');
      result.vulnerabilities.forEach(vuln => console.log(`- ${vuln}`));
    }

    // Should have minimal IDOR issues
    expect(result.vulnerabilities.length).toBeLessThan(3);

  }, 120000);

  it('should have secure configuration', async () => {
    const project = await testRunner.generateSecurityProject('security-config', {
      authentication: true,
      database: true,
      protectedRoutes: true
    });

    const result = await testRunner.testConfigurationSecurity(project);

    // Log results
    if (result.vulnerabilities.length > 0) {
      console.log('Configuration vulnerabilities found:');
      result.vulnerabilities.forEach(vuln => console.log(`- ${vuln}`));
    }

    if (result.recommendations.length > 0) {
      console.log('Configuration recommendations:');
      result.recommendations.slice(0, 3).forEach(rec => console.log(`- ${rec}`));
    }

    // Should have secure authentication secret
    const hasWeakSecret = result.vulnerabilities.some(v =>
      v.includes('AUTH_SECRET is too short') ||
      v.includes('Using default or weak AUTH_SECRET') ||
      v.includes('No AUTH_SECRET found')
    );
    expect(hasWeakSecret).toBe(false);

    // Should have minimal configuration issues
    expect(result.vulnerabilities.length).toBeLessThan(2);

  }, 120000);

  it('should generate comprehensive security report', async () => {
    const project = await testRunner.generateSecurityProject('security-comprehensive', {
      authentication: true,
      database: true,
      protectedRoutes: true
    });

    // Run all security tests
    const results = await Promise.all([
      testRunner.testAuthenticationSecurity(project),
      testRunner.testSQLInjection(project),
      testRunner.testXSSPrevention(project),
      testRunner.testAuthenticationBypass(project),
      testRunner.testInsecureDirectObjectReferences(project),
      testRunner.testConfigurationSecurity(project)
    ]);

    // Generate summary
    const totalVulnerabilities = results.reduce((sum, r) => sum + r.vulnerabilities.length, 0);
    const totalRecommendations = results.reduce((sum, r) => sum + r.recommendations.length, 0);
    const passedTests = results.filter(r => r.passed).length;

    console.log(`\nSecurity Test Summary:`);
    console.log(`- Tests passed: ${passedTests}/${results.length}`);
    console.log(`- Total vulnerabilities: ${totalVulnerabilities}`);
    console.log(`- Total recommendations: ${totalRecommendations}`);

    // At least 50% of security tests should pass
    expect(passedTests / results.length).toBeGreaterThan(0.5);

    // Should have reasonable security posture
    expect(totalVulnerabilities).toBeLessThan(10);

  }, 180000);

  it('should handle edge cases securely', async () => {
    const project = await testRunner.generateSecurityProject('security-edge-cases', {
      authentication: true,
      database: true,
      protectedRoutes: true
    });

    // Test that security files exist
    const securityCriticalFiles = [
      path.join(project.path, 'middleware.ts'),
      path.join(project.path, '.env'),
      path.join(project.path, '.env.example')
    ];

    for (const file of securityCriticalFiles) {
      if (await fs.pathExists(file)) {
        const stats = await fs.stat(file);
        expect(stats.isFile()).toBe(true);
        expect(stats.size).toBeGreaterThan(0);
      }
    }

    // Ensure no sensitive files are accidentally created
    const sensitiveFiles = [
      path.join(project.path, '.env.production'),
      path.join(project.path, 'secrets.json'),
      path.join(project.path, 'private.key')
    ];

    for (const file of sensitiveFiles) {
      expect(await fs.pathExists(file)).toBe(false);
    }

  }, 120000);

});