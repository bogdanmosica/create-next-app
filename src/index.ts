#!/usr/bin/env node

/**
 * @fileoverview Next.js SaaS Starter MCP Server Entry Point
 * @description Bootstraps the MCP server using modular components
 * @version 1.0.0
 */

import { NextJsCreatorServer } from "./core/server.js";
import { ConfigManager } from "./utils/config-manager.js";

// Initialize configuration and start the server
async function main() {
  try {
    // Initialize configuration system
    await ConfigManager.initialize();
    
    // Start the MCP server
    const server = new NextJsCreatorServer();
    await server.run();
  } catch (error) {
    console.error('Failed to start MCP server:', error);
    process.exit(1);
  }
}

main();
