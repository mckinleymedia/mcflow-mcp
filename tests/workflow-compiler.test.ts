import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WorkflowCompiler } from '../src/workflow-compiler';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const realWorkflowsPath = path.join(__dirname, '..');

describe('WorkflowCompiler', () => {
  let compiler: WorkflowCompiler;
  let testWorkflowsPath: string;

  beforeEach(async () => {
    // Create unique test directory for each test
    testWorkflowsPath = path.join(__dirname, `test-workflows-${Date.now()}-${Math.random().toString(36).substring(7)}`);

    // Create test directory structure
    await fs.mkdir(path.join(testWorkflowsPath, 'workflows', 'flows'), { recursive: true });
    await fs.mkdir(path.join(testWorkflowsPath, 'workflows', 'nodes', 'code'), { recursive: true });
    await fs.mkdir(path.join(testWorkflowsPath, 'workflows', 'nodes', 'prompts'), { recursive: true });
    await fs.mkdir(path.join(testWorkflowsPath, 'workflows', 'dist'), { recursive: true });

    compiler = new WorkflowCompiler(testWorkflowsPath);
  });

  afterEach(async () => {
    // Clean up test directory
    if (testWorkflowsPath) {
      await fs.rm(testWorkflowsPath, { recursive: true, force: true }).catch(() => {});
    }
  });

  describe('compileWorkflow', () => {
    it('should compile a workflow with external JavaScript code', async () => {
      // Create a test workflow with external code reference
      const workflow = {
        name: 'test-workflow',
        nodes: [
          {
            name: 'Code Node',
            type: 'n8n-nodes-base.code',
            parameters: {
              nodeContent: {
                jsCode: 'test-code'
              }
            }
          }
        ],
        connections: {}
      };

      // Create the external code file
      const codeContent = 'console.log("Hello from external file!");';
      await fs.writeFile(
        path.join(testWorkflowsPath, 'workflows', 'nodes', 'code', 'test-code.js'),
        codeContent
      );

      // Save the workflow
      const workflowPath = path.join(testWorkflowsPath, 'workflows', 'flows', 'test-workflow.json');
      await fs.writeFile(workflowPath, JSON.stringify(workflow, null, 2));

      // Compile the workflow
      const compiled = await compiler.compileWorkflow(workflowPath);

      // Verify the code was injected
      expect(compiled.nodes[0].parameters.jsCode).toBe(codeContent);
      expect(compiled.nodes[0].parameters.nodeContent).toBeUndefined();

      // Verify workflow metadata was added
      expect(compiled.id).toBe('test-workflow');
      expect(compiled.active).toBe(false);
      expect(compiled.settings).toEqual({ executionOrder: 'v1' });
      expect(compiled.updatedAt).toBeDefined();
      expect(compiled.createdAt).toBeDefined();
    });

    it('should compile a workflow with external prompt', async () => {
      // Create a test workflow with external prompt reference
      const workflow = {
        name: 'prompt-workflow',
        nodes: [
          {
            name: 'AI Node',
            type: 'n8n-nodes-base.openAi',
            parameters: {
              nodeContent: {
                prompt: 'test-prompt'
              }
            }
          }
        ],
        connections: {}
      };

      // Create the external prompt file
      const promptContent = 'Analyze the following data: {{$json.data}}';
      await fs.writeFile(
        path.join(testWorkflowsPath, 'workflows', 'nodes', 'prompts', 'test-prompt.md'),
        promptContent
      );

      // Save the workflow
      const workflowPath = path.join(testWorkflowsPath, 'workflows', 'flows', 'prompt-workflow.json');
      await fs.writeFile(workflowPath, JSON.stringify(workflow, null, 2));

      // Compile the workflow
      const compiled = await compiler.compileWorkflow(workflowPath);

      // Verify the prompt was injected with n8n expression syntax
      expect(compiled.nodes[0].parameters.prompt).toBe('=' + promptContent);
      expect(compiled.nodes[0].parameters.nodeContent).toBeUndefined();
    });

    it('should handle LangChain nodes with message structure', async () => {
      const workflow = {
        name: 'langchain-workflow',
        nodes: [
          {
            name: 'LangChain Node',
            type: '@n8n/n8n-nodes-langchain.chainLlm',
            parameters: {
              nodeContent: {
                prompt: 'langchain-prompt'
              }
            }
          }
        ],
        connections: {}
      };

      // Create the external prompt file
      const promptContent = 'Process this request: {{$json.request}}';
      await fs.writeFile(
        path.join(testWorkflowsPath, 'workflows', 'nodes', 'prompts', 'langchain-prompt.txt'),
        promptContent
      );

      // Save the workflow
      const workflowPath = path.join(testWorkflowsPath, 'workflows', 'flows', 'langchain-workflow.json');
      await fs.writeFile(workflowPath, JSON.stringify(workflow, null, 2));

      // Compile the workflow
      const compiled = await compiler.compileWorkflow(workflowPath);

      // Verify the prompt was injected in LangChain structure
      expect(compiled.nodes[0].parameters.messages).toBeDefined();
      expect(compiled.nodes[0].parameters.messages.messageValues).toHaveLength(1);
      expect(compiled.nodes[0].parameters.messages.messageValues[0].message).toBe('=' + promptContent);
      expect(compiled.nodes[0].parameters.nodeContent).toBeUndefined();
    });

    it('should handle missing external files gracefully', async () => {
      const workflow = {
        name: 'missing-file-workflow',
        nodes: [
          {
            name: 'Code Node',
            type: 'n8n-nodes-base.code',
            parameters: {
              nodeContent: {
                jsCode: 'non-existent-file'
              }
            }
          }
        ],
        connections: {}
      };

      // Save the workflow (without creating the external file)
      const workflowPath = path.join(testWorkflowsPath, 'workflows', 'flows', 'missing-file-workflow.json');
      await fs.writeFile(workflowPath, JSON.stringify(workflow, null, 2));

      // Compile should not throw, but should keep nodeContent
      const compiled = await compiler.compileWorkflow(workflowPath);

      // The node should remain unchanged when file is missing
      expect(compiled.nodes[0].parameters.nodeContent).toBeDefined();
      expect(compiled.nodes[0].parameters.nodeContent.jsCode).toBe('non-existent-file');
      expect(compiled.nodes[0].parameters.jsCode).toBeUndefined();
    });
  });

  describe('Real workflow compilation', () => {
    it('should compile the ai-assistant-example workflow', async () => {
      const realCompiler = new WorkflowCompiler(realWorkflowsPath);
      const workflowPath = path.join(realWorkflowsPath, 'workflows', 'flows', 'ai-assistant-example.json');

      // Check if workflow exists
      try {
        await fs.access(workflowPath);
      } catch {
        console.log('Skipping real workflow test - workflow not found');
        return;
      }

      // Compile the workflow
      const compiled = await realCompiler.compileWorkflow(workflowPath);

      // Verify basic structure
      expect(compiled.name).toBe('AI Assistant Example');
      expect(compiled.nodes).toBeDefined();
      expect(compiled.nodes.length).toBeGreaterThan(0);

      // Check if any prompts were injected
      const aiNode = compiled.nodes.find(n => n.type === 'n8n-nodes-base.openAi');
      if (aiNode) {
        // If there's an AI node, it should have a prompt (either injected or original)
        expect(aiNode.parameters).toBeDefined();
        // Check that nodeContent was removed if it existed
        if (aiNode.parameters.prompt) {
          expect(aiNode.parameters.nodeContent).toBeUndefined();
        }
      }

      // Save to dist for verification
      await realCompiler.saveCompiledWorkflow('ai-assistant-example.json', compiled);

      // Verify the file was saved
      const distPath = path.join(realWorkflowsPath, 'workflows', 'dist', 'ai-assistant-example.json');
      const savedContent = await fs.readFile(distPath, 'utf-8');
      const savedWorkflow = JSON.parse(savedContent);

      expect(savedWorkflow.name).toBe('AI Assistant Example');
      expect(savedWorkflow.updatedAt).toBeDefined();
    });
  });

  describe('compileAll', () => {
    it('should compile all workflows in a directory', async () => {
      // Create multiple test workflows
      const workflow1 = {
        name: 'workflow-1',
        nodes: [],
        connections: {}
      };

      const workflow2 = {
        name: 'workflow-2',
        nodes: [
          {
            name: 'Code Node',
            type: 'n8n-nodes-base.code',
            parameters: {
              nodeContent: {
                jsCode: 'code-2'
              }
            }
          }
        ],
        connections: {}
      };

      // Create external code for workflow-2 FIRST
      await fs.writeFile(
        path.join(testWorkflowsPath, 'workflows', 'nodes', 'code', 'code-2.js'),
        'console.log("Workflow 2");'
      );

      // THEN save workflows
      await fs.writeFile(
        path.join(testWorkflowsPath, 'workflows', 'flows', 'workflow-1.json'),
        JSON.stringify(workflow1, null, 2)
      );
      await fs.writeFile(
        path.join(testWorkflowsPath, 'workflows', 'flows', 'workflow-2.json'),
        JSON.stringify(workflow2, null, 2)
      );

      // Compile all workflows
      const compiled = await compiler.compileAll(true);

      // Verify results
      expect(compiled.size).toBe(2);
      expect(compiled.has('workflow-1.json')).toBe(true);
      expect(compiled.has('workflow-2.json')).toBe(true);

      // Check that files were saved to dist
      const distFiles = await fs.readdir(path.join(testWorkflowsPath, 'workflows', 'dist'));
      expect(distFiles).toContain('workflow-1.json');
      expect(distFiles).toContain('workflow-2.json');
    });
  });
});