# Runners

Command execution utilities for running npm commands and system operations safely during app creation.

## Files

### `command-runner.ts`
Executes shell commands with proper error handling and logging:

- **Safe command execution** - Uses promisified `child_process.exec`
- **Timeout protection** - 5-minute timeout to prevent hanging
- **Error handling** - Distinguishes between warnings and actual errors
- **Logging** - Comprehensive debug output for troubleshooting
- **Cross-platform** - Works on Windows, macOS, and Linux

## Usage

```typescript
import { runCommand } from './runners/command-runner';

// Install dependencies
await runCommand('pnpm install', projectPath);

// Run build
await runCommand('npm run build', projectPath);
```

## Features

- **Timeout handling** - Commands timeout after 5 minutes
- **Error differentiation** - Only throws on actual errors, not warnings
- **Debug logging** - Logs command execution for troubleshooting
- **Working directory** - Executes commands in the specified directory
- **Promise-based** - Uses async/await for clean error handling

## Error Handling

The runner distinguishes between:
- **Warnings** - Logged but don't stop execution
- **Actual errors** - Throw exceptions and stop the process
- **Timeouts** - Commands that run too long are terminated

This ensures the MCP can handle various npm/system command scenarios gracefully.