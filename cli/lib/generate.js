'use strict';
/**
 * Generate a Ramp manifest with Bob Shell 2.x.
 *
 * Bob emits NDJSON progress events and a final result envelope. The manifest is
 * validated before an atomic rename, so a failed run never damages a previous
 * manifest (FR-6.9).
 */

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { spawn, execFileSync } = require('child_process');

const RAMP_ROOT = path.resolve(__dirname, '..', '..');
const PROMPT_FILES = [
  path.join(RAMP_ROOT, 'pipeline', 'prompts', 'manifest.md'),
  path.join(RAMP_ROOT, 'pipeline', 'prompts', '08-correction.md'),
  path.join(RAMP_ROOT, 'pipeline', 'prompts', '09-sabotage.md'),
];

async function generate(repoPath) {
  const resolvedRepo = path.resolve(repoPath);
  const repoName = path.basename(resolvedRepo);
  const manifestPath = path.join(resolvedRepo, 'ramp-manifest.json');
  const backupPath = `${manifestPath}.bak`;
  const tempPath = `${manifestPath}.tmp-${process.pid}`;

  assertRepository(resolvedRepo);
  const repositoryStateBefore = repositoryFingerprint(resolvedRepo);

  console.log('\n╔═══════════════════════════════════════════╗');
  console.log('║  Ramp — generating curriculum             ║');
  console.log(`║  Repo: ${repoName.slice(0, 34).padEnd(34)}║`);
  console.log('╚═══════════════════════════════════════════╝\n');

  if (fs.existsSync(manifestPath)) {
    fs.copyFileSync(manifestPath, backupPath);
    console.log('  ✓ Existing manifest backed up');
  }

  try {
    const prompt = loadGenerationPrompt();
    const manifest = await runBob(resolvedRepo, prompt);

    if (repositoryFingerprint(resolvedRepo) !== repositoryStateBefore) {
      throw new Error('Bob modified the target repository during read-only generation');
    }

    stampRepositoryMetadata(manifest, resolvedRepo);
    validateManifest(manifest, resolvedRepo);

    fs.writeFileSync(tempPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    JSON.parse(fs.readFileSync(tempPath, 'utf8'));
    fs.renameSync(tempPath, manifestPath);

    if (fs.existsSync(backupPath)) fs.unlinkSync(backupPath);

    console.log(`\n✓ Manifest written: ${manifestPath}`);
    console.log(`  modules  : ${manifest.modules.length} (${manifest.modules.map(module => module.id).join(', ')})`);
    console.log(`  diagrams : ${manifest.diagrams.length}`);
    console.log(`  docDrift : ${manifest.docDrift.length} findings`);
    console.log(`  quizzes  : ${manifest.modules.reduce((total, module) => total + module.quiz.length, 0)} questions`);
    console.log(`  quests   : ${manifest.modules.reduce((total, module) => total + module.quests.length, 0)} quests`);
    console.log(`  commit   : ${manifest.repo.commit}\n`);

    return manifestPath;
  } catch (error) {
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);

    if (fs.existsSync(backupPath)) {
      fs.copyFileSync(backupPath, manifestPath);
      fs.unlinkSync(backupPath);
      console.error('\n✗ Generation failed — previous manifest restored.');
    } else {
      console.error('\n✗ Generation failed — no manifest written.');
    }

    throw error;
  }
}

function loadGenerationPrompt() {
  return PROMPT_FILES.map(promptPath => {
    if (!fs.existsSync(promptPath)) {
      throw new Error(`Generation prompt not found: ${promptPath}`);
    }
    return fs.readFileSync(promptPath, 'utf8');
  }).join('\n\n---\n\n');
}

