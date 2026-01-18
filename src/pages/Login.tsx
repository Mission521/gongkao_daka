import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuthStore } from '../store/authStore'

const Login: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const { setUser } = useAuthStore()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      if (data.user) {
        setUser(data.user)
        navigate('/')
      }
    } catch (err: any) {
      console.error('Login error:', err)
      let message = err.message || '登录失败，请检查邮箱和密码'
      if (message.includes('Email not confirmed')) {
        message = '您的邮箱尚未验证，请检查您的邮箱（包括垃圾邮件）并点击验证链接。'
      } else if (message.includes('Invalid login credentials')) {
        message = '账号或密码错误'
      }
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-md mt-10">
      <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">用户登录</h2>
      
      {error && (
        <div className="bg-red-50 text-red-500 p-3 rounded mb-4 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
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
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary text-white py-2 rounded-md hover:bg-primary-hover transition-colors disabled:bg-blue-300"
        >
          {loading ? '登录中...' : '登录'}
        </button>
      </form>

      <div className="mt-4 text-center text-sm text-gray-600">
        还没有账号？{' '}
        <Link to="/register" className="text-primary hover:underline">
          立即注册
        </Link>
      </div>
    </div>
  )
}

export default Login
