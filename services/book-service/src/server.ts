import { createApp } from './app.ts';
import { connectDatabase, disconnectDatabase } from './config/database.ts';
import { env } from './config/env.ts';
import { logger } from './config/logger.ts';

// Start answering first, then connect to the database. Until it's connected, /health
// reports the process is alive and /health/ready reports "not ready", so Kubernetes
// waits before sending traffic instead of restarting the pod.
const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(`book-service listening on port ${env.PORT}`);
});

try {
  await connectDatabase(env.MONGODB_URI);
} catch (err) {
  logger.fatal(err, 'could not connect to MongoDB');
  process.exit(1);
}

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
