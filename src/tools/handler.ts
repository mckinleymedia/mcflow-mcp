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
import { TrackingInjector } from '../workflows/tracking-injector.js';
import { TrackingConfig } from '../workflows/tracking.js';
import { AppGenerator } from '../app/generator.js';

export class ToolHandler {
  private trackingConfig: TrackingConfig = { enabled: false };

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

      case 'add_tracking':
        const trackingPath = args?.path as string;
        const storageUrl = args?.storageUrl || process.env.WORKFLOW_STORAGE_URL;
        const trackingOptions = args?.options || {};

        if (!storageUrl) {
          return {
            content: [{
              type: 'text',
              text: '❌ Storage URL is required. Please provide storageUrl parameter or set WORKFLOW_STORAGE_URL environment variable.'
            }]
          };
        }

        // Read workflow
        const fullTrackingPath = path.join(this.workflowsPath, trackingPath);
        const workflowContent = await fs.readFile(fullTrackingPath, 'utf-8');
        const workflow = JSON.parse(workflowContent);

        // Create injector with configuration
        const injector = new TrackingInjector({
          enabled: true,
          storageUrl,
          enableCheckpoints: trackingOptions.checkpoints?.length > 0,
          enableErrorTracking: trackingOptions.addErrorTracking
        });

        // Inject tracking
        const trackedWorkflow = await injector.injectTracking(workflow, trackingOptions);

        // Save modified workflow
        await fs.writeFile(fullTrackingPath, JSON.stringify(trackedWorkflow, null, 2));

        // Count added nodes
        const addedNodes = trackedWorkflow.nodes.length - workflow.nodes.length;

        return {
          content: [{
            type: 'text',
            text: `✅ Added ${addedNodes} tracking nodes to workflow\\n\\n` +
              `Storage URL: ${storageUrl}\\n` +
              `Start tracking: ${trackingOptions.addStartTracking !== false ? 'Yes' : 'No'}\\n` +
              `End tracking: ${trackingOptions.addEndTracking !== false ? 'Yes' : 'No'}\\n` +
              `Error tracking: ${trackingOptions.addErrorTracking ? 'Yes' : 'No'}\\n` +
              `Checkpoints: ${trackingOptions.checkpoints?.length || 0}\\n` +
              `Stored outputs: ${trackingOptions.storeOutputNodes?.length || 0}`
          }]
        };

      case 'configure_tracking':
        // Update global tracking configuration
        this.trackingConfig = {
          enabled: args?.enabled ?? this.trackingConfig.enabled,
          storageUrl: args?.storageUrl || this.trackingConfig.storageUrl,
          trackAllNodes: args?.trackAllNodes ?? this.trackingConfig.trackAllNodes,
          enableCheckpoints: args?.enableCheckpoints ?? this.trackingConfig.enableCheckpoints,
          enableErrorTracking: args?.enableErrorTracking ?? this.trackingConfig.enableErrorTracking
        };

        // Save configuration to file for persistence
        const configPath = path.join(this.workflowsPath, '.tracking-config.json');
        await fs.writeFile(configPath, JSON.stringify(this.trackingConfig, null, 2));

        return {
          content: [{
            type: 'text',
            text: `✅ Tracking configuration updated:\\n\\n` +
              `Enabled: ${this.trackingConfig.enabled}\\n` +
              `Storage URL: ${this.trackingConfig.storageUrl || 'Not set'}\\n` +
              `Track all nodes: ${this.trackingConfig.trackAllNodes || false}\\n` +
              `Enable checkpoints: ${this.trackingConfig.enableCheckpoints || false}\\n` +
              `Enable error tracking: ${this.trackingConfig.enableErrorTracking || false}\\n\\n` +
              `Configuration saved to ${configPath}`
          }]
        };

      case 'add_checkpoint':
        const checkpointPath = args?.path as string;
        const checkpointName = args?.checkpointName as string;
        const afterNode = args?.afterNode as string;
        const addRestore = args?.addRestore as boolean;

