# IMPORTANT: Real Nodes Only Policy

## McFlow MCP Server - Node Creation Guidelines

### ⚠️ CRITICAL REQUIREMENT: Only Create Real n8n Nodes

The McFlow MCP server enforces a strict policy: **ALL nodes in workflows MUST be real, executable n8n nodes**. 

### ❌ What NOT to Create

Never create mock, placeholder, or dummy nodes such as:
- `mockNode`
- `placeholderAPI`
- `dummyData`
- `testEndpoint`
- `fakeService`
- `exampleNode`
- `sampleData`
- `todoImplement`

### ✅ What TO Create

Only use actual n8n node types that will execute properly:

#### Common Real Nodes:
- `n8n-nodes-base.httpRequest` - Make HTTP API calls
- `n8n-nodes-base.code` - Execute JavaScript/Python code
- `n8n-nodes-base.mergeV3` - Merge data from multiple sources
- `n8n-nodes-base.if` - Conditional branching
- `n8n-nodes-base.switch` - Multi-path routing
- `n8n-nodes-base.set` - Set or transform data
- `n8n-nodes-base.splitInBatches` - Process data in batches
- `n8n-nodes-base.webhook` - Receive webhook calls
- `n8n-nodes-base.schedule` - Schedule workflows
- `n8n-nodes-base.manualTrigger` - Manual workflow trigger

#### Integration Nodes:
- `n8n-nodes-base.slack` - Slack integration
- `n8n-nodes-base.github` - GitHub integration
- `n8n-nodes-base.googleSheets` - Google Sheets
- `n8n-nodes-base.postgres` - PostgreSQL database
- `n8n-nodes-base.redis` - Redis cache
- `n8n-nodes-base.openAi` - OpenAI API
- `n8n-nodes-base.airtable` - Airtable database

### 📋 Node Validation

The McFlow validator will:
1. **Reject** any nodes with mock/placeholder types
2. **Validate** that node types follow n8n naming conventions
3. **Check** that all required parameters are present
4. **Ensure** proper connections between nodes
5. **Verify** node compatibility with n8n version

### 🔍 How to Find Real Node Types

1. **n8n Documentation**: https://docs.n8n.io/integrations/
2. **Node Browser**: In n8n UI, use the node browser to find exact node types
3. **Existing Workflows**: Reference working workflows for correct node types

### 💡 Best Practices

1. **Use HTTP Request for APIs**: Instead of creating mock API nodes, use `n8n-nodes-base.httpRequest`
2. **Use Code Nodes for Logic**: Instead of placeholder logic, use `n8n-nodes-base.code`
3. **Use Set Node for Data**: Instead of dummy data nodes, use `n8n-nodes-base.set`
4. **Check Node Versions**: Always include proper `typeVersion` for nodes
5. **Test in n8n**: Validate that workflows execute properly in n8n

### 🚫 Validation Errors

If you try to create mock nodes, you'll see errors like:
```
❌ Invalid node type: mockDataSource. Only real n8n nodes are allowed. No mock or placeholder nodes.
→ Fix: Replace with an actual n8n node type (e.g., n8n-nodes-base.httpRequest, n8n-nodes-base.code, etc.)
```

### ✨ Example: Replace Mock with Real

❌ **Wrong** (Mock Node):
```json
{
  "type": "mockWeatherAPI",
  "name": "Get Weather Data",
  "parameters": {
    "endpoint": "/weather"
  }
}
```

✅ **Correct** (Real Node):
```json
{
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 4.2,
  "name": "Get Weather Data",
  "parameters": {
    "method": "GET",
    "url": "https://api.weather.com/v1/weather",
    "options": {}
  }
}
```

### 🛠️ Validation Command

Always validate your workflows after creation:
```bash
# Validate all workflows
McFlow validate

# Auto-fix common issues
McFlow validate --fix
```

Remember: **Every node must be a real n8n node that can actually execute**. No exceptions.