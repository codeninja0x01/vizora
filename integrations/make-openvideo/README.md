# Make Custom App for OpenVideo

Make (Integromat) custom app for the OpenVideo video rendering platform.

## Description

OpenVideo is a video rendering platform that allows developers and creators to create, templatize, and mass-produce professional videos programmatically. This Make custom app provides integration with OpenVideo's API for automated video generation workflows.

## Setup

1. **Import the custom app in Make**
   - Go to Settings > Custom Apps > Import
   - Upload or paste the JSON configuration files from this directory
   - Make will validate and import the app

2. **Create a connection**
   - In your scenario, add an OpenVideo module
   - Click "Add" to create a new connection
   - Enter your API key from the OpenVideo dashboard (Settings > API Keys)
   - Keys start with `sk_live_` for production or `sk_test_` for testing
   - Optionally configure a custom API Base URL for self-hosted instances
   - Click "Continue" to verify the connection

3. **Use in scenarios**
   - The connection will verify your API key by calling GET /me
   - Once connected, you can use any of the available modules

## Available Modules

### Actions

#### Render Video
Submit a new video render from a template with custom merge data.

**Input:**
- Template (dropdown) - Select from available templates in your organization
- Merge Data (dynamic fields) - After selecting a template, merge fields automatically appear based on that template's configuration

**Output:**
- Render ID
- Status
- Template ID
- Created At

#### Get Render Status
Check the current status and details of a video render.

**Input:**
- Render ID - The ID returned from the Render Video action

**Output:**
- Render ID
- Status
- Template ID
- Output URL (when completed)
- Error details (if failed)

#### List Templates
Get all available templates in your organization.

**Output:**
- Array of templates with ID, name, description, and category

### Triggers

#### Render Completed (Webhook)
Fires when a video render finishes successfully.

**Output:**
- Render ID - The ID of the completed render
- Status URL - Link to check render details

**Webhook Lifecycle:**
- Subscribe: Automatically registers a webhook with OpenVideo when you enable the trigger
- Unsubscribe: Automatically removes the webhook when you disable the trigger or delete the scenario

## Dynamic Fields

The Render Video module uses dynamic field loading:

1. When you select a template from the dropdown, Make automatically fetches that template's merge fields
2. The merge fields appear as individual input fields in the module configuration
3. Field types are automatically mapped:
   - text → text input
   - number → number input
   - color → text input (enter color values like #FF0000)
   - image → URL input (provide image URLs)

This eliminates the need to manually structure JSON and provides a user-friendly form interface.

## Resources

- [OpenVideo API Documentation](https://app.openvideo.dev/docs/api)
- [Make Custom Apps Documentation](https://www.make.com/en/help/apps/integrations)
- [OpenVideo Dashboard](https://app.openvideo.dev)

## Technical Details

**Base URL:** `https://app.openvideo.dev/api/v1`

**Authentication:** Bearer token (API key)

**Webhook Events:** OpenVideo sends webhook events for render completion with the following payload structure:
```json
{
  "event": "render.completed",
  "data": {
    "renderId": "render_123"
  }
}
```

## Support

For issues with the OpenVideo API, contact support through the OpenVideo dashboard.

For Make-specific integration issues, refer to Make's support documentation.
