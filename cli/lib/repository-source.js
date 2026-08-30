'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const RAMP_ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_CACHE_ROOT = path.join(RAMP_ROOT, '.ramp', 'repos');
const DEFAULT_STATE_PATH = path.join(RAMP_ROOT, '.ramp', 'last-repository.json');

async function resolveRepositorySource(source, options = {}) {
  if (!isGitHubUrl(source)) {
    const repoPath = path.resolve(source);
    if (!fs.existsSync(repoPath) || !fs.statSync(repoPath).isDirectory()) {
      throw new Error(`Repository path does not exist: ${repoPath}`);
    }
    return { repoPath, source: repoPath, remote: false, cloned: false };
  }

  const cacheRoot = path.resolve(options.cacheRoot || process.env.RAMP_REPO_CACHE || DEFAULT_CACHE_ROOT);
  const destination = path.join(cacheRoot, cacheDirectoryName(source));
  fs.mkdirSync(cacheRoot, { recursive: true });

  if (!fs.existsSync(destination)) {
    options.logger?.log?.(`\n→ Cloning ${source} into Ramp's local repository cache...`);
    await runGit(['clone', '--depth', '1', '--quiet', source, destination], cacheRoot);
    return { repoPath: destination, source, remote: true, cloned: true };
  }

  if (!fs.existsSync(path.join(destination, '.git'))) {
    throw new Error(`Ramp's cached repository is invalid: ${destination}. Remove that cache directory and retry.`);
  }
  if (options.refresh !== false) {
    options.logger?.log?.(`\n→ Refreshing cached clone for ${source}...`);
    await runGit(['fetch', '--depth', '1', '--quiet', 'origin', 'HEAD'], destination);
    await runGit(['reset', '--hard', '--quiet', 'FETCH_HEAD'], destination);
  }
  return { repoPath: destination, source, remote: true, cloned: false };
}

function rememberRepository(resolved, manifestPath, options = {}) {
  const statePath = path.resolve(options.statePath || DEFAULT_STATE_PATH);
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  const state = {
    source: resolved.source,
    repoPath: resolved.repoPath,
    manifestPath: path.resolve(manifestPath),
    updatedAt: new Date().toISOString(),
  };
  const tempPath = `${statePath}.tmp-${process.pid}`;
  fs.writeFileSync(tempPath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  fs.renameSync(tempPath, statePath);
  return state;
}

function loadLastRepository(options = {}) {
  const statePath = path.resolve(options.statePath || DEFAULT_STATE_PATH);
  if (!fs.existsSync(statePath)) return null;
  try {
    const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    if (!state.repoPath || !fs.existsSync(state.repoPath)) return null;
    if (!state.manifestPath || !fs.existsSync(state.manifestPath)) return null;
    return state;
  } catch (_) {
    return null;
  }
}

function isGitHubUrl(source) {
  if (typeof source !== 'string') return false;
  return /^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\.git)?\/?$/.test(source) ||
    /^git@github\.com:[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\.git)?$/.test(source) ||
    /^ssh:\/\/git@github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\.git)?$/.test(source);
}

function cacheDirectoryName(source) {
  const repositoryName = source.replace(/\/$/, '').replace(/\.git$/, '').split(/[/:]/).at(-1)
    .replace(/[^A-Za-z0-9_.-]/g, '-');
  const digest = crypto.createHash('sha256').update(source).digest('hex').slice(0, 10);
  return `${repositoryName}-${digest}`;
}

function runGit(args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn('git', args, { cwd, stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', chunk => { stderr += chunk.toString(); });
    child.on('error', error => reject(new Error(`Could not start git: ${error.message}`)));
    child.on('close', code => {
      if (code === 0) resolve();
      else reject(new Error(`git ${args[0]} failed: ${stderr.trim() || `exit ${code}`}`));
    });
  });
}

module.exports = {
  DEFAULT_CACHE_ROOT,
  DEFAULT_STATE_PATH,
  cacheDirectoryName,
  isGitHubUrl,
  loadLastRepository,
  rememberRepository,
  resolveRepositorySource,
};
