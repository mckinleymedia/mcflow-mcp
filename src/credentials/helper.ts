/**
 * Credential Helper for n8n
 * 
 * IMPORTANT SECURITY NOTES:
 * - This helper NEVER logs or exposes credential values
 * - It only checks for credential existence
 * - It provides guidance for manual credential setup
 * - Actual credentials should be managed through n8n's UI for security
 */

import fs from 'fs/promises';
import path from 'path';
import * as dotenv from 'dotenv';

interface CredentialRequirement {
  envVar: string;
  n8nType: string;
  displayName: string;
  instructions: string;
}

export class CredentialHelper {
  private workflowsPath: string;
  
  constructor(workflowsPath: string) {
    this.workflowsPath = workflowsPath;
  }


  /**
   * Analyze workflows to determine required credentials
   */
  async analyzeCredentialRequirements(): Promise<any> {
    try {
      const flowsDir = path.join(this.workflowsPath, 'workflows', 'flows');
      const files = await fs.readdir(flowsDir);
      
      const requirements = new Map<string, CredentialRequirement>();
      const workflowCredentials = new Map<string, string[]>();
      
      // Analyze each workflow
      for (const file of files) {
        if (!file.endsWith('.json') || file.includes('package.json')) continue;
        
        const content = await fs.readFile(path.join(flowsDir, file), 'utf-8');
        const workflow = JSON.parse(content);
        const workflowName = file.replace('.json', '');
        const credTypes: string[] = [];
        
        if (workflow.nodes) {
          for (const node of workflow.nodes) {
            // Check for credential requirements
            if (node.credentials) {
              Object.keys(node.credentials).forEach(credType => {
                credTypes.push(credType);
                
                // Map credential types to environment variables
                switch (credType) {
                  case 'openAiApi':
                    requirements.set('OPENAI_API_KEY', {
                      envVar: 'OPENAI_API_KEY',
                      n8nType: 'OpenAI API',
                      displayName: 'OpenAI API Key',
                      instructions: '1. Go to https://platform.openai.com/api-keys\n2. Create a new API key\n3. Add to .env: OPENAI_API_KEY=sk-...',
                    });
                    break;
                  case 'replicateApi':
                    requirements.set('REPLICATE_API_TOKEN', {
                      envVar: 'REPLICATE_API_TOKEN',
                      n8nType: 'Replicate API',
                      displayName: 'Replicate API Token',
                      instructions: '1. Go to https://replicate.com/account/api-tokens\n2. Create a new token\n3. Add to .env: REPLICATE_API_TOKEN=...',
                    });
                    break;
                  case 'airtableApi':
                    requirements.set('AIRTABLE_API_KEY', {
                      envVar: 'AIRTABLE_API_KEY',
                      n8nType: 'Airtable API',
                      displayName: 'Airtable API Key or Personal Access Token',
                      instructions: '1. Go to https://airtable.com/create/tokens\n2. Create a personal access token\n3. Add to .env: AIRTABLE_API_KEY=pat...',
                    });
                    break;
                  case 'slackApi':
                    requirements.set('SLACK_WEBHOOK_URL', {
                      envVar: 'SLACK_WEBHOOK_URL',
                      n8nType: 'Slack Webhook',
                      displayName: 'Slack Webhook URL',
                      instructions: '1. Go to https://api.slack.com/apps\n2. Create an app and add Incoming Webhook\n3. Add to .env: SLACK_WEBHOOK_URL=https://hooks.slack.com/...',
                    });
                    break;
                  case 'githubApi':
                    requirements.set('GITHUB_TOKEN', {
                      envVar: 'GITHUB_TOKEN',
                      n8nType: 'GitHub API',
                      displayName: 'GitHub Personal Access Token',
                      instructions: '1. Go to https://github.com/settings/tokens\n2. Generate new token (classic)\n3. Add to .env: GITHUB_TOKEN=ghp_...',
                    });
                    break;
                }
              });
            }
          }
        }
        
        if (credTypes.length > 0) {
          workflowCredentials.set(workflowName, credTypes);
        }
      }
      
      // Check which credentials exist in .env
      const envVars = await this.checkEnvFile();
      
      // Format output
      let output = '🔐 Credential Requirements Analysis\n\n';
      
      if (requirements.size === 0) {
        output += '✅ No credentials required for these workflows.\n';
      } else {
        output += `📋 Required Credentials (${requirements.size}):\n\n`;
        
        for (const [envVar, req] of requirements) {
          const hasEnv = envVars.has(envVar);
          const status = hasEnv ? '✅' : '❌';
          
          output += `${status} ${req.displayName}\n`;
          output += `   Environment Variable: ${envVar}\n`;
          output += `   n8n Credential Type: ${req.n8nType}\n`;
          
          if (!hasEnv) {
            output += `   ⚠️ Not found in .env\n`;
          }
          output += '\n';
        }
        
        // Show which workflows need which credentials
        output += '📊 Workflows and Their Credential Requirements:\n\n';
        for (const [workflow, creds] of workflowCredentials) {
          output += `• ${workflow}: ${creds.join(', ')}\n`;
        }
        
        // Instructions for missing credentials
        const missing = Array.from(requirements.entries()).filter(([env]) => !envVars.has(env));
        if (missing.length > 0) {
          output += '\n⚠️ Missing Credentials Setup Instructions:\n\n';
          for (const [, req] of missing) {
            output += `### ${req.displayName}\n${req.instructions}\n\n`;
          }
          
          output += '🔒 Security Best Practices:\n';
          output += '1. Never commit .env files to git\n';
          output += '2. Use strong, unique API keys\n';
          output += '3. Rotate keys regularly\n';
          output += '4. Limit API key permissions to minimum required\n';
          output += '5. Add credentials through n8n UI at http://localhost:5678\n';
        }
      }
      
      return {
        content: [
          {
            type: 'text',
            text: output,
          },
        ],
      };
    } catch (error: any) {
      throw new Error(`Failed to analyze credentials: ${error.message}`);
    }
  }

