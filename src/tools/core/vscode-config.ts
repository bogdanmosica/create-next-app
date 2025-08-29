/**
 * @fileoverview VSCode Configuration Setup Tool
 * @description Creates VSCode settings optimized for Next.js development with Biome integration
 * Provides consistent development experience across the team
 */

import fs from "fs-extra";
import path from "node:path";
import { createVSCodeSettings } from "../../creators/config-creators.js";
import { detectProjectState } from "../../utils/dependency-detector.js";

export interface VSCodeConfigConfig {
  projectPath: string;
  optimizeForBiome?: boolean;
}

export async function setupVSCodeConfig(config: VSCodeConfigConfig): Promise<string> {
  const {
    projectPath,
    optimizeForBiome = true
  } = config;

  const fullPath = path.resolve(projectPath);
  const startTime = Date.now();
  const steps: string[] = [];

  // Check if project has basic structure
  const projectState = await detectProjectState(fullPath);
  if (!projectState.hasNextJs) {
    throw new Error("Next.js project not found. Run 'create_nextjs_base' first to set up the basic project structure.");
  }

  // Check if VSCode config already exists
  if (projectState.hasVSCodeConfig) {
    throw new Error("VSCode configuration already exists. Configuration files are already set up in .vscode/ directory.");
  }

  console.error(`[DEBUG] Starting VSCode configuration setup at: ${fullPath}`);
  
  try {
    // Step 1: Create .vscode directory
    const step1 = "Creating .vscode directory...";
    steps.push(step1);
    console.error(`[STEP 1/4] ${step1}`);
    
    const vscodeDir = path.join(fullPath, ".vscode");
    await fs.ensureDir(vscodeDir);
    
    console.error(`[STEP 1/4] ✅ Completed: ${step1}`);

    // Step 2: Create settings.json
    const step2 = optimizeForBiome 
      ? "Creating VSCode settings optimized for Biome..."
      : "Creating basic VSCode settings...";
    steps.push(step2);
    console.error(`[STEP 2/4] ${step2}`);
    
    await createVSCodeSettings(fullPath);
    
    console.error(`[STEP 2/4] ✅ Completed: ${step2}`);

    // Step 3: Create extensions.json with recommended extensions
    const step3 = "Setting up recommended VSCode extensions...";
    steps.push(step3);
    console.error(`[STEP 3/4] ${step3}`);
    
    const extensionsConfig = {
      recommendations: [
        // Essential for Next.js development
        "bradlc.vscode-tailwindcss",
        "ms-vscode.vscode-typescript-next",
        
        // Biome integration (if enabled)
        ...(optimizeForBiome ? ["biomejs.biome"] : []),
        
        // Additional helpful extensions
        "christian-kohler.path-intellisense",
        "ms-vscode.vscode-json",
        "formulahendry.auto-rename-tag",
        "christian-kohler.npm-intellisense",
        "bradlc.vscode-tailwindcss",
        "ms-vscode.vscode-typescript-next"
      ],
      unwantedRecommendations: [
        // Disable conflicting extensions
        ...(optimizeForBiome ? [
          "esbenp.prettier-vscode",  // Conflicts with Biome formatting
          "dbaeumer.vscode-eslint"   // Conflicts with Biome linting
        ] : [])
      ]
    };
    
    await fs.writeJSON(path.join(vscodeDir, "extensions.json"), extensionsConfig, { spaces: 2 });
    
    console.error(`[STEP 3/4] ✅ Completed: ${step3}`);

    // Step 4: Create launch.json for debugging
    const step4 = "Setting up debugging configuration...";
    steps.push(step4);
    console.error(`[STEP 4/4] ${step4}`);
    
    const launchConfig = {
      version: "0.2.0",
      configurations: [
        {
          name: "Next.js: debug server-side",
          type: "node-terminal",
          request: "launch",
          command: "pnpm dev",
          serverReadyAction: {
            pattern: "- Local:.*?(https?://(?:localhost|\\[\\d*\\.*\\d*\\.*\\d*\\.*\\d*\\.*\\d*\\]|0\\.0\\.0\\.0)(?::\\d+)?)",
            uriFormat: "%s",
            action: "openExternally"
          }
        },
        {
          name: "Next.js: debug client-side",
          type: "chrome",
          request: "launch",
          url: "http://localhost:3000",
          webRoot: "${workspaceFolder}"
        }
      ]
    };
    
    await fs.writeJSON(path.join(vscodeDir, "launch.json"), launchConfig, { spaces: 2 });
    
    console.error(`[STEP 4/4] ✅ Completed: ${step4}`);

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error(`[SUCCESS] VSCode configuration setup completed in ${totalTime}s`);

    return `🎉 VSCode configuration setup completed successfully!\n\n⏱️ Total time: ${totalTime}s\n\n✅ Completed steps:\n${steps.map((step, i) => `${i + 1}. ${step}`).join('\n')}\n\n⚙️ **VSCode Configuration:**\n- **Auto-formatting**: Format on save enabled${optimizeForBiome ? ' with Biome' : ''}\n- **Import organization**: Auto-organize imports on save\n- **TypeScript**: Enhanced TypeScript support\n- **Tailwind**: Tailwind CSS IntelliSense\n- **Debugging**: Ready-to-use debug configurations\n\n🔌 **Recommended Extensions:**\n- **Biome** - Fast linting and formatting${optimizeForBiome ? ' (enabled)' : ''}\n- **Tailwind CSS IntelliSense** - Tailwind class completion\n- **TypeScript Importer** - Auto-import suggestions\n- **Path Intellisense** - File path completion\n- **Auto Rename Tag** - Rename HTML/JSX tags\n- **npm Intellisense** - Package name completion\n\n📁 **Configuration Files Created:**\n- \`.vscode/settings.json\` - Editor settings and preferences\n- \`.vscode/extensions.json\` - Recommended extensions\n- \`.vscode/launch.json\` - Debugging configurations\n\n🚀 **Key Features:**\n- **Format on Save**: Automatic code formatting\n- **Import Organization**: Auto-organize imports\n- **IntelliSense**: Enhanced code completion\n- **Debugging**: Server-side and client-side debugging\n- **Team Consistency**: Shared settings across developers\n\n💡 **Usage:**\n1. **Install recommended extensions** when prompted by VSCode\n2. **Start debugging** with F5 or Debug panel\n3. **Format code** automatically on save\n4. **Organize imports** automatically on save\n\n🎯 **Next steps:**\n1. Restart VSCode to apply all settings\n2. Install recommended extensions when prompted\n3. Add database integration with \`setup_drizzle_orm\`\n4. Add authentication with \`setup_authentication_jwt\`\n\n${projectState.hasBiome ? '✅ **Perfect Integration**: Your Biome setup is fully integrated with VSCode!' : '💡 **Tip**: Run `setup_biome_linting` for optimal linting and formatting experience!'}`;

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const currentStep = steps.length > 0 ? steps[steps.length - 1] : "Unknown step";
    
    console.error(`[ERROR] Failed at step: ${currentStep}`);
    console.error(`[ERROR] Error details: ${errorMsg}`);
    
    throw new Error(`❌ Failed at step: "${currentStep}"\n\n🔍 Error Details: ${errorMsg}\n\n📍 Project Path: ${fullPath}\n\n✅ Completed Steps: ${steps.slice(0, -1).map((step, i) => `${i + 1}. ${step}`).join('\n')}\n\n💡 **Troubleshooting:**\n- Ensure the project directory is writable\n- Verify Next.js project exists (run create_nextjs_base first)\n- Check that .vscode directory can be created`);
  }
}