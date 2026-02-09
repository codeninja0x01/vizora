# Phase 10: External Integrations - Research

**Researched:** 2026-02-09
**Domain:** Integration platforms (n8n, Zapier, Make), REST hooks, dynamic field loading
**Confidence:** HIGH

## Summary

Building integrations for n8n, Zapier, and Make follows distinct patterns per platform but shares common principles: API key authentication with test endpoints, REST hooks for webhook subscriptions, and dynamic field loading for template-based parameter generation.

**n8n** uses TypeScript-based npm packages with no approval process (fastest to publish). **Zapier** requires CLI-based development with REST hooks mandatory for webhook triggers (private beta recommended before public listing). **Make** uses JSON-based custom apps with RPC calls for dynamic parameters (moderate complexity).

All three platforms support API key authentication, dynamic dropdown fields based on API responses, and automatic retry on 429 rate limit errors. The key architectural decision is abstracting shared OpenVideo API client logic into a reusable module that all three integrations consume.

**Primary recommendation:** Build n8n first (fastest iteration, developer-focused audience), abstract shared logic during development, then port to Zapier (largest reach), finally Make (completeness). Use TypeScript for shared API client, publish as internal package consumed by all three integrations.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Auth in integrations:**
- API key authentication — users paste their `sk_live_` key from the OpenVideo dashboard
- Connection test endpoint required — hit a lightweight endpoint (e.g., GET /api/v1/me) to verify the key before saving
- After connecting, show organization name + plan tier (e.g., "Acme Corp (Pro)")
- Clear rate limit errors with retry guidance — Zapier/n8n can auto-retry on 429s

**Actions & triggers:**
- **Actions exposed:**
  - Render Video — submit single render with template ID + merge data (maps to POST /api/v1/renders). Returns immediately (async, not polling)
  - List Templates — fetch available templates for dynamic dropdown selection
  - Get Render Status — poll a specific render by ID
- **Triggers exposed:**
  - Render Completed — fires when a render finishes successfully. Maps to existing webhook system
- **Not included this phase:** Batch Render action, Render Failed trigger, generic Any Render Event trigger
- Render Completed trigger payload: minimal — render ID and status URL only (not full payload with video URL and merge data)

**Dynamic field mapping:**
- Dynamic fields loaded per template — after user selects a template, integration fetches its merge fields and renders them as input fields
- Template dropdown shows org-owned templates plus cloned gallery templates
- All merge fields shown including optional ones, with default values as placeholder hints
- Merge field types map to platform-native input types where supported (color picker for color, number input for numbers, text for text)

**Platform priority & approach:**
- **Build order:** n8n first, then Zapier, then Make
- **n8n:** Community node published as npm package (n8n-nodes-openvideo). No approval process needed
- **Zapier:** Private/invite-only first for beta validation, then submit for public App Directory listing
- **Make:** Third priority, built after Zapier using same patterns

### Claude's Discretion

- Exact n8n node implementation patterns (credential type, node type structure)
- Zapier CLI vs Platform UI for app development
- Make module packaging format
- Shared integration logic abstraction between platforms
- Error message formatting per platform conventions
- Webhook subscription management (REST hooks vs polling)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope

</user_constraints>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @n8n/node-cli | Latest | n8n node scaffolding and development | Official tool from n8n, ensures structure meets verification requirements |
| zapier-platform-cli | Latest | Zapier integration development and testing | Official Zapier CLI, required for local testing and deployment |
| Make SDK | Latest (VS Code extension) | Make custom app development | Official tool for local development and version control of Make apps |
| axios | ^1.6.0 | HTTP client for API calls | Standard HTTP client with retry support, works in all platforms |
| zod | ^3.22.0 | Runtime type validation | Validate API responses and user input, TypeScript-first schema validation |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| axios-retry | ^4.0.0 | Automatic retry with exponential backoff | Handle 429 rate limits and transient failures |
| dotenv | ^16.0.0 | Environment variable management | Local development and testing API keys |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Zapier CLI | Zapier Platform UI | UI is visual builder (no code), limits customization. CLI offers full JavaScript control, better for complex dynamic fields |
| axios | node-fetch | fetch is lighter but axios has built-in retry support via interceptors, better error handling |
| Shared TypeScript package | Copy-paste code | Shared package adds build complexity but ensures consistency, easier to maintain |

**Installation:**

