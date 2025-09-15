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
import { createDashboardPages, addDashboardDependencies, createDashboardReadme } from "../../creators/dashboard-creators.js";

export interface NextJsBaseConfig {
  projectPath: string;
  projectName?: string;
  includeShadcn?: boolean;
  includeAllComponents?: boolean;
  shadcnBaseColor?: 'neutral' | 'gray' | 'zinc' | 'stone' | 'slate';
  useCssVariables?: boolean;
  silent?: boolean;
  includeDashboard?: boolean;
}

export async function createNextJsBase(config: NextJsBaseConfig): Promise<string> {
  const {
    projectPath,
    projectName,
    includeShadcn = true,
    includeAllComponents = true,
    shadcnBaseColor = 'neutral',
    useCssVariables = true,
    silent = false,
    includeDashboard = false
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
    // Step 1: Initialize Next.js app
    const step1 = "Initializing Next.js app with pnpm...";
    steps.push(step1);
    console.error(`[STEP 1/6] ${step1}`);
    
    // Determine if we're creating in current directory or a subdirectory
    const currentDir = process.cwd();
    const isCurrentDirectory = path.resolve(projectPath) === currentDir;
    
    if (isCurrentDirectory) {
      // Creating in current directory - ensure current directory exists
      await fs.ensureDir(fullPath);
      await runCommand("npx create-next-app@latest . --typescript --tailwind --app --use-pnpm --no-eslint --yes", fullPath);
    } else {
      // Creating in a subdirectory - ensure parent directory exists but DON'T create the project directory
      // (create-next-app will create it and fails if it already exists)
      const parentDir = path.dirname(fullPath);
      await fs.ensureDir(parentDir);
      const dirName = path.basename(fullPath);
      await runCommand(`npx create-next-app@latest ${dirName} --typescript --tailwind --app --use-pnpm --no-eslint --yes`, parentDir);
    }
    
    console.error(`[STEP 1/6] ✅ Completed: ${step1}`);

    if (includeShadcn) {
      // Step 2: Initialize shadcn
      const step2 = "Setting up shadcn/ui...";
      steps.push(step2);
      console.error(`[STEP 2/6] ${step2}`);
      // Build shadcn command with configurable options
      const shadcnFlags = [
        "--yes",
        `-b ${shadcnBaseColor}`,
        useCssVariables ? "--css-variables" : "--no-css-variables",
        silent ? "--silent" : ""
      ].filter(Boolean).join(" ");
      
      await runCommand(`npx shadcn@latest init ${shadcnFlags}`, fullPath);
      
      // Update shadcn config to use libs instead of lib
      const componentsJsonPath = path.join(fullPath, "components.json");
      const componentsConfig = await fs.readJson(componentsJsonPath);
      componentsConfig.aliases.utils = "@/libs/utils";
      componentsConfig.aliases.lib = "@/libs";
      await fs.writeJson(componentsJsonPath, componentsConfig, { spaces: 2 });
      
      // Move lib/utils.ts to libs/utils.ts
      const oldUtilsPath = path.join(fullPath, "lib", "utils.ts");
      const newUtilsPath = path.join(fullPath, "libs", "utils.ts");
      if (await fs.pathExists(oldUtilsPath)) {
        await fs.ensureDir(path.dirname(newUtilsPath));
        await fs.move(oldUtilsPath, newUtilsPath);
        // Remove empty lib directory if it exists
        const libDir = path.join(fullPath, "lib");
        if (await fs.pathExists(libDir)) {
          const libContents = await fs.readdir(libDir);
          if (libContents.length === 0) {
            await fs.remove(libDir);
          }
        }
      }
      
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

    // Step 6: Create dashboard (optional)
    if (includeDashboard && includeShadcn) {
      const step6 = "Creating shadcn/ui dashboard showcase...";
      steps.push(step6);
      console.error(`[STEP 6/7] ${step6}`);
      
      await addDashboardDependencies(fullPath);
      await createDashboardPages(fullPath);
      await createDashboardReadme(fullPath);
      
      console.error(`[STEP 6/7] ✅ Completed: ${step6}`);
    }

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    const stepCount = includeDashboard && includeShadcn ? 7 : 6;
    console.error(`[SUCCESS] Next.js base setup completed in ${totalTime}s`);

    return `🎉 Next.js base application created successfully!\n\n⏱️ Total time: ${totalTime}s\n\n✅ Completed steps:\n${steps.map((step, i) => `${i + 1}. ${step}`).join('\n')}\n\n🚀 Your Next.js application includes:\n\n**🏗️ Core Framework:**\n- Next.js 15 with App Router & TypeScript\n- Tailwind CSS for styling${includeShadcn ? '\n- shadcn/ui components library' : ''}${includeShadcn && includeAllComponents ? ' (all components)' : ''}\n- Enhanced project structure (actions, components, libs, types)${includeDashboard && includeShadcn ? '\n\n**🎨 Dashboard Showcase:**\n- Interactive component demos at `/dashboard/components`\n- Form examples with validation at `/dashboard/forms`\n- Responsive sidebar navigation with mobile support\n- Dark/light theme toggle functionality\n- Stats cards, progress bars, and activity feeds' : ''}\n\n**📋 Available Scripts:**\n- \`pnpm dev\` - Start development server\n- \`pnpm build\` - Build for production\n- \`pnpm start\` - Start production server\n- \`pnpm lint\` - Run linter\n\n💡 **Next steps:**\n1.${includeDashboard && includeShadcn ? ' Install dashboard dependencies: `pnpm install`\n2.' : ''} Start the development server: \`pnpm dev\`${includeDashboard && includeShadcn ? '\n3. Visit the dashboard: http://localhost:3000/dashboard\n4. Explore component showcase: http://localhost:3000/dashboard/components' : ''}\n${includeDashboard && includeShadcn ? '5' : '2'}. Add additional features using other MCP tools:\n   - \`setup_biome_linting\` - Better linting with Biome\n   - \`setup_drizzle_orm\` - Database integration\n   - \`setup_authentication_jwt\` - User authentication\n   - \`setup_stripe_payments\` - Payment processing\n${includeDashboard && includeShadcn ? '6' : '3'}. Configure environment variables\n${includeDashboard && includeShadcn ? '7' : '4'}. Start building your application!\n\n📚 Use individual MCP tools to add specific features as needed.`;

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const currentStep = steps.length > 0 ? steps[steps.length - 1] : "Unknown step";
    
    console.error(`[ERROR] Failed at step: ${currentStep}`);
    console.error(`[ERROR] Error details: ${errorMsg}`);
    
    throw new Error(`❌ Failed at step: "${currentStep}"\n\n🔍 Error Details: ${errorMsg}\n\n📍 Project Path: ${fullPath}\n\n✅ Completed Steps: ${steps.slice(0, -1).map((step, i) => `${i + 1}. ${step}`).join('\n')}`);
  }
}