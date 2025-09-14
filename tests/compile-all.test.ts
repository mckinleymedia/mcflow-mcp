import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WorkflowDeployer } from '../src/deploy';
import { WorkflowCompiler } from '../src/workflow-compiler';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

// Mock child_process to ensure no deployment happens
vi.mock('child_process', () => ({
  execSync: vi.fn()
}));

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const realWorkflowsPath = path.join(__dirname, '..');

describe('Compile All Functionality', () => {
  let testWorkflowsPath: string;
  let deployer: WorkflowDeployer;
  let compiler: WorkflowCompiler;

  beforeEach(async () => {
    // Clear all mocks
    vi.clearAllMocks();

    // Create unique test directory for each test
    testWorkflowsPath = path.join(__dirname, `test-compile-all-${Date.now()}-${Math.random().toString(36).substring(7)}`);

    // Create test directory structure
    await fs.mkdir(path.join(testWorkflowsPath, 'workflows', 'flows'), { recursive: true });
    await fs.mkdir(path.join(testWorkflowsPath, 'workflows', 'nodes', 'code'), { recursive: true });
    await fs.mkdir(path.join(testWorkflowsPath, 'workflows', 'nodes', 'prompts'), { recursive: true });
    await fs.mkdir(path.join(testWorkflowsPath, 'workflows', 'dist'), { recursive: true });

    deployer = new WorkflowDeployer({
      workflowsPath: testWorkflowsPath,
      n8nUrl: 'http://localhost:5678',
    });

    compiler = new WorkflowCompiler(testWorkflowsPath);
  });

  afterEach(async () => {
    // Clean up test directory
    if (testWorkflowsPath) {
      await fs.rm(testWorkflowsPath, { recursive: true, force: true }).catch(() => {});
    }
  });

  describe('compileAll without deployment', () => {
    it('should compile all workflows without triggering any deployment', async () => {
      // Create test workflows with various features
      const workflowWithCode = {
        name: 'workflow-with-code',
        description: 'Test workflow with external code',
        nodes: [
          {
            name: 'Code Node',
            type: 'n8n-nodes-base.code',
            parameters: {
              nodeContent: {
                jsCode: 'external-code'
              }
            }
          }
        ],
        connections: {}
      };

      const workflowWithPrompt = {
        name: 'workflow-with-prompt',
        description: 'Test workflow with external prompt',
        nodes: [
          {
            name: 'AI Node',
            type: 'n8n-nodes-base.openAi',
            parameters: {
              nodeContent: {
                prompt: 'external-prompt'
              }
            }
          }
        ],
        connections: {}
      };

      const simpleWorkflow = {
        name: 'simple-workflow',
        description: 'Simple workflow without external files',
        nodes: [
          {
            name: 'Webhook',
            type: 'n8n-nodes-base.webhook',
            parameters: {
              path: '/test'
            }
          }
        ],
        connections: {}
      };

      // Create external files
      await fs.writeFile(
        path.join(testWorkflowsPath, 'workflows', 'nodes', 'code', 'external-code.js'),
        'console.log("This is external code");'
      );

      await fs.writeFile(
        path.join(testWorkflowsPath, 'workflows', 'nodes', 'prompts', 'external-prompt.md'),
        'This is an external prompt for the AI'
      );

      // Save workflows
      await fs.writeFile(
        path.join(testWorkflowsPath, 'workflows', 'flows', 'workflow-with-code.json'),
        JSON.stringify(workflowWithCode, null, 2)
      );
      await fs.writeFile(
        path.join(testWorkflowsPath, 'workflows', 'flows', 'workflow-with-prompt.json'),
        JSON.stringify(workflowWithPrompt, null, 2)
      );
      await fs.writeFile(
        path.join(testWorkflowsPath, 'workflows', 'flows', 'simple-workflow.json'),
        JSON.stringify(simpleWorkflow, null, 2)
      );

      // Mock execSync to track if it's called (it shouldn't be)
      const mockedExecSync = execSync as unknown as ReturnType<typeof vi.fn>;

      // Compile all with output to files
      await deployer.compileAll(true);

      // Verify NO deployment commands were executed
      expect(mockedExecSync).not.toHaveBeenCalled();

      // Verify compiled files exist in dist
      const distFiles = await fs.readdir(path.join(testWorkflowsPath, 'workflows', 'dist'));
      expect(distFiles).toContain('workflow-with-code.json');
      expect(distFiles).toContain('workflow-with-prompt.json');
      expect(distFiles).toContain('simple-workflow.json');

      // Verify the compiled workflows have injected content
      const compiledWithCode = JSON.parse(
        await fs.readFile(
          path.join(testWorkflowsPath, 'workflows', 'dist', 'workflow-with-code.json'),
          'utf-8'
        )
      );
      expect(compiledWithCode.nodes[0].parameters.jsCode).toBe('console.log("This is external code");');
      expect(compiledWithCode.nodes[0].parameters.nodeContent).toBeUndefined();

      const compiledWithPrompt = JSON.parse(
        await fs.readFile(
          path.join(testWorkflowsPath, 'workflows', 'dist', 'workflow-with-prompt.json'),
          'utf-8'
        )
      );
      expect(compiledWithPrompt.nodes[0].parameters.prompt).toBe('=This is an external prompt for the AI');
      expect(compiledWithPrompt.nodes[0].parameters.nodeContent).toBeUndefined();

      // Verify metadata preservation
      expect(compiledWithCode.description).toBe('Test workflow with external code');
      expect(compiledWithPrompt.description).toBe('Test workflow with external prompt');
      expect(compiledWithCode.updatedAt).toBeDefined();
      expect(compiledWithPrompt.updatedAt).toBeDefined();
    });

    it('should compile without saving to files when output is false', async () => {
      const workflow = {
        name: 'test-workflow',
        description: 'Test workflow',
        nodes: [],
        connections: {}
      };

      // Save workflow
      await fs.writeFile(
        path.join(testWorkflowsPath, 'workflows', 'flows', 'test-workflow.json'),
        JSON.stringify(workflow, null, 2)
      );

      // Mock execSync
      const mockedExecSync = execSync as unknown as ReturnType<typeof vi.fn>;

      // Compile all WITHOUT output to files (using compiler directly)
      const compiledWorkflows = await compiler.compileAll(false);

      // Verify NO deployment commands were executed
      expect(mockedExecSync).not.toHaveBeenCalled();

      // Verify workflows are returned in memory
      expect(compiledWorkflows.size).toBe(1);
      expect(compiledWorkflows.has('test-workflow.json')).toBe(true);

      // Verify NO files were saved to dist
      const distFiles = await fs.readdir(path.join(testWorkflowsPath, 'workflows', 'dist'));
      expect(distFiles.length).toBe(0);
    });

    it('should handle the real ai-assistant-example workflow', async () => {
      const realCompiler = new WorkflowCompiler(realWorkflowsPath);

      // Mock execSync to ensure no deployment
      const mockedExecSync = execSync as unknown as ReturnType<typeof vi.fn>;

      // Create a temporary dist directory for testing
      const tempDistPath = path.join(testWorkflowsPath, 'test-dist');
      await fs.mkdir(tempDistPath, { recursive: true });

      // Compile the real workflows (in memory only)
      const compiledWorkflows = await realCompiler.compileAll(false);

      // Verify NO deployment commands were executed
      expect(mockedExecSync).not.toHaveBeenCalled();

      // Check if ai-assistant-example was compiled
      const aiAssistantWorkflow = compiledWorkflows.get('ai-assistant-example.json');
      expect(aiAssistantWorkflow).toBeDefined();

      if (aiAssistantWorkflow) {
        // Verify the workflow has been properly compiled
        expect(aiAssistantWorkflow.name).toBe('AI Assistant Example');
        expect(aiAssistantWorkflow.description).toBeDefined();
        expect(aiAssistantWorkflow.id).toBe('ai-assistant-example');
        expect(aiAssistantWorkflow.updatedAt).toBeDefined();

        // Check that external content was injected
        const hasInjectedContent = aiAssistantWorkflow.nodes.some(node =>
          node.parameters?.jsCode ||
          node.parameters?.prompt ||
          node.parameters?.messages?.messageValues
        );
        expect(hasInjectedContent).toBe(true);

        // Verify no nodeContent remains
        const hasNodeContent = aiAssistantWorkflow.nodes.some(node =>
          node.parameters?.nodeContent
        );
        expect(hasNodeContent).toBe(false);
      }
    });

    it('should update timestamps on each compilation', async () => {
      const workflow = {
        name: 'timestamp-test',
        description: 'Testing timestamp updates',
        nodes: [],
        connections: {}
      };

      // Save workflow
      await fs.writeFile(
        path.join(testWorkflowsPath, 'workflows', 'flows', 'timestamp-test.json'),
        JSON.stringify(workflow, null, 2)
      );

      // First compilation
      await compiler.compileAll(true);
      const firstCompiled = JSON.parse(
        await fs.readFile(
          path.join(testWorkflowsPath, 'workflows', 'dist', 'timestamp-test.json'),
          'utf-8'
        )
      );
      const firstTimestamp = firstCompiled.updatedAt;

      // Wait a bit to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));

      // Second compilation
      await compiler.compileAll(true);
      const secondCompiled = JSON.parse(
        await fs.readFile(
          path.join(testWorkflowsPath, 'workflows', 'dist', 'timestamp-test.json'),
          'utf-8'
        )
      );
      const secondTimestamp = secondCompiled.updatedAt;

      // Timestamps should be different
      expect(firstTimestamp).toBeDefined();
      expect(secondTimestamp).toBeDefined();
      expect(secondTimestamp).not.toBe(firstTimestamp);

      // Description should be preserved
      expect(secondCompiled.description).toBe('Testing timestamp updates');
    });

    it('should compile multiple workflows with mixed external content', async () => {
      // Create workflows with different types of external content
      const workflows = [
        {
          name: 'mixed-content-1',
          nodes: [
            {
              name: 'Code Node',
              type: 'n8n-nodes-base.code',
              parameters: { nodeContent: { jsCode: 'script1' } }
            },
            {
              name: 'AI Node',
              type: 'n8n-nodes-base.openAi',
              parameters: { nodeContent: { prompt: 'prompt1' } }
            }
          ],
          connections: {}
        },
        {
          name: 'mixed-content-2',
          nodes: [
            {
              name: 'LangChain Node',
              type: '@n8n/n8n-nodes-langchain.chainLlm',
              parameters: { nodeContent: { prompt: 'prompt2' } }
            }
          ],
          connections: {}
        }
      ];

      // Create external files
      await fs.writeFile(
        path.join(testWorkflowsPath, 'workflows', 'nodes', 'code', 'script1.js'),
        'const result = "Script 1";'
      );
      await fs.writeFile(
        path.join(testWorkflowsPath, 'workflows', 'nodes', 'prompts', 'prompt1.md'),
        'Prompt 1 content'
      );
      await fs.writeFile(
        path.join(testWorkflowsPath, 'workflows', 'nodes', 'prompts', 'prompt2.txt'),
        'Prompt 2 content'
      );

      // Save workflows
      for (const workflow of workflows) {
        await fs.writeFile(
          path.join(testWorkflowsPath, 'workflows', 'flows', `${workflow.name}.json`),
          JSON.stringify(workflow, null, 2)
        );
      }

      // Mock execSync
      const mockedExecSync = execSync as unknown as ReturnType<typeof vi.fn>;

      // Compile all
      const compiledWorkflows = await compiler.compileAll(true);

      // Verify no deployment
      expect(mockedExecSync).not.toHaveBeenCalled();

      // Verify all workflows were compiled
      expect(compiledWorkflows.size).toBe(2);

      // Check first workflow
      const compiled1 = JSON.parse(
        await fs.readFile(
          path.join(testWorkflowsPath, 'workflows', 'dist', 'mixed-content-1.json'),
          'utf-8'
        )
      );
      expect(compiled1.nodes[0].parameters.jsCode).toBe('const result = "Script 1";');
      expect(compiled1.nodes[1].parameters.prompt).toBe('=Prompt 1 content');

      // Check second workflow (LangChain structure)
      const compiled2 = JSON.parse(
        await fs.readFile(
          path.join(testWorkflowsPath, 'workflows', 'dist', 'mixed-content-2.json'),
          'utf-8'
        )
      );
      expect(compiled2.nodes[0].parameters.messages.messageValues[0].message).toBe('=Prompt 2 content');
    });
  });

  describe('compile vs deploy distinction', () => {
    it('should only compile when using compileAll, not deploy', async () => {
      const workflow = {
        name: 'compile-only-test',
        nodes: [],
        connections: {}
      };

      await fs.writeFile(
        path.join(testWorkflowsPath, 'workflows', 'flows', 'compile-only-test.json'),
        JSON.stringify(workflow, null, 2)
      );

      const mockedExecSync = execSync as unknown as ReturnType<typeof vi.fn>;

      // Call compileAll
      await deployer.compileAll(true);

      // Should NOT call any n8n import commands
      expect(mockedExecSync).not.toHaveBeenCalled();
    });

    it('should deploy when using deployWorkflow', async () => {
      const workflow = {
        name: 'deploy-test',
        nodes: [],
        connections: {}
      };

      const workflowPath = path.join(testWorkflowsPath, 'workflows', 'flows', 'deploy-test.json');
      await fs.writeFile(workflowPath, JSON.stringify(workflow, null, 2));

      const mockedExecSync = execSync as unknown as ReturnType<typeof vi.fn>;
      mockedExecSync.mockReturnValue('Successfully imported 1 workflow');

      // Call deployWorkflow
      await deployer.deployWorkflow(workflowPath);

      // Should call n8n import command
      expect(mockedExecSync).toHaveBeenCalledTimes(1);
      expect(mockedExecSync.mock.calls[0][0]).toContain('n8n import:workflow');
    });
  });
});