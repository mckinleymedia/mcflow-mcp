# Important: McFlow Handles All n8n Commands

## DO NOT Use Direct Bash Commands

McFlow MCP server provides tools that replace ALL n8n CLI commands. The AI assistant should NEVER need to run n8n commands via bash.

### Command Mapping

| ❌ DON'T USE (Bash)           | ✅ USE INSTEAD (McFlow)        |
|-------------------------------|--------------------------------|
| `n8n import:workflow`         | `McFlow deploy`                |
| `n8n export:workflow`         | `McFlow export`                |
| `n8n execute --id=workflow`  | `McFlow execute`               |
| `n8n list:workflow`           | `McFlow deployed`              |
| `n8n start`                   | `McFlow start`                 |
| `n8n update:workflow`         | `McFlow activate`              |

### Why This Matters

1. **No Permission Prompts**: McFlow tools don't require bash approval
2. **Better Error Handling**: McFlow filters out warnings and focuses on real errors
3. **Parallel Operations**: McFlow can deploy multiple workflows simultaneously
4. **Automatic Validation**: McFlow validates before deploying
5. **Persistent Storage**: McFlow ensures workflows use local database.sqlite

### Examples

#### ❌ WRONG - Will ask for bash permission:
```bash
n8n execute --id=news-collection-module 2>&1 | grep -E "(Collected|sources)"
```

#### ✅ CORRECT - Uses McFlow tool:
```
McFlow execute --id news-collection-module
```

#### ❌ WRONG - Direct import:
```bash
n8n import:workflow --input=workflows/flows/main.json
```

#### ✅ CORRECT - McFlow deploy:
```
McFlow deploy --path workflows/flows/main.json
```

### For AI Assistants

When working with n8n workflows, ALWAYS use McFlow tools:

1. **To deploy workflows**: Use `McFlow deploy`
2. **To test workflows**: Use `McFlow execute`
3. **To list workflows**: Use `McFlow deployed` (in n8n) or `McFlow list` (in project)
4. **To export workflows**: Use `McFlow export`
5. **To start n8n**: Use `McFlow start`

### Benefits of McFlow Tools

- **No bash permissions needed**
- **Handles all stderr warnings automatically**
- **Provides formatted, clear output**
- **Validates workflows before deployment**
- **Can auto-fix common issues**
- **Deploys multiple workflows in parallel**

Remember: If you find yourself typing `n8n` in a bash command, stop and use the McFlow tool instead!