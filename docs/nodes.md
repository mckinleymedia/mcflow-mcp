# Real n8n Nodes Reference

## ⚠️ CRITICAL: Only Use Real n8n Nodes

McFlow enforces a strict policy: **ALL nodes MUST be real, executable n8n nodes**. No mock, placeholder, or dummy nodes are allowed.

## Common Node Types

### Core Processing
- `n8n-nodes-base.code` - Execute JavaScript/Python code
- `n8n-nodes-base.set` - Set or transform data
- `n8n-nodes-base.httpRequest` - Make HTTP API calls
- `n8n-nodes-base.if` - Conditional branching
- `n8n-nodes-base.switch` - Multi-path routing
- `n8n-nodes-base.mergeV3` - Merge data from multiple sources
- `n8n-nodes-base.splitInBatches` - Process data in batches
- `n8n-nodes-base.itemLists` - Transform lists and arrays
- `n8n-nodes-base.aggregate` - Aggregate data operations

### Triggers
- `n8n-nodes-base.webhook` - Receive webhook calls
- `n8n-nodes-base.schedule` - Schedule workflows
- `n8n-nodes-base.manualTrigger` - Manual workflow trigger
- `n8n-nodes-base.emailTrigger` - Email trigger (IMAP)
- `n8n-nodes-base.rssFeedRead` - RSS feed trigger

### Databases
- `n8n-nodes-base.postgres` - PostgreSQL
- `n8n-nodes-base.mysql` - MySQL/MariaDB
- `n8n-nodes-base.mongodb` - MongoDB
- `n8n-nodes-base.redis` - Redis cache
- `n8n-nodes-base.supabase` - Supabase
- `n8n-nodes-base.questDb` - QuestDB

### Communication
- `n8n-nodes-base.slack` - Slack messaging
- `n8n-nodes-base.discord` - Discord
- `n8n-nodes-base.telegram` - Telegram
- `n8n-nodes-base.emailSend` - Send emails (SMTP)
- `n8n-nodes-base.twilio` - SMS via Twilio

### Cloud Services
- `n8n-nodes-base.googleSheets` - Google Sheets
- `n8n-nodes-base.googleDrive` - Google Drive
- `n8n-nodes-base.aws` - AWS services
- `n8n-nodes-base.s3` - S3 storage
- `n8n-nodes-base.github` - GitHub
- `n8n-nodes-base.gitlab` - GitLab

### AI/ML
- `n8n-nodes-base.openAi` - OpenAI API
- `@n8n/n8n-nodes-langchain.openAi` - LangChain OpenAI
- `@n8n/n8n-nodes-langchain.agent` - AI Agent
- `@n8n/n8n-nodes-langchain.memoryVectorStore` - Vector memory
- `n8n-nodes-base.huggingFace` - Hugging Face

### Data Storage
- `n8n-nodes-base.airtable` - Airtable
- `n8n-nodes-base.notion` - Notion
- `n8n-nodes-base.googleBigQuery` - BigQuery
- `n8n-nodes-base.baserow` - Baserow

## Node Validation

The validator checks:
1. Node type exists in n8n
2. Required parameters are present
3. Proper `typeVersion` is set
4. Connections are valid
5. No mock/placeholder nodes

## Example: Converting Mock to Real

❌ **Wrong** (Mock Node):
```json
{
  "type": "mockAPICall",
  "name": "Get Data"
}
```

✅ **Correct** (Real Node):
```json
{
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 4.2,
  "name": "Get Data",
  "parameters": {
    "method": "GET",
    "url": "https://api.example.com/data",
    "options": {}
  }
}
```

## Best Practices

1. **Use HTTP Request for APIs** - Don't create mock API nodes
2. **Use Code Node for Logic** - JavaScript or Python, not placeholders
3. **Use Set Node for Test Data** - Don't use dummy data nodes
4. **Include typeVersion** - Always specify the node version
5. **Validate Before Deploy** - Use `mcflow validate` to check

## Finding Node Types

- **n8n Docs**: https://docs.n8n.io/integrations/
- **Node Browser**: In n8n UI, search available nodes
- **Existing Workflows**: Reference working examples

Remember: Every node must be executable in n8n!