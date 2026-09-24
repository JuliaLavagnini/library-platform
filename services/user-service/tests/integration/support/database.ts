import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { afterAll, afterEach, beforeAll, inject } from 'vitest';
import { connectDatabase, disconnectDatabase } from '../../../src/config/database.ts';

// Runs in every integration test file: each file gets its own database so files can
// run in parallel, and every collection is emptied between tests.

beforeAll(async () => {
  const uri = new URL(inject('mongoUri'));
  uri.pathname = `/test_${randomUUID().slice(0, 8)}`;
  await connectDatabase(uri.toString());
  // Build unique indexes (e.g. ISBN) before tests rely on them.
  await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
});

afterEach(async () => {
  const collections = await mongoose.connection.db!.collections();
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
});

afterAll(async () => {
  await mongoose.connection.db?.dropDatabase();
  await disconnectDatabase();
});
