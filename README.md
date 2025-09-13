# McFlow - MCP Server for n8n Workflow Automation

> ⚠️ **CRITICAL: AI agents MUST use McFlow commands, NEVER use n8n CLI directly! See [IMPORTANT_INSTRUCTIONS.md](IMPORTANT_INSTRUCTIONS.md)**

McFlow is a Model Context Protocol (MCP) server that provides enhanced context and automation capabilities for creating and managing n8n workflows. It **completely replaces** direct n8n CLI usage and manages code extraction/injection for workflows.

## 🚨 NEVER USE N8N COMMANDS DIRECTLY

**This MCP server MUST be used for ALL n8n operations. Using n8n CLI directly will break the workflow system!**

```bash
# ❌ NEVER use these:
n8n import:workflow  # Use: mcflow deploy
n8n export:workflow  # Use: mcflow export
n8n execute:workflow # Use: mcflow execute
n8n list:workflow    # Use: mcflow deployed

# ✅ ALWAYS use McFlow commands instead
```

## Features

- **Workflow Management**: List, read, create, and update n8n workflows
- **Node Extraction System**: Extracts code/prompts/SQL to separate files for better editing
- **Automatic Code Injection**: Injects file content into nodes during deployment
- **Smart Naming**: Automatically generates succinct, unique workflow names
- **Auto-Documentation**: Creates and maintains `docs/workflows.md` for all workflows
- **Custom Instructions**: Supports project-specific workflow creation guidelines
- **Structure Detection**: Works with both simple (`./workflows/`) and multi-project repos
- **Project Organization**: Intelligently handles different repository structures
- **Workflow Analysis**: Analyze workflow dependencies and structure
- **Context-Aware**: Provides AI assistants with workflow instructions and best practices
- **Template Integration**: Follows n8n-workflows-template patterns and conventions

## How Node Extraction Works

McFlow extracts node content to files for better editing and version control:

1. **Extract**: `mcflow extract_code` removes code from nodes, stores in `workflows/nodes/`
2. **Edit**: Use your editor on extracted files with syntax highlighting
3. **Deploy**: `mcflow deploy` injects content back and sends to n8n

**IMPORTANT**: Never use `$readFile()` in nodes - McFlow handles all file reading!

## Installation

```bash
npm install
npm run build

# Quick setup for your AI agent
./scripts/setup-agent.sh
```

## Usage

### With Claude Desktop

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "mcflow": {
      "command": "node",
      "args": ["/path/to/mcflow/dist/index.js"],
      "env": {
        "WORKFLOWS_PATH": "/path/to/n8n-workflows-template"
      }
    }
  }
}
```

### Development

```bash
npm run dev
```

## Available Tools

### Workflow Management
- **list_workflows**: List all available n8n workflows, optionally filtered by project
- **read_workflow**: Read a specific n8n workflow JSON file
- **create_workflow**: Create a new n8n workflow in a project
- **update_workflow**: Update an existing n8n workflow
- **analyze_workflow**: Analyze a workflow's structure, nodes, and dependencies
- **get_project_info**: Get information about a specific project

### Workflow Manipulation
- **validate_workflow**: Validate workflow structure and check for common issues
- **add_node_to_workflow**: Add a new node to an existing workflow with automatic positioning
- **connect_nodes**: Create connections between workflow nodes
- **generate_workflow_from_template**: Generate workflows from built-in templates (webhook-api, scheduled-report, etc.)

## Resources

The server provides access to workflow creation instructions:
- General AI instructions for working with n8n workflows
- Process instructions for workflow creation
- Repository-specific conventions and patterns

## Prompts

### create_n8n_workflow
Generate a new n8n workflow for a specific use case.

### optimize_workflow
Analyze and optimize an existing workflow for performance and best practices.

## Documentation Features

McFlow automatically maintains workflow documentation when a `docs` folder exists in your project:

### Auto-Generated Files

1. **`docs/workflows.md`** - Comprehensive list of all workflows with:
   - Workflow descriptions and file paths
   - Trigger types and integrations used
   - Creation/update timestamps
   - Organized by workflow purpose

2. **`docs/workflow-instructions.md`** - Template for custom instructions:
   - Project-specific workflow guidelines
   - Naming conventions
   - Security requirements
   - Testing procedures

### Workflow Naming

McFlow automatically ensures workflow names are:
- **Succinct**: Removes redundant words like "workflow"
- **Unique**: Adds numeric suffixes if needed
- **Clean**: Converts to kebab-case, max 30 characters

## Configuration

Set the `WORKFLOWS_PATH` environment variable to point to your workflows directory. The server automatically detects:
- **Simple structure**: `./workflows/` folder in standard repos
- **Multi-project**: Multiple projects with individual workflow folders

## License

MIT