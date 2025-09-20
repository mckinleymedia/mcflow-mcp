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
- Create workflow names without project prefix - ALL workflows need project name
- Use generic names like "workflow-1" or "test" - be descriptive with project prefix

### ALWAYS Do This:
- Use McFlow tools exclusively for ALL n8n operations
- Extract code nodes before editing complex logic
- Let McFlow handle all file reading and injection
- Check extracted files in `workflows/nodes/` before deploying
- Store mock/test data in JSON files under `workflows/nodes/json/`
- Keep JavaScript code clean - load mock data from external JSON files

## Workflow Naming Convention

### ⚠️ CRITICAL: ALL WORKFLOWS MUST BE PREFIXED WITH PROJECT NAME

**✅ CORRECT naming:**
- `newspop-news-collection`
- `newspop-image-generation`
- `myproject-data-sync`
- `client-invoice-processor`

**❌ WRONG naming:**
- `news-collection` (missing project prefix)
- `image-generation` (missing project prefix)
- `workflow-1` (missing project prefix and not descriptive)

**Format:** `[project-name]-[workflow-purpose]`

## Workflow Development Process

1. **Create**: `mcflow create --name "project-workflow-name"`
2. **Extract**: `mcflow extract_code` - pulls code into separate files
3. **Edit**: Modify files in `workflows/nodes/` with full IDE support
4. **Deploy**: `mcflow deploy` - injects code back and sends to n8n
5. **Test**: `mcflow execute` - run workflow with test data

## Project Structure & Paths

### ⚠️ See [ARCHITECTURE.md](/ARCHITECTURE.md) for definitive path structure

**Quick Reference:**
- `projectPath` = Project root
- `workflowsPath` = `{projectPath}/workflows/`
- All paths provided to McFlow are relative to `workflowsPath`

**Reading workflows:**
```
mcflow read --path "flows/project-workflow-name.json"   # Correct - relative to workflowsPath
```

**❌ WRONG:**
```
mcflow read --path "workflow-name.json"                 # Missing flows/
mcflow read --path "workflows/flows/workflow.json"      # Don't include workflows/
```

## Available McFlow Commands

### Core Operations
- `list` - List workflows in project
- `read` - Read workflow JSON (use path: "workflows/flows/name.json")
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

## Node Addition Patterns

### Adding Bypass/Alternative Inputs (CRITICAL)

When adding alternative paths (manual triggers, test inputs, bypass routes):

**✅ CORRECT - Minimal Branch Pattern:**
```
[New Trigger] → [Convert if needed] → [Existing Merge Node]
```

**❌ WRONG - Duplicate Logic Pattern:**
```
[New Trigger] → [Copy Process] → [Copy Format] → [New Merge]
```

**Rules:**
1. Add ONLY the new trigger node
2. Add ONLY necessary conversion (if data format differs)
3. Connect to EXISTING merge/processing nodes
4. NEVER duplicate existing processing logic
5. Join the main flow as early as possible
6. NEVER create pass-through nodes that don't transform data

**Example:** Adding manual news input should create trigger + format node, then connect to existing merge - NOT duplicate the entire processing chain.

See [Node Patterns Guide](node-patterns.md) for detailed examples.

## Best Practices

1. Always extract code nodes for complex workflows
2. Use templates for common patterns
3. Validate before deploying
4. Check change tracker to see what needs deployment
5. Never modify workflow JSON directly after extraction
6. Use minimal node patterns for bypasses/alternatives

## Common Mistakes to Avoid

❌ Using `n8n import:workflow` directly
❌ Adding `$readFile()` to nodes
❌ Creating mock or placeholder nodes
❌ Bypassing McFlow for "quick fixes"
❌ Editing in n8n UI after code extraction
❌ Creating pass-through nodes that just return `$input.all()`
❌ Adding nodes that don't transform or process data
❌ Embedding large mock data objects in JavaScript code
❌ Hardcoding test data in code nodes instead of using JSON files
❌ Creating workflows without project prefix (e.g., "news-collection" instead of "newspop-news-collection")
❌ Using non-descriptive names like "workflow-1", "test", "demo"
❌ Using incorrect paths for read operations (e.g., "image_analysis.json" instead of "flows/image_analysis.json")
❌ Including "workflows/" in paths when using McFlow (workflowsPath already includes it)
❌ Omitting "flows/" subdirectory from workflow file paths  

Remember: McFlow is the ONLY way to properly manage n8n workflows!