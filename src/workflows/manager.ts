import fs from 'fs/promises';
import path from 'path';
import { detectWorkflowStructure, WorkflowStructure } from './finder.js';
import { WorkflowDocumenter } from './documenter.js';
import { WorkflowInitializer } from './initializer.js';
import { NodeValidator } from '../nodes/validator.js';
import { WorkflowFormatter } from './formatter.js';
import { ChangeTracker } from '../utils/change-tracker.js';

export { NodeValidator } from '../nodes/validator.js';

export class WorkflowManager {
  private structure: WorkflowStructure;
  private workflowsPath: string;
  private documenter: WorkflowDocumenter;
  private initializer: WorkflowInitializer;
  private validator: NodeValidator;
  private formatter: WorkflowFormatter;
  private changeTracker: ChangeTracker;

  constructor(workflowsPath: string) {
    this.workflowsPath = workflowsPath;
    this.structure = detectWorkflowStructure();
    this.documenter = new WorkflowDocumenter(workflowsPath);
    this.initializer = new WorkflowInitializer(workflowsPath);
    this.validator = new NodeValidator(workflowsPath);
    this.formatter = new WorkflowFormatter();
    this.changeTracker = new ChangeTracker(workflowsPath);
    this.changeTracker.initialize().catch(console.error);
    
    // Create instructions template if needed
    this.documenter.createInstructionsTemplate().catch(console.error);
  }

  /**
   * Get the node validator instance
   */
  getValidator(): NodeValidator {
    return this.validator;
  }

  /**
   * Generates a succinct, unique workflow name
   */
  private async generateUniqueName(baseName: string, targetPath: string): Promise<string> {
    // Clean up the base name - remove redundant words and make succinct
    let cleanName = baseName
      .toLowerCase()
      .replace(/workflow/gi, '') // Remove 'workflow' as it's redundant
      .replace(/[\s_]+/g, '-')    // Replace spaces/underscores with hyphens
      .replace(/--+/g, '-')        // Remove duplicate hyphens
      .replace(/^-|-$/g, '')       // Remove leading/trailing hyphens
      .slice(0, 30);               // Keep names reasonably short
    
    // If name is empty after cleaning, use a default
    if (!cleanName) {
      cleanName = 'flow';
    }
    
    // Check if file exists and generate unique name if needed
    let finalName = cleanName;
    let counter = 1;
    
    while (true) {
      try {
        const filePath = path.join(targetPath, `${finalName}.json`);
        await fs.access(filePath);
        // File exists, try with a number suffix
        finalName = `${cleanName}-${counter}`;
        counter++;
      } catch {
        // File doesn't exist, we can use this name
        break;
      }
    }
    
    return finalName;
  }

