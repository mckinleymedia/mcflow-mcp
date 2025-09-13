#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import fs from 'fs/promises';
import path from 'path';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { findWorkflowsPath, validateWorkflowsPath } from './workflow-finder.js';
import { WorkflowManager } from './workflow-manager.js';
import { N8nManager } from './n8n-manager.js';
import { CredentialHelper } from './credential-helper.js';
import { NodePositioning } from './node-positioning.js';

/**
 * McFlow MCP Server - Complete n8n workflow management
 * 
 * ⚠️ CRITICAL FOR AI AGENTS: ⚠️
 * This server REPLACES all n8n CLI commands. NEVER use n8n directly!
 * - DO NOT use "n8n import:workflow" - use "mcflow deploy"
 * - DO NOT use "n8n export:workflow" - use "mcflow export"
 * - DO NOT use "$readFile()" in nodes - McFlow handles injection
 * 
 * The node extraction system requires ALL workflow operations go through McFlow.
 * Using n8n CLI directly will BREAK the system because:
 * 1. Extracted nodes have empty content in workflows (stored in files)
 * 2. McFlow injects file content during deployment
 * 3. n8n cannot read files - $readFile() does NOT work in nodes
 * 
 * See docs/ai/instructions.md for complete details.
 */
class McFlowServer {
  private server: Server;
  private workflowsPath: string;
  private workflowManager: WorkflowManager;
  private n8nManager: N8nManager;
  private credentialHelper: CredentialHelper;

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
    
    // Initialize the workflow manager
    this.workflowManager = new WorkflowManager(this.workflowsPath);
    
    // Initialize the n8n manager
    this.n8nManager = new N8nManager(this.workflowsPath);
    
    // Initialize the credential helper
    this.credentialHelper = new CredentialHelper(this.workflowsPath);
    
