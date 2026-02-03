import React, { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { supabase } from '../supabaseClient'
import { Menu, X, LogOut, User as UserIcon, Lock, ChevronDown, Settings } from 'lucide-react'
import { NotificationPopover } from './NotificationPopover'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../utils/cn'

export const Navbar: React.FC = () => {
  const { user, setUser } = useAuthStore()
  const navigate = useNavigate()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    navigate('/login')
    setIsUserDropdownOpen(false)
  }

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen)
  const toggleUserDropdown = () => setIsUserDropdownOpen(!isUserDropdownOpen)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsUserDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
                <NotificationPopover />
                
                {/* User Dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={toggleUserDropdown}
                    className="flex items-center gap-2 text-sm text-gray-700 hover:text-primary transition-colors focus:outline-none"
                    aria-expanded={isUserDropdownOpen}
                    aria-haspopup="true"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <UserIcon size={18} />
                    </div>
                    <span className="max-w-[150px] truncate">{user.email}</span>
                    <ChevronDown size={14} className={cn("transition-transform duration-200", isUserDropdownOpen && "rotate-180")} />
                  </button>

                  <AnimatePresence>
                    {isUserDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50"
                      >
                        <div className="p-2">
                          <div className="px-3 py-2 border-b border-gray-50 mb-1">
                            <p className="text-xs text-gray-500">已登录账号</p>
                            <p className="text-sm font-medium text-gray-800 truncate" title={user.email}>{user.email}</p>
                          </div>
                          
                          <Link 
                            to="/profile" 
                            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary rounded-md transition-colors"
                            onClick={() => setIsUserDropdownOpen(false)}
                          >
                            <Settings size={16} />
                            个人设置
                          </Link>

                          <div className="my-1 border-t border-gray-50"></div>

                          <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          >
                            <LogOut size={16} />
                            退出登录
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
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
                <Link to="/clock-in" className="text-gray-600 hover:text-primary" onClick={toggleMenu}>打卡</Link>
                <Link to="/records" className="text-gray-600 hover:text-primary" onClick={toggleMenu}>记录</Link>
                <Link to="/stats" className="text-gray-600 hover:text-primary" onClick={toggleMenu}>统计</Link>
                <Link to="/ocr" className="text-gray-600 hover:text-primary" onClick={toggleMenu}>OCR</Link>
              </>
            )}
            <div className="border-t pt-4">
              {user ? (
                <div className="flex flex-col space-y-2">
                  <div className="px-2 py-2 mb-2 bg-gray-50 rounded-md">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <UserIcon size={16} />
                      </div>
                      <span className="text-sm text-gray-700 truncate">{user.email}</span>
                    </div>
                  </div>
                  
                  <Link 
                    to="/profile" 
                    className="flex items-center gap-2 px-2 py-2 text-gray-600 hover:bg-gray-50 hover:text-primary rounded-md"
                    onClick={toggleMenu}
                  >
                    <Settings size={18} />
                    个人设置
                  </Link>

                  <button
                    onClick={() => {
                      handleLogout()
                      toggleMenu()
                    }}
                    className="flex items-center gap-2 px-2 py-2 text-red-600 hover:bg-red-50 rounded-md text-left w-full"
                  >
                    <LogOut size={18} />
                    退出登录
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
