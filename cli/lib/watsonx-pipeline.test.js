'use strict';

const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const test = require('node:test');
const { generate } = require('./generate');
const {
  normalizeDiagrams,
  normalizeDiscovery,
  normalizeDrift,
  normalizeGeneratedModule,
} = require('./watsonx-pipeline');

function createRepo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ramp-watsonx-pipeline-test-'));
  fs.mkdirSync(path.join(root, 'src'), { recursive: true });
  fs.writeFileSync(path.join(root, 'README.md'), '# Demo\n\nRun with node src/index.js.\n');
  fs.writeFileSync(path.join(root, 'src', 'index.js'), 'module.exports = value => value + 1;\n');
  execFileSync('git', ['init', '-q'], { cwd: root });
  execFileSync('git', ['add', '.'], { cwd: root });
  execFileSync('git', [
    '-c', 'user.name=Ramp Tests', '-c', 'user.email=ramp@example.invalid',
    'commit', '-qm', 'fixture',
  ], { cwd: root });
  return root;
}

function generatedResponses() {
  const route = {
    id: 'core',
    name: 'Core',
    summary: 'The core module exports the repository behavior used throughout the codebase. It defines the primary entry function and the configuration values that downstream modules depend on.',
    keyFiles: ['src/index.js'],
    dependencies: [],
    complexity: 'low',
    riskLevel: 'low',
    prerequisites: [],
  };
  return [
    {
      overview: {
        purpose: 'A small demonstration module.',
        techStack: ['Node.js'],
        entryPoints: ['src/index.js'],
        setupSteps: ['Run node src/index.js.'],
      },
      modules: [route],
    },
    {
      ...route,
      quiz: Array.from({ length: 3 }, (_, index) => ({
        question: `What does the function do? ${index}`,
        options: ['Adds one', 'Subtracts one', 'Returns zero', 'Throws'],
        correctIndex: 0,
        explanation: 'The export adds one to its input.',
      })),
      explainBack: {
        prompt: 'Explain the exported function.',
        rubric: Array.from({ length: 4 }, (_, index) => ({
          concept: `Concept ${index}`,
          weight: index === 0 ? 2 : 1,
          mustMention: ['export', 'value'],
        })),
      },
      sabotage: [],
      quests: [{
        id: 'q-core-001',
        title: 'Document the function',
        type: 'starter',
        difficulty: 'easy',
        xp: 10,
        files: ['src/index.js'],
        rationale: 'It is a safe first contribution.',
      }],
    },
    {
        candidateId: 'candidate-001',
        id: 'sab-core-001',
        difficulty: 'easy',
        symptom: 'The function moves values in the wrong direction.',
        hints: ['Inspect the arithmetic.', 'Compare expected direction.', 'Restore addition.'],
    },
    [
      { type: 'architecture', title: 'Architecture', mermaid: 'graph TD\nA-->B' },
      { type: 'sequence', title: 'Execution', mermaid: 'sequenceDiagram\nA->>B: call' },
    ],
    [{
      id: 'drift-001',
      docClaim: 'The documented command has no flag.',
      codeReality: 'The corrected example includes the help flag.',
      location: 'README.md',
      severity: 'low',
      suggestedCorrection: 'Add --help to the command.',
      correctionDiff: '',
      originalExcerpt: 'Run with node src/index.js.',
      replacementExcerpt: 'Run with node src/index.js --help.',
      targetOccurrence: 1,
    }],
  ];
}

class MockWatsonxClient {
  constructor(responses) {
    this.responses = responses;
    this.calls = 0;
  }

  async chatJson(_messages, options) {
    const response = structuredClone(this.responses[this.calls]);
    this.calls += 1;
    if (options.validate) options.validate(response);
    return response;
  }

  getUsageSummary() {
    return { inputTokens: 100, outputTokens: 50, requests: this.calls, estimatedCostUsd: 0.00002 };
  }
}

test('generates and atomically writes a validated manifest through the watsonx provider', async t => {
  const root = createRepo();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const sourceBefore = fs.readFileSync(path.join(root, 'src/index.js'), 'utf8');
  const client = new MockWatsonxClient(generatedResponses());

  const manifestPath = await generate(root, {
    provider: 'watsonx',
    client,
    logger: { log() {} },
    concurrency: 1,
  });

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert.equal(client.calls, 5);
  assert.equal(manifest.modules[0].id, 'core');
  assert.equal(manifest.docDrift.length, 1);
  assert.match(manifest.repo.commit, /^[0-9a-f]+$/);
  assert.equal(fs.readFileSync(path.join(root, 'src/index.js'), 'utf8'), sourceBefore);
  assert(!fs.existsSync(`${manifestPath}.bak`));
});

