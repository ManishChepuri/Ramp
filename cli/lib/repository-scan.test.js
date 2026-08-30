'use strict';

const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const test = require('node:test');
const {
  buildDiscoveryContext,
  buildModuleContext,
  redactSecrets,
  scanRepository,
} = require('./repository-scan');

function createRepo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ramp-scan-test-'));
  fs.mkdirSync(path.join(root, 'src'), { recursive: true });
  fs.mkdirSync(path.join(root, 'node_modules', 'ignored'), { recursive: true });
  fs.writeFileSync(path.join(root, 'README.md'), '# Scanner fixture\nRun node src/index.js.\n');
  fs.writeFileSync(path.join(root, 'src', 'index.js'), [
    "const apiKey = '1234567890-secret';",
    'module.exports = value => value + 1;',
    '',
  ].join('\n'));
  fs.writeFileSync(path.join(root, '.env'), 'REAL_SECRET=do-not-read\n');
  fs.writeFileSync(path.join(root, 'image.bin'), Buffer.from([0, 1, 2, 3]));
  fs.writeFileSync(path.join(root, 'large.txt'), 'x'.repeat(2048));
  fs.writeFileSync(path.join(root, 'node_modules', 'ignored', 'index.js'), 'ignored\n');
  fs.writeFileSync(path.join(root, '.gitignore'), 'node_modules/\n.env\n');
  execFileSync('git', ['init', '-q'], { cwd: root });
  return root;
}

test('scans git-visible text while excluding secrets, binaries, ignored, and oversized files', t => {
  const root = createRepo();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const scan = scanRepository(root, { maxFileBytes: 1024 });
  assert(scan.fileSet.has('README.md'));
  assert(scan.fileSet.has('src/index.js'));
  assert(!scan.fileSet.has('.env'));
  assert(!scan.fileSet.has('image.bin'));
  assert(!scan.fileSet.has('large.txt'));
  assert(!scan.fileSet.has('node_modules/ignored/index.js'));
  assert.equal(scan.excluded.oversized, 1);

  const context = buildDiscoveryContext(scan);
  assert.match(context, /src\/index\.js/);
  assert.match(context, /\[REDACTED\]/);
  assert.doesNotMatch(context, /1234567890-secret|do-not-read/);
});

test('module context is path-scoped and obeys the character budget', t => {
  const root = createRepo();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const scan = scanRepository(root, { maxFileBytes: 4096 });
  const context = buildModuleContext(scan, ['src/index.js'], { maxChars: 120 });
  assert.match(context, /<<<FILE:src\/index\.js>>>/);
  assert(context.length <= 150);
});

test('redacts common credential forms in otherwise safe source files', () => {
  const redacted = redactSecrets([
    "password = 'a-very-secret-password'",
    'Authorization: Bearer abcdefghijklmnop',
    'AKIAABCDEFGHIJKLMNOP',
  ].join('\n'));
  assert.doesNotMatch(redacted, /a-very-secret-password|abcdefghijklmnop|AKIAABCDEFGHIJKLMNOP/);
});
