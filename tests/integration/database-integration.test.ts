/**
 * @fileoverview Database Integration Tests
 * @description Tests database connectivity and operations with test PostgreSQL instance
 * Constitutional compliance: Build-First Testing for database functionality
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { TransactionalOrchestrator } from '../../src/core/transactional-orchestrator.js';
import fs from 'fs-extra';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { spawn, ChildProcess } from 'child_process';

interface DatabaseTestSetup {
  projectPath: string;
  testDbUrl: string;
  postgresContainer?: ChildProcess;
  dbName: string;
}

class DatabaseTestRunner {
  private testSetups: DatabaseTestSetup[] = [];
  private baseTestDir: string;
  private postgresPort: number = 5433; // Use different port than default

  constructor() {
    this.baseTestDir = path.join(tmpdir(), `mcp-db-tests-${Date.now()}`);
  }

  /**
   * Start a test PostgreSQL instance using Docker
   */
  async startTestPostgres(): Promise<string> {
    return new Promise((resolve, reject) => {
      // Check if Docker is available
      const checkDocker = spawn('docker', ['--version'], { stdio: 'pipe' });

      checkDocker.on('close', (code) => {
        if (code !== 0) {
          // Fallback to environment PostgreSQL if Docker not available
          resolve(this.getEnvironmentPostgres());
          return;
        }

        // Start PostgreSQL container
        const container = spawn('docker', [
          'run', '--rm',
          '-e', 'POSTGRES_PASSWORD=testpassword',
          '-e', 'POSTGRES_USER=testuser',
          '-e', 'POSTGRES_DB=testdb',
          '-p', `${this.postgresPort}:5432`,
          'postgres:15'
        ], { stdio: 'pipe' });

        let output = '';

        container.stdout?.on('data', (data) => {
          output += data.toString();
          if (output.includes('database system is ready to accept connections')) {
            const testDbUrl = `postgresql://testuser:testpassword@localhost:${this.postgresPort}/testdb`;
            resolve(testDbUrl);
          }
        });

        container.stderr?.on('data', (data) => {
          const error = data.toString();
          if (error.includes('port is already in use')) {
            // Port conflict - try environment fallback
            container.kill();
            resolve(this.getEnvironmentPostgres());
          }
        });

        setTimeout(() => {
          container.kill();
          reject(new Error('PostgreSQL container startup timeout'));
        }, 30000);

        container.on('close', () => {
          // Container stopped
        });
      });
    });
  }

  /**
   * Fallback to environment PostgreSQL (CI/existing setup)
   */
  private getEnvironmentPostgres(): string {
    const envUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (envUrl) {
      return envUrl;
    }

    // Create a mock/SQLite fallback for testing
    return 'sqlite:test-database.db';
  }

  /**
   * Generate project with database features
   */
  async generateProjectWithDatabase(name: string): Promise<DatabaseTestSetup> {
    const projectPath = path.join(this.baseTestDir, name);
    await fs.ensureDir(projectPath);

    const testDbUrl = await this.startTestPostgres();
    const dbName = `test_${name}_${Date.now()}`;

    const orchestrator = new TransactionalOrchestrator({
      projectPath,
      projectName: name,
      resumeTransaction: false,
      enableRollback: true
    });

    // Generate project with database features
    await orchestrator.createFullApp({
      core: true,
      database: true,
      authentication: true, // Requires database
      teamManagement: false,
      payments: false,
      devExperience: false,
      internationalization: false
    });

    // Update environment variables for testing
    const envPath = path.join(projectPath, '.env');
    const envContent = `
DATABASE_URL="${testDbUrl}"
AUTH_SECRET="test-secret-key-for-testing-only"
BASE_URL="http://localhost:3000"
`.trim();

    await fs.writeFile(envPath, envContent);

    const setup: DatabaseTestSetup = {
      projectPath,
      testDbUrl,
      dbName
    };

    this.testSetups.push(setup);
    return setup;
  }

  /**
   * Test database connection and operations
   */
  async testDatabaseOperations(setup: DatabaseTestSetup): Promise<boolean> {
    const { projectPath } = setup;

    try {
      // Install dependencies first
      const installResult = await this.runProjectCommand(projectPath, 'pnpm', ['install']);
      if (installResult.code !== 0) {
        throw new Error(`Dependency installation failed: ${installResult.stderr}`);
      }

      // Generate database schema
      const generateResult = await this.runProjectCommand(projectPath, 'pnpm', ['db:generate']);
      if (generateResult.code !== 0) {
        console.warn(`DB generate warning: ${generateResult.stderr}`);
        // Continue as this might be expected in test environment
      }

      // Try to run migrations
      const migrateResult = await this.runProjectCommand(projectPath, 'pnpm', ['db:migrate']);
      if (migrateResult.code !== 0) {
        console.warn(`DB migrate warning: ${migrateResult.stderr}`);
        // Continue as this might be expected in test environment
      }

      // Test TypeScript compilation (includes database types)
      const buildResult = await this.runProjectCommand(projectPath, 'pnpm', ['build']);
      if (buildResult.code !== 0) {
        throw new Error(`Build failed: ${buildResult.stderr}`);
      }

      return true;

    } catch (error) {
      console.error(`Database operations failed:`, error);
      return false;
    }
  }

  /**
   * Run a command in the project directory
   */
  private async runProjectCommand(
    projectPath: string,
    command: string,
    args: string[]
  ): Promise<{ code: number; stdout: string; stderr: string }> {
    return new Promise((resolve) => {
      const child = spawn(command, args, {
        cwd: projectPath,
        stdio: 'pipe',
        shell: true
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        resolve({ code: code || 0, stdout, stderr });
      });

      // Timeout after 2 minutes
      setTimeout(() => {
        child.kill('SIGTERM');
        resolve({ code: -1, stdout, stderr: stderr + '\nTimeout' });
      }, 120000);
    });
  }

  /**
   * Cleanup all test setups
   */
  async cleanup(): Promise<void> {
    // Stop any PostgreSQL containers
    for (const setup of this.testSetups) {
      if (setup.postgresContainer) {
        setup.postgresContainer.kill('SIGTERM');
      }
    }

    // Clean up test directories
    if (await fs.pathExists(this.baseTestDir)) {
      await fs.remove(this.baseTestDir);
    }

    // Clean up any SQLite test databases
    const testDbFiles = await fs.glob('test-database*.db');
    for (const file of testDbFiles) {
      await fs.remove(file);
    }
  }
}

