'use strict';

const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const test = require('node:test');
const { createSabotageCandidates, mutateLine } = require('./sabotage-candidates');

test('derives bounded exact mutations from scanned source files', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ramp-candidates-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'src'));
  fs.writeFileSync(path.join(root, 'src/service.ts'), [
    'const user = await findUser();',
    'if (user === undefined) return false;',
    'return { active: true };',
    '',
  ].join('\n'));
  const scan = { repoPath: root, fileSet: new Set(['src/service.ts']) };
  const candidates = createSabotageCandidates(scan, ['src/service.ts']);
  assert(candidates.length >= 3);
  assert.equal(candidates[0].original, 'const user = await findUser();');
  assert.equal(candidates[0].replacement, 'const user = findUser();');
  assert(candidates.every(candidate => candidate.file === 'src/service.ts'));
});

test('does not mutate ordinary lines without an approved safe pattern', () => {
  assert.deepEqual(mutateLine('const name = input.name;'), []);
});
