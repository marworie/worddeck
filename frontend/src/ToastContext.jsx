// ToastContext.jsx
// Uygulamanın her yerinden kısa bildirim (toast) göstermek için.
// Kullanım: const showToast = useToast(); showToast('Kaydedildi!')

import { createContext, useCallback, useContext, useState } from 'react'

const ToastContext = createContext(() => {})

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null)

  // type: 'success' ya da 'error'
  const showToast = useCallback((text, type = 'success') => {
    const id = Date.now()
    setToast({ id, text, type })
    // 3 saniye sonra kapat (bu arada yeni toast geldiyse onu kapatma)
    setTimeout(() => setToast(current => (current?.id === id ? null : current)), 3000)
  }, [])

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {toast && <div className={`toast toast-${toast.type}`}>{toast.text}</div>}
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)