# LLM/AI Model Parameter Validation

## Overview

McFlow MCP Server now validates LLM/AI model parameters to ensure they match the exact requirements of each model provider. This prevents runtime errors and ensures optimal model performance.

## ⚠️ CRITICAL: Model-Specific Parameters

Each AI provider has DIFFERENT parameter names and requirements. Using the wrong parameters will cause your workflow to fail.

## Validated Providers

### 🟢 OpenAI (GPT-4, GPT-3.5)

**Valid Models:**
- `gpt-4`, `gpt-4-turbo`, `gpt-4o`, `gpt-4o-mini`
- `gpt-3.5-turbo`, `gpt-3.5-turbo-16k`

**Correct Parameters:**
```json
{
  "model": "gpt-4",
  "temperature": 0.7,        // 0-2
  "max_tokens": 1024,        // 1-128000 for GPT-4
  "top_p": 0.9,             // 0-1
  "frequency_penalty": 0,    // -2 to 2
  "presence_penalty": 0,     // -2 to 2
  "stop": ["\\n\\n"],        // Array of stop sequences
  "n": 1                     // Number of completions
}
```

**Common Mistakes:**
- ❌ Using `max_length` instead of `max_tokens`
- ❌ Using `repetition_penalty` (that's for other models)
- ❌ Using deprecated models like `text-davinci-003`

### 🔵 Anthropic (Claude)

**Valid Models:**
- `claude-3-opus-20240229`
- `claude-3-sonnet-20240229`
- `claude-3-5-sonnet-20241022`
- `claude-3-haiku-20240307`

**Correct Parameters:**
```json
{
  "model": "claude-3-opus-20240229",
  "max_tokens": 1024,        // REQUIRED! 1-4096
  "temperature": 0.7,        // 0-1 (not 0-2 like OpenAI!)
  "top_p": 0.9,             // 0-1
  "top_k": 40,              // Claude-specific
  "stop_sequences": ["\\n"]  // Note: stop_sequences, not stop
}
```

**Common Mistakes:**
- ❌ Forgetting `max_tokens` (REQUIRED for Claude!)
- ❌ Using `frequency_penalty` or `presence_penalty` (OpenAI-only)
- ❌ Temperature > 1 (Claude max is 1, not 2)

### 🔴 Google AI (Gemini)

**Valid Models:**
- `gemini-pro`
- `gemini-1.5-pro`
- `gemini-1.5-flash`

**Correct Parameters:**
```json
{
  "model": "gemini-pro",
  "maxOutputTokens": 2048,   // NOT max_tokens!
  "temperature": 0.7,        // 0-1
  "topP": 0.9,              // camelCase!
  "topK": 40,               // camelCase!
  "candidateCount": 1        // Must be 1 currently
}
```

**Common Mistakes:**
- ❌ Using `max_tokens` instead of `maxOutputTokens`
- ❌ Using snake_case instead of camelCase
- ❌ Setting `candidateCount` > 1

### 🟡 Cohere

**Correct Parameters:**
```json
{
  "model": "command-r",
  "max_tokens": 1024,
  "temperature": 0.7,        // 0-5 (higher than others!)
  "p": 0.9,                 // NOT top_p!
  "k": 40,                  // NOT top_k!
  "frequency_penalty": 0,
  "presence_penalty": 0
}
```

**Common Mistakes:**
- ❌ Using `top_p` instead of `p`
- ❌ Using `top_k` instead of `k`

### 🟣 Replicate (Llama, Mistral, etc.)

**Correct Parameters:**
```json
{
  "model": "meta/llama-2-70b-chat",
  "max_new_tokens": 1024,    // NOT max_tokens!
  "temperature": 0.7,        // Must be > 0 (min 0.01)
  "top_p": 0.9,
  "repetition_penalty": 1.1  // Replicate uses this
}
```

**Common Mistakes:**
- ❌ Using `max_tokens` instead of `max_new_tokens`
- ❌ Setting temperature to 0 (min is 0.01)

## Validation Examples

### ❌ Invalid OpenAI Configuration
```json
{
  "type": "n8n-nodes-base.openAi",
  "parameters": {
    "model": "text-davinci-003",  // Deprecated!
    "max_length": 1024,           // Wrong parameter name
    "repetition_penalty": 1.1     // Not an OpenAI parameter
  }
}
```

**Validation Errors:**
- `model: text-davinci models are deprecated → Use gpt-3.5-turbo or gpt-4`
- `max_length: Invalid parameter → Use 'max_tokens' instead`
- `repetition_penalty: Invalid for OpenAI → Use 'frequency_penalty' instead`

### ✅ Fixed OpenAI Configuration
```json
{
  "type": "n8n-nodes-base.openAi",
  "parameters": {
    "model": "gpt-4",
    "max_tokens": 1024,
    "frequency_penalty": 0.1
  }
}
```

## Auto-Fix Capabilities

McFlow can automatically fix common LLM parameter issues:

1. **Parameter Name Corrections:**
   - OpenAI: `maxTokens` → `max_tokens`
   - Google: `max_tokens` → `maxOutputTokens`
   - Cohere: `top_p` → `p`
   - Replicate: `max_tokens` → `max_new_tokens`

2. **Model Updates:**
   - `text-davinci-*` → `gpt-3.5-turbo`
   - `palm-*` → `gemini-pro`

3. **Required Parameters:**
   - Adds `max_tokens` for Claude if missing
   - Sets `candidateCount: 1` for Google

4. **Invalid Values:**
   - Replicate `temperature: 0` → `0.01`
   - Removes OpenAI-specific params from Claude

## Validation Commands

```bash
# Validate all workflows for LLM parameter issues
McFlow validate

# Auto-fix LLM parameter issues
McFlow validate --fix

# Validate specific workflow
McFlow validate --workflow my-ai-workflow
```

## Best Practices

1. **Always specify the model explicitly** - Don't rely on defaults
2. **Check parameter limits** - Each model has different ranges
3. **Use correct parameter names** - They vary by provider
4. **Include required parameters** - Some are mandatory (e.g., Claude's max_tokens)
5. **Test with small values first** - Start with lower token limits
6. **Check the provider's docs** - APIs change frequently

## Common Cross-Provider Differences

| Parameter | OpenAI | Claude | Google | Cohere | Replicate |
|-----------|--------|--------|--------|--------|-----------|
| Max Tokens | `max_tokens` | `max_tokens` ✅ | `maxOutputTokens` | `max_tokens` | `max_new_tokens` |
| Temperature Range | 0-2 | 0-1 | 0-1 | 0-5 | 0.01-5 |
| Top P | `top_p` | `top_p` | `topP` | `p` | `top_p` |
| Top K | ❌ | `top_k` | `topK` | `k` | `top_k` |
| Stop | `stop` | `stop_sequences` | `stopSequences` | `stop_sequences` | `stop` |
| Required | None | `max_tokens` | None | None | None |

## Error Messages

When validation fails, you'll see specific error messages:

```
❌ LLM Parameter Error - temperature: Invalid temperature: 3. Must be between 0 and 1
→ Fix: Set temperature between 0 and 1

❌ LLM Parameter Error - max_tokens: Claude models require max_tokens parameter
→ Fix: Add max_tokens parameter (e.g., 1024)

❌ LLM Parameter Error - model: text-davinci models are deprecated
→ Fix: Use gpt-3.5-turbo or gpt-4 instead
```

## Getting Help

- **OpenAI Docs**: https://platform.openai.com/docs/api-reference
- **Anthropic Docs**: https://docs.anthropic.com/claude/reference
- **Google AI Docs**: https://ai.google.dev/api/rest
- **Cohere Docs**: https://docs.cohere.com/reference
- **Replicate Docs**: https://replicate.com/docs

Remember: Each provider's API is different. What works for OpenAI might not work for Claude!