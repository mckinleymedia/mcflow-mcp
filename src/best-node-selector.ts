/**
 * Best Node Selector for n8n Workflows
 * 
 * Ensures workflows use the most appropriate specialized nodes
 * instead of generic HTTP requests for known services.
 * 
 * IMPORTANT: Always use dedicated nodes when available for better
 * reliability, authentication handling, and error management.
 */

interface NodeRecommendation {
  currentType: string;
  recommendedType: string;
  reason: string;
  migrationGuide: {
    newType: string;
    parameterMapping: Record<string, string>;
    additionalSetup?: string;
  };
}

export class BestNodeSelector {
  
  // Map of API endpoints to their dedicated n8n nodes
  private serviceNodeMap: Record<string, NodeRecommendation> = {
    // OpenAI
    'api.openai.com': {
      currentType: 'n8n-nodes-base.httpRequest',
      recommendedType: '@n8n/n8n-nodes-langchain.openAi',
      reason: 'Use dedicated OpenAI node for better error handling, retry logic, and parameter validation',
      migrationGuide: {
        newType: '@n8n/n8n-nodes-langchain.openAi',
        parameterMapping: {
          'url': 'remove',
          'method': 'remove',
          'headers.Authorization': 'credentials.openAiApi',
          'body.model': 'model',
          'body.messages': 'messages',
          'body.temperature': 'options.temperature',
          'body.max_tokens': 'options.maxTokens'
        },
        additionalSetup: 'Add OpenAI API credentials in n8n UI'
      }
    },
    
    // Anthropic/Claude
    'api.anthropic.com': {
      currentType: 'n8n-nodes-base.httpRequest',
      recommendedType: '@n8n/n8n-nodes-langchain.anthropic',
      reason: 'Use dedicated Anthropic node for proper message formatting and Claude-specific features',
      migrationGuide: {
        newType: '@n8n/n8n-nodes-langchain.anthropic',
        parameterMapping: {
          'url': 'remove',
          'method': 'remove',
          'headers.x-api-key': 'credentials.anthropicApi',
          'headers.anthropic-version': 'remove',
          'body.model': 'model',
          'body.messages': 'messages',
          'body.max_tokens': 'maxTokens'
        },
        additionalSetup: 'Add Anthropic API credentials in n8n UI'
      }
    },
    
    // Google AI (Gemini/PaLM)
    'generativelanguage.googleapis.com': {
      currentType: 'n8n-nodes-base.httpRequest',
      recommendedType: '@n8n/n8n-nodes-langchain.googleAi',
      reason: 'Use dedicated Google AI node for proper authentication and model management',
      migrationGuide: {
        newType: '@n8n/n8n-nodes-langchain.googleAi',
        parameterMapping: {
          'url': 'remove',
          'queryParameters.key': 'credentials.googleAiApi',
          'body.prompt': 'prompt',
          'body.temperature': 'options.temperature',
          'body.maxOutputTokens': 'options.maxOutputTokens'
        },
        additionalSetup: 'Add Google AI API key in n8n UI'
      }
    },
    
    // Cohere
    'api.cohere.ai': {
      currentType: 'n8n-nodes-base.httpRequest',
      recommendedType: 'n8n-nodes-base.cohere',
      reason: 'Use dedicated Cohere node for better model selection and parameter handling',
      migrationGuide: {
        newType: 'n8n-nodes-base.cohere',
        parameterMapping: {
          'headers.Authorization': 'credentials.cohereApi',
          'body.prompt': 'prompt',
          'body.model': 'model',
          'body.max_tokens': 'maxTokens',
          'body.temperature': 'temperature'
        }
      }
    },
    
    // Replicate
    'api.replicate.com': {
      currentType: 'n8n-nodes-base.httpRequest',
      recommendedType: 'n8n-nodes-base.replicate',
      reason: 'Use dedicated Replicate node for async prediction handling and webhook support',
      migrationGuide: {
        newType: 'n8n-nodes-base.replicate',
        parameterMapping: {
          'headers.Authorization': 'credentials.replicateApi',
          'body.version': 'model',
          'body.input': 'input'
        },
        additionalSetup: 'Configure Replicate API token'
      }
    },
    
    // Hugging Face
    'api-inference.huggingface.co': {
      currentType: 'n8n-nodes-base.httpRequest',
      recommendedType: 'n8n-nodes-base.huggingFace',
      reason: 'Use dedicated Hugging Face node for model inference with proper error handling',
      migrationGuide: {
        newType: 'n8n-nodes-base.huggingFace',
        parameterMapping: {
          'headers.Authorization': 'credentials.huggingFaceApi',
          'url': 'model',
          'body.inputs': 'inputs',
          'body.parameters': 'parameters'
        }
      }
    },
    
    // Stability AI
    'api.stability.ai': {
      currentType: 'n8n-nodes-base.httpRequest',
      recommendedType: '@n8n/n8n-nodes-langchain.stabilityAi',
      reason: 'Use dedicated Stability AI node for image generation with proper parameter validation',
      migrationGuide: {
        newType: '@n8n/n8n-nodes-langchain.stabilityAi',
        parameterMapping: {
          'headers.Authorization': 'credentials.stabilityAiApi',
          'body.text_prompts': 'prompts',
          'body.cfg_scale': 'options.cfgScale',
          'body.samples': 'options.samples'
        }
      }
    },
    
    // Pinecone
    'api.pinecone.io': {
      currentType: 'n8n-nodes-base.httpRequest',
      recommendedType: '@n8n/n8n-nodes-langchain.pinecone',
      reason: 'Use dedicated Pinecone node for vector operations with proper index management',
      migrationGuide: {
        newType: '@n8n/n8n-nodes-langchain.pinecone',
        parameterMapping: {
          'headers.Api-Key': 'credentials.pineconeApi',
          'body.vectors': 'vectors',
          'body.namespace': 'namespace'
        }
      }
    },
    
    // Slack
    'slack.com/api': {
      currentType: 'n8n-nodes-base.httpRequest',
      recommendedType: 'n8n-nodes-base.slack',
      reason: 'Use dedicated Slack node for OAuth handling and rich message formatting',
      migrationGuide: {
        newType: 'n8n-nodes-base.slack',
        parameterMapping: {
          'headers.Authorization': 'credentials.slackApi',
          'body.channel': 'channel',
          'body.text': 'text',
          'body.blocks': 'blocks'
        }
      }
    },
    
    // GitHub
    'api.github.com': {
      currentType: 'n8n-nodes-base.httpRequest',
      recommendedType: 'n8n-nodes-base.github',
      reason: 'Use dedicated GitHub node for proper authentication and resource management',
      migrationGuide: {
        newType: 'n8n-nodes-base.github',
        parameterMapping: {
          'headers.Authorization': 'credentials.githubApi',
          'url': 'resource',
          'body': 'additionalFields'
        }
      }
    },
    
    // Airtable
    'api.airtable.com': {
      currentType: 'n8n-nodes-base.httpRequest',
      recommendedType: 'n8n-nodes-base.airtable',
      reason: 'Use dedicated Airtable node for schema awareness and batch operations',
      migrationGuide: {
        newType: 'n8n-nodes-base.airtable',
        parameterMapping: {
          'headers.Authorization': 'credentials.airtableApi',
          'url': 'base',
          'body.records': 'records'
        }
      }
    },
    
    // Notion
    'api.notion.com': {
      currentType: 'n8n-nodes-base.httpRequest',
      recommendedType: 'n8n-nodes-base.notion',
      reason: 'Use dedicated Notion node for database and page operations',
      migrationGuide: {
        newType: 'n8n-nodes-base.notion',
        parameterMapping: {
          'headers.Authorization': 'credentials.notionApi',
          'headers.Notion-Version': 'remove',
          'body': 'properties'
        }
      }
    },
    
    // Discord
    'discord.com/api': {
      currentType: 'n8n-nodes-base.httpRequest',
      recommendedType: 'n8n-nodes-base.discord',
      reason: 'Use dedicated Discord node for webhook and bot operations',
      migrationGuide: {
        newType: 'n8n-nodes-base.discord',
        parameterMapping: {
          'url': 'webhookUrl',
          'body.content': 'content',
          'body.embeds': 'embeds'
        }
      }
    },
    
    // Telegram
    'api.telegram.org': {
      currentType: 'n8n-nodes-base.httpRequest',
      recommendedType: 'n8n-nodes-base.telegram',
      reason: 'Use dedicated Telegram node for bot operations and media handling',
      migrationGuide: {
        newType: 'n8n-nodes-base.telegram',
        parameterMapping: {
          'url': 'remove',
          'body.chat_id': 'chatId',
          'body.text': 'text'
        }
      }
    },
    
    // Twilio
    'api.twilio.com': {
      currentType: 'n8n-nodes-base.httpRequest',
      recommendedType: 'n8n-nodes-base.twilio',
      reason: 'Use dedicated Twilio node for SMS and voice operations',
      migrationGuide: {
        newType: 'n8n-nodes-base.twilio',
        parameterMapping: {
          'auth': 'credentials.twilioApi',
          'body.To': 'to',
          'body.From': 'from',
          'body.Body': 'message'
        }
      }
    },
    
    // SendGrid
    'api.sendgrid.com': {
      currentType: 'n8n-nodes-base.httpRequest',
      recommendedType: 'n8n-nodes-base.sendGrid',
      reason: 'Use dedicated SendGrid node for email operations with templates',
      migrationGuide: {
        newType: 'n8n-nodes-base.sendGrid',
        parameterMapping: {
          'headers.Authorization': 'credentials.sendGridApi',
          'body.personalizations': 'personalizations',
          'body.from': 'from',
          'body.subject': 'subject',
          'body.content': 'content'
        }
      }
    }
  };

