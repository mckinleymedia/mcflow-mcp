import fs from 'fs';
import path from 'path';

/**
 * Detects the type of workflow structure in the current project
 */
export type WorkflowStructureType = 'multi-project' | 'simple' | 'unknown';

export interface WorkflowStructure {
  type: WorkflowStructureType;
  projectPath: string;  // The project root directory
  workflowsPath: string;  // The workflows folder
  projects?: string[]; // For multi-project structure
}

/**
 * Intelligently finds workflows within the current project
 * Supports two structures:
 * 1. Multi-project: ./project-name/workflows/*.json (like n8n-workflows-template)
 * 2. Simple: ./workflows/flows/*.json (with README and .env at ./workflows/)
 */
export function findWorkflowsPath(): string {
  const structure = detectWorkflowStructure();
  console.error(`Detected ${structure.type} workflow structure at: ${structure.workflowsPath}`);
  return structure.workflowsPath;
}

/**
 * Detects and returns information about the workflow structure
 */
export function detectWorkflowStructure(): WorkflowStructure {
  // MCP servers inherit the working directory from the client
  // So process.cwd() should be where the user is working
  const cwd = process.cwd();
  console.error(`McFlow: Detecting workflows in: ${cwd}`);
  
  // 1. Check environment variable first (highest priority)
  if (process.env.WORKFLOWS_PATH) {
    const envPath = path.resolve(process.env.WORKFLOWS_PATH);
    if (fs.existsSync(envPath)) {
      // Check if this path already contains a workflows/flows structure
      const workflowsDir = path.join(envPath, 'workflows');
      const flowsDir = path.join(workflowsDir, 'flows');
      
      if (fs.existsSync(flowsDir)) {
        // It has the expected structure
        return {
          type: 'simple',
          projectPath: envPath,
          workflowsPath: workflowsDir
        };
      }
      
      // Otherwise treat as unknown
      return {
        type: 'unknown',
        projectPath: envPath,
        workflowsPath: envPath
      };
    }
  }

  // 2. Check for simple structure: ./workflows/flows/
  const workflowsDir = path.join(cwd, 'workflows');
  const flowsPath = path.join(workflowsDir, 'flows');

  if (fs.existsSync(flowsPath) && fs.statSync(flowsPath).isDirectory()) {
    // If flows/ directory exists, that's good enough
    return {
      type: 'simple',
      projectPath: cwd,
      workflowsPath: workflowsDir
    };
  }

  // 2b. Also check if ./workflows/ exists (will create flows/ later)
  if (fs.existsSync(workflowsDir) && fs.statSync(workflowsDir).isDirectory()) {
    return {
      type: 'simple',
      projectPath: cwd,
      workflowsPath: workflowsDir
    };
  }

  // 3. Check for multi-project structure (multiple projects with workflows folders)
  const projects: string[] = [];
  
  try {
    const entries = fs.readdirSync(cwd, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const projectWorkflowsPath = path.join(cwd, entry.name, 'workflows');
        
        // Check if this directory has a workflows subdirectory
        if (fs.existsSync(projectWorkflowsPath) && fs.statSync(projectWorkflowsPath).isDirectory()) {
          // Verify it contains JSON files
          const files = fs.readdirSync(projectWorkflowsPath);
          const hasJsonFiles = files.some(f => f.endsWith('.json'));
          
          if (hasJsonFiles) {
            projects.push(entry.name);
          }
        }
      }
    }
    
    if (projects.length > 0) {
      return {
        type: 'multi-project',
        projectPath: cwd,
        workflowsPath: cwd,  // For multi-project, this is the root
        projects
      };
    }
  } catch (error) {
    console.error('Error scanning for multi-project structure:', error);
  }

  // 4. Check if we're already in a workflows directory
  if (cwd.endsWith('/workflows') || cwd.includes('/workflows/')) {
    return {
      type: 'unknown',
      projectPath: path.dirname(cwd),
      workflowsPath: cwd
    };
  }

  // 5. Default: use current directory
  console.error('Warning: Could not detect workflow structure. Using current directory.');
  console.error('Expected either:');
  console.error('  1. Multi-project: ./project-name/workflows/*.json');
  console.error('  2. Simple: ./workflows/flows/*.json');
  console.error('Set WORKFLOWS_PATH environment variable to specify the correct location.');
  
  return {
    type: 'unknown',
    projectPath: cwd,
    workflowsPath: path.join(cwd, 'workflows')  // Assume workflows subdirectory
  };
}

/**
 * Validates that the workflows path contains expected structure
 */
export function validateWorkflowsPath(workflowsPath: string): boolean {
  try {
    const stats = fs.statSync(workflowsPath);
    if (!stats.isDirectory()) {
      return false;
    }

    const structure = detectWorkflowStructure();
    
    // Validate based on structure type
    switch (structure.type) {
      case 'multi-project':
        // Should have at least one project with workflows
        return !!(structure.projects && structure.projects.length > 0);
        
      case 'simple':
        // Should have the flows directory
        const flowsPath = path.join(workflowsPath, 'flows');
        return fs.existsSync(flowsPath) && fs.statSync(flowsPath).isDirectory();
        
      case 'unknown':
      default:
        // Check for any indication of workflows
        const entries = fs.readdirSync(workflowsPath);
        const hasJsonFiles = entries.some(f => f.endsWith('.json'));
        const hasWorkflowsDir = entries.includes('workflows');
        return hasJsonFiles || hasWorkflowsDir;
    }
  } catch (error) {
    return false;
  }
}

/**
 * Gets the actual workflows directory based on structure type
 * For simple structure, returns the nested workflows/workflows path
 * For multi-project, returns the root path
 */
export function getWorkflowsDirectory(structure: WorkflowStructure): string {
  if (structure.type === 'simple') {
    return structure.workflowsPath;
  }
  return structure.projectPath;
}