  /**
   * Check which environment variables exist (NOT their values)
   */
  private async checkEnvFile(): Promise<Set<string>> {
    const envVars = new Set<string>();
    
    const envPaths = [
      path.join(this.workflowsPath, 'workflows', '.env'),
      path.join(this.workflowsPath, '.env'),
    ];
    
    for (const envPath of envPaths) {
      try {
        const envContent = await fs.readFile(envPath, 'utf-8');
        const parsed = dotenv.parse(envContent);
        
        // Only store variable names, NEVER values
        Object.keys(parsed).forEach(key => {
          if (parsed[key] && parsed[key].length > 0) {
            envVars.add(key);
          }
        });
        
        break; // Use first .env found
      } catch {
        // Try next path
      }
    }
    
    return envVars;
  }

  /**
   * Generate secure .env.example without exposing any real values
   */
  async generateSecureEnvExample(): Promise<any> {
    try {
      const requirements = await this.getRequirementsFromWorkflows();
      
      let content = '# n8n Workflow Credentials\n';
      content += '# SECURITY: Never commit this file with real values to git!\n';
      content += '# Copy to .env and add your actual API keys\n\n';
      
      content += '# === Required API Credentials ===\n';
      content += '# Get these from the respective service providers\n\n';
      
      for (const req of requirements) {
        content += `# ${req.displayName}\n`;
        content += `# ${req.instructions.split('\n')[0]}\n`; // First line of instructions
        content += `${req.envVar}=\n\n`;
      }
      
      content += '# === Security Reminders ===\n';
      content += '# 1. Add .env to .gitignore\n';
      content += '# 2. Never share or log these values\n';
      content += '# 3. Rotate keys regularly\n';
      content += '# 4. Use environment-specific keys (dev/prod)\n';
      
      const envExamplePath = path.join(this.workflowsPath, 'workflows', '.env.example');
      await fs.writeFile(envExamplePath, content, 'utf-8');
      
      return {
        content: [
          {
            type: 'text',
            text: '✅ Generated secure .env.example\n\n' +
                  '📁 Location: workflows/.env.example\n\n' +
                  'Next steps:\n' +
                  '1. Copy .env.example to .env\n' +
                  '2. Add your API keys to .env\n' +
                  '3. Never commit .env to git\n' +
                  '4. Add credentials in n8n UI at http://localhost:5678',
          },
        ],
      };
    } catch (error: any) {
      throw new Error(`Failed to generate .env.example: ${error.message}`);
    }
  }

  /**
   * Get credential requirements from workflows
   */
  private async getRequirementsFromWorkflows(): Promise<CredentialRequirement[]> {
    // This would analyze workflows and return requirements
    // For now, return common ones
    return [
      {
        envVar: 'OPENAI_API_KEY',
        n8nType: 'OpenAI API',
        displayName: 'OpenAI API Key',
        instructions: 'Get from https://platform.openai.com/api-keys',
      },
      // Add more as needed based on workflow analysis
    ];
  }

  /**
   * Provide instructions for setting up credentials securely
   */
  async getCredentialSetupInstructions(): Promise<any> {
    return {
      content: [
        {
          type: 'text',
          text: `🔐 Secure Credential Setup for n8n

1️⃣ **Prepare Your Credentials**
   • Copy workflows/.env.example to workflows/.env
   • Add your API keys to the .env file
   • Never commit .env to version control

2️⃣ **Add Credentials in n8n UI**
   • Open http://localhost:5678
   • Go to Credentials (left sidebar)
   • Click "Add Credential"
   • Select the credential type
   • Enter your API key/token
   • Save the credential

3️⃣ **Link Credentials to Workflows**
   • Open each workflow
   • Click on nodes that need credentials
   • Select the credential from dropdown
   • Save the workflow

4️⃣ **Security Best Practices**
   ✅ Use environment-specific credentials (dev/staging/prod)
   ✅ Rotate API keys regularly
   ✅ Use minimal required permissions
   ✅ Enable 2FA where available
   ✅ Monitor API usage for anomalies
   ❌ Never log or print credentials
   ❌ Never commit credentials to git
   ❌ Never share credentials in messages

5️⃣ **Troubleshooting**
   • If a workflow fails with "Credentials not found":
     - Check the credential exists in n8n
     - Verify the credential name matches
     - Ensure the credential has correct permissions
   
   • If API calls fail:
     - Test credentials directly with the service
     - Check rate limits
     - Verify API endpoint URLs

For detailed setup per service:
• OpenAI: https://platform.openai.com/docs/api-reference/authentication
• GitHub: https://docs.github.com/en/authentication
• Slack: https://api.slack.com/authentication
• Airtable: https://airtable.com/developers/web/api/authentication`,
        },
      ],
    };
  }
}