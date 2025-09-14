/**
 * LLM Parameter Validator for n8n Workflows
 * 
 * Validates that AI/LLM node parameters match the specific requirements
 * of each model provider (OpenAI, Anthropic, Google, etc.)
 * 
 * IMPORTANT: Each model has specific parameter requirements that must be followed.
 */

interface LLMParameterIssue {
  parameter: string;
  issue: string;
  fix: string;
}

interface ModelConfig {
  validModels: string[];
  parameters: {
    [key: string]: {
      type: string;
      required?: boolean;
      min?: number;
      max?: number;
      validValues?: any[];
      deprecated?: boolean;
      replacement?: string;
    };
  };
}

export class LLMValidator {
  
  // OpenAI model configurations
  private openAIConfig: { [model: string]: ModelConfig } = {
    'gpt-4': {
      validModels: ['gpt-4', 'gpt-4-32k', 'gpt-4-1106-preview', 'gpt-4-turbo-preview', 'gpt-4-turbo', 'gpt-4o', 'gpt-4o-mini'],
      parameters: {
        temperature: { type: 'number', min: 0, max: 2 },
        max_tokens: { type: 'number', min: 1, max: 128000 },
        top_p: { type: 'number', min: 0, max: 1 },
        frequency_penalty: { type: 'number', min: -2, max: 2 },
        presence_penalty: { type: 'number', min: -2, max: 2 },
        stop: { type: 'array' },
        n: { type: 'number', min: 1, max: 128 },
        stream: { type: 'boolean' },
        logprobs: { type: 'boolean' },
        response_format: { type: 'object', validValues: [{ type: 'text' }, { type: 'json_object' }] }
      }
    },
    'gpt-3.5-turbo': {
      validModels: ['gpt-3.5-turbo', 'gpt-3.5-turbo-16k', 'gpt-3.5-turbo-1106', 'gpt-3.5-turbo-0125'],
      parameters: {
        temperature: { type: 'number', min: 0, max: 2 },
        max_tokens: { type: 'number', min: 1, max: 16384 },
        top_p: { type: 'number', min: 0, max: 1 },
        frequency_penalty: { type: 'number', min: -2, max: 2 },
        presence_penalty: { type: 'number', min: -2, max: 2 },
        stop: { type: 'array' },
        n: { type: 'number', min: 1, max: 128 },
        stream: { type: 'boolean' }
      }
    },
    'text-davinci': {
      validModels: [],
      parameters: {
        model: { type: 'string', deprecated: true, replacement: 'gpt-3.5-turbo or gpt-4' }
      }
    }
  };

  // Anthropic Claude model configurations
  private anthropicConfig: { [model: string]: ModelConfig } = {
    'claude-3': {
      validModels: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307', 'claude-3-5-sonnet-20241022'],
      parameters: {
        max_tokens: { type: 'number', required: true, min: 1, max: 4096 },
        temperature: { type: 'number', min: 0, max: 1 },
        top_p: { type: 'number', min: 0, max: 1 },
        top_k: { type: 'number', min: 0 },
        stop_sequences: { type: 'array' },
        stream: { type: 'boolean' }
      }
    },
    'claude-2': {
      validModels: ['claude-2.1', 'claude-2.0'],
      parameters: {
        max_tokens_to_sample: { type: 'number', required: true, min: 1, max: 100000 },
        temperature: { type: 'number', min: 0, max: 1 },
        top_p: { type: 'number', min: 0, max: 1 },
        top_k: { type: 'number', min: 0 },
        stop_sequences: { type: 'array' }
      }
    }
  };

