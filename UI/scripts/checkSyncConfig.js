const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '..', '.env');
const envSource = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

const parseEnvValue = (key) => {
  const line = envSource
    .split(/\r?\n/)
    .find((entry) => entry.trim().startsWith(`${key}=`));

  if (!line) {
    return '';
  }

  return line
    .slice(line.indexOf('=') + 1)
    .trim()
    .replace(/^['"`]|['"`]$/g, '');
};

const syncUrl = parseEnvValue('URL_Sync');

if (!syncUrl) {
  console.error('URL_Sync is missing in UI/.env');
  process.exit(1);
}

if (syncUrl.includes('${')) {
  console.error('URL_Sync must be explicit and must not rely on interpolation.');
  process.exit(1);
}

try {
  const parsedUrl = new URL(syncUrl);

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    throw new Error('URL_Sync must use http or https.');
  }
} catch (error) {
  console.error(`URL_Sync is invalid: ${syncUrl}`);
  process.exit(1);
}

console.log(`URL_Sync is valid: ${syncUrl}`);
