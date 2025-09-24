# Workflow Tracking System

## Overview

McFlow provides a generic, configurable workflow tracking system that can add execution tracking, checkpointing, and error handling to any n8n workflow. The tracking system uses HTTP Request nodes to send workflow data to any external storage API.

## Key Features

- **Execution Tracking**: Track workflow start and end events
- **Node Output Storage**: Store outputs from specific nodes
- **Checkpoint System**: Save and restore workflow state
- **Error Tracking**: Capture and store error information
- **Generic Storage**: Works with any HTTP-based storage API
- **Non-invasive**: Tracking nodes continue on failure to not block workflow

## Configuration

### Environment Variables

```bash
# Set the base URL for your storage API
export WORKFLOW_STORAGE_URL=http://localhost:3000
```

### Global Configuration

Configure tracking settings for all workflows:

```bash
mcflow configure_tracking \
  --enabled true \
  --storageUrl "http://localhost:3000" \
  --enableCheckpoints true \
  --enableErrorTracking true
```

## Adding Tracking to Workflows

### Basic Tracking

Add start and end tracking to a workflow:

```bash
mcflow add_tracking \
  --path "flows/my-workflow.json" \
  --storageUrl "http://localhost:3000"
```

### Full Tracking with Checkpoints

```bash
mcflow add_tracking \
  --path "flows/my-workflow.json" \
  --storageUrl "http://localhost:3000" \
  --options '{
    "addStartTracking": true,
    "addEndTracking": true,
    "addErrorTracking": true,
    "checkpoints": [
      {
        "afterNode": "Process Data",
        "checkpointName": "after_processing"
      },
      {
        "afterNode": "API Call",
        "checkpointName": "after_api_call"
      }
    ],
    "storeOutputNodes": ["Process Data", "Transform Data"]
  }'
```

### Adding Individual Checkpoints

```bash
mcflow add_checkpoint \
  --path "flows/my-workflow.json" \
  --checkpointName "expensive_operation" \
  --afterNode "AI Processing" \
  --addRestore true
```

## Storage API Contract

The tracking system sends data to your storage API with the following contracts:

### Start Execution

```http
POST {WORKFLOW_STORAGE_URL}/api/workflow/store
Content-Type: application/json

{
  "action": "start_execution",
  "workflowId": "workflow-123",
  "workflowName": "My Workflow",
  "executionId": "exec-456",
  "itemId": "item-789",
  "metadata": {...},
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### End Execution

```http
POST {WORKFLOW_STORAGE_URL}/api/workflow/store
Content-Type: application/json

{
  "action": "end_execution",
  "executionId": "exec-456",
  "status": "success",
  "resultData": {...},
  "timestamp": "2024-01-01T00:01:00Z"
}
```

### Save Checkpoint

```http
POST {WORKFLOW_STORAGE_URL}/api/workflow/store
Content-Type: application/json

{
  "action": "save_checkpoint",
  "itemId": "item-789",
  "checkpointName": "after_processing",
  "nodeId": "Process Data",
  "checkpointData": {...},
  "timestamp": "2024-01-01T00:00:30Z"
}
```

### Restore Checkpoint

```http
GET {WORKFLOW_STORAGE_URL}/api/workflow/retrieve?action=get_checkpoint&itemId=item-789&checkpointName=after_processing
```

### Store Node Output

```http
POST {WORKFLOW_STORAGE_URL}/api/workflow/store
Content-Type: application/json

{
  "action": "store_node",
  "executionId": "exec-456",
  "nodeId": "Process Data",
  "nodeType": "n8n-nodes-base.code",
  "input": [...],
  "output": {...},
  "timestamp": "2024-01-01T00:00:15Z"
}
```

### Track Error

```http
POST {WORKFLOW_STORAGE_URL}/api/workflow/store
Content-Type: application/json

