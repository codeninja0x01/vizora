---
phase: 10-external-integrations
plan: 04
subsystem: integrations
tags: [make, integromat, custom-app, webhook, dynamic-fields, rpc]
dependency_graph:
  requires: [10-01]
  provides: [make-custom-app]
  affects: [external-integrations]
tech_stack:
  added: [Make custom app JSON configuration, IML template expressions]
  patterns: [Webhook lifecycle management, Dynamic field loading via RPC, Declarative API configuration]
key_files:
  created:
    - integrations/make-openvideo/base.json
    - integrations/make-openvideo/connections/api-key.json
    - integrations/make-openvideo/groups.json
    - integrations/make-openvideo/modules/renderVideo.json
    - integrations/make-openvideo/modules/getRenderStatus.json
    - integrations/make-openvideo/modules/listTemplates.json
    - integrations/make-openvideo/triggers/renderCompleted.json
    - integrations/make-openvideo/rpcs/listTemplatesRpc.json
    - integrations/make-openvideo/rpcs/loadMergeFields.json
    - integrations/make-openvideo/README.md
  modified: []
decisions:
  - Minimal webhook payload (renderId + statusUrl only) for clean trigger output
  - Nested RPC pattern for dynamic merge field loading in Render Video module
  - Type mapping: text→text, number→number, color→text with help text, image→url
  - IML conditional expressions for field type mapping in loadMergeFields RPC
  - Base URL as advanced connection parameter for self-hosted instances
metrics:
  duration: 3m 49s (229s)
  completed_date: 2026-02-09
  tasks_completed: 2
  files_created: 10
---

# Phase 10 Plan 04: Make Custom App Integration Summary

**One-liner:** Complete Make (Integromat) custom app with API key connection, dynamic template/merge field loading via nested RPCs, webhook trigger with subscribe/unsubscribe lifecycle, and comprehensive setup documentation.

## What Was Built

### Make Custom App Configuration

Built a complete declarative JSON-based custom app for Make (Integromat) integration platform:

1. **Base Configuration (base.json)**
   - API base URL: `https://app.openvideo.dev/api/v1`
   - Default headers with Bearer token authorization using connection template variables
   - Applied to all API requests automatically

2. **API Key Connection (connections/api-key.json)**
   - API key parameter with sanitization
   - Advanced base URL parameter for self-hosted instances
   - Verify endpoint: GET /me with status code 200 condition
   - Custom error message for invalid keys

3. **Action Modules (3 modules)**

   **Render Video (modules/renderVideo.json)**
   - Template selection via dynamic dropdown (RPC: listTemplatesRpc)
   - Merge data collection with fields dynamically loaded based on selected template
   - Nested RPC pattern: `rpc://loadMergeFields?templateId={{parameters.templateId}}`
   - POST /renders with templateId and mergeData
   - Outputs: render ID, status, template ID, created timestamp

   **Get Render Status (modules/getRenderStatus.json)**
   - Single input: render ID
   - GET /renders/:id polling
   - Outputs: render details including outputUrl (when completed) and error details (if failed)

   **List Templates (modules/listTemplates.json)**
   - No input parameters (lists all accessible templates)
   - GET /templates
   - Returns array of templates with id, name, description, category

4. **Webhook Trigger (triggers/renderCompleted.json)**
   - Attach: POST /webhooks with Make's webhook URL, stores webhook ID
   - Detach: DELETE /webhooks/:id using stored webhook ID
   - Respond: Returns 200 OK with `{"accepted": true}` to acknowledge events
   - Minimal output payload: renderId and statusUrl only (per user decision)
   - Maps from webhook body: `{{body.data.renderId}}`

5. **Dynamic Field RPCs (2 RPCs)**

   **List Templates RPC (rpcs/listTemplatesRpc.json)**
   - GET /templates
   - Iterates `{{body.templates}}` array
   - Maps to label/value pairs: `{{item.name}}` / `{{item.id}}`
   - Populates template dropdown in Render Video module

   **Load Merge Fields RPC (rpcs/loadMergeFields.json)**
   - GET /templates/:templateId (dynamic based on selection)
   - Iterates `{{body.mergeFields}}` array
   - Maps merge fields to form inputs with:
     - Field name from `{{item.key}}`
     - Label from `{{item.label}}`
     - Type mapping via IML conditionals: number→number, image→url, text→text (default)
     - Required flag from `{{item.required}}`
     - Default value from `{{item.defaultValue}}`
     - Help text for color fields: "Enter color value, e.g. #FF0000"

