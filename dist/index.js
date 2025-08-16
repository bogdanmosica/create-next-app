#!/usr/bin/env node
/**
 * @fileoverview Next.js SaaS Starter MCP Server
 * @description Creates complete Next.js SaaS applications with authentication, payments, and team management
 * @version 1.0.0
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types";
import fs from "fs-extra";
import path from "path";
// Import our modular functions
import { runCommand } from "./runners/command-runner";
import { createBiomeConfig, createVSCodeSettings, updatePackageJsonScripts, createDrizzleSchema, createDrizzleConfig, createEnvironmentFiles } from "./creators/config-creators";
import { createFolderStructure } from "./creators/folder-creators";
import { createSaaSMiddleware, createSaaSLibStructure, updatePackageJsonForSaaS } from "./creators/saas-lib-creators";
class NextJsCreatorServer {
    server;
    constructor() {
        this.server = new Server({
            name: "create-nextjs-mcp",
            version: "1.0.0",
        }, {
            capabilities: {
                tools: {},
            },
        });
        this.setupToolHandlers();
        this.setupErrorHandling();
    }
    setupErrorHandling() {
        this.server.onerror = (error) => console.error("[MCP Error]", error);
        process.on("SIGINT", async () => {
            await this.server.close();
            process.exit(0);
        });
    }
    setupToolHandlers() {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
            tools: [
                {
                    name: "create_nextjs_app",
                    description: "Creates a complete Next.js application with predefined configurations including Biome, shadcn/ui, and Drizzle ORM",
                    inputSchema: {
                        type: "object",
                        properties: {
                            projectPath: {
                                type: "string",
                                description: "The path where the Next.js project should be created",
                            },
                            projectName: {
                                type: "string",
                                description: "The name of the project (optional, defaults to current directory)",
                            },
                        },
                        required: ["projectPath"],
                    },
                },
            ],
        }));
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;
            try {
                if (name === "create_nextjs_app") {
                    const { projectPath, projectName } = args;
                    const result = await this.createNextJsApp(projectPath, projectName);
                    return {
                        content: [
                            {
                                type: "text",
                                text: result,
                            },
                        ],
                    };
                }
                throw new Error(`Unknown tool: ${name}`);
            }
            catch (error) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
                        },
                    ],
                    isError: true,
                };
            }
        });
    }
    async createNextJsApp(projectPath, projectName) {
        const fullPath = path.resolve(projectPath);
        console.error(`[DEBUG] Starting Next.js app creation at: ${fullPath}`);
        console.error(`[DEBUG] Project name: ${projectName || 'current directory'}`);
        // Ensure directory exists
        try {
            await fs.ensureDir(fullPath);
            console.error(`[DEBUG] Directory ensured: ${fullPath}`);
        }
        catch (error) {
            throw new Error(`Failed to create project directory: ${error instanceof Error ? error.message : String(error)}`);
        }
        const steps = [];
        const startTime = Date.now();
        try {
            // === BASIC NEXT.JS SETUP (Steps 1-7) ===
            // Step 1: Initialize Next.js app
            const step1 = "Initializing Next.js app with pnpm...";
            steps.push(step1);
            console.error(`[STEP 1/15] ${step1}`);
            await runCommand("npx create-next-app@latest . --typescript --tailwind --app --use-pnpm --yes", fullPath);
            console.error(`[STEP 1/15] ✅ Completed: ${step1}`);
            // Step 2: Install Biome
            const step2 = "Installing Biome...";
            steps.push(step2);
            console.error(`[STEP 2/15] ${step2}`);
            await runCommand("pnpm add -D -E @biomejs/biome", fullPath);
            console.error(`[STEP 2/15] ✅ Completed: ${step2}`);
            // Step 3: Initialize Biome config
            const step3 = "Initializing Biome configuration...";
            steps.push(step3);
            console.error(`[STEP 3/15] ${step3}`);
            await runCommand("pnpm exec biome init", fullPath);
            console.error(`[STEP 3/15] ✅ Completed: ${step3}`);
            // Step 4: Update Biome config
            const step4 = "Setting up Biome configuration...";
            steps.push(step4);
            console.error(`[STEP 4/15] ${step4}`);
            await createBiomeConfig(fullPath);
            console.error(`[STEP 4/15] ✅ Completed: ${step4}`);
            // Step 5: Create VSCode settings
            const step5 = "Creating VSCode settings...";
            steps.push(step5);
            console.error(`[STEP 5/15] ${step5}`);
            await createVSCodeSettings(fullPath);
            console.error(`[STEP 5/15] ✅ Completed: ${step5}`);
            // Step 6: Initialize shadcn
            const step6 = "Setting up shadcn/ui...";
            steps.push(step6);
            console.error(`[STEP 6/15] ${step6}`);
            await runCommand("npx shadcn@latest init --yes -b neutral", fullPath);
            console.error(`[STEP 6/15] ✅ Completed: ${step6}`);
            // === DRIZZLE & DATABASE SETUP (Steps 8-14) ===
            // Step 7: Add all shadcn components
            const step7 = "Adding all shadcn components...";
            steps.push(step7);
            console.error(`[STEP 7/15] ${step7}`);
            await runCommand("npx shadcn@latest add --all", fullPath);
            console.error(`[STEP 7/15] ✅ Completed: ${step7}`);
            // Step 8: Update package.json scripts
            const step8 = "Updating package.json scripts...";
            steps.push(step8);
            console.error(`[STEP 8/15] ${step8}`);
            await updatePackageJsonScripts(fullPath);
            console.error(`[STEP 8/15] ✅ Completed: ${step8}`);
            // Step 9: Create folder structure
            const step9 = "Creating folder structure...";
            steps.push(step9);
            console.error(`[STEP 9/15] ${step9}`);
            await createFolderStructure(fullPath);
            console.error(`[STEP 9/15] ✅ Completed: ${step9}`);
            // Step 10: Install Drizzle
            const step10 = "Installing Drizzle ORM dependencies...";
            steps.push(step10);
            console.error(`[STEP 10/15] ${step10}`);
            await runCommand("pnpm add drizzle-orm @neondatabase/serverless ws", fullPath);
            console.error(`[STEP 10/15] ✅ Completed: ${step10}`);
            // Step 11: Install Drizzle dev dependencies
            const step11 = "Installing Drizzle dev dependencies...";
            steps.push(step11);
            console.error(`[STEP 11/15] ${step11}`);
            await runCommand("pnpm add -D drizzle-kit", fullPath);
            console.error(`[STEP 11/15] ✅ Completed: ${step11}`);
            // Step 12: Create Drizzle schema
            const step12 = "Creating Drizzle schema file...";
            steps.push(step12);
            console.error(`[STEP 12/15] ${step12}`);
            await createDrizzleSchema(fullPath);
            console.error(`[STEP 12/15] ✅ Completed: ${step12}`);
            // Step 13: Create Drizzle config
            const step13 = "Creating Drizzle configuration...";
            steps.push(step13);
            console.error(`[STEP 13/15] ${step13}`);
            await createDrizzleConfig(fullPath);
            console.error(`[STEP 13/15] ✅ Completed: ${step13}`);
            // Step 14: Create environment files
            const step14 = "Creating environment files...";
            steps.push(step14);
            console.error(`[STEP 14/15] ${step14}`);
            await createEnvironmentFiles(fullPath);
            console.error(`[STEP 14/15] ✅ Completed: ${step14}`);
            // === SAAS FEATURES (Steps 15-18) ===
            // Step 15: Create SaaS middleware
            const step15 = "Creating SaaS middleware...";
            steps.push(step15);
            console.error(`[STEP 15/18] ${step15}`);
            await createSaaSMiddleware(fullPath);
            console.error(`[STEP 15/18] ✅ Completed: ${step15}`);
            // Step 16: Create SaaS lib structure
            const step16 = "Creating SaaS lib structure...";
            steps.push(step16);
            console.error(`[STEP 16/18] ${step16}`);
            await createSaaSLibStructure(fullPath);
            console.error(`[STEP 16/18] ✅ Completed: ${step16}`);
            // Step 17: Update package.json for SaaS
            const step17 = "Installing SaaS dependencies...";
            steps.push(step17);
            console.error(`[STEP 17/18] ${step17}`);
            await updatePackageJsonForSaaS(fullPath);
            await runCommand("pnpm install", fullPath);
            console.error(`[STEP 17/18] ✅ Completed: ${step17}`);
            // Step 18: Generate Drizzle config
            const step18 = "Generating Drizzle configuration...";
            steps.push(step18);
            console.error(`[STEP 18/18] ${step18}`);
            await runCommand("pnpm drizzle-kit generate --config=drizzle.config.ts", fullPath);
            console.error(`[STEP 18/18] ✅ Completed: ${step18}`);
            const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
            console.error(`[SUCCESS] All steps completed in ${totalTime}s`);
            return `🎉 Next.js SaaS application created successfully at ${fullPath}!\n\n⏱️ Total time: ${totalTime}s\n\n✅ Completed steps:\n${steps.map((step, i) => `${i + 1}. ${step}`).join('\n')}\n\n🚀 Your SaaS application is ready with:\n- Next.js with TypeScript\n- Tailwind CSS\n- Biome for linting and formatting\n- shadcn/ui components\n- Drizzle ORM setup\n- Authentication system (JWT + bcrypt)\n- Stripe payments integration\n- Team/user management\n- Middleware for protected routes\n- Complete SaaS lib structure\n- Environment configuration\n- VSCode settings\n\n💡 Next steps:\n1. Set up your PostgreSQL database\n2. Configure your .env file with database and Stripe keys\n3. Run 'pnpm db:setup' to initialize Stripe products\n4. Run 'pnpm db:seed' to create initial data\n\n💡 Check the console logs for detailed execution information.`;
        }
        catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            const currentStep = steps.length > 0 ? steps[steps.length - 1] : "Unknown step";
            console.error(`[ERROR] Failed at step: ${currentStep}`);
            console.error(`[ERROR] Error details: ${errorMsg}`);
            console.error(`[ERROR] Project path: ${fullPath}`);
            console.error(`[ERROR] Completed steps: ${steps.slice(0, -1).join(', ')}`);
            throw new Error(`❌ Failed at step: "${currentStep}"\n\n🔍 Error Details: ${errorMsg}\n\n📍 Project Path: ${fullPath}\n\n✅ Completed Steps: ${steps.slice(0, -1).map((step, i) => `${i + 1}. ${step}`).join('\n')}\n\n💡 Tip: Check the console logs above for more detailed debug information.`);
        }
    }
    async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error("Next.js Creator MCP server running on stdio");
    }
}
const server = new NextJsCreatorServer();
server.run().catch(console.error);
//# sourceMappingURL=index.js.map