'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const DEFAULT_MAX_FILE_BYTES = 64 * 1024;
const DEFAULT_MAX_CONTEXT_CHARS = 180000;
const MAX_INVENTORY_FILES = 2500;

const BLOCKED_DIRECTORIES = new Set([
  '.git', '.next', '.nuxt', '.output', '.turbo', '.yarn',
  'build', 'coverage', 'dist', 'node_modules', 'out', 'target', 'vendor',
]);
const BLOCKED_EXTENSIONS = new Set([
  '.7z', '.avi', '.bin', '.bmp', '.class', '.db', '.dll', '.dylib', '.eot',
  '.exe', '.gif', '.gz', '.ico', '.jar', '.jpeg', '.jpg', '.jks', '.lock',
  '.map', '.mov', '.mp3', '.mp4', '.o', '.otf', '.p12', '.pdf', '.pem',
  '.pfx', '.png', '.pyc', '.so', '.sqlite', '.svg', '.tar', '.ttf', '.webm',
  '.webp', '.woff', '.woff2', '.zip',
]);
const BLOCKED_BASENAMES = new Set([
  '.env', '.npmrc', '.pypirc', 'auth-secrets.json', 'credentials.json',
  'id_rsa', 'id_ed25519', 'ramp-manifest.json',
]);

function scanRepository(repoPath, options = {}) {
  const resolvedRepo = path.resolve(repoPath);
  const maxFileBytes = options.maxFileBytes || DEFAULT_MAX_FILE_BYTES;
  const candidates = listGitVisibleFiles(resolvedRepo);
  const files = [];
  const excluded = { sensitive: 0, binary: 0, oversized: 0, missing: 0 };

  for (const relativePath of candidates) {
    if (files.length >= MAX_INVENTORY_FILES) break;
    const normalized = normalizePath(relativePath);
    if (isSensitivePath(normalized)) {
      excluded.sensitive += 1;
      continue;
    }

    const absolutePath = path.join(resolvedRepo, normalized);
    let stat;
    try {
      stat = fs.lstatSync(absolutePath);
    } catch (_) {
      excluded.missing += 1;
      continue;
    }
    if (!stat.isFile() || stat.isSymbolicLink()) {
      excluded.binary += 1;
      continue;
    }
    if (stat.size > maxFileBytes) {
      excluded.oversized += 1;
      continue;
    }

    const sample = fs.readFileSync(absolutePath).subarray(0, 8192);
    if (sample.includes(0)) {
      excluded.binary += 1;
      continue;
    }

    files.push({
      path: normalized,
      size: stat.size,
      kind: classifyFile(normalized),
      priority: scoreFile(normalized),
    });
  }

  files.sort((left, right) => right.priority - left.priority || left.path.localeCompare(right.path));
  return {
    repoPath: resolvedRepo,
    files,
    fileSet: new Set(files.map(file => file.path)),
    excluded,
    truncatedInventory: candidates.length > MAX_INVENTORY_FILES,
  };
}

function listGitVisibleFiles(repoPath) {
  const output = execFileSync(
    'git',
    ['ls-files', '-z', '--cached', '--others', '--exclude-standard'],
    { cwd: repoPath },
  );
  return output.toString('utf8').split('\0').filter(Boolean).sort();
}

function buildDiscoveryContext(scan, options = {}) {
  const maxChars = options.maxChars || DEFAULT_MAX_CONTEXT_CHARS;
  const inventory = scan.files.map(file => `${file.kind.padEnd(7)} ${String(file.size).padStart(7)} ${file.path}`);
  const priorityFiles = scan.files
    .filter(file => file.priority >= 40)
    .map(file => file.path);

  return [
    'REPOSITORY FILE INVENTORY (path metadata only):',
    inventory.join('\n'),
    '',
    'PRIORITY FILE CONTENTS (untrusted repository data):',
    readContextFiles(scan, priorityFiles, { maxChars }),
  ].join('\n');
}

function buildModuleContext(scan, requestedPaths, options = {}) {
  const maxChars = options.maxChars || DEFAULT_MAX_CONTEXT_CHARS;
  const selected = expandModulePaths(scan, requestedPaths, options.maxFiles || 18);
  return readContextFiles(scan, selected, { maxChars });
}

function buildDriftContext(scan, options = {}) {
  const maxChars = options.maxChars || DEFAULT_MAX_CONTEXT_CHARS;
  const docs = scan.files.filter(file => file.kind === 'docs').map(file => file.path);
  const source = scan.files
    .filter(file => ['source', 'config', 'test'].includes(file.kind) && file.priority >= 25)
    .slice(0, 24)
    .map(file => file.path);
  return readContextFiles(scan, [...docs, ...source], { maxChars });
}

