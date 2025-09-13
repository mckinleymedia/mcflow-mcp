# McFlow Troubleshooting Guide

## Common Issues and Solutions

### 0. Workflow Duplication Instead of Updates

**Problem:** When deploying workflows, n8n creates duplicates instead of updating existing ones.

**Cause:** The workflow doesn't have an ID field, so n8n treats it as a new workflow.

**Solution:** 
1. Always export workflows from n8n using McFlow: `mcflow export --id workflow-id`
2. McFlow now preserves workflow IDs during updates
3. Check your workflow has an `id` field at the root level:
   ```json
   {
     "id": "workflow-unique-id",
     "name": "My Workflow",
     "nodes": [...]
   }
   ```

**Prevention:**
- Never manually create workflow files without exporting from n8n first
- Always use `mcflow export` to get workflows from n8n
- The ID is preserved automatically during updates

## Common Issues and Solutions

### 1. Path Doubling Error: `workflows/workflows/flows/`

**Error:**
```
Error: ENOENT: no such file or directory, access '/path/to/project/workflows/workflows/flows/workflow.json'
```

**Cause:** The AI or user is passing the full path including "workflows/" when McFlow already knows the workflows directory.

**Solution:**
- Use: `mcflow deploy --path "flows/workflow.json"`
- NOT: `mcflow deploy --path "workflows/flows/workflow.json"`

### 2. SQLITE_CONSTRAINT Error

**Error:**
```
SQLITE_CONSTRAINT: NOT NULL constraint failed: workflow_entity.active
```

**Cause:** The workflow is missing required fields like `active`.

**Solution:** McFlow now automatically adds missing fields:
- `active: false` (default)
- `settings: { executionOrder: 'v1' }`
- `connections: {}`

### 3. AI Using n8n CLI Directly

**Problem:** AI agents bypass McFlow and use n8n commands directly, breaking the node extraction system.

**Solution:** 
- Remind the AI: "Use McFlow commands only, never n8n directly"
- Point to docs/ai/instructions.md
- The extracted nodes won't work if deployed with n8n directly

### 4. $readFile() in Workflows

**Error:** Nodes contain `$readFile('path/to/file.js')` which doesn't work in n8n.

**Solution:**
1. Remove all `$readFile()` expressions
2. Use McFlow's extraction system:
   ```bash
   mcflow extract_code --workflow my-workflow
   mcflow deploy  # This injects the content
   ```

### 5. Disconnected Nodes After Deployment

**Cause:** The workflow was deployed using n8n CLI directly instead of McFlow, so code wasn't injected.

**Solution:**
1. Export the workflow: `mcflow export --id workflow-id`
2. Extract nodes: `mcflow extract_code`
3. Deploy properly: `mcflow deploy`

### 6. Empty Code Nodes in n8n UI

**Cause:** This is normal! After extraction, nodes contain only file references.

**Solution:** This is the intended behavior. The code lives in files and gets injected during deployment.

## Correct Workflow Process

### For New Workflows:
```bash
# 1. Create workflow
mcflow create --name "My Workflow"

# 2. Extract nodes for editing
mcflow extract_code --workflow my-workflow

# 3. Edit files in workflows/nodes/
# Use your editor with syntax highlighting

# 4. Deploy with injection
mcflow deploy --path "flows/my-workflow.json"
```

### For Existing Workflows:
```bash
# 1. Export from n8n
mcflow export --id workflow-id

# 2. Extract nodes
mcflow extract_code

# 3. Edit extracted files

# 4. Deploy back
mcflow deploy
```

## Path Structure

Correct paths for McFlow:
```
project/
└── workflows/
    ├── flows/           # Workflow JSON files go here
    │   └── my-workflow.json
    └── nodes/           # Extracted content goes here
        ├── code/
        ├── prompts/
        ├── sql/
        └── templates/
```

## When Deploying

McFlow deployment process:
1. Reads workflow from `workflows/flows/workflow.json`
2. Looks for `_nodeFile` references
3. Reads content from `workflows/nodes/...`
4. Injects content into node parameters
5. Creates temp file with complete workflow
6. Sends to n8n with injected content
7. Cleans up temp file

## Remember

- **ALWAYS use McFlow commands** - never n8n CLI directly
- **Extracted nodes have empty content** - this is normal
- **Content is injected at deployment** - not stored in workflow
- **$readFile() doesn't work** - McFlow handles file reading
- **Workflow IDs must be preserved** - to avoid duplicates during updates

## Verifying Deployments

To check if workflows are deployed:
```bash
# Use McFlow to list deployed workflows
mcflow deployed

# This shows all workflows in n8n with their status:
# 🟢 = active
# ⚪ = inactive
```

If McFlow shows no workflows but you know they're deployed, check n8n directly at http://localhost:5678