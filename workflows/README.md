# Workflows Directory

This directory contains all n8n workflow-related files for the McFlow MCP server.

## Structure

```
workflows/
├── flows/              # n8n workflow JSON files
├── nodes/              # Extracted node content for better editing
│   ├── code/           # JavaScript/Python code nodes
│   │   └── workflow-name/
│   │       ├── node-name.js
│   │       └── node-name.py
│   ├── prompts/        # AI prompt templates (Markdown format)
│   │   └── workflow-name/
│   │       └── node-name.md
│   ├── json/           # JSON configurations for HTTP requests
│   │   └── workflow-name/
│   │       └── request-config.json
│   ├── sql/            # SQL queries
│   │   └── workflow-name/
│   │       └── query-name.sql
│   ├── templates/      # HTML/text templates
│   │   └── workflow-name/
│   │       └── template.html
│   └── shared/         # Shared modules across workflows
│       └── utils.js
├── dist/               # Compiled workflows (auto-generated)
├── package.json        # Node dependencies for workflows
├── .env                # Environment variables (never commit!)
└── .env.example        # Template for environment variables
```

## Usage

1. **Creating Workflows**: Use `mcflow create` to create new workflows in `flows/`
2. **Extracting Nodes**: Use `mcflow extract_code` to extract node content to `nodes/`
3. **Compiling**: Use `mcflow compile` to prepare workflows with injected code
4. **Deploying**: Use `mcflow deploy` to deploy workflows to n8n (auto-compiles)

## Node Extraction Benefits

- **Code**: Full IDE support with syntax highlighting, linting, debugging
- **Prompts**: Markdown formatting for better readability and version control
- **JSON**: Proper formatting, validation, and reusable API configurations
- **SQL**: Query validation and formatting tools
- **Templates**: HTML preview and syntax checking
- **Shared Modules**: Reusable code across multiple workflows

## Important Notes

- All workflow JSON files must be in `flows/` directory
- Extracted node content is organized by workflow name in subdirectories
- The `dist/` folder contains compiled workflows (don't edit these directly)
- Never commit `.env` file with actual credentials
- Use `.env.example` as a template for required environment variables
- Prompts use `.md` format for better formatting support