  // Google model configurations
  private googleConfig: { [model: string]: ModelConfig } = {
    'gemini': {
      validModels: ['gemini-pro', 'gemini-pro-vision', 'gemini-1.5-pro', 'gemini-1.5-flash'],
      parameters: {
        temperature: { type: 'number', min: 0, max: 1 },
        maxOutputTokens: { type: 'number', min: 1, max: 8192 },
        topP: { type: 'number', min: 0, max: 1 },
        topK: { type: 'number', min: 1, max: 40 },
        stopSequences: { type: 'array' },
        candidateCount: { type: 'number', min: 1, max: 1 } // Currently only 1 is supported
      }
    },
    'palm': {
      validModels: [],
      parameters: {
        model: { type: 'string', deprecated: true, replacement: 'gemini-pro' }
      }
    }
  };

  // Cohere model configurations
  private cohereConfig: { [model: string]: ModelConfig } = {
    'command': {
      validModels: ['command', 'command-light', 'command-nightly', 'command-r', 'command-r-plus'],
      parameters: {
        max_tokens: { type: 'number', min: 1, max: 4000 },
        temperature: { type: 'number', min: 0, max: 5 },
        p: { type: 'number', min: 0, max: 1 },
        k: { type: 'number', min: 0, max: 500 },
        frequency_penalty: { type: 'number', min: 0, max: 1 },
        presence_penalty: { type: 'number', min: 0, max: 1 },
        stop_sequences: { type: 'array' }
      }
    }
  };

  // Replicate model configurations
  private replicateConfig: { [model: string]: ModelConfig } = {
    'llama': {
      validModels: ['meta/llama-2-70b-chat', 'meta/llama-2-13b-chat', 'meta/llama-2-7b-chat'],
      parameters: {
        temperature: { type: 'number', min: 0.01, max: 5 },
        max_new_tokens: { type: 'number', min: 1, max: 4096 },
        top_p: { type: 'number', min: 0, max: 1 },
        top_k: { type: 'number', min: 0 },
        repetition_penalty: { type: 'number', min: 0 }
      }
    },
    'mistral': {
      validModels: ['mistralai/mistral-7b-v0.1', 'mistralai/mixtral-8x7b-instruct-v0.1'],
      parameters: {
        temperature: { type: 'number', min: 0.01, max: 5 },
        max_new_tokens: { type: 'number', min: 1, max: 32768 },
        top_p: { type: 'number', min: 0, max: 1 },
        top_k: { type: 'number', min: 0 },
        repetition_penalty: { type: 'number', min: 0 }
      }
    }
  };

