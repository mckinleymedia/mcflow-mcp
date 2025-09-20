import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import { ChangeTracker } from '../utils/change-tracker.js';
import { NodeManager } from '../nodes/manager.js';
import { WorkflowCompiler } from '../workflows/compiler.js';

const execAsync = promisify(exec);

export class N8nManager {
  private workflowsPath: string;
  private changeTracker: ChangeTracker;
  private nodeManager: NodeManager;
  private compiler: WorkflowCompiler;

  constructor(workflowsPath: string) {
    this.workflowsPath = workflowsPath;
    this.changeTracker = new ChangeTracker(workflowsPath);
    this.nodeManager = new NodeManager(workflowsPath);
    this.compiler = new WorkflowCompiler(workflowsPath);
    // Initialize managers
    this.changeTracker.initialize().catch(console.error);
    this.nodeManager.initialize().catch(console.error);
    
    // Check n8n availability on startup
    this.checkN8nAvailability().then(available => {
      if (!available) {
        console.error('\n⚠️  n8n CLI is not installed!');
        console.error('To use McFlow deployment features, install n8n:');
        console.error('  npm install -g n8n');
        console.error('  or');
        console.error('  yarn global add n8n\n');
      }
    });
  }

  /**
   * Check if stderr contains actual errors (not warnings/deprecations)
   */
  private hasRealError(stderr: string, stdout?: string): boolean {
    console.error(`[hasRealError] Checking stderr: ${stderr?.substring(0, 200)}`);
    console.error(`[hasRealError] Checking stdout: ${stdout?.substring(0, 200)}`);
    if (!stderr) return false;
    
    // Check if stdout indicates success
    if (stdout && (stdout.includes('Successfully imported') || 
        stdout.includes('Successfully exported'))) {
      return false;
    }
    
    // Check if stderr contains success indicators
    if (stderr.includes('Successfully imported') || 
        stderr.includes('Successfully exported') ||
        stderr.includes('Importing') ||
        stderr.includes('success')) {
      return false;
    }
    
    // Ignore known warnings and notices
    const warningPatterns = [
      'deprecation',
      'Permissions',
      'N8N_RUNNERS_ENABLED',
      'N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS',
      'There is a deprecation',
      'Learn more:'
    ];
    
    // Check if stderr only contains warnings
    const lines = stderr.split('\n').filter(line => line.trim());
    const nonWarningLines = lines.filter(line => {
      return !warningPatterns.some(pattern => line.includes(pattern));
    });
    
    // If we have non-warning lines that contain "Error" or "failed", it's a real error
    return nonWarningLines.some(line => 
      line.toLowerCase().includes('error') || 
      line.toLowerCase().includes('failed') ||
      line.toLowerCase().includes('invalid')
    );
  }

