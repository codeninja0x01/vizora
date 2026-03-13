import type { IClip } from '@/types/timeline';

/**
 * Merge field suggestion detected from template elements
 */
export interface MergeFieldSuggestion {
  elementId: string;
  property: string;
  label: string;
  type: 'text' | 'image' | 'color' | 'video' | 'number';
}

/**
 * Detect if a text value looks like a placeholder/merge field candidate
 */
function isPlaceholderText(text: string): boolean {
  const placeholderPatterns = [
    /lorem/i,
    /your\s+/i,
    /company/i,
    /\[.*\]/,
    /\{.*\}/,
    /placeholder/i,
    /sample/i,
    /example/i,
    /brand/i,
    /product/i,
    /\.\.\./,
  ];

  return placeholderPatterns.some((pattern) => pattern.test(text));
}

/**
 * Detect if an element name suggests it's a merge field
 */
function isPlaceholderName(name: string): boolean {
  const lowerName = name.toLowerCase();
  const keywords = [
    'logo',
    'title',
    'headline',
    'subtitle',
    'description',
    'tagline',
    'name',
    'image',
    'photo',
    'video',
    'background',
    'product',
    'brand',
    'color',
    'accent',
  ];

  return keywords.some((keyword) => lowerName.includes(keyword));
}

/**
 * Detect if a color is a brand/accent color (not neutral)
 */
function isBrandColor(color: string): boolean {
  if (!color || typeof color !== 'string') return false;

  const neutralColors = [
    '#000',
    '#000000',
    '#fff',
    '#ffffff',
    '#888',
    '#999',
    '#aaa',
    '#ccc',
    '#ddd',
    '#eee',
    '#333',
    '#444',
    '#555',
    '#666',
    '#777',
  ];

  const normalized = color.toLowerCase().replace(/\s/g, '');

  // Check if it's a neutral color
  if (neutralColors.some((nc) => normalized.startsWith(nc))) {
    return false;
  }

  // Check if it's a grayscale color (all RGB values similar)
  const hexMatch = normalized.match(
    /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/
  );
  if (hexMatch) {
    const r = parseInt(hexMatch[1], 16);
    const g = parseInt(hexMatch[2], 16);
    const b = parseInt(hexMatch[3], 16);

    const diff = Math.max(r, g, b) - Math.min(r, g, b);
    return diff > 30; // If difference > 30, it's not grayscale
  }

  return true; // Assume it's a brand color if not neutral
}

/**
 * Generate a smart label for a merge field
 */
function generateMergeFieldLabel(
  elementType: string,
  elementName: string | undefined,
  property: string,
  value: any
): string {
  // Use element name if it's descriptive
  if (elementName && isPlaceholderName(elementName)) {
    const cleanName = elementName
      .replace(/[_-]/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase());

    if (property === 'text') {
      return `${cleanName} Text`;
    } else if (property === 'src') {
      return elementType === 'Video'
        ? `${cleanName} Video`
        : `${cleanName} Image`;
    }

    return cleanName;
  }

  // Generate from text content
  if (property === 'text' && typeof value === 'string') {
    const preview = value.substring(0, 30).trim();

    if (preview.toLowerCase().includes('welcome')) return 'Welcome Text';
    if (preview.toLowerCase().includes('title')) return 'Title';
    if (preview.toLowerCase().includes('headline')) return 'Headline';
    if (preview.toLowerCase().includes('tagline')) return 'Tagline';
    if (preview.toLowerCase().includes('description')) return 'Description';

    // Use first few words
    const words = preview.split(' ').slice(0, 3).join(' ');
    return words.length > 0
      ? `${words}${preview.length > 30 ? '...' : ''}`
      : 'Text';
  }

  // Property-based labels
  if (property === 'src') {
    if (elementType === 'Video') return 'Video';
    if (elementType === 'Image') return 'Image';
    return 'Media';
  }

  // Color labels
  if (property.toLowerCase().includes('color')) {
    if (property.toLowerCase().includes('background'))
      return 'Background Color';
    if (property.toLowerCase().includes('accent')) return 'Accent Color';
    return 'Brand Color';
  }

  // Fallback: capitalize property name
  return property.charAt(0).toUpperCase() + property.slice(1);
}

/**
 * Detect merge fields from generated template elements
 * Scans elements for properties that should be dynamic (text, images, colors, etc.)
 */
export function detectMergeFields(elements: IClip[]): MergeFieldSuggestion[] {
  const suggestions: MergeFieldSuggestion[] = [];

  for (const element of elements) {
    const elementType = element.type;
    const elementName = element.name;
    const elementId = element.id;

    // Text elements - check if text should be a merge field
    if (elementType === 'Text' || elementType === 'Caption') {
      if (element.text) {
        const shouldBeMergeField =
          isPlaceholderText(element.text) ||
          (elementName && isPlaceholderName(elementName));

        if (shouldBeMergeField) {
          suggestions.push({
            elementId,
            property: 'text',
            type: 'text',
            label: generateMergeFieldLabel(
              elementType,
              elementName,
              'text',
              element.text
            ),
          });
        }
      }
    }

    // Image elements - src should be merge field
    if (elementType === 'Image') {
      if (element.src || elementName) {
        const shouldBeMergeField =
          !element.src ||
          element.src.includes('placeholder') ||
          element.src.includes('example') ||
          (elementName && isPlaceholderName(elementName));

        if (shouldBeMergeField) {
          suggestions.push({
            elementId,
            property: 'src',
            type: 'image',
            label: generateMergeFieldLabel(
              elementType,
              elementName,
              'src',
              element.src
            ),
          });
        }
      }
    }

    // Video elements - src should be merge field for background videos
    if (elementType === 'Video') {
      if (element.src || (elementName && isPlaceholderName(elementName))) {
        suggestions.push({
          elementId,
          property: 'src',
          type: 'video',
          label: generateMergeFieldLabel(
            elementType,
            elementName,
            'src',
            element.src
          ),
        });
      }
    }

    // Check style object for color properties
    if (element.style && typeof element.style === 'object') {
      const style = element.style as Record<string, any>;

      // Check for color properties
      for (const [key, value] of Object.entries(style)) {
        if (key.toLowerCase().includes('color') && typeof value === 'string') {
          if (isBrandColor(value)) {
            suggestions.push({
              elementId,
              property: `style.${key}`,
              type: 'color',
              label: generateMergeFieldLabel(
                elementType,
                elementName,
                key,
                value
              ),
            });
          }
        }
      }
    }

    // Check for direct color properties
    const directColorProps = ['color', 'backgroundColor', 'borderColor'];
    for (const prop of directColorProps) {
      const value = (element as any)[prop];
      if (value && typeof value === 'string' && isBrandColor(value)) {
        suggestions.push({
          elementId,
          property: prop,
          type: 'color',
          label: generateMergeFieldLabel(elementType, elementName, prop, value),
        });
      }
    }
  }

  return suggestions;
}
