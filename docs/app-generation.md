# App Generation

McFlow can generate a complete Next.js application within your project to manage workflow data. This creates a dashboard for monitoring items, viewing execution history, and managing workflow states.

## Quick Start

Generate a workflow management app in your project:

```bash
mcflow generate_app --name dashboard
```

This creates a full Next.js app with:
- Dashboard with real-time stats
- Item tracking and pipeline view
- API endpoints for workflow integration
- SQLite database for data persistence
- Webhook receivers for n8n workflows

## Features

### Dashboard
- Real-time item statistics (pending, processing, completed, failed)
- Table view with filtering and search
- Pipeline view showing items in each stage
- Responsive design for mobile and desktop

### API Endpoints
- `/api/webhook/receive` - Receive data from n8n workflows
- `/api/workflow/store` - Store execution data and checkpoints
- `/api/workflow/retrieve` - Retrieve checkpoints and history
- `/api/items` - Get all workflow items

### Database Schema
- `workflow_items` - Main items being processed
- `workflow_executions` - Track each workflow run
- `node_executions` - Store output from each node
- `workflow_checkpoints` - Save/restore workflow state
- `workflow_errors` - Track and analyze errors

## Usage

### 1. Generate the App

```bash
# Basic app with default features
mcflow generate_app --name dashboard

# Custom stages for your workflow
mcflow generate_app --name app --stages "['incoming', 'processing', 'review', 'published']"

# Select specific features
mcflow generate_app --name app --features '{
  "dashboard": true,
  "api": true,
  "database": true,
  "webhooks": true,
  "approvals": true
}'
```

### 2. Install and Run

```bash
cd dashboard
npm install
npm run dev
```

The app will be available at `http://localhost:3000`

### 3. Integrate with Workflows

Use the tracking system to automatically integrate:

```bash
mcflow add_tracking \
  --path "flows/my-workflow.json" \
  --storageUrl "http://localhost:3000"
```

Or manually add HTTP Request nodes to your workflows:

```javascript
// After creating an item
HTTP Request to: http://localhost:3000/api/webhook/receive
Body: {
  "action": "create_item",
  "itemId": "{{$json.id}}",
  "data": "{{$json}}"
}

// Store node output
HTTP Request to: http://localhost:3000/api/workflow/store
Body: {
  "action": "store_node",
  "executionId": "{{$execution.id}}",
  "nodeId": "{{$node.name}}",
  "output": "{{$json}}"
}
```

## Configuration

### Environment Variables

The app uses `.env.local` for configuration:

```env
# N8n Integration
N8N_WEBHOOK_URL=http://localhost:5678/webhook

# App Configuration
APP_URL=http://localhost:3000
WORKFLOW_STORAGE_URL=http://localhost:3000

# Database
DATABASE_PATH=./data/workflow.db

# Workflow Stages
WORKFLOW_STAGES=created,processing,review,completed
```

### Custom Stages

Define your workflow stages when generating:

```bash
mcflow generate_app --name app --stages "['draft', 'submitted', 'approved', 'published']"
```

## Integration Examples

### Example 1: Content Publishing Workflow

```bash
# Generate app with publishing stages
mcflow generate_app \
  --name publishing-dashboard \
  --stages "['draft', 'review', 'approved', 'published']"

# Add tracking to your content workflow
mcflow add_tracking \
  --path "flows/content-workflow.json" \
  --storageUrl "http://localhost:3000"
```

### Example 2: Data Processing Pipeline

```bash
# Generate app for data pipeline
mcflow generate_app \
  --name data-dashboard \
  --stages "['ingested', 'validated', 'processed', 'exported']"

# Add checkpoints for resumable processing
mcflow add_checkpoint \
  --path "flows/data-pipeline.json" \
  --checkpointName "after_validation" \
  --afterNode "Validate Data"
```

### Example 3: Approval Workflow

```bash
# Generate app with approval features
mcflow generate_app \
  --name approval-dashboard \
  --features '{"approvals": true}'

# The app will include approve/reject buttons for items
```

## App Structure

```
dashboard/
├── app/
│   ├── api/
│   │   ├── webhook/receive/    # n8n webhook receiver
│   │   ├── workflow/
│   │   │   ├── store/          # Store execution data
│   │   │   └── retrieve/       # Get checkpoints
│   │   └── items/              # Item management
│   ├── dashboard/              # Main dashboard page
│   ├── items/                  # Item detail pages
│   ├── layout.tsx              # App layout with sidebar
│   └── globals.css             # Global styles
├── components/
│   ├── StatsCard.tsx           # Statistics display
│   ├── ItemsTable.tsx          # Items table view
│   └── PipelineView.tsx        # Pipeline visualization
├── lib/
│   └── db.ts                   # Database operations
├── data/
│   └── workflow.db             # SQLite database
└── package.json                # Dependencies
```

## API Reference

### Create Item

```http
POST /api/webhook/receive
Content-Type: application/json

{
  "action": "create_item",
  "itemId": "item-123",
  "data": {
    "title": "New Item",
    "content": "..."
  }
}
```

### Update Item

```http
POST /api/webhook/receive
Content-Type: application/json

{
  "action": "update_item",
  "itemId": "item-123",
  "data": {
    "status": "processing"
  }
}
```

### Store Execution Data

```http
POST /api/workflow/store
Content-Type: application/json

{
  "action": "start_execution",
  "executionId": "exec-456",
  "workflowId": "workflow-789",
  "itemId": "item-123"
}
```

### Get Checkpoint

```http
GET /api/workflow/retrieve?action=get_checkpoint&itemId=item-123&checkpointName=after_processing
```

## Best Practices

1. **Use Environment Variables**: Keep configuration in `.env.local`
2. **Define Clear Stages**: Use meaningful stage names that match your workflow
3. **Enable Tracking**: Use McFlow's tracking system for automatic integration
4. **Monitor Performance**: The dashboard polls every 5 seconds by default
5. **Secure Production**: Add authentication before deploying to production

## Troubleshooting

### Database Not Found
```bash
# Initialize database manually
mkdir data
touch data/workflow.db
```

### Port Already in Use
```bash
# Use a different port
PORT=3001 npm run dev
```

### Workflow Integration Issues
- Ensure storage URL matches your app URL
- Check that HTTP Request nodes have correct URL
- Verify n8n can reach your Next.js app

## Next Steps

1. Customize the dashboard components for your needs
2. Add authentication and authorization
3. Implement custom actions for your workflow
4. Deploy to production with proper security
5. Set up monitoring and alerts