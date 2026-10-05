import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { ToastProvider } from './ToastContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* ToastProvider en dışta: App dahil herkes useToast() kullanabilsin */}
    <ToastProvider>
      <App />
    </ToastProvider>
  </StrictMode>
)
