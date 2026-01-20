import React, { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useAuthStore } from '../store/authStore'
import { format, formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Bell, Check, Trash2, Mail } from 'lucide-react'

interface Notification {
  id: string
  title: string
  content: string
  type: 'success' | 'error' | 'info' | 'warning'
  is_read: boolean
  created_at: string
}

const Messages: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuthStore()

  useEffect(() => {
    fetchNotifications()
    
    // Auto cleanup expired messages (older than 5 days)
    // Ideally this should be a backend cron job, but we'll do a lazy cleanup on load
    cleanupExpiredMessages()
  }, [user])

  // Auto delete viewed messages after 5 minutes
  useEffect(() => {
    const timer = setInterval(() => {
      // Find messages that are read and older than 5 minutes (local check mostly for UI, real check needs DB field read_at)
      // Since we don't track read_at in frontend state precisely for this timer, 
      // we'll implement a function that calls DB to delete old read messages.
      cleanupReadMessages()
    }, 60000) // Check every minute

    return () => clearInterval(timer)
  }, [])

  const fetchNotifications = async () => {
    if (!user) return
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setNotifications(data || [])
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const cleanupExpiredMessages = async () => {
    if (!user) return
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    await supabase
      .from('notifications')
      .delete()
      .lt('created_at', fiveDaysAgo)
  }

  const cleanupReadMessages = async () => {
    if (!user) return
    // Delete messages read more than 5 minutes ago
    // We need to fetch messages that are read and check their read_at
    // Or just SQL delete
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    
    await supabase
      .from('notifications')
      .delete()
      .eq('is_read', true)
      .lt('read_at', fiveMinutesAgo)
      
    // Refresh list
    fetchNotifications()
  }

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ 
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) throw error
      
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      )
    } catch (error) {
      console.error('Error marking as read:', error)
    }
  }

  const markAllAsRead = async () => {
    if (!user) return
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ 
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('is_read', false)
        .eq('user_id', user.id)

      if (error) throw error
      fetchNotifications()
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
    } catch (error) {
      console.error('Error deleting notification:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Bell className="text-primary" />
          消息中心
        </h2>
        {notifications.some(n => !n.is_read) && (
          <button
            onClick={markAllAsRead}
            className="text-sm text-primary hover:text-primary-hover font-medium flex items-center gap-1"
          >
            <Check size={16} />
            全部已读
          </button>
        )}
      </div>

      <div className="space-y-4">
        {notifications.length > 0 ? (
          notifications.map((notification) => (
            <div
              key={notification.id}
              onClick={() => !notification.is_read && markAsRead(notification.id)}
              className={`relative bg-white p-4 rounded-lg shadow-sm border transition-all cursor-pointer hover:shadow-md ${
                notification.is_read 
                  ? 'border-gray-100 opacity-75' 
                  : 'border-primary/20 bg-blue-50/30'
              }`}
            >
              {!notification.is_read && (
                <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white"></div>
              )}
              
              <div className="flex items-start gap-4">
                <div className={`p-2 rounded-full shrink-0 ${
                  notification.type === 'success' ? 'bg-green-100 text-green-600' :
                  notification.type === 'error' ? 'bg-red-100 text-red-600' :
                  notification.type === 'warning' ? 'bg-yellow-100 text-yellow-600' :
                  'bg-blue-100 text-blue-600'
                }`}>
                  <Mail size={20} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className={`font-semibold ${notification.is_read ? 'text-gray-700' : 'text-gray-900'}`}>
                      {notification.title}
                    </h3>
                    <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: zhCN })}
                    </span>
                  </div>
                  <p className={`text-sm ${notification.is_read ? 'text-gray-500' : 'text-gray-600'}`}>
                    {notification.content}
                  </p>
                </div>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteNotification(notification.id)
                  }}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-100">
            <Bell size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">暂无消息</h3>
            <p className="text-gray-500 text-sm">这里会显示您的打卡提醒和系统通知</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Messages
