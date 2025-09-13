# ⚠️ CRITICAL INSTRUCTIONS FOR AI AGENTS ⚠️

## NEVER USE N8N COMMANDS DIRECTLY - ALWAYS USE MCFLOW

This MCP server (McFlow) manages ALL n8n workflow operations. Using n8n commands directly will BREAK the workflow system.

## ❌ NEVER DO THIS:
```bash
# WRONG - These commands bypass McFlow and break the system:
n8n import:workflow
n8n export:workflow  
n8n execute:workflow
n8n list:workflow
n8n start
```

## ✅ ALWAYS DO THIS:
```bash
# CORRECT - Use McFlow tools instead:
mcflow deploy        # Instead of n8n import:workflow
mcflow export        # Instead of n8n export:workflow
mcflow execute       # Instead of n8n execute:workflow
mcflow deployed      # Instead of n8n list:workflow
mcflow start         # Instead of n8n start
```

## WHY THIS MATTERS

McFlow uses a node extraction system where:
1. **Code is stored in separate files** (`workflows/nodes/code/`, `workflows/nodes/prompts/`, etc.)
2. **Workflows contain only references** (using `_nodeFile` parameter)
3. **Code is injected during deployment** (McFlow reads files and populates nodes)

### The $readFile Problem
- **NEVER use `$readFile()` in workflow nodes** - n8n doesn't support this
- **NEVER put file paths in jsCode/pythonCode fields** - these need actual code
- **ALWAYS let McFlow handle the injection** - it reads files and injects content automatically

## WORKFLOW DEVELOPMENT PROCESS

### Creating/Editing Workflows:
1. **Create workflow**: `mcflow create --name "My Workflow"`
2. **Extract nodes**: `mcflow extract_code --workflow my-workflow`
3. **Edit code files**: Edit files in `workflows/nodes/` with your editor
4. **Deploy with injection**: `mcflow deploy` (this injects code from files)

### NEVER:
- Edit workflows in n8n UI after extraction (changes will be lost)
- Use `$readFile()` or file paths in node parameters
- Import/export workflows using n8n CLI directly
- Assume n8n can read files from disk (it can't)

## FOR MCFLOW DEPLOYMENT

When deploying workflows:
1. McFlow reads `_nodeFile` references
2. Loads content from those files
3. Injects content into node parameters (jsCode, prompt, query, etc.)
4. Sends complete workflow to n8n
5. Nodes execute with actual content, not file references

## EXAMPLE OF CORRECT WORKFLOW STRUCTURE

### After Extraction (in JSON file):
```json
{
  "nodes": [{
    "type": "n8n-nodes-base.code",
    "parameters": {
      "jsCode": "",  // Empty! Content is in file
      "_nodeFile": "workflows/nodes/code/my-workflow/process.js"
    }
  }]
}
```

### After Injection (what gets sent to n8n):
```json
{
  "nodes": [{
    "type": "n8n-nodes-base.code",
    "parameters": {
      "jsCode": "// Actual JavaScript code here\nconst data = $input.all();\nreturn data;",
      "_nodeFile": "workflows/nodes/code/my-workflow/process.js"
    }
  }]
}
```

## REMEMBER

1. **McFlow is the ONLY way to manage workflows** in projects using this MCP server
2. **File references are for McFlow only** - n8n never sees them
3. **Code injection happens at deployment time** - not at runtime
4. **Always use McFlow commands** - never n8n commands directly

## IF YOU SEE DISCONNECTED NODES

This usually means:
- Someone used n8n commands directly instead of McFlow
- The workflow has `$readFile()` expressions (remove them!)
- The deployment didn't inject code properly

Fix by:
1. Export the workflow: `mcflow export --id workflow-id`
2. Remove any `$readFile()` expressions
3. Ensure `_nodeFile` references exist
4. Deploy with McFlow: `mcflow deploy`

---

**THIS IS NOT OPTIONAL - Using n8n directly WILL break the workflow system!**