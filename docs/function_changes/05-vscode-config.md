# setup_vscode_config Tool

## Overview
Implemented the `setup_vscode_config` tool which creates comprehensive VSCode settings for optimal Next.js development experience with Biome integration and debugging setup.

## Implementation Details

### Files Created
- `src/tools/core/vscode-config.ts` - Main tool implementation
- Reuses existing `creators/config-creators.ts` for VSCode settings

### Configuration Options
```typescript
interface VSCodeConfigConfig {
  projectPath: string;        // Required: Project directory
  optimizeForBiome?: boolean; // Default: true - Biome integration
}
```

### Steps Performed (4 Steps)
1. **Create Directory** - Ensure `.vscode/` directory exists
2. **Settings Configuration** - Create optimized `settings.json`
3. **Extensions Setup** - Configure recommended extensions
4. **Debugging Setup** - Create `launch.json` for debugging

### Generated VSCode Configuration Files

#### .vscode/settings.json
```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.organizeImports": true,
    "quickfix.biome": true
  },
  "editor.defaultFormatter": "biomejs.biome",
  "typescript.preferences.includePackageJsonAutoImports": "on",
  "tailwindCSS.experimental.classRegex": [
    ["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"]
  ]
}
```

#### .vscode/extensions.json
```json
{
  "recommendations": [
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next", 
    "biomejs.biome",
    "christian-kohler.path-intellisense",
    "formulahendry.auto-rename-tag",
    "christian-kohler.npm-intellisense"
  ],
  "unwantedRecommendations": [
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint"
  ]
}
```

#### .vscode/launch.json
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Next.js: debug server-side",
      "type": "node-terminal",
      "request": "launch", 
      "command": "pnpm dev",
      "serverReadyAction": {
        "pattern": "- Local:.*?(https?://(?:localhost|\\[\\d*\\.*\\d*\\.*\\d*\\.*\\d*\\.*\\d*\\]|0\\.0\\.0\\.0)(?:\\d+)?)",
        "uriFormat": "%s",
        "action": "openExternally"
      }
    },
    {
      "name": "Next.js: debug client-side",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:3000",
      "webRoot": "${workspaceFolder}"
    }
  ]
}
```

## Usage Examples

### Basic Usage
```typescript
{
  "tool": "setup_vscode_config", 
  "input": {
    "projectPath": "/path/to/project"
  }
}
```

### Without Biome Optimization
```typescript
{
  "tool": "setup_vscode_config",
  "input": {
    "projectPath": "/path/to/project",
    "optimizeForBiome": false
  }
}
```

## Dependencies
- **Requires**: `create_nextjs_base` must be run first
- **Auto-detects**: Prevents duplicate setup if VSCode config already exists
- **Integrates with**: `setup_biome_linting` for optimal experience
- **Configures**: Uses existing VSCode settings creators

## Key Features

### Development Experience
- **Format on Save** - Automatic code formatting
- **Import Organization** - Auto-organize imports on save
- **IntelliSense** - Enhanced code completion for TypeScript/React
- **Tailwind Support** - Full Tailwind CSS class completion
- **Path Completion** - Intelligent file path suggestions

### Debugging Setup
- **Server-side Debugging** - Debug Next.js server with F5
- **Client-side Debugging** - Debug in Chrome with breakpoints
- **Auto-launch** - Automatically opens browser when debugging
- **Source Maps** - Full TypeScript debugging support

### Extension Management
- **Recommended Extensions** - Auto-suggests helpful extensions
- **Conflict Prevention** - Disables conflicting extensions (ESLint, Prettier when using Biome)
- **Team Consistency** - Shared extension recommendations

### Biome Integration (when enabled)
- **Biome as Default Formatter** - Uses Biome for formatting
- **Quick Fixes** - Auto-apply Biome fixes on save
- **Conflict Resolution** - Disables Prettier/ESLint to prevent conflicts

## Error Handling
- ✅ **Missing Next.js**: Clear error if base project not found
- ✅ **Duplicate Setup**: Prevents overwriting existing VSCode config
- ✅ **Directory Creation**: Handles `.vscode/` directory creation failures  
- ✅ **File Permissions**: Validates write access to project directory
- ✅ **Step Tracking**: Shows exact step that failed for debugging

## Testing
- ✅ **TypeScript compilation** succeeds
- ✅ **Dependency detection** works correctly
- ✅ **Configuration creation** using existing creators
- ✅ **File generation** for all VSCode configuration files
- ✅ **Error handling** for edge cases
- ✅ **Biome integration** detection and optimization

## Integration
- **Works with**: `create_nextjs_base` (required first)
- **Optimizes for**: `setup_biome_linting` (if present)
- **Enhances**: Development workflow with consistent settings
- **Supports**: Team development with shared configurations

## Output Example
```
🎉 VSCode configuration setup completed successfully!

⏱️ Total time: 2.1s

✅ Completed steps:
1. Creating .vscode directory...
2. Creating VSCode settings optimized for Biome...
3. Setting up recommended VSCode extensions...
4. Setting up debugging configuration...

⚙️ VSCode Configuration:
- Auto-formatting: Format on save enabled with Biome
- Import organization: Auto-organize imports on save
- TypeScript: Enhanced TypeScript support
- Tailwind: Tailwind CSS IntelliSense  
- Debugging: Ready-to-use debug configurations

🔌 Recommended Extensions:
- Biome - Fast linting and formatting (enabled)
- Tailwind CSS IntelliSense - Tailwind class completion
- TypeScript Importer - Auto-import suggestions
- Path Intellisense - File path completion

📁 Configuration Files Created:
- .vscode/settings.json - Editor settings and preferences
- .vscode/extensions.json - Recommended extensions
- .vscode/launch.json - Debugging configurations

💡 Usage:
1. Install recommended extensions when prompted by VSCode
2. Start debugging with F5 or Debug panel  
3. Format code automatically on save
4. Organize imports automatically on save

✅ Perfect Integration: Your Biome setup is fully integrated with VSCode!
```

## Benefits
- **Consistent Experience** - Same settings across all developers
- **Optimal Performance** - Configured for Next.js and TypeScript
- **Debugging Ready** - Full debugging setup out of the box
- **Extension Management** - Prevents conflicts and suggests helpful tools
- **Team Productivity** - Shared configuration reduces setup time

## Next Steps
This tool provides the development environment foundation. Users can then:
- Install recommended extensions when prompted
- Use F5 to start debugging Next.js applications  
- Add database with `setup_drizzle_orm`
- Add authentication with `setup_authentication_jwt`