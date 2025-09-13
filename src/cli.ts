#!/usr/bin/env node
import { Command } from 'commander';
import { WorkflowDeployer } from './deploy.js';
import path from 'path';

const program = new Command();

program
  .name('mcflow')
  .description('McFlow - MCP Server for n8n Workflow Management')
  .version('1.0.0');

// Compile command
program
  .command('compile')
  .description('Compile workflows by injecting external code files')
  .option('-o, --output', 'Save compiled workflows to dist/ directory')
  .option('-p, --path <path>', 'Path to workflows directory', process.cwd())
  .action(async (options: any) => {
    try {
      const deployer = new WorkflowDeployer({ workflowsPath: options.path });
      await deployer.compileAll(options.output || false);
    } catch (error) {
      console.error('Compilation failed:', error);
      process.exit(1);
    }
  });

// Extract command
program
  .command('extract')
  .description('Extract code from workflows into separate files')
  .option('-w, --workflow <file>', 'Specific workflow file to extract from')
  .option('-p, --path <path>', 'Path to workflows directory', process.cwd())
  .action(async (options: any) => {
    try {
      const deployer = new WorkflowDeployer({ workflowsPath: options.path });
      
      if (options.workflow) {
        const workflowPath = path.isAbsolute(options.workflow) 
          ? options.workflow 
          : path.join(options.path, 'workflows', 'flows', options.workflow);
        await deployer.extractCode(workflowPath);
      } else {
        await deployer.extractAllCode();
      }
    } catch (error) {
      console.error('Extraction failed:', error);
      process.exit(1);
    }
  });

// Deploy command
program
  .command('deploy')
  .description('Deploy workflows to n8n (ALWAYS compiles before deployment)')
  .option('-w, --workflow <file>', 'Specific workflow file to deploy')
  .option('-p, --path <path>', 'Path to workflows directory', process.cwd())
  .option('--skip-compilation', 'Skip compilation step (NOT RECOMMENDED - for debugging only)')
  .action(async (options: any) => {
    try {
      const deployer = new WorkflowDeployer({ workflowsPath: options.path });
      
      if (options.skipCompilation) {
        console.warn('⚠️  WARNING: Skipping compilation - deployed workflows may not include latest code/prompt changes!');
      }
      
      if (options.workflow) {
        const workflowPath = path.isAbsolute(options.workflow) 
          ? options.workflow 
          : path.join(options.path, 'workflows', 'flows', options.workflow);
        await deployer.deployWorkflow(workflowPath, options.skipCompilation || false);
      } else {
        await deployer.deployProject(options.path, options.skipCompilation || false);
      }
    } catch (error) {
      console.error('Deployment failed:', error);
      process.exit(1);
    }
  });

program.parse();