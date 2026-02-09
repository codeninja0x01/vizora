# n8n-nodes-openvideo

n8n community node for [OpenVideo](https://openvideo.dev) - trigger video renders and receive completion events.

## Description

This package provides n8n nodes to interact with the OpenVideo video rendering platform. Create video renders from templates, check render status, list available templates, and automatically receive webhook notifications when renders complete.

## Prerequisites

- n8n instance (self-hosted or cloud)
- OpenVideo account with API key ([Get started](https://app.openvideo.dev))

## Installation

### Community Nodes (Recommended)

1. In your n8n instance, go to **Settings** > **Community Nodes**
2. Click **Install a community node**
3. Enter: `n8n-nodes-openvideo`
4. Click **Install**

### Manual Installation

For self-hosted n8n:

```bash
cd ~/.n8n/custom
npm install n8n-nodes-openvideo
```

Restart n8n after installation.

## Credentials Setup

1. Get your API key from the [OpenVideo dashboard](https://app.openvideo.dev/dashboard/api-keys)
2. In n8n, create a new **OpenVideo API** credential
3. Paste your API key
4. (Optional) Change the base URL for self-hosted instances
5. Click **Test** to verify the connection

The test will display your organization name and tier if successful.

## Available Operations

### OpenVideo Node (Actions)

**Render > Create**
- Submit a new video render from a template
- Select template from dropdown (loaded dynamically)
- Provide merge data as JSON object
- Returns render ID and status

**Render > Get**
- Check the status of a render by ID
- Returns full render details including download URL when complete

**Template > Get Many**
- List all available templates in your organization
- Returns template IDs, names, and merge field definitions

### OpenVideo Trigger (Webhook)

**Render Completed**
- Automatically triggers when a video render finishes
- Receives `renderId` and `statusUrl` for easy polling
- Manages webhook lifecycle automatically (subscribe on activate, unsubscribe on deactivate)

## Example Workflow

1. **OpenVideo Node** (Create Render) - Submit render with template and merge data
2. **OpenVideo Trigger** (Render Completed) - Wait for completion webhook
3. **OpenVideo Node** (Get Render) - Fetch final render with download URL
4. Use the video URL in your automation (send email, upload to social media, etc.)

Alternatively, use polling instead of webhooks:
1. Create render
2. Wait node (30 seconds)
3. Get render status in a loop until complete

## Merge Data Format

When creating renders, provide merge data as a JSON object matching your template's fields:

```json
{
  "headline": "Hello World",
  "description": "AI-powered video creation",
  "ctaText": "Get Started"
}
```

Merge field names are defined in your OpenVideo templates. Use the **Get Many Templates** operation to see available fields for each template.

## Resources

- [OpenVideo Documentation](https://docs.openvideo.dev)
- [OpenVideo API Reference](https://docs.openvideo.dev/api)
- [n8n Community Nodes Guide](https://docs.n8n.io/integrations/community-nodes/)
- [Support](mailto:support@openvideo.dev)

## License

MIT

## Version

0.1.0 - Initial release
