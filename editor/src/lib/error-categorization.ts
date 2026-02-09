// Typed error categories for consistent error handling across the render pipeline

export type ErrorCategory =
  | 'VALIDATION_ERROR'
  | 'RENDER_TIMEOUT'
  | 'RESOURCE_MISSING'
  | 'INTERNAL_ERROR';

/**
 * Categorizes errors based on error message patterns
 */
export function categorizeError(error: unknown): ErrorCategory {
  const message =
    error instanceof Error
      ? error.message.toLowerCase()
      : String(error).toLowerCase();

  // Resource not found
  if (message.includes('not found') || message.includes('does not exist')) {
    return 'RESOURCE_MISSING';
  }

  // Timeout errors
  if (message.includes('timeout') || message.includes('exceeded')) {
    return 'RENDER_TIMEOUT';
  }

  // Validation errors
  if (
    message.includes('validation') ||
    message.includes('invalid') ||
    message.includes('required')
  ) {
    return 'VALIDATION_ERROR';
  }

  // Everything else is an internal error
  return 'INTERNAL_ERROR';
}

/**
 * Formats an error with category and message
 */
export function formatRenderError(error: unknown): {
  category: ErrorCategory;
  message: string;
} {
  const category = categorizeError(error);
  const message = error instanceof Error ? error.message : String(error);

  return { category, message };
}
