const authentication = require('./authentication');
const renderVideo = require('./creates/renderVideo');
const getRenderStatus = require('./creates/getRenderStatus');
const listTemplates = require('./searches/listTemplates');
const renderCompleted = require('./triggers/renderCompleted');

module.exports = {
  version: require('./package.json').version,
  platformVersion: require('zapier-platform-core').version,
  authentication: authentication.authentication,
  beforeRequest: [authentication.addApiKeyToHeader],
  triggers: {
    [renderCompleted.key]: renderCompleted,
  },
  creates: {
    [renderVideo.key]: renderVideo,
    [getRenderStatus.key]: getRenderStatus,
  },
  searches: {
    [listTemplates.key]: listTemplates,
  },
};
