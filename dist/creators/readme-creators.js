import fs from "fs-extra";
import path from "node:path";
import { actionsReadmeTemplate, componentsReadmeTemplate, libReadmeTemplate, libDbReadmeTemplate } from "../templates/readme-templates.js";
export async function createActionsReadme(projectPath) {
    await fs.writeFile(path.join(projectPath, "actions", "README.md"), actionsReadmeTemplate);
}
export async function createComponentsReadme(projectPath) {
    await fs.writeFile(path.join(projectPath, "components", "README.md"), componentsReadmeTemplate);
}
export async function createLibReadme(projectPath) {
    await fs.writeFile(path.join(projectPath, "lib", "README.md"), libReadmeTemplate);
}
export async function createLibDbReadme(projectPath) {
    await fs.writeFile(path.join(projectPath, "lib", "db", "README.md"), libDbReadmeTemplate);
}
//# sourceMappingURL=readme-creators.js.map