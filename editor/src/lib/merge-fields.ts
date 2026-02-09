import { inferFieldType } from '@/lib/template-schema';
import type { MergeField } from '@/types/template';

/**
 * Returns the list of properties that can be marked as merge fields for each clip type.
 * Based on ClipJSON interfaces from json-serialization.ts.
 *
 * @param clipType - The type of clip ('Text', 'Image', 'Video', etc.)
 * @returns Array of property paths that can be merge fields
 */
export function getMergeableProperties(clipType: string): string[] {
  switch (clipType) {
    case 'Text':
      return [
        'text',
        'style.fontSize',
        'style.fontFamily',
        'style.color',
        'left',
        'top',
        'width',
        'height',
        'opacity',
      ];
    case 'Image':
      return ['src', 'left', 'top', 'width', 'height', 'opacity'];
    case 'Video':
      return ['src', 'volume', 'left', 'top', 'width', 'height', 'opacity'];
    case 'Audio':
      return ['src', 'volume'];
    case 'Caption':
      return ['text', 'style.fontSize', 'style.fontFamily', 'style.color'];
    default:
      // Effect, Transition, Placeholder are not mergeable
      return [];
  }
}

/**
 * Gets a property value from a clip using dot notation.
 * Handles paths like 'style.fontSize'.
 *
 * @param clip - The clip object
 * @param property - The property path (e.g., 'text' or 'style.fontSize')
 * @returns The value at the property path, or undefined if not found
 */
export function getPropertyValue(
  clip: Record<string, unknown>,
  property: string
): unknown {
  const parts = property.split('.');
  let value: any = clip;

  for (const part of parts) {
    if (value && typeof value === 'object' && part in value) {
      value = value[part];
    } else {
      return undefined;
    }
  }

  return value;
}

/**
 * Sets a property value on a clip using dot notation.
 * Handles paths like 'style.fontSize', creating intermediate objects if needed.
 *
 * @param clip - The clip object to modify
 * @param property - The property path (e.g., 'text' or 'style.fontSize')
 * @param value - The value to set
 */
export function setPropertyValue(
  clip: Record<string, unknown>,
  property: string,
  value: unknown
): void {
  const parts = property.split('.');
  let target: any = clip;

  // Navigate to the parent object
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];

    // Create intermediate object if it doesn't exist
    if (!target[part] || typeof target[part] !== 'object') {
      target[part] = {};
    }

    target = target[part];
  }

  // Set the final property
  const lastPart = parts[parts.length - 1];
  target[lastPart] = value;
}

/**
 * Extracts merge fields from project data based on user-marked fields.
 *
 * @param projectData - The full ProjectJSON data
 * @param markedFields - Array of { elementId, property } indicating which fields to extract
 * @returns Array of MergeField objects with keys, types, and default values
 */
export function extractMergeFields(
  projectData: Record<string, unknown>,
  markedFields: Array<{ elementId: string; property: string }>
): MergeField[] {
  const clips = (projectData.clips || []) as Array<Record<string, unknown>>;
  const mergeFields: MergeField[] = [];

  for (const marked of markedFields) {
    // Find the clip by elementId
    const clip = clips.find((c) => c.id === marked.elementId) as Record<
      string,
      unknown
    >;

    if (!clip) {
      console.warn(`Clip with id ${marked.elementId} not found in projectData`);
      continue;
    }

    const elementType = clip.type as string;
    const property = marked.property;

    // Get the property value as default
    const defaultValue = getPropertyValue(clip, property);

    // Infer field type
    const fieldType = inferFieldType(property, defaultValue);

    // Generate key as elementId_property
    const key = `${marked.elementId}_${property.replace(/\./g, '_')}`;

    mergeFields.push({
      key,
      elementId: marked.elementId,
      elementType,
      property,
      fieldType,
      defaultValue,
    });
  }

  return mergeFields;
}

/**
 * Applies merge data to project data, replacing marked fields with provided values.
 * Falls back to defaultValue if merge data doesn't contain a field.
 *
 * @param projectData - The original ProjectJSON data
 * @param mergeFields - Array of merge field definitions
 * @param mergeData - Object mapping field keys to values
 * @returns A new ProjectJSON with merge data applied (original untouched)
 */
export function applyMergeData(
  projectData: Record<string, unknown>,
  mergeFields: MergeField[],
  mergeData: Record<string, unknown>
): Record<string, unknown> {
  // Deep clone projectData to avoid mutation
  const clonedData = structuredClone(projectData);
  const clips = (clonedData.clips || []) as Array<Record<string, unknown>>;

  for (const field of mergeFields) {
    // Use merge data value if provided, otherwise use default
    const value =
      field.key in mergeData ? mergeData[field.key] : field.defaultValue;

    // Find the clip in cloned data
    const clip = clips.find((c) => c.id === field.elementId);

    if (!clip) {
      console.warn(`Clip with id ${field.elementId} not found in cloned data`);
      continue;
    }

    // Set the property value
    setPropertyValue(clip, field.property, value);
  }

  return clonedData;
}
