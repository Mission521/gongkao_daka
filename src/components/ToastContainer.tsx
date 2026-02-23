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

export interface ToastContainerProps {
  placement?: 'top-right' | 'top-center' | 'top-left' | 'bottom-right' | 'bottom-center' | 'bottom-left'
  offsetTop?: string
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ 
  placement = 'top-right', 
  offsetTop = '64px' // Default Navbar height
}) => {
  const { toasts, removeToast } = useUIStore()

  // Base styles for positioning
  const positionClasses = {
    'top-right': 'top-0 right-0 pt-2 pr-4',
    'top-center': 'top-0 left-1/2 -translate-x-1/2 pt-2',
    'top-left': 'top-0 left-0 pt-2 pl-4',
    'bottom-right': 'bottom-0 right-0 pb-2 pr-4',
    'bottom-center': 'bottom-0 left-1/2 -translate-x-1/2 pb-2',
    'bottom-left': 'bottom-0 left-0 pb-2 pl-4',
  }

  // Animation variants based on placement
  const getAnimationVariants = () => {
    // Default slide from right for right-aligned
    if (placement.includes('right')) {
      return {
        initial: { opacity: 0, x: '100%', y: 0, scale: 1 },
        animate: { opacity: 1, x: 0, y: 0, scale: 1 },
        exit: { opacity: 0, x: '100%', transition: { duration: 0.3, ease: "easeOut" } }
      }
    }
    // Slide from left for left-aligned
    if (placement.includes('left')) {
      return {
        initial: { opacity: 0, x: '-100%', y: 0, scale: 1 },
        animate: { opacity: 1, x: 0, y: 0, scale: 1 },
        exit: { opacity: 0, x: '-100%', transition: { duration: 0.3, ease: "easeOut" } }
      }
    }
    // Slide from top/bottom for center
    return {
      initial: { opacity: 0, y: placement.includes('top') ? -20 : 20, scale: 0.9, x: 0 },
      animate: { opacity: 1, y: 0, scale: 1, x: 0 },
      exit: { opacity: 0, scale: 0.9, transition: { duration: 0.2 } }
    }
  }

  const variants = getAnimationVariants()

  return createPortal(
    <div 
      className={cn(
        "fixed z-[60] flex flex-col gap-2 w-full max-w-sm sm:max-w-sm max-w-[80vw] pointer-events-none",
        positionClasses[placement]
      )}
      style={{ 
        marginTop: placement.startsWith('top') ? `calc(${offsetTop} + 8px)` : undefined,
        marginBottom: placement.startsWith('bottom') ? '8px' : undefined
      }}
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => {
          const Icon = icons[toast.type]
          return (
            <motion.div
              key={toast.id}
              initial={variants.initial as any}
              animate={variants.animate as any}
              exit={variants.exit as any}
              transition={{ duration: 0.3, ease: "easeOut" }}
              layout
              className={cn(
                'relative flex items-start gap-3 p-4 rounded-lg border shadow-lg backdrop-blur-sm overflow-hidden pointer-events-auto',
                colors[toast.type]
              )}
            >
              <Icon size={20} className="mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm">{toast.title}</h3>
                {toast.message && (
                  <p className="text-sm opacity-90 mt-1 break-words">{toast.message}</p>
                )}
                
                {toast.action && (
                  <button
                    onClick={() => {
                      toast.action?.onClick()
                      removeToast(toast.id)
                    }}
                    className="mt-2 text-sm font-medium underline hover:no-underline opacity-80 hover:opacity-100 transition-opacity"
                  >
                    {toast.action.label}
                  </button>
                )}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="opacity-60 hover:opacity-100 transition-opacity p-1 -mr-2 -mt-2"
              >
                <X size={16} />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>,
    document.body
  )
}
