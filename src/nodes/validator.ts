/**
 * Node Validator for n8n Workflows
 * 
 * Ensures nodes are compatible with current n8n version
 * and properly handle inputs/outputs
 * 
 * IMPORTANT: Only REAL n8n nodes are allowed. No mock or placeholder nodes.
 * All nodes must be actual n8n node types that will execute properly.
 */

import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';
import { LLMValidator } from './llm-validator.js';
import { BestNodeSelector } from './selector.js';

interface NodeIssue {
  nodeId: string;
  nodeName: string;
  type: 'error' | 'warning';
  message: string;
  fix?: string;
}

interface NodeValidationResult {
  valid: boolean;
  issues: NodeIssue[];
  suggestions: string[];
}

export class NodeValidator {
  private n8nVersion: string;
  private workflowsPath: string;
  private llmValidator: LLMValidator;
  private bestNodeSelector: BestNodeSelector;

  constructor(workflowsPath: string) {
    this.workflowsPath = workflowsPath;
    this.n8nVersion = this.getN8nVersion();
    this.llmValidator = new LLMValidator();
    this.bestNodeSelector = new BestNodeSelector();
  }

  private getN8nVersion(): string {
    try {
      return execSync('n8n --version', { encoding: 'utf-8' }).trim();
    } catch {
      return '1.108.2'; // Fallback to current version
    }
  }

  /**
   * Validate all nodes in a workflow
   */
  async validateWorkflow(workflowPath: string): Promise<NodeValidationResult> {
    const content = await fs.readFile(workflowPath, 'utf-8');
    const workflow = JSON.parse(content);
    const issues: NodeIssue[] = [];
    const suggestions: string[] = [];

    if (!workflow.nodes || !Array.isArray(workflow.nodes)) {
      return {
        valid: false,
        issues: [{
          nodeId: 'workflow',
          nodeName: 'Workflow',
          type: 'error',
          message: 'No nodes found in workflow'
        }],
        suggestions: []
      };
    }

    // Check each node
    for (const node of workflow.nodes) {
      const nodeIssues = await this.validateNode(node, workflow);
      issues.push(...nodeIssues);
    }

    // Check connections
    const connectionIssues = this.validateConnections(workflow);
    issues.push(...connectionIssues);

    // Generate suggestions
    if (issues.length > 0) {
      suggestions.push('Run "McFlow validate --fix" to automatically fix common issues');
      if (issues.some(i => i.message.includes('deprecated'))) {
        suggestions.push('Some nodes use deprecated features. Consider updating to newer node versions.');
      }
    }

    return {
      valid: issues.filter(i => i.type === 'error').length === 0,
      issues,
      suggestions
    };
  }

