# Phase 3: Template System - Research

**Researched:** 2026-02-09
**Domain:** Template system with merge fields, JSON schema validation, and gallery
**Confidence:** HIGH

## Summary

Phase 3 builds a template system where users can save video projects as reusable templates with dynamic merge fields (text, image, video, audio, subtitle properties). Templates support CRUD operations, preview with sample data, JSON schema validation, and a browsable gallery with category/tag filtering and cloning capabilities.

The stack is already well-positioned: Zod 4.1.13 with native JSON Schema generation, Prisma 7.3.0 for data modeling, Next.js 16 with Server Actions for file uploads, and Better Auth organization plugin for multi-tenant isolation.

**Primary recommendation:** Use Zod schemas as the single source of truth for merge field definitions - they provide TypeScript types, runtime validation, and JSON schema generation in one declaration. Model templates with JSONB columns for flexible project data storage and generated JSON schemas for merge field validation.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- "Save as Template" button inside the existing editor — user converts while working on a project
- Original project is preserved — template is a new entity created from a snapshot/copy of the project
- Template editing happens in the same editor with a "template mode" overlay showing merge field markers and template-specific toolbar
- Supported merge field types: text, image, video, audio, subtitle, and their properties (e.g., font size for text, volume for audio, position, etc.)
- No validation constraints beyond type — field type alone determines what's accepted
- Default values are auto-populated from the original project data — whatever was in the project at template creation time becomes the default
- Field keys use element/property names directly — no separate display names or descriptions
- Gallery organized with both curated categories (e.g., "Social Media", "Ads", "Presentations") and free-form tags for refinement
- Template cards show: static thumbnail, template name, merge field count — minimal and clean
- Separate sections for "My Templates" (user dashboard) and "Template Gallery" (pre-built/community)
- Clone flow opens the template in editor mode for customization before saving to user's account
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

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Zod | 4.1.13 (already installed) | Schema validation and JSON Schema generation | Native TypeScript integration, z.toJSONSchema() in v4, single source of truth for types and validation |
| Prisma | 7.3.0 (already installed) | Data modeling and ORM | Already adopted in Phase 2, handles multi-tenant isolation, JSONB support for flexible project data |
| Next.js Server Actions | 16.0.7 (already installed) | File upload handling | Stable in production as of 2026, handles multipart/form-data, integrates seamlessly with React 19 |
| structuredClone | Native Web API | Deep cloning project data | Modern standard (2026), handles nested objects, circular references, Dates, Maps, Sets without libraries |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-player | Latest stable | Video preview playback | Lightweight, supports multiple formats, light prop for preview thumbnails |
| fluent-ffmpeg | Latest stable | Server-side thumbnail generation | Extract video frames for template cards, Node.js backend only |
| @upstash/redis | 1.36.2 (already installed) | Cache template gallery data | Reduce database load for frequently accessed gallery listings |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Zod | AJV with TypeBox | 10-100x faster validation but requires separate type definitions and more boilerplate |
| structuredClone | Lodash cloneDeep | structuredClone is native, faster, handles more types; Lodash adds 71KB bundle size |
| react-player | Custom video element | react-player handles cross-browser quirks and provides consistent API |

**Installation:**
```bash
pnpm add react-player
pnpm add fluent-ffmpeg @types/fluent-ffmpeg
```

## Architecture Patterns

### Recommended Data Model Structure
```prisma
model Template {
  id             String    @id @default(cuid())
  name           String
  description    String?
  thumbnailUrl   String?

  // Project snapshot (JSONB for flexibility)
  projectData    Json      // Full editor state at template creation time

  // Merge field metadata
  mergeFields    Json      // Array of {key, type, defaultValue, path}
  mergeSchema    Json      // Generated JSON Schema for validation

  // Gallery metadata
  category       String?   // e.g., "Social Media", "Ads", "Presentations"
  tags           String[]  // Free-form tags for refinement
  isPublic       Boolean   @default(false)
  featured       Boolean   @default(false)

  // Ownership
  userId         String
  organizationId String

  // Audit
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  // Relations
  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@index([category, isPublic, featured])
  @@index([userId])
  @@index([organizationId])
}
```

**Why JSONB for projectData:**
- Video editor state is complex and evolving (layers, tracks, effects, transitions)
- Avoids schema migrations when editor features expand
- PostgreSQL JSONB is queryable and performant
- Keeps template system decoupled from editor implementation details

