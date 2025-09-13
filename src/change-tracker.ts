/**
 * Change Tracker for McFlow Workflows
 * 
 * Tracks which workflows have been modified since last deployment
 * Works independently of git to track all changes made through McFlow
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

interface WorkflowState {
  path: string;
  hash: string;
  lastModified: string;
  deployed: boolean;
  deployedAt?: string;
  deployedHash?: string;
}

interface ChangeTrackerState {
  workflows: Record<string, WorkflowState>;
  lastCheck: string;
}

export class ChangeTracker {
  private stateFile: string;
  private workflowsPath: string;
  private state: ChangeTrackerState;

  constructor(workflowsPath: string) {
    this.workflowsPath = workflowsPath;
    this.stateFile = path.join(workflowsPath, '.mcflow', 'change-tracker.json');
    this.state = { workflows: {}, lastCheck: new Date().toISOString() };
  }

  /**
   * Initialize or load existing state
   */
  async initialize(): Promise<void> {
    try {
      // Ensure .mcflow directory exists
      const mcflowDir = path.dirname(this.stateFile);
      await fs.mkdir(mcflowDir, { recursive: true });

      // Try to load existing state
      try {
        const content = await fs.readFile(this.stateFile, 'utf-8');
        this.state = JSON.parse(content);
      } catch {
        // State file doesn't exist, use default
        await this.saveState();
      }
    } catch (error: any) {
      console.error('Failed to initialize change tracker:', error.message);
    }
  }

  /**
   * Save current state to file
   */
  private async saveState(): Promise<void> {
    try {
      await fs.writeFile(this.stateFile, JSON.stringify(this.state, null, 2));
    } catch (error: any) {
      console.error('Failed to save change tracker state:', error.message);
    }
  }

  /**
   * Calculate hash of a file
   */
  private async calculateFileHash(filePath: string): Promise<string> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return crypto.createHash('sha256').update(content).digest('hex');
    } catch {
      return '';
    }
  }

  /**
   * Scan workflows directory and update state
   */
  async scanWorkflows(): Promise<void> {
    const flowsDir = path.join(this.workflowsPath, 'workflows', 'flows');
    
    try {
      const files = await fs.readdir(flowsDir);
      const workflowFiles = files.filter(f => 
        f.endsWith('.json') && 
        !f.includes('package.json')
      );

      // Update state for each workflow
      for (const file of workflowFiles) {
        const filePath = path.join(flowsDir, file);
        const relativePath = path.relative(this.workflowsPath, filePath);
        const hash = await this.calculateFileHash(filePath);
        const stats = await fs.stat(filePath);
        
        if (!this.state.workflows[relativePath]) {
          // New workflow
          this.state.workflows[relativePath] = {
            path: relativePath,
            hash,
            lastModified: stats.mtime.toISOString(),
            deployed: false
          };
        } else {
          // Existing workflow - check if changed
          const existing = this.state.workflows[relativePath];
          if (existing.hash !== hash) {
            existing.hash = hash;
            existing.lastModified = stats.mtime.toISOString();
            existing.deployed = false; // Mark as needing deployment
          }
        }
      }

      // Remove deleted workflows from state
      const currentPaths = workflowFiles.map(f => 
        path.relative(this.workflowsPath, path.join(flowsDir, f))
      );
      
      for (const workflowPath of Object.keys(this.state.workflows)) {
        if (!currentPaths.includes(workflowPath)) {
          delete this.state.workflows[workflowPath];
        }
      }

      this.state.lastCheck = new Date().toISOString();
      await this.saveState();
    } catch (error: any) {
      console.error('Failed to scan workflows:', error.message);
    }
  }

  /**
   * Get list of changed workflows that need deployment
   */
  async getChangedWorkflows(): Promise<string[]> {
    await this.scanWorkflows();
    
    const changed: string[] = [];
    
    for (const [relativePath, workflow] of Object.entries(this.state.workflows)) {
      if (!workflow.deployed || workflow.hash !== workflow.deployedHash) {
        changed.push(relativePath);
      }
    }
    
    return changed;
  }

  /**
   * Mark workflow as deployed
   */
  async markDeployed(relativePath: string): Promise<void> {
    if (this.state.workflows[relativePath]) {
      this.state.workflows[relativePath].deployed = true;
      this.state.workflows[relativePath].deployedAt = new Date().toISOString();
      this.state.workflows[relativePath].deployedHash = this.state.workflows[relativePath].hash;
      await this.saveState();
    }
  }

  /**
   * Mark multiple workflows as deployed
   */
  async markMultipleDeployed(relativePaths: string[]): Promise<void> {
    for (const relativePath of relativePaths) {
      if (this.state.workflows[relativePath]) {
        this.state.workflows[relativePath].deployed = true;
        this.state.workflows[relativePath].deployedAt = new Date().toISOString();
        this.state.workflows[relativePath].deployedHash = this.state.workflows[relativePath].hash;
      }
    }
    await this.saveState();
  }

  /**
   * Mark workflow as edited (needs deployment)
   */
  async markEdited(relativePath: string): Promise<void> {
    await this.scanWorkflows(); // Rescan to get current hash
    
    if (this.state.workflows[relativePath]) {
      this.state.workflows[relativePath].deployed = false;
      await this.saveState();
    }
  }

  /**
   * Get deployment status for all workflows
   */
  async getDeploymentStatus(): Promise<{
    total: number;
    deployed: number;
    pending: number;
    workflows: Array<{
      name: string;
      path: string;
      status: 'deployed' | 'pending' | 'modified';
      lastModified: string;
      deployedAt?: string;
    }>;
  }> {
    await this.scanWorkflows();
    
    const workflows = [];
    let deployed = 0;
    let pending = 0;
    
    for (const [relativePath, workflow] of Object.entries(this.state.workflows)) {
      const name = path.basename(relativePath, '.json');
      
      let status: 'deployed' | 'pending' | 'modified';
      if (!workflow.deployed) {
        status = 'pending';
        pending++;
      } else if (workflow.hash !== workflow.deployedHash) {
        status = 'modified';
        pending++;
      } else {
        status = 'deployed';
        deployed++;
      }
      
      workflows.push({
        name,
        path: relativePath,
        status,
        lastModified: workflow.lastModified,
        deployedAt: workflow.deployedAt
      });
    }
    
    return {
      total: workflows.length,
      deployed,
      pending,
      workflows: workflows.sort((a, b) => a.name.localeCompare(b.name))
    };
  }

  /**
   * Reset deployment status (mark all as needing deployment)
   */
  async resetDeploymentStatus(): Promise<void> {
    for (const workflow of Object.values(this.state.workflows)) {
      workflow.deployed = false;
      delete workflow.deployedAt;
      delete workflow.deployedHash;
    }
    await this.saveState();
  }

  /**
   * Clear all tracking data
   */
  async clear(): Promise<void> {
    this.state = { workflows: {}, lastCheck: new Date().toISOString() };
    await this.saveState();
  }

  /**
   * Get detailed change information
   */
  async getChangeDetails(): Promise<string> {
    const status = await this.getDeploymentStatus();
    
    let output = '📊 Workflow Deployment Status\n\n';
    output += `Total Workflows: ${status.total}\n`;
    output += `✅ Deployed: ${status.deployed}\n`;
    output += `⏳ Pending: ${status.pending}\n\n`;
    
    if (status.pending > 0) {
      output += '📝 Workflows Needing Deployment:\n';
      for (const workflow of status.workflows) {
        if (workflow.status !== 'deployed') {
          const icon = workflow.status === 'modified' ? '📝' : '🆕';
          output += `  ${icon} ${workflow.name}\n`;
          output += `     Modified: ${new Date(workflow.lastModified).toLocaleString()}\n`;
          if (workflow.deployedAt) {
            output += `     Last deployed: ${new Date(workflow.deployedAt).toLocaleString()}\n`;
          }
        }
      }
      output += '\n💡 Run "McFlow deploy" to deploy pending changes\n';
    } else {
      output += '✨ All workflows are up to date!\n';
    }
    
    return output;
  }
}