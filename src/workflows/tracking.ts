
export interface TrackingConfig {
  enabled: boolean;
  storageUrl?: string;
  trackAllNodes?: boolean;
  trackSpecificNodes?: string[];
  enableCheckpoints?: boolean;
  enableErrorTracking?: boolean;
}

export interface TrackingNode {
  type: 'start' | 'end' | 'checkpoint' | 'store' | 'error';
  node: any;
  position: { x: number; y: number };
}

export class WorkflowTracker {
  private config: TrackingConfig;

  constructor(config: TrackingConfig = { enabled: false }) {
    this.config = config;
  }

  /**
   * Generate tracking nodes for a workflow
   */
  generateTrackingNodes(): TrackingNode[] {
    const nodes: TrackingNode[] = [];
    
    if (!this.config.enabled || !this.config.storageUrl) {
      return nodes;
    }

    // Start tracking node
    nodes.push(this.createStartTrackingNode());

    // End tracking node
    nodes.push(this.createEndTrackingNode());

    // Error tracking node if enabled
    if (this.config.enableErrorTracking) {
      nodes.push(this.createErrorTrackingNode());
    }

    return nodes;
  }

  /**
   * Create a workflow start tracking node
   */
  createStartTrackingNode(): TrackingNode {
    return {
      type: 'start',
      position: { x: 250, y: 100 },
      node: {
        parameters: {
          method: 'POST',
          url: '={{$env.WORKFLOW_STORAGE_URL}}/api/workflow/store',
          sendBody: true,
          bodyParametersUi: {
            parameter: [
              {
                name: 'action',
                value: 'start_execution'
              },
              {
                name: 'workflowId',
                value: '={{$workflow.id}}'
              },
              {
                name: 'workflowName',
                value: '={{$workflow.name}}'
              },
              {
                name: 'executionId',
                value: '={{$execution.id}}'
              },
              {
                name: 'itemId',
                value: '={{$json.id || $json.itemId || $execution.id}}'
              },
              {
                name: 'metadata',
                value: '={{JSON.stringify($json)}}'
              },
              {
                name: 'timestamp',
                value: '={{new Date().toISOString()}}'
              }
            ]
          },
          options: {
            timeout: 5000,
            ignoreResponseErrors: true
          }
        },
        id: 'track_start_' + Date.now(),
        name: 'Track Workflow Start',
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 4.2,
        position: [250, 100],
        continueOnFail: true
      }
    };
  }

  /**
   * Create a workflow end tracking node
   */
  createEndTrackingNode(): TrackingNode {
    return {
      type: 'end',
      position: { x: 1000, y: 300 },
      node: {
        parameters: {
          method: 'POST',
          url: '={{$env.WORKFLOW_STORAGE_URL}}/api/workflow/store',
          sendBody: true,
          bodyParametersUi: {
            parameter: [
              {
                name: 'action',
                value: 'end_execution'
              },
              {
                name: 'executionId',
                value: '={{$json.executionId || $execution.id}}'
              },
              {
                name: 'status',
                value: 'success'
              },
              {
                name: 'resultData',
                value: '={{JSON.stringify($json)}}'
              },
              {
                name: 'timestamp',
                value: '={{new Date().toISOString()}}'
              }
            ]
          },
          options: {
            timeout: 5000,
            ignoreResponseErrors: true
          }
        },
        id: 'track_end_' + Date.now(),
        name: 'Track Workflow End',
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 4.2,
        position: [1000, 300],
        continueOnFail: true
      }
    };
  }

  /**
   * Create an error tracking node
   */
  createErrorTrackingNode(): TrackingNode {
    return {
      type: 'error',
      position: { x: 600, y: 500 },
      node: {
        parameters: {
          method: 'POST',
          url: '={{$env.WORKFLOW_STORAGE_URL}}/api/workflow/store',
          sendBody: true,
          bodyParametersUi: {
            parameter: [
              {
                name: 'action',
                value: 'track_error'
              },
              {
                name: 'executionId',
                value: '={{$json.executionId || $execution.id}}'
              },
              {
                name: 'errorMessage',
                value: '={{$json.error?.message || "Unknown error"}}'
              },
              {
                name: 'errorDetails',
                value: '={{JSON.stringify($json.error || $json)}}'
              },
              {
                name: 'nodeId',
                value: '={{$node.name}}'
              },
              {
                name: 'timestamp',
                value: '={{new Date().toISOString()}}'
              }
            ]
          },
          options: {
            timeout: 5000,
            ignoreResponseErrors: true
          }
        },
        id: 'track_error_' + Date.now(),
        name: 'Track Error',
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 4.2,
        position: [600, 500],
        continueOnFail: true
      }
    };
  }