  /**
   * Check if a node should use a dedicated service node instead of HTTP
   */
  checkNode(node: any): NodeRecommendation | null {
    if (node.type !== 'n8n-nodes-base.httpRequest') {
      return null;
    }

    const url = node.parameters?.url || '';
    
    // Check each known service
    for (const [domain, recommendation] of Object.entries(this.serviceNodeMap)) {
      if (url.includes(domain)) {
        return recommendation;
      }
    }

    // Check for additional patterns in the URL or headers
    const authHeader = node.parameters?.headers?.Authorization || '';
    
    // OpenAI pattern
    if (authHeader.includes('Bearer sk-') || url.includes('openai')) {
      return this.serviceNodeMap['api.openai.com'];
    }
    
    // Anthropic pattern
    if (node.parameters?.headers?.['x-api-key'] || url.includes('anthropic')) {
      return this.serviceNodeMap['api.anthropic.com'];
    }
    
    // Check for webhook URLs
    if (url.includes('hooks.slack.com')) {
      return {
        currentType: 'n8n-nodes-base.httpRequest',
        recommendedType: 'n8n-nodes-base.slack',
        reason: 'Use Slack node for incoming webhooks',
        migrationGuide: {
          newType: 'n8n-nodes-base.slack',
          parameterMapping: {
            'url': 'webhookUrl',
            'body': 'text'
          }
        }
      };
    }

    return null;
  }