{
  "action": "track_error",
  "executionId": "exec-456",
  "errorMessage": "API call failed",
  "errorDetails": {...},
  "nodeId": "API Call",
  "timestamp": "2024-01-01T00:00:45Z"
}
```

## Use Cases

### 1. Workflow Analytics

Track execution times, success rates, and performance metrics:

```bash
mcflow add_tracking \
  --path "flows/analytics-workflow.json" \
  --storageUrl "http://analytics-api.example.com"
```

### 2. Long-Running Workflows with Checkpoints

Add checkpoints before expensive operations:

```bash
mcflow add_tracking \
  --path "flows/ai-processing.json" \
  --options '{
    "checkpoints": [
      {"afterNode": "Fetch Data", "checkpointName": "data_fetched"},
      {"afterNode": "AI Processing", "checkpointName": "ai_complete"},
      {"afterNode": "Transform Results", "checkpointName": "transformed"}
    ]
  }'
```

### 3. Debug and Error Tracking

Enable comprehensive error tracking:

```bash
mcflow add_tracking \
  --path "flows/critical-workflow.json" \
  --options '{
    "addErrorTracking": true,
    "storeOutputNodes": ["*"]
  }'
```

### 4. Data Pipeline Monitoring

Track data flow through transformation steps:

```bash
mcflow add_tracking \
  --path "flows/data-pipeline.json" \
  --options '{
    "storeOutputNodes": [
      "Extract Data",
      "Clean Data",
      "Transform Data",
      "Load Data"
    ]
  }'
```

## Example Storage API Implementation

Here's a simple Express.js implementation of a compatible storage API:

```javascript
const express = require('express');
const app = express();
app.use(express.json());

// In-memory storage (use a database in production)
const storage = {
  executions: {},
  checkpoints: {},
  nodes: {},
  errors: []
};

// Store endpoint
app.post('/api/workflow/store', (req, res) => {
  const { action, executionId, itemId, checkpointName, ...data } = req.body;

  switch (action) {
    case 'start_execution':
      storage.executions[executionId] = {
        started: new Date(),
        ...data
      };
      break;

    case 'end_execution':
      if (storage.executions[executionId]) {
        storage.executions[executionId].ended = new Date();
        storage.executions[executionId].status = data.status;
      }
      break;

    case 'save_checkpoint':
      const key = `${itemId}:${checkpointName}`;
      storage.checkpoints[key] = data;
      break;

    case 'store_node':
      if (!storage.nodes[executionId]) {
        storage.nodes[executionId] = [];
      }
      storage.nodes[executionId].push(data);
      break;

    case 'track_error':
      storage.errors.push({ executionId, ...data });
      break;
  }

  res.json({ success: true, action, executionId });
});

// Retrieve endpoint
app.get('/api/workflow/retrieve', (req, res) => {
  const { action, itemId, checkpointName } = req.query;

  if (action === 'get_checkpoint') {
    const key = `${itemId}:${checkpointName}`;
    const checkpoint = storage.checkpoints[key];
    res.json({ checkpointData: checkpoint || null });
  } else {
    res.status(400).json({ error: 'Unknown action' });
  }
});

app.listen(3000, () => {
  console.log('Storage API running on http://localhost:3000');
});
```

## Best Practices

1. **Use Environment Variables**: Store the storage URL in environment variables for easy configuration
2. **Add Checkpoints Strategically**: Place checkpoints after expensive operations or API calls
3. **Enable Error Tracking**: Always enable error tracking for critical workflows
4. **Monitor Performance**: Tracking adds overhead, so monitor the impact on workflow performance
5. **Secure Your Storage API**: Implement authentication and encryption for production storage APIs
6. **Clean Up Old Data**: Implement retention policies in your storage API to manage data growth

## Limitations

- Tracking nodes add a small performance overhead
- Storage API must be accessible from n8n instance
- Checkpoint restoration requires workflow logic to handle resumed state
- Large data payloads may need special handling in storage API

## Future Enhancements

- [ ] Batch tracking to reduce HTTP requests
- [ ] Compression for large payloads
- [ ] Built-in storage adapters (S3, Database, etc.)
- [ ] Workflow replay from checkpoints
- [ ] Real-time monitoring dashboard
- [ ] Automatic retry with checkpoint recovery