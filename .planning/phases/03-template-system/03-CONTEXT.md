# Phase 3: Template System - Context

**Gathered:** 2026-02-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can create reusable video templates with dynamic merge fields from existing projects. Templates support CRUD operations, JSON schema validation of merge data, a browsable gallery of pre-built templates, and cloning templates to user accounts. Async rendering, storage, and billing are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Template creation flow
- "Save as Template" button inside the existing editor — user converts while working on a project
- Original project is preserved — template is a new entity created from a snapshot/copy of the project
- Template editing happens in the same editor with a "template mode" overlay showing merge field markers and template-specific toolbar
- Claude's discretion on how merge fields are marked on elements (toggle in properties panel, separate panel, etc.)

### Merge field definition
- Supported merge field types: text, image, video, audio, subtitle, and their properties (e.g., font size for text, volume for audio, position, etc.)
- No validation constraints beyond type — field type alone determines what's accepted
- Default values are auto-populated from the original project data — whatever was in the project at template creation time becomes the default
- Field keys use element/property names directly — no separate display names or descriptions

### Template gallery & cloning
- Gallery organized with both curated categories (e.g., "Social Media", "Ads", "Presentations") and free-form tags for refinement
- Template cards show: static thumbnail, template name, merge field count — minimal and clean
- Separate sections for "My Templates" (user dashboard) and "Template Gallery" (pre-built/community)
- Clone flow opens the template in editor mode for customization before saving to user's account

### Preview experience
- Side-by-side layout: merge field form on the left, rendered preview on the right
- Preview uses original project data as default values — no placeholder/lorem ipsum generation needed
- Preview is a playable video, not a static frame — both in the editor and in the gallery
- Gallery template cards link to a playable preview (consistent with editor preview experience)

### Claude's Discretion
- Merge field marking UX pattern (toggle in properties panel, dedicated panel, or contextual approach)
- Exact template mode overlay design and indicators
- Category taxonomy for the gallery
- JSON schema generation approach for template validation
- Template card layout and spacing in gallery grid

</decisions>

<specifics>
## Specific Ideas

- Preview data comes from the original project snapshot — when user clicks "Save as Template", whatever data exists becomes both the default values and the preview data
- Every element type in the editor (text, image, video, audio, subtitle) can become a merge field, including their individual properties
- Cloning is not instant — it opens the editor so users can tweak before committing to their account

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-template-system*
*Context gathered: 2026-02-09*