  /**
   * Create a checkpoint save node
   */
  createCheckpointNode(checkpointName: string, position: { x: number; y: number }): TrackingNode {
    return {
      type: 'checkpoint',
      position,
      node: {
        parameters: {
          method: 'POST',
          url: '={{$env.WORKFLOW_STORAGE_URL}}/api/workflow/store',
          sendBody: true,
          bodyParametersUi: {
            parameter: [
              {
                name: 'action',
                value: 'save_checkpoint'
              },
              {
                name: 'itemId',
                value: '={{$json.id || $json.itemId || $execution.id}}'
              },
              {
                name: 'checkpointName',
                value: checkpointName
              },
              {
                name: 'nodeId',
                value: '={{$node.name}}'
              },
              {
                name: 'checkpointData',
                value: '={{JSON.stringify($json)}}'
              },
              {
                name: 'timestamp',
                value: '={{new Date().toISOString()}}'
              }
            ]
          },
          options: {
            timeout: 5000,
            ignoreResponseErrors: true
          }
        },
        id: 'checkpoint_' + checkpointName.replace(/\s+/g, '_').toLowerCase() + '_' + Date.now(),
        name: `Checkpoint: ${checkpointName}`,
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 4.2,
        position: [position.x, position.y],
        continueOnFail: true
      }
    };
  }

  /**
   * Create a checkpoint restore node
   */
  createCheckpointRestoreNode(checkpointName: string, position: { x: number; y: number }): any {
    return {
      parameters: {
        method: 'GET',
        url: '={{$env.WORKFLOW_STORAGE_URL}}/api/workflow/retrieve',
        sendQuery: true,
        queryParametersUi: {
          parameter: [
            {
              name: 'action',
              value: 'get_checkpoint'
            },
            {
              name: 'itemId',
              value: '={{$json.id || $json.itemId || $execution.id}}'
            },
            {
              name: 'checkpointName',
              value: checkpointName
            }
          ]
        },
        options: {
          timeout: 5000,
          ignoreResponseErrors: true
        }
      },
      id: 'restore_' + checkpointName.replace(/\s+/g, '_').toLowerCase() + '_' + Date.now(),
      name: `Restore Checkpoint: ${checkpointName}`,
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 4.2,
      position: [position.x, position.y],
      continueOnFail: true
    };
  }

  /**
   * Create a node output storage node
   */
  createNodeStorageNode(nodeName: string, position: { x: number; y: number }): TrackingNode {
    return {
      type: 'store',
      position,
      node: {
        parameters: {
          method: 'POST',
          url: '={{$env.WORKFLOW_STORAGE_URL}}/api/workflow/store',
          sendBody: true,
          bodyParametersUi: {
            parameter: [
              {
                name: 'action',
                value: 'store_node'
              },
              {
                name: 'executionId',
                value: '={{$json.executionId || $execution.id}}'
              },
              {
                name: 'nodeId',
                value: nodeName
              },
              {
                name: 'nodeType',
                value: '={{$node.type}}'
              },
              {
                name: 'input',
                value: '={{JSON.stringify($input.all())}}'
              },
              {
                name: 'output',
                value: '={{JSON.stringify($json)}}'
              },
              {
                name: 'timestamp',
                value: '={{new Date().toISOString()}}'
              }
            ]
          },
          options: {
            timeout: 5000,
            ignoreResponseErrors: true
          }
        },
        id: 'store_' + nodeName.replace(/\s+/g, '_').toLowerCase() + '_' + Date.now(),
        name: `Store Output: ${nodeName}`,
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 4.2,
        position: [position.x, position.y],
        continueOnFail: true
      }
    };
  }

  /**
   * Inject tracking nodes into an existing workflow
   */
  injectTrackingNodes(workflow: any): any {
    if (!this.config.enabled) {
      return workflow;
    }

    const modifiedWorkflow = { ...workflow };
    const trackingNodes = this.generateTrackingNodes();

    // Add tracking nodes to workflow
    trackingNodes.forEach(trackingNode => {
      modifiedWorkflow.nodes.push(trackingNode.node);
    });

    // Connect tracking nodes to workflow
    // This is simplified - in real implementation would need to analyze workflow structure
    const startNode = trackingNodes.find(n => n.type === 'start');
    const endNode = trackingNodes.find(n => n.type === 'end');

    if (startNode && modifiedWorkflow.nodes.length > 0) {
      // Connect start tracking to first workflow node
      const firstNode = modifiedWorkflow.nodes.find((n: any) => 
        n.type !== 'n8n-nodes-base.httpRequest' || !n.name.includes('Track')
      );
      
      if (firstNode) {
        modifiedWorkflow.connections[startNode.node.name] = {
          main: [[{ node: firstNode.name, type: 'main', index: 0 }]]
        };
      }
    }

    return modifiedWorkflow;
  }

  /**
   * Check if tracking is enabled and configured
   */
  isConfigured(): boolean {
    return this.config.enabled && !!this.config.storageUrl;
  }

  /**
   * Update tracking configuration
   */
  updateConfig(config: Partial<TrackingConfig>): void {
    this.config = { ...this.config, ...config };
  }
}