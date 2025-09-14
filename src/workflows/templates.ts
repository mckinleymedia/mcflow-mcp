import { NodePositioning } from '../nodes/positioning.js';
import { WorkflowManager } from './manager.js';

export async function generateWorkflowFromTemplate(
  workflowManager: WorkflowManager,
  template: string,
  project: string,
  name: string,
  config: any = {}
): Promise<any> {
  const templates: { [key: string]: any } = {
    'webhook-api': {
      name: project ? `${project} - ${name}` : name,
      nodes: [
        {
          id: 'webhook-trigger',
          name: 'Webhook',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 1,
          position: NodePositioning.getHorizontalPosition(0),
          parameters: {
            path: config.webhookPath || `/${name}`,
            responseMode: 'onReceived',
            responseData: 'allEntries',
            options: {},
          },
        },
        {
          id: 'process-data',
          name: 'Process Data',
          type: 'n8n-nodes-base.code',
          typeVersion: 2,
          position: NodePositioning.getHorizontalPosition(1),
          parameters: {
            language: 'javaScript',
            jsCode: config.processCode || '// Process the incoming data\nreturn $input.all();',
          },
        },
        {
          id: 'respond',
          name: 'Respond',
          type: 'n8n-nodes-base.respondToWebhook',
          typeVersion: 1,
          position: NodePositioning.getHorizontalPosition(2),
          parameters: {
            respondWith: 'json',
            responseBody: '={{ $json }}',
          },
        },
      ],
      connections: {
        'webhook-trigger': {
          main: [[{ node: 'process-data', type: 'main', index: 0 }]],
        },
        'process-data': {
          main: [[{ node: 'respond', type: 'main', index: 0 }]],
        },
      },
    },
    'scheduled-report': {
      name: `${project} - ${name}`,
      nodes: [
        {
          id: 'schedule-trigger',
          name: 'Schedule',
          type: 'n8n-nodes-base.scheduleTrigger',
          typeVersion: 1,
          position: NodePositioning.getVerticalPosition(0),
          parameters: {
            rule: {
              interval: [
                {
                  field: 'hours',
                  hoursInterval: config.hoursInterval || 24,
                },
              ],
            },
          },
        },
        {
          id: 'gather-data',
          name: 'Gather Data',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 4.2,
          position: [500, 300],
          parameters: {
            url: config.dataUrl || 'https://api.example.com/data',
            method: 'GET',
          },
        },
        {
          id: 'format-report',
          name: 'Format Report',
          type: 'n8n-nodes-base.code',
          typeVersion: 2,
          position: [750, 300],
          parameters: {
            language: 'javaScript',
            jsCode: '// Format the report\nreturn { report: $input.all() };',
          },
        },
      ],
      connections: {
        'schedule-trigger': {
          main: [[{ node: 'gather-data', type: 'main', index: 0 }]],
        },
        'gather-data': {
          main: [[{ node: 'format-report', type: 'main', index: 0 }]],
        },
      },
    },
  };

  const workflowTemplate = templates[template];
  if (!workflowTemplate) {
    throw new Error(`Unknown template: ${template}`);
  }

  return await workflowManager.createWorkflow(name, workflowTemplate, project);
}