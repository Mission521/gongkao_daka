import React from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { useUIStore } from '../store/uiStore'
import { cn } from '../utils/cn'

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
}

const colors = {
  success: 'bg-green-50 text-green-800 border-green-200',
  error: 'bg-red-50 text-red-800 border-red-200',
  info: 'bg-blue-50 text-blue-800 border-blue-200',
  warning: 'bg-yellow-50 text-yellow-800 border-yellow-200',
}

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useUIStore()

  return createPortal(
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-full max-w-sm px-4">
      <AnimatePresence>
        {toasts.map((toast) => {
          const Icon = icons[toast.type]
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              layout
              className={cn(
                'flex items-start gap-3 p-4 rounded-lg border shadow-lg backdrop-blur-sm',
                colors[toast.type]
              )}
            >
              <Icon size={20} className="mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm">{toast.title}</h3>
                {toast.message && (
                  <p className="text-sm opacity-90 mt-1">{toast.message}</p>
                )}
                <p className="text-xs opacity-60 mt-2">
                  {new Date().toLocaleTimeString()}
                </p>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="opacity-60 hover:opacity-100 transition-opacity"
              >
                <X size={18} />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>,
    document.body
  )
}
