# McFlow Architecture

## Path Variables (DEFINITIVE)

McFlow uses two primary path variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `projectPath` | The root directory of your project | `/Users/you/projects/myapp` |
| `workflowsPath` | The workflows directory within your project | `{projectPath}/workflows` |

### Directory Structure

```
{projectPath}/                         # Project root directory
├── workflows/                         # workflowsPath = {projectPath}/workflows
│   ├── flows/                         # Workflow JSON files
│   │   ├── project-workflow-1.json
│   │   ├── project-workflow-2.json
│   │   └── project-workflow-3.json
│   ├── nodes/                         # Extracted node content
│   │   ├── code/                      # JavaScript/TypeScript files
│   │   ├── prompts/                   # AI prompt files (.md)
│   │   ├── json/                      # JSON data and configs
│   │   ├── sql/                       # SQL queries
│   │   └── templates/                 # HTML/text templates
│   ├── dist/                          # Compiled workflows (auto-generated)
│   ├── .env                           # Environment variables
│   ├── .env.example                   # Environment template
│   └── README.md                      # Workflows documentation
├── src/                               # Your project source code
├── package.json                       # Your project dependencies
└── README.md                          # Your project documentation
```

## Path Resolution Rules

### 1. When McFlow reads paths:
- Paths provided to McFlow commands are **relative to `workflowsPath`**
- Example: `mcflow read --path "flows/my-workflow.json"`
- McFlow internally: `{workflowsPath}/flows/my-workflow.json`

### 2. File locations:
- Workflows: `{workflowsPath}/flows/*.json`
- Code: `{workflowsPath}/nodes/code/*.js`
- Prompts: `{workflowsPath}/nodes/prompts/*.md`
- JSON: `{workflowsPath}/nodes/json/*.json`
- SQL: `{workflowsPath}/nodes/sql/*.sql`

### 3. Environment detection:
```javascript
// McFlow automatically detects:
projectPath = process.cwd()  // Current working directory
workflowsPath = path.join(projectPath, 'workflows')
```

## API Usage

### Reading workflows:
```bash
# Path is relative to workflowsPath
mcflow read --path "flows/project-workflow.json"
```

### Extracting code:
```bash
# Workflow name only (finds in flows/ automatically)
mcflow extract_code --workflow "project-workflow"
```

### Creating workflows:
```bash
# Creates in {workflowsPath}/flows/
mcflow create --name "project-new-workflow"
```

## Configuration

The MCP server configuration uses environment variables:
```json
{
  "mcpServers": {
    "mcflow": {
      "type": "stdio",
      "command": "node",
      "args": ["/path/to/mcflow-mcp/dist/index.js"],
      "env": {
        // Optional: Override if not using standard structure
        "WORKFLOWS_PATH": "/custom/path/to/workflows"
      }
    }
  }
}
```

If `WORKFLOWS_PATH` is not set, McFlow will:
1. Check current directory for `workflows/` folder
2. Use `{cwd}/workflows` as workflowsPath

## Important Notes

1. **Never hardcode paths** - Always use the path variables
2. **workflowsPath is the workflows folder** - Not the project root
3. **All McFlow paths are relative to workflowsPath** - Don't include "workflows/" prefix
4. **projectPath is for project-level operations** - Config files, documentation, etc.

---

**This is the single source of truth for McFlow's path architecture.**