```bash
# n8n development
npm install -g @n8n/node-cli
npm create @n8n/node
npm install axios zod axios-retry

# Zapier development
npm install -g zapier-platform-cli
zapier init openvideo
npm install axios zod axios-retry

# Make development (no npm dependencies - web interface or VS Code extension)
# Install VS Code extension: integromat.apps-sdk
```

## Architecture Patterns

### Recommended Project Structure

```
integrations/
├── shared/                     # Shared logic package
│   ├── src/
│   │   ├── client.ts          # OpenVideo API client
│   │   ├── types.ts           # Shared types (Template, Render, etc.)
│   │   ├── errors.ts          # Error handling utilities
│   │   └── validators.ts      # Zod schemas for API responses
│   ├── package.json
│   └── tsconfig.json
├── n8n-nodes-openvideo/       # n8n community node
│   ├── credentials/
│   │   └── OpenVideoApi.credentials.ts
│   ├── nodes/
│   │   └── OpenVideo/
│   │       ├── OpenVideo.node.ts           # Regular actions
│   │       ├── OpenVideoTrigger.node.ts    # Webhook trigger
│   │       └── icon.svg
│   ├── package.json
│   └── README.md
├── zapier-openvideo/          # Zapier integration
│   ├── authentication.js      # API key auth config
│   ├── triggers/
│   │   └── renderCompleted.js
│   ├── creates/
│   │   ├── renderVideo.js
│   │   └── getRenderStatus.js
│   ├── searches/
│   │   └── listTemplates.js
│   ├── index.js
│   └── package.json
└── make-openvideo/            # Make custom app
    ├── app.json               # App manifest
    ├── connections/
    │   └── api-key.json
    ├── modules/
    │   ├── renderVideo.json
    │   ├── getRenderStatus.json
    │   └── listTemplates.json
    ├── triggers/
    │   └── renderCompleted.json
    └── rpcs/
        ├── listTemplates.json
        └── loadMergeFields.json
```

### Pattern 1: Shared API Client

**What:** TypeScript class that encapsulates OpenVideo API calls, error handling, and rate limiting. Consumed by all three integrations.

**When to use:** All API interactions (auth test, list templates, render video, get status, webhook subscriptions).

**Example:**
```typescript
// Source: TypeScript API client best practices (https://dev.to/ra1nbow1/how-to-write-the-right-api-client-in-typescript-38g3)
import axios, { AxiosInstance } from 'axios';
import axiosRetry from 'axios-retry';
import { z } from 'zod';

const TemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  mergeFields: z.array(z.object({
    key: z.string(),
    type: z.enum(['text', 'number', 'color', 'image']),
    label: z.string(),
    required: z.boolean(),
    defaultValue: z.any().optional(),
  })),
});

export class OpenVideoClient {
  private client: AxiosInstance;

  constructor(apiKey: string, baseURL = 'https://api.openvideo.com/v1') {
    this.client = axios.create({
      baseURL,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    // Exponential backoff for 429s
    axiosRetry(this.client, {
      retries: 3,
      retryDelay: axiosRetry.exponentialDelay,
      retryCondition: (error) => {
        return error.response?.status === 429 || axiosRetry.isNetworkOrIdempotentRequestError(error);
      },
    });
  }

  async testConnection() {
    const response = await this.client.get('/me');
    return z.object({
      organizationName: z.string(),
      planTier: z.string(),
    }).parse(response.data);
  }

  async listTemplates() {
    const response = await this.client.get('/templates');
    return z.array(TemplateSchema).parse(response.data);
  }

  async renderVideo(templateId: string, mergeData: Record<string, any>) {
    const response = await this.client.post('/renders', {
      templateId,
      mergeData,
    });
    return response.data; // { id, status }
  }

  async getRenderStatus(renderId: string) {
    const response = await this.client.get(`/renders/${renderId}`);
    return response.data;
  }

  async subscribeWebhook(targetUrl: string, event: string) {
    const response = await this.client.post('/webhooks', {
      targetUrl,
      event,
    });
    return response.data; // { id }
  }

  async unsubscribeWebhook(subscriptionId: string) {
    await this.client.delete(`/webhooks/${subscriptionId}`);
  }
}
```

### Pattern 2: REST Hooks Subscription Lifecycle

**What:** Webhook subscription pattern where integrations create subscriptions when Zaps/workflows activate, receive events, and clean up on deactivation.

**When to use:** Render Completed trigger in all platforms.