function runBob(repoPath, prompt) {
  return new Promise((resolve, reject) => {
    const bobCommand = process.env.BOB_PATH || 'bob';
    const args = [
      'run',
      '--format', 'stream-json',
      '--workspace', repoPath,
      '--mode', 'agent',
      '--disable-mcp',
      '--trust',
    ];

    if (process.env.BOB_MAX_COST) args.push('--max-cost', process.env.BOB_MAX_COST);
    if (process.env.BOB_MAX_TURNS) args.push('--max-turns', process.env.BOB_MAX_TURNS);
    if (process.env.BOB_TEAM_ID) args.push('--team-id', process.env.BOB_TEAM_ID);

    const child = spawn(bobCommand, args, {
      cwd: repoPath,
      env: { ...process.env },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdoutBuffer = '';
    let stderr = '';
    let finalResult;
    const seenTools = new Set();

    child.stdout.on('data', chunk => {
      stdoutBuffer += chunk.toString();
      const lines = stdoutBuffer.split(/\r?\n/);
      stdoutBuffer = lines.pop() || '';

      for (const line of lines) {
        const event = parseEvent(line);
        if (!event) continue;

        if (event.type === 'tool_use' && event.tool_name && !seenTools.has(event.tool_name)) {
          seenTools.add(event.tool_name);
          console.log(`  → Bob: ${event.tool_name}`);
        }
        if (event.type === 'error') {
          console.error(`  ! Bob: ${event.message || 'generation error'}`);
        }
        if (event.type === 'result') finalResult = event;
      }
    });

    child.stderr.on('data', chunk => {
      stderr += chunk.toString();
    });

    child.on('error', error => reject(new Error(`Could not start Bob Shell: ${error.message}`)));

    child.on('close', code => {
      if (stdoutBuffer.trim()) {
        const event = parseEvent(stdoutBuffer);
        if (event?.type === 'result') finalResult = event;
      }

      if (code !== 0) {
        reject(new Error(`Bob Shell exited ${code}. ${stderr.trim() || 'No error details were returned.'}`));
        return;
      }
      if (!finalResult || finalResult.status !== 'success') {
        reject(new Error(finalResult?.last_message || 'Bob Shell did not return a successful result event.'));
        return;
      }

      try {
        resolve(JSON.parse(finalResult.last_message));
      } catch (error) {
        reject(new Error(`Bob's final response is not raw manifest JSON: ${error.message}`));
      }
    });

    child.stdin.end(prompt);
  });
}

function parseEvent(line) {
  if (!line.trim()) return null;
  try {
    return JSON.parse(line);
  } catch (_) {
    return null;
  }
}

function assertRepository(repoPath) {
  if (!fs.existsSync(repoPath) || !fs.statSync(repoPath).isDirectory()) {
    throw new Error(`Repository path is not a directory: ${repoPath}`);
  }

  try {
    execFileSync('git', ['rev-parse', '--is-inside-work-tree'], {
      cwd: repoPath,
      stdio: 'pipe',
    });
  } catch (_) {
    throw new Error(`Repository path is not a Git worktree: ${repoPath}`);
  }
}

function repositoryFingerprint(repoPath) {
  const output = execFileSync(
    'git',
    ['ls-files', '-z', '--cached', '--others', '--exclude-standard'],
    { cwd: repoPath },
  );
  const files = output.toString('utf8').split('\0').filter(Boolean).sort();
  const digest = crypto.createHash('sha256');

  for (const relativeFile of files) {
    if (/^ramp-manifest\.json(?:\.bak|\.tmp-\d+)?$/.test(relativeFile)) continue;
    const absoluteFile = path.join(repoPath, relativeFile);
    const stat = fs.lstatSync(absoluteFile);
    digest.update(relativeFile);
    digest.update('\0');
    digest.update(stat.isSymbolicLink() ? fs.readlinkSync(absoluteFile) : fs.readFileSync(absoluteFile));
    digest.update('\0');
  }

  return digest.digest('hex');
}

function stampRepositoryMetadata(manifest, repoPath) {
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) return;

  const commit = execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
    cwd: repoPath,
    encoding: 'utf8',
  }).trim();

  manifest.version = '1.0';
  manifest.repo = {
    name: path.basename(repoPath),
    commit,
    generatedAt: new Date().toISOString(),
  };
}

