import type {
  IAuthenticateGeneric,
  ICredentialTestRequest,
  ICredentialType,
  INodeProperties,
} from 'n8n-workflow';

export class OpenVideoApi implements ICredentialType {
  name = 'openVideoApi';
  displayName = 'OpenVideo API';
  documentationUrl = 'https://docs.openvideo.dev';
  properties: INodeProperties[] = [
    {
      displayName: 'API Key',
      name: 'apiKey',
      type: 'string',
      typeOptions: {
        password: true,
      },
      default: '',
      required: true,
      description: 'Your OpenVideo API key from the dashboard',
    },
    {
      displayName: 'Base URL',
      name: 'baseUrl',
      type: 'string',
      default: 'https://app.openvideo.dev/api/v1',
      description:
        'API base URL (change only for custom/self-hosted instances)',
    },
  ];

  authenticate: IAuthenticateGeneric = {
    type: 'generic',
    properties: {
      headers: {
        Authorization: '={{"Bearer " + $credentials.apiKey}}',
      },
    },
  };

  test: ICredentialTestRequest = {
    request: {
      baseURL: '={{$credentials.baseUrl}}',
      url: '/me',
      method: 'GET',
    },
    rules: [
      {
        type: 'responseSuccessBody',
        properties: {
          key: 'data.organization.name',
          value: '.*',
          message:
            'Connected to {{$responseItem.data.organization.name}} ({{$responseItem.data.organization.tier}} tier)',
        },
      },
    ],
  };
}
