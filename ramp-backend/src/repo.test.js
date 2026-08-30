'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const os = require('os')
const path = require('path')

const repo = require('./repo')

function tmpRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ramp-repo-test-'))
  fs.mkdirSync(path.join(dir, 'src', 'auth'), { recursive: true })
  fs.writeFileSync(path.join(dir, 'src', 'auth', 'token.ts'), "export const ttl = '60d'\n")
  fs.writeFileSync(path.join(dir, 'package.json'), '{}')
  return dir
}

test('readRepoFile returns content and a monaco language id', () => {
  const dir = tmpRepo()
  repo._setRepoRootForTests(dir)

  const file = repo.readRepoFile('src/auth/token.ts')
  assert.equal(file.path, 'src/auth/token.ts')
  assert.match(file.content, /60d/)
  assert.equal(file.language, 'typescript')
  assert.equal(file.truncated, false)
})

test('safeResolve rejects path traversal and sandboxes absolute paths', () => {
  const dir = tmpRepo()
  repo._setRepoRootForTests(dir)

  assert.throws(() => repo.readRepoFile('../../../etc/passwd'), /escapes the repository/)
  assert.throws(() => repo.readRepoFile('src/auth/../../../../etc/hosts'), /escapes the repository/)
  // A leading slash is stripped, so this resolves to <root>/etc/passwd — which
  // simply does not exist. The point is it can never reach the real /etc/passwd.
  assert.throws(() => repo.readRepoFile('/etc/passwd'), err => err.code === 'NOT_FOUND')
})

test('readRepoFile 404s for a missing file and NO_REPO when unset', () => {
  const dir = tmpRepo()
  repo._setRepoRootForTests(dir)
  assert.throws(() => repo.readRepoFile('src/nope.ts'), err => err.code === 'NOT_FOUND')

  repo._setRepoRootForTests(null)
  assert.throws(() => repo.readRepoFile('src/auth/token.ts'), err => err.code === 'NO_REPO')
})

test('languageFor maps common extensions', () => {
  assert.equal(repo.languageFor('a/b.jsx'), 'javascript')
  assert.equal(repo.languageFor('x.d.ts'), 'typescript')
  assert.equal(repo.languageFor('schema.prisma'), 'prisma')
  assert.equal(repo.languageFor('notes.txt'), 'plaintext')
})
