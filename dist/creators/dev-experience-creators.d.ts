/**
 * @fileoverview Developer Experience Creators
 * @description Creates files for enhanced developer experience including environment validation,
 * form handling, testing setup, and git hooks configuration
 */
/**
 * Creates T3 Env configuration for type-safe environment variables
 */
export declare function createEnvValidation(projectPath: string): Promise<void>;
/**
 * Creates React Hook Form setup and utilities
 */
export declare function createFormHandling(projectPath: string): Promise<void>;
/**
 * Creates comprehensive testing setup with Vitest and Playwright
 */
export declare function createTestingSetup(projectPath: string): Promise<void>;
/**
 * Creates Git hooks setup with Lefthook and development workflow
 */
export declare function createGitHooksSetup(projectPath: string): Promise<void>;
/**
 * Updates package.json with dev experience scripts and config only
 */
export declare function updatePackageJsonForDevExperience(projectPath: string): Promise<void>;
//# sourceMappingURL=dev-experience-creators.d.ts.map