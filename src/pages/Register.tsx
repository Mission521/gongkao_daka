import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

const Register: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      setError('两次输入的密码不一致')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // 1. Register with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (authError) throw authError

      if (authData.user) {
        // 2. Insert into public.users table
        const { error: dbError } = await supabase
          .from('users')
          .insert([
            {
              id: authData.user.id, // Link to Auth User ID
              email: email,
              name: name,
              password_hash: 'managed_by_supabase_auth', // Placeholder
            }
          ])

        if (dbError) {
          // If DB insert fails, we might want to warn the user, but Auth is successful.
          // In a production app, we might use a Trigger instead to ensure consistency.
          console.error('Error creating user profile:', dbError)
          throw new Error('创建用户资料失败')
        }

        alert('注册成功！请登录。')
        navigate('/login')
      }
    } catch (err: any) {
      setError(err.message || '注册失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-md mt-10">
      <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">注册账号</h2>
      
      {error && (
        <div className="bg-red-50 text-red-500 p-3 rounded mb-4 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleRegister} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">昵称</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="您的昵称"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="your@email.com"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="********"
            minLength={6}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">确认密码</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="********"
            minLength={6}
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary text-white py-2 rounded-md hover:bg-primary-hover transition-colors disabled:bg-blue-300"
        >
          {loading ? '注册中...' : '注册'}
        </button>
      </form>

      <div className="mt-4 text-center text-sm text-gray-600">
        已有账号？{' '}
        <Link to="/login" className="text-primary hover:underline">
          立即登录
        </Link>
      </div>
    </div>
  )
}

export default Register