  /**
   * Validate individual node
   */
  private async validateNode(node: any, workflow: any): Promise<NodeIssue[]> {
    const issues: NodeIssue[] = [];

    // Check node has required fields
    if (!node.type) {
      issues.push({
        nodeId: node.id || 'unknown',
        nodeName: node.name || 'Unknown Node',
        type: 'error',
        message: 'Node missing type field'
      });
    }

    // CRITICAL: Reject mock/placeholder nodes
    const invalidNodeTypes = [
      'mock', 'placeholder', 'dummy', 'test', 'fake', 'example', 'sample', 'todo'
    ];
    
    if (node.type && invalidNodeTypes.some(invalid => node.type.toLowerCase().includes(invalid))) {
      issues.push({
        nodeId: node.id || 'unknown',
        nodeName: node.name || 'Unknown Node',
        type: 'error',
        message: `Invalid node type: ${node.type}. Only real n8n nodes are allowed. No mock or placeholder nodes.`,
        fix: 'Replace with an actual n8n node type (e.g., n8n-nodes-base.httpRequest, n8n-nodes-base.code, etc.)'
      });
      return issues; // Don't validate further if it's a mock node
    }

    // Ensure node type follows n8n naming convention
    if (node.type && !node.type.startsWith('n8n-nodes-')) {
      // Allow some special cases
      const allowedPrefixes = ['@n8n/', 'n8n-nodes-', '@n8n_io/'];
      const isValid = allowedPrefixes.some(prefix => node.type.startsWith(prefix));
      
      if (!isValid) {
        issues.push({
          nodeId: node.id || 'unknown',
          nodeName: node.name || 'Unknown Node',
          type: 'error',
          message: `Invalid node type format: ${node.type}. Must be a real n8n node (e.g., n8n-nodes-base.httpRequest)`,
          fix: 'Use a valid n8n node type. Check https://docs.n8n.io/integrations/ for available nodes'
        });
      }
    }

    if (!node.typeVersion) {
      issues.push({
        nodeId: node.id || 'unknown',
        nodeName: node.name || 'Unknown Node',
        type: 'warning',
        message: 'Node missing typeVersion field',
        fix: 'Add typeVersion based on node type'
      });
    }

    // Validate specific node types
    switch (node.type) {
      case 'n8n-nodes-base.merge':
      case 'n8n-nodes-base.mergeV2':
      case 'n8n-nodes-base.mergeV3':
        issues.push(...this.validateMergeNode(node));
        break;

      case 'n8n-nodes-base.httpRequest':
        issues.push(...this.validateHttpNode(node));
        // Check if should use dedicated service node
        const recommendation = this.bestNodeSelector.checkNode(node);
        if (recommendation) {
          issues.push({
            nodeId: node.id || node.name,
            nodeName: node.name,
            type: 'warning',
            message: `Should use dedicated ${recommendation.recommendedType} node instead of HTTP Request`,
            fix: recommendation.reason
          });
        }
        break;

      case 'n8n-nodes-base.code':
        issues.push(...this.validateCodeNode(node));
        break;

      case 'n8n-nodes-base.if':
      case 'n8n-nodes-base.switch':
        issues.push(...this.validateConditionalNode(node));
        break;

      case 'n8n-nodes-base.split':
      case 'n8n-nodes-base.splitInBatches':
        issues.push(...this.validateSplitNode(node));
        break;

      case 'n8n-nodes-base.loop':
      case 'n8n-nodes-base.loopV2':
        issues.push(...this.validateLoopNode(node));
        break;
      
      // Validate LLM/AI nodes
      case 'n8n-nodes-base.openAi':
      case '@n8n/n8n-nodes-langchain.openAi':
      case 'n8n-nodes-base.anthropic':
      case '@n8n/n8n-nodes-langchain.anthropic':
      case 'n8n-nodes-base.googleAi':
      case '@n8n/n8n-nodes-langchain.googleAi':
      case 'n8n-nodes-base.cohere':
      case 'n8n-nodes-base.replicate':
        const llmIssues = this.llmValidator.validateLLMNode(node);
        for (const llmIssue of llmIssues) {
          issues.push({
            nodeId: node.id || node.name,
            nodeName: node.name,
            type: 'error',
            message: `LLM Parameter Error - ${llmIssue.parameter}: ${llmIssue.issue}`,
            fix: llmIssue.fix
          });
        }
        break;
    }

    // Check for common issues
    issues.push(...this.checkCommonIssues(node));

    return issues;
  }

