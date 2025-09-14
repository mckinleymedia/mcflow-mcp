import fs from 'fs/promises';
import path from 'path';
import { stringifyWorkflowFile } from '../utils/json-formatter.js';

interface WorkflowNode {
  parameters?: {
    nodeContent?: {
      jsCode?: string;
      pythonCode?: string;
      sqlQuery?: string;
      prompt?: string;
      promptType?: string; // Optional hint for special handling
      [key: string]: string | undefined;
    };
    jsCode?: string;
    pythonCode?: string;
    sqlQuery?: string;
    prompt?: string;
    systemMessage?: string;
    messages?: {
      messageValues?: Array<{
        message: string;
      }>;
    };
    [key: string]: any;
  };
  type?: string;
  name?: string;
  [key: string]: any;
}

interface Workflow {
  id?: string;
  name: string;
  nodes: WorkflowNode[];
  active?: boolean;
  settings?: any;
  connections?: any;
  [key: string]: any;
}

export class WorkflowCompiler {
  private workflowsPath: string;
  private nodesCodePath: string;
  private distPath: string;

  constructor(workflowsPath: string) {
    this.workflowsPath = workflowsPath;
    this.nodesCodePath = path.join(workflowsPath, 'nodes', 'code');
    this.distPath = path.join(workflowsPath, 'dist');
  }

  /**
   * Compile a workflow by injecting external code files
   */
  async compileWorkflow(workflowPath: string): Promise<Workflow> {
    // Read the workflow file
    const workflowContent = await fs.readFile(workflowPath, 'utf-8');
    const workflow: Workflow = JSON.parse(workflowContent);
    
    // Generate a stable ID based on the workflow name if not present
    // This ensures the same workflow always gets the same ID
    if (!workflow.id) {
      // Create a stable ID from the workflow name (sanitized)
      const baseName = path.basename(workflowPath, '.json');
      workflow.id = baseName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    }
    
    // Ensure workflow has required fields for n8n
    if (workflow.active === undefined) {
      workflow.active = false; // Default to inactive
    }
    if (!workflow.settings) {
      workflow.settings = { executionOrder: 'v1' };
    }
    if (!workflow.connections) {
      workflow.connections = {};
    }
    
    // Add or update timestamp to force n8n to recognize the update
    workflow.updatedAt = new Date().toISOString();
    if (!workflow.createdAt) {
      workflow.createdAt = workflow.updatedAt;
    }
    
    // Always process nodes to ensure external files are injected
    // This ensures any changes to external files are picked up
    console.log(`  🔧 Compiling workflow: ${path.basename(workflowPath)}`);
    
    let nodesProcessed = 0;
    for (const node of workflow.nodes) {
      const wasProcessed = await this.processNode(node);
      if (wasProcessed) nodesProcessed++;
    }
    
    if (nodesProcessed > 0) {
      console.log(`  ✅ Processed ${nodesProcessed} nodes with external content`);
    } else {
      console.log(`  ✓ No external content to inject`);
    }
    
    return workflow;
  }

  /**
   * Process a single node, injecting code if needed
   * Returns true if any external content was processed
   */
  private async processNode(node: WorkflowNode): Promise<boolean> {
    let processed = false;
    
    // Check if node has nodeContent.jsCode reference
    if (node.parameters?.nodeContent?.jsCode) {
      const codeFileName = node.parameters.nodeContent.jsCode;
      const codeFilePath = path.join(this.nodesCodePath, `${codeFileName}.js`);
      
      try {
        // Try to load the code file
        const code = await fs.readFile(codeFilePath, 'utf-8');
        
        // Replace the nodeContent reference with actual code
        delete node.parameters.nodeContent;
        node.parameters.jsCode = code;
        
        console.log(`  ✅ Injected code from: ${codeFileName}.js`);
        processed = true;
      } catch (error) {
        // If file doesn't exist, log warning but continue
        console.warn(`  ⚠️ Code file not found: ${codeFilePath}`);
        console.warn(`     Node '${node.name}' will be deployed as-is`);
      }
    }
    
    // Also check for other code node types (Python, SQL, etc.)
    if (node.parameters?.nodeContent?.pythonCode) {
      const result = await this.injectCode(node, 'pythonCode', 'python');
      if (result) processed = true;
    }
    
    if (node.parameters?.nodeContent?.sqlQuery) {
      const result = await this.injectCode(node, 'sqlQuery', 'sql');
      if (result) processed = true;
    }
    
    // Handle prompts with special structure mapping
    if (node.parameters?.nodeContent?.prompt) {
      const result = await this.injectPrompt(node);
      if (result) processed = true;
    }
    
    return processed;
  }

