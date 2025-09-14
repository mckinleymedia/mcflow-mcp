export function getPromptDefinitions() {
  return [
    {
      name: 'create_n8n_workflow',
      description: 'Create a new n8n workflow for a specific use case',
      arguments: [
        {
          name: 'use_case',
          description: 'Description of the workflow use case',
          required: true,
        },
        {
          name: 'project',
          description: 'Project name for the workflow',
          required: false,
        },
      ],
    },
    {
      name: 'optimize_workflow',
      description: 'Optimize an existing n8n workflow',
      arguments: [
        {
          name: 'workflow_path',
          description: 'Path to the workflow to optimize',
          required: true,
        },
      ],
    },
  ];
}

export async function handleGetPrompt(name: string, args: any) {
  switch (name) {
    case 'create_n8n_workflow':
      return {
        prompt: `Create a new n8n workflow for the following use case: ${args?.use_case}

        Project: ${args?.project || 'default'}

        Please follow these guidelines:
        1. Use appropriate trigger nodes (manual, webhook, or schedule)
        2. Follow the 250px grid positioning pattern
        3. Include error handling where appropriate
        4. Use configuration nodes for settings
        5. Name nodes clearly and concisely`,
      };

    case 'optimize_workflow':
      return {
        prompt: `Optimize the n8n workflow at: ${args?.workflow_path}

        Please analyze and suggest improvements for:
        1. Performance optimization
        2. Error handling
        3. Node positioning and organization
        4. Naming conventions
        5. Configuration management`,
      };

    default:
      throw new Error(`Unknown prompt: ${name}`);
  }
}