const baseUrl =
  process.env.OPENVIDEO_API_URL || 'https://app.openvideo.dev/api/v1';

const performSubscribe = async (z, bundle) => {
  const response = await z.request({
    url: `${baseUrl}/webhooks`,
    method: 'POST',
    body: {
      url: bundle.targetUrl,
      enabled: true,
    },
  });
  return response.data;
};

const performUnsubscribe = async (z, bundle) => {
  const webhookId = bundle.subscribeData.id;
  await z.request({
    url: `${baseUrl}/webhooks/${webhookId}`,
    method: 'DELETE',
  });
};

const perform = async (z, bundle) => {
  const event = bundle.cleanedRequest;
  return [
    {
      id: event.data?.renderId || event.renderId,
      renderId: event.data?.renderId || event.renderId,
      statusUrl: `${baseUrl}/renders/${event.data?.renderId || event.renderId}`,
    },
  ];
};

const performList = async (z, bundle) => {
  const response = await z.request({
    url: `${baseUrl}/renders`,
    params: { status: 'completed', limit: '3' },
  });

  return response.data.items.map((render) => ({
    id: render.id,
    renderId: render.id,
    statusUrl: `${baseUrl}/renders/${render.id}`,
  }));
};

module.exports = {
  key: 'renderCompleted',
  noun: 'Render',
  display: {
    label: 'Render Completed',
    description: 'Triggers when a video render finishes successfully.',
  },
  operation: {
    type: 'hook',
    performSubscribe,
    performUnsubscribe,
    perform,
    performList,
    sample: {
      id: 'render_abc123',
      renderId: 'render_abc123',
      statusUrl: 'https://app.openvideo.dev/api/v1/renders/render_abc123',
    },
  },
};
