# McFlow

MCP server for managing n8n workflows with external file support.

## Installation

```bash
git clone https://github.com/mckinleymedia/mcflow-mcp.git
cd mcflow-mcp
npm install
npm run build
```

## Setup

Add to Claude Code config (`~/.claude.json`):

```json
{
  "mcpServers": {
    "mcflow": {
      "type": "stdio",
      "command": "node",
      "args": [
        "<ABSOLUTE_PATH_TO_REPO>/mcflow-mcp/dist/index.js"
      ],
      "env": {}
    }
  }
}
```

## Features

- Extract code/prompts/SQL from nodes into editable files
- Deploy workflows with automatic code compilation
- Generate workflow templates
- Manage n8n instance (auto-installs if needed)
- **NEW**: Generic workflow tracking system with checkpoints and error handling

## Docs

- [Getting Started](docs/overview.md)
- [AI Instructions](docs/ai/instructions.md)
- [Workflow Tracking](docs/workflow-tracking.md)

## License

MIT