test('normalizes wrapped and aliased diagram output', () => {
  assert.deepEqual(normalizeDiagrams({ diagrams: [
    { type: 'Architecture Diagram', title: 'A', code: 'graph TD\nA-->B' },
    { title: 'S', mermaid: 'sequenceDiagram\nA->>B: call' },
    { type: 'architecture', title: 'duplicate', mermaid: 'graph TD\nB-->C' },
  ] }), [
    { type: 'architecture', title: 'A', code: 'graph TD\nA-->B', mermaid: 'graph TD\nA-->B' },
    { type: 'sequence', title: 'S', mermaid: 'sequenceDiagram\nA->>B: call' },
  ]);
});

test('builds module-grounded fallback diagrams for unusable model output', () => {
  const diagrams = normalizeDiagrams({ diagrams: [] }, [{
    id: 'core', name: 'Core', dependencies: [],
  }]);
  assert.equal(diagrams.length, 2);
  assert.match(diagrams[0].mermaid, /^graph TD/);
  assert.match(diagrams[0].mermaid, /Core/);
  assert.match(diagrams[1].mermaid, /^sequenceDiagram/);
});

test('normalizes wrapped drift findings and conservatively rejects unknown shapes', () => {
  const finding = { id: 'drift-001' };
  assert.deepEqual(normalizeDrift({ findings: [finding] }), [finding]);
  assert.deepEqual(normalizeDrift({ message: 'No drift found' }), []);
});

test('warns only when a drift response is an unrecognized shape, not when it is genuinely empty', () => {
  const lines = [];
  const logger = { log: message => lines.push(message) };

  assert.deepEqual(normalizeDrift([], logger), []);
  assert.deepEqual(normalizeDrift({ docDrift: [] }, logger), []);
  assert.equal(lines.length, 0, 'genuine empty results must not warn');

  assert.deepEqual(normalizeDrift({ message: 'No drift found' }, logger), []);
  assert.equal(lines.length, 1);
  assert.match(lines[0], /docDrift: model response did not match/);
});

test('grounds discovery paths and dependencies to the scanned inventory', () => {
  const scan = {
    files: [
      { path: 'src/auth.js', kind: 'source' },
      { path: 'src/article.js', kind: 'source' },
    ],
    fileSet: new Set(['src/auth.js', 'src/article.js']),
  };
  const discovery = normalizeDiscovery({
    overview: { entryPoints: ['src/missing.js'] },
    modules: [{
      id: 'article', name: 'Article', keyFiles: ['src/article.js', 'src/tag.model.ts'],
      dependencies: ['auth', 'missing'], prerequisites: [],
    }, { id: 'auth', name: 'Auth', keyFiles: [], dependencies: [], prerequisites: [] }],
  }, scan);
  assert.deepEqual(discovery.overview.entryPoints, ['src/auth.js', 'src/article.js']);
  assert.deepEqual(discovery.modules[0].keyFiles, ['src/article.js']);
  assert.deepEqual(discovery.modules[0].dependencies, ['auth']);
  assert.deepEqual(discovery.modules[1].keyFiles, ['src/auth.js']);
});

test('normalizes generated module limits and file references', () => {
  const route = {
    id: 'core', keyFiles: ['src/index.js'], dependencies: [], prerequisites: [],
  };
  const scan = {
    files: [{ path: 'src/index.js', kind: 'source' }],
    fileSet: new Set(['src/index.js']),
  };
  const module = normalizeGeneratedModule({
    id: 'wrong', keyFiles: ['invented.js'], dependencies: ['missing'], prerequisites: [],
    quiz: [{ options: ['a', 'b', 'c', 'd', 'e'] }],
    explainBack: { rubric: [{ mustMention: ['a', 'b', 'c', 'd', 'e'] }] },
    quests: [{ difficulty: 'easy', xp: 99, files: ['invented.js'] }],
    sabotage: [{ bad: true }],
  }, route, scan);
  assert.equal(module.id, 'core');
  assert.deepEqual(module.keyFiles, ['src/index.js']);
  assert.equal(module.quiz[0].options.length, 4);
  assert.deepEqual(module.explainBack.rubric[0].mustMention, ['a', 'b', 'c', 'd']);
  assert.deepEqual(module.quests[0], { difficulty: 'easy', xp: 10, files: ['src/index.js'] });
  assert.deepEqual(module.sabotage, []);
});