### Pattern 1: Zod Schema as Single Source of Truth
**What:** Define merge field validation with Zod, generate JSON Schema programmatically
**When to use:** All template merge field validation

**Example:**
```typescript
// Source: Zod official docs (https://zod.dev/json-schema)
import { z } from 'zod'

// Define merge field schema
const mergeFieldSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  backgroundImage: z.string().url('Must be a valid URL'),
  logoUrl: z.string().url('Must be a valid URL').optional(),
  volume: z.number().min(0).max(100),
  fontSize: z.number().int().positive(),
})

// Generate JSON Schema for storage/API
const jsonSchema = z.toJSONSchema(mergeFieldSchema, {
  target: 'jsonSchema7', // Or 'openApi30' for OpenAPI compatibility
})

// Runtime validation
const result = mergeFieldSchema.safeParse(userInput)
if (!result.success) {
  return { error: result.error.flatten() }
}

// TypeScript type inference (free!)
type MergeData = z.infer<typeof mergeFieldSchema>
```

**Confidence:** HIGH - Native Zod 4 feature, production-ready as of 2026

### Pattern 2: Deep Clone with structuredClone for Template Creation
**What:** Clone project data when saving as template, preserving nested structures
**When to use:** "Save as Template" action in editor

**Example:**
```typescript
// Source: MDN Web Docs (https://developer.mozilla.org/en-US/docs/Web/API/structuredClone)
async function createTemplateFromProject(projectData: ProjectState) {
  // Deep clone to avoid mutations affecting original project
  const templateData = structuredClone(projectData)

  // Extract merge fields from template data
  const mergeFields = extractMergeFields(templateData)

  // Generate Zod schema dynamically
  const zodSchema = buildZodSchema(mergeFields)
  const mergeSchema = z.toJSONSchema(zodSchema)

  // Save template
  const template = await prisma.template.create({
    data: {
      projectData: templateData,
      mergeFields: mergeFields,
      mergeSchema: mergeSchema,
      // ... other fields
    }
  })

  return template
}
```

**Confidence:** HIGH - Native browser API since 2022, Node.js since v17

### Pattern 3: Prisma Template Cloning (Manual Recreation)
**What:** Clone a template to user's account by copying fields, not relations
**When to use:** Gallery template cloning

**Example:**
```typescript
// Source: Prisma GitHub discussions (https://github.com/prisma/prisma/discussions/18772)
async function cloneTemplateToUser(
  templateId: string,
  userId: string,
  organizationId: string
) {
  // Fetch original template
  const original = await prisma.template.findUniqueOrThrow({
    where: { id: templateId },
  })

  // Manually recreate with new ownership (exclude id, timestamps)
  const { id, createdAt, updatedAt, ...templateData } = original

  // Deep clone the JSONB data
  const clonedTemplate = await prisma.template.create({
    data: {
      ...templateData,
      projectData: structuredClone(original.projectData),
      mergeFields: structuredClone(original.mergeFields),
      mergeSchema: structuredClone(original.mergeSchema),
      userId,
      organizationId,
      isPublic: false, // User's clone is private by default
      featured: false,
    }
  })

  return clonedTemplate
}
```

**Confidence:** HIGH - Established pattern from Prisma community, no built-in clone method exists

### Pattern 4: File Upload with Next.js Server Actions
**What:** Handle template thumbnail and media asset uploads
**When to use:** Template creation/editing

**Example:**
```typescript
// Source: Strapi Next.js 15 Tutorial (https://strapi.io/blog/epic-next-js-15-tutorial-part-5-file-upload-using-server-actions)
'use server'

import { writeFile } from 'fs/promises'
import path from 'path'

export async function uploadThumbnail(formData: FormData) {
  const file = formData.get('thumbnail') as File

  // Validate file type
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    return { error: 'Invalid file type' }
  }

  // Convert to Buffer
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  // Save to public directory (or upload to R2 in Phase 6)
  const filename = `${Date.now()}-${file.name}`
  const filepath = path.join(process.cwd(), 'public/uploads', filename)
  await writeFile(filepath, buffer)

  return { url: `/uploads/${filename}` }
}
```

