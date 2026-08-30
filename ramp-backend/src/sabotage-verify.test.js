'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const os = require('os')
const path = require('path')

const { verifyFix, patchContent } = require('./sabotage-verify')

const PRISTINE = [
  "import * as jwt from 'jsonwebtoken';",
  '',
  'const generateToken = (id) =>',
  "  jwt.sign({ user: { id } }, process.env.JWT_SECRET, { expiresIn: '60d' });",
  '',
  'module.exports = generateToken;',
  '',
].join('\n')

const INJECTED_DIFF = [
  '--- a/token.js',
  '+++ b/token.js',
  '@@ -4 +4 @@',
  "-  jwt.sign({ user: { id } }, process.env.JWT_SECRET, { expiresIn: '60d' });",
  "+  jwt.sign({ user: { id } }, process.env.JWT_SECRET, { expiresIn: '60s' });",
].join('\n')

function tmpRepoWith(file, content) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ramp-verify-test-'))
  fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true })
  fs.writeFileSync(path.join(dir, file), content)
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 't' }))
  return dir
}

const sabCase = { file: 'token.js', injectedDiff: INJECTED_DIFF, language: 'javascript' }

test('patchContent applies the injected diff forward (pristine -> buggy)', () => {
  const buggy = patchContent(PRISTINE, INJECTED_DIFF)
  assert.match(buggy, /60s/)
  assert.doesNotMatch(buggy, /60d/)
})

test('canonical fix (restores the original) passes via the static check', () => {
  const repoRoot = tmpRepoWith('token.js', PRISTINE)
  const res = verifyFix({ repoRoot, sabotageCase: sabCase, userContent: PRISTINE })
  assert.equal(res.passed, true)
  assert.equal(res.method, 'static')
})

test('submitting the still-buggy file is rejected as unchanged', () => {
  const repoRoot = tmpRepoWith('token.js', PRISTINE)
  const buggy = patchContent(PRISTINE, INJECTED_DIFF)
  const res = verifyFix({ repoRoot, sabotageCase: sabCase, userContent: buggy })
  assert.equal(res.passed, false)
  assert.match(res.detail, /unchanged/i)
})

test('a wrong edit that does not restore behavior is rejected', () => {
  const repoRoot = tmpRepoWith('token.js', PRISTINE)
  const wrong = PRISTINE.replace("'60d'", "'30d'")
  const res = verifyFix({ repoRoot, sabotageCase: sabCase, userContent: wrong })
  assert.equal(res.passed, false)
  assert.equal(res.method, 'static')
})

test('whitespace-only differences from the original still count as fixed', () => {
  const repoRoot = tmpRepoWith('token.js', PRISTINE)
  const spaced = PRISTINE.replace('60d', '60d') + '\n\n'
  const res = verifyFix({ repoRoot, sabotageCase: sabCase, userContent: spaced })
  assert.equal(res.passed, true)
})

test('empty submission is an error, not a pass', () => {
  const repoRoot = tmpRepoWith('token.js', PRISTINE)
  const res = verifyFix({ repoRoot, sabotageCase: sabCase, userContent: '   ' })
  assert.equal(res.passed, false)
  assert.equal(res.method, 'error')
})

test('the source checkout is never modified during verification', () => {
  const repoRoot = tmpRepoWith('token.js', PRISTINE)
  verifyFix({ repoRoot, sabotageCase: sabCase, userContent: PRISTINE.replace("'60d'", "'90d'") })
  assert.equal(fs.readFileSync(path.join(repoRoot, 'token.js'), 'utf8'), PRISTINE)
})

test('quick mode skips the test-suite path and only accepts the exact restoration', () => {
  const repoRoot = tmpRepoWith('token.js', PRISTINE)
  const t0 = Date.now()
  const near = verifyFix({ repoRoot, sabotageCase: sabCase, userContent: PRISTINE.replace("'60d'", "'90d'"), quick: true })
  assert.equal(near.passed, false)
  assert.match(near.detail, /revealed solution/i)
  assert.ok(Date.now() - t0 < 3000, 'quick mode must return fast')

  const exact = verifyFix({ repoRoot, sabotageCase: sabCase, userContent: PRISTINE, quick: true })
  assert.equal(exact.passed, true)
})

test('a repo that depends on a database driver skips the (futile) test run', () => {
  const repoRoot = tmpRepoWith('token.js', PRISTINE)
  fs.writeFileSync(
    path.join(repoRoot, 'package.json'),
    JSON.stringify({ name: 't', scripts: { test: 'jest' }, dependencies: { '@prisma/client': '^5' } }),
  )
  const t0 = Date.now()
  const res = verifyFix({ repoRoot, sabotageCase: sabCase, userContent: PRISTINE.replace("'60d'", "'45d'") })
  assert.equal(res.passed, false)
  assert.equal(res.method, 'static')
  assert.match(res.detail, /external services/i)
  assert.ok(Date.now() - t0 < 3000, 'must not attempt the real suite')
})
