const baseUrl =
  process.env.OPENVIDEO_API_URL || 'https://app.openvideo.dev/api/v1';

const getInputFields = async (z, bundle) => {
  const templateId = bundle.inputData.templateId;

  if (!templateId) {
    return [];
  }

  try {
    const response = await z.request({
      url: `${baseUrl}/templates/${templateId}`,
    });

    const template = response.data;
    const mergeFields = template.mergeFields || [];

    return mergeFields.map((field) => {
      let fieldType = 'string';
      if (field.type === 'number') {
        fieldType = 'number';
      }

      const inputField = {
        key: `mergeData__${field.key}`,
        label: field.label || field.key,
        type: fieldType,
        required: field.required || false,
      };

      if (field.defaultValue) {
        inputField.helpText = `Default: ${field.defaultValue}`;
      }

      return inputField;
    });
  } catch (error) {
    z.console.log('Error fetching template merge fields:', error.message);
    return [];
  }
};

const perform = async (z, bundle) => {
  const templateId = bundle.inputData.templateId;

  // Extract merge data from inputs prefixed with mergeData__
  const mergeData = {};
  Object.keys(bundle.inputData).forEach((key) => {
    if (key.startsWith('mergeData__')) {
      const fieldKey = key.replace('mergeData__', '');
      const value = bundle.inputData[key];

      // Filter out empty/null/undefined values to prevent overriding defaults
      if (value !== null && value !== undefined && value !== '') {
        mergeData[fieldKey] = value;
      }
    }
  });

  const response = await z.request({
    url: `${baseUrl}/renders`,
    method: 'POST',
    body: {
      templateId,
      mergeData,
    },
  });

  return response.data;
};

module.exports = {
  key: 'renderVideo',
  noun: 'Render',
  display: {
    label: 'Render Video',
    description: 'Create a new video render from a template with merge data.',
  },
  operation: {
    inputFields: [
      {
        key: 'templateId',
        label: 'Template',
        type: 'string',
        required: true,
        dynamic: 'listTemplatesDropdown.id.name',
        altersDynamicFields: true,
      },
      getInputFields,
    ],
    perform,
    sample: {
      id: 'render_abc123',
      status: 'queued',
      templateId: 'tmpl_xyz',
      createdAt: '2024-01-01T00:00:00Z',
    },
  },
};
