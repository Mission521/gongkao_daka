import React, { useState, useEffect, useRef } from 'react'
import { Bell, Check, Trash2, Mail, MessageSquare, Info, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../supabaseClient'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { useAuthStore } from '../store/authStore'
import { cn } from '../utils/cn'

interface Notification {
  id: string
  title: string
  content: string
  type: 'success' | 'error' | 'info' | 'warning'
  is_read: boolean
  created_at: string
}

export const NotificationPopover: React.FC = () => {
  const { user } = useAuthStore()
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const popoverRef = useRef<HTMLDivElement>(null)

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fetch unread count & setup subscription
  useEffect(() => {
    if (!user) return

    const controller = new AbortController()

    const fetchUnreadCount = async () => {
      try {
        const { count, error } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_read', false)
          .abortSignal(controller.signal)
        
        if (!error) {
          setUnreadCount(count || 0)
        }
      } catch (error: any) {
        if (error.name === 'AbortError' || error.message?.includes('Aborted')) {
          // Ignore abort errors
        } else {
          console.error('Error fetching unread count:', error)
        }
      }
    }

    fetchUnreadCount()

    const subscription = supabase
      .channel('notifications_count')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, () => {
        fetchUnreadCount()
        // If open, also refresh list
        if (isOpen) fetchNotifications()
      })
      .subscribe()

    return () => {
      controller.abort()
      subscription.unsubscribe()
    }
  }, [user, isOpen])

  const fetchNotifications = async () => {
    if (!user) return
    setLoading(true)
    
    // Abort previous fetch if exists (not implemented here but good to know)
    // For simplicity, we just fetch.
    
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)
      
      if (error) throw error
      setNotifications(data || [])
    } catch (error: any) {
      if (error.name === 'AbortError' || error.message?.includes('Aborted')) {
        // Ignore
      } else {
        console.error('Error fetching notifications:', error)
      }
    } finally {
      setLoading(false)
    }
  }

  // Fetch notifications when opening
  useEffect(() => {
    if (isOpen) {
      fetchNotifications()
    }
  }, [isOpen])

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error
      
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Error marking as read:', error)
    }
  }

  const markAllAsRead = async () => {
    if (!user) return
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('is_read', false)

      if (error) throw error
      
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  const deleteNotification = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id)

      if (error) throw error
      
      setNotifications(prev => prev.filter(n => n.id !== id))
      // If it was unread, decrement count
      const notification = notifications.find(n => n.id === id)
      if (notification && !notification.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error('Error deleting notification:', error)
    }
  }

  const filteredNotifications = filter === 'all' 
    ? notifications 
    : notifications.filter(n => !n.is_read)

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle size={18} className="text-green-500" />
      case 'error': return <XCircle size={18} className="text-red-500" />
      case 'warning': return <AlertTriangle size={18} className="text-yellow-500" />
      default: return <Info size={18} className="text-blue-500" />
    }
  }

  return (
    <div className="relative" ref={popoverRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-primary transition-colors rounded-full hover:bg-gray-100"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 bg-red-500 text-white text-xs w-4 h-4 flex items-center justify-center rounded-full ring-2 ring-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-semibold text-gray-800">消息中心</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFilter(filter === 'all' ? 'unread' : 'all')}
                  className={cn(
                    "text-xs px-2 py-1 rounded-md transition-colors",
                    filter === 'unread' ? "bg-primary text-white" : "text-gray-500 hover:bg-gray-200"
                  )}
                >
                  {filter === 'unread' ? '只看未读' : '全部消息'}
                </button>
                <button
                  onClick={markAllAsRead}
                  className="text-gray-400 hover:text-primary transition-colors p-1"
                  title="全部已读"
                >
                  <Check size={16} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="max-h-[400px] overflow-y-auto">
              {loading && notifications.length === 0 ? (
                <div className="flex justify-center items-center h-32">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : filteredNotifications.length > 0 ? (
                <div className="divide-y divide-gray-50">
                  {filteredNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={cn(
                        "p-4 hover:bg-gray-50 transition-colors relative group cursor-pointer",
                        !notification.is_read && "bg-blue-50/30"
                      )}
                      onClick={() => !notification.is_read && markAsRead(notification.id)}
                    >
                      <div className="flex gap-3 items-start">
                        <div className="mt-0.5 shrink-0">
                          {getIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-1">
                            <span className={cn(
                              "text-sm font-medium",
                              notification.is_read ? "text-gray-700" : "text-gray-900"
                            )}>
                              {notification.title}
                            </span>
                            <span className="text-[10px] text-gray-400 whitespace-nowrap ml-2">
                              {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: zhCN })}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 line-clamp-2">
                            {notification.content}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteNotification(notification.id)
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all absolute right-2 bottom-2 bg-white shadow-sm border border-gray-100"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      {!notification.is_read && (
                        <div className="absolute top-4 right-4 w-1.5 h-1.5 rounded-full bg-red-500"></div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                  <Mail size={32} className="mb-2 opacity-50" />
                  <p className="text-sm">暂无消息</p>
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="p-3 border-t border-gray-50 bg-gray-50/30 text-center">
              <span className="text-xs text-gray-400">
                仅保留最近 30 天的消息
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
