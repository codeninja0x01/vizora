// URL validation with SSRF protection for webhook endpoints
// Blocks private IPs, loopback addresses, and cloud metadata endpoints

import { isIP } from 'node:net';

/**
 * Check if an IP address is private or reserved
 * Blocks RFC 1918 private ranges and other reserved ranges
 */
export function isPrivateOrReservedIP(ip: string): boolean {
  // Only IPv4 for now (IPv6 would need :: handling)
  const parts = ip.split('.').map(Number);

  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) {
    return false;
  }

  // RFC 1918 private ranges and reserved ranges
  return (
    parts[0] === 10 || // 10.0.0.0/8
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) || // 172.16.0.0/12
    (parts[0] === 192 && parts[1] === 168) || // 192.168.0.0/16
    parts[0] === 127 || // 127.0.0.0/8 (loopback)
    (parts[0] === 169 && parts[1] === 254) // 169.254.0.0/16 (link-local)
  );
}

/**
 * Validate webhook URL with SSRF protection
 * In production: requires HTTPS and blocks private/reserved IPs
 * In development: allows http://localhost for testing
 */
export function validateWebhookUrl(urlString: string): {
  valid: boolean;
  error?: string;
} {
  try {
    const url = new URL(urlString);

    // In development: allow http://localhost only
    const isDevelopment = process.env.NODE_ENV !== 'production';
    if (isDevelopment && url.hostname === 'localhost') {
      // Allow http://localhost in development for testing
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return {
          valid: false,
          error: 'URL must use http:// or https:// protocol',
        };
      }
      return { valid: true };
    }

    // Production: require HTTPS
    if (!isDevelopment && url.protocol !== 'https:') {
      return { valid: false, error: 'HTTPS required in production' };
    }

    // Development: require HTTPS for non-localhost
    if (isDevelopment && url.protocol !== 'https:') {
      return {
        valid: false,
        error: 'HTTPS required (http:// only allowed for localhost)',
      };
    }

    // Block dangerous hostnames
    const blockedHostnames = [
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
      '::1',
      '169.254.169.254', // AWS metadata
      'metadata.google.internal', // GCP metadata
    ];

    if (blockedHostnames.includes(url.hostname.toLowerCase())) {
      return {
        valid: false,
        error: 'Blocked hostname (localhost/metadata endpoints)',
      };
    }

    // If hostname is an IP, check if it's private/reserved
    const ipVersion = isIP(url.hostname);
    if (ipVersion) {
      if (isPrivateOrReservedIP(url.hostname)) {
        return {
          valid: false,
          error: 'Private or reserved IP addresses are not allowed',
        };
      }
    }

    return { valid: true };
  } catch (_error) {
    return { valid: false, error: 'Invalid URL format' };
  }
}
