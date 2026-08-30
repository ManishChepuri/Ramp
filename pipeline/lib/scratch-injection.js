'use strict';

const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

/**
 * Apply one generated sabotage diff to a temporary copy of its target file.
 * The source repository is hashed before and after every attempt. The function
 * never invokes `git apply` with the source repository as its working directory.
 */
function injectIntoScratch(repoPath, sabotage, options = {}) {
  const resolvedRepo = path.resolve(repoPath);
  const relativeFile = validateSabotage(resolvedRepo, sabotage);
  const sourceFile = path.join(resolvedRepo, relativeFile);
  const sourceHashBefore = hashFile(sourceFile);
  const scratchRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ramp-sabotage-'));
  const scratchFile = path.join(scratchRoot, relativeFile);
  let succeeded = false;

  try {
    fs.mkdirSync(path.dirname(scratchFile), { recursive: true });
    fs.copyFileSync(sourceFile, scratchFile, fs.constants.COPYFILE_EXCL);

    applyPatch(scratchRoot, sabotage.injectedDiff, true);
    applyPatch(scratchRoot, sabotage.injectedDiff, false);

    if (hashFile(scratchFile) === sourceHashBefore) {
      throw new Error('Injected diff did not change the scratch copy');
    }
    if (hashFile(sourceFile) !== sourceHashBefore) {
      throw new Error('Isolation failure: the source repository file changed');
    }

    succeeded = true;
    return {
      sourceFile,
      scratchRoot,
      scratchFile,
      sourceUnchanged: true,
    };
  } finally {
    if (fs.existsSync(sourceFile) && hashFile(sourceFile) !== sourceHashBefore) {
      throw new Error('Isolation failure: the source repository file changed');
    }
    if ((!succeeded || options.cleanup) && fs.existsSync(scratchRoot)) {
      fs.rmSync(scratchRoot, { recursive: true, force: true });
    }
  }
}

function validateSabotage(repoPath, sabotage) {
  if (!sabotage || typeof sabotage !== 'object' || Array.isArray(sabotage)) {
    throw new Error('Sabotage case must be an object');
  }
  if (typeof sabotage.file !== 'string' || !sabotage.file.trim()) {
    throw new Error('Sabotage case is missing file');
  }
  if (typeof sabotage.injectedDiff !== 'string' || !sabotage.injectedDiff.trim()) {
    throw new Error('Sabotage case is missing injectedDiff');
  }

  const relativeFile = normaliseRelativePath(sabotage.file);
  const sourceFile = path.resolve(repoPath, relativeFile);
  const relative = path.relative(repoPath, sourceFile);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Sabotage target escapes the repository: ${sabotage.file}`);
  }

  const stat = fs.lstatSync(sourceFile);
  if (!stat.isFile() || stat.isSymbolicLink()) {
    throw new Error(`Sabotage target must be a regular non-symlink file: ${sabotage.file}`);
  }

  const patchTargets = extractPatchTargets(sabotage.injectedDiff);
  if (patchTargets.length !== 1 || patchTargets[0] !== relativeFile) {
    throw new Error(`Injected diff must modify only ${relativeFile}`);
  }

  return relativeFile;
}

function extractPatchTargets(diff) {
  if (/^(rename from|rename to|Binary files) /m.test(diff)) {
    throw new Error('Rename and binary diffs are not supported');
  }

  const oldHeaders = [...diff.matchAll(/^---\s+(?:a\/)?([^\t\r\n]+)(?:\t.*)?$/gm)];
  const newHeaders = [...diff.matchAll(/^\+\+\+\s+(?:b\/)?([^\t\r\n]+)(?:\t.*)?$/gm)];
  if (oldHeaders.length === 0 || oldHeaders.length !== newHeaders.length || !/^@@/m.test(diff)) {
    throw new Error('Injected diff must be a complete unified diff');
  }

  const targets = [];
  for (let index = 0; index < oldHeaders.length; index += 1) {
    const oldPath = normaliseRelativePath(oldHeaders[index][1]);
    const newPath = normaliseRelativePath(newHeaders[index][1]);
    if (oldPath === '/dev/null' || newPath === '/dev/null' || oldPath !== newPath) {
      throw new Error('Injected diff cannot add, delete, or rename files');
    }
    if (!targets.includes(newPath)) targets.push(newPath);
  }
  return targets;
}

function normaliseRelativePath(filePath) {
  return filePath.replace(/\\/g, '/').replace(/^\.\//, '');
}

function applyPatch(cwd, diff, checkOnly) {
  // Model-generated unified diffs occasionally contain correct context but stale
  // hunk counts. --recount derives those counts from the actual +/- lines while
  // all path and source-isolation checks remain enforced.
  const args = ['apply', '--whitespace=nowarn', '--unidiff-zero', '--recount'];
  if (checkOnly) args.push('--check');
  args.push('-');

  const result = spawnSync('git', args, {
    cwd,
    input: `${diff.trimEnd()}\n`,
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    const action = checkOnly ? 'validate' : 'apply';
    throw new Error(`Could not ${action} injected diff in scratch copy: ${result.stderr.trim()}`);
  }
}

function hashFile(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

module.exports = {
  extractPatchTargets,
  injectIntoScratch,
  validateSabotage,
};