  /**
   * Inject prompt content with proper structure based on node type
   * Returns true if content was successfully injected
   */
  private async injectPrompt(node: WorkflowNode): Promise<boolean> {
    if (!node.parameters?.nodeContent?.prompt) return false;
    
    const promptFileName = node.parameters.nodeContent.prompt;
    const promptsDir = path.join(this.workflowsPath, 'nodes', 'prompts');
    
    // Always use .md for prompt files (better formatting support)
    const promptFilePath = path.join(promptsDir, `${promptFileName}.md`);
    let promptContent: string;

    try {
      promptContent = await fs.readFile(promptFilePath, 'utf-8');
    } catch (error) {
      console.warn(`  ⚠️ Prompt file not found: ${promptFileName}.md`);
      console.warn(`     Node '${node.name}' will be deployed as-is`);
      return false;
    }
    
    try {
      
      // Ensure prompt content has n8n expression syntax if needed
      if (!promptContent.startsWith('=')) {
        promptContent = `=${promptContent}`;
      }
      
      // Determine structure based on node type
      switch (node.type) {
        case '@n8n/n8n-nodes-langchain.chainLlm':
          // LangChain nodes use messages.messageValues structure
          node.parameters = {
            ...node.parameters,
            messages: {
              messageValues: [
                {
                  message: promptContent
                }
              ]
            }
          };
          delete node.parameters.nodeContent;
          console.log(`  ✅ Injected prompt (LangChain) from: ${promptFileName}.md`);
          break;
          
        case '@n8n/n8n-nodes-langchain.agent':
        case '@n8n/n8n-nodes-langchain.conversationalAgent':
          // Agent nodes might use systemMessage
          node.parameters = {
            ...node.parameters,
            systemMessage: promptContent
          };
          delete node.parameters.nodeContent;
          console.log(`  ✅ Injected prompt (Agent) from: ${promptFileName}.md`);
          break;
          
        case 'n8n-nodes-base.openAi':
        case 'n8n-nodes-base.anthropic':
        case 'n8n-nodes-base.huggingFace':
        default:
          // Standard AI nodes use simple prompt field
          node.parameters = {
            ...node.parameters,
            prompt: promptContent
          };
          delete node.parameters.nodeContent;
          console.log(`  ✅ Injected prompt from: ${promptFileName}.md`);
          break;
      }
      
      // Handle special prompt type hints if provided
      const nodeContent = node.parameters?.nodeContent as any;
      if (nodeContent?.promptType) {
        switch (nodeContent.promptType) {
          case 'claude_message':
            // Special handling for Claude API via HTTP Request
            (node.parameters as any).messages = [
              {
                role: 'user',
                content: promptContent.replace(/^=/, '') // Remove = for raw content
              }
            ];
            break;
        }
      }
      
      return true;
    } catch (error) {
      console.warn(`  ⚠️ Error processing prompt: ${error}`);
      return false;
    }
  }