  /**
   * Deploy a workflow to n8n (handles both create and update)
   */
  async importWorkflow(workflowPath: string, options: {
    separate?: boolean;
    activate?: boolean;
  } = {}): Promise<any> {
    try {
      // Check if n8n is available
      const n8nAvailable = await this.checkN8nAvailability();
      if (!n8nAvailable) {
        return {
          content: [
            {
              type: 'text',
              text: '❌ n8n CLI is not installed!\n\n' +
                    'To deploy workflows, you need to install n8n:\n' +
                    '  npm install -g n8n\n' +
                    '  or\n' +
                    '  yarn global add n8n\n\n' +
                    'After installation, run "n8n start" to start the server.',
            },
          ],
        };
      }
      // Handle different path formats
      let fullPath: string;

      // If the path starts with 'workflows/', remove it to avoid doubling
      if (workflowPath.startsWith('workflows/')) {
        workflowPath = workflowPath.substring('workflows/'.length);
      }

      // If it's an absolute path, use it directly
      if (path.isAbsolute(workflowPath)) {
        fullPath = workflowPath;
      } else {
        fullPath = path.join(this.workflowsPath, workflowPath);
      }

      // Verify file exists
      await fs.access(fullPath);

      // Create temporary file with injected content in /tmp
      const tempPath = `/tmp/mcflow_deploy_${Date.now()}_${path.basename(workflowPath)}`;

      try {
        // Compile the workflow (inject external code/prompts)
        const workflow = await this.compiler.compileWorkflow(fullPath);

        // Save compiled workflow to dist directory
        const fileName = path.basename(workflowPath);
        await this.compiler.saveCompiledWorkflow(fileName, workflow);

        // Ensure workflow has required fields for n8n
        if (!workflow.active && workflow.active !== false) {
          workflow.active = false; // Default to inactive
        }

        // Track which nodes had content injected (for reporting)
        const injected: string[] = [];
        if (!workflow.settings) {
          workflow.settings = { executionOrder: 'v1' };
        }
        if (!workflow.connections) {
          workflow.connections = {};
        }

        // IMPORTANT: Log whether this is an update or create
        const isUpdate = !!workflow.id;
        if (workflow.id) {
          console.error(`Updating existing workflow with ID: ${workflow.id}`);
        } else {
          console.error('No workflow ID found - n8n will create a new workflow');
        }

        // Log injection details
        if (injected.length > 0) {
          console.error(`Injecting content for nodes: ${injected.join(', ')}`);
        }

        // Validate that code nodes have content
        let emptyCodeNodes = [];
        if (workflow.nodes) {
          for (const node of workflow.nodes) {
            if (node.type === 'n8n-nodes-base.code' && node.parameters) {
              if ((!node.parameters.jsCode || node.parameters.jsCode === '') &&
                  (!node.parameters.pythonCode || node.parameters.pythonCode === '')) {
                emptyCodeNodes.push(node.name || 'unnamed');
              }
            }
          }
        }

        if (emptyCodeNodes.length > 0) {
          console.error(`⚠️  WARNING: The following code nodes have empty content: ${emptyCodeNodes.join(', ')}`);
          console.error('This may cause nodes to appear disconnected in n8n.');
          console.error('Make sure to use "mcflow deploy" instead of deploying the workflow file directly.');
        }

        // Write temporary workflow with injected content
        // n8n expects a single workflow object (not in an array) for file import
        await fs.writeFile(tempPath, JSON.stringify(workflow, null, 2));

        // Build command using temp file
        // Use --force flag to update existing workflows
        let command = `n8n import:workflow --input="${tempPath}" --force`;

        if (options.activate) {
          command += ' --activate';
        }

        console.error(`Executing: ${command}`);
        const { stdout, stderr } = await execAsync(command);

        // Clean up temp file
        await fs.unlink(tempPath).catch(() => {});

        // Check for errors
        if (this.hasRealError(stderr, stdout)) {
          throw new Error(stderr);
        }

        return {
          content: [
            {
              type: 'text',
              text: `✅ Workflow ${isUpdate ? 'updated' : 'deployed'} successfully!\n\n` +
                    `📁 File: ${workflowPath}\n` +
                    `${options.activate ? '▶️ Status: Activated\n' : '⏸️ Status: Inactive\n'}` +
                    `${injected.length > 0 ? `💉 Injected nodes: ${injected.join(', ')}\n` : ''}` +
                  `${options.separate ? '📦 Mode: Separate execution\n' : ''}` +
                  `\n${stdout || 'Deployment completed.'}`,
          },
        ],
      };
      } catch (error: any) {
        // Always clean up temp file on error
        await fs.unlink(tempPath).catch(() => {});
        throw new Error(`Failed to deploy workflow: ${error.message}`);
      }
    } catch (error: any) {
      throw new Error(`Failed to deploy workflow: ${error.message}`);
    }
  }

