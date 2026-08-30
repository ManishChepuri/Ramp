#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { injectIntoScratch } = require('./lib/scratch-injection');

const [, , repoArgument, caseArgument] = process.argv;

if (!repoArgument || !caseArgument) {
  console.error('Usage: node pipeline/isolate-sabotage.js <repo-path> <sabotage-case.json>');
  process.exit(1);
}

try {
  const repoPath = path.resolve(repoArgument);
  const casePath = path.resolve(caseArgument);
  const sabotage = JSON.parse(fs.readFileSync(casePath, 'utf8'));
  const result = injectIntoScratch(repoPath, sabotage);

  console.log('✓ Sabotage injected into an isolated scratch copy');
  console.log(`  source unchanged : ${result.sourceUnchanged}`);
  console.log(`  scratch root     : ${result.scratchRoot}`);
  console.log(`  scratch file     : ${result.scratchFile}`);
} catch (error) {
  console.error(`✗ ${error.message}`);
  process.exit(1);
}
