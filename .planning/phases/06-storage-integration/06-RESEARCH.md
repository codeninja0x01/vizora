# Phase 6: Storage Integration - Research

**Researched:** 2026-02-09
**Domain:** Cloudflare R2 object storage, presigned URLs, multipart uploads, CDN delivery, asset management
**Confidence:** HIGH

## Summary

Phase 6 integrates Cloudflare R2 object storage for both user-uploaded assets (persistent) and rendered videos (30-day TTL). The implementation uses AWS S3-compatible APIs via `@aws-sdk/client-s3`, browser-to-R2 direct uploads via presigned URLs, public CDN delivery through custom domains, and automated deletion via R2 lifecycle policies. Asset organization uses materialized path pattern for folders, file type validation via magic bytes, and usage tracking to prevent deletion of referenced assets.

R2 is production-ready for this use case with zero egress fees, S3 API compatibility, built-in lifecycle management, and CDN integration. The stack is well-supported with official AWS SDK examples, comprehensive CORS documentation, and established patterns for large file uploads. Video thumbnail generation is intentionally deferred due to FFmpeg's incompatibility with Vercel's 50MB serverless limit.

**Primary recommendation:** Use `@aws-sdk/client-s3` v3 with `@aws-sdk/lib-storage` for multipart uploads, `react-dropzone` for drag-drop UI, `file-type` for magic byte validation, materialized path for folders, and BullMQ delayed jobs for deletion warnings.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Upload experience:**
- Both drag-and-drop zone in asset panel AND inline drops on canvas/timeline
- Media files only: video (MP4, MOV, WebM), images (PNG, JPG, SVG, GIF), audio (MP3, WAV, AAC)
- Max file size: 500 MB per upload
- Inline progress bar on asset thumbnail during upload

**Asset library:**
- Thumbnail grid layout for browsing assets
- User-created folders for organizing assets
- Lives in the editor panel only (no separate dashboard page)
- Deletion blocked if asset is used in a project or template — must remove from project first

**Video delivery:**
- In-browser video player preview + download button (Loom-style)
- Public CDN URLs with unguessable UUIDs — no signed URLs
- Direct MP4 link only — no branded share page
- Both uploaded assets AND rendered videos served via R2 CDN

**Auto-deletion policy:**
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

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope

</user_constraints>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @aws-sdk/client-s3 | 3.x | S3-compatible R2 client | Official AWS SDK with R2 compatibility, comprehensive presigned URL support |
| @aws-sdk/lib-storage | 3.x | Multipart upload helper | Handles chunking, progress tracking, parallel uploads automatically |
| @aws-sdk/s3-request-presigner | 3.x | Presigned URL generation | Client-side URL signing for browser-to-R2 uploads |
| react-dropzone | 14.x | Drag-drop file upload | Industry standard React hook, 53 code examples, HTML5-compliant |
| file-type | 19.x | File validation via magic bytes | Detects actual file type from binary signature, prevents MIME type spoofing |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @aws-sdk/xhr-http-handler | 3.x | Browser upload progress | Continuous progress events (not just per-part) for better UX |
| zod | 3.x | File metadata validation | Already in stack from Phase 3, schema validation for asset properties |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| AWS SDK v3 | AWS SDK v2 | v2 is legacy, larger bundle, no tree-shaking |
| react-dropzone | Native HTML5 | No validation, error handling, or drag state management |
| file-type | mime-types | Only checks extension, doesn't validate actual file content |
| Presigned URLs | Direct API upload | Requires server to proxy entire file, wastes bandwidth/memory |

**Installation:**
```bash
npm install @aws-sdk/client-s3 @aws-sdk/lib-storage @aws-sdk/s3-request-presigner @aws-sdk/xhr-http-handler react-dropzone file-type
```

## Architecture Patterns

### Recommended Project Structure

