#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const ICON_ROOT = path.join(ROOT, 'assets', 'icons');
const MANIFEST_TS = path.join(ICON_ROOT, 'manifest.ts');
const REGISTRY_JS = path.join(ICON_ROOT, 'registry.js');
const CATEGORIES = new Set(['actions', 'entities', 'navigation', 'status']);
const OFFICIAL_HOSTS = new Set(['svgrepo.com', 'www.svgrepo.com']);

const parseArgs = (argv) => {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (!arg.startsWith('--')) {
      continue;
    }

    const key = arg.slice(2);

    if (key === 'force') {
      args.force = true;
      continue;
    }

    args[key] = argv[index + 1];
    index += 1;
  }

  return args;
};

const fail = (message) => {
  console.error(`icon:import failed: ${message}`);
  process.exit(1);
};

const toKebabCase = (value = '') =>
  String(value)
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

const parseSvgRepoUrl = (value) => {
  let url;

  try {
    url = new URL(value);
  } catch {
    fail('Provide a valid SVGRepo URL.');
  }

  if (!OFFICIAL_HOSTS.has(url.hostname)) {
    fail('Only svgrepo.com URLs are accepted.');
  }

  const match = url.pathname.match(/^\/(?:svg|show)\/(\d+)\/([^/?#]+)(?:\.svg)?$/);

  if (!match) {
    fail('Expected a SVGRepo URL like https://www.svgrepo.com/svg/<id>/<slug>.');
  }

  return {
    canonicalUrl: `https://www.svgrepo.com/svg/${match[1]}/${match[2]}`,
    id: match[1],
    slug: match[2].replace(/\.svg$/, ''),
    svgUrl: `https://www.svgrepo.com/show/${match[1]}/${match[2].replace(/\.svg$/, '')}.svg`,
  };
};

const stripUnsafeSvg = (svg) => {
  let next = String(svg || '').trim();

  next = next.replace(/<\?xml[\s\S]*?\?>/gi, '').trim();
  next = next.replace(/<!--[\s\S]*?-->/g, '').trim();
  next = next.replace(/<!DOCTYPE[\s\S]*?>/gi, '').trim();
  next = next.replace(/<script[\s\S]*?<\/script>/gi, '');
  next = next.replace(/<metadata[\s\S]*?<\/metadata>/gi, '');
  next = next.replace(/<title[\s\S]*?<\/title>/gi, '');
  next = next.replace(/<desc[\s\S]*?<\/desc>/gi, '');
  next = next.replace(/\s+on[a-z]+\s*=\s*"[^"]*"/gi, '');
  next = next.replace(/\s+on[a-z]+\s*=\s*'[^']*'/gi, '');
  next = next.replace(/\s+(?:xlink:)?href\s*=\s*"https?:\/\/[^"]*"/gi, '');
  next = next.replace(/\s+(?:xlink:)?href\s*=\s*'https?:\/\/[^']*'/gi, '');
  next = next.replace(/^<svg\b([^>]*)>/i, (match) =>
    match
      .replace(/\s(width|height)="[^"]*"/gi, '')
      .replace(/\s(width|height)='[^']*'/gi, ''),
  );
  next = next.replace(/\s(fill|stroke)="(?!none|currentColor)[^"]*"/gi, ' $1="currentColor"');
  next = next.replace(/\s(fill|stroke)='(?!none|currentColor)[^']*'/gi, ' $1="currentColor"');
  next = next.replace(/>\s+</g, '><').trim();

  if (!/^<svg[\s>]/i.test(next)) {
    fail('Downloaded content is not an SVG document.');
  }

  if (!/\sviewBox\s*=\s*["'][^"']+["']/i.test(next)) {
    fail('SVG is missing a valid viewBox.');
  }

  const nonNamespaceRemoteReference = /https?:\/\//i.test(
    next.replace(/xmlns(?::\w+)?="https?:\/\/www\.w3\.org\/[^"]+"/gi, ''),
  );

  if (/<script/i.test(next) || nonNamespaceRemoteReference) {
    fail('SVG contains scripts or remote references after sanitization.');
  }

  return `${next}\n`;
};

const fetchSvg = async (svgUrl) => {
  const response = await fetch(svgUrl, {
    headers: {
      accept: 'image/svg+xml,text/plain;q=0.8,*/*;q=0.1',
      'user-agent': 'IsabakeIconImporter/1.0',
    },
  });
  const contentType = response.headers.get('content-type') || '';
  const text = await response.text();

  if (!response.ok) {
    fail(`SVGRepo returned HTTP ${response.status}.`);
  }

  if (!contentType.includes('svg') && !text.trim().startsWith('<svg')) {
    fail(`Expected SVG content but received ${contentType || 'unknown content'}.`);
  }

  return stripUnsafeSvg(text);
};

const readJsonModule = async (filePath, fallback) => {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    const match = content.match(/iconManifest(?:\s*:\s*[^=]+)?\s*=\s*(\[[\s\S]*?\]);/);

    if (!match) {
      return fallback;
    }

    return JSON.parse(match[1]);
  } catch {
    return fallback;
  }
};

const writeManifest = async (entries) => {
  const sorted = [...entries].sort((a, b) => a.name.localeCompare(b.name, 'en'));
  const serialized = JSON.stringify(sorted, null, 2);
  const ts = `export type IconCategory = 'actions' | 'entities' | 'navigation' | 'status';
export type IconStyle = 'filled' | 'multicolor' | 'outline' | 'rounded';

export type IconManifestEntry = {
  id: string;
  name: string;
  path: string;
  sourceUrl: string;
  originalName: string;
  license: string;
  addedAt: string;
  category: IconCategory;
  style: IconStyle;
};

export const iconManifest: IconManifestEntry[] = ${serialized};

export default iconManifest;
`;

  await fs.writeFile(MANIFEST_TS, ts, 'utf8');
};

const readSvgMap = async (entries) => {
  const pairs = [];

  for (const entry of entries) {
    const absolutePath = path.join(ROOT, entry.path);
    const svg = await fs.readFile(absolutePath, 'utf8');
    pairs.push([entry.name, svg]);
  }

  return Object.fromEntries(pairs);
};

const writeRegistry = async (entries) => {
  const svgByName = await readSvgMap(entries);
  const content = `// Generated by scripts/import-svg-icon.mjs. Do not edit icon XML here.
export const iconManifest = ${JSON.stringify(entries, null, 2)};

export const iconSvgs = ${JSON.stringify(svgByName, null, 2)};

export const iconNames = iconManifest.map((icon) => icon.name);

export const getIcon = (name) =>
  iconManifest.find((icon) => icon.name === name) || null;

export default iconManifest;
`;

  await fs.writeFile(REGISTRY_JS, content, 'utf8');
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  const name = toKebabCase(args.name);
  const category = args.category || 'actions';
  const style = args.style || 'outline';
  const addedAt = args.addedAt || new Date().toISOString().slice(0, 10);

  if (!args.url) {
    fail('Missing --url.');
  }

  if (!name) {
    fail('Missing --name.');
  }

  if (!CATEGORIES.has(category)) {
    fail(`Invalid --category. Use one of: ${[...CATEGORIES].join(', ')}.`);
  }

  if (!args.license) {
    fail('Missing --license. Verify the SVGRepo license page before importing.');
  }

  if (!args.originalName) {
    fail('Missing --originalName. Use the SVGRepo resource title.');
  }

  const svgRepo = parseSvgRepoUrl(args.url);
  const filePath = path.join(ICON_ROOT, category, `${name}.svg`);
  const relativePath = path.relative(ROOT, filePath).replaceAll(path.sep, '/');

  await fs.mkdir(path.dirname(filePath), { recursive: true });

  try {
    await fs.access(filePath);

    if (!args.force) {
      fail(`Icon file already exists: ${relativePath}. Use --force to overwrite.`);
    }
  } catch {
    // File does not exist.
  }

  const svg = await fetchSvg(svgRepo.svgUrl);
  await fs.writeFile(filePath, svg, 'utf8');

  const existing = await readJsonModule(MANIFEST_TS, []);
  const nextEntry = {
    addedAt,
    category,
    id: name,
    license: args.license,
    name,
    originalName: args.originalName,
    path: relativePath,
    sourceUrl: svgRepo.canonicalUrl,
    style,
  };
  const nextEntries = [
    ...existing.filter((entry) => entry.name !== name),
    nextEntry,
  ];

  await writeManifest(nextEntries);
  await writeRegistry(nextEntries);

  console.log(`Imported ${name} from ${svgRepo.canonicalUrl}`);
};

main().catch((error) => {
  fail(error?.message || String(error));
});
