import mongoose from 'mongoose';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { connectDatabase } from '../../src/config/database.ts';

afterEach(() => {
  vi.restoreAllMocks();
});

const fast = { initialDelayMs: 1, maxDelayMs: 2 };

describe('connectDatabase', () => {
  it("keeps retrying while MongoDB isn't reachable yet", async () => {
    const connect = vi
      .spyOn(mongoose, 'connect')
      .mockRejectedValueOnce(new Error('getaddrinfo EAI_AGAIN mongodb'))
      .mockRejectedValueOnce(new Error('connect ECONNREFUSED'))
      .mockResolvedValueOnce(mongoose);

    await connectDatabase('mongodb://mongodb:27017/test', fast);

    expect(connect).toHaveBeenCalledTimes(3);
  });

  it('gives up after the last attempt and reports the error', async () => {
    const connect = vi
      .spyOn(mongoose, 'connect')
      .mockRejectedValue(new Error('connect ECONNREFUSED'));

    await expect(
      connectDatabase('mongodb://mongodb:27017/test', { ...fast, attempts: 4 }),
    ).rejects.toThrow('connect ECONNREFUSED');
    expect(connect).toHaveBeenCalledTimes(4);
  });
});
