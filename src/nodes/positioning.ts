/**
 * Node positioning utilities for McFlow
 * Provides better spacing for workflow node layouts with node size awareness
 */

export interface Position {
  x: number;
  y: number;
}

export interface NodeDimensions {
  width: number;
  height: number;
}

export class NodePositioning {
  // Default spacing between nodes (accounting for typical node sizes)
  private static readonly HORIZONTAL_SPACING = 350; // Increased for LangChain and other wide nodes
  private static readonly VERTICAL_SPACING = 250; // Increased to account for taller nodes
  private static readonly INITIAL_X = 250;
  private static readonly INITIAL_Y = 300;

  // Typical node dimensions based on n8n UI patterns
  // Each grid square in n8n is approximately 20px
  private static readonly NODE_DIMENSIONS: Record<string, NodeDimensions> = {
    // Trigger nodes (typically smaller)
    'n8n-nodes-base.webhook': { width: 200, height: 100 },
    'n8n-nodes-base.manualTrigger': { width: 200, height: 100 },
    'n8n-nodes-base.scheduleTrigger': { width: 200, height: 100 },
    'n8n-nodes-base.emailTriggerImap': { width: 200, height: 120 },

    // Core nodes (standard size)
    'n8n-nodes-base.httpRequest': { width: 240, height: 140 },
    'n8n-nodes-base.code': { width: 240, height: 140 },
    'n8n-nodes-base.set': { width: 240, height: 140 },
    'n8n-nodes-base.function': { width: 240, height: 140 },
    'n8n-nodes-base.functionItem': { width: 240, height: 140 },

    // AI/LLM nodes (typically larger due to more parameters)
    'n8n-nodes-base.openAi': { width: 260, height: 160 },
    '@n8n/n8n-nodes-langchain.chainLlm': { width: 320, height: 200 },
    '@n8n/n8n-nodes-langchain.agent': { width: 320, height: 200 },
    '@n8n/n8n-nodes-langchain.vectorStoreInMemory': { width: 280, height: 180 },

    // Data processing nodes
    'n8n-nodes-base.mergeV3': { width: 240, height: 140 },
    'n8n-nodes-base.splitInBatches': { width: 240, height: 140 },
    'n8n-nodes-base.itemLists': { width: 240, height: 140 },
    'n8n-nodes-base.aggregate': { width: 240, height: 140 },

    // Database nodes (larger due to query fields)
    'n8n-nodes-base.postgres': { width: 260, height: 160 },
    'n8n-nodes-base.mysql': { width: 260, height: 160 },
    'n8n-nodes-base.mongodb': { width: 260, height: 160 },

    // Response nodes (smaller)
    'n8n-nodes-base.respondToWebhook': { width: 200, height: 100 },
    'n8n-nodes-base.noOp': { width: 180, height: 80 },

    // Default for unknown nodes
    'default': { width: 240, height: 140 }
  };

  /**
   * Get dimensions for a specific node type
   */
  static getNodeDimensions(nodeType: string): NodeDimensions {
    return this.NODE_DIMENSIONS[nodeType] || this.NODE_DIMENSIONS.default;
  }

  /**
   * Calculate spacing based on node dimensions
   */
  static calculateSpacing(nodeType1: string, nodeType2: string, isHorizontal: boolean): number {
    const dim1 = this.getNodeDimensions(nodeType1);
    const dim2 = this.getNodeDimensions(nodeType2);

    if (isHorizontal) {
      // Horizontal spacing: half of each node's width plus buffer
      // Use larger buffer for wider nodes (LangChain nodes need more space)
      const maxWidth = Math.max(dim1.width, dim2.width);
      const buffer = maxWidth >= 280 ? 120 : 80; // Larger buffer for wide nodes
      return (dim1.width + dim2.width) / 2 + buffer;
    } else {
      // Vertical spacing: half of each node's height plus buffer
      return (dim1.height + dim2.height) / 2 + 80; // 80px buffer
    }
  }

  /**
   * Calculate position for a node in a horizontal layout
   */
  static getHorizontalPosition(index: number, startY: number = this.INITIAL_Y): [number, number] {
    return [
      this.INITIAL_X + (index * this.HORIZONTAL_SPACING),
      startY
    ];
  }

  /**
   * Calculate position for a node in a vertical layout
   */
  static getVerticalPosition(index: number, startX: number = this.INITIAL_X): [number, number] {
    return [
      startX,
      this.INITIAL_Y + (index * this.VERTICAL_SPACING)
    ];
  }

  /**
   * Calculate position for a node in a grid layout
   */
  static getGridPosition(
    index: number,
    columns: number = 3,
    horizontalSpacing: number = this.HORIZONTAL_SPACING,
    verticalSpacing: number = this.VERTICAL_SPACING
  ): [number, number] {
    const row = Math.floor(index / columns);
    const col = index % columns;
    
    return [
      this.INITIAL_X + (col * horizontalSpacing),
      this.INITIAL_Y + (row * verticalSpacing)
    ];
  }

  /**
   * Calculate position for a node in a diagonal/staircase layout
   */
  static getDiagonalPosition(
    index: number,
    horizontalStep: number = 200,
    verticalStep: number = 150
  ): [number, number] {
    return [
      this.INITIAL_X + (index * horizontalStep),
      this.INITIAL_Y + (index * verticalStep)
    ];
  }

