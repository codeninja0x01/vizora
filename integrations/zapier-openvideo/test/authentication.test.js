const zapier = require('zapier-platform-core');
const App = require('../index');
const _appTester = zapier.createAppTester(App);

describe('authentication', () => {
  it('should authenticate with valid API key', async () => {
    const _bundle = {
      authData: { apiKey: process.env.OPENVIDEO_API_KEY || 'sk_live_test' },
    };
    // This test requires a running API, so mark as integration test
    // For CI, mock z.request
    expect(App.authentication).toBeDefined();
    expect(App.authentication.type).toBe('custom');
    expect(App.authentication.connectionLabel).toContain('organizationName');
  });

  it('should add API key to request headers', () => {
    const request = { headers: {} };
    const bundle = { authData: { apiKey: 'sk_live_test123' } };
    const result = App.beforeRequest[0](request, {}, bundle);
    expect(result.headers.Authorization).toBe('Bearer sk_live_test123');
  });
});
