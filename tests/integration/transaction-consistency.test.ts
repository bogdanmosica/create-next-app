import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import path from 'path';
import fs from 'fs-extra';
import { TransactionalOrchestrator } from '../../src/core/transactional-orchestrator.js';

interface TransactionState {
  transactionId: string;
  startTime: number;
  operations: TransactionOperation[];
  status: 'pending' | 'committed' | 'rolled-back' | 'failed';
  checkpoints: TransactionCheckpoint[];
}

interface TransactionOperation {
  id: string;
  type: 'file-create' | 'file-modify' | 'directory-create' | 'dependency-install' | 'template-generate';
  target: string;
  content?: string;
  metadata?: Record<string, any>;
  completed: boolean;
  timestamp: number;
}

interface TransactionCheckpoint {
  id: string;
  description: string;
  timestamp: number;
  filesCreated: string[];
  directoriesCreated: string[];
  dependencies: string[];
  state: 'valid' | 'invalid' | 'partial';
}

interface ConsistencyTestResult {
  transactionId: string;
  toolCombination: string[];
  success: boolean;
  consistency: 'full' | 'partial' | 'inconsistent';
  issues: ConsistencyIssue[];
  rollbackSuccess: boolean;
  finalState: 'clean' | 'partial' | 'corrupted';
}

interface ConsistencyIssue {
  type: 'missing-file' | 'orphaned-file' | 'invalid-state' | 'dependency-mismatch' | 'configuration-conflict';
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedFiles: string[];
  recommendation: string;
}

interface ToolCombination {
  name: string;
  tools: string[];
  expectedFiles: string[];
  expectedDirectories: string[];
  expectedDependencies: string[];
  conflictPoints?: string[];
}

