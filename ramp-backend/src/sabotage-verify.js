'use strict'

// ---------------------------------------------------------------------------
// Verifies a user's sabotage fix in an isolated scratch copy of the repo.
//
// Strategy ("try real tests, fall back"):
//   1. Static check — reconstruct the pristine file, apply the user's edit in a
//      temp copy, and see whether they removed the injected line and restored
//      the original. Canonical fixes resolve here instantly.
//   2. If the edit is a non-canonical variant, build a full scratch copy of the
//      repo (node_modules symlinked, .git excluded), run the repo's own test
//      suite against the buggy file (baseline) and then against the user's file.
//      A fix counts if the baseline fails and the user's version passes.
//   3. If the suite can't run cleanly (no script, missing deps, DB/network
//      errors, timeout), fall back to the static result plus a syntax check.
//
// The source checkout is hashed before and after and never written to.
// ---------------------------------------------------------------------------

const crypto = require('crypto')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { spawnSync } = require('child_process')

const TEST_TIMEOUT_MS = 25_000

function hash(str) {
  return crypto.createHash('sha256').update(str).digest('hex')
}

function normalize(src) {
  // Whitespace-insensitive comparison — trailing spaces / final newline / CRLF
  // shouldn't decide correctness.
  return src.replace(/\r\n/g, '\n').replace(/[ \t]+$/gm, '').replace(/\n+$/, '\n').trim()
}

/**
 * Apply a unified diff to `content` using `git apply` in a throwaway temp dir.
 * `reverse` applies it backwards (buggy -> original). Returns the patched text,
 * or null if the patch does not apply.
 */
function patchContent(content, diff, { reverse = false } = {}) {
  const targets = [...diff.matchAll(/^\+\+\+\s+(?:b\/)?([^\t\r\n]+)/gm)].map(m => m[1])
  const rel = (targets[0] || 'file.txt').replace(/^\.\//, '')
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ramp-patch-'))
  try {
    const file = path.join(dir, rel)
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, content)
    const args = ['apply', '--whitespace=nowarn', '--unidiff-zero', '--recount']
    if (reverse) args.push('-R')
    args.push('-')
    const res = spawnSync('git', args, { cwd: dir, input: `${diff.trimEnd()}\n`, encoding: 'utf8' })
    if (res.status !== 0) return null
    return fs.readFileSync(file, 'utf8')
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

function hunkLine(diff) {
  const m = diff.match(/^@@\s*-(\d+)/m)
  return m ? Number(m[1]) : null
}

// --- syntax check (best effort, only gates when the pristine file passes) -----

function syntaxCheck(language, filename, content, pristineContent) {
  let cmd
  if (['javascript'].includes(language)) cmd = ['node', ['--check']]
  else if (language === 'python') cmd = ['python3', ['-m', 'py_compile']]
  else return { checked: false, ok: true }

  const run = (src) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ramp-syntax-'))
    try {
      const file = path.join(dir, path.basename(filename))
      fs.writeFileSync(file, src)
      const res = spawnSync(cmd[0], [...cmd[1], file], { encoding: 'utf8', timeout: 10_000 })
      return res.status === 0
    } catch {
      return true // tool unavailable — don't gate on it
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  }

  // If the known-good file doesn't pass our checker (e.g. ESM in a .js file),
  // the checker isn't reliable for this file — skip the gate.
  if (!run(pristineContent)) return { checked: false, ok: true }
  return { checked: true, ok: run(content) }
}

// --- full-repo scratch test run ---------------------------------------------

function copyRepoScratch(repoRoot) {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'ramp-verify-'))
  fs.cpSync(repoRoot, scratch, {
    recursive: true,
    filter: (src) => {
      const base = path.basename(src)
      return base !== '.git' && base !== 'node_modules'
    },
  })
  const modules = path.join(repoRoot, 'node_modules')
  if (fs.existsSync(modules)) {
    try {
      fs.symlinkSync(modules, path.join(scratch, 'node_modules'), 'dir')
    } catch {
      /* fall through — tests may still run for zero-dep repos */
    }
  }
  return scratch
}

function detectTestCommand(scratch) {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(scratch, 'package.json'), 'utf8'))
    const test = pkg.scripts && pkg.scripts.test
    if (!test) return null
    if (/no test specified|exit 1/i.test(test)) return null
    return ['npm', ['test', '--silent']]
  } catch {
    return null
  }
}