  /**
   * Deploy all changed workflows in parallel
   */
  async deployChangedWorkflows(options: {
    activate?: boolean;
    separate?: boolean;
  } = {}): Promise<any> {
    try {
      // Get list of changed workflow files from change tracker
      const changedFiles = await this.changeTracker.getChangedWorkflows();
      
      if (changedFiles.length === 0) {
        // Show current deployment status
        const statusDetails = await this.changeTracker.getChangeDetails();
        return {
          content: [
            {
              type: 'text',
              text: statusDetails,
            },
          ],
        };
      }
      
      // Deploy all changed workflows in parallel
      const deployPromises = changedFiles.map(async (file) => {
        const fullPath = path.join(this.workflowsPath, file);
        
        // Create a temporary file with injected code in /tmp
        const tempPath = `/tmp/mcflow_deploy_${Date.now()}_${path.basename(file)}`;
        
        try {
          // Compile the workflow (inject external code/prompts)
          const workflow = await this.compiler.compileWorkflow(fullPath);
          
          // Validate that code nodes have content
          let emptyCodeNodes = [];
          if (workflow.nodes) {
            for (const node of workflow.nodes) {
              if (node.type === 'n8n-nodes-base.code' && node.parameters) {
                if ((!node.parameters.jsCode || node.parameters.jsCode === '') && 
                    (!node.parameters.pythonCode || node.parameters.pythonCode === '')) {
                  emptyCodeNodes.push(node.name || 'unnamed');
                }
              }
            }
          }
          
          if (emptyCodeNodes.length > 0) {
            console.error(`⚠️  WARNING in ${path.basename(file)}: Empty code nodes: ${emptyCodeNodes.join(', ')}`);
          }
          
          // Track which nodes had content injected (for reporting)
          const injected: string[] = [];
          
          // Write temporary workflow with injected code
          // n8n expects a single workflow object (not in an array) for file import
          await fs.writeFile(tempPath, JSON.stringify(workflow, null, 2));
          
          // Build command for this workflow using temp file
          // Use --force flag to update existing workflows
          let command = `n8n import:workflow --input="${tempPath}" --force`;

        if (options.activate) {
          command += ' --activate';
        }
        
          const { stdout, stderr } = await execAsync(command);
          
          // Clean up temp file
          await fs.unlink(tempPath).catch(() => {});
          
          if (this.hasRealError(stderr, stdout)) {
            return { file: path.basename(file), relativePath: file, status: 'failed', error: stderr };
          }
          
          // Log success with any warnings
          if (stderr) {
            console.error(`Deployed ${path.basename(file)} with warnings: ${stderr}`);
          }
          
          // Log if code was injected
          if (injected.length > 0) {
            console.log(`Injected code for nodes: ${injected.join(', ')}`);
          }
          
          // Mark as deployed in change tracker
          await this.changeTracker.markDeployed(file);
          
          return { file: path.basename(file), relativePath: file, status: 'success', output: stdout || stderr };
        } catch (error: any) {
          // Clean up temp file on error
          await fs.unlink(tempPath).catch(() => {});
          console.error(`Failed to deploy ${path.basename(file)}: ${error.message}`);
          return { file: path.basename(file), relativePath: file, status: 'failed', error: error.message };
        }
      });
      
      // Wait for all deployments to complete
      const results = await Promise.all(deployPromises);
      
      // Format results
      const successful = results.filter(r => r.status === 'success');
      const failed = results.filter(r => r.status === 'failed');
      
      let output = `🚀 Deployed ${successful.length}/${changedFiles.length} workflows\n\n`;
      
      if (successful.length > 0) {
        output += '✅ Successfully deployed:\n';
        for (const result of successful) {
          output += `  • ${result.file}\n`;
        }
      }
      
      if (failed.length > 0) {
        output += '\n❌ Failed to deploy:\n';
        for (const result of failed) {
          // Extract meaningful error message
          const errorMsg = result.error || 'Unknown error';
          const shortError = errorMsg.split('\n')[0].substring(0, 100);
          output += `  • ${result.file}: ${shortError}\n`;
          
          // Log full error to console for debugging
          console.error(`Full error for ${result.file}:`, result.error);
        }
      }
      
      output += `\n${options.activate ? '▶️ Status: All activated' : '⏸️ Status: Not activated'}`;
      output += `\n${options.separate ? '📦 Mode: Separate execution' : '📦 Mode: Standard'}`;
      
      return {
        content: [
          {
            type: 'text',
            text: output,
          },
        ],
      };
    } catch (error: any) {
      throw new Error(`Failed to deploy changed workflows: ${error.message}`);
    }
  }

