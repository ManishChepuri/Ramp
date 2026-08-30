'use strict'

// ---------------------------------------------------------------------------
// Repo access for the integrated IDE.
//
// `ramp generate <github-url>` clones the *target* repo into
// Ramp/.ramp/repos/<name>-<hash>/ and writes ramp-manifest.json into that same
// directory. `ramp open` then starts this backend with MANIFEST_PATH pointing
// at that manifest — so the repo root is simply the manifest's directory.
//
// The clone is pristine: sabotage bugs live only as `injectedDiff` text in the
// manifest, never applied to disk. This module only ever *reads* from the clone.
// ---------------------------------------------------------------------------

const fs = require('fs')
const path = require('path')

const MAX_FILE_BYTES = 1024 * 1024 // 1 MB — the IDE is for source files, not blobs

let cachedRoot
let resolved = false

function looksLikeRepo(dir) {
  try {
    if (!fs.statSync(dir).isDirectory()) return false
    if (fs.existsSync(path.join(dir, '.git'))) return true
    if (fs.existsSync(path.join(dir, 'package.json'))) return true
    // A bare directory holding only the manifest is not a checkout.
    return fs.readdirSync(dir).filter(n => !n.startsWith('ramp-manifest.json')).length >= 3
  } catch {
    return false
  }
}

function readLastRepositoryState() {
  // Fallback for `npm run dev` where MANIFEST_PATH still points at the fixture:
  // Ramp/.ramp/last-repository.json records the most recent generated checkout.
  const candidates = [
    path.resolve(__dirname, '..', '..', '.ramp', 'last-repository.json'),
    path.resolve(process.cwd(), '.ramp', 'last-repository.json'),
  ]
  for (const p of candidates) {
    try {
      if (!fs.existsSync(p)) continue
      const state = JSON.parse(fs.readFileSync(p, 'utf8'))
      if (state.repoPath && fs.existsSync(state.repoPath)) return state.repoPath
    } catch {
      /* ignore malformed state */
    }
  }
  return null
}

/**
 * Absolute path to the repository checkout the IDE reads from, or null when
 * Ramp has not generated against a real repo yet (fixture-only demo).
 */
function getRepoRoot() {
  if (resolved) return cachedRoot
  resolved = true
  cachedRoot = null

  const override = process.env.RAMP_REPO_PATH
  if (override && fs.existsSync(override)) {
    cachedRoot = path.resolve(override)
    return cachedRoot
  }

  const manifestPath = process.env.MANIFEST_PATH
  if (manifestPath) {
    const dir = path.dirname(path.resolve(manifestPath))
    if (looksLikeRepo(dir)) {
      cachedRoot = dir
      return cachedRoot
    }
  }

  cachedRoot = readLastRepositoryState()
  return cachedRoot
}

// Test seam — lets the verify suite point the resolver at a temp dir.
function _setRepoRootForTests(root) {
  resolved = true
  cachedRoot = root ? path.resolve(root) : null
}

/**
 * Resolve a repo-relative path to an absolute path inside the checkout.
 * Throws on traversal, absolute paths, or symlinks that escape the root.
 */
function safeResolve(relPath) {
  const root = getRepoRoot()
  if (!root) {
    const err = new Error('No repository checkout available')
    err.code = 'NO_REPO'
    throw err
  }
  if (typeof relPath !== 'string' || !relPath.trim()) {
    const err = new Error('A file path is required')
    err.code = 'BAD_PATH'
    throw err
  }
  const normalized = relPath.replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\/+/, '')
  const abs = path.resolve(root, normalized)
  const rel = path.relative(root, abs)
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) {
    const err = new Error(`Path escapes the repository: ${relPath}`)
    err.code = 'BAD_PATH'
    throw err
  }
  return abs
}

const LANGUAGE_BY_EXT = {
  '.js': 'javascript', '.jsx': 'javascript', '.mjs': 'javascript', '.cjs': 'javascript',
  '.ts': 'typescript', '.tsx': 'typescript', '.d.ts': 'typescript',
  '.json': 'json', '.md': 'markdown', '.markdown': 'markdown',
  '.css': 'css', '.scss': 'scss', '.less': 'less',
  '.html': 'html', '.htm': 'html', '.xml': 'xml', '.svg': 'xml',
  '.py': 'python', '.rb': 'ruby', '.go': 'go', '.rs': 'rust',
  '.java': 'java', '.kt': 'kotlin', '.c': 'c', '.h': 'c',
  '.cpp': 'cpp', '.cc': 'cpp', '.hpp': 'cpp', '.cs': 'csharp',
  '.php': 'php', '.sh': 'shell', '.bash': 'shell', '.zsh': 'shell',
  '.yml': 'yaml', '.yaml': 'yaml', '.toml': 'ini', '.ini': 'ini',
  '.sql': 'sql', '.graphql': 'graphql', '.gql': 'graphql',
  '.prisma': 'prisma', '.vue': 'html', '.svelte': 'html',
}

function languageFor(filePath) {
  const lower = filePath.toLowerCase()
  if (lower.endsWith('.d.ts')) return 'typescript'
  return LANGUAGE_BY_EXT[path.extname(lower)] || 'plaintext'
}

/**
 * Read one source file from the checkout.
 * Returns { path, content, language, truncated, bytes }.
 */
function readRepoFile(relPath) {
  const abs = safeResolve(relPath)
  let stat
  try {
    stat = fs.lstatSync(abs)
  } catch {
    const err = new Error(`File not found: ${relPath}`)
    err.code = 'NOT_FOUND'
    throw err
  }
  if (stat.isSymbolicLink() || !stat.isFile()) {
    const err = new Error(`Not a regular file: ${relPath}`)
    err.code = 'BAD_PATH'
    throw err
  }

  const truncated = stat.size > MAX_FILE_BYTES
  const buf = truncated
    ? fs.readFileSync(abs).subarray(0, MAX_FILE_BYTES)
    : fs.readFileSync(abs)

  return {
    path: relPath.replace(/\\/g, '/').replace(/^\.\//, ''),
    content: buf.toString('utf8'),
    language: languageFor(relPath),
    truncated,
    bytes: stat.size,
  }
}

module.exports = {
  MAX_FILE_BYTES,
  getRepoRoot,
  safeResolve,
  languageFor,
  readRepoFile,
  _setRepoRootForTests,
}