  /**
   * Validate Merge nodes specifically
   */
  private validateMergeNode(node: any): NodeIssue[] {
    const issues: NodeIssue[] = [];

    // Check for multiplex mode issue
    if (node.parameters?.mode === 'multiplex') {
      issues.push({
        nodeId: node.id,
        nodeName: node.name,
        type: 'error',
        message: 'Merge node uses multiplex mode which often outputs empty data',
        fix: 'Change to combine mode with mergeByPosition'
      });
    }

    // For newer merge versions
    if (node.type === 'n8n-nodes-base.mergeV2' || node.type === 'n8n-nodes-base.mergeV3') {
      if (!node.parameters?.mode) {
        issues.push({
          nodeId: node.id,
          nodeName: node.name,
          type: 'error',
          message: 'Merge node missing mode parameter',
          fix: 'Set mode to "combine" or "append"'
        });
      }

      // Check for proper options based on mode
      if (node.parameters?.mode === 'combine' && !node.parameters?.options?.mergeByPosition) {
        issues.push({
          nodeId: node.id,
          nodeName: node.name,
          type: 'warning',
          message: 'Combine mode should specify mergeByPosition option',
          fix: 'Add options.mergeByPosition.values = ["0"]'
        });
      }
    }

    // Check typeVersion compatibility
    if (node.type === 'n8n-nodes-base.merge' && (!node.typeVersion || node.typeVersion < 2)) {
      issues.push({
        nodeId: node.id,
        nodeName: node.name,
        type: 'warning',
        message: 'Using old Merge node version. Consider upgrading to mergeV3',
        fix: 'Update to n8n-nodes-base.mergeV3 with typeVersion 1'
      });
    }

    return issues;
  }

  /**
   * Validate HTTP Request nodes
   */
  private validateHttpNode(node: any): NodeIssue[] {
    const issues: NodeIssue[] = [];

    if (!node.parameters?.method) {
      issues.push({
        nodeId: node.id,
        nodeName: node.name,
        type: 'error',
        message: 'HTTP Request node missing method',
        fix: 'Set method to GET, POST, etc.'
      });
    }

    if (!node.parameters?.url) {
      issues.push({
        nodeId: node.id,
        nodeName: node.name,
        type: 'error',
        message: 'HTTP Request node missing URL',
        fix: 'Add URL parameter'
      });
    }

    // Check for authentication
    if (node.parameters?.authentication && !node.credentials) {
      issues.push({
        nodeId: node.id,
        nodeName: node.name,
        type: 'warning',
        message: 'Authentication specified but no credentials configured'
      });
    }

    return issues;
  }

  /**
   * Validate Code nodes
   */
  private validateCodeNode(node: any): NodeIssue[] {
    const issues: NodeIssue[] = [];

    if (!node.parameters?.jsCode && !node.parameters?.pythonCode) {
      issues.push({
        nodeId: node.id,
        nodeName: node.name,
        type: 'error',
        message: 'Code node has no code',
        fix: 'Add jsCode or pythonCode parameter'
      });
    }

    // Check for common code issues
    const code = node.parameters?.jsCode || node.parameters?.pythonCode || '';
    
    // Check for proper return statement
    if (code && !code.includes('return')) {
      issues.push({
        nodeId: node.id,
        nodeName: node.name,
        type: 'warning',
        message: 'Code node may not return data properly',
        fix: 'Ensure code returns items array'
      });
    }

    // Check for $input usage in newer versions
    if (code.includes('$items') && this.n8nVersion >= '1.0.0') {
      issues.push({
        nodeId: node.id,
        nodeName: node.name,
        type: 'warning',
        message: 'Using deprecated $items. Use $input.all() instead',
        fix: 'Replace $items with $input.all()'
      });
    }

    return issues;
  }

  /**
   * Validate conditional nodes (IF, Switch)
   */
  private validateConditionalNode(node: any): NodeIssue[] {
    const issues: NodeIssue[] = [];

    if (node.type === 'n8n-nodes-base.if') {
      if (!node.parameters?.conditions) {
        issues.push({
          nodeId: node.id,
          nodeName: node.name,
          type: 'error',
          message: 'IF node missing conditions',
          fix: 'Add at least one condition'
        });
      }
    }

    if (node.type === 'n8n-nodes-base.switch') {
      if (!node.parameters?.rules) {
        issues.push({
          nodeId: node.id,
          nodeName: node.name,
          type: 'error',
          message: 'Switch node missing rules',
          fix: 'Add routing rules'
        });
      }
    }

    return issues;
  }

  /**
   * Validate Split nodes
   */
  private validateSplitNode(node: any): NodeIssue[] {
    const issues: NodeIssue[] = [];

    if (node.type === 'n8n-nodes-base.splitInBatches') {
      if (!node.parameters?.batchSize || node.parameters.batchSize <= 0) {
        issues.push({
          nodeId: node.id,
          nodeName: node.name,
          type: 'error',
          message: 'Split In Batches node has invalid batch size',
          fix: 'Set batchSize to a positive number'
        });
      }
    }

    return issues;
  }

