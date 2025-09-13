# McFlow - MCP Server for n8n Workflow Automation

McFlow is a Model Context Protocol (MCP) server that provides enhanced context and automation capabilities for creating and managing n8n workflows. It streamlines workflow development with code extraction, automatic documentation, and intelligent project organization.

## Features

- **Workflow Management**: Create, read, update, and deploy n8n workflows
- **Code Extraction**: Extract code/SQL/prompts from nodes into separate files for better editing
- **Automatic Deployment**: Smart injection of file content back into nodes during deployment
- **Template Generation**: Built-in templates for common workflow patterns
- **Multi-Project Support**: Handle simple or complex repository structures
- **Workflow Analysis**: Analyze dependencies, validate structure, and optimize performance
- **Auto-Documentation**: Automatically maintain workflow documentation

## Quick Start

### Prerequisites

- Node.js 18+ installed
- n8n instance running (local or remote)
- MCP-compatible client (Claude Desktop, Continue.dev, etc.)

### Installation

```bash
# Clone the repository
git clone https://github.com/mckinleymedia/mcflow-mcp.git
cd mcflow-mcp

# Install dependencies
npm install

# Build the server
npm run build

# Optional: Quick setup script
./scripts/setup-agent.sh
```

### Configuration

#### For Claude Desktop

Add to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "mcflow": {
      "command": "node",
      "args": ["/absolute/path/to/mcflow-mcp/dist/index.js"],
      "env": {
        "WORKFLOWS_PATH": "/path/to/your/n8n-workflows"
      }
    }
  }
}
```

#### For Continue.dev

Add to your Continue configuration:

```json
{
  "models": [
    {
      "model": "claude-3-5-sonnet",
      "mcpServers": {
        "mcflow": {
          "command": "node",
          "args": ["/absolute/path/to/mcflow-mcp/dist/index.js"],
          "env": {
            "WORKFLOWS_PATH": "/path/to/your/n8n-workflows"
          }
        }
      }
    }
  ]
}
```

### Basic Usage

Once configured, McFlow provides these commands through your MCP client:

```bash
# List all workflows
mcflow list

# Create a new workflow
mcflow create --name "my-automation" --workflow {...}

# Deploy workflows to n8n
mcflow deploy

# Extract code from nodes for editing
mcflow extract_code

# Generate from template
mcflow generate --template webhook-api --name "api-handler"
```

## Key Concepts

### Code Extraction System

McFlow separates code from workflow JSON for better development:

1. **Extract**: Pull code/SQL/prompts from nodes into `workflows/nodes/` directory
2. **Edit**: Use your IDE with full syntax highlighting and tooling
3. **Deploy**: Automatically inject code back into nodes when deploying

### Project Structure

McFlow adapts to your repository structure:

```
# Simple structure
your-project/
├── workflows/
│   ├── flows/       # Workflow JSON files
│   └── nodes/       # Extracted code files

# Multi-project structure
your-repo/
├── project1/
│   └── workflows/
├── project2/
│   └── workflows/
```

### Workflow Templates

Built-in templates for common patterns:
- `webhook-api` - REST API endpoint workflow
- `scheduled-report` - Scheduled data reports
- `data-sync` - Database synchronization
- `error-handler` - Error handling workflow
- `approval-flow` - Multi-step approval process

## Available Tools

### Core Workflow Operations
- `list` - List all workflows in project
- `read` - Read workflow JSON
- `create` - Create new workflow
- `update` - Update existing workflow
- `delete` - Remove workflow

### Deployment & Execution
- `deploy` - Deploy workflows to n8n (with code injection)
- `export` - Export workflows from n8n
- `execute` - Run a workflow
- `deployed` - List deployed workflows
- `activate` - Activate/deactivate workflows

### Code Management
- `extract_code` - Extract node content to files
- `list_code` - List extracted code files
- `create_module` - Create shared code modules

### Analysis & Validation
- `analyze` - Analyze workflow structure
- `validate` - Check for common issues
- `status` - Show deployment status
- `credentials` - Analyze credential requirements

## Development

```bash
# Run in development mode
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## Troubleshooting

### Common Issues

1. **Workflows not deploying**: Ensure you're using `mcflow deploy`, not n8n CLI directly
2. **Code not injecting**: Check that extracted files exist in `workflows/nodes/`
3. **Connection errors**: Verify n8n is running and accessible
4. **Missing credentials**: Use `mcflow credentials analyze` to check requirements

### Debug Mode

Enable debug logging:

```bash
export DEBUG=mcflow:*
npm run dev
```

## Documentation

### Getting Started
- [Overview](docs/overview.md) - Introduction to McFlow concepts and benefits
- [Architecture](docs/architecture.md) - Technical architecture and design patterns
- [Integration Guide](docs/integrations.md) - Setting up with different MCP clients

### Development
- [Node Reference](docs/nodes.md) - Real n8n nodes reference and best practices
- [Git Workflow](docs/git.md) - Version control guidelines and best practices
- [Troubleshooting](docs/troubleshooting.md) - Common issues and solutions

### Operations
- [Credentials](docs/credentials.md) - Credential security and management
- [Common Issues](docs/issues.md) - n8n-specific issues and fixes

### AI Agent Documentation
- [AI Instructions](docs/ai/instructions.md) - Critical instructions for AI agents
- [Workflow Guidelines](docs/ai/workflows.md) - Workflow creation instructions for AI
- [LLM Configuration](docs/ai/llm.md) - LLM parameters for AI nodes

## Contributing

Contributions are welcome! Please read our contributing guidelines and submit PRs to the main repository.

## License

MIT License - see LICENSE file for details

## Support

- GitHub Issues: [mcflow-mcp/issues](https://github.com/mckinleymedia/mcflow-mcp/issues)
- Documentation: Check the `docs/` folder for detailed guides

---

> **For AI Agents**: See [docs/ai/instructions.md](docs/ai/instructions.md) for critical usage instructions