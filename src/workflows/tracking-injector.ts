import { WorkflowTracker, TrackingConfig } from './tracking.js';
import path from 'path';
import fs from 'fs/promises';

export interface InjectionOptions {
  addStartTracking?: boolean;
  addEndTracking?: boolean;
  addErrorTracking?: boolean;
  checkpoints?: Array<{
    afterNode: string;
    checkpointName: string;
  }>;
  storeOutputNodes?: string[];
}

export class TrackingInjector {
  private tracker: WorkflowTracker;

  constructor(config: TrackingConfig) {
    this.tracker = new WorkflowTracker(config);
  }

  /**
   * Inject tracking into a workflow with intelligent placement
   */
  async injectTracking(workflow: any, options: InjectionOptions = {}): Promise<any> {
    const modifiedWorkflow = JSON.parse(JSON.stringify(workflow)); // Deep clone
    
    if (!this.tracker.isConfigured()) {
      return modifiedWorkflow;
    }

    // Ensure connections object exists
    if (!modifiedWorkflow.connections) {
      modifiedWorkflow.connections = {};
    }

    // Find entry and exit points
    const entryNodes = this.findEntryNodes(modifiedWorkflow);
    const exitNodes = this.findExitNodes(modifiedWorkflow);

    // Add start tracking
    if (options.addStartTracking !== false && entryNodes.length > 0) {
      this.addStartTracking(modifiedWorkflow, entryNodes);
    }

    // Add end tracking
    if (options.addEndTracking !== false && exitNodes.length > 0) {
      this.addEndTracking(modifiedWorkflow, exitNodes);
    }

    // Add error tracking
    if (options.addErrorTracking) {
      this.addErrorTracking(modifiedWorkflow);
    }

    // Add checkpoints
    if (options.checkpoints && options.checkpoints.length > 0) {
      this.addCheckpoints(modifiedWorkflow, options.checkpoints);
    }

    // Add node storage
    if (options.storeOutputNodes && options.storeOutputNodes.length > 0) {
      this.addNodeStorage(modifiedWorkflow, options.storeOutputNodes);
    }

    return modifiedWorkflow;
  }

  /**
   * Find entry nodes (triggers, manual starts, webhooks)
   */
  private findEntryNodes(workflow: any): string[] {
    const entryNodes: string[] = [];
    
    for (const node of workflow.nodes) {
      // Check if node is a trigger or start node
      if (
        node.type.includes('trigger') ||
        node.type.includes('webhook') ||
        node.type === 'n8n-nodes-base.manualTrigger' ||
        node.type === 'n8n-nodes-base.start' ||
        node.type === 'n8n-nodes-base.scheduleTrigger'
      ) {
        entryNodes.push(node.name);
      }
    }

    // If no triggers found, find nodes with no incoming connections
    if (entryNodes.length === 0) {
      const nodesWithIncoming = new Set<string>();
      
      for (const [_, targets] of Object.entries(workflow.connections || {})) {
        const targetList = targets as any;
        for (const targetArray of Object.values(targetList)) {
          for (const connections of targetArray as any[]) {
            for (const connection of connections) {
              nodesWithIncoming.add(connection.node);
            }
          }
        }
      }

      for (const node of workflow.nodes) {
        if (!nodesWithIncoming.has(node.name)) {
          entryNodes.push(node.name);
        }
      }
    }

    return entryNodes;
  }

  /**
   * Find exit nodes (nodes with no outgoing connections)
   */
  private findExitNodes(workflow: any): string[] {
    const exitNodes: string[] = [];
    const hasOutgoing = new Set<string>();

    for (const nodeName of Object.keys(workflow.connections || {})) {
      if (workflow.connections[nodeName]?.main?.length > 0) {
        hasOutgoing.add(nodeName);
      }
    }

    for (const node of workflow.nodes) {
      if (!hasOutgoing.has(node.name)) {
        exitNodes.push(node.name);
      }
    }

    return exitNodes;
  }

  /**
   * Add start tracking after entry nodes
   */
  private addStartTracking(workflow: any, entryNodes: string[]) {
    const trackingNode = this.tracker.createStartTrackingNode();
    
    // Position tracking node after first entry node
    const firstEntry = workflow.nodes.find((n: any) => n.name === entryNodes[0]);
    if (firstEntry) {
      trackingNode.node.position = [
        firstEntry.position[0] + 250,
        firstEntry.position[1]
      ];
    }

    // Add tracking node to workflow
    workflow.nodes.push(trackingNode.node);

    // Connect entry nodes to tracking node
    for (const entryName of entryNodes) {
      const existingConnections = workflow.connections[entryName]?.main?.[0] || [];
      
      // Insert tracking node between entry and its targets
      workflow.connections[trackingNode.node.name] = {
        main: [existingConnections]
      };
      
      // Connect entry to tracking node
      workflow.connections[entryName] = {
        main: [[{ node: trackingNode.node.name, type: 'main', index: 0 }]]
      };
    }
  }

