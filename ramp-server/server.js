'use strict'

// Entry point expected by `ramp open` (Dev 1's CLI auto-detects this path).
// All implementation lives in ramp-backend/. This file just boots it.
//
// ramp open passes:
//   RAMP_MANIFEST_PATH — absolute path to the generated manifest
//   PORT              — port to listen on (defaults to 3001)

const path = require('path')
const fs   = require('fs')

// Load credentials from ramp-backend/.env explicitly.
// We resolve dotenv through ramp-backend/node_modules so no separate install is needed.
const dotenvPath = path.join(__dirname, '..', 'ramp-backend', 'node_modules', 'dotenv')
const envFilePath = path.join(__dirname, '..', 'ramp-backend', '.env')
if (fs.existsSync(dotenvPath) && fs.existsSync(envFilePath)) {
  require(dotenvPath).config({ path: envFilePath })
}

// Forward RAMP_MANIFEST_PATH into the env var our server reads
if (process.env.RAMP_MANIFEST_PATH) {
  process.env.MANIFEST_PATH = process.env.RAMP_MANIFEST_PATH
}

// Load and start the backend server
require('../ramp-backend/src/server.js')
