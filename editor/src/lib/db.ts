import { PrismaClient } from '@prisma/client';

// Singleton pattern for Prisma client to prevent multiple instances in serverless/dev
// This pattern survives HMR in development without creating new connections

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
    // Prisma 7: connection URL read from DATABASE_URL env var automatically
  });

// Attach to globalThis in non-production to survive HMR
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
