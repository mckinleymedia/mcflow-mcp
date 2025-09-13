# Workflow Compilation Feature

## Overview

McFlow now supports automatic workflow compilation that processes workflows before deployment. This feature allows you to maintain node code in separate `.js`, `.py`, or `.sql` files while the workflow JSON only contains references to these files. During deployment, McFlow automatically compiles the workflows by injecting the actual code.

## Benefits

- **Cleaner Version Control**: Separate code changes from workflow structure changes
- **Better Code Editing**: Full IDE support with syntax highlighting, IntelliSense, and linting
- **Code Reusability**: Share code modules across multiple workflows
- **Easier Testing**: Test code logic independently from workflow structure
- **Better Organization**: Keep complex workflows manageable with external files

## How It Works

### 1. Workflow Structure

Instead of embedding code directly in workflow nodes:
```json
{
  "parameters": {
    "jsCode": "// hundreds of lines of code here..."
  }
}
```

You can reference external files:
```json
{
  "parameters": {
    "nodeContent": {
      "jsCode": "workflow_name_parse_data"
    }
  }
}
```

### 2. File Organization

```
workflows/
  flows/
    my-workflow.json        # Contains nodeContent references
  nodes/
    code/
      my-workflow_parse_data.js
      my-workflow_transform.js
    python/
      my-workflow_analyze.py
    sql/
      my-workflow_query.sql
    prompts/
      my-workflow_system.txt
      my-workflow_user.txt
  dist/                     # Compiled workflows (optional)
    my-workflow.json        # Complete workflow with injected code
```

### 3. Automatic Compilation

**IMPORTANT**: McFlow ALWAYS compiles workflows before deployment to ensure the latest code and prompt changes are included.

During deployment, McFlow:
1. Checks if workflow has `nodeContent` references
2. If yes, loads corresponding files from `nodes/` directories
3. Replaces references with actual code content
4. Deploys the compiled version to n8n
5. If no external files, deploys as-is

## Usage

### Command Line Interface

#### Compile Workflows
```bash
# Compile all workflows (outputs to dist/ for debugging)
mcflow compile --output

# Compile without saving to files (in-memory only)
mcflow compile

# Specify custom path
mcflow compile --path /path/to/project
```

#### Extract Code from Existing Workflows
```bash
# Extract code from all workflows
mcflow extract

# Extract from specific workflow
mcflow extract --workflow my-workflow.json
```

#### Deploy with Automatic Compilation
```bash
# Deploy all workflows (ALWAYS compiles first)
mcflow deploy

# Deploy specific workflow (ALWAYS compiles first)
mcflow deploy --workflow my-workflow.json

# Skip compilation (NOT RECOMMENDED - for debugging only)
mcflow deploy --skip-compilation
```

**Note**: Deployment ALWAYS compiles workflows before sending to n8n unless explicitly skipped. This ensures your deployed workflows always include the latest code and prompt changes.

### NPM Scripts
```bash
# Compile workflows
npm run compile

# Extract code from workflows
npm run extract

# Deploy with compilation
npm run deploy
```

## Example Workflow

### Source Workflow (flows/data-processor.json)
```json
{
  "name": "Data Processor",
  "nodes": [
    {
      "name": "Fetch Data",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "https://api.example.com/data"
      }
    },
    {
      "name": "Parse Response",
      "type": "n8n-nodes-base.code",
      "parameters": {
        "nodeContent": {
          "jsCode": "data_processor_parse"
        }
      }
    },
    {
      "name": "Query Database",
      "type": "n8n-nodes-base.postgres",
      "parameters": {
        "nodeContent": {
          "sqlQuery": "data_processor_enrichment"
        }
      }
    }
  ]
}
```

### External Code Files

**nodes/prompts/data_processor_analysis.txt**
```
Analyze the provided data and identify:
1. Data quality issues
2. Anomalies or outliers
3. Patterns and trends
4. Recommendations for processing

Format your response as structured JSON.
```

**nodes/code/data_processor_parse.js**
```javascript
// Parse and validate API response
const items = $input.all();
const parsed = [];

for (const item of items) {
  const data = item.json;
  if (data.valid) {
    parsed.push({
      json: {
        id: data.id,
        processed: true
      }
    });
  }
}

return parsed;
```

