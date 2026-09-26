// Runs the platform on a local Kubernetes cluster (k3d):
//   1. creates the cluster from infra/k3d/cluster.yaml, if it doesn't exist yet
//   2. creates the Secret with the signing key and first librarian, from your .env
//   3. deploys the platform, in one of two ways:
//
//   npm run k8s:up               install the Helm chart directly, using the images
//                                published to GitHub Container Registry
//   npm run k8s:up -- --local    the same, but build the images here and use those
//   npm run k8s:up -- --gitops   install Argo CD and let it deploy from GitHub: the chart
//                                on main, with infra/environments/local/values.yaml
//
// Needs Docker, k3d, Helm and kubectl. Safe to run again: each step is idempotent.

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
import { parseEnv } from 'node:util';

const CLUSTER = 'library';
const NAMESPACE = 'library';
const RELEASE = 'library';
const SECRET = 'library-platform-secrets';
const CHART = 'infra/helm/library-platform';
const IMAGES = ['book-service', 'user-service', 'web', 'gateway'];
const ARGOCD_VERSION = 'v3.5.3';
const ARGOCD_NAMESPACE = 'argocd';
const ARGOCD_APP = 'library-platform';
const local = process.argv.includes('--local');
const gitops = process.argv.includes('--gitops');

if (local && gitops) {
  console.error("--local and --gitops can't be combined: Argo CD deploys the images named in Git.");
  process.exit(1);
}

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

function succeeds(command: string, args: string[]) {
  const result = run(command, args, { quiet: true });
  return !result.error && result.status === 0;
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
  if (!succeeds(tool, args)) {
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

// Only one of Helm or Argo CD may manage the platform, or they'd fight over it.
const managedByArgo = succeeds('kubectl', [
  'get',
  'applications.argoproj.io',
  ARGOCD_APP,
  '--namespace',
  ARGOCD_NAMESPACE,
]);
if (managedByArgo && !gitops) {
  console.error(
    "\nArgo CD manages the platform on this cluster, so it can't also be installed with Helm.\n" +
      'Run "npm run k8s:up -- --gitops", or "npm run k8s:down" to start over.',
  );
  process.exit(1);
}

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
//    the terminal. It isn't in Git, so Argo CD never sees or manages it.
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

if (gitops) {
  await deployWithArgoCD();
} else {
  deployWithHelm();
}

// 4a. Direct Helm install
function deployWithHelm() {
  must('helm', [
    'upgrade',
    '--install',
    RELEASE,
    CHART,
    '--namespace',
    NAMESPACE,
    ...(local ? ['--values', `${CHART}/values-local.yaml`] : []),
    // Start from the chart's defaults every time. Without this, an upgrade that passes no
    // values silently keeps the previous run's (e.g. switching back from --local would
    // keep using the local images).
    '--reset-values',
    '--wait',
    '--timeout',
    '5m',
  ]);
  console.log('\nThe platform is running at http://localhost:8088');
  console.log(`See it with: kubectl get pods --namespace ${NAMESPACE}`);
}

// 4b. GitOps: install Argo CD and let it deploy from GitHub
async function deployWithArgoCD() {
  // Hand over from a previous Helm install. The database's volume isn't deleted, so Argo
  // CD's MongoDB picks up the same data.
  if (succeeds('helm', ['status', RELEASE, '--namespace', NAMESPACE])) {
    console.log('\nHanding the platform over from Helm to Argo CD.');
    must('helm', ['uninstall', RELEASE, '--namespace', NAMESPACE, '--wait']);
  }

  apply(
    { apiVersion: 'v1', kind: 'Namespace', metadata: { name: ARGOCD_NAMESPACE } },
    `Namespace ${ARGOCD_NAMESPACE}`,
  );
  // Server-side apply: Argo CD's resource definitions are too large for the default mode.
  must('kubectl', [
    'apply',
    '--namespace',
    ARGOCD_NAMESPACE,
    '--server-side',
    '--force-conflicts',
    '-f',
    `https://raw.githubusercontent.com/argoproj/argo-cd/${ARGOCD_VERSION}/manifests/install.yaml`,
  ]);
  for (const workload of [
    'deployment/argocd-server',
    'deployment/argocd-repo-server',
    'statefulset/argocd-application-controller',
  ]) {
    must('kubectl', [
      'rollout',
      'status',
      workload,
      '--namespace',
      ARGOCD_NAMESPACE,
      '--timeout',
      '5m',
    ]);
  }

  must('kubectl', ['apply', '-f', 'infra/argocd/application.yaml']);

  // Wait until Argo CD has deployed everything and it's healthy.
  console.log('\nWaiting for Argo CD to deploy the platform from GitHub...');
  const deadline = Date.now() + 5 * 60_000;
  let status = '';
  while (Date.now() < deadline) {
    const result = run(
      'kubectl',
      [
        'get',
        'applications.argoproj.io',
        ARGOCD_APP,
        '--namespace',
        ARGOCD_NAMESPACE,
        '-o',
        'jsonpath={.status.sync.status}/{.status.health.status}',
      ],
      { quiet: true },
    );
    if (result.stdout !== status) {
      status = result.stdout;
      console.log(`  sync/health: ${status || 'starting'}`);
    }
    if (status === 'Synced/Healthy') break;
    await sleep(5000);
  }
  if (status !== 'Synced/Healthy') {
    console.error(
      `\nArgo CD didn't finish within 5 minutes (last status: ${status}). Check with:\n` +
        `  kubectl describe applications.argoproj.io ${ARGOCD_APP} --namespace ${ARGOCD_NAMESPACE}`,
    );
    process.exit(1);
  }

  console.log('\nArgo CD is deploying the platform from GitHub: http://localhost:8088');
  console.log('To open the Argo CD dashboard:');
  console.log(
    `  kubectl port-forward service/argocd-server --namespace ${ARGOCD_NAMESPACE} 8089:443`,
  );
  console.log('  then go to https://localhost:8089 and log in as "admin". The password is in');
  console.log(`  the "argocd-initial-admin-secret" Secret in the ${ARGOCD_NAMESPACE} namespace.`);
}
