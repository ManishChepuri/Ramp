// Bundle Monaco with the app instead of pulling it from a CDN, so the
// integrated IDE works when `ramp open` is used offline.
//
// We register only the base editor worker. Syntax highlighting (the Monarch
// tokenizers) runs on the main thread and needs no language worker; we trade
// away IntelliSense / type diagnostics to keep the bundle lean.
import { loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'
import EditorWorker from './monaco.worker.js?worker'

if (!window.__RAMP_MONACO_READY__) {
  window.MonacoEnvironment = {
    getWorker() {
      return new EditorWorker()
    },
  }
  loader.config({ monaco })
  window.monaco = monaco   // handy for debugging / e2e drivers
  window.__RAMP_MONACO_READY__ = true
}

export default monaco