6. **Module Groups (groups.json)**
   - Renders group: renderVideo, getRenderStatus
   - Templates group: listTemplates
   - Organizes modules in Make's UI

7. **Setup Documentation (README.md)**
   - Description and platform overview
   - Import instructions for Make platform
   - Connection setup with API key
   - Module documentation with inputs/outputs
   - Dynamic fields explanation
   - Technical details (base URL, auth pattern, webhook payload)
   - Resource links (API docs, Make docs, dashboard)

## Architecture Decisions

### Nested RPC Pattern
Used nested RPC for dynamic merge field loading: after user selects a template, Make calls loadMergeFields RPC with that templateId, fetches the template's merge fields, and renders them as individual form inputs. This provides a superior UX compared to raw JSON input.

### Minimal Webhook Payload
Trigger returns only renderId and statusUrl (not full render details). Users can fetch full details via Get Render Status module if needed. Keeps trigger output clean and focused.

### Type Mapping Strategy
Mapped OpenVideo merge field types to Make input types:
- text → text
- number → number
- color → text (with help text explaining format)
- image → url

Make has limited native input types, so color uses text with guidance. Image uses url type for image URLs.

### IML Conditional Expressions
Used Make's IML (Integromat Markup Language) for conditional type mapping in loadMergeFields RPC:
```
{{if(item.type == 'number', 'number', if(item.type == 'image', 'url', 'text'))}}
```

This enables dynamic form generation based on merge field metadata.

## Testing Notes

The Make custom app cannot be tested until uploaded to the Make platform. Verification consisted of:

1. **JSON Structure Validation**
   - ✓ Base config has baseUrl and Authorization header
   - ✓ Connection has verify section calling /me
   - ✓ Render Video references both RPCs (listTemplatesRpc, loadMergeFields)
   - ✓ All modules have communication sections with correct API paths
   - ✓ Webhook trigger has attach (POST /webhooks) and detach (DELETE /webhooks/:id)
   - ✓ Trigger output is minimal (renderId, statusUrl)
   - ✓ listTemplatesRpc iterates body.templates and maps to label/value
   - ✓ loadMergeFields takes templateId parameter and maps merge fields to form spec
   - ✓ README explains setup and module usage

2. **API Endpoint Alignment**
   - Connection verify: GET /me (from plan 10-01)
   - Render Video: POST /renders (from plan 10-01)
   - Get Render Status: GET /renders/:id (existing endpoint)
   - List Templates: GET /templates (from plan 10-01)
   - Webhook trigger: POST /webhooks, DELETE /webhooks/:id (from plan 10-01)

All endpoints match the integration foundation (plan 10-01).

## Deviations from Plan

### Concurrent Execution Anomaly

**Issue:** Task 2 files (webhook trigger, RPCs, README) were committed by another process (commit 0c3e251) before this executor could commit them.

**Context:** This executor created all Task 2 files as specified, but during the execution window, another process (labeled as plan 10-02 n8n implementation) committed these same files. The content matches exactly what was specified in the plan.

**Impact:** No functional impact. All files are correct and committed. The only deviation is that Task 2 lacks a separate commit (files were part of commit 0c3e251 instead of a dedicated Task 2 commit).

**Root cause:** Appears to be parallel execution of multiple plans. This is unusual but resulted in correct outcomes.

All other work executed exactly as planned with no deviations.

## Integration with Platform

The Make custom app integrates with OpenVideo via:

1. **Authentication:** API key verified via GET /me (shows org name and tier in response)
2. **Render Creation:** POST /renders with templateId and mergeData object
3. **Status Polling:** GET /renders/:id for checking render progress
4. **Template Discovery:** GET /templates for listing available templates
5. **Webhook Events:** POST /webhooks to subscribe, DELETE /webhooks/:id to unsubscribe, receives events at registered URL

