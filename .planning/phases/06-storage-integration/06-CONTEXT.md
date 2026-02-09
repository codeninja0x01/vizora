# Phase 6: Storage Integration - Context

**Gathered:** 2026-02-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Asset uploads and rendered video delivery via Cloudflare R2 with CDN. Users can upload media assets via presigned URLs, manage them in an editor-integrated library with folders, and access rendered videos via public CDN links. Rendered videos auto-delete after 30 days with email + dashboard warnings. Webhooks, bulk generation, and billing are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Upload experience
- Both drag-and-drop zone in asset panel AND inline drops on canvas/timeline
- Media files only: video (MP4, MOV, WebM), images (PNG, JPG, SVG, GIF), audio (MP3, WAV, AAC)
- Max file size: 500 MB per upload
- Inline progress bar on asset thumbnail during upload

### Asset library
- Thumbnail grid layout for browsing assets
- User-created folders for organizing assets
- Lives in the editor panel only (no separate dashboard page)
- Deletion blocked if asset is used in a project or template — must remove from project first

### Video delivery
- In-browser video player preview + download button (Loom-style)
- Public CDN URLs with unguessable UUIDs — no signed URLs
- Direct MP4 link only — no branded share page
- Both uploaded assets AND rendered videos served via R2 CDN

### Auto-deletion policy
- Applies to rendered videos only — uploaded assets persist indefinitely
- Fixed 30-day retention with no extensions
- Single warning email 7 days before deletion
- Both email notification and dashboard banner for expiry warnings

### Claude's Discretion
- R2 bucket structure and key naming conventions
- CDN configuration and cache settings
- Upload chunking strategy for large files
- Thumbnail generation approach for video assets
- Folder data model (nested vs flat with path)

</decisions>

<specifics>
## Specific Ideas

- Upload progress should feel immediate — inline progress bar directly on the thumbnail, not a separate toast or modal
- Asset deletion safety is important — block deletion when asset is in use, don't just warn
- Keep video delivery simple — raw MP4 URLs, no share pages. This is an API-first platform.
- Assets persist forever, only rendered output expires

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-storage-integration*
*Context gathered: 2026-02-09*
