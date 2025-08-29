/**
 * @fileoverview Biome Linting Setup Tool
 * @description Sets up Biome for linting and formatting with custom GritQL rules
 * Replaces ESLint with a faster, more modern linting solution
 */

import fs from "fs-extra";
import path from "node:path";
import { runCommand } from "../../runners/command-runner.js";
import { createBiomeConfig } from "../../creators/config-creators.js";
import { installPackages } from "../../utils/auto-installer.js";
import { detectProjectState } from "../../utils/dependency-detector.js";

export interface BiomeLintingConfig {
  projectPath: string;
  includeCustomRules?: boolean;
  strictMode?: boolean;
}

export async function setupBiomeLinting(config: BiomeLintingConfig): Promise<string> {
  const {
    projectPath,
    includeCustomRules = true,
    strictMode = true
  } = config;

  const fullPath = path.resolve(projectPath);
  const startTime = Date.now();
  const steps: string[] = [];

  // Check if project has basic structure
  const projectState = await detectProjectState(fullPath);
  if (!projectState.hasNextJs) {
    throw new Error("Next.js project not found. Run 'create_nextjs_base' first to set up the basic project structure.");
  }

  // Check if Biome is already set up
  if (projectState.hasBiome) {
    throw new Error("Biome is already set up in this project. Configuration files already exist.");
  }

  console.error(`[DEBUG] Starting Biome linting setup at: ${fullPath}`);
  
  try {
    // Step 1: Install Biome
    const step1 = "Installing Biome linting package...";
    steps.push(step1);
    console.error(`[STEP 1/4] ${step1}`);
    
    const installResult = await installPackages(fullPath, "biome_linting", { verbose: true });
    if (!installResult.success) {
      throw new Error(`Failed to install Biome: ${installResult.errors.join(', ')}`);
    }
    
    console.error(`[STEP 1/4] ✅ Completed: ${step1}`);

    // Step 2: Initialize Biome config
    const step2 = "Initializing Biome configuration...";
    steps.push(step2);
    console.error(`[STEP 2/4] ${step2}`);
    await runCommand("pnpm exec biome init", fullPath);
    console.error(`[STEP 2/4] ✅ Completed: ${step2}`);

    // Step 3: Create custom Biome config with GritQL rules
    const step3 = includeCustomRules 
      ? "Setting up Biome configuration with custom GritQL rules..."
      : "Setting up basic Biome configuration...";
    steps.push(step3);
    console.error(`[STEP 3/4] ${step3}`);
    await createBiomeConfig(fullPath);
    console.error(`[STEP 3/4] ✅ Completed: ${step3}`);

    // Step 4: Update package.json scripts
    const step4 = "Adding Biome scripts to package.json...";
    steps.push(step4);
    console.error(`[STEP 4/4] ${step4}`);
    
    const packageJsonPath = path.join(fullPath, "package.json");
    const packageJson = await fs.readJSON(packageJsonPath);
    
    // Add or update Biome scripts
    packageJson.scripts = {
      ...packageJson.scripts,
      "lint": "biome check .",
      "lint:fix": "biome check . --apply",
      "format": "biome format . --write",
      "check": "biome check ."
    };
    
    await fs.writeJSON(packageJsonPath, packageJson, { spaces: 2 });
    console.error(`[STEP 4/4] ✅ Completed: ${step4}`);

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error(`[SUCCESS] Biome linting setup completed in ${totalTime}s`);

    return `🎉 Biome linting setup completed successfully!\n\n⏱️ Total time: ${totalTime}s\n\n✅ Completed steps:\n${steps.map((step, i) => `${i + 1}. ${step}`).join('\n')}\n\n🔧 **Biome Configuration:**\n- **Linting**: Modern ESLint replacement with faster performance\n- **Formatting**: Prettier-compatible code formatting\n- **TypeScript**: Full TypeScript support with React rules${includeCustomRules ? '\n- **Custom Rules**: GritQL rules for React/Next.js best practices' : ''}\n- **Import Organization**: Automatic import sorting with custom groups${strictMode ? '\n- **Strict Mode**: Enhanced security and performance linting' : ''}\n\n📋 **Available Scripts:**\n- \`pnpm lint\` - Check for linting issues\n- \`pnpm lint:fix\` - Auto-fix linting issues\n- \`pnpm format\` - Format code\n- \`pnpm check\` - Run full Biome check\n\n⚙️ **Configuration Files Created:**\n- \`biome.json\` - Main Biome configuration\n- \`.gritqlrc.yaml\` - Custom GritQL rules (if enabled)\n- Updated \`package.json\` scripts\n\n💡 **Next steps:**\n1. Run \`pnpm lint\` to check your code\n2. Run \`pnpm format\` to format your code\n3. Set up VSCode integration with \`setup_vscode_config\`\n4. Add more features with other MCP tools\n\n🚀 **Benefits:**\n- **10x faster** than ESLint\n- **Zero configuration** for most TypeScript/React projects\n- **Consistent formatting** across your team\n- **Custom rules** to prevent common React/Next.js mistakes`;

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const currentStep = steps.length > 0 ? steps[steps.length - 1] : "Unknown step";
    
    console.error(`[ERROR] Failed at step: ${currentStep}`);
    console.error(`[ERROR] Error details: ${errorMsg}`);
    
    throw new Error(`❌ Failed at step: "${currentStep}"\n\n🔍 Error Details: ${errorMsg}\n\n📍 Project Path: ${fullPath}\n\n✅ Completed Steps: ${steps.slice(0, -1).map((step, i) => `${i + 1}. ${step}`).join('\n')}\n\n💡 **Troubleshooting:**\n- Ensure you have pnpm installed\n- Check that the project directory is writable\n- Verify Next.js project exists (run create_nextjs_base first)`);
  }
}