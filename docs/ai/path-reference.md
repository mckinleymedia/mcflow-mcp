# McFlow Path Reference Guide

## ⚠️ DEFINITIVE SOURCE: See [ARCHITECTURE.md](/ARCHITECTURE.md)

This is a quick reference. For the complete, authoritative path structure, see [ARCHITECTURE.md](/ARCHITECTURE.md).

## Key Points:
- `projectPath` = Project root directory
- `workflowsPath` = `{projectPath}/workflows/`
- All McFlow paths are **relative to workflowsPath**

### Workflow Files

**Internal location:** `{workflowsPath}/flows/`

**Read a workflow:**
```bash
mcflow read --path "flows/project-workflow-name.json"
```

**Examples:**
```bash
✅ mcflow read --path "flows/newspop-news-collection.json"     # Correct - relative to workflowsPath
✅ mcflow read --path "flows/newspop-image-analysis.json"      # Correct - relative to workflowsPath

❌ mcflow read --path "news-collection.json"                   # Missing flows/ subdirectory
❌ mcflow read --path "workflows/flows/news-collection.json"   # Don't include workflows/
❌ mcflow read --path "newspop-news-collection"                # Missing flows/ and .json
```

### Extracted Node Files

**Code files:** `workflows/nodes/code/`
```bash
workflows/nodes/code/workflow-name-node-purpose.js
workflows/nodes/code/newspop-news-analysis-prepare-items.js
```

**Prompt files:** `workflows/nodes/prompts/`
```bash
workflows/nodes/prompts/workflow-name-prompt-name.md
workflows/nodes/prompts/newspop-analysis-batch.md
```

**JSON files:** `workflows/nodes/json/`
```bash
workflows/nodes/json/sample-data.json
workflows/nodes/json/api-config.json
```

**SQL files:** `workflows/nodes/sql/`
```bash
workflows/nodes/sql/query-name.sql
```

### Complete Directory Structure

```
project-root/
└── workflows/                          # Main workflows directory
    ├── flows/                          # Workflow JSON files
    │   ├── project-workflow-1.json
    │   ├── project-workflow-2.json
    │   └── project-workflow-3.json
    ├── nodes/                          # Extracted node content
    │   ├── code/                       # JavaScript/TypeScript files
    │   │   ├── workflow1-node1.js
    │   │   └── workflow2-node1.js
    │   ├── prompts/                    # AI prompt files (Markdown)
    │   │   ├── analysis-prompt.md
    │   │   └── summary-prompt.md
    │   ├── json/                       # JSON configurations and mock data
    │   │   ├── sample-articles.json
    │   │   └── api-config.json
    │   ├── sql/                        # SQL queries
    │   │   └── fetch-users.sql
    │   └── templates/                  # HTML/text templates
    │       └── email-template.html
    ├── dist/                            # Compiled workflows (auto-generated)
    ├── .env                             # Environment variables (never commit!)
    └── README.md                        # Workflows documentation
```

## Common Path Errors and Fixes

### Error: "ENOENT: no such file or directory"

**Cause:** Using incomplete path
```bash
❌ mcflow read --path "image_analysis.json"
```

**Fix:** Use complete path
```bash
✅ mcflow read --path "workflows/flows/newspop-image-analysis.json"
```

### Error: "Failed to read workflow"

**Cause:** Missing `workflows/` prefix
```bash
❌ mcflow read --path "flows/workflow.json"
```

**Fix:** Include full path from project root
```bash
✅ mcflow read --path "workflows/flows/workflow.json"
```

### Error: "Cannot find module"

**Cause:** Wrong node file path
```bash
❌ const code = require('./node-code.js');
```

**Fix:** Use McFlow's extraction system
```bash
✅ // File will be at: workflows/nodes/code/workflow-node.js
// McFlow handles the injection automatically
```

## Rules for AI Agents

1. **ALWAYS use full paths** starting with `workflows/`
2. **NEVER assume current directory** - always specify from project root
3. **CHECK path exists** before operations
4. **USE the list command** to see available workflows before reading
5. **FOLLOW the structure** - don't create files outside the standard locations

## Quick Commands

**List all workflows:**
```bash
mcflow list
```

**Read specific workflow:**
```bash
mcflow read --path "workflows/flows/[project]-[workflow].json"
```

**Extract code from workflow:**
```bash
mcflow extract_code --workflow "[project]-[workflow]"
```

**Deploy workflow:**
```bash
mcflow deploy --path "workflows/flows/[project]-[workflow].json"
```

---

**Remember:** When in doubt, use `mcflow list` first to see the correct workflow names and paths!