/**
 * @fileoverview Next.js Base Setup Tool
 * @description Creates basic Next.js application with TypeScript, Tailwind, and optional shadcn/ui
 * This is the foundation tool that other tools depend on
 */

import fs from "fs-extra";
import path from "node:path";
import { runCommand } from "../../runners/command-runner.js";
import { createFolderStructure, FolderStructureOptions } from "../../creators/folder-creators.js";
import { updatePackageJsonScripts } from "../../creators/config-creators.js";
import { installPackages, getPackageGroupsForTool } from "../../utils/auto-installer.js";
import { detectProjectState } from "../../utils/dependency-detector.js";

export interface NextJsBaseConfig {
  projectPath: string;
  projectName?: string;
  includeShadcn?: boolean;
  includeAllComponents?: boolean;
}

export async function createNextJsBase(config: NextJsBaseConfig): Promise<string> {
  const {
    projectPath,
    projectName,
    includeShadcn = true,
    includeAllComponents = true
  } = config;

  const fullPath = path.resolve(projectPath);
  const startTime = Date.now();
  const steps: string[] = [];

  // Check if Next.js is already set up
  const projectState = await detectProjectState(fullPath);
  if (projectState.hasNextJs) {
    throw new Error("Next.js is already set up in this project. Use other tools to add specific features.");
  }

  console.error(`[DEBUG] Starting Next.js base setup at: ${fullPath}`);
  
  try {
    // Ensure directory exists
    await fs.ensureDir(fullPath);

    // Step 1: Initialize Next.js app
    const step1 = "Initializing Next.js app with pnpm...";
    steps.push(step1);
    console.error(`[STEP 1/6] ${step1}`);
    await runCommand("npx create-next-app@latest . --typescript --tailwind --app --use-pnpm --no-eslint --yes", fullPath);
    console.error(`[STEP 1/6] ✅ Completed: ${step1}`);

    if (includeShadcn) {
      // Step 2: Initialize shadcn
      const step2 = "Setting up shadcn/ui...";
      steps.push(step2);
      console.error(`[STEP 2/6] ${step2}`);
      await runCommand("npx shadcn@latest init --yes -b neutral", fullPath);
      console.error(`[STEP 2/6] ✅ Completed: ${step2}`);

      if (includeAllComponents) {
        // Step 3: Add all shadcn components
        const step3 = "Adding all shadcn components...";
        steps.push(step3);
        console.error(`[STEP 3/6] ${step3}`);
        await runCommand("npx shadcn@latest add --all", fullPath);
        console.error(`[STEP 3/6] ✅ Completed: ${step3}`);
      }
    }

    // Step 4: Update package.json scripts
    const step4 = "Updating package.json scripts...";
    steps.push(step4);
    console.error(`[STEP 4/6] ${step4}`);
    await updatePackageJsonScripts(fullPath);
    console.error(`[STEP 4/6] ✅ Completed: ${step4}`);

    // Step 5: Create minimal folder structure (no models, auth, or validations)
    const step5 = "Creating basic folder structure...";
    steps.push(step5);
    console.error(`[STEP 5/6] ${step5}`);
    await createFolderStructure(fullPath, {
      includeModels: false,
      includeValidations: false, 
      includeAuth: false,
      includeEnhancedStructure: false
    });
    console.error(`[STEP 5/6] ✅ Completed: ${step5}`);

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error(`[SUCCESS] Next.js base setup completed in ${totalTime}s`);

    return `🎉 Next.js base application created successfully!\n\n⏱️ Total time: ${totalTime}s\n\n✅ Completed steps:\n${steps.map((step, i) => `${i + 1}. ${step}`).join('\n')}\n\n🚀 Your Next.js application includes:\n\n**🏗️ Core Framework:**\n- Next.js 15 with App Router & TypeScript\n- Tailwind CSS for styling${includeShadcn ? '\n- shadcn/ui components library' : ''}${includeShadcn && includeAllComponents ? ' (all components)' : ''}\n- Enhanced project structure (actions, components, lib, types)\n\n**📋 Available Scripts:**\n- \`pnpm dev\` - Start development server\n- \`pnpm build\` - Build for production\n- \`pnpm start\` - Start production server\n- \`pnpm lint\` - Run linter\n\n💡 **Next steps:**\n1. Add additional features using other MCP tools:\n   - \`setup_biome_linting\` - Better linting with Biome\n   - \`setup_drizzle_orm\` - Database integration\n   - \`setup_authentication_jwt\` - User authentication\n   - \`setup_stripe_payments\` - Payment processing\n2. Configure environment variables\n3. Start building your application!\n\n📚 Use individual MCP tools to add specific features as needed.`;

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const currentStep = steps.length > 0 ? steps[steps.length - 1] : "Unknown step";
    
    console.error(`[ERROR] Failed at step: ${currentStep}`);
    console.error(`[ERROR] Error details: ${errorMsg}`);
    
    throw new Error(`❌ Failed at step: "${currentStep}"\n\n🔍 Error Details: ${errorMsg}\n\n📍 Project Path: ${fullPath}\n\n✅ Completed Steps: ${steps.slice(0, -1).map((step, i) => `${i + 1}. ${step}`).join('\n')}`);
  }
}