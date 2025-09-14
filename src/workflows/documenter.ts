import fs from 'fs/promises';
import path from 'path';

export interface WorkflowDoc {
  name: string;
  description?: string;
  path: string;
  project?: string;
  createdAt?: string;
  updatedAt?: string;
  triggers?: string[];
  integrations?: string[];
  customInstructions?: string;
}

export class WorkflowDocumenter {
  private workflowsPath: string;
  private docsPath: string;
  private hasDocsFolder: boolean = false;

  constructor(workflowsPath: string) {
    this.workflowsPath = workflowsPath;
    // Docs folder should be at the root of the current working directory
    this.docsPath = path.join(process.cwd(), 'docs');
    this.checkDocsFolder();
  }

  private async checkDocsFolder(): Promise<void> {
    try {
      const stats = await fs.stat(this.docsPath);
      this.hasDocsFolder = stats.isDirectory();
    } catch {
      this.hasDocsFolder = false;
    }
  }

  /**
   * Updates or creates the workflows.md documentation file
   */
  async updateWorkflowDocumentation(
    workflowName: string,
    workflow: any,
    action: 'create' | 'update' = 'create',
    customInstructions?: string
  ): Promise<void> {
    // Only proceed if docs folder exists
    await this.checkDocsFolder();
    if (!this.hasDocsFolder) {
      console.error('No docs folder found. Skipping documentation update.');
      return;
    }

    const docPath = path.join(this.docsPath, 'workflows.md');
    
    // Read existing documentation or create new
    let content = await this.readOrCreateDocFile(docPath);
    
    // Parse workflow details
    const workflowDoc = this.parseWorkflowDetails(workflowName, workflow);
    
    // Update the documentation
    content = this.updateDocContent(content, workflowDoc, action, customInstructions);
    
    // Write the updated documentation
    await fs.writeFile(docPath, content, 'utf-8');
    console.error(`Updated workflow documentation: ${docPath}`);
  }

  /**
   * Reads existing doc file or creates initial content
   */
  private async readOrCreateDocFile(docPath: string): Promise<string> {
    try {
      return await fs.readFile(docPath, 'utf-8');
    } catch {
      // File doesn't exist, create initial content
      return this.getInitialDocContent();
    }
  }

  /**
   * Creates the initial documentation template
   */
  private getInitialDocContent(): string {
    return `# Workflow Documentation

This document provides an overview of all n8n workflows in this repository.

## Table of Contents

- [Workflows](#workflows)
- [Custom Instructions](#custom-instructions)
- [Workflow Guidelines](#workflow-guidelines)

## Workflows

<!-- Workflows will be automatically added here -->

## Custom Instructions

### Creating Workflows

When creating new workflows in this repository, please follow these guidelines:

1. **Naming Convention**: Use descriptive names with kebab-case (e.g., \`customer-data-sync\`)
2. **Error Handling**: Always include error handling nodes for critical workflows
3. **Documentation**: Each workflow should have a clear description of its purpose
4. **Testing**: Test workflows in development before deploying to production
5. **Secrets Management**: Never hardcode credentials - use n8n credentials system

### Project-Specific Instructions

<!-- Add your project-specific instructions here -->

## Workflow Guidelines

### Best Practices

- **Modularity**: Break complex workflows into smaller, reusable sub-workflows
- **Monitoring**: Add logging and notification nodes for important events
- **Performance**: Optimize for efficiency, especially for high-volume workflows
- **Version Control**: Commit workflow changes with descriptive messages
- **Documentation**: Update this file when adding or modifying workflows

### Workflow Categories

Workflows in this project are organized by purpose:

- **Data Sync**: Workflows that synchronize data between systems
- **Automation**: Task automation workflows
- **Monitoring**: System monitoring and alerting workflows
- **Integration**: Third-party service integrations
- **Utility**: Helper and utility workflows

---

*This documentation is automatically maintained by McFlow MCP Server*
`;
  }

  /**
   * Parses workflow details for documentation
   */
  private parseWorkflowDetails(name: string, workflow: any): WorkflowDoc {
    const doc: WorkflowDoc = {
      name: name,
      description: workflow.description || workflow.name || 'No description provided',
      path: `workflows/${name}.json`,
      createdAt: new Date().toISOString(),
    };

    // Extract triggers
    if (workflow.nodes && Array.isArray(workflow.nodes)) {
      doc.triggers = workflow.nodes
        .filter((node: any) => 
          node.type?.toLowerCase().includes('trigger') || 
          node.type?.toLowerCase().includes('webhook') ||
          node.type?.toLowerCase().includes('schedule')
        )
        .map((node: any) => node.type || node.name);

      // Extract integrations (unique node types)
      const nodeTypes = workflow.nodes.map((node: any) => {
        const type = node.type || '';
        const parts = type.split('.');
        return parts[0]; // Get the service name (e.g., 'n8n-nodes-base' -> service name)
      });
      
      doc.integrations = [...new Set(nodeTypes)]
        .filter((type): type is string => typeof type === 'string' && type !== '' && !type.includes('n8n-nodes-base'))
        .slice(0, 5); // Limit to 5 integrations
    }

    return doc;
  }