  /**
   * Validate OpenAI node parameters
   */
  validateOpenAINode(node: any): LLMParameterIssue[] {
    const issues: LLMParameterIssue[] = [];
    const params = node.parameters || {};
    
    // Check model selection
    const model = params.model || params.modelId || '';
    let modelConfig: ModelConfig | null = null;
    
    // Find matching model config
    if (model.includes('gpt-4')) {
      modelConfig = this.openAIConfig['gpt-4'];
    } else if (model.includes('gpt-3.5')) {
      modelConfig = this.openAIConfig['gpt-3.5-turbo'];
    } else if (model.includes('davinci')) {
      issues.push({
        parameter: 'model',
        issue: 'text-davinci models are deprecated',
        fix: 'Use gpt-3.5-turbo or gpt-4 instead'
      });
      return issues;
    }

    if (!modelConfig && model) {
      issues.push({
        parameter: 'model',
        issue: `Unknown OpenAI model: ${model}`,
        fix: 'Use valid models like gpt-4, gpt-4-turbo, gpt-3.5-turbo'
      });
      return issues;
    }

    // Validate parameters if model config found
    if (modelConfig) {
      // Check temperature
      if (params.temperature !== undefined) {
        const temp = parseFloat(params.temperature);
        if (isNaN(temp) || temp < 0 || temp > 2) {
          issues.push({
            parameter: 'temperature',
            issue: `Invalid temperature: ${params.temperature}. Must be between 0 and 2`,
            fix: 'Set temperature between 0 (deterministic) and 2 (creative)'
          });
        }
      }

      // Check max_tokens
      if (params.maxTokens || params.max_tokens) {
        const maxTokens = parseInt(params.maxTokens || params.max_tokens);
        const limit = model.includes('gpt-4') ? 128000 : 16384;
        if (isNaN(maxTokens) || maxTokens < 1 || maxTokens > limit) {
          issues.push({
            parameter: 'max_tokens',
            issue: `Invalid max_tokens: ${maxTokens}. Must be between 1 and ${limit}`,
            fix: `Set max_tokens between 1 and ${limit} for ${model}`
          });
        }
      }

      // Check top_p
      if (params.topP !== undefined || params.top_p !== undefined) {
        const topP = parseFloat(params.topP || params.top_p);
        if (isNaN(topP) || topP < 0 || topP > 1) {
          issues.push({
            parameter: 'top_p',
            issue: `Invalid top_p: ${params.topP || params.top_p}. Must be between 0 and 1`,
            fix: 'Set top_p between 0 and 1 (usually 0.9 for good results)'
          });
        }
      }

      // Check frequency_penalty
      if (params.frequencyPenalty !== undefined || params.frequency_penalty !== undefined) {
        const penalty = parseFloat(params.frequencyPenalty || params.frequency_penalty);
        if (isNaN(penalty) || penalty < -2 || penalty > 2) {
          issues.push({
            parameter: 'frequency_penalty',
            issue: `Invalid frequency_penalty: ${penalty}. Must be between -2 and 2`,
            fix: 'Set frequency_penalty between -2 and 2 (0 is neutral)'
          });
        }
      }

      // Check for invalid parameters
      const validParams = new Set(Object.keys(modelConfig.parameters));
      const commonMistakes: { [key: string]: string } = {
        'max_length': 'max_tokens',
        'num_beams': 'n',
        'do_sample': 'temperature > 0',
        'repetition_penalty': 'frequency_penalty',
        'length_penalty': 'max_tokens'
      };

      for (const [param, value] of Object.entries(params)) {
        const paramLower = param.toLowerCase();
        if (commonMistakes[paramLower]) {
          issues.push({
            parameter: param,
            issue: `Invalid parameter '${param}' for OpenAI`,
            fix: `Use '${commonMistakes[paramLower]}' instead`
          });
        }
      }
    }

    return issues;
  }

  /**
   * Validate Anthropic Claude node parameters
   */
  validateAnthropicNode(node: any): LLMParameterIssue[] {
    const issues: LLMParameterIssue[] = [];
    const params = node.parameters || {};
    
    // Check model selection
    const model = params.model || params.modelId || '';
    let modelConfig: ModelConfig | null = null;
    
    if (model.includes('claude-3')) {
      modelConfig = this.anthropicConfig['claude-3'];
    } else if (model.includes('claude-2')) {
      modelConfig = this.anthropicConfig['claude-2'];
    }

    if (!modelConfig && model) {
      issues.push({
        parameter: 'model',
        issue: `Unknown Anthropic model: ${model}`,
        fix: 'Use valid models like claude-3-opus-20240229, claude-3-sonnet-20240229'
      });
      return issues;
    }

    if (modelConfig) {
      // Check max_tokens (required for Claude)
      if (!params.maxTokens && !params.max_tokens && !params.max_tokens_to_sample) {
        issues.push({
          parameter: 'max_tokens',
          issue: 'max_tokens is required for Claude models',
          fix: 'Add max_tokens parameter (e.g., 1024)'
        });
      } else {
        const maxTokens = parseInt(params.maxTokens || params.max_tokens || params.max_tokens_to_sample);
        const limit = model.includes('claude-2') ? 100000 : 4096;
        if (isNaN(maxTokens) || maxTokens < 1 || maxTokens > limit) {
          issues.push({
            parameter: 'max_tokens',
            issue: `Invalid max_tokens: ${maxTokens}. Must be between 1 and ${limit}`,
            fix: `Set max_tokens between 1 and ${limit} for ${model}`
          });
        }
      }

      // Check temperature
      if (params.temperature !== undefined) {
        const temp = parseFloat(params.temperature);
        if (isNaN(temp) || temp < 0 || temp > 1) {
          issues.push({
            parameter: 'temperature',
            issue: `Invalid temperature: ${params.temperature}. Must be between 0 and 1`,
            fix: 'Set temperature between 0 (deterministic) and 1 (creative)'
          });
        }
      }

      // Check for OpenAI-specific parameters used with Claude
      const invalidParams = ['frequency_penalty', 'presence_penalty', 'logprobs', 'best_of'];
      for (const param of invalidParams) {
        if (params[param] !== undefined) {
          issues.push({
            parameter: param,
            issue: `Parameter '${param}' is not valid for Claude`,
            fix: `Remove '${param}' - it's OpenAI-specific`
          });
        }
      }
    }

    return issues;
  }

