/**
 * @fileoverview MCP Server Core
 * @description Core MCP server setup, initialization, and error handling
 * Extracted from the main server file for better separation of concerns
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { getToolRegistry } from "./tool-registry.js";
import { ToolOrchestrator } from "./tool-orchestrator.js";

export class NextJsCreatorServer {
  private server: Server;
  private orchestrator: ToolOrchestrator;

  constructor() {
    this.server = new Server(
      {
        name: "create-nextjs-mcp",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.orchestrator = new ToolOrchestrator();
    this.setupRequestHandlers();
    this.setupErrorHandling();
  }

  /**
   * Set up error handling for the server and process
   */
  private setupErrorHandling(): void {
    this.server.onerror = (error) => console.error("[MCP Error]", error);
    
    process.on("unhandledRejection", (reason) => {
      console.error("[UnhandledRejection]", reason);
    });
    
    process.on("uncaughtException", (err) => {
      console.error("[UncaughtException]", err);
    });
    
    process.on("SIGINT", async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  /**
   * Set up MCP request handlers
   */
  private setupRequestHandlers(): void {
    // Handle tool listing requests
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: getToolRegistry(),
    }));

    // Handle tool execution requests
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        const result = await this.orchestrator.executeTool(name, args);
        
        return {
          content: [
            {
              type: "text",
              text: result,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  /**
   * Start the MCP server
   */
  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Next.js Creator MCP server running on stdio");
  }

  /**
   * Gracefully close the server
   */
  async close(): Promise<void> {
    await this.server.close();
  }
}