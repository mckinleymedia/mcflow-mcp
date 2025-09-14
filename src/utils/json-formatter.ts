/**
 * JSON formatting utilities to ensure consistent property ordering
 */

/**
 * Orders object properties with id and name first, then others alphabetically
 */
export function orderObjectProperties(obj: any): any {
  if (obj === null || obj === undefined) return obj;

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => orderObjectProperties(item));
  }

  // Handle non-objects
  if (typeof obj !== 'object') return obj;

  // Create new ordered object
  const ordered: any = {};

  // Add id first if it exists
  if ('id' in obj) {
    ordered.id = orderObjectProperties(obj.id);
  }

  // Add name second if it exists
  if ('name' in obj) {
    ordered.name = orderObjectProperties(obj.name);
  }

  // Add all other properties in their original order (or alphabetically if desired)
  Object.keys(obj).forEach(key => {
    if (key !== 'id' && key !== 'name') {
      ordered[key] = orderObjectProperties(obj[key]);
    }
  });

  return ordered;
}

/**
 * Stringify JSON with proper formatting and property ordering
 */
export function stringifyWorkflow(workflow: any, indent: number = 2): string {
  const ordered = orderObjectProperties(workflow);
  return JSON.stringify(ordered, null, indent);
}

/**
 * Order properties for a node object specifically
 */
export function orderNodeProperties(node: any): any {
  if (!node || typeof node !== 'object') return node;

  const ordered: any = {};

  // Priority order for node properties
  const priorityProps = ['id', 'name', 'type', 'typeVersion', 'position'];

  // Add priority properties first
  priorityProps.forEach(prop => {
    if (prop in node) {
      ordered[prop] = node[prop];
    }
  });

  // Add remaining properties
  Object.keys(node).forEach(key => {
    if (!priorityProps.includes(key)) {
      ordered[key] = orderObjectProperties(node[key]);
    }
  });

  return ordered;
}

/**
 * Order properties for a workflow object specifically
 */
export function orderWorkflowProperties(workflow: any): any {
  if (!workflow || typeof workflow !== 'object') return workflow;

  const ordered: any = {};

  // Priority order for workflow properties
  const priorityProps = ['id', 'name', 'active', 'nodes', 'connections', 'settings'];

  // Add priority properties first
  priorityProps.forEach(prop => {
    if (prop in workflow) {
      if (prop === 'nodes' && Array.isArray(workflow[prop])) {
        // Order node properties within the nodes array
        ordered[prop] = workflow[prop].map((node: any) => orderNodeProperties(node));
      } else {
        ordered[prop] = orderObjectProperties(workflow[prop]);
      }
    }
  });

  // Add remaining properties
  Object.keys(workflow).forEach(key => {
    if (!priorityProps.includes(key)) {
      ordered[key] = orderObjectProperties(workflow[key]);
    }
  });

  return ordered;
}

/**
 * Stringify workflow with proper formatting and property ordering
 */
export function stringifyWorkflowFile(workflow: any, indent: number = 2): string {
  const ordered = orderWorkflowProperties(workflow);
  return JSON.stringify(ordered, null, indent);
}