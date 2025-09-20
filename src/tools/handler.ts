import path from 'path';
import fs from 'fs/promises';
import { WorkflowManager } from '../workflows/manager.js';
import { N8nManager } from '../n8n/manager.js';
import { CredentialHelper } from '../credentials/helper.js';
import { WorkflowCompiler } from '../workflows/compiler.js';
import { NodeManager } from '../nodes/manager.js';
import { ChangeTracker } from '../utils/change-tracker.js';
import { analyzeWorkflow } from '../workflows/analyzer.js';
import { validateWorkflow, autofixWorkflow } from '../workflows/validator.js';
import { addNodeToWorkflow, connectNodes } from '../workflows/operations.js';
import { generateWorkflowFromTemplate } from '../workflows/templates.js';

export class ToolHandler {
  constructor(
    private workflowsPath: string,
    private workflowManager: WorkflowManager,
    private n8nManager: N8nManager,
    private credentialHelper: CredentialHelper
  ) {}

  async handleTool(toolName: string, args: any): Promise<any> {
    switch (toolName) {
      case 'list':
        return await this.workflowManager.listWorkflows(args?.project as string);

      case 'read':
        return await this.workflowManager.readWorkflow(args?.path as string);

      case 'create':
        return await this.workflowManager.createWorkflow(
          args?.name as string,
          args?.workflow as any,
          args?.project as string
        );

      case 'update':
        return await this.workflowManager.updateWorkflow(
          args?.path as string,
          args?.workflow as any
        );

      case 'analyze':
        return await analyzeWorkflow(this.workflowsPath, args?.path as string);

      case 'info':
        return await this.workflowManager.getProjectInfo(args?.project as string);

      case 'validate':
        const validatePath = args?.path as string;
        const validateWorkflow = args?.workflow as any;
        const autofix = args?.autofix as boolean;

        if (validatePath) {
          const fullPath = path.join(this.workflowsPath, validatePath);
          const content = await fs.readFile(fullPath, 'utf-8');
          const workflow = JSON.parse(content);

          if (autofix) {
            const fixed = await autofixWorkflow(workflow);
            if (fixed.changed) {
              await fs.writeFile(fullPath, JSON.stringify(fixed.workflow, null, 2));
              return {
                content: [{
                  type: 'text',
                  text: `✅ Fixed ${fixed.fixes.length} issues:\n${fixed.fixes.join('\n')}\n\nWorkflow saved!`
                }]
              };
            }
          }

          return await validateWorkflow(workflow);
        } else {
          return await validateWorkflow(validateWorkflow);
        }

      case 'add_node':
        return await addNodeToWorkflow(
          this.workflowsPath,
          args?.path as string,
          args?.node as any,
          args?.position as any
        );

      case 'connect':
        return await connectNodes(
          this.workflowsPath,
          args?.path as string,
          args?.sourceNode as string,
          args?.targetNode as string,
          args?.sourceOutput as string,
          args?.targetInput as string
        );

      case 'generate':
        return await generateWorkflowFromTemplate(
          this.workflowManager,
          args?.template as string,
          args?.project as string,
          args?.name as string,
          args?.config as any
        );

      case 'compile':
        const outputToFiles = args?.output !== false;
        const compiler = new WorkflowCompiler(this.workflowsPath);

        try {
          const compiledWorkflows = await compiler.compileAll(outputToFiles);
          return {
            content: [{
              type: 'text',
              text: `✅ Successfully compiled ${compiledWorkflows.size} workflows${outputToFiles ? ' to dist/' : ' (in memory)'}\n\n` +
                Array.from(compiledWorkflows.keys()).map(name => `• ${name}`).join('\n')
            }]
          };
        } catch (error: any) {
          return {
            content: [{
              type: 'text',
              text: `❌ Compilation failed: ${error.message}`
            }]
          };
        }

      case 'deploy':
        const deployPath = args?.path as string;
        const deployAll = args?.all as boolean;
        const deployOptions = {
          activate: args?.activate as boolean,
          separate: args?.separate as boolean,
        };

        if (deployPath) {
          return await this.n8nManager.importWorkflow(deployPath, deployOptions);
        } else if (deployAll) {
          return await this.n8nManager.deployAllWorkflows(deployOptions);
        } else {
          return await this.n8nManager.deployChangedWorkflows(deployOptions);
        }

      case 'export':
        return await this.n8nManager.exportWorkflow({
          id: args?.id as string,
          all: args?.all as boolean,
          outputPath: args?.outputPath as string,
          pretty: args?.pretty as boolean,
        });

      case 'execute':
        return await this.n8nManager.executeWorkflow({
          id: args?.id as string,
          file: args?.file as string,
          data: args?.data as any,
        });

      case 'deployed':
        return await this.n8nManager.listDeployedWorkflows();

      case 'list_credentials':
        const credentials = await this.n8nManager.listCredentials();
        return {
          content: [{
            type: 'text',
            text: credentials.length > 0
              ? `📋 Found ${credentials.length} credentials in n8n:\n\n` +
                credentials.map((c: any) => `• ID: ${c.id}\n  Name: ${c.name}\n  Type: ${c.type}`).join('\n\n') +
                '\n\n💡 Use these IDs in your workflow nodes to reference credentials'
              : '📭 No credentials found in n8n\n\n' +
                '💡 Add credentials in the n8n UI first, then use this command to get their IDs'
          }]
        };

      case 'activate':
        return await this.n8nManager.updateWorkflowStatus(
          args?.id as string,
          args?.active as boolean
        );

      case 'start':
        return await this.n8nManager.startN8n({
          port: args?.port as number,
          tunnel: args?.tunnel as boolean,
        });

      case 'status':
        const changeTracker = new ChangeTracker(this.workflowsPath);
        await changeTracker.initialize();
        const statusDetails = await changeTracker.getChangeDetails();
        return {
          content: [{
            type: 'text',
            text: statusDetails
          }]
        };

      case 'extract_code':
        const codeManager = new NodeManager(this.workflowsPath);
        await codeManager.initialize();

        const workflowToExtract = args?.workflow as string | undefined;

        if (workflowToExtract) {
          const workflowPath = path.join(this.workflowsPath, 'flows', `${workflowToExtract}.json`);
          const result = await codeManager.extractNodes(workflowPath);
          return {
            content: [{
              type: 'text',
              text: result.extracted.length > 0
                ? `✅ Extracted ${result.extracted.length} code nodes from ${workflowToExtract}\n\n` +
                  result.extracted.map((n: any) => `• ${n.nodeName} → ${n.filePath}`).join('\n')
                : `📭 No code nodes found in ${workflowToExtract}`
            }]
          };
        } else {
          return await codeManager.extractAllNodes();
        }

      case 'list_code':
        const codeListManager = new NodeManager(this.workflowsPath);
        await codeListManager.initialize();
        return await codeListManager.listNodes();

      case 'create_module':
        const moduleManager = new NodeManager(this.workflowsPath);
        await moduleManager.initialize();
        return await moduleManager.createSharedModule(
          args?.name as string,
          args?.language as 'javascript' | 'python'
        );

      case 'credentials':
        const credAction = args?.action as string;
        switch (credAction) {
          case 'analyze':
            return await this.credentialHelper.analyzeCredentialRequirements();
          case 'instructions':
            return await this.credentialHelper.getCredentialSetupInstructions();
          case 'generate-env':
            return await this.credentialHelper.generateSecureEnvExample();
          default:
            throw new Error(`Unknown credential action: ${credAction}`);
        }

      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }
}