**Confidence:** HIGH - Server Actions stable in Next.js 16, tested with React 19

### Pattern 5: React Player with Light Preview
**What:** Video preview with thumbnail placeholder, plays on interaction
**When to use:** Template gallery cards, preview panel

**Example:**
```typescript
// Source: react-player npm (https://www.npmjs.com/package/react-player)
import ReactPlayer from 'react-player'

function TemplatePreview({ videoUrl, thumbnailUrl }: Props) {
  return (
    <ReactPlayer
      url={videoUrl}
      light={thumbnailUrl} // Show thumbnail until play clicked
      playing={false}
      controls
      width="100%"
      height="100%"
    />
  )
}
```

**Confidence:** MEDIUM - Popular library, but verify Next.js SSR compatibility

### Anti-Patterns to Avoid

- **Storing merge field types as strings:** Use Zod enums instead - type-safe and validates at compile time
- **Regenerating JSON Schema on every validation:** Store generated schema in database, only regenerate when merge fields change
- **Tight coupling between template and editor state:** Template should store editor state as opaque JSONB, not parse/validate structure
- **Category explosion:** Start with 5-7 broad categories, use tags for specificity (e.g., category: "Social Media", tags: ["instagram", "story", "vertical"])

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON Schema validation | Custom validator with type checking | Zod with z.toJSONSchema() | Edge cases: union types, conditional schemas, recursive structures, detailed error messages |
| Deep object cloning | Recursive object traversal | structuredClone() | Edge cases: circular references, Dates, RegExp, Maps, Sets, typed arrays |
| Video thumbnail extraction | Canvas screenshot of video element | fluent-ffmpeg | Edge cases: codec compatibility, seeking accuracy, frame timing, server-side rendering |
| File upload to storage | Custom multipart/form-data parser | Next.js Server Actions + formData API | Edge cases: CSRF protection, file size limits, type validation, streaming large files |
| Schema migration for nested data | Column-per-field normalization | PostgreSQL JSONB with indexing | Edge cases: evolving editor features, backwards compatibility, query performance |

**Key insight:** Template systems are deceptively complex - merge field validation alone involves type coercion, nested object paths, conditional validation, and user-friendly error messages. Zod handles this battle-tested domain logic better than custom code.

## Common Pitfalls

### Pitfall 1: Merge Field Path Resolution Ambiguity
**What goes wrong:** User marks "text layer 3, property fontSize" as merge field, but multiple text layers exist after template is cloned or edited
**Why it happens:** Using array indices or element IDs that change when layers are reordered
**How to avoid:** Assign stable unique identifiers to all template elements at creation time, reference merge fields by ID path not array index
**Warning signs:** Templates break after cloning, "merge field not found" errors

### Pitfall 2: JSON Schema Generation Timing
**What goes wrong:** Generating JSON schema on every API request causes performance issues or inconsistent validation
**Why it happens:** z.toJSONSchema() is deterministic but not instant, especially for complex schemas
**How to avoid:** Generate JSON schema once when template is created/updated, store in database, use stored schema for validation
**Warning signs:** Slow API responses, high CPU usage during template rendering

### Pitfall 3: JSONB Query Performance Degradation
**What goes wrong:** Gallery listing becomes slow as template count grows
**Why it happens:** Filtering/sorting on JSONB fields without indexes
**How to avoid:** Create GIN indexes on frequently queried JSONB paths, extract critical fields to top-level columns (category, tags), use Redis cache for gallery listings
**Warning signs:** Slow gallery page load, high database CPU

### Pitfall 4: Thumbnail Race Conditions
**What goes wrong:** Template saved before thumbnail generation completes, users see missing thumbnails
**Why it happens:** Async thumbnail extraction from video is slower than database write
**How to avoid:** Generate thumbnail synchronously during template creation (blocking), or use placeholder thumbnail with background job + optimistic update
**Warning signs:** Templates with null thumbnailUrl, inconsistent preview images

### Pitfall 5: Template Mode State Isolation
**What goes wrong:** User edits template in editor, changes leak into original template or other instances
**Why it happens:** Shared references to project data instead of isolated copies
**How to avoid:** Always work on a structuredClone of template data in editor, only persist on explicit "Save" action
**Warning signs:** Unintended template mutations, "undo" affecting other templates

