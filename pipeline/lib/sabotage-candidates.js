'use strict';

const fs = require('fs');
const path = require('path');

const SOURCE_EXTENSIONS = new Set([
  '.c', '.cc', '.cpp', '.cs', '.go', '.java', '.js', '.jsx', '.kt', '.php', '.py',
  '.rb', '.rs', '.swift', '.ts', '.tsx', '.vue', '.svelte',
]);

function createSabotageCandidates(scan, requestedPaths, options = {}) {
  const limit = options.limit || 24;
  const candidates = [];

  for (const relativePath of requestedPaths || []) {
    if (candidates.length >= limit || !scan.fileSet.has(relativePath)) break;
    if (!SOURCE_EXTENSIONS.has(path.extname(relativePath).toLowerCase())) continue;
    const content = fs.readFileSync(path.join(scan.repoPath, relativePath), 'utf8');
    const lines = content.replace(/\r\n/g, '\n').split('\n');
    const occurrenceByLine = new Map();

    for (let index = 0; index < lines.length && candidates.length < limit; index += 1) {
      const original = lines[index];
      const trimmed = original.trim();
      if (!trimmed || /^(\/\/|\/\*|\*|#)/.test(trimmed)) continue;
      const occurrence = (occurrenceByLine.get(original) || 0) + 1;
      occurrenceByLine.set(original, occurrence);

      for (const mutation of mutateLine(original)) {
        candidates.push({
          candidateId: `candidate-${String(candidates.length + 1).padStart(3, '0')}`,
          file: relativePath,
          lineNumber: index + 1,
          original,
          replacement: mutation.replacement,
          mutationType: mutation.type,
          targetOccurrence: occurrence,
        });
        if (candidates.length >= limit) break;
      }
    }
  }
  return candidates;
}

function mutateLine(line) {
  const patterns = [
    { pattern: /\bawait\s+/, replacement: '', type: 'dropped-await' },
    { pattern: /!==/, replacement: '===', type: 'inverted-condition' },
    { pattern: /===/, replacement: '!==', type: 'inverted-condition' },
    { pattern: />=/, replacement: '>', type: 'boundary-condition' },
    { pattern: /<=/, replacement: '<', type: 'boundary-condition' },
    { pattern: />\s*0/, replacement: '>= 0', type: 'boundary-condition' },
    { pattern: /<\s*0/, replacement: '<= 0', type: 'boundary-condition' },
    { pattern: /\+\s*1\b/, replacement: '- 1', type: 'off-by-one' },
    { pattern: /-\s*1\b/, replacement: '+ 1', type: 'off-by-one' },
    { pattern: /:\s*true\b/, replacement: ': false', type: 'boolean-toggle' },
    { pattern: /:\s*false\b/, replacement: ': true', type: 'boolean-toggle' },
    { pattern: /\bdisconnect\s*:/, replacement: 'connect:', type: 'relation-operation' },
    { pattern: /\bconnect\s*:/, replacement: 'disconnect:', type: 'relation-operation' },
    { pattern: /\bfindUnique\b/, replacement: 'findFirst', type: 'query-selection' },
    { pattern: /\b404\b/, replacement: '400', type: 'status-code' },
    { pattern: /\b401\b/, replacement: '403', type: 'status-code' },
  ];

  for (const mutation of patterns) {
    if (!mutation.pattern.test(line)) continue;
    const replacement = line.replace(mutation.pattern, mutation.replacement);
    if (replacement !== line) return [{ replacement, type: mutation.type }];
  }
  return [];
}

module.exports = { createSabotageCandidates, mutateLine };
