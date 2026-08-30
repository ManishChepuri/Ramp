'use strict';
/**
 * generate.js — invoke the Bob Shell pipeline and write ramp-manifest.json
 * Streams progress to the terminal (K4, FR-6.5).
 * Never overwrites an existing valid manifest on failure (FR-6.9).
 */

const path      = require('path');
const fs        = require('fs');
const { spawn } = require('child_process');

const PIPELINE_STEPS = [
  { label: 'Repository reconnaissance  (overview)',    prompt: '01-overview.md'  },
  { label: 'Subagent: data layer',                     prompt: '02-subagents.md', domain: 'data'    },
  { label: 'Subagent: authentication',                 prompt: '02-subagents.md', domain: 'auth'    },
  { label: 'Subagent: article domain',                 prompt: '02-subagents.md', domain: 'article' },
  { label: 'Subagent: profile domain',                 prompt: '02-subagents.md', domain: 'profile' },
  { label: 'Subagent: tag domain',                     prompt: '02-subagents.md', domain: 'tag'     },
  { label: 'Diagram generation',                       prompt: '03-diagrams.md'  },
  { label: 'Doc drift detection',                      prompt: '04-drift.md'     },
  { label: 'Assembling manifest',                      prompt: null              },
];

async function generate(repoPath) {
  const repoName     = path.basename(repoPath);
  const manifestPath = path.join(repoPath, 'ramp-manifest.json');
  const backupPath   = manifestPath + '.bak';

  console.log(`\n╔═══════════════════════════════════════════╗`);
  console.log(`║  Ramp — generating curriculum             ║`);
  console.log(`║  Repo: ${repoName.padEnd(34)}║`);
  console.log(`╚═══════════════════════════════════════════╝\n`);

  // Back up existing manifest so failure can't destroy it (FR-6.9)
  if (fs.existsSync(manifestPath)) {
    fs.copyFileSync(manifestPath, backupPath);
    console.log('  ✓ Existing manifest backed up\n');
  }

  try {
    // Stream each pipeline step with a progress indicator
    for (let i = 0; i < PIPELINE_STEPS.length; i++) {
      const step = PIPELINE_STEPS[i];
      const stepNum = `[${i + 1}/${PIPELINE_STEPS.length}]`;
      process.stdout.write(`  ${stepNum} ${step.label}...`);

      if (step.prompt === null) {
        // Final assembly step — run the assemble script
        await runAssembly(repoPath);
      } else {
        await runBobStep(repoPath, step);
      }

      process.stdout.write(' ✓\n');
    }

    // Clean up backup on success
    if (fs.existsSync(backupPath)) {
      fs.unlinkSync(backupPath);
    }

    console.log(`\n✓ Manifest written: ${manifestPath}`);

    // Print summary from the generated manifest
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      console.log(`  modules  : ${manifest.modules?.length} (${manifest.modules?.map(m=>m.id).join(', ')})`);
      console.log(`  diagrams : ${manifest.diagrams?.length}`);
      console.log(`  docDrift : ${manifest.docDrift?.length} findings`);
      console.log(`  commit   : ${manifest.repo?.commit}`);
    } catch (_) {}

    console.log('');

  } catch (err) {
    process.stdout.write(' ✗\n');

    // Restore backup if generation failed (FR-6.9)
    if (fs.existsSync(backupPath)) {
      fs.copyFileSync(backupPath, manifestPath);
      fs.unlinkSync(backupPath);
      console.error('\n✗ Generation failed — previous manifest restored.');
    } else {
      console.error('\n✗ Generation failed — no manifest written.');
    }

    console.error(`  Error: ${err.message}\n`);
    process.exit(1);
  }
}

// ─── run a single Bob Shell pipeline step ────────────────────────────────────

function runBobStep(repoPath, step) {
  return new Promise((resolve, reject) => {
    const bobCmd    = process.env.BOB_PATH || 'bob';
    const promptDir = path.join(__dirname, '..', '..', 'node-express-realworld-example-app', 'pipeline', 'prompts');
    const promptFile = path.join(promptDir, step.prompt);

    // Build the bob shell invocation:
    // bob run --workspace <repoPath> --prompt <promptFile> [--domain <domain>]
    const bobArgs = [
      'run',
      '--workspace', repoPath,
      '--prompt', promptFile,
      '--non-interactive',
    ];
    if (step.domain) {
      bobArgs.push('--domain', step.domain);
    }

    const proc = spawn(bobCmd, bobArgs, {
      cwd: repoPath,
      env: { ...process.env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', d => { stdout += d.toString(); });
    proc.stderr.on('data', d => { stderr += d.toString(); });

    proc.on('close', code => {
      if (code !== 0) {
        reject(new Error(`Bob Shell exited ${code} for step "${step.label}".\nStderr: ${stderr.slice(0,300)}`));
      } else {
        // Write output to pipeline/output directory for assembly
        const outputDir = path.join(repoPath, 'pipeline', 'output');
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
        const outFile = path.join(outputDir, stepOutputFilename(step));
        try {
          JSON.parse(stdout.trim()); // validate it's JSON before writing
          fs.writeFileSync(outFile, stdout.trim(), 'utf8');
        } catch (_) {
          reject(new Error(`Bob Shell output for "${step.label}" is not valid JSON.\nOutput: ${stdout.slice(0,300)}`));
          return;
        }
        resolve();
      }
    });
  });
}

function stepOutputFilename(step) {
  if (step.prompt === '01-overview.md')  return '01-overview.json';
  if (step.domain === 'data')            return '02-module-data.json';
  if (step.domain === 'auth')            return '02-module-auth.json';
  if (step.domain === 'article')         return '02-module-article.json';
  if (step.domain === 'profile')         return '02-module-profile.json';
  if (step.domain === 'tag')             return '02-module-tag.json';
  if (step.prompt === '03-diagrams.md')  return '03-diagrams.json';
  if (step.prompt === '04-drift.md')     return '04-drift.json';
  return 'unknown.json';
}

// ─── run the assembly script ──────────────────────────────────────────────────

function runAssembly(repoPath) {
  return new Promise((resolve, reject) => {
    const assembleScript = path.join(repoPath, 'pipeline', 'assemble.js');
    if (!fs.existsSync(assembleScript)) {
      reject(new Error(`Assembly script not found: ${assembleScript}`));
      return;
    }

    const proc = spawn(process.execPath, [assembleScript], {
      cwd: repoPath,
      env: { ...process.env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stderr = '';
    proc.stderr.on('data', d => { stderr += d.toString(); });
    proc.on('close', code => {
      if (code !== 0) reject(new Error(`Assembly failed.\n${stderr.slice(0,300)}`));
      else resolve();
    });
  });
}

module.exports = { generate };
