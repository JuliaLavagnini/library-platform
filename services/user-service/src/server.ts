import { createApp } from './app.ts';
import { connectDatabase, disconnectDatabase } from './config/database.ts';
import { env } from './config/env.ts';
import { logger } from './config/logger.ts';

try {
  await connectDatabase(env.MONGODB_URI);
} catch (err) {
  logger.fatal(err, 'could not connect to MongoDB');
  process.exit(1);
}

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(`user-service listening on port ${env.PORT}`);
});

// Kubernetes sends SIGTERM before stopping a pod: finish in-flight requests, then exit.
function shutdown(signal: string) {
  logger.info(`${signal} received, shutting down`);
  server.close(async (err) => {
    await disconnectDatabase();
    if (err) {
      logger.error(err, 'error during shutdown');
      process.exit(1);
    }
    process.exit(0);
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