  /**
   * Validate Google AI node parameters
   */
  validateGoogleNode(node: any): LLMParameterIssue[] {
    const issues: LLMParameterIssue[] = [];
    const params = node.parameters || {};
    
    // Check for deprecated PaLM models
    if (params.model && params.model.includes('palm')) {
      issues.push({
        parameter: 'model',
        issue: 'PaLM models are deprecated',
        fix: 'Use Gemini models instead (gemini-pro, gemini-1.5-pro)'
      });
      return issues;
    }

    // Check maxOutputTokens vs max_tokens
    if (params.max_tokens !== undefined && params.maxOutputTokens === undefined) {
      issues.push({
        parameter: 'max_tokens',
        issue: 'Google uses maxOutputTokens, not max_tokens',
        fix: 'Rename max_tokens to maxOutputTokens'
      });
    }

    // Check candidateCount
    if (params.candidateCount !== undefined && params.candidateCount !== 1) {
      issues.push({
        parameter: 'candidateCount',
        issue: 'candidateCount must be 1 (currently only 1 is supported)',
        fix: 'Set candidateCount to 1 or remove it'
      });
    }

    // Check temperature
    if (params.temperature !== undefined) {
      const temp = parseFloat(params.temperature);
      if (isNaN(temp) || temp < 0 || temp > 1) {
        issues.push({
          parameter: 'temperature',
          issue: `Invalid temperature: ${params.temperature}. Must be between 0 and 1`,
          fix: 'Set temperature between 0 and 1'
        });
      }
    }

    return issues;
  }

  /**
   * Main validation method for LLM nodes
   */
  validateLLMNode(node: any): LLMParameterIssue[] {
    const nodeType = node.type?.toLowerCase() || '';
    
    // Determine which validator to use based on node type
    if (nodeType.includes('openai')) {
      return this.validateOpenAINode(node);
    } else if (nodeType.includes('anthropic') || nodeType.includes('claude')) {
      return this.validateAnthropicNode(node);
    } else if (nodeType.includes('google') || nodeType.includes('gemini') || nodeType.includes('palm')) {
      return this.validateGoogleNode(node);
    } else if (nodeType.includes('cohere')) {
      return this.validateCohereNode(node);
    } else if (nodeType.includes('replicate')) {
      return this.validateReplicateNode(node);
    }
    
    return [];
  }

  /**
   * Validate Cohere node parameters
   */
  private validateCohereNode(node: any): LLMParameterIssue[] {
    const issues: LLMParameterIssue[] = [];
    const params = node.parameters || {};
    
    // Check temperature (Cohere allows up to 5)
    if (params.temperature !== undefined) {
      const temp = parseFloat(params.temperature);
      if (isNaN(temp) || temp < 0 || temp > 5) {
        issues.push({
          parameter: 'temperature',
          issue: `Invalid temperature: ${params.temperature}. Must be between 0 and 5 for Cohere`,
          fix: 'Set temperature between 0 and 5 (Cohere allows higher values)'
        });
      }
    }

    // Check for 'top_p' vs 'p'
    if (params.top_p !== undefined && params.p === undefined) {
      issues.push({
        parameter: 'top_p',
        issue: 'Cohere uses parameter name "p" not "top_p"',
        fix: 'Rename top_p to p'
      });
    }

    return issues;
  }

