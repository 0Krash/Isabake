const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const ignoredDirs = new Set([
  '.expo',
  '.git',
  'android',
  'ios',
  'node_modules',
]);
const ignoredFiles = new Set([
  'babel.config.js',
  'jest.config.js',
]);

const syntaxRoots = [
  'config',
  'data',
  'scripts',
  'services',
  'test',
  'utils',
];
const syntaxRootFiles = [
  'app.config.js',
];

const collectJsFiles = (dir, files = []) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!ignoredDirs.has(entry.name)) {
        collectJsFiles(path.join(dir, entry.name), files);
      }
      continue;
    }

    if (
      entry.isFile() &&
      entry.name.endsWith('.js') &&
      !ignoredFiles.has(entry.name)
    ) {
      files.push(path.join(dir, entry.name));
    }
  }

  return files;
};

const files = syntaxRoots
  .map((syntaxRoot) => path.join(rootDir, syntaxRoot))
  .filter((syntaxRoot) => fs.existsSync(syntaxRoot))
  .flatMap((syntaxRoot) => collectJsFiles(syntaxRoot))
  .concat(
    syntaxRootFiles
      .map((file) => path.join(rootDir, file))
      .filter((file) => fs.existsSync(file)),
  );
const failures = [];

for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], {
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    failures.push({
      file: path.relative(rootDir, file),
      output: result.stderr || result.stdout,
    });
  }
}

if (failures.length > 0) {
  failures.forEach((failure) => {
    console.error(`Syntax check failed: ${failure.file}`);
    console.error(failure.output);
  });
  process.exit(1);
}

console.log(`Syntax check passed for ${files.length} JS files.`);
