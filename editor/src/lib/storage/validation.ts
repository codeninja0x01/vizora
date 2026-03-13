import { fileTypeFromBuffer } from 'file-type';

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500 MB per user decision

export const ALLOWED_FILE_TYPES = {
  video: {
    extensions: ['mp4', 'mov', 'webm'],
    mimes: ['video/mp4', 'video/quicktime', 'video/webm'],
  },
  image: {
    extensions: ['png', 'jpg', 'jpeg', 'gif', 'svg'],
    mimes: ['image/png', 'image/jpeg', 'image/gif', 'image/svg+xml'],
  },
  audio: {
    extensions: ['mp3', 'wav', 'aac'],
    mimes: ['audio/mpeg', 'audio/wav', 'audio/aac'],
  },
} as const;

export type AssetCategory = 'video' | 'image' | 'audio';

export async function validateFileType(
  buffer: Uint8Array,
  declaredMime: string
): Promise<{
  valid: boolean;
  category?: AssetCategory;
  detectedMime?: string;
  error?: string;
}> {
  // SVG is text-based, file-type can't detect it — check declared MIME
  if (declaredMime === 'image/svg+xml') {
    return { valid: true, category: 'image', detectedMime: 'image/svg+xml' };
  }

  const detected = await fileTypeFromBuffer(buffer);
  if (!detected) {
    return {
      valid: false,
      error: 'Could not determine file type from content',
    };
  }

  // Find which category the detected type belongs to
  for (const [category, config] of Object.entries(ALLOWED_FILE_TYPES) as [
    AssetCategory,
    { extensions: readonly string[]; mimes: readonly string[] },
  ][]) {
    if (
      (config.extensions as readonly string[]).includes(detected.ext) ||
      (config.mimes as readonly string[]).includes(detected.mime)
    ) {
      return {
        valid: true,
        category,
        detectedMime: detected.mime,
      };
    }
  }

  return {
    valid: false,
    error: `File type ${detected.ext} (${detected.mime}) is not supported`,
  };
}

export function validateFileSize(size: number): {
  valid: boolean;
  error?: string;
} {
  if (size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File exceeds maximum size of 500 MB (got ${Math.round(size / 1024 / 1024)} MB)`,
    };
  }
  return { valid: true };
}