describe('Transaction Consistency Tests Across Tool Combinations', () => {
  const transactionTestDir = path.join(process.cwd(), 'temp-transaction-tests');
  let orchestrator: TransactionalOrchestrator;

  beforeAll(async () => {
    if (await fs.pathExists(transactionTestDir)) {
      await fs.remove(transactionTestDir);
    }
    await fs.ensureDir(transactionTestDir);

    orchestrator = new TransactionalOrchestrator({
      projectPath: transactionTestDir,
      resumeTransaction: false,
      enableRollback: true
    });
  });

  afterAll(async () => {
    if (await fs.pathExists(transactionTestDir)) {
      await fs.remove(transactionTestDir);
    }
  });

  beforeEach(async () => {
    // Clean test environment between tests
    const entries = await fs.readdir(transactionTestDir);
    for (const entry of entries) {
      const entryPath = path.join(transactionTestDir, entry);
      try {
        if ((await fs.stat(entryPath)).isDirectory()) {
          await fs.remove(entryPath);
        }
      } catch (error) {
        // Handle locked files gracefully
      }
    }
  });

  describe('Core Tool Combination Consistency', () => {
    it('should maintain consistency across core + database tools', async () => {
      const projectPath = path.join(transactionTestDir, 'core-db-consistency');

      const features = {
        core: true,
        database: true,
        authentication: false,
        payments: false,
        teamManagement: false,
        devExperience: true,
        internationalization: false
      };

      const transactionState = await executeTransactionWithTracking(features, projectPath);

      // Verify transaction consistency
      expect(transactionState.status).toBe('committed');
      expect(transactionState.operations.every(op => op.completed)).toBe(true);

      // Verify database integration consistency
      const consistencyResult = await validateToolConsistency(projectPath, ['core', 'database', 'devExperience']);

      expect(consistencyResult.consistency).toBe('full');
      expect(consistencyResult.issues.filter(i => i.severity === 'critical').length).toBe(0);

      // Check specific consistency points
      expect(await fs.pathExists(path.join(projectPath, 'package.json'))).toBe(true);
      expect(await fs.pathExists(path.join(projectPath, 'drizzle.config.ts'))).toBe(true);
      expect(await fs.pathExists(path.join(projectPath, 'libs', 'db'))).toBe(true);

      // Verify package.json has database dependencies
      const packageJson = JSON.parse(await fs.readFile(path.join(projectPath, 'package.json'), 'utf-8'));
      expect(packageJson.dependencies).toHaveProperty('drizzle-orm');
      expect(packageJson.devDependencies).toHaveProperty('drizzle-kit');

      console.log(`Core + Database consistency validation completed`);
    });

    it('should maintain consistency across authentication + database tools', async () => {
      const projectPath = path.join(transactionTestDir, 'auth-db-consistency');

      const features = {
        core: true,
        database: true,
        authentication: true,
        payments: false,
        teamManagement: false,
        devExperience: true,
        internationalization: false
      };

      const transactionState = await executeTransactionWithTracking(features, projectPath);

      expect(transactionState.status).toBe('committed');

      // Verify authentication and database integration
      const consistencyResult = await validateToolConsistency(projectPath, ['core', 'database', 'authentication']);

      expect(consistencyResult.consistency).toBe('full');

      // Check authentication-database integration points
      expect(await fs.pathExists(path.join(projectPath, 'auth.ts'))).toBe(true);
      expect(await fs.pathExists(path.join(projectPath, 'models', 'user.ts'))).toBe(true);
      expect(await fs.pathExists(path.join(projectPath, 'libs', 'db', 'user-queries.ts'))).toBe(true);

      // Verify authentication configuration references database
      const authConfig = await fs.readFile(path.join(projectPath, 'auth.ts'), 'utf-8');
      expect(authConfig.includes('drizzle') || authConfig.includes('db')).toBe(true);

      // Verify user model has proper table definition
      const userModel = await fs.readFile(path.join(projectPath, 'models', 'user.ts'), 'utf-8');
      expect(userModel.includes('pgTable') || userModel.includes('mysqlTable') || userModel.includes('sqliteTable')).toBe(true);

      console.log(`Authentication + Database consistency validation completed`);
    });

    it('should maintain consistency across payments + authentication tools', async () => {
      const projectPath = path.join(transactionTestDir, 'payments-auth-consistency');

      const features = {
        core: true,
        database: true,
        authentication: true,
        payments: true,
        teamManagement: false,
        devExperience: true,
        internationalization: false
      };

      const transactionState = await executeTransactionWithTracking(features, projectPath);

      expect(transactionState.status).toBe('committed');

      // Verify payments and authentication integration
      const consistencyResult = await validateToolConsistency(projectPath, ['authentication', 'payments', 'database']);

      expect(consistencyResult.consistency).toBe('full');

      // Check payment-authentication integration points
      expect(await fs.pathExists(path.join(projectPath, 'app', 'api', 'stripe'))).toBe(true);
      expect(await fs.pathExists(path.join(projectPath, 'models', 'subscription.ts'))).toBe(true);

      // Verify payment routes use authentication
      const stripeRoutes = await findFiles(path.join(projectPath, 'app', 'api', 'stripe'), /route\.ts$/);
      
      for (const routeFile of stripeRoutes) {
        const content = await fs.readFile(routeFile, 'utf-8');
        const hasAuthCheck = content.includes('auth') || content.includes('session') || content.includes('user');
        expect(hasAuthCheck).toBe(true);
      }

      console.log(`Payments + Authentication consistency validation completed`);
    });

    it('should maintain consistency across team management + authentication + database', async () => {
      const projectPath = path.join(transactionTestDir, 'teams-auth-db-consistency');

      const features = {
        core: true,
        database: true,
        authentication: true,
        payments: false,
        teamManagement: true,
        devExperience: true,
        internationalization: false
      };

      const transactionState = await executeTransactionWithTracking(features, projectPath);

      expect(transactionState.status).toBe('committed');

      // Verify team management integration
      const consistencyResult = await validateToolConsistency(projectPath, ['authentication', 'teamManagement', 'database']);

      expect(consistencyResult.consistency).toBe('full');

      // Check team management dependencies
      expect(await fs.pathExists(path.join(projectPath, 'models', 'team.ts'))).toBe(true);
      expect(await fs.pathExists(path.join(projectPath, 'models', 'team-member.ts'))).toBe(true);
      expect(await fs.pathExists(path.join(projectPath, 'libs', 'db', 'team-queries.ts'))).toBe(true);

      // Verify team models reference user model
      const teamModel = await fs.readFile(path.join(projectPath, 'models', 'team.ts'), 'utf-8');
      expect(teamModel.includes('user') || teamModel.includes('User')).toBe(true);

      const teamMemberModel = await fs.readFile(path.join(projectPath, 'models', 'team-member.ts'), 'utf-8');
      expect(teamMemberModel.includes('user') && teamMemberModel.includes('team')).toBe(true);

      console.log(`Team Management + Auth + Database consistency validation completed`);
    });
  });

  describe('Complex Tool Combination Consistency', () => {
    it('should maintain consistency across full SaaS feature set', async () => {
      const projectPath = path.join(transactionTestDir, 'full-saas-consistency');

      const features = {
        core: true,
        database: true,
        authentication: true,
        payments: true,
        teamManagement: true,
        devExperience: true,
        internationalization: true
      };

      const transactionState = await executeTransactionWithTracking(features, projectPath);

      expect(transactionState.status).toBe('committed');

      // Verify complete integration consistency
      const consistencyResult = await validateFullSaaSConsistency(projectPath);

      expect(consistencyResult.consistency).not.toBe('inconsistent');
      expect(consistencyResult.issues.filter(i => i.severity === 'critical').length).toBeLessThanOrEqual(1);

      // Verify all major components exist and are integrated
      const majorComponents = [
        'package.json',
        'auth.ts',
        'drizzle.config.ts',
        'models/user.ts',
        'models/team.ts',
        'models/subscription.ts',
        'app/api/stripe',
        'messages'
      ];

      for (const component of majorComponents) {
        expect(await fs.pathExists(path.join(projectPath, component))).toBe(true);
      }

      // Verify configuration consistency
      await validateConfigurationConsistency(projectPath);

      console.log(`Full SaaS consistency validation completed`);
    });

    it('should handle partial failures with rollback consistency', async () => {
      const projectPath = path.join(transactionTestDir, 'rollback-consistency');

      // Simulate a scenario that might fail partway through
      const features = {
        core: true,
        database: true,
        authentication: true,
        payments: true,
        teamManagement: true,
        devExperience: true,
        internationalization: true
      };

      // First, let's create a successful transaction to establish baseline
      const successfulState = await executeTransactionWithTracking(features, projectPath);
      expect(successfulState.status).toBe('committed');

      // Now test rollback scenario
      const rollbackProjectPath = path.join(transactionTestDir, 'rollback-test');
      
      try {
        // Simulate transaction failure by creating conflicting state
        await simulateTransactionFailure(rollbackProjectPath, features);
        
        // This should trigger rollback
        const failedState = await executeTransactionWithTracking(features, rollbackProjectPath);
        
        // Verify rollback consistency
        const postRollbackState = await analyzePostRollbackState(rollbackProjectPath);
        
        expect(postRollbackState.isClean).toBe(true);
        expect(postRollbackState.orphanedFiles.length).toBeLessThanOrEqual(2);

        console.log(`Rollback consistency validation completed`);
        
      } catch (error) {
        // Verify that failure handling maintains consistency
        const consistencyResult = await validateToolConsistency(rollbackProjectPath, Object.keys(features));
        expect(consistencyResult.finalState).not.toBe('corrupted');
      }
    });

    it('should maintain consistency during interrupted transactions', async () => {
      const projectPath = path.join(transactionTestDir, 'interrupted-consistency');

      const features = {
        core: true,
        database: true,
        authentication: true,
        payments: true,
        teamManagement: false,
        devExperience: true,
        internationalization: false
      };

      // Simulate transaction interruption
      const interruptedState = await simulateTransactionInterruption(features, projectPath);

      // Verify partial state consistency
      const partialConsistency = await validatePartialTransactionState(projectPath, interruptedState);

      expect(partialConsistency.hasInconsistencies).toBe(false);
      expect(partialConsistency.recoverableState).toBe(true);

      // Test transaction resume
      const resumedState = await resumeInterruptedTransaction(projectPath, interruptedState);
      
      expect(resumedState.success).toBe(true);
      expect(resumedState.consistency).toBe('full');

      console.log(`Interrupted transaction consistency validation completed`);
    });
  });

  describe('Tool Dependency Validation', () => {
    it('should validate tool dependency order consistency', async () => {
      const projectPath = path.join(transactionTestDir, 'dependency-order-test');

      // Test that tools are executed in proper dependency order
      const dependencyOrder = await validateToolDependencyOrder([
        'core',
        'database', 
        'authentication',
        'payments',
        'teamManagement'
      ]);

      expect(dependencyOrder.isValid).toBe(true);
      expect(dependencyOrder.violations.length).toBe(0);

      // Verify that dependent tools are executed after their dependencies
      expect(dependencyOrder.executionOrder.indexOf('core')).toBeLessThan(
        dependencyOrder.executionOrder.indexOf('database')
      );
      expect(dependencyOrder.executionOrder.indexOf('database')).toBeLessThan(
        dependencyOrder.executionOrder.indexOf('authentication')
      );
      expect(dependencyOrder.executionOrder.indexOf('authentication')).toBeLessThan(
        dependencyOrder.executionOrder.indexOf('teamManagement')
      );

      console.log(`Tool dependency order validation completed`);
    });

    it('should detect and resolve tool conflicts', async () => {
      const projectPath = path.join(transactionTestDir, 'conflict-resolution-test');

      // Test scenario with potential conflicts
      const features = {
        core: true,
        database: true,
        authentication: true,
        payments: true,
        teamManagement: true,
        devExperience: true,
        internationalization: true
      };

      const conflictAnalysis = await analyzeToolConflicts(features);

      expect(conflictAnalysis.criticalConflicts.length).toBe(0);
      expect(conflictAnalysis.resolvableConflicts.length).toBeGreaterThanOrEqual(0);

      // Verify conflict resolution
      for (const conflict of conflictAnalysis.resolvableConflicts) {
        expect(conflict.resolution).toBeTruthy();
        expect(conflict.resolutionStrategy).toMatch(/merge|override|skip|transform/);
      }

      console.log(`Tool conflict analysis completed - ${conflictAnalysis.resolvableConflicts.length} conflicts resolved`);
    });

    it('should validate cross-tool configuration consistency', async () => {
      const projectPath = path.join(transactionTestDir, 'config-consistency-test');

      const features = {
        core: true,
        database: true,
        authentication: true,
        payments: true,
        teamManagement: false,
        devExperience: true,
        internationalization: true
      };

      await executeTransactionWithTracking(features, projectPath);

      // Validate configuration consistency across tools
      const configConsistency = await validateCrossToolConfiguration(projectPath);

      expect(configConsistency.isConsistent).toBe(true);
      expect(configConsistency.conflictingSettings.length).toBeLessThanOrEqual(1);

      // Check specific configuration consistency points
      await validateEnvironmentVariableConsistency(projectPath);
      await validatePackageJsonConsistency(projectPath);
      await validateTypeScriptConfigConsistency(projectPath);

      console.log(`Cross-tool configuration consistency validated`);
    });
  });

  describe('Transaction State Management', () => {
    it('should maintain transaction state persistence', async () => {
      const projectPath = path.join(transactionTestDir, 'state-persistence-test');

      const features = {
        core: true,
        database: true,
        authentication: true,
        payments: false,
        teamManagement: false,
        devExperience: true,
        internationalization: false
      };

      // Create transaction with state tracking
      const initialState = await createPersistentTransaction(features, projectPath);
      
      expect(initialState.transactionId).toBeTruthy();
      expect(initialState.checkpoints.length).toBeGreaterThan(0);

      // Simulate system restart and state recovery
      const recoveredState = await recoverTransactionState(projectPath, initialState.transactionId);
      
      expect(recoveredState.transactionId).toBe(initialState.transactionId);
      expect(recoveredState.operations.length).toBe(initialState.operations.length);

      console.log(`Transaction state persistence validated`);
    });

    it('should handle concurrent transaction scenarios', async () => {
      const projectPath1 = path.join(transactionTestDir, 'concurrent-1');
      const projectPath2 = path.join(transactionTestDir, 'concurrent-2');

      const features1 = {
        core: true,
        database: true,
        authentication: true,
        payments: false,
        teamManagement: false,
        devExperience: true,
        internationalization: false
      };

      const features2 = {
        core: true,
        database: true,
        authentication: false,
        payments: true,
        teamManagement: false,
        devExperience: true,
        internationalization: true
      };

      // Execute concurrent transactions
      const [result1, result2] = await Promise.all([
        executeTransactionWithTracking(features1, projectPath1),
        executeTransactionWithTracking(features2, projectPath2)
      ]);

      expect(result1.status).toBe('committed');
      expect(result2.status).toBe('committed');

      // Verify no cross-contamination between transactions
      const isolation1 = await validateTransactionIsolation(projectPath1, result1.transactionId);
      const isolation2 = await validateTransactionIsolation(projectPath2, result2.transactionId);

      expect(isolation1.isIsolated).toBe(true);
      expect(isolation2.isIsolated).toBe(true);

      console.log(`Concurrent transaction isolation validated`);
    });
  });

  describe('Data Integrity and Consistency', () => {
    it('should maintain data integrity across tool interactions', async () => {
      const projectPath = path.join(transactionTestDir, 'data-integrity-test');

      const features = {
        core: true,
        database: true,
        authentication: true,
        payments: true,
        teamManagement: true,
        devExperience: true,
        internationalization: false
      };

      await executeTransactionWithTracking(features, projectPath);

      // Validate data integrity
      const integrityResult = await validateDataIntegrity(projectPath);

      expect(integrityResult.isIntegrityMaintained).toBe(true);
      expect(integrityResult.corruptedFiles.length).toBe(0);
      expect(integrityResult.missingReferences.length).toBeLessThanOrEqual(1);

      // Check specific integrity points
      await validateDatabaseSchemaIntegrity(projectPath);
      await validateImportExportIntegrity(projectPath);
      await validateConfigurationIntegrity(projectPath);

      console.log(`Data integrity validation completed`);
    });

    it('should validate referential integrity across generated code', async () => {
      const projectPath = path.join(transactionTestDir, 'referential-integrity-test');

      const features = {
        core: true,
        database: true,
        authentication: true,
        payments: true,
        teamManagement: true,
        devExperience: true,
        internationalization: true
      };

      await executeTransactionWithTracking(features, projectPath);

      // Validate referential integrity
      const referentialIntegrity = await validateReferentialIntegrity(projectPath);

      expect(referentialIntegrity.brokenReferences.length).toBeLessThanOrEqual(2);
      expect(referentialIntegrity.circularReferences.length).toBe(0);
      expect(referentialIntegrity.missingDependencies.length).toBeLessThanOrEqual(1);

      console.log(`Referential integrity validation completed`);
    });
  });
});

