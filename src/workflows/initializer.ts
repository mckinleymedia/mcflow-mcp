import fs from 'fs/promises';
import path from 'path';

export class WorkflowInitializer {
  private workflowsPath: string;
  private initialized: boolean = false;
  private workflowsOuterPath: string;

  constructor(workflowsPath: string) {
    this.workflowsPath = workflowsPath;
    this.workflowsOuterPath = workflowsPath;  // Already the workflows folder
  }

  /**
   * Initialize the workflows folder structure if it doesn't exist
   * Creates: 
   *   workflows/           (outer folder)
   *     ├── README.md
   *     ├── .env.example
   *     ├── .env            (user creates this)
   *     └── flows/          (inner folder for JSON files)
   */
  async initialize(): Promise<boolean> {
    if (this.initialized) return true;

    try {
      // The workflows folder (already provided)
      const outerWorkflowsDir = this.workflowsPath;
      
      // The inner flows folder where JSON files go
      const flowsDir = path.join(outerWorkflowsDir, 'flows');
      
      // Check if already initialized
      const readmePath = path.join(outerWorkflowsDir, 'README.md');
      try {
        await fs.access(readmePath);
        this.initialized = true;
        return false; // Already initialized
      } catch {
        // Not initialized, continue
      }
      
      // Create the outer workflows folder
      await fs.mkdir(outerWorkflowsDir, { recursive: true });
      console.error(`Created workflows directory at: ${outerWorkflowsDir}`);
      
      // Create the inner flows folder for JSON files
      await fs.mkdir(flowsDir, { recursive: true });
      console.error(`Created flows subfolder for JSON files at: ${flowsDir}`);

      // Update workflowsPath for file creation to be the outer folder
      this.workflowsPath = outerWorkflowsDir;
      
      // Create README.md in outer folder
      await this.createReadme();
      
      // Create .env.example in outer folder
      await this.createEnvExample();
      
      // Create .gitignore in outer folder
      await this.createGitignore();

      this.initialized = true;
      console.error(`✅ Initialized workflows structure at: ${outerWorkflowsDir}`);
      return true;
    } catch (error) {
      console.error(`Failed to initialize workflows structure: ${error}`);
      return false;
    }
  }

  /**
   * Creates the README.md file with McFlow instructions
   */
  private async createReadme(): Promise<void> {
    const readmePath = path.join(this.workflowsPath, 'README.md');
    
    const content = `# Workflows

This folder contains n8n workflow definitions managed by McFlow.

## Structure

\`\`\`
workflows/
├── README.md           # This file
├── .env.example        # Environment variables template
├── .gitignore          # Git ignore rules
└── flows/              # Workflow JSON files
    ├── sync-data.json
    ├── send-email.json
    └── process-order.json
\`\`\`

## Getting Started

### Environment Setup

1. Copy \`.env.example\` to \`.env\`:
   \`\`\`bash
   cp .env.example .env
   \`\`\`

2. Fill in your environment variables in \`.env\`

### Managing Workflows

Workflows in this directory are managed by McFlow MCP server. Use the following commands:

- **List workflows**: Shows all workflows in this project
- **Create workflow**: Adds a new workflow with auto-generated name
- **Read workflow**: View a specific workflow's configuration
- **Update workflow**: Modify an existing workflow
- **Analyze workflow**: Get insights about workflow structure
- **Validate workflow**: Check workflow for issues

### Workflow Naming Convention

McFlow automatically generates succinct, unique names for workflows:
- Removes redundant words (like "workflow")
- Converts to kebab-case
- Ensures uniqueness with number suffixes if needed
- Maximum 30 characters

### Environment Variables

The following environment variables are used by workflows:

- \`N8N_WEBHOOK_URL\`: Base URL for webhook triggers
- \`API_KEY\`: API key for external services
- \`NOTIFICATION_EMAIL\`: Email for notifications
- See \`.env.example\` for complete list

### Deployment

To deploy these workflows to n8n:

1. **Local n8n**:
   \`\`\`bash
   n8n import:workflow --input=flows/[workflow-name].json
   \`\`\`

2. **n8n Cloud**:
   Use the n8n UI to import workflow JSON files from the \`flows/\` directory

3. **Via API**:
   \`\`\`bash
   curl -X POST [N8N_URL]/api/v1/workflows \\
     -H "X-N8N-API-KEY: [YOUR_API_KEY]" \\
     -H "Content-Type: application/json" \\
     -d @flows/[workflow-name].json
   \`\`\`

### Testing

Before deploying workflows:
1. Test with sample data
2. Verify all credentials are configured
3. Check error handling paths
4. Monitor execution in n8n

### Documentation

Workflow documentation is automatically maintained in:
- \`../docs/workflows.md\` - List of all workflows
- \`../docs/workflow-instructions.md\` - Custom instructions

---

*Managed by McFlow MCP Server*
`;

    await fs.writeFile(readmePath, content, 'utf-8');
  }

