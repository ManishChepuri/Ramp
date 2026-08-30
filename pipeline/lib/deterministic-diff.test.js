'use strict';

const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const test = require('node:test');
const { buildReplacementDiff, buildReplacementPatch } = require('./deterministic-diff');
const { injectIntoScratch } = require('./scratch-injection');

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ramp-diff-test-'));
  fs.mkdirSync(path.join(root, 'src'));
  fs.writeFileSync(path.join(root, 'src/value.js'), [
    'function next(value) {',
    '  return value + 1;',
    '}',
    '',
  ].join('\n'));
  return root;
}

test('constructs an applicable unified diff from exact replacement excerpts', t => {
  const root = fixture();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const diff = buildReplacementDiff(root, 'src/value.js', 'return value + 1', 'return value - 1');
  const result = injectIntoScratch(root, { file: 'src/value.js', injectedDiff: diff });
  t.after(() => fs.rmSync(result.scratchRoot, { recursive: true, force: true }));
  assert.match(fs.readFileSync(result.scratchFile, 'utf8'), /return value - 1/);
  assert.match(fs.readFileSync(path.join(root, 'src/value.js'), 'utf8'), /return value \+ 1/);
});

test('grounds whitespace-only model formatting differences to actual source text', t => {
  const root = fixture();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const patch = buildReplacementPatch(
    root,
    'src/value.js',
    'function next(value) {\nreturn value + 1;\n}',
    'function next(value) {\n  return value - 1;\n}',
    { occurrence: 1 },
  );
  assert.equal(patch.originalExcerpt, 'function next(value) {\n  return value + 1;\n}');
  const result = injectIntoScratch(root, { file: 'src/value.js', injectedDiff: patch.diff });
  t.after(() => fs.rmSync(result.scratchRoot, { recursive: true, force: true }));
  assert.match(fs.readFileSync(result.scratchFile, 'utf8'), /return value - 1/);
});

test('rejects invented excerpts and requires an occurrence for ambiguous excerpts', t => {
  const root = fixture();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  assert.throws(
    () => buildReplacementDiff(root, 'src/value.js', 'not real', 'replacement'),
    /not exact or whitespace-equivalent source text/,
  );
  assert.throws(
    () => buildReplacementDiff(root, 'src/value.js', 'value', 'other'),
    /targetOccurrence must be 1–2/,
  );
  const diff = buildReplacementDiff(root, 'src/value.js', 'value', 'other', { occurrence: 2 });
  assert.match(diff, /return other \+ 1/);
});