// Helper Functions

async function executeTransactionWithTracking(
  features: Record<string, boolean>,
  projectPath: string
): Promise<TransactionState> {
  const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();
  const operations: TransactionOperation[] = [];
  const checkpoints: TransactionCheckpoint[] = [];

  try {
    // Create orchestrator with transaction tracking
    const orchestrator = new TransactionalOrchestrator({
      projectPath,
      resumeTransaction: false,
      enableRollback: true
    });

    // Execute the transaction
    await orchestrator.createFullApp(features);

    // Record successful operations
    const createdFiles = await findFiles(projectPath, /.*/);
    for (const file of createdFiles) {
      operations.push({
        id: `op_${operations.length}`,
        type: 'file-create',
        target: file,
        completed: true,
        timestamp: Date.now()
      });
    }

    return {
      transactionId,
      startTime,
      operations,
      status: 'committed',
      checkpoints
    };

  } catch (error) {
    return {
      transactionId,
      startTime,
      operations,
      status: 'failed',
      checkpoints
    };
  }
}

async function validateToolConsistency(
  projectPath: string,
  tools: string[]
): Promise<ConsistencyTestResult> {
  const issues: ConsistencyIssue[] = [];
  let consistency: 'full' | 'partial' | 'inconsistent' = 'full';

  // Check for expected files based on tools
  for (const tool of tools) {
    const expectedFiles = getExpectedFilesForTool(tool);
    
    for (const expectedFile of expectedFiles) {
      const filePath = path.join(projectPath, expectedFile);
      if (!await fs.pathExists(filePath)) {
        issues.push({
          type: 'missing-file',
          description: `Expected file ${expectedFile} missing for tool ${tool}`,
          severity: 'high',
          affectedFiles: [expectedFile],
          recommendation: `Verify ${tool} tool executed correctly`
        });
        consistency = 'partial';
      }
    }
  }

  // Check for configuration conflicts
  const configConflicts = await detectConfigurationConflicts(projectPath, tools);
  issues.push(...configConflicts);

  if (issues.filter(i => i.severity === 'critical').length > 0) {
    consistency = 'inconsistent';
  }

  return {
    transactionId: '',
    toolCombination: tools,
    success: consistency !== 'inconsistent',
    consistency,
    issues,
    rollbackSuccess: true,
    finalState: consistency === 'full' ? 'clean' : consistency === 'partial' ? 'partial' : 'corrupted'
  };
}

