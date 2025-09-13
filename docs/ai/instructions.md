# AI Agent Instructions for McFlow

> ⚠️ **CRITICAL: AI agents MUST use McFlow commands, NEVER use n8n CLI directly!**

## Command Mapping

| ❌ NEVER USE (n8n CLI) | ✅ ALWAYS USE (McFlow) |
|------------------------|-------------------------|
| `n8n import:workflow`  | `mcflow deploy`         |
| `n8n export:workflow`  | `mcflow export`         |
| `n8n execute:workflow` | `mcflow execute`        |
| `n8n list:workflow`    | `mcflow deployed`       |
| `n8n start`            | `mcflow start`          |
| `n8n update:workflow`  | `mcflow activate`       |

## Why McFlow Only

1. **Node Extraction System**: Code is stored in separate files and injected during deployment
2. **No Permission Prompts**: McFlow tools don't require bash approval
3. **Better Error Handling**: Filters warnings, focuses on real errors
4. **Automatic Validation**: Validates before deploying
5. **Parallel Operations**: Can deploy multiple workflows simultaneously

## Critical Rules

### NEVER Do This:
- Use `$readFile()` in workflow nodes - n8n doesn't support this
- Put file paths in jsCode/pythonCode fields - these need actual code
- Edit workflows in n8n UI after extraction - changes will be lost
- Use n8n CLI commands directly - breaks the extraction/injection system

### ALWAYS Do This:
- Use McFlow tools exclusively for ALL n8n operations
- Extract code nodes before editing complex logic
- Let McFlow handle all file reading and injection
- Check extracted files in `workflows/nodes/` before deploying

## Workflow Development Process

1. **Create**: `mcflow create --name "my-workflow"`
2. **Extract**: `mcflow extract_code` - pulls code into separate files
3. **Edit**: Modify files in `workflows/nodes/` with full IDE support
4. **Deploy**: `mcflow deploy` - injects code back and sends to n8n
5. **Test**: `mcflow execute` - run workflow with test data

## Available McFlow Commands

### Core Operations
- `list` - List workflows in project
- `read` - Read workflow JSON
- `create` - Create new workflow
- `update` - Update existing workflow
- `validate` - Check workflow structure

### Deployment & Execution
- `deploy` - Deploy to n8n (with code injection)
- `export` - Export from n8n
- `execute` - Run workflow
- `deployed` - List deployed workflows
- `activate` - Activate/deactivate workflows

### Code Management
- `extract_code` - Extract node content to files
- `list_code` - List extracted code files
- `create_module` - Create shared code modules

### Analysis
- `analyze` - Analyze workflow structure
- `status` - Show deployment status
- `credentials` - Analyze credential requirements

## Best Practices

1. Always extract code nodes for complex workflows
2. Use templates for common patterns
3. Validate before deploying
4. Check change tracker to see what needs deployment
5. Never modify workflow JSON directly after extraction

## Common Mistakes to Avoid

❌ Using `n8n import:workflow` directly  
❌ Adding `$readFile()` to nodes  
❌ Creating mock or placeholder nodes  
❌ Bypassing McFlow for "quick fixes"  
❌ Editing in n8n UI after code extraction  

Remember: McFlow is the ONLY way to properly manage n8n workflows!