  /**
   * Validate Loop nodes
   */
  private validateLoopNode(node: any): NodeIssue[] {
    const issues: NodeIssue[] = [];

    // Check for infinite loop risk
    if (!node.parameters?.maxIterations || node.parameters.maxIterations > 10000) {
      issues.push({
        nodeId: node.id,
        nodeName: node.name,
        type: 'warning',
        message: 'Loop node may cause infinite loop',
        fix: 'Set reasonable maxIterations limit'
      });
    }

    return issues;
  }

  /**
   * Check for common issues across all node types
   */
  private checkCommonIssues(node: any): NodeIssue[] {
    const issues: NodeIssue[] = [];

    // Check for missing position (UI issue)
    if (!node.position || typeof node.position.x !== 'number' || typeof node.position.y !== 'number') {
      issues.push({
        nodeId: node.id,
        nodeName: node.name,
        type: 'warning',
        message: 'Node missing position coordinates',
        fix: 'Add position: [x, y]'
      });
    }

    // Check for disabled nodes
    if (node.disabled === true) {
      issues.push({
        nodeId: node.id,
        nodeName: node.name,
        type: 'warning',
        message: 'Node is disabled and will not execute'
      });
    }

    // Check for missing name
    if (!node.name) {
      issues.push({
        nodeId: node.id,
        nodeName: 'Unknown',
        type: 'error',
        message: 'Node missing name field'
      });
    }

    // Check for deprecated node versions
    const deprecatedNodes = [
      'n8n-nodes-base.merge',  // Use mergeV3 instead
      'n8n-nodes-base.httpRequestV1',  // Use httpRequest instead
      'n8n-nodes-base.ifV1',  // Use if instead
      'n8n-nodes-base.switchV1',  // Use switch instead
    ];

    if (deprecatedNodes.includes(node.type)) {
      const newType = node.type.replace('V1', '').replace('merge', 'mergeV3');
      issues.push({
        nodeId: node.id,
        nodeName: node.name,
        type: 'warning',
        message: `Node type ${node.type} is deprecated`,
        fix: `Update to ${newType}`
      });
    }

    return issues;
  }

  /**
   * Validate workflow connections
   */
  private validateConnections(workflow: any): NodeIssue[] {
    const issues: NodeIssue[] = [];
    
    if (!workflow.connections) {
      return issues;
    }

    const nodeIds = new Set(workflow.nodes.map((n: any) => n.name));
    
    // Check each connection
    for (const [sourceName, outputs] of Object.entries(workflow.connections)) {
      if (!nodeIds.has(sourceName)) {
        issues.push({
          nodeId: sourceName,
          nodeName: sourceName,
          type: 'error',
          message: `Connection from non-existent node: ${sourceName}`
        });
        continue;
      }

      if (!outputs || typeof outputs !== 'object') continue;

      // Check main output connections
      const mainOutputs = (outputs as any).main;
      if (Array.isArray(mainOutputs)) {
        mainOutputs.forEach((outputConnections, outputIndex) => {
          if (Array.isArray(outputConnections)) {
            outputConnections.forEach(conn => {
              if (!nodeIds.has(conn.node)) {
                issues.push({
                  nodeId: sourceName,
                  nodeName: sourceName,
                  type: 'error',
                  message: `Connection to non-existent node: ${conn.node}`
                });
              }
            });
          }
        });
      }
    }

    // Check for nodes with no incoming connections (except start nodes)
    const nodesWithIncoming = new Set<string>();
    for (const [, outputs] of Object.entries(workflow.connections)) {
      const mainOutputs = (outputs as any).main;
      if (Array.isArray(mainOutputs)) {
        mainOutputs.forEach((outputConnections: any[]) => {
          if (Array.isArray(outputConnections)) {
            outputConnections.forEach(conn => {
              nodesWithIncoming.add(conn.node);
            });
          }
        });
      }
    }

    workflow.nodes.forEach((node: any) => {
      const isStartNode = node.type?.includes('trigger') || 
                         node.type?.includes('webhook') || 
                         node.type === 'n8n-nodes-base.manualTrigger' ||
                         node.type === 'n8n-nodes-base.start';
      
      if (!isStartNode && !nodesWithIncoming.has(node.name) && !node.disabled) {
        issues.push({
          nodeId: node.id || node.name,
          nodeName: node.name,
          type: 'warning',
          message: 'Node has no incoming connections',
          fix: 'Connect this node or mark as disabled'
        });
      }
    });

    return issues;
  }

