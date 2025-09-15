# Workflows

This folder contains n8n workflow definitions managed by McFlow.

## Structure

```
workflows/
├── README.md           # This file
├── .env.example        # Environment variables template
├── .gitignore          # Git ignore rules
└── flows/              # Workflow JSON files
    ├── sync-data.json
    ├── send-email.json
    └── process-order.json
```

## Current Workflows

No workflows yet. Create your first workflow using McFlow.

## Getting Started

### Environment Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Fill in your environment variables in `.env`

### Managing Workflows

Workflows in this directory are managed by McFlow MCP server. Use the following commands:

- **List workflows**: Shows all workflows in this project
- **Create workflow**: Adds a new workflow with auto-generated name
- **Read workflow**: View a specific workflow's configuration
- **Update workflow**: Modify an existing workflow
- **Analyze workflow**: Get insights about workflow structure
- **Validate workflow**: Check workflow for issues

### Workflow Naming Convention

McFlow automatically generates succinct, unique names for workflows:
- Removes redundant words (like "workflow")
- Converts to kebab-case
- Ensures uniqueness with number suffixes if needed
- Maximum 30 characters

### Environment Variables

The following environment variables are used by workflows:

- `N8N_WEBHOOK_URL`: Base URL for webhook triggers
- `API_KEY`: API key for external services
- `NOTIFICATION_EMAIL`: Email for notifications
- See `.env.example` for complete list

### Deployment

To deploy these workflows to n8n:

1. **Local n8n**:
   ```bash
   n8n import:workflow --input=flows/[workflow-name].json
   ```

2. **n8n Cloud**:
   Use the n8n UI to import workflow JSON files from the `flows/` directory

3. **Via API**:
   ```bash
   curl -X POST [N8N_URL]/api/v1/workflows \
     -H "X-N8N-API-KEY: [YOUR_API_KEY]" \
     -H "Content-Type: application/json" \
     -d @flows/[workflow-name].json
   ```

### Testing

Before deploying workflows:
1. Test with sample data
2. Verify all credentials are configured
3. Check error handling paths
4. Monitor execution in n8n

### Documentation

Workflow documentation is automatically maintained in:
- `../docs/workflows.md` - List of all workflows
- `../docs/workflow-instructions.md` - Custom instructions

---

*Managed by McFlow MCP Server*
