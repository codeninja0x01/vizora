import {
  type IHookFunctions,
  type IWebhookFunctions,
  type IDataObject,
  type INodeType,
  type INodeTypeDescription,
  type IWebhookResponseData,
  NodeApiError,
} from 'n8n-workflow';

export class OpenVideoTrigger implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'OpenVideo Trigger',
    name: 'openVideoTrigger',
    icon: 'file:openvideo.svg',
    group: ['trigger'],
    version: 1,
    description: 'Triggers when a video render completes successfully',
    defaults: {
      name: 'OpenVideo Trigger',
    },
    inputs: [],
    outputs: ['main'],
    credentials: [
      {
        name: 'openVideoApi',
        required: true,
      },
    ],
    webhooks: [
      {
        name: 'default',
        httpMethod: 'POST',
        responseMode: 'onReceived',
        path: 'webhook',
      },
    ],
    properties: [
      {
        displayName:
          'This node will automatically subscribe to render completion events when activated and unsubscribe when deactivated.',
        name: 'notice',
        type: 'notice',
        default: '',
      },
    ],
  };

  webhookMethods = {
    default: {
      async checkExists(this: IHookFunctions): Promise<boolean> {
        const webhookUrl = this.getNodeWebhookUrl('default');
        const credentials = await this.getCredentials('openVideoApi');
        const baseUrl = credentials.baseUrl as string;

        try {
          const response = await this.helpers.httpRequestWithAuthentication(
            'openVideoApi',
            {
              method: 'GET',
              url: `${baseUrl}/webhooks`,
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );

          const webhooks = response.data || [];
          return webhooks.some((webhook: any) => webhook.url === webhookUrl);
        } catch (_error: any) {
          // If we can't check, assume it doesn't exist
          return false;
        }
      },

      async create(this: IHookFunctions): Promise<boolean> {
        const webhookUrl = this.getNodeWebhookUrl('default');
        const credentials = await this.getCredentials('openVideoApi');
        const baseUrl = credentials.baseUrl as string;

        try {
          const response = await this.helpers.httpRequestWithAuthentication(
            'openVideoApi',
            {
              method: 'POST',
              url: `${baseUrl}/webhooks`,
              headers: {
                'Content-Type': 'application/json',
              },
              body: {
                url: webhookUrl,
                enabled: true,
              },
            }
          );

          // Store the webhook ID for later deletion
          const webhookData = this.getWorkflowStaticData('node');
          webhookData.webhookId = response.data.id;

          return true;
        } catch (error: any) {
          // Handle webhook limit error
          if (error.response && error.response.status === 429) {
            throw new NodeApiError(this.getNode(), error, {
              message:
                'Webhook limit reached for your organization. Delete unused webhooks in the OpenVideo dashboard.',
            });
          }
          throw error;
        }
      },

      async delete(this: IHookFunctions): Promise<boolean> {
        const webhookData = this.getWorkflowStaticData('node');
        const webhookId = webhookData.webhookId as string;

        if (!webhookId) {
          // No webhook to delete
          return true;
        }

        const credentials = await this.getCredentials('openVideoApi');
        const baseUrl = credentials.baseUrl as string;

        try {
          await this.helpers.httpRequestWithAuthentication('openVideoApi', {
            method: 'DELETE',
            url: `${baseUrl}/webhooks/${webhookId}`,
            headers: {
              'Content-Type': 'application/json',
            },
          });

          // Clean up static data
          delete webhookData.webhookId;

          return true;
        } catch (_error) {
          // Best-effort cleanup - log but don't throw
          // This prevents errors when the webhook was already deleted manually
          return false;
        }
      },
    },
  };

  async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
    const bodyData = this.getBodyData();
    const credentials = await this.getCredentials('openVideoApi');
    const baseUrl = credentials.baseUrl as string;

    // Extract render ID from webhook event
    const renderId = (bodyData.data as IDataObject)?.renderId as string;

    // Return minimal payload per user decision
    const payload = {
      renderId,
      statusUrl: `${baseUrl}/renders/${renderId}`,
    };

    return {
      workflowData: [this.helpers.returnJsonArray(payload)],
    };
  }
}
