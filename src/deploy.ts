#!/usr/bin/env node
import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { WorkflowCompiler } from './workflow-compiler.js';

interface DeployConfig {
  n8nUrl?: string;
  n8nApiKey?: string;
  dockerContainer?: string;
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
      dockerContainer: config.dockerContainer || 'n8n',
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
      // Try Docker deployment first
      execSync(`docker cp ${tempFile} ${this.config.dockerContainer}:/tmp/workflow.json`);
      execSync(`docker exec ${this.config.dockerContainer} n8n import:workflow --input=/tmp/workflow.json`);
      console.log('  ✓ Deployed via Docker container');
    } catch (error) {
      // Fall back to direct n8n CLI with the COMPILED workflow
      console.log('  → Docker deployment failed, trying direct n8n CLI...');
      try {
        // Note: Don't use --separate for single file imports
        execSync(`n8n import:workflow --input=${tempFile}`);
        console.log('  ✓ Deployed via n8n CLI');
      } catch (cliError) {
        console.error('  ❌ Both Docker and CLI deployment failed');
        throw cliError;
      }
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
    const flowsDir = path.join(this.config.workflowsPath!, 'workflows', 'flows');
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