  /**
   * Generic code injection for different code types
   * Returns true if content was successfully injected
   */
  private async injectCode(node: WorkflowNode, codeType: string, folderName: string, fileExt?: string): Promise<boolean> {
    if (node.parameters?.nodeContent?.[codeType]) {
      const codeFileName = node.parameters.nodeContent[codeType];
      const extension = fileExt || `.${folderName}`;
      const codeDir = path.join(this.workflowsPath, 'nodes', folderName);
      const codeFilePath = path.join(codeDir, `${codeFileName}${extension}`);
      
      try {
        const code = await fs.readFile(codeFilePath, 'utf-8');
        delete node.parameters.nodeContent;
        node.parameters[codeType] = code;
        const displayExt = extension.startsWith('.') ? extension.slice(1) : extension;
        console.log(`  ✅ Injected ${displayExt} from: ${codeFileName}${extension}`);
        return true;
      } catch (error) {
        const displayExt = extension.startsWith('.') ? extension.slice(1) : extension;
        console.warn(`  ⚠️ ${displayExt} file not found: ${codeFilePath}`);
        return false;
      }
    }
    return false;
  }

  /**
   * Compile all workflows in a directory
   */
  async compileAll(outputToFiles: boolean = false): Promise<Map<string, Workflow>> {
    const flowsDir = path.join(this.workflowsPath, 'flows');
    const compiledWorkflows = new Map<string, Workflow>();
    
    try {
      const files = await fs.readdir(flowsDir);
      const workflowFiles = files.filter(f => f.endsWith('.json'));
      
      for (const file of workflowFiles) {
        const workflowPath = path.join(flowsDir, file);
        const compiled = await this.compileWorkflow(workflowPath);
        compiledWorkflows.set(file, compiled);
        
        // Optionally save compiled version to dist/
        if (outputToFiles) {
          await this.saveCompiledWorkflow(file, compiled);
        }
      }
      
      console.log(`\n✅ Compiled ${compiledWorkflows.size} workflows`);
    } catch (error) {
      console.error('Error compiling workflows:', error);
      throw error;
    }
    
    return compiledWorkflows;
  }

  /**
   * Save compiled workflow to dist directory for debugging
   */
  async saveCompiledWorkflow(fileName: string, workflow: Workflow): Promise<void> {
    // Ensure dist directory exists
    await fs.mkdir(this.distPath, { recursive: true });
    
    const outputPath = path.join(this.distPath, fileName);
    await fs.writeFile(outputPath, stringifyWorkflowFile(workflow));
    console.log(`  💾 Saved compiled version to: dist/${fileName}`);
  }

  /**
   * Extract code from workflows into separate files (reverse operation)
   */
  async extractCode(workflowPath: string): Promise<void> {
    console.log(`Extracting code from: ${workflowPath}`);
    
    const workflowContent = await fs.readFile(workflowPath, 'utf-8');
    const workflow: Workflow = JSON.parse(workflowContent);
    const workflowName = path.basename(workflowPath, '.json');
    
    for (const node of workflow.nodes) {
      await this.extractNodeCode(node, workflowName);
    }
  }

  /**
   * Extract code from a single node
   */
  private async extractNodeCode(node: WorkflowNode, workflowName: string): Promise<void> {
    // Extract JavaScript code
    if (node.parameters?.jsCode && node.type === 'n8n-nodes-base.code') {
      const nodeName = this.sanitizeNodeName(node.name || 'unnamed');
      const fileName = `${workflowName}_${nodeName}`;
      const codeDir = path.join(this.workflowsPath, 'nodes', 'code');
      
      // Ensure directory exists
      await fs.mkdir(codeDir, { recursive: true });
      
      // Save code to file
      const filePath = path.join(codeDir, `${fileName}.js`);
      await fs.writeFile(filePath, node.parameters.jsCode);
      
      // Update node to use reference
      node.parameters.nodeContent = { jsCode: fileName };
      delete node.parameters.jsCode;
      
      console.log(`  📄 Extracted JavaScript to: nodes/code/${fileName}.js`);
    }
    
    // Extract Python code
    if (node.parameters?.pythonCode) {
      await this.extractCodeToFile(node, 'pythonCode', 'python', '.py', workflowName);
    }
    
    // Extract SQL
    if (node.parameters?.sqlQuery) {
      await this.extractCodeToFile(node, 'sqlQuery', 'sql', '.sql', workflowName);
    }
    
    // Extract prompts from different node structures
    if (node.parameters?.prompt) {
      await this.extractPromptToFile(node, 'prompt', workflowName);
    }
    
    // Extract LangChain message prompts
    if (node.parameters?.messages?.messageValues?.[0]?.message) {
      await this.extractLangChainPrompt(node, workflowName);
    }
    
    // Extract agent system messages
    if (node.parameters?.systemMessage) {
      await this.extractPromptToFile(node, 'systemMessage', workflowName);
    }
  }

