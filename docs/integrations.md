# McFlow MCP Server - AI Agent Integrations

This guide shows how to integrate McFlow MCP server with various AI coding agents.

## Quick Start

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Start the server
./scripts/start-mcp.sh
```

## Environment Variables

- `WORKFLOWS_PATH`: Path to your n8n-workflows-template directory (default: `../n8n-workflows-template`)
- `MCP_MODE`: Server mode - `stdio` or `http` (default: `stdio`)
- `MCP_PORT`: Port for HTTP mode (default: `3000`)

## Integration Guides

### 1. Claude Desktop

Add to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "mcflow": {
      "command": "node",
      "args": ["/absolute/path/to/mcflow-mcp/dist/index.js"],
      "env": {
        "WORKFLOWS_PATH": "/absolute/path/to/n8n-workflows-template"
      }
    }
  }
}
```

### 2. Cursor

Add to your Cursor MCP configuration (`~/.cursor/mcp/config.json`):

```json
{
  "servers": {
    "mcflow": {
      "command": "node",
      "args": ["./dist/index.js"],
      "cwd": "/path/to/mcflow-mcp",
      "env": {
        "WORKFLOWS_PATH": "../n8n-workflows-template"
      }
    }
  }
}
```

### 3. Windsurf

Add to your Windsurf configuration (`~/.windsurf/mcp/config.json`):

```json
{
  "mcp_servers": {
    "mcflow": {
      "type": "stdio",
      "command": "/path/to/mcflow-mcp/scripts/start-mcp.sh",
      "env": {
        "WORKFLOWS_PATH": "/path/to/n8n-workflows-template"
      }
    }
  }
}
```

### 4. Continue

Add to your Continue configuration (`~/.continue/config.json`):

```json
{
  "models": [...],
  "mcpServers": [
    {
      "name": "mcflow",
      "command": "node",
      "args": ["/path/to/mcflow-mcp/dist/index.js"],
      "env": {
        "WORKFLOWS_PATH": "/path/to/n8n-workflows-template"
      }
    }
  ]
}
```

### 5. Cody (Sourcegraph)

Add to your Cody MCP configuration (`~/.cody/mcp-servers.json`):

```json
{
  "servers": [
    {
      "name": "mcflow",
      "protocol": "stdio",
      "command": "node",
      "args": ["/path/to/mcflow-mcp/dist/index.js"],
      "environment": {
        "WORKFLOWS_PATH": "/path/to/n8n-workflows-template"
      }
    }
  ]
}
```

### 6. Aider

For Aider, you can use the HTTP mode:

```bash
# Start McFlow in HTTP mode
MCP_MODE=http MCP_PORT=3000 ./scripts/start-mcp.sh

# In another terminal, configure Aider
export AIDER_MCP_SERVER="http://localhost:3000"
aider
```

### 7. Generic MCP Client

For any MCP-compatible client, use the standard configuration:

```json
{
  "name": "mcflow",
  "transport": "stdio",
  "command": "node",
  "args": ["/path/to/mcflow-mcp/dist/index.js"],
  "env": {
    "WORKFLOWS_PATH": "/path/to/n8n-workflows-template"
  }
}
```

## HTTP Mode (Alternative)

Some AI agents may prefer HTTP mode. To enable:

1. Start the server in HTTP mode:
```bash
MCP_MODE=http MCP_PORT=3000 ./scripts/start-mcp.sh
```

2. Configure your AI agent to connect to:
```
http://localhost:3000
```

## Docker Support

Run McFlow in a container:

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm install && npm run build
ENV WORKFLOWS_PATH=/workflows
CMD ["node", "dist/index.js"]
```

```bash
# Build and run
docker build -t mcflow-mcp .
docker run -v /path/to/n8n-workflows-template:/workflows mcflow-mcp
```

## Troubleshooting

### Server won't start
- Check that `WORKFLOWS_PATH` points to a valid directory
- Ensure Node.js 18+ is installed
- Run `npm install && npm run build`

### Agent can't connect
- Verify the command path is absolute
- Check file permissions (`chmod +x scripts/start-mcp.sh`)
- Look for errors in agent logs

### Tools not working
- Ensure the n8n-workflows-template directory structure is correct
- Check that workflow JSON files are valid
- Verify read/write permissions on workflow files

## Available Tools

All AI agents will have access to these tools:

- `list_workflows` - List all available n8n workflows
- `read_workflow` - Read a specific workflow JSON file
- `create_workflow` - Create a new workflow
- `update_workflow` - Update an existing workflow
- `analyze_workflow` - Analyze workflow structure and dependencies
- `get_project_info` - Get project information
- `validate_workflow` - Validate workflow structure
- `add_node_to_workflow` - Add nodes to workflows
- `connect_nodes` - Connect workflow nodes
- `generate_workflow_from_template` - Generate from templates

## Support

For issues or questions:
- Check the [README](README.md) for basic setup
- Review agent-specific documentation
- Open an issue on GitHub