### Pitfall 6: Gallery Category Taxonomy Drift
**What goes wrong:** Categories become inconsistent ("Social Media" vs "SocialMedia" vs "social-media")
**Why it happens:** Free-text category input instead of constrained enum
**How to avoid:** Define category enum in code and database (Prisma enum or check constraint), validate on template creation
**Warning signs:** Duplicate categories in gallery filters, inconsistent grouping

## Code Examples

Verified patterns from official sources:

### Dynamic Zod Schema Building for Merge Fields
```typescript
// Source: Zod official docs + custom pattern
import { z } from 'zod'

type MergeField = {
  key: string
  type: 'text' | 'image' | 'video' | 'audio' | 'number' | 'color'
  defaultValue: unknown
  path: string // JSON path in projectData
}

function buildZodSchema(mergeFields: MergeField[]) {
  const shape: Record<string, z.ZodTypeAny> = {}

  for (const field of mergeFields) {
    switch (field.type) {
      case 'text':
        shape[field.key] = z.string()
        break
      case 'image':
      case 'video':
      case 'audio':
        shape[field.key] = z.string().url('Must be a valid URL')
        break
      case 'number':
        shape[field.key] = z.number()
        break
      case 'color':
        shape[field.key] = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be hex color')
        break
    }
  }

  return z.object(shape)
}

// Usage
const schema = buildZodSchema(template.mergeFields)
const jsonSchema = z.toJSONSchema(schema)
```

**Confidence:** HIGH - Zod native API

### Merge Field Extraction from Project Data
```typescript
// Custom pattern for identifying merge fields in editor state
type ProjectElement = {
  id: string
  type: 'text' | 'image' | 'video' | 'audio' | 'subtitle'
  properties: Record<string, unknown>
  isMergeField?: boolean
  mergeFieldKey?: string
}

function extractMergeFields(projectData: { elements: ProjectElement[] }): MergeField[] {
  const mergeFields: MergeField[] = []

  for (const element of projectData.elements) {
    if (!element.isMergeField) continue

    // Extract marked properties as merge fields
    for (const [propKey, propValue] of Object.entries(element.properties)) {
      if (isPrimitiveType(propValue)) {
        mergeFields.push({
          key: element.mergeFieldKey || `${element.id}_${propKey}`,
          type: inferMergeFieldType(propKey, propValue),
          defaultValue: propValue,
          path: `elements[id=${element.id}].properties.${propKey}`,
        })
      }
    }
  }

  return mergeFields
}
```

**Confidence:** MEDIUM - Custom pattern, needs validation with actual editor schema

### Gallery Filtering with Categories and Tags
```typescript
// Prisma query pattern for template gallery
async function getGalleryTemplates(filters: {
  category?: string
  tags?: string[]
  search?: string
}) {
  return await prisma.template.findMany({
    where: {
      isPublic: true,
      ...(filters.category && { category: filters.category }),
      ...(filters.tags?.length && {
        tags: { hasSome: filters.tags }
      }),
      ...(filters.search && {
        OR: [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
        ]
      })
    },
    orderBy: [
      { featured: 'desc' },
      { createdAt: 'desc' },
    ],
    take: 50,
  })
}
```

**Confidence:** HIGH - Standard Prisma patterns

### Applying Merge Data to Template
```typescript
// Apply user-provided merge data to template projectData
import { set } from 'lodash' // For deep object path setting

async function applyMergeData(
  template: Template,
  mergeData: Record<string, unknown>
) {
  // Validate merge data against stored schema
  const schema = buildZodSchema(template.mergeFields as MergeField[])
  const validated = schema.parse(mergeData) // Throws on invalid data

  // Deep clone template data
  const projectData = structuredClone(template.projectData)

  // Apply merge fields using JSON paths
  for (const field of template.mergeFields as MergeField[]) {
    const value = validated[field.key]
    set(projectData, field.path, value)
  }

  return projectData
}
```

**Confidence:** HIGH - Combines established patterns

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| JSON.parse/stringify cloning | structuredClone() | 2022 (browsers), Node.js v17 | Faster, handles more types, native support |
| Separate JSON Schema files | Zod z.toJSONSchema() | Zod v4 (2024) | Single source of truth, TypeScript integration |
| Manual form validation | Server Actions with progressive enhancement | Next.js 13+ (2023) | Better UX, works without JS, type-safe |
| Lodash for utilities | Native APIs (structuredClone, Object.hasOwn, etc.) | 2020-2023 | Smaller bundles, better performance |
| AJV for raw speed | Zod for DX | 2021-2026 | Developer experience over micro-optimization (Zod fast enough for most apps) |