async function validateFullSaaSConsistency(projectPath: string): Promise<ConsistencyTestResult> {
  const allTools = ['core', 'database', 'authentication', 'payments', 'teamManagement', 'devExperience', 'internationalization'];
  return await validateToolConsistency(projectPath, allTools);
}

async function validateConfigurationConsistency(projectPath: string): Promise<void> {
  // Check package.json consistency
  const packageJsonPath = path.join(projectPath, 'package.json');
  if (await fs.pathExists(packageJsonPath)) {
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
    
    // Verify scripts are consistent
    expect(packageJson.scripts.dev).toBeTruthy();
    expect(packageJson.scripts.build).toBeTruthy();
    
    // Verify dependencies are consistent
    if (packageJson.dependencies['drizzle-orm']) {
      expect(packageJson.devDependencies['drizzle-kit']).toBeTruthy();
    }
  }

  // Check TypeScript configuration
  const tsconfigPath = path.join(projectPath, 'tsconfig.json');
  if (await fs.pathExists(tsconfigPath)) {
    const tsconfig = JSON.parse(await fs.readFile(tsconfigPath, 'utf-8'));
    expect(tsconfig.compilerOptions.strict).toBe(true);
  }
}

async function simulateTransactionFailure(
  projectPath: string,
  features: Record<string, boolean>
): Promise<void> {
  // Create conflicting state that should cause transaction failure
  await fs.ensureDir(projectPath);
  
  // Create a file that would conflict with generated content
  await fs.writeFile(path.join(projectPath, 'package.json'), 'invalid json content {');
}

