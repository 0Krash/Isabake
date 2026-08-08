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
const envPath = path.join(__dirname, '..', '.env');

function parseEnvValue(value) {
  const trimmed = value.trim();
  const quote = trimmed[0];

  if ((quote === '"' || quote === "'") && trimmed.endsWith(quote)) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  return fs
    .readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .reduce((env, line) => {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith('#')) {
        return env;
      }

      const equalsIndex = trimmed.indexOf('=');
      if (equalsIndex <= 0) {
        return env;
      }

      const key = trimmed.slice(0, equalsIndex).trim();
      const value = trimmed.slice(equalsIndex + 1);
      env[key] = parseEnvValue(value);
      return env;
    }, {});
}

function getArgValue(args, longName, shortName) {
  const longEqualsPrefix = `${longName}=`;
  const longEquals = args.find((arg) => arg.startsWith(longEqualsPrefix));
  if (longEquals) {
    return longEquals.slice(longEqualsPrefix.length);
  }

  const longIndex = args.indexOf(longName);
  if (longIndex >= 0) {
    return args[longIndex + 1];
  }

  if (!shortName) {
    return null;
  }

  const shortIndex = args.indexOf(shortName);
  return shortIndex >= 0 ? args[shortIndex + 1] : null;
}

function getHostType(args) {
  if (args.includes('--localhost')) {
    return 'localhost';
  }

  if (args.includes('--tunnel')) {
    return 'tunnel';
  }

  if (args.includes('--lan')) {
    return 'lan';
  }

  return getArgValue(args, '--host', '-m') || 'lan';
}

function getLanAddress() {
  const interfaces = os.networkInterfaces();

  for (const addresses of Object.values(interfaces)) {
    const address = addresses.find(
      (entry) => entry.family === 'IPv4' && !entry.internal
    );

    if (address) {
      return address.address;
    }
  }

  return null;
}

const childEnv = {
  ...loadDotEnv(envPath),
  ...process.env,
  PATH: `${nodeBinPath}${path.delimiter}${process.env.PATH || ''}`,
};

const hostType = getHostType(expoArgs);
const port = getArgValue(expoArgs, '--port', '-p') || '8081';
const configuredLanAddress =
  childEnv.EXPO_DEV_SERVER_HOST || childEnv.REACT_NATIVE_PACKAGER_HOSTNAME;
const lanAddress =
  hostType === 'lan' ? configuredLanAddress || getLanAddress() : null;

if (lanAddress && !childEnv.EXPO_PACKAGER_PROXY_URL) {
  childEnv.EXPO_PACKAGER_PROXY_URL = `http://${lanAddress}:${port}`;
}

if (lanAddress) {
  childEnv.REACT_NATIVE_PACKAGER_HOSTNAME = lanAddress;
  console.log(`Expo LAN URL: exp://${lanAddress}:${port}`);
}

const child = spawn(nodePath, [expoCli, ...expoArgs], {
  cwd: path.join(__dirname, '..'),
  stdio: 'inherit',
  env: childEnv,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code || 0);
});