```
editor/src/
├── lib/
│   ├── r2/
│   │   ├── client.ts          # S3Client singleton with R2 endpoint
│   │   ├── presigned.ts       # Presigned URL generation
│   │   ├── upload.ts          # Multipart upload helpers
│   │   └── lifecycle.ts       # Bucket lifecycle rule setup
│   ├── storage/
│   │   ├── assets.ts          # Asset CRUD operations
│   │   ├── validation.ts      # File type + size validation
│   │   └── usage-tracking.ts  # Reference counting for deletion safety
│   └── jobs/
│       └── deletion-warning.ts # BullMQ job for 7-day warnings
├── components/
│   ├── asset-panel/
│   │   ├── AssetUploader.tsx  # Drag-drop zone with react-dropzone
│   │   ├── AssetGrid.tsx      # Thumbnail grid with folders
│   │   └── AssetFolders.tsx   # Folder tree navigation
│   └── video-player/
│       └── VideoPreview.tsx   # Loom-style player with download
└── app/api/v1/
    ├── assets/
    │   ├── presigned/route.ts # Generate upload URLs
    │   ├── route.ts           # List/create/delete assets
    │   └── [id]/route.ts      # Asset details
    └── renders/
        └── [id]/download/route.ts # Serve video with CDN redirect
```

### Pattern 1: Presigned URL Upload Flow

**What:** Client requests presigned PUT URL, uploads directly to R2, then notifies server on completion

**When to use:** All user-uploaded assets (500MB max per file)

**Example:**
```typescript
// Source: https://github.com/aws/aws-sdk-js-v3 + Cloudflare R2 docs
// Step 1: Server generates presigned URL
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const command = new PutObjectCommand({
  Bucket: "openvideo-assets",
  Key: `uploads/${organizationId}/${assetId}.mp4`,
  ContentType: "video/mp4",
});

const presignedUrl = await getSignedUrl(s3Client, command, {
  expiresIn: 3600, // 1 hour
  signableHeaders: new Set(["content-type"]), // Enforce Content-Type
});

// Step 2: Client uploads directly to R2
const response = await fetch(presignedUrl, {
  method: "PUT",
  body: file,
  headers: { "Content-Type": file.type },
});

// Step 3: Client notifies server on success
await fetch("/api/v1/assets", {
  method: "POST",
  body: JSON.stringify({
    assetId,
    filename: file.name,
    size: file.size,
    contentType: file.type,
  }),
});
```

### Pattern 2: Multipart Upload with Progress

**What:** Large file uploads chunked into parts with real-time progress tracking

**When to use:** Files approaching 500MB limit (enables resume, parallel upload)

**Example:**
```typescript
// Source: https://github.com/aws/aws-sdk-js-v3/blob/main/lib/lib-storage/README.md
import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { XhrHttpHandler } from "@aws-sdk/xhr-http-handler";

const client = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey },
  requestHandler: new XhrHttpHandler({}), // Continuous progress events
});

const upload = new Upload({
  client,
  params: {
    Bucket: "openvideo-assets",
    Key: `uploads/${organizationId}/${assetId}.mp4`,
    Body: file,
    ContentType: file.type,
  },
  queueSize: 4, // Parallel parts
  partSize: 1024 * 1024 * 10, // 10MB parts (R2 min: 5MB)
  leavePartsOnError: false, // Auto-cleanup
});

upload.on("httpUploadProgress", (progress) => {
  const percentage = ((progress.loaded || 0) / (progress.total || 1)) * 100;
  setUploadProgress(percentage);
});

await upload.done();
```

### Pattern 3: File Type Validation (Magic Bytes)

**What:** Verify actual file content matches declared MIME type to prevent spoofing

**When to use:** All uploads before generating presigned URL

**Example:**
```typescript
// Source: https://github.com/sindresorhus/file-type
import { fileTypeFromBuffer } from "file-type";

// Client-side validation (first 4100 bytes for magic number)
const buffer = await file.slice(0, 4100).arrayBuffer();
const detectedType = await fileTypeFromBuffer(new Uint8Array(buffer));

const allowedTypes = {
  video: ["mp4", "mov", "webm"],
  image: ["png", "jpg", "jpeg", "svg", "gif"],
  audio: ["mp3", "wav", "aac"],
};

const category = Object.keys(allowedTypes).find((cat) =>
  allowedTypes[cat].includes(detectedType?.ext || "")
);

if (!category) {
  throw new Error(`File type ${detectedType?.ext} not supported`);
}

// Server-side validation (verify again after upload notification)
const response = await fetch(r2Url, { method: "HEAD" });
const contentType = response.headers.get("content-type");
// Cross-check with stored file extension
```

