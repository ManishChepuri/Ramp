'use strict';

const fs = require('fs');
const path = require('path');

function buildReplacementDiff(repoPath, relativePath, originalExcerpt, replacementExcerpt, options = {}) {
  return buildReplacementPatch(
    repoPath,
    relativePath,
    originalExcerpt,
    replacementExcerpt,
    options,
  ).diff;
}

function buildReplacementPatch(repoPath, relativePath, originalExcerpt, replacementExcerpt, options = {}) {
  if (typeof originalExcerpt !== 'string' || !originalExcerpt.length) {
    throw new Error('original excerpt must be a non-empty string copied from the target file');
  }
  if (typeof replacementExcerpt !== 'string' || originalExcerpt === replacementExcerpt) {
    throw new Error('replacement excerpt must be a different string');
  }

  const normalizedPath = String(relativePath).replace(/\\/g, '/').replace(/^\.\//, '');
  const absolutePath = path.resolve(repoPath, normalizedPath);
  const relative = path.relative(repoPath, absolutePath);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`replacement target escapes the repository: ${relativePath}`);
  }

  const source = fs.readFileSync(absolutePath, 'utf8');
  const matches = findMatches(source, originalExcerpt);
  const groundedMatches = matches.length > 0
    ? matches.map(index => ({ index, excerpt: originalExcerpt }))
    : findWhitespaceEquivalentMatches(source, originalExcerpt);
  if (groundedMatches.length === 0) {
    throw new Error(`original excerpt is not exact or whitespace-equivalent source text in ${normalizedPath}`);
  }
  const requestedOccurrence = options.occurrence;
  if (groundedMatches.length > 1 && (!Number.isInteger(requestedOccurrence) || requestedOccurrence < 1 ||
      requestedOccurrence > groundedMatches.length)) {
    throw new Error(
      `original excerpt occurs ${groundedMatches.length} times in ${normalizedPath}; targetOccurrence must be 1–${groundedMatches.length}`,
    );
  }
  const occurrence = Number.isInteger(requestedOccurrence) ? requestedOccurrence : 1;
  if (occurrence < 1 || occurrence > groundedMatches.length) {
    throw new Error(`targetOccurrence must be 1–${groundedMatches.length} in ${normalizedPath}`);
  }
  const match = groundedMatches[occurrence - 1];
  const groundedOriginal = match.excerpt;
  const firstMatch = match.index;

  const modified = source.slice(0, firstMatch) + replacementExcerpt +
    source.slice(firstMatch + groundedOriginal.length);
  return {
    diff: createUnifiedDiff(normalizedPath, source, modified),
    originalExcerpt: groundedOriginal,
  };
}

function findMatches(content, excerpt) {
  const matches = [];
  let fromIndex = 0;
  while (fromIndex <= content.length - excerpt.length) {
    const index = content.indexOf(excerpt, fromIndex);
    if (index < 0) break;
    matches.push(index);
    fromIndex = index + excerpt.length;
  }
  return matches;
}

function findWhitespaceEquivalentMatches(content, excerpt) {
  const normalizedContent = String(content).replace(/\r\n/g, '\n');
  const lines = normalizedContent.split('\n');
  const excerptLineCount = String(excerpt).replace(/\r\n/g, '\n').split('\n').length;
  const expected = normalizeWhitespace(excerpt);
  const matches = [];
  let offset = 0;

  for (let index = 0; index < lines.length; index += 1) {
    const candidateLines = lines.slice(index, index + excerptLineCount);
    if (candidateLines.length === excerptLineCount) {
      const candidate = candidateLines.join('\n');
      if (normalizeWhitespace(candidate) === expected) matches.push({ index: offset, excerpt: candidate });
    }
    offset += lines[index].length + 1;
  }
  return matches;
}

function normalizeWhitespace(value) {
  return String(value).replace(/\s+/g, ' ').trim();
}

function createUnifiedDiff(relativePath, before, after) {
  const beforeLines = splitLines(before);
  const afterLines = splitLines(after);
  let prefix = 0;
  while (prefix < beforeLines.length && prefix < afterLines.length &&
      beforeLines[prefix] === afterLines[prefix]) prefix += 1;

  let suffix = 0;
  while (suffix < beforeLines.length - prefix && suffix < afterLines.length - prefix &&
      beforeLines[beforeLines.length - 1 - suffix] === afterLines[afterLines.length - 1 - suffix]) {
    suffix += 1;
  }

  const oldLines = beforeLines.slice(prefix, beforeLines.length - suffix);
  const newLines = afterLines.slice(prefix, afterLines.length - suffix);
  if (oldLines.length === 0 && newLines.length === 0) throw new Error('replacement produced no line change');

  const oldStart = oldLines.length === 0 ? prefix : prefix + 1;
  const newStart = newLines.length === 0 ? prefix : prefix + 1;
  return [
    `--- a/${relativePath}`,
    `+++ b/${relativePath}`,
    `@@ -${oldStart},${oldLines.length} +${newStart},${newLines.length} @@`,
    ...oldLines.map(line => `-${line}`),
    ...newLines.map(line => `+${line}`),
    '',
  ].join('\n');
}

function splitLines(content) {
  const lines = String(content).replace(/\r\n/g, '\n').split('\n');
  if (lines.at(-1) === '') lines.pop();
  return lines;
}

module.exports = { buildReplacementDiff, buildReplacementPatch, createUnifiedDiff };
