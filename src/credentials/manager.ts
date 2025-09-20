/**
 * Credential Manager for n8n
 * 
 * SECURITY NOTICE: This module handles credential creation through n8n's API.
 * - Credentials are NEVER logged or stored in plaintext
 * - All credential values must come from environment variables
 * - API keys are only transmitted over secure connections to n8n
 * 
 * NOTE: n8n API authentication is required for credential management.
 * Set N8N_API_KEY environment variable or use n8n's built-in auth.
 */

import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import * as dotenv from 'dotenv';

interface CredentialConfig {
  name: string;
  type: string;
  data: Record<string, any>;
  nodesAccess?: Array<{ nodeType: string; date?: Date }>;
}

interface CredentialTemplate {
  type: string;
  displayName: string;
  envVarMapping: Record<string, string>;
  requiredFields: string[];
  optionalFields?: string[];
}

export class CredentialManager {
  private workflowsPath: string;
  private apiUrl: string = 'http://localhost:5678/api/v1';
  private apiKey: string | undefined;
  
  // Credential templates for common services
  private credentialTemplates: Record<string, CredentialTemplate> = {
    openAiApi: {
      type: 'openAiApi',
      displayName: 'OpenAI API',
      envVarMapping: {
        apiKey: 'OPENAI_API_KEY',
        organizationId: 'OPENAI_ORG_ID'
      },
      requiredFields: ['apiKey'],
      optionalFields: ['organizationId']
    },
    anthropicApi: {
      type: 'anthropicApi', 
      displayName: 'Anthropic API',
      envVarMapping: {
        apiKey: 'ANTHROPIC_API_KEY'
      },
      requiredFields: ['apiKey']
    },
    googleAiApi: {
      type: 'googleAiApi',
      displayName: 'Google AI API',
      envVarMapping: {
        apiKey: 'GOOGLE_AI_API_KEY'
      },
      requiredFields: ['apiKey']
    },
    cohereApi: {
      type: 'cohereApi',
      displayName: 'Cohere API',
      envVarMapping: {
        apiKey: 'COHERE_API_KEY'
      },
      requiredFields: ['apiKey']
    },
    replicateApi: {
      type: 'replicateApi',
      displayName: 'Replicate API',
      envVarMapping: {
        apiToken: 'REPLICATE_API_TOKEN'
      },
      requiredFields: ['apiToken']
    },
    huggingFaceApi: {
      type: 'huggingFaceApi',
      displayName: 'Hugging Face API',
      envVarMapping: {
        apiKey: 'HUGGINGFACE_API_KEY'
      },
      requiredFields: ['apiKey']
    },
    stabilityAiApi: {
      type: 'stabilityAiApi',
      displayName: 'Stability AI API',
      envVarMapping: {
        apiKey: 'STABILITY_API_KEY'
      },
      requiredFields: ['apiKey']
    },
    pineconeApi: {
      type: 'pineconeApi',
      displayName: 'Pinecone API',
      envVarMapping: {
        apiKey: 'PINECONE_API_KEY',
        environment: 'PINECONE_ENVIRONMENT'
      },
      requiredFields: ['apiKey', 'environment']
    },
    slackApi: {
      type: 'slackApi',
      displayName: 'Slack API',
      envVarMapping: {
        accessToken: 'SLACK_ACCESS_TOKEN',
        webhookUrl: 'SLACK_WEBHOOK_URL'
      },
      requiredFields: [] // Can use either token or webhook
    },
    githubApi: {
      type: 'githubApi',
      displayName: 'GitHub API',
      envVarMapping: {
        accessToken: 'GITHUB_TOKEN'
      },
      requiredFields: ['accessToken']
    },
    airtableApi: {
      type: 'airtableApi',
      displayName: 'Airtable API',
      envVarMapping: {
        apiKey: 'AIRTABLE_API_KEY'
      },
      requiredFields: ['apiKey']
    },
    notionApi: {
      type: 'notionApi',
      displayName: 'Notion API',
      envVarMapping: {
        apiKey: 'NOTION_API_KEY'
      },
      requiredFields: ['apiKey']
    }
  };

  constructor(workflowsPath: string) {
    this.workflowsPath = workflowsPath;
    this.apiKey = process.env.N8N_API_KEY;
  }