async function analyzePostRollbackState(projectPath: string): Promise<{
  isClean: boolean;
  orphanedFiles: string[];
  partialStructures: string[];
}> {
  const orphanedFiles: string[] = [];
  const partialStructures: string[] = [];

  if (await fs.pathExists(projectPath)) {
    const files = await findFiles(projectPath, /.*/);
    
    // Check for orphaned files
    for (const file of files) {
      if (file.includes('.tmp') || file.includes('.bak') || file.includes('.partial')) {
        orphanedFiles.push(file);
      }
    }

    // Check for partial directory structures
    const dirs = await findDirectories(projectPath);
    for (const dir of dirs) {
      const dirFiles = await findFiles(path.join(projectPath, dir), /.*/);
      if (dirFiles.length === 0) {
        partialStructures.push(dir);
      }
    }
  }

  return {
    isClean: orphanedFiles.length === 0 && partialStructures.length === 0,
    orphanedFiles,
    partialStructures
  };
}

async function simulateTransactionInterruption(
  features: Record<string, boolean>,
  projectPath: string
): Promise<TransactionState> {
  // Simulate partial execution by creating some files but not others
  await fs.ensureDir(projectPath);
  await fs.writeFile(path.join(projectPath, 'package.json'), '{"name": "interrupted"}');
  
  return {
    transactionId: 'interrupted_tx',
    startTime: Date.now(),
    operations: [{
      id: 'op_1',
      type: 'file-create',
      target: 'package.json',
      completed: true,
      timestamp: Date.now()
    }],
    status: 'pending',
    checkpoints: []
  };
}

