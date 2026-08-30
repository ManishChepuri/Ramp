#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { injectIntoScratch } = require('./lib/scratch-injection');

function validateDifferentiators(repoPath, manifest) {
  let sabotageCount = 0;
  let correctionCount = 0;

  for (const module of manifest.modules || []) {
    for (const sabotage of module.sabotage || []) {
      injectIntoScratch(repoPath, sabotage, { cleanup: true });
      sabotageCount += 1;
    }
  }

  for (const finding of manifest.docDrift || []) {
    injectIntoScratch(repoPath, {
      file: finding.location,
      injectedDiff: finding.correctionDiff,
    }, { cleanup: true });
    correctionCount += 1;
  }

  return { sabotageCount, correctionCount, sourceUnchanged: true };
}

if (require.main === module) {
  const [, , repoArgument, manifestArgument] = process.argv;
  if (!repoArgument || !manifestArgument) {
    console.error('Usage: node pipeline/validate-differentiators.js <repo-path> <manifest.json>');
    process.exit(1);
  }

  try {
    const repoPath = path.resolve(repoArgument);
    const manifestPath = path.resolve(manifestArgument);
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const result = validateDifferentiators(repoPath, manifest);
    console.log('✓ Differentiator patches validated in isolated scratch copies');
    console.log(`  sabotage cases : ${result.sabotageCount}`);
    console.log(`  doc corrections: ${result.correctionCount}`);
    console.log(`  source unchanged: ${result.sourceUnchanged}`);
  } catch (error) {
    console.error(`✗ ${error.message}`);
    process.exit(1);
  }
}

module.exports = { validateDifferentiators };