const DB_LIBS = [
  '@prisma/client', 'prisma', 'typeorm', 'sequelize', 'sequelize-typescript',
  'mongoose', 'mongodb', 'pg', 'pg-promise', 'mysql', 'mysql2', 'mariadb',
  'better-sqlite3', 'sqlite3', 'ioredis', 'redis', 'knex',
]

// Cheap up-front check: will this repo's suite plausibly run in a throwaway dir
// with no network and no external services? If it depends on a database driver,
// an ORM, a container, or an nx/e2e harness, don't burn ~a minute discovering
// that the hard way — go straight to the static check. (The realworld example
// apps are Prisma + Postgres, so they land here.)
function suiteNeedsExternalServices(repoRoot) {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'))
    const deps = { ...pkg.dependencies, ...pkg.devDependencies }
    if (DB_LIBS.some(lib => lib in deps)) return true

    const scripts = Object.values(pkg.scripts || {}).join(' ')
    const test = (pkg.scripts && pkg.scripts.test) || ''
    if (/\bnx\b|docker|compose|\be2e\b|migrat|seed|prisma|typeorm|sequelize/i.test(test)) return true
    if (/docker-compose|prisma migrate|db:(push|migrate|seed)/i.test(scripts)) return true

    // schema.prisma anywhere shallow in the tree
    const stack = [repoRoot]
    let budget = 400
    while (stack.length && budget-- > 0) {
      const dir = stack.pop()
      let entries
      try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { continue }
      for (const e of entries) {
        if (e.name === 'node_modules' || e.name === '.git') continue
        const full = path.join(dir, e.name)
        if (e.isDirectory()) { stack.push(full); continue }
        if (e.name === 'schema.prisma') return true
        if (/^docker-compose.*\.ya?ml$/i.test(e.name)) {
          try {
            if (/\b(postgres|mysql|mariadb|mongo|redis|db):/i.test(fs.readFileSync(full, 'utf8'))) return true
          } catch { /* ignore */ }
        }
      }
    }
  } catch {
    /* if we can't tell, let tryTests attempt it (it has its own timeouts) */
  }
  return false
}

const INFRA_FAILURE = /ECONNREFUSED|ETIMEDOUT|ENOTFOUND|getaddrinfo|Cannot find module|command not found|Unknown command|connect to (the )?database|database .*not|prisma.*(connect|P1001)|no such file or directory.*node_modules/i

function runSuite(scratch, cmd) {
  const res = spawnSync(cmd[0], cmd[1], {
    cwd: scratch,
    encoding: 'utf8',
    timeout: TEST_TIMEOUT_MS,
    killSignal: 'SIGKILL',
    env: { ...process.env, CI: '1', FORCE_COLOR: '0', NODE_ENV: 'test' },
  })
  const output = `${res.stdout || ''}\n${res.stderr || ''}`
  return {
    passed: res.status === 0 && !res.error,
    timedOut: res.error && res.error.code === 'ETIMEDOUT',
    infra: INFRA_FAILURE.test(output),
    output: output.slice(-4000),
  }
}

// --- public API ------------------------------------------------------------

/**
 * @param {object}  args
 * @param {string}  args.repoRoot       absolute path to the checkout
 * @param {object}  args.sabotageCase   the manifest sabotage entry (file, injectedDiff, ...)
 * @param {string}  args.userContent    full text of the file as edited by the user
 * @returns {{ passed:boolean, method:'static'|'tests'|'unavailable'|'error',
 *            detail:string, syntaxOk?:boolean }}
 */
