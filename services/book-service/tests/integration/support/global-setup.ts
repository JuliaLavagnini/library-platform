import { MongoDBContainer, type StartedMongoDBContainer } from '@testcontainers/mongodb';
import type { TestProject } from 'vitest/node';

// Runs once before all integration tests: starts a real MongoDB (the same version as
// docker-compose) in a throwaway container and shares its address with every test file.

let container: StartedMongoDBContainer | undefined;

export async function setup(project: TestProject) {
  try {
    container = await new MongoDBContainer('mongo:8').start();
  } catch (err) {
    // Without this, Vitest only reports "No test files found", which hides the real cause.
    throw new Error(
      'Integration tests need Docker to start MongoDB. Start Docker (e.g. Docker Desktop) and ' +
        'try again, or run only the unit tests with "npm run test:unit".',
      { cause: err },
    );
  }
  // The container runs as a single-node replica set; connect to it directly.
  project.provide('mongoUri', `${container.getConnectionString()}/?directConnection=true`);
}

export async function teardown() {
  await container?.stop();
}

declare module 'vitest' {
  export interface ProvidedContext {
    mongoUri: string;
  }
}
