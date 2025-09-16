# MCP Configuration Guide

## Environment Variables

### Disable Transaction Files

By default, the MCP creates transaction files (`.mcp-transaction-*.json`) to track the state of project creation for rollback capabilities. These files are useful for debugging and recovery but can clutter your workspace.

To disable transaction file creation, set the environment variable:

```bash
export MCP_DISABLE_TRANSACTION_FILES=true
```

Or add it to your `.env` file:

```env
# Disable MCP transaction file creation
MCP_DISABLE_TRANSACTION_FILES=true
```

### Test Folder Management

Test folders created during development (like `test-build-validation*`) are automatically added to `.gitignore` to prevent them from being committed to version control.

## Files Added to .gitignore

The following patterns have been automatically added to prevent test artifacts from being committed:

```gitignore
# Test build validation folders
test-build-validation*/
test-*

# MCP Transaction files
.mcp-transaction*.json
```

## Restart Required

After making these changes, restart your MCP server to ensure the new settings take effect.