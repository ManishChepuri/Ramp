'use strict';

const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const test = require('node:test');
const {
  cacheDirectoryName,
  isGitHubUrl,
  loadLastRepository,
  rememberRepository,
  resolveRepositorySource,
} = require('./repository-source');

test('recognizes cloneable GitHub repository URLs without accepting browser subpaths', () => {
  assert.equal(isGitHubUrl('https://github.com/gothinkster/node-express-realworld-example-app'), true);
  assert.equal(isGitHubUrl('git@github.com:gothinkster/node-express-realworld-example-app.git'), true);
  assert.equal(isGitHubUrl('https://github.com/org/repo/tree/main'), false);
  assert.equal(isGitHubUrl('/local/repo'), false);
});

test('creates stable, repository-specific cache names', () => {
  const first = cacheDirectoryName('https://github.com/example/demo.git');
  const second = cacheDirectoryName('https://github.com/example/demo.git');
  assert.equal(first, second);
  assert.match(first, /^demo-[0-9a-f]{10}$/);
});

test('resolves local repositories and remembers the last generated manifest', async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ramp-source-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const manifestPath = path.join(root, 'ramp-manifest.json');
  const statePath = path.join(root, 'state', 'last.json');
  fs.writeFileSync(manifestPath, '{}\n');
  const resolved = await resolveRepositorySource(root);
  assert.equal(resolved.repoPath, root);
  assert.equal(resolved.remote, false);
  rememberRepository(resolved, manifestPath, { statePath });
  assert.equal(loadLastRepository({ statePath }).repoPath, root);
});
