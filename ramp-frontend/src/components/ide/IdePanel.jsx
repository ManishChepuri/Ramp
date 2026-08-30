import { Suspense, lazy, useMemo } from 'react'
import { useRepoFile } from '../../hooks/useRepoFile'

// Monaco is heavy — only pull it in when an IDE panel actually renders.
const MonacoEditor = lazy(async () => {
  await import('../../lib/monacoSetup')
  const mod = await import('@monaco-editor/react')
  return { default: mod.default }
})

function basename(p) {
  return (p || '').split('/').pop() || p
}

function TabButton({ path, active, editable, dirty, onClick }) {
  return (
    <button
      onClick={onClick}
      title={path}
      className={`group flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono border-r border-carbon-border whitespace-nowrap transition-colors ${
        active
          ? 'bg-carbon-bg text-carbon-text-primary'
          : 'bg-carbon-layer-02 text-carbon-text-placeholder hover:text-carbon-text-secondary'
      }`}
    >
      <span>{basename(path)}</span>
      {editable && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${dirty ? 'bg-carbon-warning' : 'bg-carbon-text-placeholder/40'}`}
          title={dirty ? 'Unsaved edits' : 'Editable'}
        />
      )}
    </button>
  )
}

const EDITOR_OPTIONS = {
  fontSize: 12,
  lineHeight: 18,
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  automaticLayout: true,
  tabSize: 2,
  renderWhitespace: 'none',
  smoothScrolling: true,
  fixedOverflowWidgets: true,
  scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
}

/**
 * The integrated IDE pane.
 *
 * Props:
 *   tabs            [{ path, editable }]         ordered list of open files
 *   activePath      string                       which tab is shown
 *   onActivePathChange (path) => void
 *   repoAvailable   boolean | null               false => show the "run ramp generate" state
 *   editableValue   string                       controlled content of the editable tab
 *   onEditableChange (value) => void
 *   editableDirty   boolean                      show the unsaved dot / enable Reset
 *   onResetEditable () => void                   optional
 *   toolbar         ReactNode                    optional right-aligned toolbar content
 *   statusBar       ReactNode                    optional row under the editor
 */
export default function IdePanel({
  tabs = [],
  activePath,
  onActivePathChange,
  repoAvailable,
  editableValue,
  onEditableChange,
  onEditableMount,
  editableDirty = false,
  onResetEditable,
  toolbar,
  statusBar,
}) {
  const activeTab = tabs.find(t => t.path === activePath) || tabs[0]
  const isEditable = !!activeTab?.editable
  const readOnlyFile = useRepoFile(isEditable ? null : activeTab?.path, repoAvailable !== false)

  const languageForActive = useMemo(() => {
    if (isEditable) return activeTab?.language || guessLanguage(activeTab?.path)
    return readOnlyFile.language || guessLanguage(activeTab?.path)
  }, [isEditable, activeTab, readOnlyFile.language])

  const shell =
    'flex flex-col rounded-lg border border-carbon-border bg-carbon-bg overflow-hidden h-full min-h-[420px]'

  if (repoAvailable === false) {
    return (
      <div className={shell}>
        <IdeChrome tabs={[]} />
        <div className="flex-1 flex items-center justify-center p-8 text-center">
          <div className="max-w-sm space-y-2">
            <p className="text-2xl">📂</p>
            <p className="text-sm font-semibold text-carbon-text-primary">Editor unavailable</p>
            <p className="text-xs text-carbon-text-secondary leading-relaxed">
              Ramp is running against the sample manifest with no repository checkout.
              Run <code className="text-carbon-interactive">ramp generate &lt;repo&gt;</code> and reopen
              to browse and edit the real source here.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={shell}>
      <IdeChrome
        tabs={tabs}
        activePath={activeTab?.path}
        editableDirty={editableDirty}
        onActivePathChange={onActivePathChange}
        toolbar={
          <>
            {isEditable && onResetEditable && (
              <button
                onClick={onResetEditable}
                disabled={!editableDirty}
                className="px-2 py-1 text-[11px] rounded border border-carbon-border text-carbon-text-secondary hover:bg-carbon-layer-02 disabled:opacity-40 transition-colors"
              >
                Reset file
              </button>
            )}
            {toolbar}
          </>
        }
      />

      <div className="flex-1 min-h-0 relative">
        {!isEditable && readOnlyFile.loading && (
          <Centered>Loading {basename(activeTab?.path)}…</Centered>
        )}
        {!isEditable && readOnlyFile.error && (
          <Centered tone="error">{readOnlyFile.error}</Centered>
        )}
        {(isEditable || (!readOnlyFile.loading && !readOnlyFile.error)) && activeTab && (
          <Suspense fallback={<Centered>Starting editor…</Centered>}>
            <MonacoEditor
              key={activeTab.path}
              height="100%"
              theme="vs-dark"
              language={languageForActive}
              value={isEditable ? editableValue : readOnlyFile.content}
              onChange={isEditable ? (v => onEditableChange?.(v ?? '')) : undefined}
              onMount={isEditable && onEditableMount ? onEditableMount : undefined}
              options={{ ...EDITOR_OPTIONS, readOnly: !isEditable }}
            />
          </Suspense>
        )}
        {!activeTab && <Centered>No file open.</Centered>}
      </div>

      {statusBar != null && (
        <div className="border-t border-carbon-border bg-carbon-layer-01 px-3 py-2">{statusBar}</div>
      )}
    </div>
  )
}

function IdeChrome({ tabs, activePath, editableDirty, onActivePathChange, toolbar }) {
  return (
    <div className="flex items-stretch justify-between bg-carbon-layer-02 border-b border-carbon-border">
      <div className="flex items-stretch overflow-x-auto">
        {tabs.length === 0 ? (
          <span className="px-3 py-1.5 text-xs font-mono text-carbon-text-placeholder">no file</span>
        ) : (
          tabs.map(t => (
            <TabButton
              key={t.path}
              path={t.path}
              editable={t.editable}
              dirty={t.editable && editableDirty}
              active={t.path === activePath}
              onClick={() => onActivePathChange?.(t.path)}
            />
          ))
        )}
      </div>
      {toolbar && <div className="flex items-center gap-2 px-2 flex-shrink-0">{toolbar}</div>}
    </div>
  )
}

function Centered({ children, tone }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
      <p className={`text-xs ${tone === 'error' ? 'text-carbon-error' : 'text-carbon-text-placeholder'}`}>
        {children}
      </p>
    </div>
  )
}

function guessLanguage(path = '') {
  const ext = path.toLowerCase().split('.').pop()
  const map = {
    js: 'javascript', jsx: 'javascript', mjs: 'javascript', cjs: 'javascript',
    ts: 'typescript', tsx: 'typescript',
    json: 'json', md: 'markdown', css: 'css', scss: 'scss', html: 'html',
    py: 'python', rb: 'ruby', go: 'go', rs: 'rust', java: 'java',
    yml: 'yaml', yaml: 'yaml', sql: 'sql', prisma: 'prisma', sh: 'shell',
  }
  return map[ext] || 'plaintext'
}
