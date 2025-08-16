import fs from "fs-extra";
import path from "path";
import { actionsReadmeTemplate, componentsReadmeTemplate, libReadmeTemplate, libDbReadmeTemplate } from "../templates/readme-templates.js";

export async function createActionsReadme(projectPath: string): Promise<void> {
  await fs.writeFile(path.join(projectPath, "actions", "README.md"), actionsReadmeTemplate);
}

export async function createComponentsReadme(projectPath: string): Promise<void> {
  await fs.writeFile(path.join(projectPath, "components", "README.md"), componentsReadmeTemplate);
}

export async function createLibReadme(projectPath: string): Promise<void> {
  await fs.writeFile(path.join(projectPath, "lib", "README.md"), libReadmeTemplate);
}

export async function createLibDbReadme(projectPath: string): Promise<void> {
  await fs.writeFile(path.join(projectPath, "lib", "db", "README.md"), libDbReadmeTemplate);
}