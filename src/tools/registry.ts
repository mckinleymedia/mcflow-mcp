/**
 * Tool definitions for the McFlow MCP server
 */

export const getToolDefinitions = () => [
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
    description: 'Create a new n8n workflow with REAL nodes only (no mock/placeholder nodes allowed). IMPORTANT: Use dashes in filenames, not underscores (e.g., "my-workflow" not "my_workflow")',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Workflow name (use dashes, not underscores)',
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
    description: 'Generate a workflow from template using REAL n8n nodes (no mock/placeholder nodes). IMPORTANT: Use dashes in filenames, not underscores',
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
          description: 'Workflow name (use dashes, not underscores)',
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
    name: 'compile',
    description: 'Compile all workflows by injecting external code/prompt files',
    inputSchema: {
      type: 'object',
      properties: {
        output: {
          type: 'boolean',
          description: 'Save compiled workflows to dist folder (default: true)',
        },
      },
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
    name: 'list_credentials',
    description: 'List all credentials in n8n with their IDs - use these IDs in workflow nodes',
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
    name: 'add_tracking',
    description: 'Add generic workflow execution tracking to a workflow (stores data via HTTP requests)',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to the workflow file to add tracking to',
        },
        storageUrl: {
          type: 'string',
          description: 'Base URL for storage API (or use WORKFLOW_STORAGE_URL env var)',
        },
        options: {
          type: 'object',
          properties: {
            addStartTracking: {
              type: 'boolean',
              description: 'Add tracking at workflow start (default: true)',
            },
            addEndTracking: {
              type: 'boolean',
              description: 'Add tracking at workflow end (default: true)',
            },
            addErrorTracking: {
              type: 'boolean',
              description: 'Add error tracking with error trigger',
            },
            checkpoints: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  afterNode: {
                    type: 'string',
                    description: 'Node name to add checkpoint after',
                  },
                  checkpointName: {
                    type: 'string',
                    description: 'Name for this checkpoint',
                  },
                },
              },
              description: 'Checkpoints to add after specific nodes',
            },
            storeOutputNodes: {
              type: 'array',
              items: { type: 'string' },
              description: 'Node names whose outputs should be stored',
            },
          },
          description: 'Tracking options',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'configure_tracking',
    description: 'Configure global tracking settings for workflows',
    inputSchema: {
      type: 'object',
      properties: {
        enabled: {
          type: 'boolean',
          description: 'Enable or disable tracking globally',
        },
        storageUrl: {
          type: 'string',
          description: 'Base URL for storage API',
        },
        trackAllNodes: {
          type: 'boolean',
          description: 'Track all node outputs (can be verbose)',
        },
        enableCheckpoints: {
          type: 'boolean',
          description: 'Enable checkpoint system',
        },
        enableErrorTracking: {
          type: 'boolean',
          description: 'Enable error tracking',
        },
      },
    },
  },
  {
    name: 'add_checkpoint',
    description: 'Add a checkpoint save/restore capability to a workflow',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to the workflow file',
        },
        checkpointName: {
          type: 'string',
          description: 'Name for the checkpoint',
        },
        afterNode: {
          type: 'string',
          description: 'Node to add checkpoint after (for saving)',
        },
        addRestore: {
          type: 'boolean',
          description: 'Also add checkpoint restore at workflow start',
        },
      },
      required: ['path', 'checkpointName'],
    },
  },
  {
    name: 'generate_app',
    description: 'Generate a Next.js app for managing workflow data within the current project',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name of the app directory (e.g., "app", "dashboard")',
        },
        stages: {
          type: 'array',
          items: { type: 'string' },
          description: 'Workflow stages for pipeline view (default: created, processing, review, completed)',
        },
        features: {
          type: 'object',
          properties: {
            dashboard: {
              type: 'boolean',
              description: 'Include dashboard with stats and tables',
            },
            api: {
              type: 'boolean',
              description: 'Include API endpoints for workflow integration',
            },
            database: {
              type: 'boolean',
              description: 'Include SQLite database setup',
            },
            webhooks: {
              type: 'boolean',
              description: 'Include webhook receivers for n8n',
            },
            approvals: {
              type: 'boolean',
              description: 'Include approval/reject functionality',
            },
          },
          description: 'Features to include in the app',
        },
      },
      required: ['name'],
    },
  },
];