import fs from 'fs/promises';
import path from 'path';

export async function addNodeToWorkflow(
  workflowsPath: string,
  workflowPath: string,
  node: any,
  position?: any
): Promise<any> {
  try {
    const fullPath = path.join(workflowsPath, workflowPath);
    const content = await fs.readFile(fullPath, 'utf-8');
    const workflow = JSON.parse(content);

    if (!workflow.nodes) {
      workflow.nodes = [];
    }

    if (position) {
      node.position = [position.x || 250, position.y || 300];
    } else {
      const lastNode = workflow.nodes[workflow.nodes.length - 1];
      if (lastNode && lastNode.position) {
        node.position = [lastNode.position[0] + 250, lastNode.position[1]];
      } else {
        node.position = [250, 300];
      }
    }

    workflow.nodes.push(node);

    await fs.writeFile(fullPath, JSON.stringify(workflow, null, 2));

    return {
      content: [
        {
          type: 'text',
          text: `Node added to workflow: ${node.id}`,
        },
      ],
    };
  } catch (error) {
    throw new Error(`Failed to add node: ${error}`);
  }
}

export async function connectNodes(
  workflowsPath: string,
  workflowPath: string,
  sourceNode: string,
  targetNode: string,
  sourceOutput: string = 'main',
  targetInput: string = 'main'
): Promise<any> {
  try {
    const fullPath = path.join(workflowsPath, workflowPath);
    const content = await fs.readFile(fullPath, 'utf-8');
    const workflow = JSON.parse(content);

    if (!workflow.connections) {
      workflow.connections = {};
    }

    if (!workflow.connections[sourceNode]) {
      workflow.connections[sourceNode] = {};
    }

    if (!workflow.connections[sourceNode][sourceOutput]) {
      workflow.connections[sourceNode][sourceOutput] = [];
    }

    const outputIndex = 0;
    if (!workflow.connections[sourceNode][sourceOutput][outputIndex]) {
      workflow.connections[sourceNode][sourceOutput][outputIndex] = [];
    }

    workflow.connections[sourceNode][sourceOutput][outputIndex].push({
      node: targetNode,
      type: targetInput,
      index: 0,
    });

    await fs.writeFile(fullPath, JSON.stringify(workflow, null, 2));

    return {
      content: [
        {
          type: 'text',
          text: `Connected ${sourceNode} -> ${targetNode}`,
        },
      ],
    };
  } catch (error) {
    throw new Error(`Failed to connect nodes: ${error}`);
  }
}