  /**
   * Generic code extraction to file
   */
  private async extractCodeToFile(
    node: WorkflowNode, 
    codeType: string, 
    folderName: string,
    fileExt: string, 
    workflowName: string
  ): Promise<void> {
    if (node.parameters?.[codeType]) {
      const nodeName = this.sanitizeNodeName(node.name || 'unnamed');
      const fileName = `${workflowName}_${nodeName}`;
      const codeDir = path.join(this.workflowsPath, 'nodes', folderName);
      
      await fs.mkdir(codeDir, { recursive: true });
      
      const filePath = path.join(codeDir, `${fileName}${fileExt}`);
      await fs.writeFile(filePath, node.parameters[codeType]);
      
      node.parameters.nodeContent = { [codeType]: fileName };
      delete node.parameters[codeType];
      
      const displayExt = fileExt.startsWith('.') ? fileExt.slice(1) : fileExt;
      console.log(`  📄 Extracted ${displayExt} to: nodes/${folderName}/${fileName}${fileExt}`);
    }
  }

  /**
   * Extract prompt to markdown file
   */
  private async extractPromptToFile(node: WorkflowNode, promptField: string, workflowName: string): Promise<void> {
    if (!node.parameters?.[promptField]) return;
    
    const nodeName = this.sanitizeNodeName(node.name || 'unnamed');
    const fileName = `${workflowName}_${nodeName}`;
    const promptsDir = path.join(this.workflowsPath, 'nodes', 'prompts');
    
    await fs.mkdir(promptsDir, { recursive: true });
    
    // Remove expression syntax prefix if present
    let promptContent = node.parameters[promptField];
    if (promptContent.startsWith('=')) {
      promptContent = promptContent.substring(1);
    }
    
    const filePath = path.join(promptsDir, `${fileName}.md`);
    await fs.writeFile(filePath, promptContent);
    
    // Update node to use reference
    if (!node.parameters.nodeContent) {
      node.parameters.nodeContent = {};
    }
    node.parameters.nodeContent.prompt = fileName;
    delete node.parameters[promptField];
    
    console.log(`  📄 Extracted prompt to: nodes/prompts/${fileName}.md`);
  }

  /**
   * Extract LangChain prompt from message structure
   */
  private async extractLangChainPrompt(node: WorkflowNode, workflowName: string): Promise<void> {
    const message = node.parameters?.messages?.messageValues?.[0]?.message;
    if (!message) return;
    
    const nodeName = this.sanitizeNodeName(node.name || 'unnamed');
    const fileName = `${workflowName}_${nodeName}`;
    const promptsDir = path.join(this.workflowsPath, 'nodes', 'prompts');
    
    await fs.mkdir(promptsDir, { recursive: true });
    
    // Remove expression syntax prefix if present
    let promptContent = message;
    if (promptContent.startsWith('=')) {
      promptContent = promptContent.substring(1);
    }
    
    const filePath = path.join(promptsDir, `${fileName}.md`);
    await fs.writeFile(filePath, promptContent);
    
    // Update node to use reference
    node.parameters = {
      ...node.parameters,
      nodeContent: {
        prompt: fileName
      }
    };
    delete node.parameters.messages;
    
    console.log(`  📄 Extracted LangChain prompt to: nodes/prompts/${fileName}.md`);
  }

  /**
   * Sanitize node name for use as filename
   */
  private sanitizeNodeName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  /**
   * Check if a workflow needs compilation
   */
  async needsCompilation(workflowPath: string): Promise<boolean> {
    const workflowContent = await fs.readFile(workflowPath, 'utf-8');
    const workflow: Workflow = JSON.parse(workflowContent);
    
    for (const node of workflow.nodes) {
      if (node.parameters?.nodeContent) {
        return true;
      }
    }
    
    return false;
  }
}