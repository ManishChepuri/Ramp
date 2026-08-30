'use strict';
/**
 * open.js — start the Ramp local server and open the browser (K2, FR-6.3)
 */

const path        = require('path');
const fs          = require('fs');
const http        = require('http');
const { spawn }   = require('child_process');

const PORT = parseInt(process.env.RAMP_SERVER_PORT || '3001', 10);

async function open(repoPath) {
  const url = `http://localhost:${PORT}`;

  console.log(`\n→ Starting Ramp server on ${url} ...`);

  // Check if there is a real backend server (Dev 3's server.js) to start.
  // If not, serve the manifest as a minimal health check so the CLI works
  // before Dev 3's backend is wired in.
  const serverRoot = path.join(__dirname, '..', '..', 'ramp-server');
  const serverEntry = path.join(serverRoot, 'server.js');

  if (fs.existsSync(serverEntry)) {
    await startExternalServer(serverEntry, repoPath, url);
  } else {
    await startFallbackServer(repoPath, url);
  }
}

// ─── start Dev 3's real backend server ───────────────────────────────────────

function startExternalServer(serverEntry, repoPath, url) {
  return new Promise((resolve, reject) => {
    const env = {
      ...process.env,
      RAMP_MANIFEST_PATH: repoPath ? path.join(repoPath, 'ramp-manifest.json') : undefined,
      PORT: String(PORT),
    };

    const proc = spawn(process.execPath, [serverEntry], {
      cwd: path.dirname(serverEntry),
      env,
      stdio: 'inherit',
      detached: false,
    });

    proc.on('error', reject);

    // Give the server a moment to bind, then open the browser
    setTimeout(() => {
      launchBrowser(url);
      console.log(`\n  Press Ctrl+C to stop the server.\n`);
      resolve(); // resolve so CLI doesn't hang — server keeps running
    }, 1200);
  });
}

// ─── fallback: minimal manifest-serving HTTP server ──────────────────────────
// Used before Dev 3's backend is available. Serves ramp-manifest.json on
// GET /manifest so the frontend can still load in development.

function startFallbackServer(repoPath, url) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.writeHead(204); res.end(); return;
      }

      if (req.method === 'GET' && req.url === '/api/manifest') {
        const manifestPath = repoPath
          ? path.join(repoPath, 'ramp-manifest.json')
          : path.join(__dirname, '..', '..', 'fixtures', 'sample-manifest.json');

        if (fs.existsSync(manifestPath)) {
          const data = fs.readFileSync(manifestPath, 'utf8');
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(data);
        } else {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'manifest not found', hint: 'Run ramp generate <repo> first' }));
        }
        return;
      }

      if (req.method === 'GET' && req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', mode: 'fallback' }));
        return;
      }

      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'not found — full backend not yet wired' }));
    });

    server.listen(PORT, () => {
      console.log(`  ✓ Fallback server running (GET /manifest only)`);
      console.log(`  Note: full backend (Dev 3) not detected — only /manifest is served.`);
      launchBrowser(url);
      console.log(`\n  Press Ctrl+C to stop.\n`);
      resolve();
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`  ✓ Port ${PORT} already in use — assuming server is running`);
        launchBrowser(url);
        resolve();
      } else {
        console.error(`  ✗ Server error: ${err.message}`);
        resolve(); // don't crash — still try to open the browser
      }
    });
  });
}

// ─── open browser ────────────────────────────────────────────────────────────

function launchBrowser(url) {
  // Use the 'open' package if available, otherwise fall back to platform commands
  try {
    const openPkg = require('open');
    openPkg(url).catch(() => platformOpen(url));
  } catch (_) {
    platformOpen(url);
  }
  console.log(`  ✓ Opening ${url}`);
}

function platformOpen(url) {
  const { spawn } = require('child_process');
  const cmd = process.platform === 'darwin' ? 'open'
            : process.platform === 'win32'  ? 'start'
            : 'xdg-open';
  spawn(cmd, [url], { detached: true, stdio: 'ignore' }).unref();
}

module.exports = { open };
