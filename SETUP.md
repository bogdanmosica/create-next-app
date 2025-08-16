# MCP Server Setup Guide for VSCode + Claude Code

## 1. Server Location
Keep your MCP server in a dedicated directory:
```
D:\Projects\Model Context Protocols\create-next-app\
```

## 2. VSCode Configuration

### Step 1: Open VSCode Settings
- Press `Ctrl + ,` (Windows/Linux) or `Cmd + ,` (Mac)
- Click on "Open Settings (JSON)" icon in the top right

### Step 2: Add MCP Configuration
Add this to your VSCode `settings.json`:

```json
{
  "claude-code.mcpServers": {
    "create-nextjs": {
      "command": "node",
      "args": ["D:\\Projects\\Model Context Protocols\\create-next-app\\dist\\index.js"],
      "env": {}
    }
  }
}
```

**Important Notes:**
- Use double backslashes (`\\`) in Windows paths
- For macOS/Linux, use forward slashes: `/Users/username/mcp-servers/create-next-app/dist/index.js`

## 3. Alternative: Using npm global install

### Step 1: Make it globally available
```bash
cd "D:\Projects\Model Context Protocols\create-next-app"
npm link
```

### Step 2: Update VSCode settings
```json
{
  "claude-code.mcpServers": {
    "create-nextjs": {
      "command": "create-nextjs-mcp",
      "args": [],
      "env": {}
    }
  }
}
```

## 4. Restart VSCode
After adding the configuration, restart VSCode to load the MCP server.

## 5. Verify Installation
1. Open Claude Code in VSCode
2. Type `/tools` to see available tools
3. Look for `create_nextjs_app` in the list

## Troubleshooting

### Server not loading?
1. Check the file path in settings.json
2. Ensure the server was built: `pnpm run build`
3. Check VSCode Developer Console (Help > Toggle Developer Tools)

### Permission issues?
- On Windows: Run VSCode as administrator
- On macOS/Linux: Ensure execute permissions: `chmod +x dist/index.js`