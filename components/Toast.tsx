'use client'

import { createContext, useContext, useRef, useState } from 'react'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: number
  message: string
  type: ToastType
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const counterRef = useRef(0)

  const toast = (message: string, type: ToastType = 'success') => {
    const id = ++counterRef.current
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3000)
  }

  const icons: Record<ToastType, string> = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
  }

  const colors: Record<ToastType, string> = {
    success: 'bg-[#1A2A1A] border-green-800 text-green-300',
    error: 'bg-[#2A1A1A] border-red-800 text-red-300',
    info: 'bg-[#1A1A2A] border-blue-800 text-blue-300',
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-2.5 px-4 py-3 rounded-lg border text-sm font-medium shadow-xl animate-in slide-in-from-right-4 ${colors[t.type]}`}
          >
            <span className="text-base">{icons[t.type]}</span>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
