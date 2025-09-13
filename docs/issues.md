# Common n8n Workflow Issues and Solutions

## Merge Node Problems

### Issue: "Multiplex" Mode Outputs Empty Data
**Problem**: The Merge node with `mode: "multiplex"` often produces empty output or doesn't work as expected.

**Solution**: 
```json
// WRONG - Often outputs empty data
{
  "parameters": {
    "mode": "multiplex"
  },
  "type": "n8n-nodes-base.merge"
}

// CORRECT - Use combine mode
{
  "parameters": {
    "mode": "combine",
    "combinationMode": "mergeByPosition",
    "options": {}
  },
  "type": "n8n-nodes-base.merge"
}
```

**Alternative Solutions**:
- `combinationMode: "mergeByIndex"` - Merges by array index
- `combinationMode: "mergeByKey"` - Merges by a specific field
- `combinationMode: "append"` - Simply appends all inputs

### Issue: Merge Node with Single Input
**Problem**: Merge nodes require at least 2 inputs to function properly.

**Solution**: Ensure multiple nodes connect to your Merge node:
```json
"connections": {
  "Source Node 1": {
    "main": [[{"node": "Merge All", "type": "main", "index": 0}]]
  },
  "Source Node 2": {
    "main": [[{"node": "Merge All", "type": "main", "index": 1}]]
  }
}
```

## RSS Feed Node Issues

### Issue: Empty RSS Feed Results
**Problem**: RSS nodes return no data even though the feed is valid.

**Solution**: 
1. Ensure the RSS URL is accessible
2. Add error handling after RSS nodes
3. Use the HTTP Request node as a fallback

## Code Node Best Practices

### Issue: Returning Empty Data from Code Nodes
**Problem**: Code nodes must return data in the correct format.

**Solution**:
```javascript
// WRONG - Returns undefined
const items = $input.all();
// Missing return statement

// CORRECT - Always return an array
const items = $input.all();
// Process items...
return items.map(item => ({
  json: item.json,
  // Additional fields...
}));

// OR for single item
return [{
  json: {
    field: "value"
  }
}];
```

## Workflow Trigger Issues

### Issue: Workflow Not Starting
**Problem**: Workflows need at least one trigger node to start.

**Solution**: Add one of these trigger nodes:
- Manual Trigger (for testing)
- Schedule Trigger (for automation)
- Webhook Trigger (for external triggers)
- Workflow Trigger (for sub-workflows)

## Connection Problems

### Issue: Node Not Receiving Data
**Problem**: Connections might be incorrectly configured.

**Solution**: Check the connections object:
```json
"connections": {
  "Source Node": {
    "main": [  // Output type (usually "main")
      [        // Output index (usually 0)
        {
          "node": "Target Node",  // Must match node name exactly
          "type": "main",
          "index": 0  // Input index
        }
      ]
    ]
  }
}
```

## Validation Before Deployment

Always validate workflows before deploying:
```bash
# Using McFlow MCP
McFlow validate

# Check for:
# - Merge nodes using multiplex mode
# - Missing trigger nodes
# - Disconnected nodes
# - Invalid node IDs
```

## Quick Fixes

### Convert Multiplex to Combine
If you have workflows with multiplex merge nodes, fix them:
1. Change `mode: "multiplex"` to `mode: "combine"`
2. Add `combinationMode: "mergeByPosition"`
3. Ensure all input connections have correct indices

### Fix Empty Output Issues
1. Check all Code nodes return data
2. Verify Merge nodes use combine mode
3. Ensure RSS feeds are accessible
4. Add error handling nodes

## Using McFlow to Prevent Issues

McFlow's `validate` command will check for these common issues:
- Merge nodes with multiplex mode
- Missing trigger nodes  
- Invalid connections
- Missing required parameters

Run validation before every deployment:
```
McFlow validate
McFlow deploy
```