  /**
   * Convert HTTP node to dedicated service node
   */
  convertToServiceNode(node: any, recommendation: NodeRecommendation): any {
    const newNode = {
      ...node,
      type: recommendation.migrationGuide.newType,
      typeVersion: 1,
      parameters: {}
    };

    // Map parameters according to migration guide
    for (const [oldPath, newPath] of Object.entries(recommendation.migrationGuide.parameterMapping)) {
      if (newPath === 'remove') continue;
      
      const oldValue = this.getNestedValue(node.parameters, oldPath);
      if (oldValue !== undefined) {
        this.setNestedValue(newNode.parameters, newPath, oldValue);
      }
    }

    // Add credentials placeholder if needed
    if (recommendation.migrationGuide.additionalSetup) {
      if (!newNode.credentials) {
        newNode.credentials = {};
      }
    }

    return newNode;
  }

  /**
   * Get nested object value by path
   */
  private getNestedValue(obj: any, path: string): any {
    const parts = path.split('.');
    let current = obj;
    
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return undefined;
      }
    }
    
    return current;
  }

  /**
   * Set nested object value by path
   */
  private setNestedValue(obj: any, path: string, value: any): void {
    const parts = path.split('.');
    const last = parts.pop()!;
    let current = obj;
    
    for (const part of parts) {
      if (!(part in current)) {
        current[part] = {};
      }
      current = current[part];
    }
    
    current[last] = value;
  }

  /**
   * Get recommendation summary for all HTTP nodes in workflow
   */
  analyzeWorkflow(workflow: any): {
    recommendations: Array<{
      nodeName: string;
      currentType: string;
      recommendedType: string;
      reason: string;
    }>;
    score: number;
  } {
    const recommendations: any[] = [];
    let httpNodesCount = 0;
    let dedicatedNodesCount = 0;

    if (!workflow.nodes) return { recommendations, score: 100 };

    for (const node of workflow.nodes) {
      if (node.type === 'n8n-nodes-base.httpRequest') {
        httpNodesCount++;
        const recommendation = this.checkNode(node);
        
        if (recommendation) {
          recommendations.push({
            nodeName: node.name,
            currentType: node.type,
            recommendedType: recommendation.recommendedType,
            reason: recommendation.reason
          });
        }
      } else if (node.type?.includes('@n8n/') || node.type?.includes('n8n-nodes-base.')) {
        // Count dedicated service nodes
        if (!['set', 'code', 'if', 'switch', 'merge', 'loop', 'split'].some(t => node.type.includes(t))) {
          dedicatedNodesCount++;
        }
      }
    }

    // Calculate score (100 = all using dedicated nodes, 0 = all using HTTP for known services)
    const totalServiceNodes = dedicatedNodesCount + recommendations.length;
    const score = totalServiceNodes > 0 
      ? Math.round((dedicatedNodesCount / totalServiceNodes) * 100)
      : 100;

    return { recommendations, score };
  }

  /**
   * Auto-convert HTTP nodes to dedicated service nodes
   */
  autoConvertWorkflow(workflow: any): {
    converted: boolean;
    changes: string[];
  } {
    const changes: string[] = [];
    let converted = false;

    if (!workflow.nodes) return { converted, changes };

    for (let i = 0; i < workflow.nodes.length; i++) {
      const node = workflow.nodes[i];
      
      if (node.type === 'n8n-nodes-base.httpRequest') {
        const recommendation = this.checkNode(node);
        
        if (recommendation) {
          const newNode = this.convertToServiceNode(node, recommendation);
          workflow.nodes[i] = newNode;
          changes.push(`Converted ${node.name} from HTTP Request to ${recommendation.recommendedType}`);
          converted = true;
        }
      }
    }

    return { converted, changes };
  }
}