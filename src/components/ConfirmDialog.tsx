import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, X, Clock } from 'lucide-react'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: React.ReactNode
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
  type?: 'danger' | 'warning' | 'info'
  autoCloseTime?: number // ms, 0 means disabled
  confirmDelay?: number // ms, delay before confirm button is enabled
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = '确认',
  cancelText = '取消',
  onConfirm,
  onCancel,
  type = 'danger',
  autoCloseTime = 0,
  confirmDelay = 0,
}) => {
  const [canConfirm, setCanConfirm] = useState(confirmDelay === 0)
  const [timeLeft, setTimeLeft] = useState(autoCloseTime > 0 ? Math.ceil(autoCloseTime / 1000) : 0)

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setCanConfirm(confirmDelay === 0)
      setTimeLeft(autoCloseTime > 0 ? Math.ceil(autoCloseTime / 1000) : 0)
    }
  }, [isOpen, confirmDelay, autoCloseTime])

  // Handle confirm delay
  useEffect(() => {
    if (isOpen && confirmDelay > 0) {
      const timer = setTimeout(() => {
        setCanConfirm(true)
      }, confirmDelay)
      return () => clearTimeout(timer)
    }
  }, [isOpen, confirmDelay])

  // Handle auto close
  useEffect(() => {
    if (isOpen && autoCloseTime > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            onCancel()
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [isOpen, autoCloseTime, onCancel])

  if (!isOpen) return null

  // Ensure modal is attached to body
  if (typeof document === 'undefined') return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-full shrink-0 ${
              type === 'danger' ? 'bg-red-50 text-red-600' : 
              type === 'warning' ? 'bg-yellow-50 text-yellow-600' : 
              'bg-blue-50 text-blue-600'
            }`}>
              <AlertTriangle size={24} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 mb-2 flex justify-between items-center">
                {title}
                {autoCloseTime > 0 && (
                  <span className="text-xs font-normal text-gray-400 flex items-center gap-1">
                    <Clock size={12} />
                    {timeLeft}s后自动关闭
                  </span>
                )}
              </h3>
              <div className="text-gray-600 text-sm leading-relaxed">
                {message}
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-100">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all shadow-sm"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={!canConfirm}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all shadow-sm flex items-center gap-2 ${
              !canConfirm ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'
            } ${
              type === 'danger' ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' :
              type === 'warning' ? 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500' :
              'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
            }`}
          >
            {confirmText}
            {!canConfirm && confirmDelay > 0 && <span className="text-xs opacity-80">(请稍候)</span>}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
