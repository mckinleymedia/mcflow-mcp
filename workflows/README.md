# Workflows Directory

This directory contains all n8n workflow-related files for the McFlow MCP server.

## Structure

```
workflows/
├── flows/          # n8n workflow JSON files
├── nodes/          # Extracted node content for editing
│   ├── code/       # JavaScript/Python code nodes
│   ├── prompts/    # AI prompt templates
│   ├── sql/        # SQL query nodes
│   └── templates/  # HTML/text templates
├── ai/             # AI-related configurations
│   ├── instructions/
│   └── prompts/
├── credentials/    # Credential configurations (secure)
├── package.json    # Node dependencies for workflows
└── .env           # Environment variables for n8n
```

## Usage

1. **Creating Workflows**: Use `mcflow create` to create new workflows in `flows/`
2. **Extracting Nodes**: Use `mcflow extract_code` to extract node content to `nodes/`
3. **Deploying**: Use `mcflow deploy` to deploy workflows to n8n

## Important Notes

- All workflow JSON files must be in `flows/` directory
- Extracted node content goes in appropriate subdirectories under `nodes/`
- Never commit `.env` file with actual credentials
- Use `.env.example` for credential templates