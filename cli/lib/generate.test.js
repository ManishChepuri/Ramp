'use strict';

const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const test = require('node:test');
const {
  loadGenerationPrompt,
  parseEvent,
  repositoryFingerprint,
  stampRepositoryMetadata,
  validateManifest,
} = require('./generate');

function createRepo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ramp-generator-test-'));
  fs.mkdirSync(path.join(root, 'src'));
  fs.writeFileSync(path.join(root, 'README.md'), '# Test\n', 'utf8');
  fs.writeFileSync(path.join(root, 'src/index.js'), 'module.exports = true;\n', 'utf8');
  execFileSync('git', ['init', '-q'], { cwd: root });
  execFileSync('git', ['add', '.'], { cwd: root });
  execFileSync('git', ['-c', 'user.name=Ramp Tests', '-c', 'user.email=ramp@example.invalid',
    'commit', '-qm', 'fixture'], { cwd: root });
  return root;
}

function validManifest() {
  const quiz = Array.from({ length: 3 }, (_, index) => ({
    question: `Question ${index}`,
    options: ['a', 'b', 'c', 'd'],
    correctIndex: 0,
    explanation: 'Because.',
  }));
  const rubric = Array.from({ length: 4 }, (_, index) => ({
    concept: `Concept ${index}`,
    weight: 1,
    mustMention: ['one', 'two'],
  }));

  return {
    version: '1.0',
    repo: { name: 'test', commit: 'pending', generatedAt: 'pending' },
    overview: {
      purpose: 'A test repository.',
      techStack: ['Node.js'],
      entryPoints: ['src/index.js'],
      setupSteps: ['Run node.'],
    },
    modules: [{
      id: 'core',
      name: 'Core',
      summary: 'Core exports the repository behavior used by the rest of the module graph. It reads configuration on startup and exposes a single entry function that downstream modules call.',
      keyFiles: ['src/index.js'],
      dependencies: [],
      complexity: 'low',
      riskLevel: 'low',
      prerequisites: [],
      quiz,
      explainBack: { prompt: 'Explain core.', rubric },
      sabotage: [{
        id: 'sab-core-001',
        difficulty: 'easy',
        file: 'src/index.js',
        symptom: 'The export is false.',
        injectedDiff: 'unused in schema validation',
        correctOriginal: 'module.exports = true;',
        hints: ['one', 'two', 'three'],
      }],
      quests: [{
        id: 'q-core-001',
        title: 'Read core',
        type: 'starter',
        difficulty: 'easy',
        xp: 10,
        files: ['src/index.js'],
        rationale: 'Small file.',
      }],
    }],
    diagrams: [{ type: 'architecture', title: 'Core', mermaid: 'graph TD\nA-->B' }],
    docDrift: [],
  };
}

test('loads the base, correction, and sabotage prompt contracts', () => {
  const prompt = loadGenerationPrompt();
  assert.match(prompt, /Ramp Manifest Generation/);
  assert.match(prompt, /Documentation Correction Generation/);
  assert.match(prompt, /Sabotage Case Generation/);
});

test('parses Bob stream events and ignores non-JSON log lines', () => {
  assert.deepEqual(parseEvent('{"type":"result","status":"success"}'), {
    type: 'result',
    status: 'success',
  });
  assert.equal(parseEvent('Bob starting...'), null);
});

test('stamps and validates a generated manifest against real paths', t => {
  const root = createRepo();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const manifest = validManifest();

  stampRepositoryMetadata(manifest, root);
  assert.equal(validateManifest(manifest, root), true);
  assert.equal(manifest.repo.name, path.basename(root));
  assert.match(manifest.repo.commit, /^[0-9a-f]+$/);
});

test('repository fingerprint detects target mutations', t => {
  const root = createRepo();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const before = repositoryFingerprint(root);
  fs.writeFileSync(path.join(root, 'src/index.js'), 'module.exports = false;\n', 'utf8');
  assert.notEqual(repositoryFingerprint(root), before);
});
