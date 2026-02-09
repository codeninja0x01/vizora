const baseUrl =
  process.env.OPENVIDEO_API_URL || 'https://app.openvideo.dev/api/v1';

const test = async (z, bundle) => {
  const response = await z.request({ url: `${baseUrl}/me` });
  return response.data;
};

const addApiKeyToHeader = (request, z, bundle) => {
  if (bundle.authData && bundle.authData.apiKey) {
    request.headers.Authorization = `Bearer ${bundle.authData.apiKey}`;
  }
  return request;
};

const authentication = {
  type: 'custom',
  fields: [
    {
      key: 'apiKey',
      label: 'API Key',
      type: 'string',
      required: true,
      helpText: 'Find your API key in the OpenVideo dashboard under API Keys.',
    },
  ],
  test,
  connectionLabel: '{{organizationName}} ({{planTier}})',
};

module.exports = {
  authentication,
  addApiKeyToHeader,
};