    this.setupHandlers();
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'list',
          description: 'List all n8n workflows in this project (use deployed to see workflows in n8n)',
          inputSchema: {
            type: 'object',
            properties: {
              project: {
                type: 'string',
                description: 'Optional project name to filter workflows',
              },
            },
          },
        },
        {
          name: 'read',
          description: 'Read a specific n8n workflow JSON file',
          inputSchema: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'Path to the workflow file relative to workflows root',
              },
            },
            required: ['path'],
          },
        },
        {
          name: 'create',
          description: 'Create a new n8n workflow with REAL nodes only (no mock/placeholder nodes allowed)',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Workflow name',
              },
              workflow: {
                type: 'object',
                description: 'The workflow JSON object',
              },
              project: {
                type: 'string',
                description: 'Optional project name (only for multi-project repos)',
              },
            },
            required: ['name', 'workflow'],
          },
        },
        {
          name: 'update',
          description: 'Update an existing n8n workflow',
          inputSchema: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'Path to the workflow file relative to workflows root',
              },
              workflow: {
                type: 'object',
                description: 'The updated workflow JSON object',
              },
            },
            required: ['path', 'workflow'],
          },
        },
        {
          name: 'analyze',
          description: 'Analyze a workflow structure and dependencies',
          inputSchema: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'Path to the workflow file relative to workflows root',
              },
            },
            required: ['path'],
          },
        },
        {
          name: 'info',
          description: 'Get project or workflow structure information',
          inputSchema: {
            type: 'object',
            properties: {
              project: {
                type: 'string',
                description: 'Project name',
              },
            },
            required: ['project'],
          },
        },
        {
          name: 'validate',
          description: 'Validate a workflow structure and check for common issues',
          inputSchema: {
            type: 'object',
            properties: {
              workflow: {
                type: 'object',
                description: 'The workflow JSON object to validate',
              },
              path: {
                type: 'string',
                description: 'Path to workflow file to validate',
              },
              autofix: {
                type: 'boolean',
                description: 'Automatically fix common issues like multiplex mode',
              },
            },
          },
        },
        {
          name: 'add_node',
          description: 'Add a REAL n8n node to workflow (no mock/placeholder nodes allowed)',
          inputSchema: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'Path to the workflow file',
              },
              node: {
                type: 'object',
                description: 'The node to add',
              },
              position: {
                type: 'object',
                properties: {
                  x: { type: 'number' },
                  y: { type: 'number' },
                },
                description: 'Position for the new node',
              },
            },
            required: ['path', 'node'],
          },
        },
        {
          name: 'connect',
          description: 'Create a connection between two nodes in a workflow',
          inputSchema: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'Path to the workflow file',
              },
              sourceNode: {
                type: 'string',
                description: 'ID of the source node',
              },
              targetNode: {
                type: 'string',
                description: 'ID of the target node',
              },
              sourceOutput: {
                type: 'string',
                description: 'Output type from source node (default: main)',
              },
              targetInput: {
                type: 'string',
                description: 'Input type for target node (default: main)',
              },
            },
            required: ['path', 'sourceNode', 'targetNode'],
          },
        },
        {
          name: 'generate',
          description: 'Generate a workflow from template using REAL n8n nodes (no mock/placeholder nodes)',
          inputSchema: {
            type: 'object',
            properties: {
              template: {
                type: 'string',
                enum: ['webhook-api', 'scheduled-report', 'data-sync', 'error-handler', 'approval-flow'],
                description: 'Template type to use',
              },
              name: {
                type: 'string',
                description: 'Workflow name',
              },
              project: {
                type: 'string',
                description: 'Optional project name (only for multi-project repos)',
              },
              config: {
                type: 'object',
                description: 'Configuration options for the template',
              },
            },
            required: ['template', 'name'],
          },
        },
        {
          name: 'deploy',
          description: 'Deploy workflows to n8n instance - handles all n8n import commands internally',
          inputSchema: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'Optional: Deploy specific workflow file. If not provided, deploys all changed workflows',
              },
              all: {
                type: 'boolean',
                description: 'Deploy ALL workflows, not just changed ones',
              },
              activate: {
                type: 'boolean',
                description: 'Activate workflows after importing',
              },
              separate: {
                type: 'boolean',
                description: 'Import as separate workflows (not merged)',
              },
            },
          },
        },
        {
          name: 'export',
          description: 'Export workflows from n8n - replaces "n8n export:workflow" command',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Workflow ID to export',
              },
              all: {
                type: 'boolean',
                description: 'Export all workflows',
              },
              outputPath: {
                type: 'string',
                description: 'Output directory path (defaults to workflows/flows)',
              },
              pretty: {
                type: 'boolean',
                description: 'Format JSON output prettily (default: true)',
              },
            },
          },
        },
        {
          name: 'execute',
          description: 'Execute/test an n8n workflow - DO NOT use bash n8n commands, use this tool instead',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Workflow ID to execute',
              },
              file: {
                type: 'string',
                description: 'Path to workflow file to execute',
              },
              data: {
                type: 'object',
                description: 'Input data for the workflow',
              },
            },
          },
        },
        {
          name: 'deployed',
          description: 'List all workflows in n8n instance - replaces "n8n list:workflow" command',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'activate',
          description: 'Activate or deactivate a workflow in n8n',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Workflow ID',
              },
              active: {
                type: 'boolean',
                description: 'Set to true to activate, false to deactivate',
              },
            },
            required: ['id', 'active'],
          },
        },
        {
          name: 'start',
          description: 'Start n8n server - replaces "n8n start" command',
          inputSchema: {
            type: 'object',
            properties: {
              port: {
                type: 'number',
                description: 'Port to run n8n on (default: 5678)',
              },
              tunnel: {
                type: 'boolean',
                description: 'Enable tunnel for webhook testing',
              },
            },
          },
        },
        {
          name: 'status',
          description: 'Show deployment status of workflows (which are deployed, which need deployment)',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'extract_code',
          description: 'Extract code nodes to separate files in workflows/nodes/ for better editing',
          inputSchema: {
            type: 'object',
            properties: {
              workflow: {
                type: 'string',
                description: 'Specific workflow to extract code from (optional, extracts all if not specified)',
              },
            },
          },
        },
        {
          name: 'list_code',
          description: 'List all extracted code nodes',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'create_module',
          description: 'Create a shared code module that can be used across workflows',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Name of the shared module',
              },
              language: {
                type: 'string',
                enum: ['javascript', 'python'],
                description: 'Programming language for the module',
              },
            },
            required: ['name', 'language'],
          },
        },
        {
          name: 'validate',
          description: 'Validate workflows for n8n compatibility, node issues, and connection problems',
          inputSchema: {
            type: 'object',
            properties: {
              workflow: {
                type: 'string',
                description: 'Specific workflow to validate (optional, validates all if not specified)',
              },
              fix: {
                type: 'boolean',
                description: 'Automatically fix common issues (default: false)',
              },
            },
          },
        },
        {
          name: 'credentials',
          description: 'Analyze credential requirements for workflows (secure - never exposes actual values)',
          inputSchema: {
            type: 'object',
            properties: {
              action: {
                type: 'string',
                enum: ['analyze', 'instructions', 'generate-env'],
                description: 'Action to perform: analyze requirements, show setup instructions, or generate .env.example',
              },
            },
            required: ['action'],
          },
        },
        {
          name: 'refresh',
          description: 'Refresh MCP server to pick up code changes without restarting',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      switch (request.params.name) {
        case 'list':
          return await this.workflowManager.listWorkflows(request.params.arguments?.project as string);
        
        case 'read':
          return await this.workflowManager.readWorkflow(request.params.arguments?.path as string);
        
        case 'create':
          return await this.workflowManager.createWorkflow(
            request.params.arguments?.name as string,
            request.params.arguments?.workflow as any,
            request.params.arguments?.project as string
          );
        
        case 'update':
          return await this.workflowManager.updateWorkflow(
            request.params.arguments?.path as string,
            request.params.arguments?.workflow as any
          );
        
        case 'analyze':
          return await this.analyzeWorkflow(request.params.arguments?.path as string);
        
        case 'info':
          return await this.workflowManager.getProjectInfo(request.params.arguments?.project as string);
        
        case 'validate':
          const validatePath = request.params.arguments?.path as string;
          const validateWorkflow = request.params.arguments?.workflow as any;
          const autofix = request.params.arguments?.autofix as boolean;
          
          if (validatePath) {
            // Validate from file
            const fullPath = path.join(this.workflowsPath, validatePath);
            const content = await fs.readFile(fullPath, 'utf-8');
            const workflow = JSON.parse(content);
            
            if (autofix) {
              const fixed = await this.autofixWorkflow(workflow);
              if (fixed.changed) {
                await fs.writeFile(fullPath, JSON.stringify(fixed.workflow, null, 2));
                return {
                  content: [{
                    type: 'text',
                    text: `✅ Fixed ${fixed.fixes.length} issues:\n${fixed.fixes.join('\n')}\n\nWorkflow saved!`
                  }]
                };
              }
            }
            
            return await this.validateWorkflow(workflow);
          } else {
            return await this.validateWorkflow(validateWorkflow);
          }
        
        case 'add_node':
          return await this.addNodeToWorkflow(
            request.params.arguments?.path as string,
            request.params.arguments?.node as any,
            request.params.arguments?.position as any
          );
        
        case 'connect':
          return await this.connectNodes(
            request.params.arguments?.path as string,
            request.params.arguments?.sourceNode as string,
            request.params.arguments?.targetNode as string,
            request.params.arguments?.sourceOutput as string,
            request.params.arguments?.targetInput as string
          );
        
        case 'generate':
          return await this.generateWorkflowFromTemplate(
            request.params.arguments?.template as string,
            request.params.arguments?.project as string,
            request.params.arguments?.name as string,
            request.params.arguments?.config as any
          );
        
        case 'deploy':
          const deployPath = request.params.arguments?.path as string;
          const deployAll = request.params.arguments?.all as boolean;
          const deployOptions = {
            activate: request.params.arguments?.activate as boolean,
            separate: request.params.arguments?.separate as boolean,
          };
          
          if (deployPath) {
            // Deploy specific workflow
            return await this.n8nManager.importWorkflow(deployPath, deployOptions);
          } else if (deployAll) {
            // Deploy all workflows
            return await this.n8nManager.deployAllWorkflows(deployOptions);
          } else {
            // Deploy changed workflows (default)
            return await this.n8nManager.deployChangedWorkflows(deployOptions);
          }
        
        case 'export':
          return await this.n8nManager.exportWorkflow({
            id: request.params.arguments?.id as string,
            all: request.params.arguments?.all as boolean,
            outputPath: request.params.arguments?.outputPath as string,
            pretty: request.params.arguments?.pretty as boolean,
          });
        
        case 'execute':
          return await this.n8nManager.executeWorkflow({
            id: request.params.arguments?.id as string,
            file: request.params.arguments?.file as string,
            data: request.params.arguments?.data as any,
          });
        
        case 'deployed':
          return await this.n8nManager.listDeployedWorkflows();
        
        case 'activate':
          return await this.n8nManager.updateWorkflowStatus(
            request.params.arguments?.id as string,
            request.params.arguments?.active as boolean
          );
        
        case 'start':
          return await this.n8nManager.startN8n({
            port: request.params.arguments?.port as number,
            tunnel: request.params.arguments?.tunnel as boolean,
          });
        
        case 'status':
          const changeTracker = new (await import('./change-tracker.js')).ChangeTracker(this.workflowsPath);
          await changeTracker.initialize();
          const statusDetails = await changeTracker.getChangeDetails();
          return {
            content: [{
              type: 'text',
              text: statusDetails
            }]
          };
        
        case 'extract_code':
          const codeManager = new (await import('./node-manager.js')).NodeManager(this.workflowsPath);
          await codeManager.initialize();
          
          const workflowToExtract = request.params.arguments?.workflow as string | undefined;
          
          if (workflowToExtract) {
            // Extract from specific workflow
            const workflowPath = path.join(this.workflowsPath, 'workflows', 'flows', `${workflowToExtract}.json`);
            const result = await codeManager.extractNodes(workflowPath);
            return {
              content: [{
                type: 'text',
                text: result.extracted.length > 0 
                  ? `✅ Extracted ${result.extracted.length} code nodes from ${workflowToExtract}\n\n` +
                    result.extracted.map((n: any) => `• ${n.nodeName} → ${n.filePath}`).join('\n')
                  : `📭 No code nodes found in ${workflowToExtract}`
              }]
            };
          } else {
            // Extract from all workflows
            return await codeManager.extractAllNodes();
          }
        
        case 'list_code':
          const codeListManager = new (await import('./node-manager.js')).NodeManager(this.workflowsPath);
          await codeListManager.initialize();
          return await codeListManager.listNodes();
        
        case 'create_module':
          const moduleManager = new (await import('./node-manager.js')).NodeManager(this.workflowsPath);
          await moduleManager.initialize();
          return await moduleManager.createSharedModule(
            request.params.arguments?.name as string,
            request.params.arguments?.language as 'javascript' | 'python'
          );
        
        case 'validate':
          const workflowToValidate = request.params.arguments?.workflow as string | undefined;
          const autoFix = request.params.arguments?.fix as boolean || false;
          
          if (workflowToValidate) {
            // Validate specific workflow
            const workflowPath = path.join(this.workflowsPath, 'workflows', 'flows', `${workflowToValidate}.json`);
            const validation = await this.workflowManager.getValidator().validateWorkflow(workflowPath);
            
            if (autoFix && !validation.valid) {
              const fixResult = await this.workflowManager.getValidator().autoFixWorkflow(workflowPath);
              return {
                content: [{
                  type: 'text',
                  text: `🔧 Auto-fix Results for ${workflowToValidate}:\n\n` +
                        (fixResult.fixed 
                          ? `✅ Fixed ${fixResult.changes.length} issue(s):\n${fixResult.changes.map(c => `  • ${c}`).join('\n')}`
                          : '❌ No auto-fixable issues found') +
                        '\n\nRun validate again to check remaining issues.'
                }]
              };
            }
            
            return validation;
          } else {
            // Validate all workflows
            if (autoFix) {
              // Auto-fix all workflows
              const flowsDir = path.join(this.workflowsPath, 'workflows', 'flows');
              const files = await fs.readdir(flowsDir);
              const allFixes: string[] = [];
              
              for (const file of files) {
                if (!file.endsWith('.json') || file === 'package.json') continue;
                const filePath = path.join(flowsDir, file);
                const fixResult = await this.workflowManager.getValidator().autoFixWorkflow(filePath);
                if (fixResult.fixed) {
                  allFixes.push(`${file.replace('.json', '')}: ${fixResult.changes.length} fix(es)`);
                }
              }
              
              return {
                content: [{
                  type: 'text',
                  text: `🔧 Auto-fix Results:\n\n` +
                        (allFixes.length > 0 
                          ? `✅ Fixed issues in ${allFixes.length} workflow(s):\n${allFixes.map(f => `  • ${f}`).join('\n')}`
                          : '✅ No auto-fixable issues found') +
                        '\n\nRun validate again to check remaining issues.'
                }]
              };
            }
            
            return await this.workflowManager.getValidator().validateAllWorkflows();
          }

        case 'credentials':
          const credAction = request.params.arguments?.action as string;
          switch (credAction) {
            case 'analyze':
              return await this.credentialHelper.analyzeCredentialRequirements();
            case 'instructions':
              return await this.credentialHelper.getCredentialSetupInstructions();
            case 'generate-env':
              return await this.credentialHelper.generateSecureEnvExample();
            default:
              throw new Error(`Unknown credential action: ${credAction}`);
          }
        
        case 'refresh':
          try {
            // Clear module cache for our source files
            const srcPath = path.join(this.workflowsPath, 'src');
            const distPath = path.join(this.workflowsPath, 'dist');
            
            // Clear require cache for all our modules
            Object.keys(require.cache).forEach(key => {
              if (key.includes('mcflow-mcp/dist/') || key.includes('mcflow-mcp/src/')) {
                delete require.cache[key];
              }
            });
            
            // Rebuild the project
            const { exec } = await import('child_process');
            const { promisify } = await import('util');
            const execAsync = promisify(exec);
            
            console.error('🔄 Rebuilding McFlow...');
            const { stdout, stderr } = await execAsync('npm run build', { cwd: this.workflowsPath });
            
            // Reinitialize managers with fresh modules
            const { WorkflowManager } = await import('./workflow-manager.js');
            const { N8nManager } = await import('./n8n-manager.js');
            const { CredentialHelper } = await import('./credential-helper.js');
            
            this.workflowManager = new WorkflowManager(this.workflowsPath);
            this.n8nManager = new N8nManager(this.workflowsPath);
            this.credentialHelper = new CredentialHelper(this.workflowsPath);
            
            return {
              content: [
                {
                  type: 'text',
                  text: '✅ McFlow MCP server refreshed successfully!\n\n' +
                        '🔄 Modules reloaded\n' +
                        '🏗️ Project rebuilt\n' +
                        '✨ Ready with latest changes\n\n' +
                        'Note: This refreshes the server code but doesn\'t restart the MCP connection.\n' +
                        'For full restart, close and reopen Claude.',
                },
              ],
            };
          } catch (error: any) {
            return {
              content: [
                {
                  type: 'text',
                  text: `❌ Failed to refresh MCP server:\n${error.message}\n\n` +
                        'Try closing and reopening Claude for a full restart.',
                },
              ],
            };
          }
        
        default:
          throw new Error(`Unknown tool: ${request.params.name}`);
      }
    });

    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: 'workflow://instructions/general',
          name: 'General AI Instructions',
          description: 'General instructions for working with n8n workflows',
          mimeType: 'text/markdown',
        },
        {
          uri: 'workflow://instructions/process',
          name: 'Process Instructions',
          description: 'Instructions for workflow creation process',
          mimeType: 'text/markdown',
        },
        {
          uri: 'workflow://instructions/repo',
          name: 'Repository Instructions',
          description: 'Repository-specific instructions',
          mimeType: 'text/markdown',
        },
      ],
    }));

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const uri = request.params.uri;
      
      if (uri.startsWith('workflow://instructions/')) {
        const instructionName = uri.replace('workflow://instructions/', '');
        const instructionPath = path.join(this.workflowsPath, 'ai', 'instructions', `${instructionName}.md`);
        
        try {
          const content = await fs.readFile(instructionPath, 'utf-8');
          return {
            contents: [
              {
                uri,
                mimeType: 'text/markdown',
                text: content,
              },
            ],
          };
        } catch (error) {
          throw new Error(`Failed to read instruction file: ${error}`);
        }
      }
      
      throw new Error(`Unknown resource: ${uri}`);
    });

    this.server.setRequestHandler(ListPromptsRequestSchema, async () => ({
      prompts: [
        {
          name: 'create_n8n_workflow',
          description: 'Create a new n8n workflow for a specific use case',
          arguments: [
            {
              name: 'use_case',
              description: 'Description of the workflow use case',
              required: true,
            },
            {
              name: 'project',
              description: 'Project name for the workflow',
              required: false,
            },
          ],
        },
        {
          name: 'optimize_workflow',
          description: 'Optimize an existing n8n workflow',
          arguments: [
            {
              name: 'workflow_path',
              description: 'Path to the workflow to optimize',
              required: true,
            },
          ],
        },
      ],
    }));

    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      switch (request.params.name) {
        case 'create_n8n_workflow':
          return {
            prompt: `Create a new n8n workflow for the following use case: ${request.params.arguments?.use_case}
            
            Project: ${request.params.arguments?.project || 'default'}
            
            Please follow these guidelines:
            1. Use appropriate trigger nodes (manual, webhook, or schedule)
            2. Follow the 250px grid positioning pattern
            3. Include error handling where appropriate
            4. Use configuration nodes for settings
            5. Name nodes clearly and concisely`,
          };
        
        case 'optimize_workflow':
          return {
            prompt: `Optimize the n8n workflow at: ${request.params.arguments?.workflow_path}
            
            Please analyze and suggest improvements for:
            1. Performance optimization
            2. Error handling
            3. Node positioning and organization
            4. Naming conventions
            5. Configuration management`,
          };
        
        default:
          throw new Error(`Unknown prompt: ${request.params.name}`);
      }
    });
  }

  private async analyzeWorkflow(workflowPath: string): Promise<any> {
    try {
      const fullPath = path.join(this.workflowsPath, workflowPath);
      const content = await fs.readFile(fullPath, 'utf-8');
      const workflow = JSON.parse(content);
      
      const analysis = {
        name: workflow.name,
        nodeCount: workflow.nodes?.length || 0,
        nodes: workflow.nodes?.map((node: any) => ({
          id: node.id,
          name: node.name,
          type: node.type,
          position: node.position,
        })) || [],
        connections: workflow.connections || {},
        triggers: workflow.nodes?.filter((node: any) => 
          node.type.includes('trigger') || node.type.includes('Trigger')
        ).map((node: any) => node.name) || [],
        hasErrorHandling: workflow.nodes?.some((node: any) => 
          node.type.includes('error') || node.name.toLowerCase().includes('error')
        ) || false,
      };
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(analysis, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to analyze workflow: ${error}`);
    }
  }

  private async autofixWorkflow(workflow: any): Promise<{changed: boolean, fixes: string[], workflow: any}> {
    const fixes: string[] = [];
    let changed = false;
    
    if (workflow.nodes && Array.isArray(workflow.nodes)) {
      for (const node of workflow.nodes) {
        // Fix Merge nodes with problematic configurations
        if (node.type === 'n8n-nodes-base.merge') {
          const mode = node.parameters?.mode;
          const combinationMode = node.parameters?.combinationMode;
          
          // Fix multiplex mode
          if (mode === 'multiplex') {
            node.parameters.mode = 'combine';
            node.parameters.combinationMode = 'mergeByPosition';
            fixes.push(`Fixed "${node.name}": Changed from multiplex to combine mode with mergeByPosition`);
            changed = true;
          }
          
          // Fix invalid combinationMode
          if (mode === 'combine' && combinationMode === 'multiplex') {
            node.parameters.combinationMode = 'mergeByPosition';
            fixes.push(`Fixed "${node.name}": Changed combinationMode from multiplex to mergeByPosition`);
            changed = true;
          }
          
          // Add missing combinationMode
          if (mode === 'combine' && !combinationMode) {
            node.parameters.combinationMode = 'mergeByPosition';
            fixes.push(`Fixed "${node.name}": Added missing combinationMode: mergeByPosition`);
            changed = true;
          }
        }
      }
    }
    
    return { changed, fixes, workflow };
  }

  private async validateWorkflow(workflow: any): Promise<any> {
    const issues: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];
    
    if (!workflow.name) {
      issues.push('Workflow must have a name');
    }
    
    if (!workflow.nodes || !Array.isArray(workflow.nodes)) {
      issues.push('Workflow must have a nodes array');
    } else {
      const nodeIds = new Set();
      let hasTrigger = false;
      
      for (const node of workflow.nodes) {
        if (!node.id) {
          issues.push(`Node missing ID: ${JSON.stringify(node)}`);
        } else if (nodeIds.has(node.id)) {
          issues.push(`Duplicate node ID: ${node.id}`);
        } else {
          nodeIds.add(node.id);
        }
        
        if (!node.type) {
          issues.push(`Node ${node.id} missing type`);
        } else {
          // Check for trigger
          if (node.type.includes('trigger') || node.type.includes('Trigger')) {
            hasTrigger = true;
          }
          
          // Check for problematic Merge node configurations
          if (node.type === 'n8n-nodes-base.merge') {
            const mode = node.parameters?.mode;
            const combinationMode = node.parameters?.combinationMode;
            
            if (mode === 'multiplex') {
              issues.push(`⚠️ Node "${node.name}" uses 'multiplex' mode which often outputs empty data. Use 'combine' mode with 'mergeByPosition' or 'mergeByIndex' instead.`);
              recommendations.push(`Change "${node.name}" from multiplex to: mode='combine', combinationMode='mergeByPosition'`);
            } else if (mode === 'combine' && !combinationMode) {
              warnings.push(`Node "${node.name}" is missing combinationMode parameter`);
            }
            
            // Check merge node has multiple inputs in connections
            if (workflow.connections) {
              let inputCount = 0;
              for (const [sourceNode, targets] of Object.entries(workflow.connections)) {
                const targetList = targets as any;
                if (targetList.main) {
                  for (const outputs of targetList.main) {
                    if (Array.isArray(outputs)) {
                      for (const connection of outputs) {
                        if (connection.node === node.name || connection.node === node.id) {
                          inputCount++;
                        }
                      }
                    }
                  }
                }
              }
              if (inputCount < 2) {
                warnings.push(`Merge node "${node.name}" has only ${inputCount} input(s). Merge nodes need at least 2 inputs.`);
              }
            }
          }
          
          // Check for RSS Feed nodes
          if (node.type === 'n8n-nodes-base.rssFeedRead') {
            if (!node.parameters?.url) {
              issues.push(`RSS node "${node.name}" is missing URL parameter`);
            }
          }
        }
        
        if (!node.position || typeof node.position[0] !== 'number' || typeof node.position[1] !== 'number') {
          warnings.push(`Node ${node.id} has invalid position`);
        }
      }
      
      if (!hasTrigger) {
        warnings.push('Workflow has no trigger node');
      }
    }
    
    if (workflow.connections) {
      for (const [sourceId, outputs] of Object.entries(workflow.connections as any)) {
        for (const [outputType, connections] of Object.entries(outputs as any)) {
          for (const connection of connections as any[]) {
            for (const target of connection) {
              if (!workflow.nodes.find((n: any) => n.id === target.node)) {
                issues.push(`Connection references non-existent node: ${target.node}`);
              }
            }
          }
        }
      }
    }
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            valid: issues.length === 0,
            issues,
            warnings,
            recommendations,
          }, null, 2),
        },
      ],
    };
  }

  private async addNodeToWorkflow(workflowPath: string, node: any, position?: any): Promise<any> {
    try {
      const fullPath = path.join(this.workflowsPath, workflowPath);
      const content = await fs.readFile(fullPath, 'utf-8');
      const workflow = JSON.parse(content);
      
      if (!workflow.nodes) {
        workflow.nodes = [];
      }
      
      if (position) {
        node.position = [position.x || 250, position.y || 300];
      } else {
        const lastNode = workflow.nodes[workflow.nodes.length - 1];
        if (lastNode && lastNode.position) {
          node.position = [lastNode.position[0] + 250, lastNode.position[1]];
        } else {
          node.position = [250, 300];
        }
      }
      
      workflow.nodes.push(node);
      
      await fs.writeFile(fullPath, JSON.stringify(workflow, null, 2));
      
      return {
        content: [
          {
            type: 'text',
            text: `Node added to workflow: ${node.id}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to add node: ${error}`);
    }
  }

  private async connectNodes(
    workflowPath: string,
    sourceNode: string,
    targetNode: string,
    sourceOutput: string = 'main',
    targetInput: string = 'main'
  ): Promise<any> {
    try {
      const fullPath = path.join(this.workflowsPath, workflowPath);
      const content = await fs.readFile(fullPath, 'utf-8');
      const workflow = JSON.parse(content);
      
      if (!workflow.connections) {
        workflow.connections = {};
      }
      
      if (!workflow.connections[sourceNode]) {
        workflow.connections[sourceNode] = {};
      }
      
      if (!workflow.connections[sourceNode][sourceOutput]) {
        workflow.connections[sourceNode][sourceOutput] = [];
      }
      
      const outputIndex = 0;
      if (!workflow.connections[sourceNode][sourceOutput][outputIndex]) {
        workflow.connections[sourceNode][sourceOutput][outputIndex] = [];
      }
      
      workflow.connections[sourceNode][sourceOutput][outputIndex].push({
        node: targetNode,
        type: targetInput,
        index: 0,
      });
      
      await fs.writeFile(fullPath, JSON.stringify(workflow, null, 2));
      
      return {
        content: [
          {
            type: 'text',
            text: `Connected ${sourceNode} -> ${targetNode}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to connect nodes: ${error}`);
    }
  }

  private async generateWorkflowFromTemplate(
    template: string,
    project: string,
    name: string,
    config: any = {}
  ): Promise<any> {
    const templates: { [key: string]: any } = {
      'webhook-api': {
        name: project ? `${project} - ${name}` : name,
        nodes: [
          {
            id: 'webhook-trigger',
            name: 'Webhook',
            type: 'n8n-nodes-base.webhook',
            typeVersion: 1,
            position: NodePositioning.getHorizontalPosition(0),
            parameters: {
              path: config.webhookPath || `/${name}`,
              responseMode: 'onReceived',
              responseData: 'allEntries',
              options: {},
            },
          },
          {
            id: 'process-data',
            name: 'Process Data',
            type: 'n8n-nodes-base.code',
            typeVersion: 2,
            position: NodePositioning.getHorizontalPosition(1),
            parameters: {
              language: 'javaScript',
              jsCode: config.processCode || '// Process the incoming data\nreturn $input.all();',
            },
          },
          {
            id: 'respond',
            name: 'Respond',
            type: 'n8n-nodes-base.respondToWebhook',
            typeVersion: 1,
            position: NodePositioning.getHorizontalPosition(2),
            parameters: {
              respondWith: 'json',
              responseBody: '={{ $json }}',
            },
          },
        ],
        connections: {
          'webhook-trigger': {
            main: [[{ node: 'process-data', type: 'main', index: 0 }]],
          },
          'process-data': {
            main: [[{ node: 'respond', type: 'main', index: 0 }]],
          },
        },
      },
      'scheduled-report': {
        name: `${project} - ${name}`,
        nodes: [
          {
            id: 'schedule-trigger',
            name: 'Schedule',
            type: 'n8n-nodes-base.scheduleTrigger',
            typeVersion: 1,
            position: NodePositioning.getVerticalPosition(0),
            parameters: {
              rule: {
                interval: [
                  {
                    field: 'hours',
                    hoursInterval: config.hoursInterval || 24,
                  },
                ],
              },
            },
          },
          {
            id: 'gather-data',
            name: 'Gather Data',
            type: 'n8n-nodes-base.httpRequest',
            typeVersion: 4.2,
            position: [500, 300],
            parameters: {
              url: config.dataUrl || 'https://api.example.com/data',
              method: 'GET',
            },
          },
          {
            id: 'format-report',
            name: 'Format Report',
            type: 'n8n-nodes-base.code',
            typeVersion: 2,
            position: [750, 300],
            parameters: {
              language: 'javaScript',
              jsCode: '// Format the report\nreturn { report: $input.all() };',
            },
          },
        ],
        connections: {
          'schedule-trigger': {
            main: [[{ node: 'gather-data', type: 'main', index: 0 }]],
          },
          'gather-data': {
            main: [[{ node: 'format-report', type: 'main', index: 0 }]],
          },
        },
      },
    };
    
    const workflowTemplate = templates[template];
    if (!workflowTemplate) {
      throw new Error(`Unknown template: ${template}`);
    }
    
    return await this.workflowManager.createWorkflow(name, workflowTemplate, project);
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

const server = new McFlowServer();
server.run().catch(console.error);