function validateManifest(manifest, repoPath) {
  assert(manifest && typeof manifest === 'object' && !Array.isArray(manifest), 'manifest must be an object');
  for (const field of ['version', 'repo', 'overview', 'modules', 'diagrams', 'docDrift']) {
    assert(field in manifest, `missing top-level field "${field}"`);
  }

  assert(manifest.version === '1.0', 'version must be "1.0"');
  assert(Array.isArray(manifest.modules) && manifest.modules.length >= 1, 'modules must be a non-empty array');
  assert(Array.isArray(manifest.diagrams) && manifest.diagrams.length >= 1, 'diagrams must be a non-empty array');
  assert(Array.isArray(manifest.docDrift), 'docDrift must be an array');

  for (const field of ['purpose', 'techStack', 'entryPoints', 'setupSteps']) {
    assert(field in manifest.overview, `overview is missing "${field}"`);
  }

  const moduleIds = new Set();
  for (const [index, module] of manifest.modules.entries()) {
    const label = `modules[${index}]`;
    for (const field of ['id', 'name', 'summary', 'keyFiles', 'dependencies', 'complexity',
      'riskLevel', 'prerequisites', 'quiz', 'explainBack', 'sabotage', 'quests']) {
      assert(field in module, `${label} is missing "${field}"`);
    }
    assert(!moduleIds.has(module.id), `${label} duplicates module id "${module.id}"`);
    moduleIds.add(module.id);
    assert(['low', 'medium', 'high'].includes(module.complexity), `${label} has invalid complexity`);
    assert(['low', 'medium', 'high'].includes(module.riskLevel), `${label} has invalid riskLevel`);
    module.keyFiles.forEach(file => assertRepoFile(repoPath, file, `${label}.keyFiles`));

    assert(Array.isArray(module.quiz) && module.quiz.length >= 3, `${label}.quiz must contain at least 3 questions`);
    module.quiz.forEach((question, questionIndex) => {
      assert(Array.isArray(question.options) && question.options.length === 4,
        `${label}.quiz[${questionIndex}] must have exactly 4 options`);
      assert([0, 1, 2, 3].includes(question.correctIndex),
        `${label}.quiz[${questionIndex}] has an invalid correctIndex`);
    });

    assert(Array.isArray(module.explainBack?.rubric) && module.explainBack.rubric.length >= 4 &&
      module.explainBack.rubric.length <= 6, `${label}.explainBack.rubric must contain 4–6 items`);

    assert(Array.isArray(module.sabotage) && module.sabotage.length >= 1,
      `${label}.sabotage must contain at least one case`);
    module.sabotage.forEach((sabotage, sabotageIndex) => {
      assertRepoFile(repoPath, sabotage.file, `${label}.sabotage[${sabotageIndex}].file`);
      assert(Array.isArray(sabotage.hints) && sabotage.hints.length === 3,
        `${label}.sabotage[${sabotageIndex}].hints must contain exactly 3 hints`);
    });

    assert(Array.isArray(module.quests) && module.quests.length >= 1,
      `${label}.quests must contain at least one quest`);
    module.quests.forEach((quest, questIndex) => {
      assert([10, 25, 50].includes(quest.xp), `${label}.quests[${questIndex}] has invalid XP`);
      assert(['starter', 'doc-fix'].includes(quest.type), `${label}.quests[${questIndex}] has invalid type`);
      quest.files.forEach(file => assertRepoFile(repoPath, file, `${label}.quests[${questIndex}].files`));
    });
  }

  manifest.docDrift.forEach((finding, index) => {
    for (const field of ['id', 'docClaim', 'codeReality', 'location', 'severity',
      'suggestedCorrection', 'correctionDiff']) {
      assert(field in finding, `docDrift[${index}] is missing "${field}"`);
    }
    assertRepoFile(repoPath, finding.location, `docDrift[${index}].location`);
    assert(['high', 'medium', 'low'].includes(finding.severity), `docDrift[${index}] has invalid severity`);
  });

  return true;
}

function assertRepoFile(repoPath, relativePath, label) {
  assert(typeof relativePath === 'string' && relativePath.length > 0, `${label} contains an empty path`);
  const absolutePath = path.resolve(repoPath, relativePath);
  const relative = path.relative(repoPath, absolutePath);
  assert(relative && !relative.startsWith('..') && !path.isAbsolute(relative),
    `${label} escapes the repository: ${relativePath}`);
  assert(fs.existsSync(absolutePath) && fs.statSync(absolutePath).isFile(),
    `${label} references a missing file: ${relativePath}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(`Manifest validation failed: ${message}`);
}

module.exports = {
  generate,
  loadGenerationPrompt,
  parseEvent,
  repositoryFingerprint,
  stampRepositoryMetadata,
  validateManifest,
};