function verifyFix({ repoRoot, sabotageCase, userContent, quick = false }) {
  if (typeof userContent !== 'string' || !userContent.trim()) {
    return { passed: false, method: 'error', detail: 'No code was submitted.' }
  }
  const rel = String(sabotageCase.file || '').replace(/\\/g, '/').replace(/^\.\//, '')
  if (!rel || rel.includes('..') || path.isAbsolute(rel)) {
    return { passed: false, method: 'error', detail: 'Sabotage case has an invalid file path.' }
  }

  const sourceFile = path.resolve(repoRoot, rel)
  if (path.relative(repoRoot, sourceFile).startsWith('..')) {
    return { passed: false, method: 'error', detail: 'Sabotage target escapes the repository.' }
  }

  let pristine
  try {
    pristine = fs.readFileSync(sourceFile, 'utf8')
  } catch {
    return { passed: false, method: 'error', detail: `Cannot read ${rel} from the checkout.` }
  }
  const sourceHashBefore = hash(pristine)

  const buggy = patchContent(pristine, sabotageCase.injectedDiff, { reverse: false })
  if (buggy == null) {
    return { passed: false, method: 'error', detail: 'Could not reconstruct the buggy file from the manifest diff.' }
  }

  const user = normalize(userContent)
  const changedFromBuggy = user !== normalize(buggy)
  const matchesPristine = user === normalize(pristine)

  // Syntax gate (used by the static path).
  const syntax = syntaxCheck(
    sabotageCase.language || require('./repo').languageFor(rel),
    rel,
    userContent,
    pristine,
  )

  let result

  if (!changedFromBuggy) {
    result = { passed: false, method: 'static', detail: 'The file is unchanged — edit it to fix the bug, then submit.' }
  } else if (matchesPristine) {
    result = syntax.checked && !syntax.ok
      ? { passed: false, method: 'static', detail: 'That restores the original logic but introduces a syntax error.', syntaxOk: false }
      : { passed: true, method: 'static', detail: 'You restored the original implementation.' }
  } else if (syntax.checked && !syntax.ok) {
    result = { passed: false, method: 'static', detail: 'Your change does not match the original fix and has a syntax error.', syntaxOk: false }
  } else if (quick || suiteNeedsExternalServices(repoRoot)) {
    // Fast path: skip the (slow, and here futile) test-suite attempt. `quick` is
    // sent once the solution has already been revealed — only the exact
    // restoration counts at that point.
    result = {
      passed: false,
      method: 'static',
      detail: quick
        ? 'That does not match the revealed solution — restore the original line exactly.'
        : "That does not restore the original behavior (this repo's tests need external services, so only the original fix is accepted here).",
    }
  } else {
    // Non-canonical edit — see whether the repo's own tests accept it.
    const tested = tryTests({ repoRoot, rel, buggy, userContent })
    if (tested.verdict) {
      result = tested.verdict
    } else {
      const because = tested.skipped === 'infra' ? " (the repo's test suite couldn't run here to check for an alternative fix)"
        : tested.skipped === 'no-suite' ? ' (this repo has no automated test suite to check for an alternative fix)'
        : ''
      result = { passed: false, method: 'static', detail: `That does not restore the original behavior${because}.` }
    }
  }

  // Isolation guard — the checkout must be byte-for-byte unchanged.
  try {
    if (hash(fs.readFileSync(sourceFile, 'utf8')) !== sourceHashBefore) {
      return { passed: false, method: 'error', detail: 'Isolation failure: the source checkout changed during verification.' }
    }
  } catch {
    /* file still readable check above already covered the happy path */
  }

  return result
}

function tryTests({ repoRoot, rel, buggy, userContent }) {
  let scratch
  try {
    scratch = copyRepoScratch(repoRoot)
    const cmd = detectTestCommand(scratch)
    if (!cmd) return { skipped: 'no-suite' }

    const target = path.join(scratch, rel)

    // Run the user's version first: a wrong non-canonical edit fails fast in one
    // run instead of paying for a baseline run it can't benefit from.
    fs.writeFileSync(target, userContent)
    const withFix = runSuite(scratch, cmd)
    if (withFix.infra || withFix.timedOut) return { skipped: 'infra' }
    if (!withFix.passed) {
      return { verdict: { passed: false, method: 'tests', detail: 'The module test suite still fails with your change.' } }
    }

    // It passed — confirm the suite actually discriminates (isn't green no matter what).
    fs.writeFileSync(target, buggy)
    const baseline = runSuite(scratch, cmd)
    if (baseline.infra || baseline.timedOut) return { skipped: 'infra' }
    if (baseline.passed) return { skipped: 'baseline-green' }

    return { verdict: { passed: true, method: 'tests', detail: 'Your fix passes the module test suite.' } }
  } catch {
    return { skipped: 'infra' }
  } finally {
    if (scratch) fs.rmSync(scratch, { recursive: true, force: true })
  }
}

module.exports = { verifyFix, patchContent, hunkLine, normalize }
