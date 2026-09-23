import mongoose from 'mongoose';
import { logger } from './logger.ts';

export async function connectDatabase(uri: string) {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  logger.info('connected to MongoDB');
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
  logger.info('disconnected from MongoDB');
}

export function isDatabaseReady() {
  return mongoose.connection.readyState === mongoose.ConnectionStates.connected;
}