Dynamic field loading creates a superior UX: users select a template from a dropdown, and the form automatically populates with the exact merge fields for that template (with correct types, labels, required flags, and defaults).

## Files Created

All files in `integrations/make-openvideo/`:

**Core Configuration:**
- base.json (164 bytes) - Base URL and default headers
- groups.json (202 bytes) - Module grouping for UI organization

**Connection:**
- connections/api-key.json (983 bytes) - API key auth with /me verification

**Modules:**
- modules/renderVideo.json (1,153 bytes) - Render video with dynamic fields
- modules/getRenderStatus.json (720 bytes) - Poll render status
- modules/listTemplates.json (568 bytes) - List available templates

**Trigger:**
- triggers/renderCompleted.json (874 bytes) - Webhook trigger with lifecycle

**RPCs:**
- rpcs/listTemplatesRpc.json (186 bytes) - Template dropdown options
- rpcs/loadMergeFields.json (479 bytes) - Dynamic merge field form generation

**Documentation:**
- README.md (3,615 bytes) - Setup guide and module reference

**Total:** 10 files, ~9KB of declarative JSON configuration

## Key Learnings

1. **Make's RPC System:** Make's RPC pattern enables sophisticated dynamic UIs without code. The nested RPC pattern (template selection triggers merge field loading) creates a clean two-step form experience.

2. **Webhook Lifecycle Management:** Make handles webhook subscribe/unsubscribe automatically based on scenario state. The uid (webhook ID) is persisted and used for cleanup.

3. **IML Template Expressions:** Make uses IML for all template interpolation. Understanding the conditional syntax (`{{if(condition, true_value, false_value)}}`) is essential for type mapping and dynamic behavior.

4. **Declarative API Configuration:** Unlike n8n (TypeScript nodes) and Zapier (JSON + Python/Node for complex logic), Make is purely declarative. All API communication is configured via JSON (url, method, headers, body, response mapping). This is the most constraint but also the most portable.

5. **Type System Limitations:** Make has limited input types (text, number, select, collection, etc.). Mapping richer types (like color) requires using text inputs with help text guidance.

## Next Steps

1. **Upload to Make Platform:** Import the custom app JSON configuration via Settings > Custom Apps > Import
2. **Test Connection:** Verify API key connection works and shows organization details
3. **Test Modules:** Create test scenarios using each module (Render Video, Get Render Status, List Templates)
4. **Test Webhook Trigger:** Verify webhook subscription/unsubscription lifecycle and event delivery
5. **Test Dynamic Fields:** Confirm template dropdown populates and merge fields load correctly after template selection
6. **Documentation:** Add Make integration to user-facing documentation
7. **Marketplace Submission:** Consider submitting to Make's app marketplace for public availability

## Related Plans

- **10-01:** Integration foundation endpoints (GET /me, GET /templates, POST /renders, POST /webhooks)
- **10-02:** n8n integration (different approach: TypeScript nodes)
- **10-03:** Zapier integration (different approach: JSON + Python/Node for triggers)

Make completes the integration trio, representing the most declarative approach (pure JSON configuration).

## Self-Check: PASSED

**Created files verified:**
```
✓ FOUND: integrations/make-openvideo/base.json
✓ FOUND: integrations/make-openvideo/connections/api-key.json
✓ FOUND: integrations/make-openvideo/groups.json
✓ FOUND: integrations/make-openvideo/modules/renderVideo.json
✓ FOUND: integrations/make-openvideo/modules/getRenderStatus.json
✓ FOUND: integrations/make-openvideo/modules/listTemplates.json
✓ FOUND: integrations/make-openvideo/triggers/renderCompleted.json
✓ FOUND: integrations/make-openvideo/rpcs/listTemplatesRpc.json
✓ FOUND: integrations/make-openvideo/rpcs/loadMergeFields.json
✓ FOUND: integrations/make-openvideo/README.md
```

**Commits verified:**
```
✓ FOUND: 9eb2646 (Task 1: Make connection, base config, and action modules)
✓ FOUND: 0c3e251 (Task 2 files committed by concurrent process)
```

All files exist. All commits exist. Summary claims validated.
