import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      // Call Supabase RPC function to reset password
      const { data, error } = await supabase.rpc('reset_password_to_default', {
        user_email: email
      })

      if (error) throw error

      if (data && data.success) {
        setMessage({ 
          type: 'success', 
          text: '密码已重置为默认密码：daka123456，请立即登录并修改密码。' 
        })
      } else {
        throw new Error(data?.message || '重置失败，用户不存在或系统错误')
      }

    } catch (err: any) {
      console.error('Reset error:', err)
      setMessage({ type: 'error', text: err.message || '重置失败，请稍后重试' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-md mt-10">
      <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">重置密码</h2>
      
      {message && (
        <div className={`p-3 rounded mb-4 text-sm ${message.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
          {message.text}
        </div>
      )}

      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
        <div className="flex">
          <div className="ml-3">
            <p className="text-sm text-yellow-700">
              注意：使用此功能将把您的密码重置为默认密码 <strong>daka123456</strong>。
              重置后请立即登录并在个人设置中修改密码。
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleReset} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">注册邮箱</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="your@email.com"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary text-white py-2 rounded-md hover:bg-primary-hover transition-colors disabled:bg-blue-300"
        >
          {loading ? '重置中...' : '确认重置'}
        </button>
      </form>

      <div className="mt-4 text-center text-sm text-gray-600">
        <Link to="/login" className="text-primary hover:underline">
          返回登录
        </Link>
      </div>
    </div>
  )
}

export default ForgotPassword
