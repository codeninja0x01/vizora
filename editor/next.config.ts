import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: [
    'express',
    '@genkit-ai/core',
    'genkit',
    'better-auth',
  ],
  transpilePackages: ['openvideo'],
};

export default nextConfig;