  /**
   * Calculate position for a node in a tree/branching layout
   */
  static getTreePosition(
    level: number,
    indexInLevel: number,
    nodesPerLevel: number,
    horizontalSpacing: number = this.HORIZONTAL_SPACING,
    verticalSpacing: number = this.VERTICAL_SPACING
  ): [number, number] {
    const totalWidth = (nodesPerLevel - 1) * horizontalSpacing;
    const startX = this.INITIAL_X - (totalWidth / 2);
    
    return [
      startX + (indexInLevel * horizontalSpacing),
      this.INITIAL_Y + (level * verticalSpacing)
    ];
  }

  /**
   * Auto-layout nodes based on their connections and node dimensions
   */
  static autoLayout(nodes: any[], connections: any): Map<string, [number, number]> {
    const positions = new Map<string, [number, number]>();
    const visited = new Set<string>();
    const levels = new Map<string, number>();

    // Find trigger/start nodes (nodes with no incoming connections)
    const startNodes = nodes.filter(node => {
      const nodeId = node.id || node.name;
      return !Object.values(connections).some((conns: any) => {
        return Object.values(conns).some((targets: any) => {
          return targets.some((target: any) => {
            return Array.isArray(target)
              ? target.some((t: any) => t.node === nodeId)
              : target.node === nodeId;
          });
        });
      });
    });

    // BFS to assign levels
    const queue: Array<{node: any, level: number}> = [];
    startNodes.forEach(node => {
      queue.push({node, level: 0});
      levels.set(node.id || node.name, 0);
    });

    while (queue.length > 0) {
      const {node, level} = queue.shift()!;
      const nodeId = node.id || node.name;

      if (visited.has(nodeId)) continue;
      visited.add(nodeId);

      // Process connections from this node
      const nodeConnections = connections[nodeId];
      if (nodeConnections && nodeConnections.main) {
        nodeConnections.main.forEach((targets: any[]) => {
          targets.forEach((target: any) => {
            const targetNode = nodes.find(n => (n.id || n.name) === target.node);
            if (targetNode && !visited.has(target.node)) {
              queue.push({node: targetNode, level: level + 1});
              levels.set(target.node, level + 1);
            }
          });
        });
      }
    }

    // Group nodes by level
    const nodesByLevel = new Map<number, any[]>();
    nodes.forEach(node => {
      const nodeId = node.id || node.name;
      const level = levels.get(nodeId) || 0;
      if (!nodesByLevel.has(level)) {
        nodesByLevel.set(level, []);
      }
      nodesByLevel.get(level)!.push(node);
    });

    // Assign positions with dynamic spacing based on node sizes
    let currentY = this.INITIAL_Y;
    nodesByLevel.forEach((nodesInLevel, level) => {
      let maxHeightInLevel = 0;
      let currentX = this.INITIAL_X;

      // Calculate total width needed for this level
      const totalWidth = nodesInLevel.reduce((sum, node) => {
        const dim = this.getNodeDimensions(node.type);
        maxHeightInLevel = Math.max(maxHeightInLevel, dim.height);
        return sum + dim.width;
      }, 0);

      // Add spacing between nodes
      const spacingWidth = (nodesInLevel.length - 1) * 60; // 60px between nodes
      const totalLevelWidth = totalWidth + spacingWidth;

      // Center the level horizontally
      currentX = this.INITIAL_X + 400 - (totalLevelWidth / 2); // 400 is rough canvas center

      nodesInLevel.forEach((node, index) => {
        const nodeDim = this.getNodeDimensions(node.type);

        // Position node at center of its allocated space
        const nodeX = currentX + (nodeDim.width / 2);
        const position: [number, number] = [nodeX, currentY];

        positions.set(node.id || node.name, position);

        // Move X position for next node
        currentX += nodeDim.width + 60; // 60px spacing
      });

      // Move to next level with appropriate vertical spacing
      currentY += maxHeightInLevel + 100; // 100px vertical spacing between levels
    });

    return positions;
  }

  /**
   * Adjust positions to avoid overlaps considering node dimensions
   */
  static avoidOverlaps(
    positions: Map<string, [number, number]>,
    nodes: any[],
    minBuffer: number = 40
  ): void {
    const posArray = Array.from(positions.entries());

    for (let i = 0; i < posArray.length; i++) {
      for (let j = i + 1; j < posArray.length; j++) {
        const [id1, pos1] = posArray[i];
        const [id2, pos2] = posArray[j];

        // Get node types to determine dimensions
        const node1 = nodes.find(n => (n.id || n.name) === id1);
        const node2 = nodes.find(n => (n.id || n.name) === id2);

        if (!node1 || !node2) continue;

        const dim1 = this.getNodeDimensions(node1.type);
        const dim2 = this.getNodeDimensions(node2.type);

        // Calculate minimum required distance based on node dimensions
        const minDistanceX = (dim1.width + dim2.width) / 2 + minBuffer;
        const minDistanceY = (dim1.height + dim2.height) / 2 + minBuffer;

        const dx = Math.abs(pos2[0] - pos1[0]);
        const dy = Math.abs(pos2[1] - pos1[1]);

        // Check for overlap
        if (dx < minDistanceX && dy < minDistanceY) {
          // Calculate how much to move
          const moveX = minDistanceX - dx;
          const moveY = minDistanceY - dy;

          // Move in the direction with less overlap
          if (moveX < moveY) {
            // Move horizontally
            pos2[0] += pos2[0] > pos1[0] ? moveX : -moveX;
          } else {
            // Move vertically
            pos2[1] += pos2[1] > pos1[1] ? moveY : -moveY;
          }

          positions.set(id2, pos2);
        }
      }
    }
  }
}