  /**
   * Creates a new workflow with intelligent path handling
   * For simple structure: creates in ./workflows/
   * For multi-project: creates in ./project/workflows/ (only if project specified)
   */
  async createWorkflow(name: string, workflow: any, project?: string): Promise<any> {
    try {
      // Enforce dash naming convention
      if (name.includes('_')) {
        name = name.replace(/_/g, '-');
        console.log(`📝 Converting underscores to dashes in filename: ${name}`);
      }
      
      // Initialize workflows structure if needed (first time)
      const wasInitialized = await this.initializer.initialize();
      
      let targetPath: string;
      let relativePath: string;

      // Determine where to create the workflow based on structure
      if (this.structure.type === 'simple' || !project) {
        // Simple structure: use ./flows/ (workflowsPath already points to workflows dir)
        targetPath = path.join(this.workflowsPath, 'flows');
        relativePath = `flows/${name}.json`;
      } else if (this.structure.type === 'multi-project' && project) {
        // Multi-project structure with project specified
        targetPath = path.join(this.workflowsPath, project, 'workflows');
        relativePath = `${project}/workflows/${name}.json`;
      } else {
        // Unknown structure: default to simple with flows
        targetPath = path.join(this.workflowsPath, 'flows');
        relativePath = `flows/${name}.json`;
      }

      // Create directory if it doesn't exist
      await fs.mkdir(targetPath, { recursive: true });
      
      // Generate a succinct, unique name
      const finalName = await this.generateUniqueName(name, targetPath);
      
      // Update the workflow's internal name to match
      if (workflow.name) {
        workflow.name = finalName;
      }
      
      // Write temporary file for validation in /tmp
      const tempPath = `/tmp/mcflow_validate_${Date.now()}_${finalName}.json`;
      await fs.writeFile(tempPath, JSON.stringify(workflow, null, 2));
      
      // Validate and auto-fix if needed
      const validationResult = await this.validator.validateWorkflow(tempPath);
      if (!validationResult.valid) {
        // Try to auto-fix
        const fixResult = await this.validator.autoFixWorkflow(tempPath);
        if (fixResult.fixed) {
          // Re-read the fixed workflow
          const fixedContent = await fs.readFile(tempPath, 'utf-8');
          workflow = JSON.parse(fixedContent);
        }
      }
      
      // Write the final workflow file
      const filePath = path.join(targetPath, `${finalName}.json`);
      await fs.writeFile(filePath, JSON.stringify(workflow, null, 2));
      
      // Remove temp file
      try {
        await fs.unlink(tempPath);
      } catch {}
      
      // Update the relative path with the final name
      if (this.structure.type === 'simple' || !project) {
        relativePath = `workflows/flows/${finalName}.json`;
      } else if (project) {
        relativePath = `${project}/workflows/${finalName}.json`;
      }
      
      // Update documentation
      try {
        const customInstructions = await this.documenter.getCustomInstructions();
        await this.documenter.updateWorkflowDocumentation(finalName, workflow, 'create', customInstructions);
        
        // Extract and update credentials
        const credentials = this.initializer.extractCredentialsFromWorkflow(workflow);
        if (credentials.size > 0) {
          await this.initializer.updateEnvExample(credentials);
        }
        
        // Update README with workflow list
        const allWorkflows = await this.getWorkflowList();
        await this.initializer.updateReadmeWorkflowList(allWorkflows);
      } catch (docError) {
        console.error('Failed to update documentation:', docError);
        // Don't fail the workflow creation if documentation fails
      }
      
      return {
        content: [
          {
            type: 'text',
            text: `✅ Workflow Created Successfully!\n\n` +
                  `📁 File: ${relativePath}\n` +
                  `📝 Name: ${finalName}\n` +
                  `${project ? `📂 Project: ${project}\n` : ''}` +
                  `\n` +
                  `The workflow has been saved and documented.`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to create workflow: ${error}`);
    }
  }

  /**
   * Get workflow list for internal use
   */
  private async getWorkflowList(): Promise<Array<{name: string, description?: string}>> {
    const workflows: Array<{name: string, description?: string}> = [];
    
    // Try multiple possible paths
    const possibleFlowsPaths = [
      path.join(this.workflowsPath, 'workflows', 'flows'),
      path.join(this.workflowsPath, 'flows'),
    ];
    
    for (const flowsDir of possibleFlowsPaths) {
      try {
        const files = await fs.readdir(flowsDir);
      
      for (const file of files) {
        if (file.endsWith('.json') && 
            !file.includes('package.json') && 
            !file.includes('workflow_package.json')) {
          try {
            const content = await fs.readFile(path.join(flowsDir, file), 'utf-8');
            const workflow = JSON.parse(content);
            workflows.push({
              name: file.replace('.json', ''),
              description: workflow.description || workflow.name
            });
          } catch {
            workflows.push({
              name: file.replace('.json', ''),
              description: undefined
            });
          }
        }
      }
        return workflows; // Return if we found workflows
      } catch {
        // Try next path
      }
    }
    
    return workflows;
  }

  /**
   * Lists workflows based on structure type
   */
  async listWorkflows(project?: string): Promise<any> {
    const workflows: Array<{ path: string; name: string; project?: string }> = [];
    
    try {
      if (this.structure.type === 'simple') {
        // Simple structure: look in ./workflows/flows/
        // Try multiple possible paths
        const possibleFlowsPaths = [
          path.join(this.workflowsPath, 'workflows', 'flows'),
          path.join(this.workflowsPath, 'flows'),
        ];
        
        let foundWorkflows = false;
        for (const flowsDir of possibleFlowsPaths) {
          try {
            const files = await fs.readdir(flowsDir);
            for (const file of files) {
              if (file.endsWith('.json') && 
                  !file.includes('package.json') && 
                  !file.includes('workflow_package.json')) {
                workflows.push({
                  path: `workflows/flows/${file}`,
                  name: file.replace('.json', ''),
                });
                foundWorkflows = true;
              }
            }
            if (foundWorkflows) break;
          } catch {
            // Try next path
          }
        }
        
        if (!foundWorkflows) {
          console.error('No flows directory found. It will be created when you add your first workflow.');
        }
      } else if (this.structure.type === 'multi-project') {
        // Multi-project structure
        if (project) {
          // List workflows for specific project
          const projectPath = path.join(this.workflowsPath, project, 'workflows');
          try {
            const files = await fs.readdir(projectPath);
            for (const file of files) {
              if (file.endsWith('.json')) {
                workflows.push({
                  path: `${project}/workflows/${file}`,
                  name: file.replace('.json', ''),
                  project,
                });
              }
            }
          } catch {}
        } else if (this.structure.projects) {
          // List all workflows from all projects
          for (const proj of this.structure.projects) {
            const workflowsDir = path.join(this.workflowsPath, proj, 'workflows');
            try {
              const files = await fs.readdir(workflowsDir);
              for (const file of files) {
                if (file.endsWith('.json')) {
                  workflows.push({
                    path: `${proj}/workflows/${file}`,
                    name: file.replace('.json', ''),
                    project: proj,
                  });
                }
              }
            } catch {}
          }
        }
      } else {
        // Unknown structure: try common locations
        const possiblePaths = [
          path.join(this.workflowsPath, 'workflows', 'flows'),  // New structure
          path.join(this.workflowsPath, 'workflows'),           // Old structure
          this.workflowsPath,                                    // Root
        ];
        
        for (const searchPath of possiblePaths) {
          try {
            const files = await fs.readdir(searchPath);
            for (const file of files) {
              if (file.endsWith('.json')) {
                const relativePath = path.relative(this.workflowsPath, path.join(searchPath, file));
                workflows.push({
                  path: relativePath,
                  name: file.replace('.json', ''),
                });
              }
            }
            break; // Stop after finding workflows in one location
          } catch {}
        }
      }
      
      // Format the output nicely
      let output = '';
      
      if (workflows.length === 0) {
        output = '📭 No workflows found.\n\nCreate your first workflow to get started!';
      } else {
        output = `📋 Found ${workflows.length} workflow${workflows.length > 1 ? 's' : ''}:\n\n`;
        
        // Group by project if multi-project
        if (this.structure.type === 'multi-project') {
          const grouped = workflows.reduce((acc, w) => {
            const proj = w.project || 'common';
            if (!acc[proj]) acc[proj] = [];
            acc[proj].push(w);
            return acc;
          }, {} as Record<string, typeof workflows>);
          
          for (const [proj, flows] of Object.entries(grouped)) {
            output += `📂 ${proj}/\n`;
            for (const flow of flows) {
              output += `  • ${flow.name}\n`;
            }
            output += '\n';
          }
        } else {
          // Simple list for simple structure
          for (const workflow of workflows) {
            output += `• ${workflow.name}\n`;
          }
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
    } catch (error) {
      throw new Error(`Failed to list workflows: ${error}`);
    }
  }

  /**
   * Reads a workflow file with formatted output
   */
  async readWorkflow(workflowPath: string, options?: { format?: boolean; raw?: boolean }): Promise<any> {
    try {
      const fullPath = path.join(this.workflowsPath, workflowPath);
      const content = await fs.readFile(fullPath, 'utf-8');
      const workflow = JSON.parse(content);
      
      // Return raw JSON if requested
      if (options?.raw) {
        return {
          content: [
            {
              type: 'text',
              text: content,
            },
          ],
        };
      }
      
      // Format the workflow for better readability
      const formatted = this.formatter.formatWorkflow(workflow, {
        colorize: true,
        indent: 2,
        compact: false,
        showNodeDetails: true
      });
      
      return {
        content: [
          {
            type: 'text',
            text: formatted,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to read workflow: ${error}`);
    }
  }

  /**
   * Updates an existing workflow
   */
  async updateWorkflow(workflowPath: string, workflow: any): Promise<any> {
    try {
      const fullPath = path.join(this.workflowsPath, workflowPath);
      
      // Try to preserve the existing workflow ID if it exists
      try {
        const existingContent = await fs.readFile(fullPath, 'utf-8');
        const existingWorkflow = JSON.parse(existingContent);
        
        // Preserve important metadata from existing workflow
        if (existingWorkflow.id && !workflow.id) {
          workflow.id = existingWorkflow.id;
          console.error(`Preserving workflow ID: ${workflow.id}`);
        }
        if (existingWorkflow.createdAt && !workflow.createdAt) {
          workflow.createdAt = existingWorkflow.createdAt;
        }
        // Always update the updatedAt timestamp
        workflow.updatedAt = new Date().toISOString();
      } catch (readError) {
        // File might not exist yet or might be invalid JSON
        console.error('Could not read existing workflow, creating new');
      }
      
      await fs.writeFile(fullPath, JSON.stringify(workflow, null, 2));
      
      // Mark as edited in change tracker
      const relativePath = path.relative(this.workflowsPath, fullPath);
      await this.changeTracker.markEdited(relativePath);
      
      // Update documentation
      const workflowName = path.basename(workflowPath, '.json');
      
      try {
        const customInstructions = await this.documenter.getCustomInstructions();
        await this.documenter.updateWorkflowDocumentation(workflowName, workflow, 'update', customInstructions);
        
        // Extract and update credentials
        const credentials = this.initializer.extractCredentialsFromWorkflow(workflow);
        if (credentials.size > 0) {
          await this.initializer.updateEnvExample(credentials);
        }
        
        // Update README with workflow list
        const allWorkflows = await this.getWorkflowList();
        await this.initializer.updateReadmeWorkflowList(allWorkflows);
      } catch (docError) {
        console.error('Failed to update documentation:', docError);
        // Don't fail the workflow update if documentation fails
      }
      
      return {
        content: [
          {
            type: 'text',
            text: `✅ Workflow Updated!\n\n` +
                  `📁 File: ${workflowPath}\n` +
                  `📝 Name: ${workflowName}\n\n` +
                  `The workflow and documentation have been updated.`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to update workflow: ${error}`);
    }
  }

  /**
   * Gets project information (for multi-project structure)
   */
  async getProjectInfo(project?: string): Promise<any> {
    try {
      if (this.structure.type === 'simple') {
        // Simple structure: return info about the single workflows folder
        const info: any = {
          type: 'simple',
          workflowsPath: 'workflows/',
          workflows: [],
        };
        
        const workflowsDir = path.join(this.workflowsPath, 'workflows');
        try {
          const files = await fs.readdir(workflowsDir);
          info.workflows = files.filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''));
        } catch {}
        
        // Check for README and .env
        try {
          await fs.access(path.join(this.workflowsPath, 'README.md'));
          info.hasReadme = true;
        } catch {}
        
        try {
          await fs.access(path.join(this.workflowsPath, '.env.example'));
          info.hasEnvExample = true;
        } catch {}
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(info, null, 2),
            },
          ],
        };
      } else if (this.structure.type === 'multi-project') {
        if (project) {
          // Get info for specific project
          const projectPath = path.join(this.workflowsPath, project);
          const info: any = {
            name: project,
            type: 'multi-project',
            workflows: [],
          };
          
          const workflowsDir = path.join(projectPath, 'workflows');
          try {
            const files = await fs.readdir(workflowsDir);
            info.workflows = files.filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''));
          } catch {}
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(info, null, 2),
              },
            ],
          };
        } else {
          // List all projects
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  type: 'multi-project',
                  projects: this.structure.projects || [],
                }, null, 2),
              },
            ],
          };
        }
      }
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              type: 'unknown',
              message: 'Could not determine project structure',
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to get project info: ${error}`);
    }
  }
}