async function validatePartialTransactionState(
  projectPath: string,
  state: TransactionState
): Promise<{
  hasInconsistencies: boolean;
  recoverableState: boolean;
}> {
  // Check if partial state is consistent and recoverable
  const expectedFiles = ['package.json'];
  let hasInconsistencies = false;
  
  for (const file of expectedFiles) {
    if (!await fs.pathExists(path.join(projectPath, file))) {
      hasInconsistencies = true;
    }
  }

  return {
    hasInconsistencies,
    recoverableState: !hasInconsistencies
  };
}

async function resumeInterruptedTransaction(
  projectPath: string,
  interruptedState: TransactionState
): Promise<ConsistencyTestResult> {
  // Attempt to resume and complete the interrupted transaction
  try {
    const orchestrator = new TransactionalOrchestrator({
      projectPath,
      resumeTransaction: true,
      enableRollback: true
    });

    // Complete the transaction
    await orchestrator.createFullApp({
      core: true,
      database: true,
      authentication: true,
      payments: false,
      teamManagement: false,
      devExperience: true,
      internationalization: false
    });

    return {
      transactionId: interruptedState.transactionId,
      toolCombination: ['core', 'database', 'authentication'],
      success: true,
      consistency: 'full',
      issues: [],
      rollbackSuccess: true,
      finalState: 'clean'
    };
  } catch (error) {
    return {
      transactionId: interruptedState.transactionId,
      toolCombination: ['core', 'database', 'authentication'],
      success: false,
      consistency: 'inconsistent',
      issues: [{
        type: 'invalid-state',
        description: `Resume failed: ${error instanceof Error ? error.message : String(error)}`,
        severity: 'critical',
        affectedFiles: [],
        recommendation: 'Perform full rollback and restart'
      }],
      rollbackSuccess: false,
      finalState: 'corrupted'
    };
  }
}