**Example (Zapier):**
```javascript
// Source: Zapier REST hooks documentation (https://docs.zapier.com/platform/build/hook-trigger)
const subscribeHook = async (z, bundle) => {
  // Subscribe: called when Zap is turned on
  const response = await z.request({
    url: 'https://api.openvideo.com/v1/webhooks',
    method: 'POST',
    body: {
      targetUrl: bundle.targetUrl, // Unique URL per Zap
      event: 'render.completed',
    },
  });

  // Store subscription ID for later unsubscribe
  return { id: response.data.id };
};

const unsubscribeHook = async (z, bundle) => {
  // Unsubscribe: called when Zap is turned off
  await z.request({
    url: `https://api.openvideo.com/v1/webhooks/${bundle.subscribeData.id}`,
    method: 'DELETE',
  });
};

const performList = async (z, bundle) => {
  // Fallback polling for testing (not used in production with REST hooks)
  const response = await z.request({
    url: 'https://api.openvideo.com/v1/renders',
    params: {
      status: 'completed',
      limit: 100,
    },
  });
  return response.data;
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
    perform: performList,
    performSubscribe: subscribeHook,
    performUnsubscribe: unsubscribeHook,
    sample: {
      id: 'render_abc123',
      statusUrl: 'https://api.openvideo.com/v1/renders/render_abc123',
    },
  },
};
```

### Pattern 3: Dynamic Field Loading (Template-Dependent Merge Fields)

**What:** After user selects a template, integration fetches that template's merge fields and renders them as input fields.

**When to use:** Render Video action in all platforms.

**n8n approach:**
```typescript
// Source: n8n loadOptions pattern (https://community.n8n.io/t/dynamic-properties/5449)
// In OpenVideo.node.ts
{
  displayName: 'Template',
  name: 'templateId',
  type: 'options',
  typeOptions: {
    loadOptionsMethod: 'getTemplates',
  },
  required: true,
  default: '',
},
{
  displayName: 'Merge Fields',
  name: 'mergeFields',
  type: 'fixedCollection',
  typeOptions: {
    multipleValues: true,
    loadOptionsMethod: 'getMergeFields', // Depends on templateId
  },
  displayOptions: {
    show: {
      operation: ['renderVideo'],
      templateId: { _cnd: { ne: '' } }, // Only show when template selected
    },
  },
}

// In methods: { loadOptions: {...} }
async getTemplates(): Promise<INodePropertyOptions[]> {
  const client = new OpenVideoClient(this.credentials.apiKey);
  const templates = await client.listTemplates();
  return templates.map(t => ({ name: t.name, value: t.id }));
}

async getMergeFields(): Promise<INodePropertyOptions[]> {
  const templateId = this.getNodeParameter('templateId') as string;
  const client = new OpenVideoClient(this.credentials.apiKey);
  const templates = await client.listTemplates();
  const template = templates.find(t => t.id === templateId);
  return template.mergeFields.map(f => ({
    name: f.label,
    value: f.key,
    description: f.required ? 'Required' : 'Optional',
  }));
}
```

**Zapier approach:**
```javascript
// Source: Zapier dynamic dropdowns (https://docs.zapier.com/platform/build/dynamic-dropdowns)
const renderVideoAction = {
  key: 'renderVideo',
  noun: 'Render',
  display: {
    label: 'Render Video',
    description: 'Create a new video render from a template.',
  },
  operation: {
    inputFields: [
      {
        key: 'templateId',
        label: 'Template',
        type: 'string',
        required: true,
        dynamic: 'listTemplatesDropdown.id.name',
        altersDynamicFields: true, // Signals dependent fields need refresh
      },
      async (z, bundle) => {
        // Dynamic function: called after templateId selected
        if (!bundle.inputData.templateId) return [];

        const response = await z.request({
          url: `https://api.openvideo.com/v1/templates/${bundle.inputData.templateId}`,
        });
        const template = response.data;

        return template.mergeFields.map(field => ({
          key: `mergeData__${field.key}`,
          label: field.label,
          type: field.type === 'number' ? 'number' : 'string',
          required: field.required,
          helpText: field.defaultValue ? `Default: ${field.defaultValue}` : undefined,
        }));
      },
    ],
    perform: async (z, bundle) => {
      const { templateId, ...rest } = bundle.inputData;
      const mergeData = {};
      Object.keys(rest).forEach(key => {
        if (key.startsWith('mergeData__')) {
          mergeData[key.replace('mergeData__', '')] = rest[key];
        }
      });

      return z.request({
        url: 'https://api.openvideo.com/v1/renders',
        method: 'POST',
        body: { templateId, mergeData },
      });
    },
  },
};
```

**Make approach:**
```json
// Source: Make dynamic options RPC (https://developers.make.com/custom-apps-documentation/app-components/rpcs/dynamic-options-rpc)
// In modules/renderVideo.json
{
  "interface": [
    {
      "name": "templateId",
      "label": "Template",
      "type": "select",
      "required": true,
      "options": "rpc://listTemplates"
    },
    {
      "name": "mergeFields",
      "label": "Merge Fields",
      "type": "array",
      "spec": "rpc://loadMergeFields?templateId={{parameters.templateId}}"
    }
  ]
}

