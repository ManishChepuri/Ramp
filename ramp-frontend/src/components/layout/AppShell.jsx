import Sidebar from './Sidebar'
import Header  from './Header'
import { Outlet } from 'react-router-dom'
import ToastContainer from '../ui/ToastContainer'

export default function AppShell({ toasts, removeToast }) {
  return (
    <div className="flex h-full bg-carbon-bg text-carbon-text-primary font-sans">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  )
}