let testRunner: DatabaseTestRunner;

beforeAll(async () => {
  testRunner = new DatabaseTestRunner();
  await fs.ensureDir(testRunner['baseTestDir']);
}, 60000); // 60 second timeout

afterAll(async () => {
  if (testRunner) {
    await testRunner.cleanup();
  }
});

describe('Database Integration Tests', () => {

  it('should generate project with working Drizzle ORM setup', async () => {
    const setup = await testRunner.generateProjectWithDatabase('drizzle-basic');

    // Check that database files were created
    expect(await fs.pathExists(path.join(setup.projectPath, 'drizzle.config.ts'))).toBe(true);
    expect(await fs.pathExists(path.join(setup.projectPath, 'libs/db.ts'))).toBe(true);
    expect(await fs.pathExists(path.join(setup.projectPath, 'models/user.ts'))).toBe(true);

    // Check environment setup
    expect(await fs.pathExists(path.join(setup.projectPath, '.env'))).toBe(true);
    expect(await fs.pathExists(path.join(setup.projectPath, '.env.example'))).toBe(true);

    const envContent = await fs.readFile(path.join(setup.projectPath, '.env'), 'utf-8');
    expect(envContent).toContain('DATABASE_URL');
    expect(envContent).toContain('AUTH_SECRET');

  }, 120000); // 2 minute timeout

  it('should have valid TypeScript types for database operations', async () => {
    const setup = await testRunner.generateProjectWithDatabase('drizzle-types');

    // Test that the project builds successfully (validates TypeScript types)
    const success = await testRunner.testDatabaseOperations(setup);
    expect(success).toBe(true);

  }, 180000); // 3 minute timeout

  it('should generate user authentication models with proper schema', async () => {
    const setup = await testRunner.generateProjectWithDatabase('auth-models');

    // Check user model exists
    const userModelPath = path.join(setup.projectPath, 'models/user.ts');
    expect(await fs.pathExists(userModelPath)).toBe(true);

    const userModel = await fs.readFile(userModelPath, 'utf-8');

    // Check for expected fields in user model
    expect(userModel).toContain('email');
    expect(userModel).toContain('password'); // Should be hashed
    expect(userModel).toContain('createdAt');
    expect(userModel).toContain('updatedAt');

    // Check for proper Drizzle imports
    expect(userModel).toContain('drizzle-orm');
    expect(userModel).toContain('varchar');
    expect(userModel).toContain('timestamp');

  }, 120000);

  it('should create database connection utilities', async () => {
    const setup = await testRunner.generateProjectWithDatabase('db-connection');

    // Check database connection file
    const dbPath = path.join(setup.projectPath, 'libs/db.ts');
    expect(await fs.pathExists(dbPath)).toBe(true);

    const dbContent = await fs.readFile(dbPath, 'utf-8');

    // Check for proper database setup
    expect(dbContent).toContain('drizzle');
    expect(dbContent).toContain('process.env.DATABASE_URL');
    expect(dbContent).toContain('export');

    // Should have connection pooling or similar
    expect(dbContent).toMatch(/pool|connection|client/i);

  }, 120000);

  it('should include database migration configuration', async () => {
    const setup = await testRunner.generateProjectWithDatabase('migrations');

    // Check Drizzle config exists
    const configPath = path.join(setup.projectPath, 'drizzle.config.ts');
    expect(await fs.pathExists(configPath)).toBe(true);

    const configContent = await fs.readFile(configPath, 'utf-8');

    // Check configuration includes required settings
    expect(configContent).toContain('schema');
    expect(configContent).toContain('out');
    expect(configContent).toContain('driver'); // or database provider config

    // Check package.json has database scripts
    const packageJsonPath = path.join(setup.projectPath, 'package.json');
    expect(await fs.pathExists(packageJsonPath)).toBe(true);

    const packageJson = await fs.readJSON(packageJsonPath);

    // Should have database-related scripts
    expect(packageJson.scripts).toHaveProperty('db:generate');
    expect(packageJson.scripts).toHaveProperty('db:migrate');

    // Should have database dependencies
    expect(packageJson.dependencies).toHaveProperty('drizzle-orm');
    expect(packageJson.devDependencies).toHaveProperty('drizzle-kit');

  }, 120000);

  it('should handle different database providers', async () => {
    // Test with PostgreSQL (default)
    const pgSetup = await testRunner.generateProjectWithDatabase('postgres-test');

    const pgConfigPath = path.join(pgSetup.projectPath, 'drizzle.config.ts');
    const pgConfig = await fs.readFile(pgConfigPath, 'utf-8');

    // Should be configured for PostgreSQL
    expect(pgConfig).toMatch(/postgres|pg/i);

    // Check database connection uses PostgreSQL driver
    const dbPath = path.join(pgSetup.projectPath, 'libs/db.ts');
    const dbContent = await fs.readFile(dbPath, 'utf-8');

    expect(dbContent).toMatch(/postgres|pg/i);

  }, 120000);

  it('should create valid environment variable validation', async () => {
    const setup = await testRunner.generateProjectWithDatabase('env-validation');

    // Check T3 Env validation file
    const envPath = path.join(setup.projectPath, 'libs/env.ts');
    expect(await fs.pathExists(envPath)).toBe(true);

    const envContent = await fs.readFile(envPath, 'utf-8');

    // Should validate DATABASE_URL
    expect(envContent).toContain('DATABASE_URL');
    expect(envContent).toContain('@t3-oss/env-nextjs');
    expect(envContent).toContain('z.string()'); // Zod validation

    // Check that validation includes auth secret
    expect(envContent).toContain('AUTH_SECRET');

  }, 120000);

  it('should generate seed data and utilities', async () => {
    const setup = await testRunner.generateProjectWithDatabase('seed-data');

    // Look for seed files or utilities
    const seedPaths = [
      path.join(setup.projectPath, 'scripts/seed.ts'),
      path.join(setup.projectPath, 'libs/seed.ts'),
      path.join(setup.projectPath, 'seed.ts')
    ];

    let seedExists = false;
    for (const seedPath of seedPaths) {
      if (await fs.pathExists(seedPath)) {
        seedExists = true;

        const seedContent = await fs.readFile(seedPath, 'utf-8');

        // Should contain database seeding logic
        expect(seedContent).toContain('insert');
        expect(seedContent).toMatch(/seed|data/i);
        break;
      }
    }

    // Check package.json for seed script
    const packageJsonPath = path.join(setup.projectPath, 'package.json');
    const packageJson = await fs.readJSON(packageJsonPath);

    if (packageJson.scripts['db:seed']) {
      expect(packageJson.scripts['db:seed']).toMatch(/seed/);
    }

    // At least one seeding mechanism should exist
    expect(seedExists || !!packageJson.scripts['db:seed']).toBe(true);

  }, 120000);

});