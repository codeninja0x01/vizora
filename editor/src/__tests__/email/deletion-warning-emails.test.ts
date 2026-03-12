import { beforeEach, describe, expect, it, vi } from 'vitest';

type CapturedProcessor =
  | ((job: { data: Record<string, unknown> }) => Promise<unknown>)
  | null;

const {
  mockEmailsSend,
  mockResend,
  mockPrisma,
  mockWorkerOn,
  mockRedisConnection,
  mockBullWorker,
  getCapturedProcessor,
} = vi.hoisted(() => {
  let capturedProcessor: CapturedProcessor = null;

  return {
    mockEmailsSend: vi.fn(),
    mockResend: vi.fn(function MockResend() {
      return {
        emails: {
          send: mockEmailsSend,
        },
      };
    }),
    mockPrisma: {
      render: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      $disconnect: vi.fn(),
    },
    mockWorkerOn: vi.fn(),
    mockRedisConnection: {},
    mockBullWorker: vi.fn(function MockWorker(_name, processor) {
      capturedProcessor = processor;
      return {
        on: mockWorkerOn,
        close: vi.fn(),
      };
    }),
    getCapturedProcessor: () => capturedProcessor,
  };
});

vi.mock('resend', () => ({
  Resend: mockResend,
}));

vi.mock('@/lib/db', () => ({
  prisma: mockPrisma,
}));

vi.mock('@/lib/redis', () => ({
  redis: mockRedisConnection,
  redisConnection: mockRedisConnection,
}));

vi.mock('bullmq', () => ({
  Worker: mockBullWorker,
}));

import '@/workers/deletion-warning-worker';

function processor() {
  const captured = getCapturedProcessor();
  expect(captured).toBeTypeOf('function');
  return captured as NonNullable<CapturedProcessor>;
}

describe('Deletion warning worker emails', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = 'test-resend-key';
    delete process.env.RESEND_FROM_EMAIL;
  });

  it('should send a deletion warning email for a completed render', async () => {
    mockPrisma.render.findUnique.mockResolvedValue({
      id: 'render-1',
      status: 'completed',
      template: {
        name: 'Launch Video',
      },
      user: {
        email: 'creator@vizora.dev',
        name: 'Creator',
      },
      outputUrl: 'https://cdn.vizora.dev/renders/render-1.mp4',
      expiresAt: new Date('2026-03-20T00:00:00.000Z'),
    });
    mockPrisma.render.update.mockResolvedValue({ id: 'render-1' });

    await processor()({
      data: {
        renderId: 'render-1',
      },
    });

    expect(mockEmailsSend).toHaveBeenCalledTimes(1);
    const payload = mockEmailsSend.mock.calls[0]?.[0];
    expect(payload.to).toBe('creator@vizora.dev');
    expect(payload.from).toBe('noreply@vizora.dev');
    expect(payload.subject).toContain('expires');
    expect(payload.html).toContain('Launch Video');
    expect(payload.html).toContain(
      'https://cdn.vizora.dev/renders/render-1.mp4'
    );
  });

  it('should not send a deletion warning email when the render is not completed', async () => {
    mockPrisma.render.findUnique.mockResolvedValue({
      id: 'render-1',
      status: 'processing',
    });

    await processor()({
      data: {
        renderId: 'render-1',
      },
    });

    expect(mockEmailsSend).not.toHaveBeenCalled();
  });

  it('should skip resend delivery without an API key and still mark the warning as shown', async () => {
    delete process.env.RESEND_API_KEY;
    mockPrisma.render.findUnique.mockResolvedValue({
      id: 'render-1',
      status: 'completed',
      template: {
        name: 'Launch Video',
      },
      user: {
        email: 'creator@vizora.dev',
        name: 'Creator',
      },
      outputUrl: 'https://cdn.vizora.dev/renders/render-1.mp4',
      expiresAt: new Date('2026-03-20T00:00:00.000Z'),
    });
    mockPrisma.render.update.mockResolvedValue({ id: 'render-1' });

    await processor()({
      data: {
        renderId: 'render-1',
      },
    });

    expect(mockEmailsSend).not.toHaveBeenCalled();
    expect(mockPrisma.render.update).toHaveBeenCalled();
  });
});
