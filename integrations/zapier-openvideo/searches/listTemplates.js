const baseUrl =
  process.env.OPENVIDEO_API_URL || 'https://app.openvideo.dev/api/v1';

const perform = async (z, _bundle) => {
  const response = await z.request({
    url: `${baseUrl}/templates`,
  });

  return response.data.templates || response.data;
};

module.exports = {
  key: 'listTemplatesDropdown',
  noun: 'Template',
  display: {
    label: 'List Templates',
    description: 'Find available templates in your organization.',
    hidden: false,
  },
  operation: {
    perform,
    sample: {
      id: 'tmpl_xyz',
      name: 'Marketing Video',
      description: 'A template for marketing',
    },
  },
};
