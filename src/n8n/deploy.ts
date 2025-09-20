#!/usr/bin/env node
import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { WorkflowCompiler } from '../workflows/compiler.js';

interface DeployConfig {
  n8nUrl?: string;
  n8nApiKey?: string;
  useCloud?: boolean;
  workflowsPath?: string;
}

class WorkflowDeployer {
  private config: DeployConfig;
  private compiler: WorkflowCompiler;
  
  constructor(config: DeployConfig = {}) {
    this.config = {
      n8nUrl: config.n8nUrl || process.env.N8N_API_URL || 'http://localhost:5678',
      n8nApiKey: config.n8nApiKey || process.env.N8N_API_KEY,
      useCloud: config.useCloud || false,
      workflowsPath: config.workflowsPath || process.env.WORKFLOWS_PATH || process.cwd(),
    };
    this.compiler = new WorkflowCompiler(this.config.workflowsPath!);
  }
  
  async deployWorkflow(workflowPath: string, skipCompilation: boolean = false): Promise<void> {
    try {
      let workflow;
      const workflowName = path.basename(workflowPath, '.json');
      
      // ALWAYS compile before deployment (unless explicitly skipped)
      if (!skipCompilation) {
        console.log(`\n📄 Deploying: ${workflowName}`);
        workflow = await this.compiler.compileWorkflow(workflowPath);
      } else {
        console.log(`\n⚠️  Deploying without compilation: ${workflowName}`);
        const workflowContent = await fs.readFile(workflowPath, 'utf-8');
        workflow = JSON.parse(workflowContent);
      }
      
      if (this.config.useCloud && this.config.n8nApiKey) {
        await this.deployToCloud(workflow);
      } else {
        await this.deployToLocal(workflow, workflowPath);
      }
      
      console.log(`  ✅ Deployed successfully: ${workflow.name}`);
    } catch (error) {
      console.error(`  ❌ Failed to deploy: ${error}`);
      throw error;
    }
  }
  
  private async deployToCloud(workflow: any): Promise<void> {
    const response = await fetch(`${this.config.n8nUrl}/api/v1/workflows`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': this.config.n8nApiKey!,
      },
      body: JSON.stringify(workflow),
    });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }
  }
  
  private async deployToLocal(workflow: any, workflowPath: string): Promise<void> {
    // Always use a temp file with the compiled workflow
    const tempFile = `/tmp/compiled_workflow_${Date.now()}.json`;
    await fs.writeFile(tempFile, JSON.stringify(workflow, null, 2));
    
    try {
      // Skip Docker attempt and go straight to n8n CLI
      // Docker deployment tends to hang if container isn't running
      console.log('  → Deploying via n8n CLI...');
      
      // Note: Don't use --separate for single file imports
      const result = execSync(`n8n import:workflow --input=${tempFile}`, {
        encoding: 'utf-8',
        timeout: 30000, // 30 second timeout
      });
      
      // Check if result indicates success
      if (result.includes('Successfully imported') || result.includes('Importing')) {
        console.log('  ✓ Deployed via n8n CLI');
      } else {
        console.log('  ✓ Deployed via n8n CLI (no explicit success message)');
      }
    } catch (cliError: any) {
      console.error('  ❌ n8n CLI deployment failed:', cliError.message);
      if (cliError.stdout) console.error('  stdout:', cliError.stdout);
      if (cliError.stderr) console.error('  stderr:', cliError.stderr);
      throw cliError;
    } finally {
      await fs.unlink(tempFile).catch(() => {});
    }
  }
  
  async deployProject(projectPath: string, skipCompilation: boolean = false): Promise<void> {
    const workflowsDir = path.join(projectPath, 'workflows', 'flows');
    const files = await fs.readdir(workflowsDir);
    
    const configFiles = files.filter(f => f.includes('config'));
    const mainFiles = files.filter(f => f.includes('main') || f.includes('master'));
    const otherFiles = files.filter(f => !configFiles.includes(f) && !mainFiles.includes(f));
    
    const deployOrder = [...configFiles, ...otherFiles, ...mainFiles];
    const jsonFiles = deployOrder.filter(f => f.endsWith('.json'));
    
    console.log(`\n📦 Deploying ${jsonFiles.length} workflows...`);
    console.log(`   Mode: ${skipCompilation ? 'WITHOUT compilation (not recommended)' : 'With automatic compilation'}`);
    
    let deployed = 0;
    for (const file of jsonFiles) {
      await this.deployWorkflow(path.join(workflowsDir, file), skipCompilation);
      deployed++;
      console.log(`   Progress: ${deployed}/${jsonFiles.length} workflows deployed`);
      
      // Small delay between deployments
      if (deployed < jsonFiles.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    console.log(`\n✅ Successfully deployed all ${deployed} workflows!`);
  }
  
  /**
   * Compile all workflows and save to dist/ for debugging
   */
  async compileAll(saveToFiles: boolean = true): Promise<void> {
    console.log('🔧 Compiling all workflows...');
    await this.compiler.compileAll(saveToFiles);
  }
  
  /**
   * Extract code from a workflow into separate files
   */
  async extractCode(workflowPath: string): Promise<void> {
    await this.compiler.extractCode(workflowPath);
    
    // Save the updated workflow with references
    const workflowContent = await fs.readFile(workflowPath, 'utf-8');
    const workflow = JSON.parse(workflowContent);
    await fs.writeFile(workflowPath, JSON.stringify(workflow, null, 2));
    
    console.log(`✅ Code extraction complete for: ${path.basename(workflowPath)}`);
  }
  
  /**
   * Extract code from all workflows
   */
  async extractAllCode(): Promise<void> {
    const flowsDir = path.join(this.config.workflowsPath!, 'flows');
    const files = await fs.readdir(flowsDir);
    const workflowFiles = files.filter(f => f.endsWith('.json'));
    
    for (const file of workflowFiles) {
      const workflowPath = path.join(flowsDir, file);
      await this.extractCode(workflowPath);
    }
    
    console.log(`✅ Extracted code from ${workflowFiles.length} workflows`);
  }
}

export { WorkflowDeployer, DeployConfig, WorkflowCompiler };