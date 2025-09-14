# CRITICAL INSTRUCTIONS FOR AI ASSISTANTS USING MCFLOW

## ⚠️ NEVER PUT CODE DIRECTLY IN WORKFLOW JSON FILES ⚠️

When working with McFlow workflows, you MUST follow these strict rules:

### 🚫 WRONG - Never Do This:
```json
{
  "parameters": {
    "jsCode": "// This is WRONG - never put code directly here\nconst items = $input.all();\n// ... more code ..."
  }
}
```

### ✅ CORRECT - Always Do This:
```json
{
  "parameters": {
    "nodeContent": {
      "jsCode": "workflow_name_node_purpose"
    }
  }
}
```

## MANDATORY WORKFLOW DEVELOPMENT PROCESS

### Step 1: ALWAYS Use External Files

When creating or modifying code nodes:

1. **NEVER** put code directly in the workflow JSON
2. **ALWAYS** create an external file in the appropriate directory:
   - JavaScript → `workflows/nodes/code/[workflow-name]_[node-purpose].js`
   - Python → `workflows/nodes/python/[workflow-name]_[node-purpose].py`
   - SQL → `workflows/nodes/sql/[workflow-name]_[node-purpose].sql`
   - Prompts → `workflows/nodes/prompts/[workflow-name]_[node-purpose].md`

3. **ALWAYS** use nodeContent references in the workflow JSON

### Step 2: File Naming Convention

Use this EXACT pattern for file names:
- `[workflow-name]_[node-purpose].[extension]`
- Examples:
  - `news_analysis_prepare_items.js`
  - `image_generation_filter_results.py`
  - `data_sync_fetch_records.sql`
  - `ai_assistant_system_prompt.md`

### Step 3: Workflow JSON Structure

For EVERY code node in your workflow JSON:

```json
{
  "name": "Parse Data",
  "type": "n8n-nodes-base.code",
  "parameters": {
    "nodeContent": {
      "jsCode": "workflow_name_parse_data"  // NO FILE EXTENSION
    }
  }
}
```

For prompts:
```json
{
  "name": "AI Analysis",
  "type": "n8n-nodes-base.openAi",
  "parameters": {
    "nodeContent": {
      "prompt": "workflow_name_analysis_prompt"  // NO FILE EXTENSION
    }
  }
}
```

## COMPILATION PROCESS

McFlow automatically handles compilation:

1. **During Development**: Keep code in separate files
2. **During Deployment**: McFlow compiles by injecting code from external files
3. **Result**: n8n receives complete workflows with code included

**YOU DON'T COMPILE MANUALLY** - McFlow does it automatically during deployment!

## EXTRACT EXISTING WORKFLOWS

If you encounter a workflow with embedded code:

1. **USE THE EXTRACT COMMAND FIRST**:
   ```bash
   mcflow extract --workflow existing-workflow.json
   ```

2. This will:
   - Create external files for all code nodes
   - Update the workflow JSON with nodeContent references
   - Maintain the original functionality

## VALIDATION CHECKLIST

Before completing ANY workflow task, verify:

- [ ] ❌ NO code directly in workflow JSON files
- [ ] ✅ ALL code in external files under `workflows/nodes/`
- [ ] ✅ ALL workflow nodes use `nodeContent` references
- [ ] ✅ File names follow the pattern: `workflow_name_node_purpose.ext`
- [ ] ✅ External files contain the actual implementation

## COMMON MISTAKES TO AVOID

### ❌ Mistake 1: Inline Code
```json
// NEVER DO THIS
"parameters": {
  "jsCode": "const data = $input.all()..."
}
```

### ❌ Mistake 2: Wrong Directory
```
// NEVER PUT CODE FILES HERE
workflows/flows/my-code.js  ❌ WRONG
workflows/my-code.js        ❌ WRONG

// ALWAYS PUT CODE FILES HERE
workflows/nodes/code/my-workflow_parse.js     ✅ CORRECT
```

### ❌ Mistake 3: Including File Extension in Reference
```json
// NEVER INCLUDE EXTENSION
"nodeContent": {
  "jsCode": "my_workflow_parse.js"  ❌ WRONG
}

// ALWAYS OMIT EXTENSION
"nodeContent": {
  "jsCode": "my_workflow_parse"     ✅ CORRECT
}
```

## RESPONSE TEMPLATE FOR AI ASSISTANTS

When asked to create or modify a workflow with code:

1. "I'll create the workflow with external code files as required by McFlow."
2. Create the workflow JSON with `nodeContent` references
3. Create separate files in `workflows/nodes/[type]/` for each code node
4. Explain: "The code is kept in external files and will be automatically compiled during deployment"

## ENFORCEMENT

**IF YOU PUT CODE DIRECTLY IN WORKFLOW JSON FILES, YOU ARE USING MCFLOW INCORRECTLY!**

The entire purpose of McFlow's compilation system is to:
- Keep code separate for better version control
- Enable proper code editing with IDE support
- Allow code reuse across workflows
- Maintain clean, readable workflow definitions

Remember: The workflow JSON should ONLY contain the workflow structure and nodeContent references. ALL implementation code MUST be in external files.