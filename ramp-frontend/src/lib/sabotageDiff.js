// Parse a sabotage case's unified `injectedDiff` into the bits the UI needs:
// the line it touches, the line that was there originally, and the line that
// replaced it. Used to synthesize the attempt-3 hint and the attempt-5 reveal
// without another model call.

function parseInjectedDiff(diff = '') {
  const lines = String(diff).split('\n')
  const hunkIdx = lines.findIndex(l => l.startsWith('@@'))
  const m = hunkIdx >= 0 && lines[hunkIdx].match(/@@\s*-(\d+)(?:,(\d+))?\s+\+(\d+)/)
  const hunkStart = m ? Number(m[1]) : null

  // Walk the hunk body: count context lines before the first change to land on
  // the actual edited line, not just where the hunk opens.
  let startLine = hunkStart
  if (hunkStart != null) {
    let offset = 0
    for (let i = hunkIdx + 1; i < lines.length; i += 1) {
      const l = lines[i]
      if (l.startsWith('+') || l.startsWith('-')) break
      if (l.startsWith('@@')) break
      offset += 1
    }
    startLine = hunkStart + offset
  }

  const removed = lines
    .filter(l => l.startsWith('-') && !l.startsWith('---'))
    .map(l => l.slice(1))
  const added = lines
    .filter(l => l.startsWith('+') && !l.startsWith('+++'))
    .map(l => l.slice(1))

  return { startLine, removed, added }
}

const norm = s => String(s).replace(/\s+/g, ' ').trim()

/**
 * A hint that is deliberately different from the case's canned hints:
 * it names the file + approximate line and contrasts the two exact lines.
 */
export function deriveExtraHint(sabCase) {
  if (!sabCase) return null
  const { startLine, removed, added } = parseInjectedDiff(sabCase.injectedDiff)
  const file = (sabCase.file || '').split('/').pop() || sabCase.file
  const was = removed[0]?.trim()
  const now = added[0]?.trim()

  let hint
  if (was && now) {
    const near = startLine ? ` near line ${startLine}` : ''
    hint = `Compare the working version with the code you're debugging: in ${file}${near}, \`${was}\` was replaced by \`${now}\`. Change that one line back.`
  } else if (startLine) {
    hint = `The defect is a single-line change in ${file} around line ${startLine}. Diff it against what you'd expect the correct implementation to be.`
  } else {
    hint = `The defect is a single-line change in ${file}. Read it line by line against the module summary.`
  }

  // Never hand back something that just echoes an already-shown hint.
  const canned = (sabCase.hints || []).map(norm)
  if (canned.includes(norm(hint))) {
    hint = `Focus on ${file}${startLine ? `, line ${startLine}` : ''} — a single token on one line was changed from its correct value.`
  }
  return hint
}

/**
 * Everything the attempt-5 reveal shows: where the bug is and how to fix it.
 */
export function deriveSolution(sabCase) {
  if (!sabCase) return null
  const { startLine, removed, added } = parseInjectedDiff(sabCase.injectedDiff)
  return {
    file: sabCase.file,
    line: startLine,
    injectedLine: added[0]?.trim() || null,
    correctLine: (sabCase.correctOriginal || removed[0] || '').trim() || null,
    removed,
    added,
  }
}