  /**
   * Add end tracking before exit nodes
   */
  private addEndTracking(workflow: any, exitNodes: string[]) {
    for (const exitName of exitNodes) {
      const exitNode = workflow.nodes.find((n: any) => n.name === exitName);
      if (!exitNode) continue;

      const trackingNode = this.tracker.createEndTrackingNode();
      
      // Position tracking node after exit node
      trackingNode.node.position = [
        exitNode.position[0] + 250,
        exitNode.position[1]
      ];

      // Make unique name for each end tracking node
      trackingNode.node.name = `Track End - ${exitName}`;
      trackingNode.node.id = `track_end_${exitName.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}`;

      // Add tracking node to workflow
      workflow.nodes.push(trackingNode.node);

      // Connect exit node to tracking node
      if (!workflow.connections[exitName]) {
        workflow.connections[exitName] = {};
      }
      workflow.connections[exitName].main = [
        [{ node: trackingNode.node.name, type: 'main', index: 0 }]
      ];
    }
  }

  /**
   * Add error tracking with error trigger
   */
  private addErrorTracking(workflow: any) {
    // Add error trigger node
    const errorTrigger = {
      parameters: {},
      id: 'error_trigger_' + Date.now(),
      name: 'Error Trigger',
      type: 'n8n-nodes-base.errorTrigger',
      typeVersion: 1,
      position: [100, 400]
    };

    // Add error tracking node
    const trackingNode = this.tracker.createErrorTrackingNode();
    trackingNode.node.position = [350, 400];

    // Add nodes to workflow
    workflow.nodes.push(errorTrigger);
    workflow.nodes.push(trackingNode.node);

    // Connect error trigger to tracking node
    workflow.connections[errorTrigger.name] = {
      main: [[{ node: trackingNode.node.name, type: 'main', index: 0 }]]
    };
  }

  /**
   * Add checkpoint nodes after specific nodes
   */
  private addCheckpoints(workflow: any, checkpoints: Array<{ afterNode: string; checkpointName: string }>) {
    for (const checkpoint of checkpoints) {
      const targetNode = workflow.nodes.find((n: any) => n.name === checkpoint.afterNode);
      if (!targetNode) continue;

      // Create checkpoint node
      const checkpointNode = this.tracker.createCheckpointNode(
        checkpoint.checkpointName,
        {
          x: targetNode.position[0] + 250,
          y: targetNode.position[1] + 50
        }
      );

      // Add to workflow
      workflow.nodes.push(checkpointNode.node);

      // Insert checkpoint between target and its connections
      const existingConnections = workflow.connections[checkpoint.afterNode]?.main?.[0] || [];
      
      // Connect checkpoint to target's destinations
      if (existingConnections.length > 0) {
        workflow.connections[checkpointNode.node.name] = {
          main: [existingConnections]
        };
      }
      
      // Connect target to checkpoint
      workflow.connections[checkpoint.afterNode] = {
        main: [[{ node: checkpointNode.node.name, type: 'main', index: 0 }]]
      };
    }
  }

  /**
   * Add storage nodes after specific nodes
   */
  private addNodeStorage(workflow: any, nodeNames: string[]) {
    for (const nodeName of nodeNames) {
      const targetNode = workflow.nodes.find((n: any) => n.name === nodeName);
      if (!targetNode) continue;

      // Create storage node
      const storageNode = this.tracker.createNodeStorageNode(
        nodeName,
        {
          x: targetNode.position[0] + 150,
          y: targetNode.position[1] + 100
        }
      );

      // Add to workflow
      workflow.nodes.push(storageNode.node);

      // Insert storage node in parallel (not blocking main flow)
      if (!workflow.connections[nodeName]) {
        workflow.connections[nodeName] = { main: [[]] };
      }
      
      // Add storage node as additional output
      const existingConnections = workflow.connections[nodeName].main[0] || [];
      existingConnections.push({ node: storageNode.node.name, type: 'main', index: 0 });
      workflow.connections[nodeName].main[0] = existingConnections;
    }
  }

  /**
   * Add checkpoint restore capability at workflow start
   */
  async addCheckpointRestore(workflow: any, checkpointName: string): Promise<any> {
    const modifiedWorkflow = JSON.parse(JSON.stringify(workflow));

    // Create checkpoint restore node
    const restoreNode = this.tracker.createCheckpointRestoreNode(
      checkpointName,
      { x: 100, y: 200 }
    );

    // Create IF node to check if checkpoint exists
    const ifNode = {
      parameters: {
        conditions: {
          boolean: [
            {
              value1: '={{$json.checkpointData}}',
              operation: 'isNotEmpty'
            }
          ]
        }
      },
      id: 'if_checkpoint_' + Date.now(),
      name: `Check ${checkpointName} Exists`,
      type: 'n8n-nodes-base.if',
      typeVersion: 2,
      position: [350, 200]
    };

    // Add nodes
    modifiedWorkflow.nodes.push(restoreNode);
    modifiedWorkflow.nodes.push(ifNode);

    // Connect restore to IF
    modifiedWorkflow.connections[restoreNode.name] = {
      main: [[{ node: ifNode.name, type: 'main', index: 0 }]]
    };

    // IF node will have two outputs: true (has checkpoint) and false (no checkpoint)
    // These need to be connected to appropriate workflow paths

    return modifiedWorkflow;
  }
}

export default TrackingInjector;