import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import { useAuthStore } from '../store/authStore'
import { useUIStore } from '../store/uiStore'
import { User, CheckCircle, XCircle, Loader2, Edit2, Save, X } from 'lucide-react'
import { cn } from '../utils/cn'
import { PasswordInput } from '../components/PasswordInput'

// Debounce helper
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value)
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(handler)
  }, [value, delay])
  return debouncedValue
}

const Profile: React.FC = () => {
  const { user, setUser } = useAuthStore()
  const { addToast } = useUIStore()
  
  // --- Password Change State ---
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // --- Username Change State ---
  const [currentUsername, setCurrentUsername] = useState('')
  const [newUsername, setNewUsername] = useState('')
  const [isEditingUsername, setIsEditingUsername] = useState(false)
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'unavailable' | 'error'>('idle')
  const [usernameMessage, setUsernameMessage] = useState('')
  const [usernameLoading, setUsernameLoading] = useState(false)
  
  const debouncedUsername = useDebounce(newUsername, 500)

  // --- Fetch Initial Data ---
  useEffect(() => {
    if (user) {
      // Prefer fetching from public.users for consistency, fallback to metadata
      const fetchProfile = async () => {
        const { data, error } = await supabase
          .from('users')
          .select('name')
          .eq('id', user.id)
          .single()
        
        if (data && data.name) {
          setCurrentUsername(data.name)
        } else {
          setCurrentUsername(user.user_metadata?.name || '')
        }
      }
      fetchProfile()
    }
  }, [user])

  // --- Username Validation & Check ---
  useEffect(() => {
    if (!isEditingUsername || !debouncedUsername || debouncedUsername === currentUsername) {
      setUsernameStatus('idle')
      setUsernameMessage('')
      return
    }

    const checkAvailability = async () => {
      // Basic validation
      if (debouncedUsername.length < 2 || debouncedUsername.length > 20) {
        setUsernameStatus('error')
        setUsernameMessage('用户名长度需在2-20个字符之间')
        return
      }
      if (!/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/.test(debouncedUsername)) {
        setUsernameStatus('error')
        setUsernameMessage('用户名只能包含中文、字母、数字和下划线')
        return
      }

      setUsernameStatus('checking')
      try {
        // Use the RPC function we created, or direct query
        // Direct query is simpler for client
        const { data, error } = await supabase
          .from('users')
          .select('id')
          .eq('name', debouncedUsername)
          .neq('id', user!.id) // Exclude self (though usually unnecessary if name changed)
          .maybeSingle()
        
        if (error) throw error

        if (data) {
          setUsernameStatus('unavailable')
          setUsernameMessage('该用户名已被占用')
        } else {
          setUsernameStatus('available')
          setUsernameMessage('用户名可用')
        }
      } catch (err) {
        console.error('Check username error:', err)
        setUsernameStatus('error')
        setUsernameMessage('检测失败，请稍后重试')
      }
    }

    checkAvailability()
  }, [debouncedUsername, isEditingUsername, currentUsername, user])

  const handleUpdateUsername = async () => {
    if (usernameStatus !== 'available') return
    if (!user) return

    setUsernameLoading(true)
    try {
      // 1. Update public.users
      const { error: dbError } = await supabase
        .from('users')
        .update({ name: newUsername })
        .eq('id', user.id)

      if (dbError) {
        if (dbError.code === '23505') { // Unique violation
          setUsernameStatus('unavailable')
          setUsernameMessage('该用户名已被占用')
          throw new Error('用户名已被占用')
        }
        throw dbError
      }

      // 2. Update auth.users metadata (for consistency in session)
      const { data: authData, error: authError } = await supabase.auth.updateUser({
        data: { name: newUsername }
      })

      if (authError) {
        console.warn('Failed to update auth metadata:', authError)
        // Non-critical, continue
      } else if (authData.user) {
        setUser(authData.user) // Update local store
      }

      // 3. Log action
      await supabase.from('access_logs').insert({
        user_id: user.id,
        action: 'update_username',
        details: { old: currentUsername, new: newUsername }
      })

      setCurrentUsername(newUsername)
      setIsEditingUsername(false)
      setUsernameMessage('')
      addToast({ type: 'success', title: '成功', message: '用户名修改成功！' })
      
    } catch (err: any) {
      console.error('Update username error:', err)
      // Only show alert if it's not handled by status
      if (err.message !== '用户名已被占用') {
        addToast({ type: 'error', title: '错误', message: '修改失败: ' + (err.message || '未知错误') })
      }
    } finally {
      setUsernameLoading(false)
    }
  }

  // --- Password Change Handler ---
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !user.email) return

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: '新密码与确认密码不一致' })
      return
    }

    if (newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: '新密码长度至少为6位' })
      return
    }

    setPasswordLoading(true)
    setPasswordMessage(null)

    try {
      // 1. Verify current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      })

      if (signInError) throw new Error('当前密码错误')

      // 2. Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (updateError) throw updateError

      // 3. Log action
      await supabase.from('password_change_logs').insert({
        user_id: user.id,
        action: 'password_change',
      })

      setPasswordMessage({ type: 'success', text: '密码修改成功' })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      console.error('Password change error:', err)
      setPasswordMessage({ type: 'error', text: err.message || '密码修改失败' })
    } finally {
      setPasswordLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">个人设置</h1>

        {/* --- Username Section --- */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <User size={20} className="text-primary" />
              基本信息
            </h2>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="w-24 text-sm font-medium text-gray-500">用户名</div>
              
              {isEditingUsername ? (
                <div className="flex-1 max-w-sm space-y-2">
                  <div className="relative">
                    <input
                      type="text"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      className={cn(
                        "w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 pr-10",
                        usernameStatus === 'error' || usernameStatus === 'unavailable' 
                          ? "border-red-300 focus:ring-red-200" 
                          : usernameStatus === 'available'
                            ? "border-green-300 focus:ring-green-200"
                            : "border-gray-300 focus:ring-primary/20"
                      )}
                      placeholder="请输入新用户名"
                      autoFocus
                    />
                    <div className="absolute right-3 top-2.5">
                      {usernameStatus === 'checking' && <Loader2 size={16} className="animate-spin text-gray-400" />}
                      {usernameStatus === 'available' && <CheckCircle size={16} className="text-green-500" />}
                      {(usernameStatus === 'unavailable' || usernameStatus === 'error') && <XCircle size={16} className="text-red-500" />}
                    </div>
                  </div>
                  
                  {/* Feedback Message */}
                  {usernameMessage && (
                    <p className={cn(
                      "text-xs",
                      usernameStatus === 'available' ? "text-green-600" : "text-red-500"
                    )}>
                      {usernameMessage}
                    </p>
                  )}

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={handleUpdateUsername}
                      disabled={usernameLoading || usernameStatus !== 'available'}
                      className="px-3 py-1.5 bg-primary text-white text-sm rounded-md hover:bg-primary-hover disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
                    >
                      {usernameLoading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                      保存
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingUsername(false)
                        setNewUsername('')
                        setUsernameStatus('idle')
                        setUsernameMessage('')
                      }}
                      disabled={usernameLoading}
                      className="px-3 py-1.5 bg-gray-100 text-gray-600 text-sm rounded-md hover:bg-gray-200 transition-colors flex items-center gap-1"
                    >
                      <X size={14} />
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="text-gray-900 font-medium">{currentUsername || '未设置'}</span>
                  <button
                    onClick={() => {
                      setNewUsername(currentUsername)
                      setIsEditingUsername(true)
                    }}
                    className="p-1 text-gray-400 hover:text-primary hover:bg-gray-50 rounded-full transition-colors"
                    title="修改用户名"
                  >
                    <Edit2 size={16} />
                  </button>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="w-24 text-sm font-medium text-gray-500">邮箱</div>
              <div className="text-gray-700">{user?.email}</div>
            </div>
          </div>
        </div>

        {/* --- Password Section --- */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
            <User size={20} className="text-primary" />
            修改密码
          </h2>

          {passwordMessage && (
            <div className={`p-3 rounded mb-4 text-sm ${passwordMessage.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
              {passwordMessage.text}
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
            <PasswordInput
              label="当前密码"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />

            <PasswordInput
              label="新密码"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
            />

            <PasswordInput
              label="确认新密码"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
            />

            <button
              type="submit"
              disabled={passwordLoading}
              className="w-full bg-primary text-white py-2 rounded-md hover:bg-primary-hover transition-colors disabled:bg-blue-300"
            >
              {passwordLoading ? '修改中...' : '确认修改'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Profile
