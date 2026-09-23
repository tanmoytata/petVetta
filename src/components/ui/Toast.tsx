'use client'

import { useUIStore } from '@/store'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

export function ToastContainer() {
  const { toasts, removeToast } = useUIStore()

  if (toasts.length === 0) return null

  return (
    <div
      className="fixed bottom-[76px] left-0 right-0 max-w-[480px] mx-auto px-4 z-[100] flex flex-col gap-2 pointer-events-none"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'flex items-center justify-between px-4 py-3 rounded-lg shadow-lg pointer-events-auto',
            'animate-in fade-in slide-in-from-bottom-2 duration-200',
            {
              'bg-[#27ae60] text-white': toast.type === 'success',
              'bg-[#e67e22] text-white': toast.type === 'warning',
              'bg-[#c0392b] text-white': toast.type === 'error',
              'bg-[#2980b9] text-white': toast.type === 'info',
            }
          )}
          role="alert"
        >
          <span className="text-sm font-medium">{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            className="ml-3 p-1 rounded-full hover:bg-white/20 transition-colors min-w-[24px] min-h-[24px] flex items-center justify-center"
            aria-label="Dismiss notification"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}

export function useToast() {
  const { addToast } = useUIStore()
  return {
    success: (message: string, duration?: number) =>
      addToast({ type: 'success', message, duration }),
    warning: (message: string, duration?: number) =>
      addToast({ type: 'warning', message, duration }),
    error: (message: string, duration?: number) =>
      addToast({ type: 'error', message, duration }),
    info: (message: string, duration?: number) =>
      addToast({ type: 'info', message, duration }),
  }
}
