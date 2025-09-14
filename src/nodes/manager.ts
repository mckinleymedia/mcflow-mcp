/**
 * Node Manager for McFlow
 *
 * Manages different types of nodes as separate files for better readability and editing:
 * - Code nodes (JavaScript/Python) → workflows/nodes/code/
 * - LLM prompts (Markdown) → workflows/nodes/prompts/
 * - SQL queries → workflows/nodes/sql/
 * - Templates → workflows/nodes/templates/
 * - Shared modules → workflows/nodes/shared/
 *
 * During deployment, content is injected back into workflows.
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

type NodeType = 'code' | 'prompt' | 'sql' | 'template';

interface ExtractedNode {
  nodeId: string;
  nodeName: string;
  nodeType: NodeType;
  subType?: string; // e.g., 'javascript', 'python', 'openai', 'anthropic'
  filePath: string;
  hash?: string;
}

interface NodeMetadata {
  workflowName: string;
  nodeId: string;
  nodeName: string;
  nodeType: NodeType;
  subType?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export class NodeManager {
  private workflowsPath: string;
  private nodesBasePath: string;
  private metadataFile: string;

  constructor(workflowsPath: string) {
    this.workflowsPath = workflowsPath;
    this.nodesBasePath = path.join(workflowsPath, 'nodes');
    this.metadataFile = path.join(this.nodesBasePath, '.metadata.json');
  }

  /**
   * Initialize the nodes directory structure
   */
  async initialize(): Promise<void> {
    // Don't create directories preemptively - they'll be created as needed
    // when extracting nodes. This keeps the project cleaner.
    // README is no longer created here - all documentation is in workflows/README.md
  }

  /**
   * Extract all extractable nodes from a workflow
   */
  async extractNodes(workflowPath: string): Promise<{
    extracted: ExtractedNode[];
    modified: boolean;
  }> {
    const content = await fs.readFile(workflowPath, 'utf-8');
    const workflow = JSON.parse(content);
    const workflowName = path.basename(workflowPath, '.json');
    
    const extracted: ExtractedNode[] = [];
    let modified = false;

    if (!workflow.nodes) {
      return { extracted, modified };
    }

    for (const node of workflow.nodes) {
      let result: ExtractedNode | null = null;
      
      // Check node type and extract accordingly
      switch (node.type) {
        case 'n8n-nodes-base.code':
          result = await this.extractCodeNode(node, workflowName);
          break;
        
        case 'n8n-nodes-base.openAi':
        case '@n8n/n8n-nodes-langchain.openAi':
        case 'n8n-nodes-base.anthropic':
        case '@n8n/n8n-nodes-langchain.anthropic':
        case 'n8n-nodes-base.googleAi':
        case '@n8n/n8n-nodes-langchain.googleAi':
          result = await this.extractLLMNode(node, workflowName);
          break;
        
        case 'n8n-nodes-base.postgres':
        case 'n8n-nodes-base.mysql':
        case 'n8n-nodes-base.microsoftSql':
          result = await this.extractSQLNode(node, workflowName);
          break;
        
        case 'n8n-nodes-base.html':
        case 'n8n-nodes-base.emailSend':
          result = await this.extractTemplateNode(node, workflowName);
          break;
      }
      
      if (result) {
        extracted.push(result);
        modified = true;
      }
    }

    if (modified) {
      // Save modified workflow with references
      await fs.writeFile(workflowPath, JSON.stringify(workflow, null, 2));
    }

    // Update metadata
    await this.updateMetadata(workflowName, extracted);

    return { extracted, modified };
  }

  /**
   * Extract code node
   */
  private async extractCodeNode(node: any, workflowName: string): Promise<ExtractedNode | null> {
    // Check for Python in either mode or language parameter
    const language = (node.parameters?.mode === 'python' || node.parameters?.language === 'python') 
      ? 'python' 
      : 'javascript';
    const code = language === 'python' 
      ? node.parameters?.pythonCode 
      : node.parameters?.jsCode;

    // Check if already extracted
    if (!code || code === '' || node.parameters._nodeFile) {
      return null;
    }

    const safeNodeName = this.sanitizeFilename(node.name);
    const extension = language === 'python' ? 'py' : 'js';
    const fileName = `${safeNodeName}.${extension}`;
    const folderPath = path.join(this.nodesBasePath, 'code', workflowName);

    const filePath = path.join(folderPath, fileName);

    // Ensure directory exists (created only when needed)
    await fs.mkdir(folderPath, { recursive: true });

    // Write code with header
    const header = this.generateHeader('code', node.name, workflowName, language);
    await fs.writeFile(filePath, header + code);
    
    // Clear code content and store file reference
    const relativeFilePath = path.relative(this.workflowsPath, filePath);
    if (language === 'python') {
      node.parameters.pythonCode = '';
    } else {
      node.parameters.jsCode = '';
    }
    node.parameters._nodeFile = relativeFilePath;
    
    return {
      nodeId: node.id || node.name,
      nodeName: node.name,
      nodeType: 'code',
      subType: language,
      filePath: relativeFilePath,
      hash: this.hashContent(code)
    };
  }

  /**
   * Extract LLM prompt node
   */
  private async extractLLMNode(node: any, workflowName: string): Promise<ExtractedNode | null> {
    // Find the prompt in various parameter locations
    let prompt = null;
    let promptType = 'text';
    
    // Check different prompt locations based on node type
    if (node.parameters?.prompt) {
      prompt = node.parameters.prompt;
    } else if (node.parameters?.messages?.length > 0) {
      // For chat models, extract system and user messages
      const messages = node.parameters.messages;
      prompt = messages.map((m: any) => `### ${m.role}\n${m.content}`).join('\n\n');
      promptType = 'chat';
    } else if (node.parameters?.text) {
      prompt = node.parameters.text;
    }

    // Check if already extracted
    if (!prompt || typeof prompt !== 'string' || prompt === '' || node.parameters._nodeFile) {
      return null;
    }

    const safeNodeName = this.sanitizeFilename(node.name);
    const fileName = `${safeNodeName}.md`; // Use markdown for better formatting
    const folderPath = path.join(this.nodesBasePath, 'prompts', workflowName);

    const filePath = path.join(folderPath, fileName);

    // Ensure directory exists (created only when needed)
    await fs.mkdir(folderPath, { recursive: true });
    
    // Determine AI provider
    const provider = this.getAIProvider(node.type);
    
    // Write prompt with metadata header
    const header = `---
node: ${node.name}
workflow: ${workflowName}
provider: ${provider}
type: ${promptType}
model: ${node.parameters?.model || 'default'}
temperature: ${node.parameters?.temperature || node.parameters?.options?.temperature || 'default'}
---

`;
    
    await fs.writeFile(filePath, header + prompt);
    
    // Clear prompt content and store file reference
    const relativeFilePath = path.relative(this.workflowsPath, filePath);
    if (node.parameters.prompt !== undefined) {
      node.parameters.prompt = '';
    } else if (node.parameters.messages) {
      // Clear message content
      node.parameters.messages = [];
    } else if (node.parameters.text !== undefined) {
      node.parameters.text = '';
    }
    node.parameters._nodeFile = relativeFilePath;
    
    return {
      nodeId: node.id || node.name,
      nodeName: node.name,
      nodeType: 'prompt',
      subType: provider,
      filePath: relativeFilePath,
      hash: this.hashContent(prompt)
    };
  }

  /**
   * Extract SQL node
   */
  private async extractSQLNode(node: any, workflowName: string): Promise<ExtractedNode | null> {
    const query = node.parameters?.query;
    
    // Check if already extracted
    if (!query || query === '' || node.parameters._nodeFile) {
      return null;
    }

    const safeNodeName = this.sanitizeFilename(node.name);
    const fileName = `${safeNodeName}.sql`;
    const folderPath = path.join(this.nodesBasePath, 'sql', workflowName);
    await fs.mkdir(folderPath, { recursive: true });
    
    const filePath = path.join(folderPath, fileName);
    
    // Write SQL with header
    const header = `-- Node: ${node.name}
-- Workflow: ${workflowName}
-- Database: ${node.type.split('.').pop()}
-- Operation: ${node.parameters?.operation || 'SELECT'}
-- Generated by McFlow
--${'-'.repeat(50)}

`;
    
    await fs.writeFile(filePath, header + query);
    
    // Clear query content and store file reference
    const relativeFilePath = path.relative(this.workflowsPath, filePath);
    node.parameters.query = '';
    node.parameters._nodeFile = relativeFilePath;
    
    return {
      nodeId: node.id || node.name,
      nodeName: node.name,
      nodeType: 'sql',
      subType: node.type.split('.').pop(),
      filePath: relativeFilePath,
      hash: this.hashContent(query)
    };
  }

  /**
   * Extract template node
   */
  private async extractTemplateNode(node: any, workflowName: string): Promise<ExtractedNode | null> {
    const html = node.parameters?.html || node.parameters?.text;
    
    // Check if already extracted
    if (!html || html === '' || node.parameters._nodeFile) {
      return null;
    }

    const safeNodeName = this.sanitizeFilename(node.name);
    const isHtml = node.parameters?.html !== undefined;
    const fileName = `${safeNodeName}.${isHtml ? 'html' : 'txt'}`;
    const folderPath = path.join(this.nodesBasePath, 'templates', workflowName);
    await fs.mkdir(folderPath, { recursive: true });
    
    const filePath = path.join(folderPath, fileName);
    
    // Write template with header
    const header = isHtml 
      ? `<!-- 
  Node: ${node.name}
  Workflow: ${workflowName}
  Type: ${node.type}
  Generated by McFlow
-->

`
      : `# Node: ${node.name}
# Workflow: ${workflowName}
# Type: ${node.type}
# Generated by McFlow
#${'-'.repeat(50)}

`;
    
    await fs.writeFile(filePath, header + html);
    
    // Clear template content and store file reference
    const relativeFilePath = path.relative(this.workflowsPath, filePath);
    if (node.parameters.html) {
      node.parameters.html = '';
    } else if (node.parameters.text) {
      node.parameters.text = '';
    }
    node.parameters._nodeFile = relativeFilePath;
    
    return {
      nodeId: node.id || node.name,
      nodeName: node.name,
      nodeType: 'template',
      subType: isHtml ? 'html' : 'text',
      filePath: relativeFilePath,
      hash: this.hashContent(html)
    };
  }

  /**
   * Inject all node content back for deployment
   */
  async injectNodes(workflowPath: string): Promise<{
    injected: string[];
    workflow: any;
  }> {
    const content = await fs.readFile(workflowPath, 'utf-8');
    const workflow = JSON.parse(content);
    const injected: string[] = [];

    if (!workflow.nodes) {
      return { injected, workflow };
    }

    for (const node of workflow.nodes) {
      if (node.parameters?._nodeFile) {
        const nodeFilePath = path.join(this.workflowsPath, node.parameters._nodeFile);
        
        try {
          let fileContent = await fs.readFile(nodeFilePath, 'utf-8');
          
          // Determine node type from file path
          const nodeType = this.getNodeTypeFromPath(node.parameters._nodeFile);
          
          // Remove headers based on type
          fileContent = this.removeHeader(fileContent, nodeType, nodeFilePath);
          
          // Inject content back based on node type
          switch (node.type) {
            case 'n8n-nodes-base.code':
              const isPython = nodeFilePath.endsWith('.py');
              if (isPython) {
                node.parameters.pythonCode = fileContent;
              } else {
                node.parameters.jsCode = fileContent;
              }
              break;
            
            case 'n8n-nodes-base.openAi':
            case '@n8n/n8n-nodes-langchain.openAi':
            case 'n8n-nodes-base.anthropic':
            case '@n8n/n8n-nodes-langchain.anthropic':
            case 'n8n-nodes-base.googleAi':
            case '@n8n/n8n-nodes-langchain.googleAi':
              // Restore prompt
              if (node.parameters._promptFile) {
                // For chat models, need to parse back to messages
                // For now, just restore as prompt
                node.parameters.prompt = fileContent;
                delete node.parameters._promptFile;
              } else {
                node.parameters.prompt = fileContent;
              }
              break;
            
            case 'n8n-nodes-base.postgres':
            case 'n8n-nodes-base.mysql':
            case 'n8n-nodes-base.microsoftSql':
              node.parameters.query = fileContent;
              break;
            
            case 'n8n-nodes-base.html':
            case 'n8n-nodes-base.emailSend':
              if (nodeFilePath.endsWith('.html')) {
                node.parameters.html = fileContent;
              } else {
                node.parameters.text = fileContent;
              }
              break;
          }
          
          // Remove file reference
          delete node.parameters._nodeFile;
          
          injected.push(node.name);
        } catch (error: any) {
          console.error(`Failed to inject node ${node.name}: ${error.message}`);
        }
      }
    }

    return { injected, workflow };
  }

  /**
   * Extract all nodes from all workflows
   */
  async extractAllNodes(): Promise<any> {
    const flowsDir = path.join(this.workflowsPath, 'flows');
    const files = await fs.readdir(flowsDir);
    const results = [];
    
    for (const file of files) {
      if (file.endsWith('.json') && !file.includes('package.json')) {
        const filePath = path.join(flowsDir, file);
        const result = await this.extractNodes(filePath);
        if (result.extracted.length > 0) {
          results.push({
            workflow: file.replace('.json', ''),
            extracted: result.extracted
          });
        }
      }
    }
    
    return {
      content: [{
        type: 'text',
        text: this.formatExtractionResults(results)
      }]
    };
  }

  /**
   * List all extracted nodes
   */
  async listNodes(): Promise<any> {
    const metadata = await this.loadMetadata();
    let output = '📚 Extracted Nodes Library\n\n';
    
    // Group by type
    const byType: Record<NodeType, any[]> = {
      code: [],
      prompt: [],
      sql: [],
      template: []
    };
    
    for (const [workflowName, nodes] of Object.entries(metadata)) {
      for (const node of nodes as any[]) {
        byType[node.nodeType as NodeType].push({
          ...node,
          workflowName
        });
      }
    }
    
    // Display by type
    if (byType.code.length > 0) {
      output += '📜 Code Nodes\n';
      for (const node of byType.code) {
        const icon = node.subType === 'python' ? '🐍' : '☕';
        output += `  ${icon} ${node.nodeName} (${node.workflowName})\n`;
        output += `     📁 ${node.filePath}\n`;
      }
      output += '\n';
    }
    
    if (byType.prompt.length > 0) {
      output += '💬 Prompt Nodes\n';
      for (const node of byType.prompt) {
        const icon = node.subType === 'openai' ? '🤖' : '🧠';
        output += `  ${icon} ${node.nodeName} (${node.workflowName})\n`;
        output += `     📁 ${node.filePath}\n`;
      }
      output += '\n';
    }
    
    if (byType.sql.length > 0) {
      output += '🗄️ SQL Nodes\n';
      for (const node of byType.sql) {
        output += `  📊 ${node.nodeName} (${node.workflowName})\n`;
        output += `     📁 ${node.filePath}\n`;
      }
      output += '\n';
    }
    
    if (byType.template.length > 0) {
      output += '📝 Template Nodes\n';
      for (const node of byType.template) {
        const icon = node.subType === 'html' ? '🌐' : '📄';
        output += `  ${icon} ${node.nodeName} (${node.workflowName})\n`;
        output += `     📁 ${node.filePath}\n`;
      }
      output += '\n';
    }
    
    return {
      content: [{
        type: 'text',
        text: output || '📭 No nodes extracted yet.\n\nUse "McFlow extract-nodes" to extract nodes from workflows.'
      }]
    };
  }

  /**
   * Format extraction results
   */
  private formatExtractionResults(results: any[]): string {
    if (results.length === 0) {
      return '📭 No extractable nodes found.';
    }
    
    let output = '📦 Node Extraction Complete\n\n';
    let totals: Record<NodeType, number> = { code: 0, prompt: 0, sql: 0, template: 0 };
    
    for (const result of results) {
      output += `📋 ${result.workflow}\n`;
      for (const node of result.extracted) {
        const icon = this.getNodeIcon(node.nodeType, node.subType);
        output += `  ${icon} ${node.nodeName} → ${node.filePath}\n`;
        totals[node.nodeType as NodeType]++;
      }
      output += '\n';
    }
    
    output += '📊 Summary:\n';
    if (totals.code > 0) output += `  • ${totals.code} code nodes\n`;
    if (totals.prompt > 0) output += `  • ${totals.prompt} prompt nodes\n`;
    if (totals.sql > 0) output += `  • ${totals.sql} SQL nodes\n`;
    if (totals.template > 0) output += `  • ${totals.template} template nodes\n`;
    
    output += '\n📝 Next Steps:\n';
    output += '1. Edit files in workflows/nodes/\n';
    output += '2. Use your editor\'s features (syntax highlighting, linting, etc.)\n';
    output += '3. Run "McFlow deploy" to inject content back into workflows\n';
    
    return output;
  }

  /**
   * Helper methods
   */
  
  private getNodeIcon(nodeType: NodeType, subType?: string): string {
    switch (nodeType) {
      case 'code':
        return subType === 'python' ? '🐍' : '📜';
      case 'prompt':
        return '💬';
      case 'sql':
        return '🗄️';
      case 'template':
        return subType === 'html' ? '🌐' : '📄';
      default:
        return '📄';
    }
  }

  private getAIProvider(nodeType: string): string {
    if (nodeType.includes('openAi')) return 'openai';
    if (nodeType.includes('anthropic')) return 'anthropic';
    if (nodeType.includes('googleAi')) return 'google';
    if (nodeType.includes('cohere')) return 'cohere';
    if (nodeType.includes('replicate')) return 'replicate';
    return 'unknown';
  }

  private getNodeTypeFromPath(filePath: string): NodeType {
    if (filePath.includes('/code/')) return 'code';
    if (filePath.includes('/prompts/')) return 'prompt';
    if (filePath.includes('/sql/')) return 'sql';
    if (filePath.includes('/templates/')) return 'template';
    return 'code';
  }

  private generateHeader(type: NodeType, nodeName: string, workflowName: string, language?: string): string {
    switch (type) {
      case 'code':
        if (language === 'python') {
          return `"""
Node: ${nodeName}
Workflow: ${workflowName}
Generated by McFlow - DO NOT EDIT THIS HEADER
"""

`;
        } else {
          return `/**
 * Node: ${nodeName}
 * Workflow: ${workflowName}
 * Generated by McFlow - DO NOT EDIT THIS HEADER
 */

`;
        }
      default:
        return '';
    }
  }

  private removeHeader(content: string, nodeType: NodeType, filePath: string): string {
    switch (nodeType) {
      case 'code':
        if (filePath.endsWith('.py')) {
          const match = content.match(/^"""[\s\S]*?"""\n\n/);
          if (match) return content.substring(match[0].length);
        } else {
          const match = content.match(/^\/\*\*[\s\S]*?\*\/\n\n/);
          if (match) return content.substring(match[0].length);
        }
        break;
      
      case 'prompt':
        // Remove YAML front matter
        const match = content.match(/^---[\s\S]*?---\n\n/);
        if (match) return content.substring(match[0].length);
        break;
      
      case 'sql':
        // Remove SQL comment header
        const lines = content.split('\n');
        let i = 0;
        while (i < lines.length && lines[i].startsWith('--')) i++;
        if (i < lines.length && lines[i].trim() === '') i++;
        return lines.slice(i).join('\n');
      
      case 'template':
        if (filePath.endsWith('.html')) {
          const match = content.match(/^<!--[\s\S]*?-->\n\n/);
          if (match) return content.substring(match[0].length);
        } else {
          const lines = content.split('\n');
          let i = 0;
          while (i < lines.length && lines[i].startsWith('#')) i++;
          if (i < lines.length && lines[i].trim() === '') i++;
          return lines.slice(i).join('\n');
        }
        break;
    }
    
    return content;
  }

  private sanitizeFilename(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '-')
      .replace(/--+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private hashContent(content: string): string {
    return crypto.createHash('md5').update(content).digest('hex').substring(0, 8);
  }

  private async loadMetadata(): Promise<Record<string, NodeMetadata[]>> {
    try {
      const content = await fs.readFile(this.metadataFile, 'utf-8');
      return JSON.parse(content);
    } catch {
      return {};
    }
  }

  private async updateMetadata(workflowName: string, nodes: ExtractedNode[]): Promise<void> {
    const metadata = await this.loadMetadata();
    
    metadata[workflowName] = nodes.map(node => ({
      workflowName,
      nodeId: node.nodeId,
      nodeName: node.nodeName,
      nodeType: node.nodeType,
      subType: node.subType,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));
    
    await fs.writeFile(this.metadataFile, JSON.stringify(metadata, null, 2));
  }

  /**
   * Create a shared module (compatibility method)
   */
  async createSharedModule(name: string, language: 'javascript' | 'python'): Promise<any> {
    const modulesDir = path.join(this.workflowsPath, 'modules');
    await fs.mkdir(modulesDir, { recursive: true });
    
    const fileName = `${this.sanitizeFilename(name)}.${language === 'python' ? 'py' : 'js'}`;
    const filePath = path.join(modulesDir, fileName);
    
    // Check if module already exists
    try {
      await fs.access(filePath);
      return {
        content: [{
          type: 'text',
          text: `❌ Module '${name}' already exists at ${filePath}`
        }]
      };
    } catch {
      // File doesn't exist, continue
    }
    
    // Create module template
    let template = '';
    if (language === 'javascript') {
      template = `/**
 * Shared Module: ${name}
 * Created by McFlow
 * 
 * This module can be imported in Code nodes using:
 * const ${name} = require('./modules/${fileName}');
 */

// Example function
function example() {
  return 'Hello from ${name}';
}

// Export functions for use in Code nodes
module.exports = {
  example
};`;
    } else {
      template = `"""
Shared Module: ${name}
Created by McFlow

This module can be imported in Python Code nodes using:
import sys
sys.path.append('./modules')
from ${this.sanitizeFilename(name)} import *
"""

def example():
    """Example function"""
    return f"Hello from ${name}"

# Functions are automatically available when imported`;
    }
    
    await fs.writeFile(filePath, template);
    
    return {
      content: [{
        type: 'text',
        text: `✅ Created shared module: ${fileName}\n📁 Location: ${filePath}\n\nYou can now edit this module and use it in your Code nodes.`
      }]
    };
  }
}