  /**
   * Validate Replicate node parameters
   */
  private validateReplicateNode(node: any): LLMParameterIssue[] {
    const issues: LLMParameterIssue[] = [];
    const params = node.parameters || {};
    
    // Check for max_tokens vs max_new_tokens
    if (params.max_tokens !== undefined && params.max_new_tokens === undefined) {
      issues.push({
        parameter: 'max_tokens',
        issue: 'Replicate models use "max_new_tokens" not "max_tokens"',
        fix: 'Rename max_tokens to max_new_tokens'
      });
    }

    // Check temperature minimum (Replicate requires > 0)
    if (params.temperature !== undefined) {
      const temp = parseFloat(params.temperature);
      if (temp === 0) {
        issues.push({
          parameter: 'temperature',
          issue: 'Replicate models require temperature > 0 (minimum 0.01)',
          fix: 'Set temperature to at least 0.01'
        });
      }
    }

    return issues;
  }

  /**
   * Auto-fix common LLM parameter issues
   */
  autoFixLLMParameters(node: any): boolean {
    let fixed = false;
    const nodeType = node.type?.toLowerCase() || '';
    
    if (!node.parameters) {
      node.parameters = {};
    }

    // Fix OpenAI parameters
    if (nodeType.includes('openai')) {
      // Fix deprecated model names
      if (node.parameters.model?.includes('davinci')) {
        node.parameters.model = 'gpt-3.5-turbo';
        fixed = true;
      }
      
      // Fix parameter names
      if (node.parameters.maxTokens && !node.parameters.max_tokens) {
        node.parameters.max_tokens = node.parameters.maxTokens;
        delete node.parameters.maxTokens;
        fixed = true;
      }
    }

    // Fix Anthropic parameters
    if (nodeType.includes('anthropic') || nodeType.includes('claude')) {
      // Add required max_tokens if missing
      if (!node.parameters.max_tokens && !node.parameters.maxTokens) {
        node.parameters.max_tokens = 1024;
        fixed = true;
      }
      
      // Remove OpenAI-specific parameters
      const invalidParams = ['frequency_penalty', 'presence_penalty', 'logprobs'];
      for (const param of invalidParams) {
        if (node.parameters[param] !== undefined) {
          delete node.parameters[param];
          fixed = true;
        }
      }
    }

    // Fix Google parameters
    if (nodeType.includes('google') || nodeType.includes('gemini')) {
      // Fix max_tokens to maxOutputTokens
      if (node.parameters.max_tokens && !node.parameters.maxOutputTokens) {
        node.parameters.maxOutputTokens = node.parameters.max_tokens;
        delete node.parameters.max_tokens;
        fixed = true;
      }
      
      // Fix candidateCount
      if (node.parameters.candidateCount && node.parameters.candidateCount !== 1) {
        node.parameters.candidateCount = 1;
        fixed = true;
      }
    }

    // Fix Cohere parameters
    if (nodeType.includes('cohere')) {
      // Fix top_p to p
      if (node.parameters.top_p && !node.parameters.p) {
        node.parameters.p = node.parameters.top_p;
        delete node.parameters.top_p;
        fixed = true;
      }
    }

    // Fix Replicate parameters
    if (nodeType.includes('replicate')) {
      // Fix max_tokens to max_new_tokens
      if (node.parameters.max_tokens && !node.parameters.max_new_tokens) {
        node.parameters.max_new_tokens = node.parameters.max_tokens;
        delete node.parameters.max_tokens;
        fixed = true;
      }
      
      // Fix temperature = 0
      if (node.parameters.temperature === 0) {
        node.parameters.temperature = 0.01;
        fixed = true;
      }
    }

    return fixed;
  }
}