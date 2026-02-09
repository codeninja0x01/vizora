---
phase: 06-storage-integration
plan: 01
subsystem: storage-foundation
tags: [prisma, r2, validation, schema]
dependency_graph:
  requires: [phase-05-render-progress]
  provides: [asset-models, file-validation, r2-delete]
  affects: [phase-06-02, phase-06-03, phase-06-04]
tech_stack:
  added: [react-dropzone, file-type]
  patterns: [materialized-path, magic-bytes-validation]
key_files:
  created:
    - editor/src/types/asset.ts
    - editor/src/lib/storage/validation.ts
  modified:
    - editor/prisma/schema.prisma
    - editor/src/lib/r2.ts
    - editor/package.json
decisions:
  - Materialized path pattern for AssetFolder (flat with path string, not nested set)
  - 500 MB file size limit per upload
  - SVG handled as special case in validation (text-based, no magic bytes)
  - Content-Type enforcement via signableHeaders in presigned URLs
  - 30-day lifecycle rule for renders/ prefix in R2
metrics:
  duration: 4m 26s (266s)
  tasks: 2
  files: 5
  commits: 2
  completed: 2026-02-09
---

# Phase 6 Plan 1: Storage Foundation Summary

**One-liner:** Prisma schema for assets/folders with materialized paths, enhanced R2 service with delete operations, and magic-byte file validation for all media types.

## Objective

Established the data model and utility layer for asset management. Assets tracked in database with materialized path folders, R2 service gains delete capability and lifecycle management, file uploads validated via magic bytes for all allowed media types.

## Tasks Completed

### Task 1: Schema and Dependencies
**Status:** ✅ Complete
**Commit:** b21ac48

Added Asset and AssetFolder models to Prisma schema:
- Asset model with r2Key, category, cdnUrl, folder relations
- AssetFolder model using materialized path pattern (flat with path string)
- Updated Render model with expiresAt (DateTime?) and deletionWarningShown (Boolean)
- Added User and Organization relations for assets and folders
- Installed react-dropzone and file-type dependencies
- Created TypeScript asset types (AssetCategory, AssetWithFolder, AssetFolderWithChildren)

**Key Implementation Details:**
- Materialized path pattern enables efficient folder listing with startsWith queries
- O(1) folder moves with simple path string updates (vs nested set complexity)
- Indexes on [organizationId, folderId] and [organizationId, category] for fast queries
- Unique constraint on [organizationId, path, name] prevents duplicate folders

**Files:**
- `editor/package.json` - Added react-dropzone, file-type
- `editor/prisma/schema.prisma` - Asset, AssetFolder, Render updates
- `editor/src/types/asset.ts` - TypeScript types for assets

### Task 2: R2 Service and File Validation
**Status:** ✅ Complete
**Commit:** 21bbec9

Enhanced R2StorageService with delete operations and created file validation utility:
- Added deleteObject method using DeleteObjectCommand from @aws-sdk/client-s3
- Added setupLifecycleRule method for 30-day render retention (renders/ prefix)
- Added getCdnUrl helper method for CDN URL generation
- Updated createPresignedUpload with signableHeaders for Content-Type enforcement
- Created file validation utility with magic byte detection via file-type library
- Special SVG handling (text-based, no magic bytes detection possible)
- Implemented 500 MB file size limit validation

**Key Implementation Details:**
- Magic byte validation prevents MIME spoofing attacks
- SVG validated via declared MIME (image/svg+xml) since it's XML-based
- Content-Type enforcement in presigned URLs prevents upload mismatches
- Lifecycle rule applies to renders/ prefix only (not user assets)

**Files:**
- `editor/src/lib/r2.ts` - Delete, lifecycle, CDN methods
- `editor/src/lib/storage/validation.ts` - File type and size validation

## Verification Results

All verification steps passed:
- ✅ Prisma schema valid with Asset, AssetFolder, and updated Render models
- ✅ react-dropzone and file-type dependencies installed
- ✅ R2StorageService exports deleteObject, setupLifecycleRule, getCdnUrl methods
- ✅ File validation exports validateFileType and validateFileSize functions
- ✅ TypeScript compilation passed with 0 errors

## Deviations from Plan

None - plan executed exactly as written.

## Technical Decisions

### 1. Materialized Path Pattern for Folders
**Decision:** Use materialized path (flat table with path string) instead of nested set or adjacency list.

**Rationale:**
- Efficient subtree queries with simple WHERE path LIKE '/projects/%'
- O(1) folder moves (just update path string, no recursive updates)
- Simpler than nested set (no left/right values to maintain)
- Better for typical asset management use case (read-heavy, occasional moves)

**Impact:** All folder queries use path-based filtering. Future plans must handle path updates on folder rename.

### 2. Magic Bytes Validation
**Decision:** Validate file types using magic bytes (binary signatures) rather than trusting declared MIME types.

**Rationale:**
- Prevents MIME spoofing attacks (malicious files disguised as images/videos)
- More reliable than extension-based validation
- Industry standard for security-critical file uploads

**Exception:** SVG files are XML-based and cannot be detected via magic bytes, so they use declared MIME validation.

### 3. Content-Type Enforcement in Presigned URLs
**Decision:** Include Content-Type in signableHeaders for presigned upload URLs.

**Rationale:**
- Prevents upload mismatches (client declares video/mp4, uploads image/png)
- S3/R2 rejects uploads if Content-Type doesn't match signed value
- Based on research recommendation (pitfall #2 in 06-RESEARCH.md)

### 4. 500 MB File Size Limit
**Decision:** Set MAX_FILE_SIZE to 500 MB per upload.

**Rationale:**
- Balances user needs (professional video files) with infrastructure costs
- Prevents abuse and accidental uploads of extremely large files
- Can be raised per-tier in future (enterprise users may need larger files)

## Commits

1. **b21ac48** - feat(06-01): add Asset and AssetFolder models with storage foundation
   - Schema updates: Asset, AssetFolder, Render
   - Dependencies: react-dropzone, file-type
   - TypeScript types for assets

2. **21bbec9** - feat(06-01): enhance R2 service and add file validation utility
   - R2: delete, lifecycle, CDN methods
   - Validation: magic bytes, size limits

## Self-Check: PASSED

### Created Files
```bash
✅ FOUND: editor/src/types/asset.ts
✅ FOUND: editor/src/lib/storage/validation.ts
```

### Modified Files
```bash
✅ FOUND: editor/prisma/schema.prisma (Asset, AssetFolder models)
✅ FOUND: editor/src/lib/r2.ts (deleteObject, setupLifecycleRule methods)
✅ FOUND: editor/package.json (react-dropzone, file-type)
```

### Commits
```bash
✅ FOUND: b21ac48 (Schema and dependencies)
✅ FOUND: 21bbec9 (R2 service and validation)
```

### Database State
```bash
✅ Prisma schema valid
✅ Database synced (npx prisma db push)
✅ Prisma client regenerated with Asset/AssetFolder types
```

## Next Steps

Phase 06 Plan 02 will build on this foundation to implement:
- Asset upload API endpoint with presigned URL generation
- Direct-to-R2 browser uploads using presigned URLs
- Asset creation in database after successful upload
- Organization-scoped asset access control

Dependencies ready:
- ✅ Asset/AssetFolder models in database
- ✅ File validation utility for upload verification
- ✅ Enhanced R2 service with delete capability
- ✅ TypeScript types for asset responses