  /**
   * Load environment variables from .env file
   */
  private async loadEnvVars(): Promise<Record<string, string>> {
    const envVars: Record<string, string> = {};
    
    // Copy process.env, filtering out undefined values
    for (const [key, value] of Object.entries(process.env)) {
      if (value !== undefined) {
        envVars[key] = value;
      }
    }
    
    // Try to load from .env files
    const envPaths = [
      path.join(this.workflowsPath, '.env'),
    ];
    
    for (const envPath of envPaths) {
      try {
        const envContent = await fs.readFile(envPath, 'utf-8');
        const parsed = dotenv.parse(envContent);
        Object.assign(envVars, parsed);
        break; // Use first .env found
      } catch {
        // Continue to next path
      }
    }
    
    return envVars;
  }

  /**
   * Check if credentials can be created from environment
   */
  async checkCreatableCredentials(): Promise<{
    available: string[];
    missing: string[];
    partial: string[];
  }> {
    const envVars = await this.loadEnvVars();
    const available: string[] = [];
    const missing: string[] = [];
    const partial: string[] = [];
    
    for (const [credType, template] of Object.entries(this.credentialTemplates)) {
      const foundVars: string[] = [];
      const missingVars: string[] = [];
      
      for (const [field, envVar] of Object.entries(template.envVarMapping)) {
        if (envVars[envVar]) {
          foundVars.push(field);
        } else if (template.requiredFields.includes(field)) {
          missingVars.push(envVar);
        }
      }
      
      if (missingVars.length === 0 && foundVars.length > 0) {
        available.push(credType);
      } else if (foundVars.length > 0) {
        partial.push(credType);
      } else {
        missing.push(credType);
      }
    }
    
    return { available, missing, partial };
  }

  /**
   * Create credential configuration from environment
   * SECURITY: Never logs actual credential values
   */
  async prepareCredentialConfig(credentialType: string): Promise<CredentialConfig | null> {
    const template = this.credentialTemplates[credentialType];
    if (!template) {
      throw new Error(`Unknown credential type: ${credentialType}`);
    }
    
    const envVars = await this.loadEnvVars();
    const credentialData: Record<string, any> = {};
    
    // Map environment variables to credential fields
    for (const [field, envVar] of Object.entries(template.envVarMapping)) {
      const value = envVars[envVar];
      if (value) {
        credentialData[field] = value;
      } else if (template.requiredFields.includes(field)) {
        return null; // Missing required field
      }
    }
    
    if (Object.keys(credentialData).length === 0) {
      return null; // No credential data available
    }
    
    return {
      name: template.displayName,
      type: credentialType,
      data: credentialData
    };
  }

  /**
   * Generate credential setup instructions
   */
  async generateSetupInstructions(): Promise<string> {
    const { available, missing, partial } = await this.checkCreatableCredentials();
    
    let output = '🔐 Credential Setup Status\n\n';
    
    if (available.length > 0) {
      output += '✅ Ready to Create (environment variables found):\n';
      for (const cred of available) {
        output += `  • ${this.credentialTemplates[cred].displayName}\n`;
      }
      output += '\n';
    }
    
    if (partial.length > 0) {
      output += '⚠️ Partially Configured (missing some required variables):\n';
      for (const cred of partial) {
        const template = this.credentialTemplates[cred];
        output += `  • ${template.displayName}\n`;
        const envVars = await this.loadEnvVars();
        for (const [field, envVar] of Object.entries(template.envVarMapping)) {
          if (template.requiredFields.includes(field) && !envVars[envVar]) {
            output += `    Missing: ${envVar}\n`;
          }
        }
      }
      output += '\n';
    }
    
    output += '📝 To Enable Automatic Credential Creation:\n\n';
    output += '1. Add missing environment variables to your .env file\n';
    output += '2. Set N8N_API_KEY for n8n API access (optional)\n';
    output += '3. Use "McFlow credentials --action create" to create credentials\n\n';
    
    output += '⚠️ Security Notes:\n';
    output += '• Credentials are created in n8n, not stored in workflows\n';
    output += '• API keys are read from environment variables only\n';
    output += '• Never commit .env files to version control\n';
    output += '• Use n8n\'s credential management UI for manual setup\n\n';
    
    output += '🔧 Manual Setup:\n';
    output += 'For security reasons, we recommend manually adding credentials:\n';
    output += '1. Open n8n UI at http://localhost:5678\n';
    output += '2. Go to Credentials (left sidebar)\n';
    output += '3. Click "Add Credential"\n';
    output += '4. Select the credential type and add your API keys\n';
    
    return output;
  }