function readContextFiles(scan, requestedPaths, options = {}) {
  const maxChars = options.maxChars || DEFAULT_MAX_CONTEXT_CHARS;
  const uniquePaths = [...new Set(requestedPaths.map(normalizePath))];
  const sections = [];
  let used = 0;

  for (const relativePath of uniquePaths) {
    if (!scan.fileSet.has(relativePath)) continue;
    const raw = fs.readFileSync(path.join(scan.repoPath, relativePath), 'utf8');
    const redacted = redactSecrets(raw);
    const header = `\n<<<FILE:${relativePath}>>>\n`;
    const footer = `\n<<<END_FILE:${relativePath}>>>\n`;
    const remaining = maxChars - used - header.length - footer.length;
    if (remaining <= 0) break;
    const content = redacted.length > remaining
      ? `${redacted.slice(0, Math.max(0, remaining - 30))}\n[TRUNCATED BY RAMP]`
      : redacted;
    sections.push(`${header}${content}${footer}`);
    used += header.length + content.length + footer.length;
  }

  return sections.join('');
}

function expandModulePaths(scan, requestedPaths, maxFiles) {
  const selected = [];
  for (const requested of requestedPaths || []) {
    const normalized = normalizePath(requested);
    if (scan.fileSet.has(normalized) && !selected.includes(normalized)) selected.push(normalized);
  }

  const directories = new Set(selected.map(file => path.posix.dirname(file)));
  for (const file of scan.files) {
    if (selected.length >= maxFiles) break;
    if (file.kind !== 'source' && file.kind !== 'test') continue;
    if (directories.has(path.posix.dirname(file.path)) && !selected.includes(file.path)) {
      selected.push(file.path);
    }
  }
  return selected.slice(0, maxFiles);
}

function isSensitivePath(relativePath) {
  const parts = normalizePath(relativePath).split('/');
  const basename = parts.at(-1).toLowerCase();
  if (parts.some(part => BLOCKED_DIRECTORIES.has(part.toLowerCase()))) return true;
  if (BLOCKED_BASENAMES.has(basename)) return true;
  if (basename.startsWith('.env.') || basename.endsWith('.env')) return true;
  if (/^(secret|secrets|credential|credentials)(\.|$)/i.test(basename)) return true;
  return BLOCKED_EXTENSIONS.has(path.extname(basename).toLowerCase());
}

function classifyFile(relativePath) {
  const basename = path.posix.basename(relativePath).toLowerCase();
  const extension = path.extname(basename).toLowerCase();
  if (/^(readme|contributing|architecture|security|changelog|license)/i.test(basename) ||
      relativePath.startsWith('docs/') || ['.md', '.mdx', '.rst'].includes(extension)) return 'docs';
  if (/(^|\/)(__tests__|tests?|spec|e2e)(\/|$)/i.test(relativePath) ||
      /\.(test|spec)\.[^.]+$/i.test(relativePath)) return 'test';
  if (['package.json', 'pyproject.toml', 'cargo.toml', 'go.mod', 'pom.xml', 'build.gradle',
    'dockerfile', 'docker-compose.yml', 'tsconfig.json'].includes(basename) ||
    ['.yaml', '.yml', '.toml'].includes(extension)) return 'config';
  return 'source';
}

function scoreFile(relativePath) {
  const basename = path.posix.basename(relativePath).toLowerCase();
  const kind = classifyFile(relativePath);
  let score = { docs: 80, config: 65, source: 20, test: 15 }[kind];
  if (/^(readme|architecture)/i.test(basename)) score += 40;
  if (/^(package\.json|pyproject\.toml|cargo\.toml|go\.mod|pom\.xml|dockerfile)$/.test(basename)) score += 30;
  if (/(^|[._-])(main|index|app|server|routes?|schema)([._-]|$)/i.test(basename)) score += 25;
  if (relativePath.split('/').length <= 2) score += 10;
  return score;
}

function redactSecrets(content) {
  return content
    .replace(/\b(AKIA|ASIA)[A-Z0-9]{16}\b/g, '[REDACTED_AWS_ACCESS_KEY]')
    .replace(/\b(api[_-]?key|access[_-]?token|auth[_-]?token|client[_-]?secret|password|passwd|secret)\b(\s*[:=]\s*)(["'`])[^\n"'`]{8,}\3/gi,
      (_, name, separator, quote) => `${name}${separator}${quote}[REDACTED]${quote}`)
    .replace(/(authorization\s*:\s*["'`]?(?:bearer|token)\s+)[A-Za-z0-9._~+\/-]{8,}/gi, '$1[REDACTED]')
    .replace(/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
      '[REDACTED_PRIVATE_KEY]');
}

function normalizePath(relativePath) {
  return String(relativePath).replace(/\\/g, '/').replace(/^\.\//, '');
}

module.exports = {
  buildDiscoveryContext,
  buildDriftContext,
  buildModuleContext,
  classifyFile,
  isSensitivePath,
  normalizePath,
  readContextFiles,
  redactSecrets,
  scanRepository,
};