  /**
   * Updates the documentation content with new/updated workflow
   */
  private updateDocContent(
    content: string,
    workflowDoc: WorkflowDoc,
    action: 'create' | 'update',
    customInstructions?: string
  ): string {
    const workflowSection = this.generateWorkflowSection(workflowDoc);
    
    // Check if workflow already exists in documentation
    const workflowRegex = new RegExp(`### ${workflowDoc.name}[\\s\\S]*?(?=###|##|$)`, 'g');
    const exists = workflowRegex.test(content);
    
    if (exists) {
      // Update existing workflow
      content = content.replace(workflowRegex, workflowSection);
    } else {
      // Add new workflow to the Workflows section
      const workflowsHeaderIndex = content.indexOf('## Workflows');
      if (workflowsHeaderIndex !== -1) {
        // Find the next section after Workflows
        const nextSectionMatch = content.substring(workflowsHeaderIndex).match(/\n##[^#]/);
        const insertIndex = nextSectionMatch 
          ? workflowsHeaderIndex + nextSectionMatch.index!
          : content.length;
        
        // Insert the new workflow
        content = content.substring(0, insertIndex) + 
                 '\n' + workflowSection + 
                 content.substring(insertIndex);
      } else {
        // If no Workflows section, append it
        content += '\n## Workflows\n\n' + workflowSection;
      }
    }
    
    // Update custom instructions if provided
    if (customInstructions) {
      const instructionsRegex = /### Project-Specific Instructions[\s\S]*?(?=##|$)/;
      const newInstructions = `### Project-Specific Instructions\n\n${customInstructions}\n`;
      
      if (instructionsRegex.test(content)) {
        content = content.replace(instructionsRegex, newInstructions);
      } else {
        // Add after Custom Instructions section
        const customIndex = content.indexOf('## Custom Instructions');
        if (customIndex !== -1) {
          const nextSectionMatch = content.substring(customIndex).match(/\n##[^#]/);
          const insertIndex = nextSectionMatch 
            ? customIndex + nextSectionMatch.index!
            : content.length;
          
          content = content.substring(0, insertIndex) + 
                   '\n' + newInstructions + 
                   content.substring(insertIndex);
        }
      }
    }
    
    // Update last modified timestamp
    const date = new Date().toISOString().split('T')[0];
    if (!content.includes('*Last updated:')) {
      content += `\n\n*Last updated: ${date}*\n`;
    } else {
      content = content.replace(/\*Last updated:.*\*/, `*Last updated: ${date}*`);
    }
    
    return content;
  }

  /**
   * Generates the documentation section for a workflow
   */
  private generateWorkflowSection(doc: WorkflowDoc): string {
    let section = `### ${doc.name}\n\n`;
    section += `**Description**: ${doc.description}\n\n`;
    section += `**File**: \`${doc.path}\`\n\n`;
    
    if (doc.triggers && doc.triggers.length > 0) {
      section += `**Triggers**: ${doc.triggers.join(', ')}\n\n`;
    }
    
    if (doc.integrations && doc.integrations.length > 0) {
      section += `**Integrations**: ${doc.integrations.join(', ')}\n\n`;
    }
    
    if (doc.createdAt) {
      const date = new Date(doc.createdAt).toLocaleDateString();
      section += `**Created**: ${date}\n\n`;
    }
    
    return section;
  }

  /**
   * Reads custom instructions from docs/workflow-instructions.md if it exists
   */
  async getCustomInstructions(): Promise<string | undefined> {
    try {
      const instructionsPath = path.join(this.docsPath, 'workflow-instructions.md');
      return await fs.readFile(instructionsPath, 'utf-8');
    } catch {
      return undefined;
    }
  }

  /**
   * Creates a workflow-instructions.md template if docs folder exists
   */
  async createInstructionsTemplate(): Promise<void> {
    await this.checkDocsFolder();
    if (!this.hasDocsFolder) {
      return;
    }

    const instructionsPath = path.join(this.docsPath, 'workflow-instructions.md');
    
    try {
      await fs.access(instructionsPath);
      // File already exists
    } catch {
      // Create template
      const template = `# Workflow Instructions

## Project-Specific Guidelines

Add your project-specific workflow creation and editing instructions here.

### Workflow Naming

- Use descriptive names that indicate the workflow's purpose
- Follow the pattern: \`[action]-[target]-[frequency]\` (e.g., \`sync-customer-data-daily\`)

### Required Components

Every workflow in this project should include:

1. **Error Handling**: Catch and handle errors appropriately
2. **Logging**: Log important events for debugging
3. **Notifications**: Alert on failures or important events
4. **Documentation**: Clear description in the workflow JSON

### Environment Variables

The following environment variables are used by workflows:

- \`API_BASE_URL\`: Base URL for API calls
- \`NOTIFICATION_EMAIL\`: Email for alerts
- Add more as needed...

### Testing Requirements

Before deploying a workflow:

1. Test with sample data
2. Verify error handling works
3. Check performance with expected data volume
4. Document any dependencies

### Security Considerations

- Never hardcode credentials
- Use n8n's built-in credential management
- Validate all external inputs
- Implement rate limiting where appropriate

---

*Update this file with your specific project requirements*
`;

      await fs.writeFile(instructionsPath, template, 'utf-8');
      console.error(`Created workflow instructions template: ${instructionsPath}`);
    }
  }
}