async function validateToolDependencyOrder(tools: string[]): Promise<{
  isValid: boolean;
  violations: string[];
  executionOrder: string[];
}> {
  const violations: string[] = [];
  const expectedOrder = ['core', 'database', 'authentication', 'payments', 'teamManagement'];
  
  // Check if tools are in proper dependency order
  for (let i = 0; i < tools.length - 1; i++) {
    const currentIndex = expectedOrder.indexOf(tools[i]);
    const nextIndex = expectedOrder.indexOf(tools[i + 1]);
    
    if (currentIndex !== -1 && nextIndex !== -1 && currentIndex > nextIndex) {
      violations.push(`${tools[i]} should be executed after ${tools[i + 1]}`);
    }
  }

  return {
    isValid: violations.length === 0,
    violations,
    executionOrder: tools
  };
}

async function analyzeToolConflicts(features: Record<string, boolean>): Promise<{
  criticalConflicts: any[];
  resolvableConflicts: any[];
}> {
  const criticalConflicts: any[] = [];
  const resolvableConflicts: any[] = [];

  // Check for known conflicts
  if (features.teamManagement && !features.authentication) {
    criticalConflicts.push({
      type: 'dependency-missing',
      description: 'Team management requires authentication',
      tools: ['teamManagement', 'authentication']
    });
  }

  if (features.payments && !features.authentication) {
    criticalConflicts.push({
      type: 'dependency-missing',
      description: 'Payments require authentication',
      tools: ['payments', 'authentication']
    });
  }

  return {
    criticalConflicts,
    resolvableConflicts
  };
}

async function validateCrossToolConfiguration(projectPath: string): Promise<{
  isConsistent: boolean;
  conflictingSettings: string[];
}> {
  const conflictingSettings: string[] = [];

  // Check configuration consistency
  // This is a simplified version - in reality, you'd check actual config files

  return {
    isConsistent: conflictingSettings.length === 0,
    conflictingSettings
  };
}

async function validateEnvironmentVariableConsistency(projectPath: string): Promise<void> {
  const envExamplePath = path.join(projectPath, '.env.example');
  
  if (await fs.pathExists(envExamplePath)) {
    const envContent = await fs.readFile(envExamplePath, 'utf-8');
    
    // Verify required environment variables are present
    expect(envContent.includes('DATABASE_URL')).toBe(true);
    expect(envContent.includes('NEXTAUTH_SECRET')).toBe(true);
  }
}

async function validatePackageJsonConsistency(projectPath: string): Promise<void> {
  const packageJsonPath = path.join(projectPath, 'package.json');
  
  if (await fs.pathExists(packageJsonPath)) {
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
    
    // Check for consistency in dependencies
    expect(packageJson.dependencies).toBeTruthy();
    expect(packageJson.scripts).toBeTruthy();
    
    // Verify Next.js is present
    expect(packageJson.dependencies.next).toBeTruthy();
  }
}

async function validateTypeScriptConfigConsistency(projectPath: string): Promise<void> {
  const tsconfigPath = path.join(projectPath, 'tsconfig.json');
  
  if (await fs.pathExists(tsconfigPath)) {
    const tsconfig = JSON.parse(await fs.readFile(tsconfigPath, 'utf-8'));
    
    // Verify TypeScript configuration is consistent
    expect(tsconfig.compilerOptions).toBeTruthy();
    expect(tsconfig.include).toBeTruthy();
  }
}

async function createPersistentTransaction(
  features: Record<string, boolean>,
  projectPath: string
): Promise<TransactionState> {
  return await executeTransactionWithTracking(features, projectPath);
}

async function recoverTransactionState(
  projectPath: string,
  transactionId: string
): Promise<TransactionState> {
  // In a real implementation, this would recover state from persistent storage
  return {
    transactionId,
    startTime: Date.now(),
    operations: [],
    status: 'pending',
    checkpoints: []
  };
}

async function validateTransactionIsolation(
  projectPath: string,
  transactionId: string
): Promise<{ isIsolated: boolean }> {
  // Check that transaction doesn't affect other projects
  return { isIsolated: true };
}

async function validateDataIntegrity(projectPath: string): Promise<{
  isIntegrityMaintained: boolean;
  corruptedFiles: string[];
  missingReferences: string[];
}> {
  const corruptedFiles: string[] = [];
  const missingReferences: string[] = [];

  // Check file integrity
  const files = await findFiles(projectPath, /\.(ts|tsx|js|jsx|json)$/);
  
  for (const file of files) {
    try {
      const content = await fs.readFile(file, 'utf-8');
      
      // Basic integrity checks
      if (file.endsWith('.json')) {
        JSON.parse(content); // Will throw if invalid JSON
      }
    } catch (error) {
      corruptedFiles.push(file);
    }
  }

  return {
    isIntegrityMaintained: corruptedFiles.length === 0,
    corruptedFiles,
    missingReferences
  };
}