  /**
   * Auto-fix common issues
   */
  async autoFixWorkflow(workflowPath: string): Promise<{ fixed: boolean; changes: string[] }> {
    const content = await fs.readFile(workflowPath, 'utf-8');
    const workflow = JSON.parse(content);
    const changes: string[] = [];
    let modified = false;

    for (const node of workflow.nodes) {
      // Fix merge node multiplex issue
      if ((node.type === 'n8n-nodes-base.merge' || node.type === 'n8n-nodes-base.mergeV2' || node.type === 'n8n-nodes-base.mergeV3') 
          && node.parameters?.mode === 'multiplex') {
        node.parameters.mode = 'combine';
        node.parameters.options = {
          mergeByPosition: {
            values: ['0']
          }
        };
        changes.push(`Fixed ${node.name}: Changed multiplex to combine mode`);
        modified = true;
      }

      // Add missing typeVersion
      if (!node.typeVersion) {
        switch (node.type) {
          case 'n8n-nodes-base.httpRequest':
            node.typeVersion = 4.2;
            break;
          case 'n8n-nodes-base.code':
            node.typeVersion = 2;
            break;
          case 'n8n-nodes-base.mergeV3':
            node.typeVersion = 1;
            break;
          default:
            node.typeVersion = 1;
        }
        changes.push(`Fixed ${node.name}: Added typeVersion ${node.typeVersion}`);
        modified = true;
      }

      // Fix deprecated $items in code nodes
      if (node.type === 'n8n-nodes-base.code' && node.parameters?.jsCode) {
        const oldCode = node.parameters.jsCode;
        const newCode = oldCode.replace(/\$items/g, '$input.all()');
        if (oldCode !== newCode) {
          node.parameters.jsCode = newCode;
          changes.push(`Fixed ${node.name}: Updated code to use $input.all()`);
          modified = true;
        }
      }

      // Add missing position
      if (!node.position) {
        const index = workflow.nodes.indexOf(node);
        node.position = [250 + (index * 150), 250];
        changes.push(`Fixed ${node.name}: Added position coordinates`);
        modified = true;
      }

      // Update deprecated node types
      const deprecatedMap: Record<string, string> = {
        'n8n-nodes-base.merge': 'n8n-nodes-base.mergeV3',
        'n8n-nodes-base.httpRequestV1': 'n8n-nodes-base.httpRequest',
        'n8n-nodes-base.ifV1': 'n8n-nodes-base.if',
        'n8n-nodes-base.switchV1': 'n8n-nodes-base.switch',
      };

      if (deprecatedMap[node.type]) {
        const oldType = node.type;
        node.type = deprecatedMap[oldType];
        node.typeVersion = 1;
        changes.push(`Fixed ${node.name}: Updated from ${oldType} to ${node.type}`);
        modified = true;
      }
      
      // Auto-convert HTTP nodes to dedicated service nodes
      if (node.type === 'n8n-nodes-base.httpRequest') {
        const recommendation = this.bestNodeSelector.checkNode(node);
        if (recommendation) {
          const convertedNode = this.bestNodeSelector.convertToServiceNode(node, recommendation);
          Object.assign(node, convertedNode);
          changes.push(`Fixed ${node.name}: Converted HTTP Request to ${recommendation.recommendedType}`);
          modified = true;
        }
      }
      
      // Auto-fix LLM parameters
      const llmNodeTypes = [
        'n8n-nodes-base.openAi',
        '@n8n/n8n-nodes-langchain.openAi',
        'n8n-nodes-base.anthropic',
        '@n8n/n8n-nodes-langchain.anthropic',
        'n8n-nodes-base.googleAi',
        '@n8n/n8n-nodes-langchain.googleAi',
        'n8n-nodes-base.cohere',
        'n8n-nodes-base.replicate'
      ];
      
      if (llmNodeTypes.includes(node.type)) {
        const llmFixed = this.llmValidator.autoFixLLMParameters(node);
        if (llmFixed) {
          changes.push(`Fixed ${node.name}: Corrected LLM parameters for ${node.type}`);
          modified = true;
        }
      }
    }

    if (modified) {
      await fs.writeFile(workflowPath, JSON.stringify(workflow, null, 2));
    }

    return {
      fixed: modified,
      changes
    };
  }