### Pattern 4: Materialized Path Folders

**What:** Folder hierarchy stored as path string (e.g., `/projects/social-media/`) enabling efficient queries

**When to use:** User-created folders for organizing assets

**Example:**
```typescript
// Source: https://sqlfordevs.com/tree-as-materialized-path
// Prisma schema
model Asset {
  id        String   @id @default(cuid())
  name      String
  path      String   // "/", "/folder1/", "/folder1/subfolder/"
  r2Key     String   @unique
  // ... other fields

  @@index([organizationId, path]) // Efficient folder listing
}

// Query all assets in folder (including subfolders)
const assets = await prisma.asset.findMany({
  where: {
    organizationId,
    path: { startsWith: "/projects/social-media/" },
  },
});

// Move folder (single UPDATE)
await prisma.asset.updateMany({
  where: {
    organizationId,
    path: { startsWith: "/old-path/" },
  },
  data: {
    path: {
      set: sql`REPLACE(path, '/old-path/', '/new-path/')`
    },
  },
});
```

### Pattern 5: Usage Tracking for Deletion Safety

**What:** Count asset references before allowing deletion

**When to use:** Asset delete operations to prevent broken templates/projects

**Example:**
```typescript
// Check references before deletion
const asset = await prisma.asset.findUnique({
  where: { id: assetId },
  include: {
    _count: {
      select: {
        templateAssets: true,
        projectAssets: true,
      },
    },
  },
});

const totalRefs = asset._count.templateAssets + asset._count.projectAssets;

if (totalRefs > 0) {
  return {
    error: `Cannot delete. Asset is used in ${totalRefs} template(s) or project(s).`,
    references: totalRefs,
  };
}

// Safe to delete from both DB and R2
await prisma.asset.delete({ where: { id: assetId } });
await s3Client.send(new DeleteObjectCommand({
  Bucket: "openvideo-assets",
  Key: asset.r2Key,
}));
```

### Pattern 6: R2 Lifecycle Rules for Auto-Deletion

**What:** Automatic expiration of rendered videos after 30 days using R2's built-in lifecycle policies

**When to use:** Rendered video cleanup without manual cron jobs

**Example:**
```typescript
// Source: https://developers.cloudflare.com/r2/buckets/object-lifecycles/
// Set lifecycle rule via S3 API (one-time setup)
import { PutBucketLifecycleConfigurationCommand } from "@aws-sdk/client-s3";

await s3Client.send(new PutBucketLifecycleConfigurationCommand({
  Bucket: "openvideo-renders",
  LifecycleConfiguration: {
    Rules: [
      {
        Id: "delete-renders-after-30-days",
        Status: "Enabled",
        Filter: { Prefix: "renders/" },
        Expiration: { Days: 30 },
      },
    ],
  },
}));

// Objects removed within 24 hours of expiration
// No ongoing maintenance required
```

### Pattern 7: Delayed Job for Deletion Warnings

**What:** BullMQ delayed job scheduled 23 days after render completion to send warning email

**When to use:** 7-day advance warning before R2 auto-deletes rendered videos

**Example:**
```typescript
// Source: https://docs.bullmq.io/guide/jobs/delayed
// Schedule warning when render completes
import { Queue } from "bullmq";

const deletionWarningQueue = new Queue("deletion-warnings", {
  connection: redis,
});

await deletionWarningQueue.add(
  "send-deletion-warning",
  { renderId, userId, organizationId },
  { delay: 23 * 24 * 60 * 60 * 1000 } // 23 days in ms
);

// Worker sends email 23 days later (7 days before deletion)
worker.process("send-deletion-warning", async (job) => {
  const { renderId, userId } = job.data;

  await sendEmail({
    to: user.email,
    subject: "Video expiring in 7 days",
    template: "deletion-warning",
    data: { renderId, expiresAt: render.completedAt + 30 days },
  });

  // Also set dashboard banner flag
  await prisma.render.update({
    where: { id: renderId },
    data: { deletionWarningShown: true },
  });
});
```

### Anti-Patterns to Avoid