  /**
   * Creates the .env.example file
   */
  private async createEnvExample(): Promise<void> {
    const envPath = path.join(this.workflowsPath, '.env.example');
    
    const content = `# n8n Workflow Environment Variables
# Copy this file to .env and fill in your values

# === n8n Configuration ===
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook
N8N_API_URL=https://your-n8n-instance.com/api/v1
N8N_API_KEY=your-api-key-here

# === External Services ===
# Add API keys and endpoints for services your workflows use
API_BASE_URL=https://api.example.com
API_KEY=your-api-key
API_SECRET=your-api-secret

# === Database Configuration ===
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
REDIS_URL=redis://localhost:6379

# === Notifications ===
NOTIFICATION_EMAIL=alerts@example.com
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/XXX/YYY/ZZZ
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/XXX/YYY

# === AWS Services ===
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1
S3_BUCKET_NAME=

# === Other Integrations ===
OPENAI_API_KEY=
GITHUB_TOKEN=
STRIPE_API_KEY=

# === Feature Flags ===
ENABLE_DEBUG=false
DRY_RUN=false
MAX_RETRIES=3
TIMEOUT_SECONDS=30

# === Project Specific ===
# Add your project-specific environment variables below
`;

    await fs.writeFile(envPath, content, 'utf-8');
  }

  /**
   * Creates the .gitignore file
   */
  private async createGitignore(): Promise<void> {
    const gitignorePath = path.join(this.workflowsPath, '.gitignore');
    
    const content = `# Environment files
.env
.env.local
.env.*.local

# Temporary files
*.tmp
*.temp
*.log

# Backup files
*.backup
*.bak
*~

# OS files
.DS_Store
Thumbs.db

# Editor files
.vscode/
.idea/
*.swp
*.swo

# Node modules (if any local scripts)
node_modules/

# Sensitive data
credentials.json
secrets.json
*.key
*.pem

# Test data
test-data/
*.test.json

# Build outputs
dist/
build/
`;

    await fs.writeFile(gitignorePath, content, 'utf-8');
  }

  /**
   * Check if workflows folder needs initialization
   */
  async needsInitialization(): Promise<boolean> {
    try {
      const workflowsDir = this.workflowsPath;
      const readmePath = path.join(this.workflowsPath, 'README.md');
      
      // Check if workflows dir exists
      try {
        await fs.access(workflowsDir);
      } catch {
        return true; // Needs init if workflows folder doesn't exist
      }
      
      // Check if README exists
      try {
        await fs.access(readmePath);
        return false; // Already initialized
      } catch {
        return true; // Needs init if README doesn't exist
      }
    } catch {
      return true;
    }
  }

  /**
   * Extract credentials/environment variables from a workflow
   */
  extractCredentialsFromWorkflow(workflow: any): Set<string> {
    const credentials = new Set<string>();
    
    if (!workflow.nodes || !Array.isArray(workflow.nodes)) {
      return credentials;
    }

    // Look for credential references in nodes
    for (const node of workflow.nodes) {
      // Check for credential fields
      if (node.credentials) {
        Object.keys(node.credentials).forEach(credType => {
          // Convert credential type to env var format
          const envVar = this.credentialToEnvVar(credType);
          credentials.add(envVar);
        });
      }

      // Check for webhook paths
      if (node.type?.includes('webhook')) {
        credentials.add('N8N_WEBHOOK_URL');
      }

      // Check for common API integrations
      if (node.type?.includes('http') || node.type?.includes('api')) {
        credentials.add('API_BASE_URL');
        credentials.add('API_KEY');
      }

      // Service-specific credentials
      const serviceMap: Record<string, string[]> = {
        'slack': ['SLACK_WEBHOOK_URL', 'SLACK_TOKEN'],
        'discord': ['DISCORD_WEBHOOK_URL', 'DISCORD_TOKEN'],
        'github': ['GITHUB_TOKEN'],
        'openai': ['OPENAI_API_KEY'],
        'aws': ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'],
        'stripe': ['STRIPE_API_KEY'],
        'sendgrid': ['SENDGRID_API_KEY'],
        'twilio': ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN'],
        'postgres': ['DATABASE_URL'],
        'mysql': ['DATABASE_URL'],
        'redis': ['REDIS_URL'],
      };

      const nodeType = node.type?.toLowerCase() || '';
      for (const [service, vars] of Object.entries(serviceMap)) {
        if (nodeType.includes(service)) {
          vars.forEach(v => credentials.add(v));
        }
      }
    }

    return credentials;
  }