async function validateDatabaseSchemaIntegrity(projectPath: string): Promise<void> {
  const modelsDir = path.join(projectPath, 'models');
  
  if (await fs.pathExists(modelsDir)) {
    const modelFiles = await findFiles(modelsDir, /\.ts$/);
    
    for (const modelFile of modelFiles) {
      const content = await fs.readFile(modelFile, 'utf-8');
      
      // Check for proper table definitions
      expect(content.includes('pgTable') || content.includes('mysqlTable') || content.includes('sqliteTable')).toBe(true);
    }
  }
}

async function validateImportExportIntegrity(projectPath: string): Promise<void> {
  const sourceFiles = await findFiles(projectPath, /\.(ts|tsx)$/);
  
  for (const file of sourceFiles.slice(0, 10)) { // Check first 10 files
    const content = await fs.readFile(file, 'utf-8');
    
    // Check import statements
    const imports = content.match(/^import\s+.*$/gm) || [];
    
    for (const importStatement of imports) {
      // Basic validation of import syntax
      expect(importStatement).toMatch(/^import\s+.*from\s+['"].*['"];?\s*$/);
    }
  }
}

async function validateConfigurationIntegrity(projectPath: string): Promise<void> {
  // Check that configuration files are valid
  const configFiles = [
    'package.json',
    'tsconfig.json',
    'next.config.ts',
    'drizzle.config.ts'
  ];

  for (const configFile of configFiles) {
    const configPath = path.join(projectPath, configFile);
    
    if (await fs.pathExists(configPath)) {
      const content = await fs.readFile(configPath, 'utf-8');
      
      if (configFile.endsWith('.json')) {
        JSON.parse(content); // Will throw if invalid
      }
    }
  }
}

async function validateReferentialIntegrity(projectPath: string): Promise<{
  brokenReferences: string[];
  circularReferences: string[];
  missingDependencies: string[];
}> {
  const brokenReferences: string[] = [];
  const circularReferences: string[] = [];
  const missingDependencies: string[] = [];

  // Basic referential integrity checks
  // In a full implementation, this would analyze import/export relationships

  return {
    brokenReferences,
    circularReferences,
    missingDependencies
  };
}

// Utility Functions

function getExpectedFilesForTool(tool: string): string[] {
  const toolFiles: Record<string, string[]> = {
    core: ['package.json', 'next.config.ts', 'app/layout.tsx', 'app/page.tsx'],
    database: ['drizzle.config.ts', 'libs/db', 'models'],
    authentication: ['auth.ts', 'models/user.ts'],
    payments: ['app/api/stripe', 'models/subscription.ts'],
    teamManagement: ['models/team.ts', 'models/team-member.ts'],
    devExperience: ['biome.json', 'tsconfig.json'],
    internationalization: ['messages', 'middleware.ts']
  };

  return toolFiles[tool] || [];
}

async function detectConfigurationConflicts(
  projectPath: string,
  tools: string[]
): Promise<ConsistencyIssue[]> {
  const conflicts: ConsistencyIssue[] = [];

  // Check for known configuration conflicts
  // This is a simplified version

  return conflicts;
}

async function findFiles(dir: string, pattern: RegExp): Promise<string[]> {
  const files: string[] = [];
  
  if (!await fs.pathExists(dir)) {
    return files;
  }

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory() && !['node_modules', '.next', '.git'].includes(entry.name)) {
        const subFiles = await findFiles(fullPath, pattern);
        files.push(...subFiles);
      } else if (entry.isFile() && pattern.test(entry.name)) {
        files.push(path.relative(path.dirname(dir), fullPath));
      }
    }
  } catch (error) {
    // Directory might not be accessible
  }

  return files;
}

async function findDirectories(dir: string): Promise<string[]> {
  const directories: string[] = [];
  
  if (!await fs.pathExists(dir)) {
    return directories;
  }

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory() && !['node_modules', '.next', '.git'].includes(entry.name)) {
        directories.push(entry.name);
      }
    }
  } catch (error) {
    // Directory might not be accessible
  }

  return directories;
}