**nodes/sql/data_processor_enrichment.sql**
```sql
SELECT 
  u.id,
  u.name,
  u.email,
  COUNT(o.id) as order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.id = {{$json.id}}
GROUP BY u.id, u.name, u.email
```

### Compiled Output (dist/data-processor.json)
After compilation, the workflow contains the complete code:
```json
{
  "name": "Data Processor",
  "nodes": [
    {
      "name": "Parse Response",
      "type": "n8n-nodes-base.code",
      "parameters": {
        "jsCode": "// Parse and validate API response\nconst items = $input.all();\n..."
      }
    }
  ]
}
```

## Supported File Types

- **JavaScript**: `nodes/code/*.js` → `jsCode` parameter
- **Python**: `nodes/python/*.py` → `pythonCode` parameter
- **SQL**: `nodes/sql/*.sql` → `sqlQuery` parameter
- **Prompts**: `nodes/prompts/*.txt` → `prompt` parameter

## Best Practices

### Naming Conventions
- Use descriptive file names: `workflow-name_node-purpose.js`
- Keep file names consistent with node names
- Use underscores for word separation in file names

### Code Organization
- One file per node for clarity
- Group related helper functions in the same file
- Add comments to explain complex logic

### Version Control
- Commit both workflow JSON and code files together
- Use meaningful commit messages for code changes
- Review code changes separately from workflow structure

### Testing
- Test code files independently when possible
- Use the compile command to verify before deployment
- Check dist/ output for debugging

## Migration Guide

### Converting Existing Workflows

1. **Extract existing code**:
   ```bash
   mcflow extract --workflow existing-workflow.json
   ```

2. **Review extracted files**:
   - Check `nodes/code/` for JavaScript files
   - Verify file naming and content

3. **Test compilation**:
   ```bash
   mcflow compile --output
   ```

4. **Deploy updated workflow**:
   ```bash
   mcflow deploy --workflow existing-workflow.json
   ```

## Troubleshooting

### Common Issues

**Code file not found**
- Check file exists in correct directory (`nodes/code/`, `nodes/python/`, etc.)
- Verify file name matches reference in workflow
- Ensure file extension is correct

**Compilation fails**
- Check for syntax errors in external code files
- Verify nodeContent structure in workflow JSON
- Review console output for specific errors

**Deployment issues**
- Ensure n8n is running and accessible
- Check workflow validation after compilation
- Verify all referenced files exist

### Debug Mode

To debug compilation:
1. Use `--output` flag to save compiled workflows
2. Review files in `workflows/dist/`
3. Compare source and compiled versions
4. Check console logs for injection details

## Advanced Features

### Shared Modules

Create reusable code modules:
```javascript
// nodes/modules/utils.js
function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function formatDate(date) {
  return new Date(date).toLocaleDateString();
}
```

Reference in node code:
```javascript
// nodes/code/process_user.js
// TODO: Future feature - module imports
const { validateEmail, formatDate } = require('../modules/utils');
```

### Conditional Compilation

Skip compilation for specific workflows by adding metadata:
```json
{
  "meta": {
    "skipCompilation": true
  }
}
```

## API Reference

### WorkflowCompiler Class

```typescript
class WorkflowCompiler {
  constructor(workflowsPath: string)
  
  // Compile single workflow
  async compileWorkflow(workflowPath: string): Promise<Workflow>
  
  // Compile all workflows
  async compileAll(outputToFiles?: boolean): Promise<Map<string, Workflow>>
  
  // Extract code from workflow
  async extractCode(workflowPath: string): Promise<void>
  
  // Check if compilation needed
  async needsCompilation(workflowPath: string): Promise<boolean>
}
```

### WorkflowDeployer Class

```typescript
class WorkflowDeployer {
  // Deploy with automatic compilation
  async deployWorkflow(path: string, skipCompilation?: boolean): Promise<void>
  
  // Compile all workflows
  async compileAll(saveToFiles?: boolean): Promise<void>
  
  // Extract code from workflows
  async extractCode(workflowPath: string): Promise<void>
  async extractAllCode(): Promise<void>
}
```

## Future Enhancements

- Support for TypeScript files with automatic transpilation
- Module system for sharing code between workflows
- Hot reload during development
- Integration with n8n's native code editor
- Automatic code formatting and linting
- Support for external npm packages