  /**
   * Convert credential type to environment variable name
   */
  private credentialToEnvVar(credType: string): string {
    return credType
      .replace(/([a-z])([A-Z])/g, '$1_$2')
      .toUpperCase()
      .replace(/[^A-Z0-9_]/g, '_');
  }

  /**
   * Update .env.example with new credentials
   */
  async updateEnvExample(newCredentials: Set<string>): Promise<void> {
    const envPath = path.join(this.workflowsOuterPath, '.env.example');
    
    try {
      // Read existing .env.example
      let content = await fs.readFile(envPath, 'utf-8');
      
      // Parse existing variables
      const existingVars = new Set<string>();
      const lines = content.split('\n');
      for (const line of lines) {
        if (line.includes('=') && !line.startsWith('#')) {
          const varName = line.split('=')[0].trim();
          existingVars.add(varName);
        }
      }

      // Find new variables to add
      const toAdd = [...newCredentials].filter(v => !existingVars.has(v));
      
      if (toAdd.length > 0) {
        // Add new section for detected credentials
        let newSection = '\n# === Auto-detected Credentials ===\n';
        newSection += '# These credentials were detected from your workflows\n';
        
        for (const varName of toAdd) {
          newSection += `${varName}=\n`;
        }

        // Append before the project specific section or at the end
        const projectIndex = content.indexOf('# === Project Specific ===');
        if (projectIndex !== -1) {
          content = content.substring(0, projectIndex) + newSection + '\n' + content.substring(projectIndex);
        } else {
          content += newSection;
        }

        await fs.writeFile(envPath, content, 'utf-8');
        console.error(`Updated .env.example with ${toAdd.length} new credential(s)`);
      }
    } catch (error) {
      console.error('Failed to update .env.example:', error);
    }
  }

  /**
   * Update README with workflow information
   */
  async updateReadmeWorkflowList(workflows: Array<{name: string, description?: string}>): Promise<void> {
    const readmePath = path.join(this.workflowsOuterPath, 'README.md');
    
    try {
      let content = await fs.readFile(readmePath, 'utf-8');
      
      // Create workflows section
      let workflowSection = '## Current Workflows\n\n';
      
      if (workflows.length === 0) {
        workflowSection += 'No workflows yet. Create your first workflow using McFlow.\n';
      } else {
        workflowSection += '| Workflow | Description | File |\n';
        workflowSection += '|----------|-------------|------|\n';
        
        for (const workflow of workflows) {
          const desc = workflow.description || 'No description';
          workflowSection += `| ${workflow.name} | ${desc} | \`flows/${workflow.name}.json\` |\n`;
        }
      }

      // Find and replace the workflows section
      const startMarker = '## Current Workflows';
      const endMarker = '## Getting Started';
      
      const startIndex = content.indexOf(startMarker);
      const endIndex = content.indexOf(endMarker);
      
      if (startIndex !== -1 && endIndex !== -1) {
        content = content.substring(0, startIndex) + 
                 workflowSection + '\n' +
                 content.substring(endIndex);
      } else if (startIndex === -1) {
        // Add section after structure
        const structureEnd = content.indexOf('## Getting Started');
        if (structureEnd !== -1) {
          content = content.substring(0, structureEnd) + 
                   workflowSection + '\n' +
                   content.substring(structureEnd);
        }
      }

      await fs.writeFile(readmePath, content, 'utf-8');
    } catch (error) {
      console.error('Failed to update README:', error);
    }
  }
}