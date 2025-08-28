import fs from "fs-extra";
import path from "node:path";
import { createActionsReadme, createComponentsReadme, createLibReadme, createLibDbReadme } from "./readme-creators.js";

export async function createFolderStructure(projectPath: string): Promise<void> {
  // Create directories
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
}
