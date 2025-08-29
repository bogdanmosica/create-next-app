# setup_biome_linting Tool

## Overview
Implemented the `setup_biome_linting` tool which sets up Biome for fast linting and formatting with custom GritQL rules, replacing ESLint for better performance.

## Implementation Details

### Files Created
- `src/tools/core/biome-linting.ts` - Main tool implementation
- Reuses existing `creators/config-creators.ts` for Biome configuration

### Dependencies Added
Utilizes existing package installer system:
- `@biomejs/biome` - Main Biome package (dev dependency)

### Configuration Options
```typescript
interface BiomeLintingConfig {
  projectPath: string;           // Required: Project directory
  includeCustomRules?: boolean;  // Default: true - GritQL custom rules
  strictMode?: boolean;          // Default: true - Enhanced linting
}
```

### Steps Performed (4 Steps)
1. **Install Biome** - `pnpm add -D @biomejs/biome`
2. **Initialize Config** - `pnpm exec biome init` 
3. **Custom Configuration** - Create biome.json with custom GritQL rules
4. **Update Scripts** - Add linting/formatting scripts to package.json

### Package.json Scripts Added
```json
{
  "scripts": {
    "lint": "biome check .",
    "lint:fix": "biome check . --apply", 
    "format": "biome format . --write",
    "check": "biome check ."
  }
}
```

## Usage Examples

### Basic Usage
```typescript
{
  "tool": "setup_biome_linting",
  "input": {
    "projectPath": "/path/to/project"
  }
}
```

### Custom Configuration
```typescript
{
  "tool": "setup_biome_linting",
  "input": {
    "projectPath": "/path/to/project",
    "includeCustomRules": false,  // Skip GritQL rules
    "strictMode": false           // Basic linting only
  }
}
```

### Minimal Setup
```typescript
{
  "tool": "setup_biome_linting",
  "input": {
    "projectPath": "/path/to/project",
    "includeCustomRules": false,
    "strictMode": false
  }
}
```

## Dependencies
- **Requires**: `create_nextjs_base` must be run first
- **Auto-detects**: Prevents duplicate setup if Biome already exists
- **Installs**: Biome package automatically via pnpm
- **Configures**: Uses existing Biome configuration creators

## Error Handling
- ✅ **Missing Next.js**: Clear error if base project not found
- ✅ **Duplicate Setup**: Prevents running on existing Biome setup  
- ✅ **Package Installation**: Handles pnpm installation failures
- ✅ **File Permissions**: Validates write access to project directory
- ✅ **Step Tracking**: Shows exact step that failed for debugging

## Generated Configuration

### biome.json (Enhanced)
```json
{
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "security": { "all": true },
      "performance": { "all": true }
    }
  },
  "formatter": {
    "enabled": true,
    "lineWidth": 100,
    "indentStyle": "space"
  },
  "organizeImports": {
    "enabled": true
  }
}
```

### Custom GritQL Rules (if enabled)
- Prevents hardcoded values in forms/selects
- Enforces React best practices  
- Next.js-specific optimizations
- Security improvements

## Performance Benefits
- **10x faster** than ESLint
- **Zero configuration** for TypeScript/React
- **Built-in formatting** (replaces Prettier)
- **Import organization** included

## Testing
- ✅ **TypeScript compilation** succeeds
- ✅ **Dependency detection** works correctly
- ✅ **Package installation** via auto-installer
- ✅ **Configuration creation** using existing creators
- ✅ **Script updates** to package.json
- ✅ **Error handling** for edge cases

## Integration
- **Works with**: `create_nextjs_base` (required first)
- **Integrates with**: `setup_vscode_config` (VSCode settings)
- **Replaces**: ESLint and Prettier (if previously used)
- **Enhances**: Development workflow with faster linting

## Output Example
```
🎉 Biome linting setup completed successfully!

⏱️ Total time: 12.3s

✅ Completed steps:
1. Installing Biome linting package...
2. Initializing Biome configuration...
3. Setting up Biome configuration with custom GritQL rules...
4. Adding Biome scripts to package.json...

🔧 Biome Configuration:
- Linting: Modern ESLint replacement with faster performance
- Formatting: Prettier-compatible code formatting  
- TypeScript: Full TypeScript support with React rules
- Custom Rules: GritQL rules for React/Next.js best practices
- Import Organization: Automatic import sorting with custom groups
- Strict Mode: Enhanced security and performance linting

📋 Available Scripts:
- `pnpm lint` - Check for linting issues
- `pnpm lint:fix` - Auto-fix linting issues
- `pnpm format` - Format code
- `pnpm check` - Run full Biome check

💡 Next steps:
1. Run `pnpm lint` to check your code
2. Set up VSCode integration with `setup_vscode_config`
3. Add more features with other MCP tools
```

## Next Steps
This tool provides fast, modern linting. Users can then:
- Set up VSCode integration with `setup_vscode_config`
- Add database with `setup_drizzle_orm`
- Add authentication with `setup_authentication_jwt`