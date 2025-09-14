#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { findWorkflowsPath, validateWorkflowsPath } from '../workflows/finder.js';
import { WorkflowManager } from '../workflows/manager.js';
import { N8nManager } from '../n8n/manager.js';
import { CredentialHelper } from '../credentials/helper.js';
import { getToolDefinitions } from '../tools/registry.js';
import { ToolHandler } from '../tools/handler.js';
import { getResourceDefinitions, handleResourceRead } from './resources.js';
import { getPromptDefinitions, handleGetPrompt } from './prompts.js';

/**
 * McFlow MCP Server - Complete n8n workflow management
 *
 * ⚠️ CRITICAL FOR AI AGENTS: ⚠️
 * This server REPLACES all n8n CLI commands. NEVER use n8n directly!
 * The node extraction system requires ALL workflow operations go through McFlow.
 */
export class McFlowServer {
  private server: Server;
  private workflowsPath: string;
  private workflowManager: WorkflowManager;
  private n8nManager: N8nManager;
  private credentialHelper: CredentialHelper;
  private toolHandler: ToolHandler;

  constructor() {
    this.server = new Server(
      {
        name: 'mcflow',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
        },
      }
    );

    // Intelligently find the workflows directory
    this.workflowsPath = findWorkflowsPath();

    // Validate the path was found
    if (!validateWorkflowsPath(this.workflowsPath)) {
      console.error(`Warning: Workflows path may not be valid: ${this.workflowsPath}`);
      console.error('The MCP server will continue but some operations may fail.');
    }

    // Initialize managers
    this.workflowManager = new WorkflowManager(this.workflowsPath);
    this.n8nManager = new N8nManager(this.workflowsPath);
    this.credentialHelper = new CredentialHelper(this.workflowsPath);
    this.toolHandler = new ToolHandler(
      this.workflowsPath,
      this.workflowManager,
      this.n8nManager,
      this.credentialHelper
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    // Tools handler
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: getToolDefinitions(),
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      return await this.toolHandler.handleTool(
        request.params.name,
        request.params.arguments
      );
    });

    // Resources handler
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: getResourceDefinitions(),
    }));

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      return await handleResourceRead(this.workflowsPath, request.params.uri);
    });

    // Prompts handler
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => ({
      prompts: getPromptDefinitions(),
    }));

    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      return await handleGetPrompt(request.params.name, request.params.arguments);
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('McFlow MCP server running...');
    console.error('');
    console.error('⚠️  IMPORTANT: NEVER use n8n CLI commands directly!');
    console.error('   Always use McFlow tools for ALL workflow operations.');
    console.error('   Using n8n directly will BREAK the node extraction system.');
    console.error('   See docs/ai/instructions.md for details.');
    console.error('');
  }
}