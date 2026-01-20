import { create } from 'zustand'

export interface Toast {
  id: string
  title: string
  message?: string
  type: 'success' | 'error' | 'info' | 'warning'
  duration?: number
}

interface UIStore {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
}

export const useUIStore = create<UIStore>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = Math.random().toString(36).substring(7)
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }))
    
    if (toast.duration !== 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }))
      }, toast.duration || 5000)
    }
  },
  removeToast: (id) => set((state) => ({
    toasts: state.toasts.filter((t) => t.id !== id),
  })),
}))
