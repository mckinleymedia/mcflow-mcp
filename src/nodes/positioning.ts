/**
 * Node positioning utilities for McFlow
 * Provides better spacing for workflow node layouts
 */

export interface Position {
  x: number;
  y: number;
}

export class NodePositioning {
  // Default spacing between nodes
  private static readonly HORIZONTAL_SPACING = 250;
  private static readonly VERTICAL_SPACING = 200; // Increased from typical 100-150
  private static readonly INITIAL_X = 250;
  private static readonly INITIAL_Y = 300;

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
   * Auto-layout nodes based on their connections
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
    
    // Assign positions
    nodesByLevel.forEach((nodesInLevel, level) => {
      nodesInLevel.forEach((node, index) => {
        const position = this.getTreePosition(
          level,
          index,
          nodesInLevel.length,
          this.HORIZONTAL_SPACING,
          this.VERTICAL_SPACING
        );
        positions.set(node.id || node.name, position);
      });
    });
    
    return positions;
  }

  /**
   * Adjust positions to avoid overlaps
   */
  static avoidOverlaps(positions: Map<string, [number, number]>, minDistance: number = 150): void {
    const posArray = Array.from(positions.entries());
    
    for (let i = 0; i < posArray.length; i++) {
      for (let j = i + 1; j < posArray.length; j++) {
        const [id1, pos1] = posArray[i];
        const [id2, pos2] = posArray[j];
        
        const dx = pos2[0] - pos1[0];
        const dy = pos2[1] - pos1[1];
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < minDistance) {
          // Move the second node away
          const moveDistance = minDistance - distance;
          const angle = Math.atan2(dy, dx);
          
          pos2[0] += Math.cos(angle) * moveDistance;
          pos2[1] += Math.sin(angle) * moveDistance;
          
          positions.set(id2, pos2);
        }
      }
    }
  }
}