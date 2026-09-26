// Deletes the local Kubernetes cluster created by `npm run k8s:up`, including its data.
// Docker Compose is not affected.

import { spawnSync } from 'node:child_process';

const result = spawnSync('k3d', ['cluster', 'delete', 'library'], { stdio: 'inherit' });
process.exit(result.status ?? 1);
