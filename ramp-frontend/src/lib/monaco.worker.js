// First-party wrapper so the `?worker` suffix sits on a relative path
// (Rolldown/Vite 8 doesn't resolve `?worker` on a bare package specifier).
import 'monaco-editor/editor/editor.worker.js'