  /**
   * Attempt to create credentials via n8n API
   * NOTE: This requires n8n API authentication
   */
  async createCredentialViaAPI(credentialType: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      // Check if we have API access
      if (!this.apiKey) {
        return {
          success: false,
          message: 'N8N_API_KEY not set. Manual credential creation required in n8n UI.'
        };
      }
      
      // Prepare credential config
      const config = await this.prepareCredentialConfig(credentialType);
      if (!config) {
        return {
          success: false,
          message: `Missing required environment variables for ${credentialType}`
        };
      }
      
      // Note: Actual API implementation would go here
      // For security, we're not implementing automatic credential creation
      // Users should use n8n's UI for credential management
      
      return {
        success: false,
        message: `For security, please create ${this.credentialTemplates[credentialType].displayName} credentials manually in n8n UI at http://localhost:5678/credentials`
      };
      
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to create credential: ${error.message}`
      };
    }
  }

  /**
   * Generate .env.example with all credential requirements
   */
  async generateEnvExample(): Promise<void> {
    let content = '# n8n Workflow Credentials\n';
    content += '# Copy this file to .env and add your actual API keys\n';
    content += '# NEVER commit .env to version control!\n\n';
    
    // Group by service type
    const aiServices = ['openAiApi', 'anthropicApi', 'googleAiApi', 'cohereApi', 'replicateApi', 'huggingFaceApi', 'stabilityAiApi'];
    const dataServices = ['pineconeApi', 'airtableApi', 'notionApi'];
    const commServices = ['slackApi', 'githubApi'];
    
    content += '# === AI/LLM Services ===\n';
    for (const service of aiServices) {
      const template = this.credentialTemplates[service];
      if (template) {
        content += `# ${template.displayName}\n`;
        for (const [, envVar] of Object.entries(template.envVarMapping)) {
          content += `${envVar}=\n`;
        }
        content += '\n';
      }
    }
    
    content += '# === Data Services ===\n';
    for (const service of dataServices) {
      const template = this.credentialTemplates[service];
      if (template) {
        content += `# ${template.displayName}\n`;
        for (const [, envVar] of Object.entries(template.envVarMapping)) {
          content += `${envVar}=\n`;
        }
        content += '\n';
      }
    }
    
    content += '# === Communication Services ===\n';
    for (const service of commServices) {
      const template = this.credentialTemplates[service];
      if (template) {
        content += `# ${template.displayName}\n`;
        for (const [, envVar] of Object.entries(template.envVarMapping)) {
          content += `${envVar}=\n`;
        }
        content += '\n';
      }
    }
    
    content += '# === n8n Configuration ===\n';
    content += '# Optional: For API access (not recommended for security)\n';
    content += '# N8N_API_KEY=\n';
    
    const envExamplePath = path.join(this.workflowsPath, '.env.example');
    await fs.writeFile(envExamplePath, content, 'utf-8');
  }

  /**
   * Check which credentials exist in n8n (requires API access)
   */
  async listExistingCredentials(): Promise<string[]> {
    try {
      // This would require proper n8n API authentication
      // For now, return empty array and recommend using UI
      return [];
    } catch {
      return [];
    }
  }

  /**
   * Get credential requirements for a workflow
   */
  async getWorkflowCredentialRequirements(workflow: any): Promise<{
    required: Set<string>;
    configured: Set<string>;
    missing: Set<string>;
  }> {
    const required = new Set<string>();
    const configured = new Set<string>();
    const missing = new Set<string>();
    
    if (!workflow.nodes) return { required, configured, missing };
    
    for (const node of workflow.nodes) {
      if (node.credentials) {
        for (const [credType, credConfig] of Object.entries(node.credentials)) {
          required.add(credType);
          
          // Check if credential is configured (has id or name)
          if (credConfig && typeof credConfig === 'object') {
            const cred = credConfig as any;
            if (cred.id || cred.name) {
              configured.add(credType);
            } else {
              missing.add(credType);
            }
          } else {
            missing.add(credType);
          }
        }
      }
    }
    
    return { required, configured, missing };
  }
}