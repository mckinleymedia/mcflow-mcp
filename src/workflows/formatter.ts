/**
 * Workflow Formatter for McFlow
 * 
 * Provides formatted, readable output for JSON workflows
 * with syntax highlighting and proper indentation
 */

interface FormatOptions {
  colorize?: boolean;
  indent?: number;
  maxDepth?: number;
  compact?: boolean;
  showNodeDetails?: boolean;
}

export class WorkflowFormatter {
  // ANSI color codes for terminal output
  private colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    
    // Colors
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    
    // Background
    bgRed: '\x1b[41m',
    bgGreen: '\x1b[42m',
    bgYellow: '\x1b[43m',
    bgBlue: '\x1b[44m',
  };

  /**
   * Format a workflow for display
   */
  formatWorkflow(workflow: any, options: FormatOptions = {}): string {
    const {
      colorize = true,
      indent = 2,
      compact = false,
      showNodeDetails = true
    } = options;

    if (compact) {
      return this.formatCompact(workflow, colorize);
    }

    let output = '';
    
    // Workflow header
    if (colorize) {
      output += `${this.colors.bright}${this.colors.cyan}📋 Workflow: ${workflow.name || 'Unnamed'}${this.colors.reset}\n`;
      output += `${this.colors.dim}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${this.colors.reset}\n\n`;
    } else {
      output += `📋 Workflow: ${workflow.name || 'Unnamed'}\n`;
      output += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    }

    // Metadata
    if (workflow.meta) {
      output += this.formatSection('Metadata', workflow.meta, { colorize, indent });
    }

    // Nodes
    if (workflow.nodes && showNodeDetails) {
      output += this.formatNodes(workflow.nodes, { colorize, indent });
    }

    // Connections
    if (workflow.connections) {
      output += this.formatConnections(workflow.connections, { colorize, indent });
    }

    // Settings
    if (workflow.settings) {
      output += this.formatSection('Settings', workflow.settings, { colorize, indent });
    }

    return output;
  }

  /**
   * Format nodes section
   */
  private formatNodes(nodes: any[], options: any): string {
    const { colorize, indent } = options;
    let output = '';

    if (colorize) {
      output += `${this.colors.bright}${this.colors.green}🔧 Nodes (${nodes.length})${this.colors.reset}\n`;
    } else {
      output += `🔧 Nodes (${nodes.length})\n`;
    }

    for (const node of nodes) {
      output += this.formatNode(node, { colorize, indent });
    }

    output += '\n';
    return output;
  }

  /**
   * Format individual node
   */
  private formatNode(node: any, options: any): string {
    const { colorize, indent } = options;
    let output = '';
    const ind = ' '.repeat(indent);

    // Node header
    if (colorize) {
      const nodeColor = this.getNodeColor(node.type);
      output += `${ind}${nodeColor}▸ ${node.name}${this.colors.reset}`;
      output += ` ${this.colors.dim}(${node.type})${this.colors.reset}\n`;
    } else {
      output += `${ind}▸ ${node.name} (${node.type})\n`;
    }

    // Node parameters (formatted as JSON)
    if (node.parameters && Object.keys(node.parameters).length > 0) {
      const paramStr = this.formatJSON(node.parameters, indent + 2, colorize);
      output += `${ind}  Parameters:\n${paramStr}\n`;
    }

    // Credentials
    if (node.credentials) {
      if (colorize) {
        output += `${ind}  ${this.colors.yellow}🔑 Credentials: ${Object.keys(node.credentials).join(', ')}${this.colors.reset}\n`;
      } else {
        output += `${ind}  🔑 Credentials: ${Object.keys(node.credentials).join(', ')}\n`;
      }
    }

    return output;
  }

  /**
   * Get color for node type
   */
  private getNodeColor(nodeType: string): string {
    if (nodeType.includes('trigger') || nodeType.includes('webhook')) {
      return this.colors.magenta;
    } else if (nodeType.includes('http')) {
      return this.colors.blue;
    } else if (nodeType.includes('code')) {
      return this.colors.yellow;
    } else if (nodeType.includes('if') || nodeType.includes('switch')) {
      return this.colors.cyan;
    } else if (nodeType.includes('merge') || nodeType.includes('split')) {
      return this.colors.green;
    } else if (nodeType.includes('openAi') || nodeType.includes('anthropic')) {
      return this.colors.bright + this.colors.magenta;
    }
    return this.colors.white;
  }

  /**
   * Format connections
   */
  private formatConnections(connections: any, options: any): string {
    const { colorize, indent } = options;
    let output = '';
    const ind = ' '.repeat(indent);

    if (colorize) {
      output += `${this.colors.bright}${this.colors.blue}🔗 Connections${this.colors.reset}\n`;
    } else {
      output += `🔗 Connections\n`;
    }

    for (const [sourceName, outputs] of Object.entries(connections)) {
      if (colorize) {
        output += `${ind}${this.colors.cyan}${sourceName}${this.colors.reset} →\n`;
      } else {
        output += `${ind}${sourceName} →\n`;
      }

      const mainOutputs = (outputs as any).main;
      if (Array.isArray(mainOutputs)) {
        mainOutputs.forEach((outputConnections, outputIndex) => {
          if (Array.isArray(outputConnections)) {
            outputConnections.forEach(conn => {
              if (colorize) {
                output += `${ind}  [${outputIndex}] → ${this.colors.green}${conn.node}${this.colors.reset}`;
              } else {
                output += `${ind}  [${outputIndex}] → ${conn.node}`;
              }
              if (conn.type !== 'main') {
                output += ` (${conn.type})`;
              }
              output += '\n';
            });
          }
        });
      }
    }

    output += '\n';
    return output;
  }

  /**
   * Format a section as JSON
   */
  private formatSection(title: string, data: any, options: any): string {
    const { colorize, indent } = options;
    let output = '';

    if (colorize) {
      output += `${this.colors.bright}${this.colors.blue}${title}${this.colors.reset}\n`;
    } else {
      output += `${title}\n`;
    }

    output += this.formatJSON(data, indent, colorize) + '\n\n';
    return output;
  }

  /**
   * Format JSON with syntax highlighting
   */
  formatJSON(obj: any, indentLevel: number = 2, colorize: boolean = true): string {
    const json = JSON.stringify(obj, null, 2);
    
    if (!colorize) {
      return json.split('\n').map(line => ' '.repeat(indentLevel) + line).join('\n');
    }

    // Apply syntax highlighting
    return json.split('\n').map(line => {
      let colored = line;
      
      // Color property names (in quotes followed by colon)
      colored = colored.replace(/"([^"]+)":/g, `${this.colors.cyan}"$1":${this.colors.reset}`);
      
      // Color string values
      colored = colored.replace(/: "([^"]*)"/g, `: ${this.colors.green}"$1"${this.colors.reset}`);
      
      // Color numbers
      colored = colored.replace(/: (\d+\.?\d*)/g, `: ${this.colors.yellow}$1${this.colors.reset}`);
      
      // Color booleans
      colored = colored.replace(/: (true|false)/g, `: ${this.colors.magenta}$1${this.colors.reset}`);
      
      // Color null
      colored = colored.replace(/: null/g, `: ${this.colors.dim}null${this.colors.reset}`);
      
      // Dim brackets and braces
      colored = colored.replace(/([{}[\],])/g, `${this.colors.dim}$1${this.colors.reset}`);
      
      return ' '.repeat(indentLevel) + colored;
    }).join('\n');
  }

  /**
   * Format compact view
   */
  private formatCompact(workflow: any, colorize: boolean): string {
    let output = '';
    
    // Summary line
    const nodeCount = workflow.nodes?.length || 0;
    const connectionCount = Object.keys(workflow.connections || {}).length;
    
    if (colorize) {
      output += `${this.colors.bright}${workflow.name || 'Unnamed'}${this.colors.reset} `;
      output += `${this.colors.dim}(${nodeCount} nodes, ${connectionCount} connections)${this.colors.reset}\n`;
    } else {
      output += `${workflow.name || 'Unnamed'} (${nodeCount} nodes, ${connectionCount} connections)\n`;
    }

    // Node types summary
    if (workflow.nodes) {
      const nodeTypes = new Map<string, number>();
      for (const node of workflow.nodes) {
        const type = node.type.split('.').pop() || node.type;
        nodeTypes.set(type, (nodeTypes.get(type) || 0) + 1);
      }

      output += '  Nodes: ';
      const types = Array.from(nodeTypes.entries())
        .map(([type, count]) => `${type}${count > 1 ? ` (${count})` : ''}`);
      
      if (colorize) {
        output += `${this.colors.cyan}${types.join(', ')}${this.colors.reset}`;
      } else {
        output += types.join(', ');
      }
      output += '\n';
    }

    return output;
  }

  /**
   * Format node code (for Code nodes)
   */
  formatNodeCode(code: string, language: 'javascript' | 'python' = 'javascript'): string {
    // Add line numbers and basic syntax highlighting
    const lines = code.split('\n');
    return lines.map((line, index) => {
      const lineNum = String(index + 1).padStart(3, ' ');
      let coloredLine = line;
      
      // Basic syntax highlighting
      if (language === 'javascript') {
        // Keywords
        coloredLine = coloredLine.replace(
          /\b(const|let|var|function|return|if|else|for|while|try|catch|throw|new|async|await)\b/g,
          `${this.colors.magenta}$1${this.colors.reset}`
        );
        // Strings
        coloredLine = coloredLine.replace(
          /(["'`])([^"'`]*)\1/g,
          `${this.colors.green}$1$2$1${this.colors.reset}`
        );
        // Comments
        coloredLine = coloredLine.replace(
          /(\/\/.*$|\/\*.*\*\/)/g,
          `${this.colors.dim}$1${this.colors.reset}`
        );
      }
      
      return `${this.colors.dim}${lineNum}│${this.colors.reset} ${coloredLine}`;
    }).join('\n');
  }

  /**
   * Format workflow diff (for showing changes)
   */
  formatDiff(oldWorkflow: any, newWorkflow: any): string {
    let output = `${this.colors.bright}📝 Workflow Changes${this.colors.reset}\n`;
    output += `${this.colors.dim}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${this.colors.reset}\n\n`;

    // Compare nodes
    const oldNodes = new Map(oldWorkflow.nodes?.map((n: any) => [n.name, n]) || []);
    const newNodes = new Map(newWorkflow.nodes?.map((n: any) => [n.name, n]) || []);

    // Added nodes
    for (const [name, node] of newNodes) {
      if (!oldNodes.has(name)) {
        const typedNode = node as any;
        output += `${this.colors.green}+ Added: ${name} (${typedNode.type})${this.colors.reset}\n`;
      }
    }

    // Removed nodes
    for (const [name, node] of oldNodes) {
      if (!newNodes.has(name)) {
        const typedNode = node as any;
        output += `${this.colors.red}- Removed: ${name} (${typedNode.type})${this.colors.reset}\n`;
      }
    }

    // Modified nodes
    for (const [name, newNode] of newNodes) {
      const oldNode = oldNodes.get(name) as any;
      const typedNewNode = newNode as any;
      if (oldNode && JSON.stringify(oldNode) !== JSON.stringify(typedNewNode)) {
        output += `${this.colors.yellow}~ Modified: ${name}${this.colors.reset}\n`;
        
        // Show what changed
        if (JSON.stringify(oldNode.parameters) !== JSON.stringify(typedNewNode.parameters)) {
          output += `  ${this.colors.dim}Parameters changed${this.colors.reset}\n`;
        }
        if (JSON.stringify(oldNode.credentials) !== JSON.stringify(typedNewNode.credentials)) {
          output += `  ${this.colors.dim}Credentials changed${this.colors.reset}\n`;
        }
      }
    }

    return output;
  }
}