import { z } from 'zod';
import type { MergeField, MergeFieldType } from '@/types/template';

/**
 * Infers the merge field type from property name and value.
 * Rules:
 * - property is 'src' or value is string starting with 'http' or 'blob:' -> 'url'
 * - property contains 'color' or 'Color' or value matches hex color pattern -> 'color'
 * - typeof value === 'number' -> 'number'
 * - default -> 'text'
 */
export function inferFieldType(
  property: string,
  value: unknown
): MergeFieldType {
  // URL detection
  if (property === 'src') {
    return 'url';
  }
  if (
    typeof value === 'string' &&
    (value.startsWith('http') || value.startsWith('blob:'))
  ) {
    return 'url';
  }

  // Color detection
  if (property.toLowerCase().includes('color')) {
    return 'color';
  }
  if (typeof value === 'string' && /^#[0-9A-Fa-f]{3,8}$/.test(value)) {
    return 'color';
  }

  // Number detection
  if (typeof value === 'number') {
    return 'number';
  }

  // Default to text
  return 'text';
}

/**
 * Builds a Zod schema from merge field definitions.
 * Each field is optional (merge data can be partial, falling back to defaults).
 */
export function buildMergeFieldZodSchema(mergeFields: MergeField[]) {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const field of mergeFields) {
    let fieldSchema: z.ZodTypeAny;

    switch (field.fieldType) {
      case 'text':
        fieldSchema = z.string();
        break;
      case 'url':
        fieldSchema = z.string().url();
        break;
      case 'number':
        fieldSchema = z.number();
        break;
      case 'color':
        fieldSchema = z.string().regex(/^#[0-9A-Fa-f]{3,8}$/);
        break;
      default:
        fieldSchema = z.string();
    }

    // Make all fields optional
    shape[field.key] = fieldSchema.optional();
  }

  return z.object(shape);
}

/**
 * Generates a JSON Schema from merge field definitions.
 * Manually constructs schema object for storage.
 */
export function generateMergeSchema(
  mergeFields: MergeField[]
): Record<string, unknown> {
  const properties: Record<string, unknown> = {};

  for (const field of mergeFields) {
    let fieldSchema: Record<string, unknown>;

    switch (field.fieldType) {
      case 'text':
        fieldSchema = { type: 'string' };
        break;
      case 'url':
        fieldSchema = { type: 'string', format: 'uri' };
        break;
      case 'number':
        fieldSchema = { type: 'number' };
        break;
      case 'color':
        fieldSchema = { type: 'string', pattern: '^#[0-9A-Fa-f]{3,8}$' };
        break;
      default:
        fieldSchema = { type: 'string' };
    }

    properties[field.key] = fieldSchema;
  }

  return {
    type: 'object',
    properties,
    additionalProperties: false,
  };
}

/**
 * Validates merge data against the dynamic schema.
 * Returns success/error result with typed data or error details.
 */
export function validateMergeData(
  mergeFields: MergeField[],
  data: Record<string, unknown>
):
  | { success: true; data: Record<string, unknown> }
  | { success: false; errors: z.ZodFlattenedError<Record<string, unknown>> } {
  const zodSchema = buildMergeFieldZodSchema(mergeFields);
  const result = zodSchema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return { success: false, errors: result.error.flatten() };
}