        // Read workflow
        const fullCheckpointPath = path.join(this.workflowsPath, checkpointPath);
        const checkpointWorkflowContent = await fs.readFile(fullCheckpointPath, 'utf-8');
        const checkpointWorkflow = JSON.parse(checkpointWorkflowContent);

        // Use configured storage URL or environment variable
        const checkpointStorageUrl = this.trackingConfig.storageUrl || process.env.WORKFLOW_STORAGE_URL;

        if (!checkpointStorageUrl) {
          return {
            content: [{
              type: 'text',
              text: '❌ Storage URL not configured. Use configure_tracking to set storageUrl or set WORKFLOW_STORAGE_URL environment variable.'
            }]
          };
        }

        // Create injector
        const checkpointInjector = new TrackingInjector({
          enabled: true,
          storageUrl: checkpointStorageUrl,
          enableCheckpoints: true
        });

        // Add checkpoint
        let modifiedCheckpointWorkflow = checkpointWorkflow;

        if (afterNode) {
          // Add save checkpoint after specified node
          modifiedCheckpointWorkflow = await checkpointInjector.injectTracking(checkpointWorkflow, {
            checkpoints: [{ afterNode, checkpointName }]
          });
        }

        if (addRestore) {
          // Add restore checkpoint at workflow start
          modifiedCheckpointWorkflow = await checkpointInjector.addCheckpointRestore(
            modifiedCheckpointWorkflow,
            checkpointName
          );
        }

        // Save modified workflow
        await fs.writeFile(fullCheckpointPath, JSON.stringify(modifiedCheckpointWorkflow, null, 2));

        return {
          content: [{
            type: 'text',
            text: `✅ Added checkpoint "${checkpointName}" to workflow\\n\\n` +
              (afterNode ? `Save checkpoint after: ${afterNode}\\n` : '') +
              (addRestore ? `Restore checkpoint at workflow start\\n` : '') +
              `Storage URL: ${checkpointStorageUrl}`
          }]
        };

      case 'generate_app':
        const appName = args?.name as string;
        const stages = args?.stages as string[] || ['created', 'processing', 'review', 'completed'];
        const features = args?.features || {
          dashboard: true,
          api: true,
          database: true,
          webhooks: true,
          approvals: false
        };

        // Get project path (parent of workflows directory)
        const projectPath = path.dirname(this.workflowsPath);

        // Create app generator
        const appGenerator = new AppGenerator(projectPath);

        try {
          await appGenerator.generateApp({
            name: appName,
            projectPath,
            features,
            stages
          });

          return {
            content: [{
              type: 'text',
              text: `✅ Successfully generated Next.js app: ${appName}\\n\\n` +
                `📁 Location: ${path.join(projectPath, appName)}\\n\\n` +
                `Features included:\\n` +
                `• Dashboard: ${features.dashboard ? 'Yes' : 'No'}\\n` +
                `• API Endpoints: ${features.api ? 'Yes' : 'No'}\\n` +
                `• Database (SQLite): ${features.database ? 'Yes' : 'No'}\\n` +
                `• Webhook Receivers: ${features.webhooks ? 'Yes' : 'No'}\\n` +
                `• Approval System: ${features.approvals ? 'Yes' : 'No'}\\n\\n` +
                `Pipeline Stages: ${stages.join(' → ')}\\n\\n` +
                `Next steps:\\n` +
                `1. cd ${appName}\\n` +
                `2. npm install\\n` +
                `3. npm run dev\\n\\n` +
                `The app will be available at http://localhost:3000\\n\\n` +
                `To integrate with n8n workflows:\\n` +
                `• Use the tracking system: mcflow add_tracking --storageUrl http://localhost:3000\\n` +
                `• Or add HTTP Request nodes manually to your workflows`
            }]
          };
        } catch (error: any) {
          return {
            content: [{
              type: 'text',
              text: `❌ Failed to generate app: ${error.message}`
            }]
          };
        }

      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }
}