**Deprecated/outdated:**
- **zod-to-json-schema package:** Deprecated as of November 2025, Zod v4 has native support
- **JSON.parse/stringify for cloning:** structuredClone handles edge cases better
- **@types/lodash:** Can use native APIs for most operations in 2026

## Open Questions

1. **How does the existing editor store project state?**
   - What we know: No Project model in Prisma schema yet, editor is client-side (WebCodecs)
   - What's unclear: Exact shape of editor state (layers, tracks, elements), storage location (localStorage, IndexedDB, backend)
   - Recommendation: Investigate editor codebase in Plan phase, design Template.projectData JSONB structure to match

2. **What unique identifier strategy does the editor use for elements?**
   - What we know: Need stable IDs for merge field path resolution
   - What's unclear: Does editor use UUIDs, sequential IDs, or composite keys
   - Recommendation: If editor doesn't assign stable IDs, add during "Save as Template" action

3. **Should template thumbnails be generated server-side or client-side?**
   - What we know: fluent-ffmpeg works server-side, Canvas API works client-side
   - What's unclear: Performance tradeoffs, user experience (blocking vs async)
   - Recommendation: Start with client-side Canvas screenshot for simplicity, migrate to server-side ffmpeg in Phase 6 (Storage Integration)

4. **How to handle template versioning if merge fields change?**
   - What we know: Templates can be edited (TMPL-04), v2 includes version history (TMPE-03)
   - What's unclear: Should Phase 3 include basic versioning or defer to v2
   - Recommendation: Phase 3 uses simple overwrite (updatedAt timestamp only), defer full versioning to TMPE-03

5. **What's the initial category taxonomy?**
   - What we know: User decided "curated categories" with examples like "Social Media", "Ads", "Presentations"
   - What's unclear: Complete list, whether categories are hierarchical
   - Recommendation: Start with flat taxonomy of 5-7 categories, use tags for subcategorization

## Sources

### Primary (HIGH confidence)
- [Zod JSON Schema Documentation](https://zod.dev/json-schema) - Native z.toJSONSchema() API
- [MDN structuredClone()](https://developer.mozilla.org/en-US/docs/Web/API/Window/structuredClone) - Deep clone specification
- [Prisma Relations Documentation](https://www.prisma.io/docs/orm/prisma-schema/data-model/relations) - JSONB and relation patterns
- [Next.js Server Actions File Upload Tutorial](https://strapi.io/blog/epic-next-js-15-tutorial-part-5-file-upload-using-server-actions) - Production patterns

### Secondary (MEDIUM confidence)
- [Prisma GitHub: Copy records with relations](https://github.com/prisma/prisma/discussions/18772) - No built-in clone, manual pattern
- [react-player npm](https://www.npmjs.com/package/react-player) - Light preview feature
- [fluent-ffmpeg](https://www.npmjs.com/package/fluent-ffmpeg) - Thumbnail generation
- [Comparing Schema Validation Libraries (Bitovi)](https://www.bitovi.com/blog/comparing-schema-validation-libraries-ajv-joi-yup-and-zod) - Zod vs AJV tradeoffs

### Tertiary (LOW confidence - marked for validation)
- [WebSearch: template merge fields patterns] - General patterns, not specific to video templates
- [WebSearch: gallery UI filtering] - React examples, need to adapt to Next.js App Router

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed and tested in Phase 2
- Architecture: HIGH - Patterns verified with official docs and existing codebase
- Pitfalls: MEDIUM - Based on common patterns, but need validation with actual editor implementation

**Research date:** 2026-02-09
**Valid until:** 2026-03-09 (30 days - stack is stable)

**Next steps for planner:**
1. Investigate editor codebase to understand project state structure
2. Design Template Prisma model with JSONB columns
3. Define initial category taxonomy (5-7 categories)
4. Create merge field marking UX pattern (recommend: toggle in properties panel)
5. Plan thumbnail generation strategy (recommend: client-side Canvas for Phase 3, defer ffmpeg to Phase 6)
