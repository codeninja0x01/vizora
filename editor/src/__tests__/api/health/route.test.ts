import { describe, expect, it } from 'vitest';
import { GET } from '@/app/api/health/route';

describe('GET /api/health', () => {
  it('returns HTTP 200', async () => {
    const res = await GET();
    expect(res.status).toBe(200);
  });

  it('returns status "ok"', async () => {
    const res = await GET();
    const body = await res.json();
    expect(body.status).toBe('ok');
  });

  it('returns timestamp as a number', async () => {
    const res = await GET();
    const body = await res.json();
    expect(typeof body.timestamp).toBe('number');
  });

  it('returns timestamp within ±5s of Date.now()', async () => {
    const before = Date.now();
    const res = await GET();
    const after = Date.now();
    const body = await res.json();
    expect(body.timestamp).toBeGreaterThanOrEqual(before - 5000);
    expect(body.timestamp).toBeLessThanOrEqual(after + 5000);
  });
});
