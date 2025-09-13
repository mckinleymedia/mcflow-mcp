#!/usr/bin/env node
import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

interface DeployConfig {
  n8nUrl?: string;
  n8nApiKey?: string;
  dockerContainer?: string;
  useCloud?: boolean;
}

class WorkflowDeployer {
  private config: DeployConfig;
  
  constructor(config: DeployConfig = {}) {
    this.config = {
      n8nUrl: config.n8nUrl || process.env.N8N_API_URL || 'http://localhost:5678',
      n8nApiKey: config.n8nApiKey || process.env.N8N_API_KEY,
      dockerContainer: config.dockerContainer || 'n8n',
      useCloud: config.useCloud || false,
    };
  }
  
  async deployWorkflow(workflowPath: string): Promise<void> {
    try {
      const workflowContent = await fs.readFile(workflowPath, 'utf-8');
      const workflow = JSON.parse(workflowContent);
      
      if (this.config.useCloud && this.config.n8nApiKey) {
        await this.deployToCloud(workflow);
      } else {
        await this.deployToLocal(workflow, workflowPath);
      }
      
      console.log(`✅ Deployed workflow: ${workflow.name}`);
    } catch (error) {
      console.error(`❌ Failed to deploy workflow: ${error}`);
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
    const tempFile = `/tmp/workflow_${Date.now()}.json`;
    await fs.writeFile(tempFile, JSON.stringify(workflow, null, 2));
    
    try {
      execSync(`docker cp ${tempFile} ${this.config.dockerContainer}:/tmp/workflow.json`);
      execSync(`docker exec ${this.config.dockerContainer} n8n import:workflow --input=/tmp/workflow.json`);
    } catch (error) {
      console.log('Docker deployment failed, trying direct n8n CLI...');
      execSync(`n8n import:workflow --input=${workflowPath}`);
    } finally {
      await fs.unlink(tempFile).catch(() => {});
    }
  }
  
  async deployProject(projectPath: string): Promise<void> {
    const workflowsDir = path.join(projectPath, 'workflows');
    const files = await fs.readdir(workflowsDir);
    
    const configFiles = files.filter(f => f.includes('config'));
    const mainFiles = files.filter(f => f.includes('main') || f.includes('master'));
    const otherFiles = files.filter(f => !configFiles.includes(f) && !mainFiles.includes(f));
    
    const deployOrder = [...configFiles, ...otherFiles, ...mainFiles];
    
    for (const file of deployOrder) {
      if (file.endsWith('.json')) {
        await this.deployWorkflow(path.join(workflowsDir, file));
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
}

export { WorkflowDeployer, DeployConfig };