- **Server-proxied uploads:** Never stream files through Next.js API routes — use presigned URLs for direct browser-to-R2 uploads to avoid memory/bandwidth waste
- **Extension-only validation:** Don't trust file extensions or MIME headers — always validate magic bytes with `file-type` to prevent malicious uploads
- **Signed URLs for public content:** Rendered videos should use unguessable UUIDs in public URLs, not signed URLs that expire or require regeneration
- **Nested folder models:** Don't use adjacency list (parent_id) for folders — materialized path enables folder moves with single UPDATE and efficient prefix queries
- **Manual cron for deletion:** Don't implement custom cleanup jobs — R2 lifecycle rules handle expiration automatically with guaranteed execution
- **FFmpeg in Vercel serverless:** Don't attempt video thumbnail generation in Next.js API routes — FFmpeg exceeds 50MB serverless limit (defer to future phase or external service)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| S3 API signing | Custom signature v4 implementation | `@aws-sdk/s3-request-presigner` | Complex crypto with clock skew, canonical string encoding, region handling |
| Multipart upload | Manual part chunking and tracking | `@aws-sdk/lib-storage` | Handles part sizing, parallel uploads, progress aggregation, error recovery |
| File type detection | Extension parsing or MIME header trust | `file-type` magic bytes | Prevents `.exe` renamed to `.mp4`, validates actual binary signature |
| Drag-drop UI | Native HTML5 events | `react-dropzone` | Cross-browser quirks, validation, error states, accessibility |
| Object expiration | Cron jobs querying creation dates | R2 lifecycle rules | Guaranteed execution, no server maintenance, atomic operations |

**Key insight:** Cloud storage SDKs handle critical edge cases like retry logic, request signing, clock skew, multipart reassembly, and error recovery. Custom implementations are vulnerable to security issues (improper signing), reliability problems (partial uploads), and maintenance burden.

## Common Pitfalls

### Pitfall 1: CORS Preflight Failures

**What goes wrong:** Browser uploads fail with CORS errors despite presigned URL working in Postman

**Why it happens:** R2 CORS rules must match exact origin, allow PUT method, and include all custom headers. Critical: `AllowedHeaders: ["content-type"]` not `["*"]` — wildcard fails on R2 unlike S3.

**How to avoid:** Set CORS policy via Wrangler CLI or S3 API before first upload:
```bash
npx wrangler r2 bucket cors set openvideo-assets --file cors.json
```

```json
[
  {
    "AllowedOrigins": ["https://editor.openvideo.dev"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["content-type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

**Warning signs:** `Access-Control-Allow-Headers` missing in preflight response, 403/CORS errors only in browser (not Postman)

**Sources:**
- [Cloudflare R2 CORS Configuration](https://developers.cloudflare.com/r2/buckets/cors/)
- [Pre-signed URLs & CORS on Cloudflare R2](https://mikeesto.medium.com/pre-signed-urls-cors-on-cloudflare-r2-c90d43370dc4)

### Pitfall 2: Presigned URL Content-Type Mismatch

**What goes wrong:** Upload succeeds but returns 403/SignatureDoesNotMatch error

**Why it happens:** Presigned URL signature includes `Content-Type` header. If client sends different type than signed URL specifies, signature validation fails.

**How to avoid:**
1. Include `Content-Type` in presigned URL generation
2. Add to `signableHeaders` set to enforce validation
3. Client MUST send identical header in PUT request

```typescript
const command = new PutObjectCommand({
  Bucket: bucket,
  Key: key,
  ContentType: "video/mp4", // Must match client upload
});

