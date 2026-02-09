// Merge field type - inferred from the property being marked
export type MergeFieldType = 'text' | 'url' | 'number' | 'color';

// A single merge field definition
export interface MergeField {
  key: string; // Unique key: "{elementId}_{property}" per user decision (element/property names directly)
  elementId: string; // UUID of the source element in projectData
  elementType: string; // Clip type: 'Text', 'Video', 'Image', 'Audio', 'Caption'
  property: string; // Property name: 'text', 'src', 'volume', 'fontSize', etc.
  fieldType: MergeFieldType; // Validation type
  defaultValue: unknown; // Value from original project at template creation time
}

// Template category enum (mirrors Prisma enum)
export type TemplateCategory =
  | 'SOCIAL_MEDIA'
  | 'ADVERTISING'
  | 'PRESENTATIONS'
  | 'E_COMMERCE'
  | 'EDUCATION'
  | 'ENTERTAINMENT'
  | 'OTHER';

// Template as returned from Prisma (JSON fields typed)
export interface Template {
  id: string;
  name: string;
  description: string | null;
  thumbnailUrl: string | null;
  projectData: Record<string, unknown>; // ProjectJSON stored as JSONB
  mergeFields: MergeField[];
  mergeSchema: Record<string, unknown>; // JSON Schema object
  category: TemplateCategory | null;
  tags: string[];
  isPublic: boolean;
  featured: boolean;
  userId: string;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Category display names for UI
export const TEMPLATE_CATEGORIES: Record<TemplateCategory, string> = {
  SOCIAL_MEDIA: 'Social Media',
  ADVERTISING: 'Advertising',
  PRESENTATIONS: 'Presentations',
  E_COMMERCE: 'E-Commerce',
  EDUCATION: 'Education',
  ENTERTAINMENT: 'Entertainment',
  OTHER: 'Other',
};