  /**
   * Deploy all workflows in parallel
   */
  async deployAllWorkflows(options: {
    activate?: boolean;
    separate?: boolean;
  } = {}): Promise<any> {
    try {
      // Find the flows directory intelligently
      let flowsPath: string = '';
      const possiblePaths = [
        path.join(this.workflowsPath, 'flows'),
        this.workflowsPath
      ];
      
      for (const testPath of possiblePaths) {
        try {
          await fs.access(testPath);
          const files = await fs.readdir(testPath);
          if (files.some(f => f.endsWith('.json'))) {
            flowsPath = testPath;
            break;
          }
        } catch {}
      }
      
      if (!flowsPath) {
        flowsPath = possiblePaths[0]; // Default to first option
      }
      
      // Get all workflow files (exclude package/config files)
      const files = await fs.readdir(flowsPath);
      const workflowFiles = files.filter(f => 
        f.endsWith('.json') && 
        !f.includes('package.json') &&
        !f.includes('workflow_package.json')
      );
      
      if (workflowFiles.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: '📭 No workflows found to deploy.',
            },
          ],
        };
      }
      
      // Deploy all workflows in parallel
      const deployPromises = workflowFiles.map(async (file) => {
        const fullPath = path.join(flowsPath, file);
        
        // Create a temporary file for the compiled workflow
        // Use a simpler name to avoid path issues
        const tempFileName = `deploy_${Date.now()}_${file.replace(/[^a-z0-9.-]/gi, '_')}`;
        const tempPath = path.join('/tmp', tempFileName);
        
        try {
          // Compile the workflow (inject external code/prompts)
          console.error(`Compiling: ${fullPath}`);
          const workflow = await this.compiler.compileWorkflow(fullPath);
          
          // Write compiled workflow to temp file
          await fs.writeFile(tempPath, JSON.stringify(workflow, null, 2));
          console.error(`Written to temp: ${tempPath}`);
          
          // Build command for this workflow using the compiled temp file
          // Use --force flag to update existing workflows
          let command = `n8n import:workflow --input="${tempPath}" --force`;

          if (options.activate) {
            command += ' --activate';
          }
          
          console.error(`Executing command for ${file}: ${command}`);
          const { stdout, stderr } = await execAsync(command);
          
          // Clean up temp file
          await fs.unlink(tempPath).catch(() => {});
          
          // Log raw output for debugging
          console.error(`[${file}] stdout: ${stdout}`);
          console.error(`[${file}] stderr: ${stderr}`);
          
          if (this.hasRealError(stderr, stdout)) {
            console.error(`[${file}] Detected real error in deployment`);
            return { file, status: 'failed', error: stderr };
          }
          
          // Check for success indicators
          const isSuccess = stdout?.includes('Successfully imported') || 
                           stderr?.includes('Successfully imported') ||
                           stderr?.includes('Importing');
          
          if (!isSuccess && !stdout && !stderr) {
            console.error(`[${file}] No output from import command - possible silent failure`);
            return { file, status: 'failed', error: 'No output from import command' };
          }
          
          // Log success with any warnings
          if (stderr && !this.hasRealError(stderr, stdout)) {
            console.error(`[${file}] Deployed with warnings: ${stderr}`);
          } else {
            console.error(`[${file}] Deployed successfully`);
          }
          
          return { file, status: 'success', output: stdout || stderr || 'Import completed' };
        } catch (error: any) {
          // Clean up temp file on error
          await fs.unlink(tempPath).catch(() => {});
          console.error(`Failed to deploy ${file}: ${error.message}`);
          return { file, status: 'failed', error: error.message };
        }
      });
      
      // Wait for all deployments to complete
      const results = await Promise.all(deployPromises);
      
      // Format results
      const successful = results.filter(r => r.status === 'success');
      const failed = results.filter(r => r.status === 'failed');
      
      console.error(`\n=== Deployment Summary ===`);
      console.error(`Total workflows: ${workflowFiles.length}`);
      console.error(`Successful: ${successful.length}`);
      console.error(`Failed: ${failed.length}`);
      console.error(`Results:`, JSON.stringify(results, null, 2));
      
      let output = `🚀 Deployed ${successful.length}/${workflowFiles.length} workflows\n\n`;
      
      if (successful.length > 0) {
        output += '✅ Successfully deployed:\n';
        for (const result of successful) {
          output += `  • ${result.file}\n`;
        }
      }
      
      if (failed.length > 0) {
        output += '\n❌ Failed to deploy:\n';
        for (const result of failed) {
          // Extract meaningful error message
          const errorMsg = result.error || 'Unknown error';
          const shortError = errorMsg.split('\n')[0].substring(0, 100);
          output += `  • ${result.file}: ${shortError}\n`;
          
          // Log full error to console for debugging
          console.error(`Full error for ${result.file}:`, result.error);
        }
      }
      
      output += `\n${options.activate ? '▶️ Status: All activated' : '⏸️ Status: Not activated'}`;
      output += `\n${options.separate ? '📦 Mode: Separate execution' : '📦 Mode: Standard'}`;
      
      return {
        content: [
          {
            type: 'text',
            text: output,
          },
        ],
      };
    } catch (error: any) {
      throw new Error(`Failed to deploy all workflows: ${error.message}`);
    }
  }

  /**
   * Export workflows from n8n
   */
  async exportWorkflow(options: {
    id?: string;
    all?: boolean;
    outputPath?: string;
    pretty?: boolean;
  } = {}): Promise<any> {
    try {
      const outputDir = options.outputPath || path.join(this.workflowsPath, 'flows');
      
      // Ensure output directory exists
      await fs.mkdir(outputDir, { recursive: true });
      
      // Build command - n8n requires a file path, not directory
      let command = 'n8n export:workflow';
      
      if (options.all) {
        // For all workflows, we need to export to a temp file and process
        const tempFile = path.join('/tmp', `n8n-export-${Date.now()}.json`);
        command += ` --all --output="${tempFile}"`;
        
        if (options.pretty !== false) {
          command += ' --pretty';
        }
        
        console.error(`Executing: ${command}`);
        const { stdout, stderr } = await execAsync(command);
        
        if (this.hasRealError(stderr, stdout)) {
          throw new Error(stderr);
        }
        
        // Read the exported data
        const exportedData = await fs.readFile(tempFile, 'utf-8');
        const workflows = JSON.parse(exportedData);
        
        // Save each workflow separately, preserving ID
        for (const workflow of workflows) {
          const fileName = `${workflow.name.toLowerCase().replace(/\s+/g, '-')}.json`;
          const filePath = path.join(outputDir, fileName);
          
          // Store the full workflow object with ID
          await fs.writeFile(filePath, JSON.stringify(workflow, null, 2));
        }
        
        // Clean up temp file
        await fs.unlink(tempFile).catch(() => {});
        
        return {
          content: [{
            type: 'text',
            text: `✅ Exported ${workflows.length} workflows to ${outputDir}`
          }]
        };
      } else if (options.id) {
        // For single workflow, export directly
        const tempFile = path.join('/tmp', `n8n-export-${Date.now()}.json`);
        command += ` --id=${options.id} --output="${tempFile}"`;
        
        if (options.pretty !== false) {
          command += ' --pretty';
        }
        
        console.error(`Executing: ${command}`);
        const { stdout, stderr } = await execAsync(command);
        
        if (this.hasRealError(stderr, stdout)) {
          throw new Error(stderr);
        }
        
        // Read the exported data
        const exportedData = await fs.readFile(tempFile, 'utf-8');
        const workflows = JSON.parse(exportedData);
        const workflow = Array.isArray(workflows) ? workflows[0] : workflows;
        
        // Save with the workflow's name, preserving ID
        const fileName = `${workflow.name.toLowerCase().replace(/\s+/g, '-')}.json`;
        const filePath = path.join(outputDir, fileName);
        
        // Store the full workflow object with ID
        await fs.writeFile(filePath, JSON.stringify(workflow, null, 2));
        
        // Clean up temp file
        await fs.unlink(tempFile).catch(() => {});
        
        return {
          content: [{
            type: 'text',
            text: `✅ Exported workflow: ${workflow.name}\n` +
                  `📁 File: ${fileName}\n` +
                  `🆔 ID: ${workflow.id}`
          }]
        };
      }
      
      // If no specific options, show error
      return {
        content: [{
          type: 'text',
          text: '❌ Please specify either --id or --all for export'
        }]
      };
    } catch (error: any) {
      throw new Error(`Failed to export workflow: ${error.message}`);
    }
  }

  /**
   * List all credentials from n8n with their IDs
   */
  async listCredentials(): Promise<any> {
    try {
      // Try different credential listing approaches
      // First try the credentials list command
      let command = 'n8n credential:list';
      console.error(`Executing: ${command}`);

      let stdout: string;
      let stderr: string;

      try {
        ({ stdout, stderr } = await execAsync(command, {
          timeout: 10000,
        }));
      } catch (error: any) {
        // If that fails, try alternative command
        console.error('credential:list failed, trying list:credential');
        command = 'n8n list:credential';
        try {
          ({ stdout, stderr } = await execAsync(command, {
            timeout: 10000,
          }));
        } catch (error2: any) {
          // If both fail, provide helpful message
          throw new Error(
            'Unable to list credentials via n8n CLI. ' +
            'Please check credentials manually in n8n UI at http://localhost:5678/credentials'
          );
        }
      }

      if (this.hasRealError(stderr, stdout)) {
        throw new Error(stderr);
      }

      // Parse the output - n8n outputs credentials as a table or JSON
      const lines = stdout.split('\n').filter(line => line.trim());
      const credentials: Array<{id: string, name: string, type: string}> = [];

      // Try to parse as JSON first
      try {
        const parsed = JSON.parse(stdout);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch {
        // Not JSON, parse as table
        // Skip header lines, typically starts with "ID" or similar
        let inData = false;
        for (const line of lines) {
          if (line.includes('ID') && line.includes('Name')) {
            inData = true;
            continue;
          }
          if (inData && line.trim()) {
            // Parse table row - format is typically: ID | Name | Type | ...
            const parts = line.split(/\s{2,}|\t|\|/).map(s => s.trim()).filter(s => s);
            if (parts.length >= 2) {
              credentials.push({
                id: parts[0],
                name: parts[1],
                type: parts[2] || 'unknown'
              });
            }
          }
        }
      }

      return credentials;
    } catch (error: any) {
      // If CLI doesn't work, try using the API
      console.error('CLI approach failed, trying API approach');

      try {
        // Use curl to access n8n API (if available)
        const apiCommand = 'curl -s http://localhost:5678/rest/credentials';
        const { stdout: apiOutput } = await execAsync(apiCommand, {
          timeout: 5000,
        });

        const apiCredentials = JSON.parse(apiOutput);
        if (Array.isArray(apiCredentials.data)) {
          return apiCredentials.data.map((cred: any) => ({
            id: cred.id,
            name: cred.name,
            type: cred.type
          }));
        }
      } catch (apiError) {
        console.error('API approach also failed');
      }

      // If n8n is not running or command fails
      if (error.message.includes('command not found')) {
        throw new Error('n8n CLI is not installed');
      }
      if (error.message.includes('connect')) {
        throw new Error('n8n is not running. Start it with: n8n start');
      }

      // Return informative error
      throw new Error(
        'Unable to list credentials. The n8n CLI may not support this command. ' +
        'Please check your credentials manually in the n8n UI at http://localhost:5678/credentials\n\n' +
        'To find credential IDs:\n' +
        '1. Open n8n UI\n' +
        '2. Go to Credentials\n' +
        '3. Click on a credential\n' +
        '4. The ID is in the URL (e.g., /credentials/ABC123xyz/edit)'
      );
    }
  }

  /**
   * Execute a workflow in n8n
   */
  async executeWorkflow(options: {
    id?: string;
    file?: string;
    data?: any;
  } = {}): Promise<any> {
    try {
      // Build command
      let command = 'n8n execute';
      
      if (options.id) {
        command += ` --id=${options.id}`;
      } else if (options.file) {
        const fullPath = path.join(this.workflowsPath, options.file);
        command += ` --file="${fullPath}"`;
      } else {
        throw new Error('Either id or file must be specified');
      }
      
      // Add input data if provided
      if (options.data) {
        const dataFile = `/tmp/n8n-input-${Date.now()}.json`;
        await fs.writeFile(dataFile, JSON.stringify(options.data));
        command += ` --input="${dataFile}"`;
      }

      console.error(`Executing: ${command}`);
      const { stdout, stderr } = await execAsync(command, {
        timeout: 60000, // 60 second timeout
      });
      
      // Clean up temp file if created
      if (options.data) {
        const dataFile = `/tmp/n8n-input-${Date.now()}.json`;
        await fs.unlink(dataFile).catch(() => {});
      }
      
      if (this.hasRealError(stderr, stdout)) {
        throw new Error(stderr);
      }

      // Parse execution results if possible
      let result = stdout;
      try {
        result = JSON.parse(stdout);
      } catch {
        // Not JSON, use as-is
      }

      return {
        content: [
          {
            type: 'text',
            text: `✅ Workflow executed successfully!\n\n` +
                  `${options.id ? `🆔 Workflow ID: ${options.id}\n` : ''}` +
                  `${options.file ? `📁 File: ${options.file}\n` : ''}` +
                  `\n📊 Results:\n${typeof result === 'object' ? JSON.stringify(result, null, 2) : result}`,
          },
        ],
      };
    } catch (error: any) {
      throw new Error(`Failed to execute workflow: ${error.message}`);
    }
  }

  /**
   * List workflows in n8n instance
   */
  async listDeployedWorkflows(): Promise<any> {
    try {
      const command = 'n8n list:workflow --all';
      
      console.error(`Executing: ${command}`);
      const { stdout, stderr } = await execAsync(command);
      
      if (this.hasRealError(stderr, stdout)) {
        throw new Error(stderr);
      }

      // Parse the output - format is "id|name"
      const lines = stdout.split('\n').filter(line => line.trim() && !line.includes('deprecation'));
      const workflows = [];
      
      // Get active workflow IDs for status
      let activeIds: string[] = [];
      try {
        const activeCommand = 'n8n list:workflow --active=true --onlyId';
        const { stdout: activeStdout } = await execAsync(activeCommand);
        activeIds = activeStdout.split('\n').filter(id => id.trim()).map(id => id.trim());
      } catch {
        // If we can't get active status, continue without it
      }
      
      for (const line of lines) {
        // Skip warning lines
        if (line.includes('There are deprecations') || line.includes('DB_SQLITE') || line.includes('N8N_RUNNERS')) {
          continue;
        }
        
        // Parse n8n list output format: id|name
        const parts = line.split('|');
        if (parts.length >= 2) {
          const id = parts[0].trim();
          workflows.push({
            id: id,
            name: parts[1].trim(),
            status: activeIds.includes(id) ? 'active' : 'inactive',
          });
        }
      }

      let output = `📋 Deployed Workflows (${workflows.length}):\n\n`;
      
      if (workflows.length === 0) {
        output += 'No workflows found in n8n instance.\n';
      } else {
        for (const wf of workflows) {
          const statusIcon = wf.status === 'active' ? '🟢' : '⚪';
          output += `${statusIcon} [${wf.id}] ${wf.name}\n`;
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
      throw new Error(`Failed to list workflows: ${error.message}`);
    }
  }

  /**
   * Activate or deactivate a workflow
   */
  async updateWorkflowStatus(id: string, activate: boolean): Promise<any> {
    try {
      const command = activate 
        ? `n8n update:workflow --id=${id} --activate`
        : `n8n update:workflow --id=${id} --deactivate`;
      
      console.error(`Executing: ${command}`);
      const { stdout, stderr } = await execAsync(command);
      
      if (this.hasRealError(stderr, stdout)) {
        throw new Error(stderr);
      }

      return {
        content: [
          {
            type: 'text',
            text: `✅ Workflow ${activate ? 'activated' : 'deactivated'} successfully!\n\n` +
                  `🆔 Workflow ID: ${id}\n` +
                  `${activate ? '▶️ Status: Active' : '⏸️ Status: Inactive'}\n`,
          },
        ],
      };
    } catch (error: any) {
      throw new Error(`Failed to update workflow status: ${error.message}`);
    }
  }

  /**
   * Check if n8n CLI is available
   */
  async checkN8nAvailability(): Promise<boolean> {
    try {
      const { stdout } = await execAsync('n8n --version');
      console.error(`n8n CLI version: ${stdout.trim()}`);
      return true;
    } catch {
      console.error('n8n CLI not found. Install with: npm install -g n8n');
      return false;
    }
  }

  /**
   * Start n8n in development mode
   */
  async startN8n(options: {
    port?: number;
    tunnel?: boolean;
  } = {}): Promise<any> {
    try {
      let command = 'n8n start';
      
      if (options.port) {
        command = `N8N_PORT=${options.port} ${command}`;
      }
      
      if (options.tunnel) {
        command += ' --tunnel';
      }

      console.error(`Starting n8n: ${command}`);
      
      // Start n8n in background
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error(`n8n error: ${error}`);
        }
      });

      // Give it a moment to start
      await new Promise(resolve => setTimeout(resolve, 2000));

      const port = options.port || 5678;
      const url = options.tunnel ? 'Check console for tunnel URL' : `http://localhost:${port}`;

      return {
        content: [
          {
            type: 'text',
            text: `🚀 n8n started successfully!\n\n` +
                  `🌐 URL: ${url}\n` +
                  `🔧 Port: ${port}\n` +
                  `${options.tunnel ? '🌍 Tunnel: Enabled\n' : ''}` +
                  `\nUse Ctrl+C to stop n8n when done.`,
          },
        ],
      };
    } catch (error: any) {
      throw new Error(`Failed to start n8n: ${error.message}`);
    }
  }
}