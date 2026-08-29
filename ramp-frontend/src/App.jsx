import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ManifestProvider } from './context/ManifestContext'
import { ProgressProvider } from './context/ProgressContext'
import { useToast }         from './hooks/useToast'
import AppShell             from './components/layout/AppShell'
import Dashboard            from './pages/Dashboard'
import ModuleList           from './pages/ModuleList'
import ModuleDetail         from './pages/ModuleDetail'
import QuestBoard           from './pages/QuestBoard'
import DocDrift             from './pages/DocDrift'
import Impact               from './pages/Impact'
import ExplainBack          from './pages/ExplainBack'
import Sabotage             from './pages/Sabotage'

function AppRoutes() {
  const { toasts, addToast, removeToast } = useToast()
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell toasts={toasts} removeToast={removeToast} />}>
          <Route index           element={<Dashboard addToast={addToast} />} />
          <Route path="modules"  element={<ModuleList />} />
          <Route path="modules/:id"         element={<ModuleDetail addToast={addToast} />} />
          <Route path="modules/:id/explain"   element={<ExplainBack addToast={addToast} />} />
          <Route path="modules/:id/sabotage"  element={<Sabotage   addToast={addToast} />} />
          <Route path="quests"   element={<QuestBoard addToast={addToast} />} />
          <Route path="drift"    element={<DocDrift   addToast={addToast} />} />
          <Route path="impact"   element={<Impact />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default function App() {
  return (
    <ManifestProvider>
      <ProgressProvider>
        <AppRoutes />
      </ProgressProvider>
    </ManifestProvider>
  )
}