// In rpcs/listTemplates.json
{
  "url": "/templates",
  "method": "GET",
  "response": {
    "output": "{{body.map(t => ({ label: t.name, value: t.id }))}}"
  }
}

// In rpcs/loadMergeFields.json
{
  "url": "/templates/{{parameters.templateId}}",
  "method": "GET",
  "response": {
    "output": "{{body.mergeFields.map(f => ({ name: f.key, label: f.label, type: f.type, required: f.required }))}}"
  }
}
```

### Pattern 4: API Key Authentication with Connection Test

**What:** Store API key securely, test it before saving, display org info on success.

**When to use:** Initial authentication setup in all platforms.

**n8n approach:**
```typescript
// Source: n8n credentials (https://docs.n8n.io/integrations/builtin/credentials/httprequest/)
// credentials/OpenVideoApi.credentials.ts
import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class OpenVideoApi implements ICredentialType {
  name = 'openVideoApi';
  displayName = 'OpenVideo API';
  properties: INodeProperties[] = [
    {
      displayName: 'API Key',
      name: 'apiKey',
      type: 'string',
      typeOptions: { password: true },
      default: '',
      placeholder: 'sk_live_...',
    },
  ];

  async authenticate(credentials: any): Promise<any> {
    return {
      headers: {
        'Authorization': `Bearer ${credentials.apiKey}`,
      },
    };
  }

  async test(credentials: any): Promise<boolean> {
    const client = new OpenVideoClient(credentials.apiKey);
    try {
      const info = await client.testConnection();
      // n8n displays this message on success
      return { status: 'OK', message: `Connected as ${info.organizationName} (${info.planTier})` };
    } catch (error) {
      return { status: 'Error', message: error.message };
    }
  }
}
```

**Zapier approach:**
```javascript
// Source: Zapier API key auth (https://docs.zapier.com/platform/build/apikeyauth)
const authentication = {
  type: 'custom',
  fields: [
    {
      key: 'apiKey',
      label: 'API Key',
      type: 'string',
      required: true,
      helpText: 'Find your API key in the OpenVideo dashboard under Settings > API Keys.',
    },
  ],
  test: async (z, bundle) => {
    const response = await z.request({
      url: 'https://api.openvideo.com/v1/me',
    });
    if (response.status !== 200) {
      throw new Error('Invalid API key');
    }
    // Return user-visible label
    return {
      organizationName: response.data.organizationName,
      planTier: response.data.planTier,
    };
  },
  connectionLabel: '{{organizationName}} ({{planTier}})', // Displayed in Zap editor
};

const addApiKeyToHeader = (request, z, bundle) => {
  request.headers['Authorization'] = `Bearer ${bundle.authData.apiKey}`;
  return request;
};

