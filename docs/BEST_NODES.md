# Best Node Selection Guide

## Use Dedicated Nodes, Not HTTP Requests!

McFlow enforces best practices by recommending and auto-converting generic HTTP Request nodes to dedicated service nodes whenever possible.

## ❌ STOP Using HTTP Requests for Known Services!

### Why You Should NEVER Use HTTP Request for AI Services:

1. **No Built-in Error Handling** - Dedicated nodes handle rate limits, retries, and errors
2. **Manual Authentication** - You have to manage headers and API keys manually
3. **No Parameter Validation** - Easy to use wrong parameter names or invalid values
4. **Poor Integration** - Missing features like streaming, webhooks, and batch processing
5. **Harder to Maintain** - Changes to API require manual updates

## ✅ Always Use Dedicated Nodes

### AI/LLM Services

| ❌ WRONG | ✅ RIGHT | Why |
|----------|----------|-----|
| HTTP Request to api.openai.com | `@n8n/n8n-nodes-langchain.openAi` | Built-in retry logic, streaming support, proper error handling |
| HTTP Request to api.anthropic.com | `@n8n/n8n-nodes-langchain.anthropic` | Automatic message formatting, Claude-specific features |
| HTTP Request to generativelanguage.googleapis.com | `@n8n/n8n-nodes-langchain.googleAi` | Proper authentication, model management |
| HTTP Request to api.cohere.ai | `n8n-nodes-base.cohere` | Model selection, parameter validation |
| HTTP Request to api.replicate.com | `n8n-nodes-base.replicate` | Async prediction handling, webhook support |
| HTTP Request to api-inference.huggingface.co | `n8n-nodes-base.huggingFace` | Model inference with proper error handling |
| HTTP Request to api.stability.ai | `@n8n/n8n-nodes-langchain.stabilityAi` | Image generation with parameter validation |

### Data & Vector Services

| ❌ WRONG | ✅ RIGHT | Why |
|----------|----------|-----|
| HTTP Request to api.pinecone.io | `@n8n/n8n-nodes-langchain.pinecone` | Vector operations, index management |
| HTTP Request to api.airtable.com | `n8n-nodes-base.airtable` | Schema awareness, batch operations |
| HTTP Request to api.notion.com | `n8n-nodes-base.notion` | Database and page operations |

### Communication Services

| ❌ WRONG | ✅ RIGHT | Why |
|----------|----------|-----|
| HTTP Request to slack.com/api | `n8n-nodes-base.slack` | OAuth handling, rich message formatting |
| HTTP Request to api.github.com | `n8n-nodes-base.github` | Proper authentication, resource management |
| HTTP Request to discord.com/api | `n8n-nodes-base.discord` | Webhook and bot operations |
| HTTP Request to api.telegram.org | `n8n-nodes-base.telegram` | Bot operations, media handling |
| HTTP Request to api.twilio.com | `n8n-nodes-base.twilio` | SMS and voice operations |
| HTTP Request to api.sendgrid.com | `n8n-nodes-base.sendGrid` | Email operations with templates |

## 🔄 Auto-Conversion

McFlow will automatically convert HTTP Request nodes to dedicated nodes when you run:

```bash
McFlow validate --fix
```

### Example Conversion:

**Before (HTTP Request):**
```json
{
  "type": "n8n-nodes-base.httpRequest",
  "parameters": {
    "method": "POST",
    "url": "https://api.openai.com/v1/chat/completions",
    "headers": {
      "Authorization": "Bearer sk-..."
    },
    "body": {
      "model": "gpt-4",
      "messages": [...]
    }
  }
}
```

**After (Dedicated OpenAI Node):**
```json
{
  "type": "@n8n/n8n-nodes-langchain.openAi",
  "parameters": {
    "model": "gpt-4",
    "messages": [...],
    "options": {
      "temperature": 0.7
    }
  },
  "credentials": {
    "openAiApi": {
      "id": "1"
    }
  }
}
```

## 🎯 Best Practices Score

Your workflows receive a Best Practices Score based on:
- **100%** - All external services use dedicated nodes
- **80-99%** - Most services use dedicated nodes
- **60-79%** - Mix of HTTP and dedicated nodes
- **<60%** - Too many HTTP requests for known services

## 🔑 Credential Management

### Automatic Setup from Environment

If you have API keys in your `.env` file, McFlow can help configure them:

```env
# .env file
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GITHUB_TOKEN=ghp_...
```

**Note:** For security, credentials must be added manually through n8n's UI:
1. Open http://localhost:5678
2. Go to Credentials
3. Add your API keys
4. Link them to your workflows

## 📋 When HTTP Request is Acceptable

Use HTTP Request ONLY for:
- Custom internal APIs
- Services without dedicated nodes
- Testing/debugging endpoints
- One-off API calls to uncommon services

## 🚀 Benefits of Dedicated Nodes

1. **Automatic Retries** - Handle rate limits and transient errors
2. **Proper Authentication** - Credential management built-in
3. **Parameter Validation** - Catch errors before execution
4. **Better Performance** - Optimized for each service
5. **Feature Support** - Streaming, webhooks, batch operations
6. **Easier Updates** - Node updates handle API changes

## ⚠️ Validation Warnings

When you use HTTP Request for a known service, you'll see:

```
⚠️ Should use dedicated @n8n/n8n-nodes-langchain.openAi node instead of HTTP Request
→ Fix: Use dedicated OpenAI node for better error handling, retry logic, and parameter validation
```

## 🛠️ Migration Guide

To migrate existing workflows:

1. **Run validation:**
   ```bash
   McFlow validate
   ```

2. **Review recommendations:**
   - See which nodes should be converted
   - Check your Best Practices Score

3. **Auto-fix issues:**
   ```bash
   McFlow validate --fix
   ```

4. **Add credentials:**
   - Open n8n UI
   - Configure API credentials
   - Link to converted nodes

5. **Test workflows:**
   - Run workflows to ensure proper conversion
   - Check that all features work as expected

## 📚 Finding the Right Node

Not sure which node to use? Check:

1. **n8n Node Library**: https://docs.n8n.io/integrations/
2. **In n8n UI**: Click "+" to browse available nodes
3. **McFlow Validation**: Run `McFlow validate` for recommendations

Remember: **If a dedicated node exists, use it!** Your workflows will be more reliable, maintainable, and performant.