const url = await getSignedUrl(s3Client, command, {
  signableHeaders: new Set(["content-type"]), // Enforce match
});
```

**Warning signs:** Uploads work without Content-Type but fail when added, 403 errors with "SignatureDoesNotMatch" message

**Sources:**
- [Cloudflare R2 Presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)
- [AWS SDK S3 Presigned URL Examples](https://github.com/aws/aws-sdk-js-v3/blob/main/packages/s3-request-presigner/README.md)

### Pitfall 3: Multipart Upload Part Size Constraints

**What goes wrong:** Multipart upload fails with validation errors about part sizes

**Why it happens:** R2 requires all parts (except last) to be:
- Minimum 5 MiB each
- Exactly the same size
- Last part can be smaller but not larger

**How to avoid:** Use `@aws-sdk/lib-storage` with proper `partSize`:
```typescript
const upload = new Upload({
  // ...
  partSize: 1024 * 1024 * 10, // 10MB >= 5MB minimum
  queueSize: 4, // Parallel uploads
});
```

**Warning signs:** "EntityTooSmall" errors, parts rejected despite total size being valid

**Sources:**
- [Cloudflare R2 Multipart Upload Limits](https://developers.cloudflare.com/r2/objects/multipart-objects/)
- [R2 Platform Limits](https://developers.cloudflare.com/r2/platform/limits/)

### Pitfall 4: Deletion Without Usage Checking

**What goes wrong:** User deletes asset, templates/projects break with missing media references

**Why it happens:** Asset deletion doesn't verify if asset is referenced in templates, projects, or renders

**How to avoid:** Always query reference count before deletion:
```typescript
const asset = await prisma.asset.findUnique({
  where: { id },
  include: {
    _count: {
      select: { templateAssets: true, projectAssets: true },
    },
  },
});

if (asset._count.templateAssets + asset._count.projectAssets > 0) {
  throw new Error("Asset is in use. Remove from templates/projects first.");
}
```

**Warning signs:** User complaints about broken templates, missing thumbnails, 404 errors on asset URLs

### Pitfall 5: Lifecycle Rule Timing Assumptions

**What goes wrong:** Assuming objects are deleted exactly 30 days after upload

**Why it happens:** R2 lifecycle rules have ~24 hour execution window, not real-time deletion

**How to avoid:**
- Set warning email at 23 days (not 23 days + 23 hours)
- UI shows "expires in 7 days" window (not exact timestamp)
- Don't rely on lifecycle for time-critical operations

**Warning signs:** Objects still accessible hours after expected deletion, timing-based logic failures

**Sources:**
- [Cloudflare R2 Object Lifecycles](https://developers.cloudflare.com/r2/buckets/object-lifecycles/)

### Pitfall 6: FFmpeg in Vercel Serverless Functions

**What goes wrong:** Thumbnail generation fails in production despite working locally

**Why it happens:** Vercel serverless functions have 50MB size limit. FFmpeg + dependencies exceed this by 3x.

**How to avoid:**
- Defer video thumbnails to future phase
- Use external service (e.g., AWS Lambda with custom layers)
- Or generate thumbnails client-side with canvas API (lower quality)

**Warning signs:** Build succeeds locally but deployment fails with size errors, "Module not found: ffmpeg-static"

**Sources:**
- [Vercel Serverless Function Limits](https://vercel.com/docs/functions/serverless-functions/limits)
- [FFmpeg on Vercel Discussion](https://github.com/vercel/next.js/issues/53791)
- [Remotion on Vercel Limitations](https://www.remotion.dev/docs/miscellaneous/vercel-functions)

## Code Examples

Verified patterns from official sources:

### Generate Presigned Upload URL

```typescript
// Source: https://github.com/aws/aws-sdk-js-v3/blob/main/packages/s3-request-presigner/README.md
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function generateUploadUrl(params: {
  organizationId: string;
  assetId: string;
  filename: string;
  contentType: string;
}) {
  const key = `uploads/${params.organizationId}/${params.assetId}/${params.filename}`;

  const command = new PutObjectCommand({
    Bucket: "openvideo-assets",
    Key: key,
    ContentType: params.contentType,
  });

  const url = await getSignedUrl(s3Client, command, {
    expiresIn: 3600, // 1 hour
    signableHeaders: new Set(["content-type"]),
  });

  return { url, key };
}
```

### React Dropzone with File Validation

```typescript
// Source: https://github.com/react-dropzone/react-dropzone
import { useDropzone } from "react-dropzone";
import { fileTypeFromBuffer } from "file-type";

