import fs from 'fs/promises';
import path from 'path';

export function getResourceDefinitions() {
  return [
    {
      uri: 'workflow://instructions/general',
      name: 'General AI Instructions',
      description: 'General instructions for working with n8n workflows',
      mimeType: 'text/markdown',
    },
    {
      uri: 'workflow://instructions/process',
      name: 'Process Instructions',
      description: 'Instructions for workflow creation process',
      mimeType: 'text/markdown',
    },
    {
      uri: 'workflow://instructions/repo',
      name: 'Repository Instructions',
      description: 'Repository-specific instructions',
      mimeType: 'text/markdown',
    },
  ];
}

export async function handleResourceRead(workflowsPath: string, uri: string) {
  if (uri.startsWith('workflow://instructions/')) {
    const instructionName = uri.replace('workflow://instructions/', '');
    const instructionPath = path.join(workflowsPath, 'ai', 'instructions', `${instructionName}.md`);

    try {
      const content = await fs.readFile(instructionPath, 'utf-8');
      return {
        contents: [
          {
            uri,
            mimeType: 'text/markdown',
            text: content,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to read instruction file: ${error}`);
    }
  }

  throw new Error(`Unknown resource: ${uri}`);
}