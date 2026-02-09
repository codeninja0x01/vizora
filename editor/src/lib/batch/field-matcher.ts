/**
 * CSV column auto-mapping to template merge fields using string similarity
 */

import { findBestMatch } from 'string-similarity';
import type { FieldMapping } from './types';

/**
 * Normalizes field names for similarity matching
 *
 * - Converts to lowercase
 * - Replaces underscores with spaces
 * - Converts camelCase to space-separated
 *
 * @param field - Field name to normalize
 * @returns Normalized field name
 */
function normalizeFieldName(field: string): string {
  return field
    .replace(/_/g, ' ') // underscores to spaces
    .replace(/([a-z])([A-Z])/g, '$1 $2') // camelCase to spaces
    .toLowerCase()
    .trim();
}

/**
 * Auto-map CSV columns to template merge fields using Dice coefficient similarity
 *
 * Uses 0.4 confidence threshold to filter weak matches.
 * Prevents duplicate mappings by prioritizing highest confidence per field.
 *
 * @param csvHeaders - CSV column headers
 * @param templateFields - Template merge field names
 * @returns Array of field mappings sorted by confidence (descending)
 */
export function autoMapFields(
  csvHeaders: string[],
  templateFields: string[]
): FieldMapping[] {
  const normalizedTemplateFields = templateFields.map(normalizeFieldName);
  const mappings: FieldMapping[] = [];
  const usedTemplateFields = new Set<string>();

  // For each CSV header, find best match in template fields
  for (const csvColumn of csvHeaders) {
    const normalizedCsv = normalizeFieldName(csvColumn);

    const match = findBestMatch(normalizedCsv, normalizedTemplateFields);
    const bestMatch = match.bestMatch;

    // Only include if confidence > 0.4 (Dice coefficient threshold)
    if (bestMatch.rating > 0.4) {
      const templateField = templateFields[match.bestMatchIndex];

      // Prevent duplicate mappings (prioritize first/highest)
      if (!usedTemplateFields.has(templateField)) {
        mappings.push({
          csvColumn,
          templateField,
          confidence: Math.round(bestMatch.rating * 100) / 100, // Round to 2 decimals
        });
        usedTemplateFields.add(templateField);
      }
    }
  }

  // Sort by confidence descending
  return mappings.sort((a, b) => b.confidence - a.confidence);
}
