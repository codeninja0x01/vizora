const baseUrl =
  process.env.OPENVIDEO_API_URL || 'https://app.openvideo.dev/api/v1';

const perform = async (z, bundle) => {
  const renderId = bundle.inputData.renderId;

  const response = await z.request({
    url: `${baseUrl}/renders/${renderId}`,
  });

  return response.data;
};

module.exports = {
  key: 'getRenderStatus',
  noun: 'Render',
  display: {
    label: 'Get Render Status',
    description: 'Get the current status of a video render.',
  },
  operation: {
    inputFields: [
      {
        key: 'renderId',
        label: 'Render ID',
        type: 'string',
        required: true,
        helpText: 'The ID returned from the Render Video action.',
      },
    ],
    perform,
    sample: {
      id: 'render_abc123',
      status: 'completed',
      outputUrl: 'https://cdn.openvideo.dev/render_abc123.mp4',
    },
  },
};
