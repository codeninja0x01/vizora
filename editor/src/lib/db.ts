import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// Singleton pattern for Prisma client to prevent multiple instances in serverless/dev
// This pattern survives HMR in development without creating new connections

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Prisma 7 requires a driver adapter for the default "client" engine
const connectionString =
  process.env.DATABASE_URL?.replace(
    /sslmode=(require|prefer|verify-ca)(?=&|$)/,
    'sslmode=verify-full'
  ) ?? process.env.DATABASE_URL;
const adapter = new PrismaPg({ connectionString });

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

// Attach to globalThis in non-production to survive HMR
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
