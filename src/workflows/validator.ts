export async function autofixWorkflow(workflow: any): Promise<{changed: boolean, fixes: string[], workflow: any}> {
  const fixes: string[] = [];
  let changed = false;

  if (workflow.nodes && Array.isArray(workflow.nodes)) {
    for (const node of workflow.nodes) {
      if (node.type === 'n8n-nodes-base.merge') {
        const mode = node.parameters?.mode;
        const combinationMode = node.parameters?.combinationMode;

        if (mode === 'multiplex') {
          node.parameters.mode = 'combine';
          node.parameters.combinationMode = 'mergeByPosition';
          fixes.push(`Fixed "${node.name}": Changed from multiplex to combine mode with mergeByPosition`);
          changed = true;
        }

        if (mode === 'combine' && combinationMode === 'multiplex') {
          node.parameters.combinationMode = 'mergeByPosition';
          fixes.push(`Fixed "${node.name}": Changed combinationMode from multiplex to mergeByPosition`);
          changed = true;
        }

        if (mode === 'combine' && !combinationMode) {
          node.parameters.combinationMode = 'mergeByPosition';
          fixes.push(`Fixed "${node.name}": Added missing combinationMode: mergeByPosition`);
          changed = true;
        }
      }
    }
  }

  return { changed, fixes, workflow };
}

export async function validateWorkflow(workflow: any): Promise<any> {
  const issues: string[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];

  if (!workflow.name) {
    issues.push('Workflow must have a name');
  }

  if (!workflow.nodes || !Array.isArray(workflow.nodes)) {
    issues.push('Workflow must have a nodes array');
  } else {
    const nodeIds = new Set();
    let hasTrigger = false;

    for (const node of workflow.nodes) {
      if (!node.id) {
        issues.push(`Node missing ID: ${JSON.stringify(node)}`);
      } else if (nodeIds.has(node.id)) {
        issues.push(`Duplicate node ID: ${node.id}`);
      } else {
        nodeIds.add(node.id);
      }

      if (!node.type) {
        issues.push(`Node ${node.id} missing type`);
      } else {
        if (node.type.includes('trigger') || node.type.includes('Trigger')) {
          hasTrigger = true;
        }

        if (node.type === 'n8n-nodes-base.merge') {
          const mode = node.parameters?.mode;
          const combinationMode = node.parameters?.combinationMode;

          if (mode === 'multiplex') {
            issues.push(`⚠️ Node "${node.name}" uses 'multiplex' mode which often outputs empty data.`);
            recommendations.push(`Change "${node.name}" from multiplex to: mode='combine', combinationMode='mergeByPosition'`);
          } else if (mode === 'combine' && !combinationMode) {
            warnings.push(`Node "${node.name}" is missing combinationMode parameter`);
          }

          if (workflow.connections) {
            let inputCount = 0;
            for (const [, targets] of Object.entries(workflow.connections)) {
              const targetList = targets as any;
              if (targetList.main) {
                for (const outputs of targetList.main) {
                  if (Array.isArray(outputs)) {
                    for (const connection of outputs) {
                      if (connection.node === node.name || connection.node === node.id) {
                        inputCount++;
                      }
                    }
                  }
                }
              }
            }
            if (inputCount < 2) {
              warnings.push(`Merge node "${node.name}" has only ${inputCount} input(s). Merge nodes need at least 2 inputs.`);
            }
          }
        }

        if (node.type === 'n8n-nodes-base.rssFeedRead') {
          if (!node.parameters?.url) {
            issues.push(`RSS node "${node.name}" is missing URL parameter`);
          }
        }
      }

      if (!node.position || typeof node.position[0] !== 'number' || typeof node.position[1] !== 'number') {
        warnings.push(`Node ${node.id} has invalid position`);
      }
    }

    if (!hasTrigger) {
      warnings.push('Workflow has no trigger node');
    }
  }

  if (workflow.connections) {
    for (const [, outputs] of Object.entries(workflow.connections as any)) {
      for (const [, connections] of Object.entries(outputs as any)) {
        for (const connection of connections as any[]) {
          for (const target of connection) {
            if (!workflow.nodes.find((n: any) => n.id === target.node)) {
              issues.push(`Connection references non-existent node: ${target.node}`);
            }
          }
        }
      }
    }
  }

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          valid: issues.length === 0,
          issues,
          warnings,
          recommendations,
        }, null, 2),
      },
    ],
  };
}