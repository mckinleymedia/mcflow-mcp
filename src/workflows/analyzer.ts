import fs from 'fs/promises';
import path from 'path';

export async function analyzeWorkflow(workflowsPath: string, workflowPath: string): Promise<any> {
  try {
    const fullPath = path.join(workflowsPath, workflowPath);
    const content = await fs.readFile(fullPath, 'utf-8');
    const workflow = JSON.parse(content);

    const analysis = {
      name: workflow.name,
      nodeCount: workflow.nodes?.length || 0,
      nodes: workflow.nodes?.map((node: any) => ({
        id: node.id,
        name: node.name,
        type: node.type,
        position: node.position,
      })) || [],
      connections: workflow.connections || {},
      triggers: workflow.nodes?.filter((node: any) =>
        node.type.includes('trigger') || node.type.includes('Trigger')
      ).map((node: any) => node.name) || [],
      hasErrorHandling: workflow.nodes?.some((node: any) =>
        node.type.includes('error') || node.name.toLowerCase().includes('error')
      ) || false,
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(analysis, null, 2),
        },
      ],
    };
  } catch (error) {
    throw new Error(`Failed to analyze workflow: ${error}`);
  }
}