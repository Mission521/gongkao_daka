import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { supabase } from '../supabaseClient'
import { Menu, X, LogOut, User as UserIcon, Bell } from 'lucide-react'

export const Navbar: React.FC = () => {
  const { user, setUser } = useAuthStore()
  const navigate = useNavigate()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  // Fetch unread count
  React.useEffect(() => {
    if (!user) return

    const fetchUnreadCount = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false)
      
      setUnreadCount(count || 0)
    }

    fetchUnreadCount()
    
    // Subscribe to new notifications
    const subscription = supabase
      .channel('notifications')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, fetchUnreadCount)
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [user])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    navigate('/login')
  }

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen)

  return (
    <nav className="bg-white shadow-md fixed top-0 left-0 right-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="text-xl font-bold text-primary flex items-center gap-2">
            <span>打卡助手</span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-6">
            <Link to="/" className="text-gray-600 hover:text-primary">首页</Link>
            <Link to="/announcements" className="text-gray-600 hover:text-primary">公告</Link>
            {user && (
              <>
                <Link to="/clock-in" className="text-gray-600 hover:text-primary">打卡</Link>
                <Link to="/records" className="text-gray-600 hover:text-primary">记录</Link>
                <Link to="/stats" className="text-gray-600 hover:text-primary">统计</Link>
                <Link to="/ocr" className="text-gray-600 hover:text-primary">OCR</Link>
              </>
            )}
          </div>

          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <div className="flex items-center gap-4">
                <Link to="/messages" className="relative text-gray-600 hover:text-primary transition-colors">
                  <Bell size={20} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-4 h-4 flex items-center justify-center rounded-full">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>
                <span className="text-sm text-gray-600 flex items-center gap-1">
                  <UserIcon size={16} />
                  {user.email}
                </span>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1 text-gray-600 hover:text-red-500 transition-colors"
                >
                  <LogOut size={18} />
                  退出
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <Link to="/login" className="text-gray-600 hover:text-primary">登录</Link>
                <Link
                  to="/register"
                  className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-hover transition-colors"
                >
                  注册
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button onClick={toggleMenu} className="text-gray-600 hover:text-primary">
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-t">
          <div className="flex flex-col space-y-4 p-4">
            <Link to="/" className="text-gray-600 hover:text-primary" onClick={toggleMenu}>首页</Link>
            <Link to="/announcements" className="text-gray-600 hover:text-primary" onClick={toggleMenu}>公告</Link>
            {user && (
              <>
                <Link to="/messages" className="flex items-center justify-between text-gray-600 hover:text-primary" onClick={toggleMenu}>
                  <span>消息中心</span>
                  {unreadCount > 0 && (
                    <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </Link>
                <Link to="/clock-in" className="text-gray-600 hover:text-primary" onClick={toggleMenu}>打卡</Link>
                <Link to="/records" className="text-gray-600 hover:text-primary" onClick={toggleMenu}>记录</Link>
                <Link to="/stats" className="text-gray-600 hover:text-primary" onClick={toggleMenu}>统计</Link>
                <Link to="/ocr" className="text-gray-600 hover:text-primary" onClick={toggleMenu}>OCR</Link>
              </>
            )}
            <div className="border-t pt-4">
              {user ? (
                <div className="flex flex-col space-y-4">
                  <span className="text-sm text-gray-600">{user.email}</span>
                  <button
                    onClick={() => {
                      handleLogout()
                      toggleMenu()
                    }}
                    className="text-left text-gray-600 hover:text-red-500"
                  >
                    退出
                  </button>
                </div>
              ) : (
                <div className="flex flex-col space-y-4">
                  <Link to="/login" className="text-gray-600 hover:text-primary" onClick={toggleMenu}>登录</Link>
                  <Link to="/register" className="text-primary font-medium" onClick={toggleMenu}>注册</Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
