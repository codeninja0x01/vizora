import { createHash, randomBytes } from 'node:crypto';
import { prisma } from './db';

/**
 * Type returned by validateApiKey() containing the authenticated context
 */
export type ApiKeyContext = {
  userId: string;
  organizationId: string;
  tier: string;
};

/**
 * Type returned by generateApiKey() containing the full key, hash, and display prefix
 */
export type GeneratedApiKey = {
  key: string;
  hash: string;
  prefix: string;
};

/**
 * Generate a new API key with sk_live_ prefix, SHA-256 hash, and display prefix
 *
 * @returns Object containing the full key (show once), hash (store in DB), and prefix (display)
 *
 * @example
 * const { key, hash, prefix } = generateApiKey();
 * // key: "sk_live_Ab3xCd9f..." (show to user once)
 * // hash: "a7f3e2..." (store in database)
 * // prefix: "sk_live_Ab3x" (display in UI)
 */
export function generateApiKey(): GeneratedApiKey {
  // Generate 32 random bytes and encode as base64url for URL-safe key
  const randomKey = randomBytes(32).toString('base64url');
  const key = `sk_live_${randomKey}`;

  // Compute SHA-256 hash for storage (never store plain key)
  const hash = createHash('sha256').update(key).digest('hex');

  // Extract first 12 characters for display prefix
  const prefix = key.substring(0, 12);

  return { key, hash, prefix };
}

/**
 * Hash an API key using SHA-256
 *
 * @param key - The API key to hash
 * @returns Hex-encoded SHA-256 hash
 *
 * @example
 * const hash = hashApiKey("sk_live_Ab3xCd9f...");
 * // Returns: "a7f3e2..." (64-character hex string)
 */
export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

/**
 * Validate an API key from Authorization header and return user context
 *
 * This function:
 * 1. Extracts the Bearer token from the Authorization header
 * 2. Hashes the provided key and looks it up in the database
 * 3. Checks if the key exists and hasn't been revoked
 * 4. Updates lastUsedAt timestamp (fire-and-forget)
 * 5. Returns user context (userId, organizationId, tier) or null if invalid
 *
 * @param request - The incoming HTTP request
 * @returns User context if valid, null if invalid/revoked/missing
 *
 * @example
 * const context = await validateApiKey(request);
 * if (!context) {
 *   return Response.json({ error: 'Unauthorized' }, { status: 401 });
 * }
 * // Use context.userId, context.organizationId, context.tier
 */
export async function validateApiKey(
  request: Request
): Promise<ApiKeyContext | null> {
  // Extract Authorization header
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return null;
  }

  // Check for Bearer token format
  if (!authHeader.startsWith('Bearer ')) {
    return null;
  }

  // Extract the key (remove "Bearer " prefix)
  const key = authHeader.substring(7);
  if (!key) {
    return null;
  }

  // Hash the provided key for database lookup
  const hash = hashApiKey(key);

  // Query database for the API key
  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash: hash },
    select: {
      id: true,
      userId: true,
      organizationId: true,
      tier: true,
      revokedAt: true,
    },
  });

  // Key not found in database
  if (!apiKey) {
    return null;
  }

  // Key was revoked
  if (apiKey.revokedAt !== null) {
    return null;
  }

  // Update lastUsedAt timestamp (fire-and-forget, non-blocking)
  // We don't await this to avoid slowing down the API request
  prisma.apiKey
    .update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    })
    .catch((error) => {
      // Log error but don't fail the request
      console.error('Failed to update lastUsedAt for API key:', error);
    });

  // Return authenticated context
  return {
    userId: apiKey.userId,
    organizationId: apiKey.organizationId,
    tier: apiKey.tier,
  };
}
