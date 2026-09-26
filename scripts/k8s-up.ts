// Runs the platform on a local Kubernetes cluster (k3d):
//   1. creates the cluster from infra/k3d/cluster.yaml, if it doesn't exist yet
//   2. creates the Secret with the signing key and first librarian, from your .env
//   3. installs (or upgrades) the Helm chart and waits until everything is ready
//
//   npm run k8s:up               use the images published to GitHub Container Registry
//   npm run k8s:up -- --local    build the images here and use those instead
//
// Needs Docker, k3d, Helm and kubectl. Safe to run again: each step is idempotent.

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

const CLUSTER = 'library';
const NAMESPACE = 'library';
const RELEASE = 'library';
const SECRET = 'library-platform-secrets';
const CHART = 'infra/helm/library-platform';
const IMAGES = ['book-service', 'user-service', 'web', 'gateway'];
const local = process.argv.includes('--local');

// Tools are started directly, never through a shell, so nothing in an argument can be
// interpreted as a shell command.
function run(command: string, args: string[], options: { input?: string; quiet?: boolean } = {}) {
  if (!options.quiet) console.log(`\n$ ${command} ${args.join(' ')}`);
  return spawnSync(command, args, {
    input: options.input,
    stdio: [options.input ? 'pipe' : 'inherit', options.quiet ? 'pipe' : 'inherit', 'inherit'],
    encoding: 'utf8',
  });
}

function must(command: string, args: string[], options?: { input?: string }) {
  const result = run(command, args, options);
  if (result.error || result.status !== 0) {
    console.error(`\n"${command} ${args[0]}" failed.`);
    process.exit(1);
  }
}

// Sends a Kubernetes object to `kubectl apply` on standard input. Re-running updates it.
function apply(manifest: object, description: string) {
  console.log(`\n$ kubectl apply (${description})`);
  must('kubectl', ['apply', '-f', '-'], { input: JSON.stringify(manifest) });
}

// 0. Tools and settings
// (kubectl needs --client: plain `kubectl version` also tries to reach a cluster.)
const toolChecks: [string, string[]][] = [
  ['docker', ['version']],
  ['k3d', ['version']],
  ['helm', ['version']],
  ['kubectl', ['version', '--client']],
];
for (const [tool, args] of toolChecks) {
  const check = run(tool, args, { quiet: true });
  if (check.error || check.status !== 0) {
    console.error(`${tool} is required but wasn't found. See the README's Kubernetes section.`);
    process.exit(1);
  }
}
if (!existsSync('.env')) {
  console.error('No .env file found. Create one first (see .env.example).');
  process.exit(1);
}
const env = parseEnv(readFileSync('.env', 'utf8'));
if (!env.JWT_PRIVATE_KEY) {
  console.error('JWT_PRIVATE_KEY is missing from .env. Generate one with: npm run keys:generate');
  process.exit(1);
}

// 1. Cluster
const clusters = run('k3d', ['cluster', 'list', '--output', 'json'], { quiet: true });
const exists = (JSON.parse(clusters.stdout || '[]') as { name: string }[]).some(
  (cluster) => cluster.name === CLUSTER,
);
if (exists) {
  console.log(`\nCluster "${CLUSTER}" already exists.`);
} else {
  must('k3d', ['cluster', 'create', '--config', 'infra/k3d/cluster.yaml', '--wait']);
}
must('kubectl', ['config', 'use-context', `k3d-${CLUSTER}`]);

// 2. Images (only with --local): build here, then copy them into the cluster's nodes.
if (local) {
  must('docker', ['compose', 'build', ...IMAGES]);
  must('k3d', [
    'image',
    'import',
    '--cluster',
    CLUSTER,
    ...IMAGES.map((image) => `library-platform/${image}:dev`),
  ]);
}

// 3. Namespace and Secret. The Secret is built here and sent on standard input, so the
//    values never appear on a command line (where other programs could see them) or in
//    the terminal.
apply(
  { apiVersion: 'v1', kind: 'Namespace', metadata: { name: NAMESPACE } },
  `Namespace ${NAMESPACE}`,
);

const secretData: Record<string, string> = {
  // .env stores the key on one line with "\n" escapes; restore the real newlines.
  'jwt-private-key': env.JWT_PRIVATE_KEY.replace(/\\n/g, '\n'),
};
if (env.BOOTSTRAP_LIBRARIAN_EMAIL && env.BOOTSTRAP_LIBRARIAN_PASSWORD) {
  secretData['bootstrap-librarian-email'] = env.BOOTSTRAP_LIBRARIAN_EMAIL;
  secretData['bootstrap-librarian-password'] = env.BOOTSTRAP_LIBRARIAN_PASSWORD;
}
apply(
  {
    apiVersion: 'v1',
    kind: 'Secret',
    metadata: { name: SECRET, namespace: NAMESPACE },
    type: 'Opaque',
    stringData: secretData,
  },
  `Secret ${SECRET}, values from .env`,
);

// 4. The chart
must('helm', [
  'upgrade',
  '--install',
  RELEASE,
  CHART,
  '--namespace',
  NAMESPACE,
  ...(local ? ['--values', `${CHART}/values-local.yaml`] : []),
  // Start from the chart's defaults every time. Without this, an upgrade that passes no
  // values silently keeps the previous run's (e.g. switching back from --local would keep
  // using the local images).
  '--reset-values',
  '--wait',
  '--timeout',
  '5m',
]);

console.log('\nThe platform is running at http://localhost:8088');
console.log(`See it with: kubectl get pods --namespace ${NAMESPACE}`);
