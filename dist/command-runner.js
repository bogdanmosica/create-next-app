import { promisify } from "util";
import { exec } from "child_process";
const execAsync = promisify(exec);
export async function runCommand(command, cwd) {
    try {
        console.error(`[DEBUG] Running command: ${command} in ${cwd}`);
        const { stdout, stderr } = await execAsync(command, { cwd, timeout: 300000 }); // 5 minute timeout
        if (stderr) {
            console.error(`[DEBUG] Command stderr: ${stderr}`);
            // Only throw for actual errors, not warnings
            if (stderr.toLowerCase().includes('error') && !stderr.includes('WARN')) {
                throw new Error(`Command failed with stderr: ${stderr}`);
            }
        }
        console.error(`[DEBUG] Command completed successfully`);
        return stdout;
    }
    catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`[DEBUG] Command failed: ${command}`);
        console.error(`[DEBUG] Error details: ${errorMsg}`);
        throw new Error(`Command "${command}" failed: ${errorMsg}`);
    }
}
//# sourceMappingURL=command-runner.js.map