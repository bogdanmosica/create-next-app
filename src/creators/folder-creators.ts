import fs from "fs-extra";
import path from "node:path";
import { createActionsReadme, createComponentsReadme, createLibReadme, createLibDbReadme } from "./readme-creators.js";
import {
  createEnhancedProjectStructure,
  createLibsStructure,
  createModelsStructure,
  createValidationsStructure,
  createAuthComponents,
  createAuthPages,
  createEnhancedAuthActions,
  createEnhancedStructureReadme,
} from "./enhanced-structure-creators.js";

export interface FolderStructureOptions {
  includeModels?: boolean;
  includeValidations?: boolean;
  includeAuth?: boolean;
  includeEnhancedStructure?: boolean;
}

export async function createFolderStructure(
  projectPath: string, 
  options: FolderStructureOptions = {}
): Promise<void> {
  const {
    includeModels = false,
    includeValidations = false,
    includeAuth = false,
    includeEnhancedStructure = false
  } = options;
  // Create base directories (existing structure)
  const folders = [
    "actions",
    "components",
    "lib",
    "lib/constants",
    "lib/db",
    "types"
  ];

  for (const folder of folders) {
    try {
      const folderPath = path.join(projectPath, folder);
      console.error(`[DEBUG] Creating/checking folder: ${folderPath}`);
      
      await fs.ensureDir(folderPath);
      
      // Only add .gitkeep if folder is empty or doesn't have significant content
      let folderContents: string[] = [];
      try {
        folderContents = await fs.readdir(folderPath);
        console.error(`[DEBUG] Folder ${folder} contents: ${folderContents.join(', ')}`);
      } catch (readError) {
        console.error(`[DEBUG] Could not read folder contents for ${folder}: ${readError}`);
        folderContents = [];
      }
      
      const hasSignificantFiles = folderContents.some(file => 
        !file.startsWith('.') && file !== 'README.md'
      );
      
      if (!hasSignificantFiles && !folderContents.includes('.gitkeep')) {
        console.error(`[DEBUG] Adding .gitkeep to ${folder}`);
        await fs.writeFile(path.join(folderPath, ".gitkeep"), "");
      } else {
        console.error(`[DEBUG] Skipping .gitkeep for ${folder} (has files: ${hasSignificantFiles})`);
      }
    } catch (error) {
      console.error(`[ERROR] Failed to create folder ${folder}: ${error}`);
      throw new Error(`Failed to create folder structure for "${folder}": ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Create README files with examples
  try {
    console.error(`[DEBUG] Creating README files...`);
    await createActionsReadme(projectPath);
    await createComponentsReadme(projectPath);
    await createLibReadme(projectPath);
    await createLibDbReadme(projectPath);
    console.error(`[DEBUG] README files created successfully`);
  } catch (error) {
    console.error(`[ERROR] Failed to create README files: ${error}`);
    throw new Error(`Failed to create README files: ${error instanceof Error ? error.message : String(error)}`);
  }

  // === ENHANCED PROJECT STRUCTURE (CONDITIONAL) ===
  if (includeEnhancedStructure) {
    try {
      console.error(`[DEBUG] Creating enhanced project structure...`);
      
      // Create enhanced folder structure
      await createEnhancedProjectStructure(projectPath);
      
      // Create libs structure with utilities
      await createLibsStructure(projectPath);
      
      // Create enhanced structure documentation
      await createEnhancedStructureReadme(projectPath);
      
      console.error(`[DEBUG] Enhanced project structure created successfully`);
    } catch (error) {
      console.error(`[ERROR] Failed to create enhanced project structure: ${error}`);
      throw new Error(`Failed to create enhanced project structure: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // === DATABASE MODELS (CONDITIONAL) ===
  if (includeModels) {
    try {
      console.error(`[DEBUG] Creating models structure...`);
      await createModelsStructure(projectPath);
      console.error(`[DEBUG] Models structure created successfully`);
    } catch (error) {
      console.error(`[ERROR] Failed to create models structure: ${error}`);
      throw new Error(`Failed to create models structure: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // === VALIDATIONS (CONDITIONAL) ===
  if (includeValidations) {
    try {
      console.error(`[DEBUG] Creating validations structure...`);
      await createValidationsStructure(projectPath);
      console.error(`[DEBUG] Validations structure created successfully`);
    } catch (error) {
      console.error(`[ERROR] Failed to create validations structure: ${error}`);
      throw new Error(`Failed to create validations structure: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // === AUTH COMPONENTS (CONDITIONAL) ===
  if (includeAuth) {
    try {
      console.error(`[DEBUG] Creating auth components...`);
      
      // Create auth components (login/signup forms)
      await createAuthComponents(projectPath);
      
      // Create auth pages
      await createAuthPages(projectPath);
      
      // Create enhanced auth actions
      await createEnhancedAuthActions(projectPath);
      
      console.error(`[DEBUG] Auth components created successfully`);
    } catch (error) {
      console.error(`[ERROR] Failed to create auth components: ${error}`);
      throw new Error(`Failed to create auth components: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
