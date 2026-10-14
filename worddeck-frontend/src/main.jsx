import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { ToastProvider } from './ToastContext'
import { applyTheme } from './preferences'

applyTheme()   // sayfa açılır açılmaz kayıtlı temayı uygula
createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* ToastProvider en dışta: App dahil herkes useToast() kullanabilsin */}
    <ToastProvider>
      <App />
    </ToastProvider>
  </StrictMode>
)
