import type { NextConfig } from 'next';

const isProd = process.env.NODE_ENV === 'production';

// In production, rename /_next/ asset paths to /_app/ so framework is
// not immediately obvious from HTML source inspection.
const ASSET_PREFIX = isProd ? '/_app' : '';

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Remove the "X-Powered-By: Next.js" response header
  poweredByHeader: false,

  // No .map files in production — keeps compiled code unreadable in DevTools
  productionBrowserSourceMaps: false,

  // Rename /_next/static/ → /_app/_next/static/ in all generated HTML
  assetPrefix: ASSET_PREFIX || undefined,

  serverExternalPackages: [
    'express',
    '@genkit-ai/core',
    'genkit',
    'better-auth',
  ],
  transpilePackages: ['openvideo'],

  async rewrites() {
    if (!isProd) return [];
    // Map the renamed asset path back to where Next.js actually serves files
    return [
      {
        source: '/_app/_next/:path*',
        destination: '/_next/:path*',
      },
    ];
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Prevent MIME-type sniffing
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Block framing (clickjacking protection)
          { key: 'X-Frame-Options', value: 'DENY' },
          // Don't send the full URL as referrer to third parties
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Restrict browser feature access
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          // Enforce HTTPS in supporting browsers
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          // Limit script, style, frame, and network origins
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: blob:",
              "font-src 'self'",
              "connect-src 'self' https://*.vizora.dev https://*.r2.cloudflarestorage.com https://api.pexels.com https://api.elevenlabs.io",
              "media-src 'self' blob: https:",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
