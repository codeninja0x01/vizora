import {
  type IExecuteFunctions,
  type ILoadOptionsFunctions,
  type INodeExecutionData,
  type INodePropertyOptions,
  type INodeType,
  type INodeTypeDescription,
  NodeApiError,
  NodeOperationError,
} from 'n8n-workflow';

export class OpenVideo implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'OpenVideo',
    name: 'openVideo',
    icon: 'file:openvideo.svg',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
    description: 'Interact with OpenVideo video rendering API',
    defaults: {
      name: 'OpenVideo',
    },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      {
        name: 'openVideoApi',
        required: true,
      },
    ],
    properties: [
      {
        displayName: 'Resource',
        name: 'resource',
        type: 'options',
        noDataExpression: true,
        options: [
          {
            name: 'Render',
            value: 'render',
          },
          {
            name: 'Template',
            value: 'template',
          },
        ],
        default: 'render',
      },

      // Render Operations
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: {
          show: {
            resource: ['render'],
          },
        },
        options: [
          {
            name: 'Create',
            value: 'create',
            description: 'Submit a new video render',
            action: 'Create a render',
          },
          {
            name: 'Get',
            value: 'get',
            description: 'Get render status by ID',
            action: 'Get a render',
          },
        ],
        default: 'create',
      },

      // Template Operations
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: {
          show: {
            resource: ['template'],
          },
        },
        options: [
          {
            name: 'Get Many',
            value: 'getAll',
            description: 'Get all available templates',
            action: 'Get many templates',
          },
        ],
        default: 'getAll',
      },

      // Render:Create Fields
      {
        displayName: 'Template',
        name: 'templateId',
        type: 'options',
        typeOptions: {
          loadOptionsMethod: 'getTemplates',
        },
        displayOptions: {
          show: {
            resource: ['render'],
            operation: ['create'],
          },
        },
        default: '',
        required: true,
        description: 'Select the template to render',
      },
      {
        displayName: 'Merge Data',
        name: 'mergeData',
        type: 'json',
        displayOptions: {
          show: {
            resource: ['render'],
            operation: ['create'],
          },
        },
        default:
          '{\n  "headline": "Hello World",\n  "description": "Your text here"\n}',
        description:
          'JSON object with merge field values (e.g., {"headline": "Hello World"})',
        placeholder: '{"field": "value"}',
      },

      // Render:Get Fields
      {
        displayName: 'Render ID',
        name: 'renderId',
        type: 'string',
        displayOptions: {
          show: {
            resource: ['render'],
            operation: ['get'],
          },
        },
        default: '',
        required: true,
        description: 'The ID of the render to retrieve',
      },
    ],
  };

  methods = {
    loadOptions: {
      async getTemplates(
        this: ILoadOptionsFunctions
      ): Promise<INodePropertyOptions[]> {
        const credentials = await this.getCredentials('openVideoApi');
        const baseUrl = credentials.baseUrl as string;

        try {
          const response = await this.helpers.httpRequestWithAuthentication(
            'openVideoApi',
            {
              method: 'GET',
              url: `${baseUrl}/templates`,
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );

          const templates = response.data || [];
          return templates.map((template: any) => ({
            name: template.name,
            value: template.id,
          }));
        } catch (error: any) {
          throw new NodeApiError(this.getNode(), error, {
            message: 'Failed to load templates',
          });
        }
      },
    },
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    const resource = this.getNodeParameter('resource', 0) as string;
    const operation = this.getNodeParameter('operation', 0) as string;

    const credentials = await this.getCredentials('openVideoApi');
    const baseUrl = credentials.baseUrl as string;

    for (let i = 0; i < items.length; i++) {
      try {
        if (resource === 'render') {
          if (operation === 'create') {
            // Get parameters
            const templateId = this.getNodeParameter('templateId', i) as string;
            const mergeDataStr = this.getNodeParameter(
              'mergeData',
              i
            ) as string;

            // Parse merge data
            let mergeData: Record<string, any> = {};
            try {
              mergeData = JSON.parse(mergeDataStr);
            } catch (parseError) {
              throw new NodeOperationError(
                this.getNode(),
                'Invalid JSON in Merge Data field',
                { itemIndex: i }
              );
            }

            // Submit render
            const response = await this.helpers.httpRequestWithAuthentication(
              'openVideoApi',
              {
                method: 'POST',
                url: `${baseUrl}/renders`,
                headers: {
                  'Content-Type': 'application/json',
                },
                body: {
                  templateId,
                  mergeData,
                },
              }
            );

            returnData.push({
              json: response.data,
              pairedItem: { item: i },
            });
          } else if (operation === 'get') {
            // Get render status
            const renderId = this.getNodeParameter('renderId', i) as string;

            const response = await this.helpers.httpRequestWithAuthentication(
              'openVideoApi',
              {
                method: 'GET',
                url: `${baseUrl}/renders/${renderId}`,
                headers: {
                  'Content-Type': 'application/json',
                },
              }
            );

            returnData.push({
              json: response.data,
              pairedItem: { item: i },
            });
          }
        } else if (resource === 'template') {
          if (operation === 'getAll') {
            // List all templates
            const response = await this.helpers.httpRequestWithAuthentication(
              'openVideoApi',
              {
                method: 'GET',
                url: `${baseUrl}/templates`,
                headers: {
                  'Content-Type': 'application/json',
                },
              }
            );

            const templates = response.data || [];
            templates.forEach((template: any) => {
              returnData.push({
                json: template,
                pairedItem: { item: i },
              });
            });
          }
        }
      } catch (error: any) {
        // Handle specific error codes
        if (error.response) {
          const statusCode = error.response.status;
          const errorMessage = error.response.data?.error || error.message;

          if (statusCode === 401) {
            throw new NodeApiError(this.getNode(), error, {
              message: 'Invalid API key. Check your OpenVideo API credentials.',
              description: errorMessage,
            });
          } else if (statusCode === 429) {
            throw new NodeApiError(this.getNode(), error, {
              message:
                'Rate limit exceeded. The request will be retried automatically.',
              description: errorMessage,
            });
          } else if (statusCode === 400) {
            throw new NodeApiError(this.getNode(), error, {
              message: errorMessage,
            });
          }
        }

        // Generic error
        throw new NodeApiError(this.getNode(), error, {
          message: 'OpenVideo API request failed',
        });
      }
    }

    return [returnData];
  }
}