  /**
   * Validate all workflows in the project
   */
  async validateAllWorkflows(): Promise<any> {
    const flowsDir = path.join(this.workflowsPath, 'workflows', 'flows');
    const files = await fs.readdir(flowsDir);
    const results: any[] = [];

    for (const file of files) {
      if (!file.endsWith('.json') || file === 'package.json') continue;
      
      const filePath = path.join(flowsDir, file);
      const validation = await this.validateWorkflow(filePath);
      
      results.push({
        workflow: file.replace('.json', ''),
        ...validation
      });
    }

    // Calculate best practices score
    let totalScore = 0;
    let workflowCount = 0;
    
    for (const file of files) {
      if (!file.endsWith('.json') || file === 'package.json') continue;
      workflowCount++;
      const filePath = path.join(flowsDir, file);
      const content = await fs.readFile(filePath, 'utf-8');
      const workflow = JSON.parse(content);
      const { score } = this.bestNodeSelector.analyzeWorkflow(workflow);
      totalScore += score;
    }
    
    const avgScore = workflowCount > 0 ? Math.round(totalScore / workflowCount) : 100;
    
    // Format output
    let output = `🔍 Workflow Validation Report (n8n v${this.n8nVersion})\n\n`;
    
    const totalIssues = results.reduce((sum, r) => sum + r.issues.length, 0);
    const errors = results.reduce((sum, r) => sum + r.issues.filter((i: any) => i.type === 'error').length, 0);
    const warnings = results.reduce((sum, r) => sum + r.issues.filter((i: any) => i.type === 'warning').length, 0);
    
    output += `📊 Summary:\n`;
    output += `• Workflows checked: ${results.length}\n`;
    output += `• Total issues: ${totalIssues}\n`;
    output += `• Errors: ${errors}\n`;
    output += `• Warnings: ${warnings}\n`;
    output += `• Best Practices Score: ${avgScore}% ${avgScore >= 80 ? '✅' : avgScore >= 60 ? '⚠️' : '❌'}\n\n`;

    for (const result of results) {
      if (result.issues.length === 0) {
        output += `✅ ${result.workflow}: Valid\n`;
      } else {
        output += `${result.valid ? '⚠️' : '❌'} ${result.workflow}: ${result.issues.length} issue(s)\n`;
        
        for (const issue of result.issues) {
          const icon = issue.type === 'error' ? '  ❌' : '  ⚠️';
          output += `${icon} [${issue.nodeName}] ${issue.message}\n`;
          if (issue.fix) {
            output += `     → Fix: ${issue.fix}\n`;
          }
        }
        output += '\n';
      }
    }

    if (totalIssues > 0) {
      output += '💡 Suggestions:\n';
      output += '• Run "McFlow validate --fix" to auto-fix common issues\n';
      output += '• Check node documentation at https://docs.n8n.io/integrations/\n';
      output += '• Test workflows after fixes to ensure proper data flow\n';
    }

    return {
      content: [{
        type: 'text',
        text: output
      }]
    };
  }
}