module.exports = {
  authentication,
  beforeRequest: [addApiKeyToHeader],
};
```

**Make approach:**
```json
// Source: Make connection API key auth (https://www.make.com/en/how-to-guides/build-custom-app-in-make)
// connections/api-key.json
{
  "name": "api-key",
  "label": "OpenVideo API Key",
  "type": "apiKey",
  "parameters": [
    {
      "name": "apiKey",
      "label": "API Key",
      "type": "text",
      "required": true,
      "help": "Find your API key in the OpenVideo dashboard under Settings > API Keys.",
      "sanitize": true
    }
  ],
  "verify": {
    "url": "/me",
    "method": "GET",
    "headers": {
      "Authorization": "Bearer {{connection.apiKey}}"
    },
    "response": {
      "label": "{{body.organizationName}} ({{body.planTier}})"
    }
  }
}
```

### Anti-Patterns to Avoid

- **Don't duplicate API logic:** All three integrations should use the shared API client. Copy-pasting HTTP calls leads to inconsistent error handling and drift.
- **Don't hardcode field lists:** Merge fields must be fetched dynamically per template. Hardcoding breaks when templates change.
- **Don't retry 4xx errors:** Only retry 429 (rate limit) and 5xx (server errors). 401/403 (auth) and 400 (validation) should fail immediately with clear messages.
- **Don't ignore Retry-After headers:** When API returns 429 with Retry-After header, use that value instead of arbitrary delays.
- **Don't expose full webhook payload:** Render Completed trigger returns minimal data (ID + status URL). Fetching full details requires Get Render Status action.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTP retry logic | Custom setTimeout loops | axios-retry | Handles exponential backoff with jitter, respects 429 Retry-After headers, prevents thundering herd |
| API response validation | Manual type checks | Zod schemas | Runtime type safety, clear error messages, catches API changes early |
| Webhook subscription management | Custom database/cache | Platform-provided subscription storage | Zapier stores subscribeData, n8n handles webhook URLs, Make manages triggers — reinventing breaks platform features |
| Dynamic field metadata | Custom field type mapping | Platform native types | Each platform has different input types (n8n: INodePropertyOptions, Zapier: inputFields schema, Make: interface spec) |
| Rate limit detection | Parsing error messages | Check response.status === 429 | Error messages vary, status codes are standard, missing 429 breaks auto-retry |

**Key insight:** Integration platforms abstract complex concerns (webhook lifecycle, credential storage, retry logic). Fighting these abstractions creates bugs and maintenance burden. Embrace platform conventions.

## Common Pitfalls

### Pitfall 1: Treating Webhooks as Fire-and-Forget

**What goes wrong:** Integration registers webhook subscription but doesn't handle unsubscribe, causing OpenVideo to send events to dead endpoints indefinitely.

**Why it happens:** Developers test "happy path" (Zap activates, receives events) but don't test deactivation. Platforms require explicit unsubscribe endpoints.

**How to avoid:**
- Implement both `performSubscribe` and `performUnsubscribe` in Zapier
- Handle webhook cleanup in n8n trigger's `webhookDeleted` method
- Define unsubscribe RPC in Make trigger configuration
- Test full lifecycle: create Zap → activate → receive event → deactivate → verify subscription deleted

**Warning signs:**
- Webhook endpoint shows growing list of subscriptions without cleanup
- Platform logs show 410 responses (dead endpoint) after Zap deactivation
- Rate limit errors from sending events to inactive workflows

### Pitfall 2: Dynamic Fields That Don't Update

**What goes wrong:** User selects Template A (with fields X, Y), then switches to Template B (with fields Z, W), but fields X, Y still show instead of Z, W.

**Why it happens:** Forgot to set `altersDynamicFields: true` (Zapier) or `displayOptions` (n8n), causing platforms to cache field definitions.

**How to avoid:**
- Zapier: Set `altersDynamicFields: true` on parent field (templateId)
- n8n: Use `displayOptions.show` with template condition, implement `loadOptionsMethod` that checks current templateId
- Make: Use nested RPC with `{{parameters.templateId}}` query parameter
- Always test: select template A → verify fields → switch to template B → verify fields refresh

**Warning signs:**
- Fields from wrong template showing in UI
- "Field X not found" errors when submitting (field doesn't exist for selected template)
- Users report "fields don't match template"

### Pitfall 3: Poor Error Messages on 429 Rate Limits

**What goes wrong:** User hits rate limit, sees generic "Request failed" error, doesn't know how to fix it or that retry will happen automatically.

**Why it happens:** Platforms auto-retry 429s but default error messages don't explain this. Users think integration is broken.

**How to avoid:**
- Wrap API client errors with user-friendly messages:
  ```typescript
  catch (error) {
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'] || 60;
      throw new Error(`Rate limit reached. Retrying automatically in ${retryAfter} seconds. No action needed.`);
    }
    throw error;
  }
  ```
- Include retry guidance in action descriptions: "Automatically retries on rate limits"
- Test with deliberately low rate limits to verify messages

**Warning signs:**
- Support tickets asking "why did my Zap fail with 429?"
- Users manually retrying workflows that would auto-retry
- Confusion about "temporary" vs "permanent" failures

### Pitfall 4: Forgetting to Handle Optional Fields

**What goes wrong:** Template has optional merge field with default value, user leaves it blank, integration sends empty string instead of omitting field, render fails validation.

**Why it happens:** All form inputs return strings (even empty), but API expects field to be absent (not empty string) to trigger default value.

**How to avoid:**
- Filter out empty/undefined values before sending to API:
  ```typescript
  const mergeData = Object.entries(bundle.inputData)
    .filter(([key, value]) => key.startsWith('mergeData__') && value !== '' && value !== null && value !== undefined)
    .reduce((acc, [key, value]) => {
      acc[key.replace('mergeData__', '')] = value;
      return acc;
    }, {});
  ```
- Mark optional fields with `required: false` in field definitions
- Test with: all fields filled, only required fields filled, mix of required + some optional

**Warning signs:**
- API returns 400 "invalid value for X" when field is empty string
- Default values not applying when user leaves field blank
- Required vs optional distinction not clear to users

### Pitfall 5: Assuming Synchronous Render Completion

**What goes wrong:** Render Video action waits for render to complete before returning, times out after 30 seconds on long renders.

**Why it happens:** Developer confused "action completes" with "render completes". Actions should return immediately, workflows use trigger for completion.

**How to avoid:**
- Render Video action returns `{ id, status: 'processing' }` immediately
- Documentation explains: "Use Render Completed trigger to detect completion, or Get Render Status action to poll"
- Never poll in action perform function (creates timeout issues)
- Sample response shows `status: 'processing'` not `status: 'completed'`

**Warning signs:**
- Actions timing out on renders >30 seconds
- Users asking "how do I know when it's done?"
- Confusion between action completion and render completion

### Pitfall 6: n8n Community Node Publishing Blockers

**What goes wrong:** Submit node for verification, rejected for violating requirements (runtime dependencies, missing README, wrong package name).

**Why it happens:** n8n has strict verification guidelines not enforced during local development.

**How to avoid:**
- Use `@n8n/node-cli` to scaffold (enforces structure)
- Package name MUST start with `n8n-nodes-` or `@scope/n8n-nodes-`
- NO runtime dependencies allowed (dev dependencies OK)
- README required with: installation, credential setup, action/trigger examples
- Test locally with `npm pack` → `n8n install` before submitting
- Check verification guidelines: https://docs.n8n.io/integrations/creating-nodes/build/reference/verification-guidelines/

**Warning signs:**
- Verification rejection email citing structure issues
- `n8n install` fails with "invalid package name"
- Missing icon.svg (required for each node)

### Pitfall 7: Zapier Private vs Public App Confusion

**What goes wrong:** Build integration, try to publish to App Directory immediately, confused about invite-only phase.

**Why it happens:** Zapier has two distinct paths: private apps (invite-only, no review) and public apps (reviewed, listed in directory).

**How to avoid:**
- Start with private app for beta testing (no approval needed)
- Share invite link with early users: Settings → Sharing → Invite link
- After validation (10+ active users recommended), submit for public directory
- Public submission requires: testing account for Zapier team, branding assets, help docs
- Timeline: Private app live immediately, public review takes ~1 week

**Warning signs:**
- Can't find "Publish to App Directory" button (app still in private mode)
- Zapier requesting testing account prematurely (only needed for public)
- Users can't find app in directory (still private, need invite)

## Code Examples

All examples verified against official platform documentation (linked in Pattern sections above).

### n8n: Complete Node with Actions and Trigger

See Pattern 3 and 4 for loadOptions and credentials examples.

**Key files:**
- `credentials/OpenVideoApi.credentials.ts` - API key credential type
- `nodes/OpenVideo/OpenVideo.node.ts` - Regular actions (Render Video, Get Status, List Templates)
- `nodes/OpenVideo/OpenVideoTrigger.node.ts` - Webhook trigger (Render Completed)

### Zapier: Complete Integration Structure

See Pattern 2, 3, 4 for hook trigger, dynamic fields, and authentication examples.

**Key files:**
- `authentication.js` - API key auth with connection test
- `triggers/renderCompleted.js` - REST hook trigger
- `creates/renderVideo.js` - Action with dynamic fields
- `searches/listTemplates.js` - Used for dynamic dropdown

### Make: Custom App with RPCs

See Pattern 3 and 4 for dynamic options RPC and connection examples.

**Key files:**
- `connections/api-key.json` - Connection type with verify endpoint
- `modules/renderVideo.json` - Module with interface referencing RPCs
- `rpcs/listTemplates.json` - Dynamic options RPC
- `rpcs/loadMergeFields.json` - Nested RPC with parameter passing

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Zapier static webhooks | REST hooks required for public apps | 2022 | All webhook triggers must implement subscribe/unsubscribe endpoints |
| Hardcoded field lists | Dynamic field loading via API | Ongoing standard | Users see accurate fields per template, less maintenance |
| Manual retry logic | Platform automatic retry on 429 | Built into platforms | Integrations simpler, consistent retry behavior |
| n8n nodes with runtime deps | Verified nodes: zero runtime deps | 2023 verification guidelines | Must bundle all logic, or publish separate helper package |
| Zapier Platform UI only | CLI + Platform UI options | CLI added 2016, UI added 2018 | Complex integrations use CLI (better for dynamic fields, version control) |
| Make manual JSON editing | VS Code SDK with local dev | SDK released 2023 | Version control for Make apps, faster iteration |

**Deprecated/outdated:**
- **Zapier polling-only triggers:** REST hooks are now standard and required for public apps. Polling triggers still work but are discouraged (slow, less reliable, higher API usage).
- **n8n community nodes without CLI:** Building nodes manually (without `@n8n/node-cli`) works locally but won't pass verification. Always use CLI scaffolding.
- **Make web-only editing:** While still supported, local development via VS Code SDK is now recommended for version control and collaboration.

## Open Questions

1. **OpenVideo API `/me` endpoint response structure**
   - What we know: Need to return organization name and plan tier for connection label
   - What's unclear: Exact field names (`organizationName` or `org_name`? `planTier` or `plan`?)
   - Recommendation: Define in API spec before integration development starts. If not standardized, add transform layer in shared client.

2. **Webhook subscription storage and expiration**
   - What we know: Platforms handle storage (Zapier: subscribeData, n8n: workflow state, Make: trigger config)
   - What's unclear: Does OpenVideo webhook system support expiration dates? (Zapier can auto-renew if webhook subscriptions expire)
   - Recommendation: Implement non-expiring subscriptions if possible. If expiration required, return `expiration_date` (ISO8601) from subscribe endpoint and handle renewal.

3. **Rate limit Retry-After header format**
   - What we know: 429 responses should include Retry-After header for accurate retry timing
   - What's unclear: Does OpenVideo API return this header? Format: seconds (integer) or HTTP-date (string)?
   - Recommendation: Verify API returns Retry-After header in seconds (integer). Falls back to exponential backoff if missing.

4. **Merge field type mapping edge cases**
   - What we know: Map text→text, number→number, color→color, image→file/URL
   - What's unclear: Does OpenVideo have array fields, object fields, or only primitives? How to handle in forms?
   - Recommendation: If only primitives for Phase 10, document this. If complex types needed, Zapier supports line_item (array of objects), n8n supports fixedCollection (nested objects), Make supports array spec.

5. **Template visibility and permissions**
   - What we know: "List Templates" should show org-owned + cloned gallery templates
   - What's unclear: Does API endpoint handle filtering automatically, or must integration filter client-side?
   - Recommendation: API should return only templates accessible to the authenticated user. Integration shouldn't need permission logic.

## Sources

### Primary (HIGH confidence)

Official documentation consulted:

**n8n:**
- [Building community nodes](https://docs.n8n.io/integrations/community-nodes/build-community-nodes/) - Package structure, naming requirements
- [Submit community nodes](https://docs.n8n.io/integrations/creating-nodes/deploy/submit-community-nodes/) - Publishing and verification process
- [Community node verification guidelines](https://docs.n8n.io/integrations/creating-nodes/build/reference/verification-guidelines/) - Verification requirements
- [HTTP Request credentials](https://docs.n8n.io/integrations/builtin/credentials/httprequest/) - Authentication patterns
- [n8n community discussions](https://community.n8n.io/t/dynamic-properties/5449) - Dynamic fields and loadOptions

**Zapier:**
- [Add REST Hook trigger](https://docs.zapier.com/platform/build/hook-trigger) - REST hooks subscription pattern
- [Add authentication with API Key](https://docs.zapier.com/platform/build/apikeyauth) - API key authentication
- [Use dynamic dropdowns](https://docs.zapier.com/platform/build/dynamic-dropdowns) - Dynamic field loading
- [Build your first public integration](https://docs.zapier.com/platform/publish/public-integration) - Publishing process
- [Use private apps with Zapier](https://help.zapier.com/hc/en-us/articles/8496312360461-Use-private-apps-with-Zapier) - Private vs public apps
- [GitHub: zapier-platform-example-app-rest-hooks](https://github.com/zapier/zapier-platform-example-app-rest-hooks) - REST hooks example
- [GitHub: zapier-platform-example-app-custom-auth](https://github.com/zapier/zapier-platform-example-app-custom-auth) - Authentication example

**Make:**
- [Custom Apps Documentation](https://developers.make.com/custom-apps-documentation) - Overview and getting started
- [Dynamic options RPC](https://developers.make.com/custom-apps-documentation/app-components/rpcs/dynamic-options-rpc) - RPC pattern for dynamic dropdowns
- [Dynamic fields RPC](https://developers.make.com/custom-apps-documentation/app-structure/rpcs/types-of-rpcs/dynamic-fields-rpc) - Dynamic field generation
- [Remote Procedure Calls](https://developers.make.com/custom-apps-documentation/app-components/rpcs) - RPC system overview
- [How to Build a Custom App in Make](https://www.make.com/en/how-to-guides/build-custom-app-in-make) - Tutorial

**REST Hooks Standard:**
- [REST Hooks](https://resthooks.org/) - Specification and best practices
- [Zapier: django-rest-hooks](https://github.com/zapier/django-rest-hooks) - Reference implementation
- [Zapier: Introducing RESTHooks.org](https://zapier.com/engineering/introducing-resthooksorg/) - Pattern explanation

### Secondary (MEDIUM confidence)

**Best Practices:**
- [Best practices for handling API rate limits and 429 errors](https://help.docebo.com/hc/en-us/articles/31803763436946-Best-practices-for-handling-API-rate-limits-and-429-errors) - Rate limit handling
- [Complete Guide to Handling API Rate Limits](https://www.ayrshare.com/complete-guide-to-handling-rate-limits-prevent-429-errors/) - Exponential backoff with jitter
- [How to write the right API client in TypeScript](https://dev.to/ra1nbow1/how-to-write-the-right-api-client-in-typescript-38g3) - API client patterns
- [TypeScript Guidelines: API Design](https://azure.github.io/azure-sdk/typescript_design.html) - Azure SDK patterns
- [Building Robust Client Libraries](https://kanakkholwal.medium.com/building-robust-client-libraries-for-your-application-best-practices-for-javascript-and-typescript-769108d5c8ba) - Client library architecture

**Comparisons and Context:**
- [n8n vs Zapier](https://n8n.io/vs/zapier/) - Platform differences
- [n8n vs Zapier: The Definitive 2026 Automation Face-Off](https://hatchworks.com/blog/ai-agents/n8n-vs-zapier/) - Feature comparison

### Tertiary (LOW confidence, marked for validation)

**Community Examples:**
- [How to Create and Publish a Custom n8n Community Node](https://medium.com/@omarwaliedismail/how-to-create-and-publish-a-custom-n8n-community-node-1fb4f32658c2) - Tutorial (verify steps with official docs)
- [n8n Credentials Explained](https://automategeniushub.com/guide-to-n8n-credentials/) - Third-party guide (use official docs as source of truth)

## Metadata

**Confidence breakdown:**
- n8n development: HIGH - Official docs comprehensive, CLI scaffolding standardizes structure
- Zapier development: HIGH - Official docs detailed, multiple example repositories, REST hooks well-documented
- Make development: MEDIUM - Official docs available but less detailed than n8n/Zapier, newer SDK (2023)
- Shared API client architecture: MEDIUM - Pattern is standard but OpenVideo API contract not yet defined
- Dynamic field loading: HIGH - All three platforms document this clearly with examples
- REST hooks subscription: HIGH - Zapier created the standard, well-documented across platforms
- Publishing processes: HIGH - n8n and Zapier processes well-documented, Make less clear
- Rate limit handling: HIGH - Standard HTTP pattern, well-documented in multiple sources

**Research date:** 2026-02-09
**Valid until:** 2026-03-09 (30 days - stable domain, but platform APIs evolve quarterly)

**Verification needed before planning:**
1. OpenVideo API endpoints: `/me`, `/templates`, `/renders`, `/webhooks` (confirm response schemas)
2. OpenVideo rate limits and 429 response format (confirm Retry-After header presence)
3. Template merge field types (confirm supported types: text, number, color, image - any others?)
4. Webhook event payload structure (confirm minimal payload: just render ID + status URL)
5. Template access permissions (confirm API filters by org ownership + cloned gallery templates)
