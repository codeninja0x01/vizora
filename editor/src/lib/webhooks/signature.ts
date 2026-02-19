// HMAC signature generation and verification for webhook security
// Follows Standard Webhooks spec: https://www.standardwebhooks.com/

import { createHmac, timingSafeEqual, randomBytes } from 'node:crypto';

/**
 * Generate a secure webhook secret (256-bit, base64 encoded)
 */
export function generateWebhookSecret(): string {
  return randomBytes(32).toString('base64');
}

/**
 * Generate HMAC-SHA256 signature for webhook payload
 * Format: webhookId.timestamp.payload
 * Returns: v1,{base64_signature}
 */
export function generateWebhookSignature(
  webhookId: string,
  timestamp: number,
  payload: string,
  secret: string
): string {
  // Construct signed string following Standard Webhooks spec
  const signedString = `${webhookId}.${timestamp}.${payload}`;

  // Create HMAC-SHA256 signature
  const hmac = createHmac('sha256', secret);
  hmac.update(signedString);
  const signature = hmac.digest('base64');

  // Return with v1 prefix (indicates HMAC-SHA256)
  return `v1,${signature}`;
}

/**
 * Verify webhook signature with timing-safe comparison
 * Includes replay attack protection (5-minute tolerance)
 */
export function verifyWebhookSignature(
  webhookId: string,
  timestamp: number,
  payload: string,
  secret: string,
  providedSignature: string
): boolean {
  try {
    // Replay protection: reject if timestamp is older than 5 minutes
    const now = Math.floor(Date.now() / 1000);
    const tolerance = 300; // 5 minutes in seconds

    if (Math.abs(now - timestamp) > tolerance) {
      return false;
    }

    // Generate expected signature
    const expectedSignature = generateWebhookSignature(
      webhookId,
      timestamp,
      payload,
      secret
    );

    // Convert to buffers for timing-safe comparison
    const expectedBuffer = Buffer.from(expectedSignature);
    const providedBuffer = Buffer.from(providedSignature);

    // Lengths must match for timingSafeEqual
    if (expectedBuffer.length !== providedBuffer.length) {
      return false;
    }

    // Timing-safe comparison prevents timing attacks
    return timingSafeEqual(expectedBuffer, providedBuffer);
  } catch (_error) {
    // Any error in verification means invalid signature
    return false;
  }
}
