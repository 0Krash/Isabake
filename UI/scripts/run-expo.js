const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

const MIN_MAJOR = 20;

function getNodeMajor(nodePath) {
  const result = spawnSync(nodePath, ['-p', 'process.versions.node'], {
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    return null;
  }

  const version = result.stdout.trim();
  const major = Number(version.split('.')[0]);
  return Number.isFinite(major) ? major : null;
}

function versionParts(version) {
  return version
    .replace(/^v/, '')
    .split('.')
    .map((part) => Number(part) || 0);
}

function compareVersionsDesc(a, b) {
  const left = versionParts(a);
  const right = versionParts(b);

  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const diff = (right[index] || 0) - (left[index] || 0);
    if (diff !== 0) {
      return diff;
    }
  }

  return 0;
}

function findNvmNode() {
  const nvmVersionsPath = path.join(os.homedir(), '.nvm', 'versions', 'node');

  if (!fs.existsSync(nvmVersionsPath)) {
    return null;
  }

  return fs
    .readdirSync(nvmVersionsPath)
    .filter((version) => versionParts(version)[0] >= MIN_MAJOR)
    .sort(compareVersionsDesc)
    .map((version) => path.join(nvmVersionsPath, version, 'bin', 'node'))
    .find((nodePath) => fs.existsSync(nodePath));
}

function resolveNode() {
  if (getNodeMajor(process.execPath) >= MIN_MAJOR) {
    return process.execPath;
  }

  if (process.env.ISABAKE_NODE && getNodeMajor(process.env.ISABAKE_NODE) >= MIN_MAJOR) {
    return process.env.ISABAKE_NODE;
  }

  const nvmNode = findNvmNode();
  if (nvmNode && getNodeMajor(nvmNode) >= MIN_MAJOR) {
    return nvmNode;
  }

  return null;
}

const nodePath = resolveNode();

if (!nodePath) {
  console.error('Expo requiere Node 20 o superior. Instala Node 20 o define ISABAKE_NODE.');
  process.exit(1);
}

const expoCli = path.join(__dirname, '..', 'node_modules', 'expo', 'bin', 'cli');
const expoArgs = process.argv.slice(2);
const nodeBinPath = path.dirname(nodePath);

const child = spawn(nodePath, [expoCli, ...expoArgs], {
  cwd: path.join(__dirname, '..'),
  stdio: 'inherit',
  env: {
    ...process.env,
    PATH: `${nodeBinPath}${path.delimiter}${process.env.PATH || ''}`,
  },
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code || 0);
});
