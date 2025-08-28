/**
 * @fileoverview System Requirements Checker
 * @description Validates system requirements before running MCP
 */
export interface SystemRequirements {
    gitVersion: string;
    nodeVersion: string;
    pnpmVersion: string;
}
/**
 * Check Git version requirements
 */
export declare function checkGitVersion(): Promise<{
    valid: boolean;
    version?: string;
    error?: string;
}>;
/**
 * Check Node.js version
 */
export declare function checkNodeVersion(): Promise<{
    valid: boolean;
    version?: string;
    error?: string;
}>;
/**
 * Check pnpm availability
 */
export declare function checkPnpmVersion(): Promise<{
    valid: boolean;
    version?: string;
    error?: string;
}>;
/**
 * Run all system requirement checks
 */
export declare function checkSystemRequirements(): Promise<{
    valid: boolean;
    checks: {
        git: Awaited<ReturnType<typeof checkGitVersion>>;
        node: Awaited<ReturnType<typeof checkNodeVersion>>;
        pnpm: Awaited<ReturnType<typeof checkPnpmVersion>>;
    };
    warnings: string[];
    errors: string[];
}>;
//# sourceMappingURL=system-checks.d.ts.map