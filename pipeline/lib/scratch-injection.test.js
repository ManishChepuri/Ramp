'use strict';

const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const test = require('node:test');
const { injectIntoScratch, validateSabotage } = require('./scratch-injection');

function createRepositoryFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ramp-isolation-test-'));
  const relativeFile = 'src/counter.js';
  const sourceFile = path.join(root, relativeFile);
  fs.mkdirSync(path.dirname(sourceFile), { recursive: true });
  fs.writeFileSync(sourceFile, 'export const next = value => value + 1;\n', 'utf8');
  return { root, relativeFile, sourceFile };
}

function sabotageCase(relativeFile = 'src/counter.js') {
  return {
    file: relativeFile,
    injectedDiff: [
      `--- a/${relativeFile}`,
      `+++ b/${relativeFile}`,
      '@@ -1 +1 @@',
      '-export const next = value => value + 1;',
      '+export const next = value => value - 1;',
      '',
    ].join('\n'),
  };
}

test('injects only into a scratch copy and preserves the source', t => {
  const fixture = createRepositoryFixture();
  t.after(() => fs.rmSync(fixture.root, { recursive: true, force: true }));

  const result = injectIntoScratch(fixture.root, sabotageCase());
  t.after(() => fs.rmSync(result.scratchRoot, { recursive: true, force: true }));

  assert.equal(fs.readFileSync(fixture.sourceFile, 'utf8'), 'export const next = value => value + 1;\n');
  assert.equal(fs.readFileSync(result.scratchFile, 'utf8'), 'export const next = value => value - 1;\n');
  assert.equal(result.sourceUnchanged, true);
});

test('rejects a diff that targets another file', t => {
  const fixture = createRepositoryFixture();
  t.after(() => fs.rmSync(fixture.root, { recursive: true, force: true }));

  const sabotage = sabotageCase();
  sabotage.file = 'src/other.js';
  fs.writeFileSync(path.join(fixture.root, sabotage.file), 'safe\n', 'utf8');

  assert.throws(() => validateSabotage(fixture.root, sabotage), /must modify only/);
});

test('rejects traversal outside the repository', t => {
  const fixture = createRepositoryFixture();
  t.after(() => fs.rmSync(fixture.root, { recursive: true, force: true }));

  assert.throws(
    () => validateSabotage(fixture.root, sabotageCase('../counter.js')),
    /escapes the repository/,
  );
});

test('rejects incomplete line fragments instead of applying them', t => {
  const fixture = createRepositoryFixture();
  t.after(() => fs.rmSync(fixture.root, { recursive: true, force: true }));

  const sabotage = sabotageCase();
  sabotage.injectedDiff = '-value + 1\n+value - 1';
  assert.throws(() => validateSabotage(fixture.root, sabotage), /complete unified diff/);
});

test('recounts stale model-generated hunk lengths before scratch application', t => {
  const fixture = createRepositoryFixture();
  t.after(() => fs.rmSync(fixture.root, { recursive: true, force: true }));

  const sabotage = sabotageCase();
  sabotage.injectedDiff = sabotage.injectedDiff.replace('@@ -1 +1 @@', '@@ -1,9 +1,7 @@');
  const result = injectIntoScratch(fixture.root, sabotage, { cleanup: true });
  assert.equal(result.sourceUnchanged, true);
  assert.equal(fs.readFileSync(fixture.sourceFile, 'utf8'), 'export const next = value => value + 1;\n');
});