export function AssetUploader() {
  const onDrop = async (acceptedFiles: File[]) => {
    for (const file of acceptedFiles) {
      // Validate magic bytes
      const buffer = await file.slice(0, 4100).arrayBuffer();
      const type = await fileTypeFromBuffer(new Uint8Array(buffer));

      if (!type || !isAllowedType(type.ext)) {
        toast.error(`${file.name}: Invalid file type`);
        continue;
      }

      // Request presigned URL
      const { url, key } = await fetch("/api/v1/assets/presigned", {
        method: "POST",
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          size: file.size,
        }),
      }).then((r) => r.json());

      // Upload directly to R2
      await fetch(url, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      // Notify server
      await fetch("/api/v1/assets", {
        method: "POST",
        body: JSON.stringify({ key, filename: file.name }),
      });
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: 500 * 1024 * 1024, // 500MB
    accept: {
      "video/*": [".mp4", ".mov", ".webm"],
      "image/*": [".png", ".jpg", ".jpeg", ".gif", ".svg"],
      "audio/*": [".mp3", ".wav", ".aac"],
    },
  });

  return (
    <div {...getRootProps()}>
      <input {...getInputProps()} />
      {isDragActive ? <p>Drop files here</p> : <p>Drag files or click</p>}
    </div>
  );
}
```

### Public CDN URL Generation

```typescript
// Source: https://developers.cloudflare.com/r2/buckets/public-buckets/
// Setup: Connect custom domain in R2 dashboard (assets.openvideo.dev)
// Result: https://assets.openvideo.dev/{key} for all objects

export function getPublicUrl(r2Key: string): string {
  // Using custom domain (CDN-enabled)
  return `https://assets.openvideo.dev/${r2Key}`;

  // Alternative: r2.dev subdomain (no caching, rate-limited, dev only)
  // return `https://pub-xxxxx.r2.dev/${r2Key}`;
}

// Render video URL with unguessable UUID
const videoUrl = getPublicUrl(`renders/${renderId}.mp4`);
// Example: https://assets.openvideo.dev/renders/cm5x9z0000001.mp4
```

### BullMQ Delayed Deletion Warning

```typescript
// Source: https://docs.bullmq.io/guide/jobs/delayed
import { Queue } from "bullmq";

const deletionWarningQueue = new Queue("deletion-warnings", {
  connection: redis,
});

// Schedule when render completes
export async function scheduleDeletionWarning(renderId: string) {
  const render = await prisma.render.findUnique({ where: { id: renderId } });

  await deletionWarningQueue.add(
    "send-warning",
    { renderId, userId: render.userId },
    {
      delay: 23 * 24 * 60 * 60 * 1000, // 23 days
      jobId: `deletion-warning-${renderId}`, // Idempotent
    }
  );
}

