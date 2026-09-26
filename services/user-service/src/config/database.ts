import { setTimeout as sleep } from 'node:timers/promises';
import mongoose from 'mongoose';
import { logger } from './logger.ts';

export interface ConnectOptions {
  // How many times to try before giving up.
  attempts?: number;
  // Wait before the second attempt; it doubles each time, up to maxDelayMs.
  initialDelayMs?: number;
  maxDelayMs?: number;
}

// Connects to MongoDB, retrying while it isn't reachable yet. On a fresh start (e.g. in
// Kubernetes, where nothing waits for anything else) the database is often still
// starting when this service does; retrying is better than crashing and being restarted.
export async function connectDatabase(
  uri: string,
  { attempts = 20, initialDelayMs = 1000, maxDelayMs = 5000 }: ConnectOptions = {},
) {
  mongoose.set('strictQuery', true);

  for (let attempt = 1; ; attempt++) {
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
      logger.info('connected to MongoDB');
      return;
    } catch (err) {
      if (attempt >= attempts) throw err;
      const delayMs = Math.min(initialDelayMs * 2 ** (attempt - 1), maxDelayMs);
      logger.warn(
        { attempt, attempts, reason: (err as Error).message },
        `MongoDB not reachable yet, retrying in ${delayMs / 1000}s`,
      );
      await sleep(delayMs);
    }
  }
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
  logger.info('disconnected from MongoDB');
}

export function isDatabaseReady() {
  return mongoose.connection.readyState === mongoose.ConnectionStates.connected;
}