// Worker sends email
const worker = new Worker("deletion-warnings", async (job) => {
  const { renderId, userId } = job.data;
  const render = await prisma.render.findUnique({ where: { id: renderId } });

  if (!render || render.status !== "completed") {
    return; // Already deleted or failed
  }

  await sendEmail({
    to: render.user.email,
    subject: "Video expires in 7 days",
    template: "deletion-warning",
    data: {
      videoUrl: getPublicUrl(`renders/${renderId}.mp4`),
      expiresAt: new Date(render.completedAt.getTime() + 30 * 24 * 60 * 60 * 1000),
    },
  });
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Server-proxied uploads | Presigned URLs for direct browser-to-storage | ~2018 | Eliminates server bandwidth, enables progress tracking, reduces latency |
| Extension-based validation | Magic byte validation | Ongoing | Prevents malicious file uploads disguised as media |
| AWS S3 (paid egress) | Cloudflare R2 (zero egress) | 2021 | 90%+ cost savings on bandwidth-heavy workloads |
| Manual cron deletion | Cloud provider lifecycle rules | S3: 2012, R2: 2023 | Guaranteed execution, no maintenance, atomic operations |
| Nested set for folders | Materialized path | Ongoing | O(1) folder moves vs O(n) subtree updates |
| AWS SDK v2 | AWS SDK v3 modular | 2020 | Tree-shaking, smaller bundles, TypeScript-first |

**Deprecated/outdated:**
- **AWS SDK v2:** Use v3 for smaller bundle size and TypeScript support
- **QueueScheduler (BullMQ):** Not needed in BullMQ 2.0+ for delayed jobs
- **r2.dev public URLs:** Use custom domains for production (caching, no rate limits)

## Open Questions

### 1. Video Thumbnail Generation Strategy

**What we know:**
- FFmpeg is standard for video thumbnails but incompatible with Vercel's 50MB serverless limit
- Client-side canvas extraction possible but lower quality (no seeking, codec support)
- External services (AWS Lambda with layers, Cloudflare Workers) add complexity

**What's unclear:**
- Whether to implement now with workaround or defer to future phase
- User expectations for thumbnail quality vs upload speed tradeoff

**Recommendation:**
- Phase 6: Skip video thumbnails, use file type icon placeholders
- Future phase: Add AWS Lambda thumbnail service or client-side WebCodecs API

### 2. Folder Depth Limit

**What we know:**
- Materialized path scales to reasonable depths (10-20 levels)
- Most users create shallow hierarchies (2-4 levels)

**What's unclear:**
- Whether to enforce hard limit (e.g., 10 levels) or soft warning

**Recommendation:**
- Start without limit, add telemetry to measure actual usage
- Add soft warning at 5 levels ("Consider flatter structure")

### 3. Asset CDN Cache Duration

**What we know:**
- Uploaded assets rarely change after upload
- R2 custom domains support Cloudflare CDN caching
- Cache-Control headers can be set on upload

**What's unclear:**
- Optimal cache duration for assets (1 day vs 1 year)
- Cache invalidation strategy if user replaces asset with same name

**Recommendation:**
- Set `Cache-Control: public, max-age=31536000, immutable` (1 year)
- Use UUID-based keys (prevents name collisions, enables immutable caching)
- If user "replaces" asset, create new UUID (old URL becomes stale naturally)

## Sources

### Primary (HIGH confidence)

- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/) - Official docs, API reference
- [AWS SDK for JavaScript v3](https://github.com/aws/aws-sdk-js-v3) - Official SDK, code examples
- Context7: `/aws/aws-sdk-js-v3` - S3Client, presigned URLs, multipart uploads
- Context7: `/sindresorhus/file-type` - Magic byte validation API
- Context7: `/react-dropzone/react-dropzone` - Drag-drop hook usage
- [Cloudflare R2 Presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)
- [Cloudflare R2 Public Buckets](https://developers.cloudflare.com/r2/buckets/public-buckets/)
- [Cloudflare R2 CORS Configuration](https://developers.cloudflare.com/r2/buckets/cors/)
- [Cloudflare R2 Object Lifecycles](https://developers.cloudflare.com/r2/buckets/object-lifecycles/)
- [Cloudflare R2 Multipart Upload](https://developers.cloudflare.com/r2/objects/multipart-objects/)
- [BullMQ Delayed Jobs](https://docs.bullmq.io/guide/jobs/delayed)

### Secondary (MEDIUM confidence)

- [Pre-signed URLs & CORS on Cloudflare R2](https://mikeesto.medium.com/pre-signed-urls-cors-on-cloudflare-r2-c90d43370dc4) - Community patterns
- [Store Trees as Materialized Paths](https://sqlfordevs.com/tree-as-materialized-path) - DB pattern guide
- [AWS S3 Bucket Naming Best Practices](https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucketnamingrules.html)
- [React File Upload with Axios Progress](https://www.bezkoder.com/react-hooks-file-upload/) - Progress tracking patterns
- [Cloudflare R2 Pricing](https://developers.cloudflare.com/r2/pricing/) - Cost structure

### Tertiary (LOW confidence - requires validation)

- [FFmpeg on Vercel Limitations](https://community.vercel.com/t/how-can-i-include-ffmpeg-binary-to-production/6320) - Community discussions
- [Remotion Vercel Functions](https://www.remotion.dev/docs/miscellaneous/vercel-functions) - Third-party constraints

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries officially documented with R2/S3 compatibility verified
- Architecture patterns: HIGH - Patterns from official AWS SDK and Cloudflare docs with code examples
- Pitfalls: HIGH - CORS/presigned URL issues verified in official docs and community reports
- Video thumbnails: LOW - Workaround strategies not validated in production environment

**Research date:** 2026-02-09
**Valid until:** 2026-03-09 (30 days for stable APIs, R2 lifecycle features GA since 2023)

**Technologies verified:**
- Cloudflare R2: Production-ready since 2021, lifecycle rules GA 2023
- AWS SDK v3: Stable, official S3 compatibility confirmed in R2 docs
- react-dropzone: v14.x stable, 77.8 benchmark score
- file-type: v19.x stable, high source reputation
- BullMQ: v5.x delayed jobs stable (QueueScheduler deprecated in v2.0+)
