import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { AlertCircle, CheckCircle, ArrowRight, Shield } from 'lucide-react'
import { PasswordInput } from '../components/PasswordInput'

type Step = 'request' | 'reset'

const ForgotPassword: React.FC = () => {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('request')
  const [email, setEmail] = useState('')
  const [resetCode, setResetCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null)

  // Step 1: Request Reset Code
  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const { data, error } = await supabase.rpc('request_password_reset', {
        user_email: email
      })

      if (error) throw error

      // Handle RPC response which is an array of objects
      const response = Array.isArray(data) ? data[0] : data
      
      if (response && response.success) {
        setMessage({ 
          type: 'info', 
          text: response.message || '请求已提交，请联系管理员获取重置码。' 
        })
        setStep('reset')
      } else {
        throw new Error(response?.message || '请求失败，请检查邮箱是否正确')
      }
    } catch (err: any) {
      console.error('Request error:', err)
      setMessage({ type: 'error', text: err.message || '请求失败，请稍后重试' })
    } finally {
      setLoading(false)
    }
  }

  // Step 2: Complete Reset
  const handleCompleteReset = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: '两次输入的密码不一致' })
      return
    }

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: '密码长度至少为6位' })
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      const { data, error } = await supabase.rpc('complete_password_reset', {
        user_email: email,
        code: resetCode,
        new_password: newPassword
      })

      if (error) throw error

      // Handle RPC response which is an array of objects
      const response = Array.isArray(data) ? data[0] : data

      if (response && response.success) {
        setMessage({ 
          type: 'success', 
          text: '密码重置成功！3秒后自动跳转登录页...' 
        })
        setTimeout(() => {
          navigate('/login')
        }, 3000)
      } else {
        throw new Error(response?.message || '重置失败，验证码无效或过期')
      }
    } catch (err: any) {
      console.error('Complete reset error:', err)
      setMessage({ type: 'error', text: err.message || '重置失败，请稍后重试' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-md mt-10">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-4">
          <Shield size={24} />
        </div>
        <h2 className="text-2xl font-bold text-gray-800">重置密码</h2>
        <p className="text-sm text-gray-500 mt-2">
          {step === 'request' ? '第一步：验证身份并申请重置码' : '第二步：输入重置码设置新密码'}
        </p>
      </div>
      
      {message && (
        <div className={`p-4 rounded-md mb-6 flex items-start gap-3 text-sm ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 
          message.type === 'error' ? 'bg-red-50 text-red-700' :
          'bg-blue-50 text-blue-700'
        }`}>
          {message.type === 'success' ? <CheckCircle size={18} className="shrink-0 mt-0.5" /> : 
           message.type === 'error' ? <AlertCircle size={18} className="shrink-0 mt-0.5" /> :
           <Shield size={18} className="shrink-0 mt-0.5" />}
          <div>{message.text}</div>
        </div>
      )}

      {step === 'request' ? (
        <form onSubmit={handleRequestCode} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">注册邮箱</label>
            <input
              type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value.trim())}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="your@email.com"
              required
              autoFocus
            />
          </div>
          
          <div className="bg-gray-50 p-3 rounded text-xs text-gray-500">
            为了您的账号安全，提交申请后系统将生成唯一重置码发送给管理员。请您通过内部通讯工具联系管理员获取该重置码。
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white py-2 rounded-md hover:bg-primary-hover transition-colors disabled:bg-blue-300 flex items-center justify-center gap-2"
          >
            {loading ? '提交中...' : <>下一步 <ArrowRight size={16} /></>}
          </button>
        </form>
      ) : (
        <form onSubmit={handleCompleteReset} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">注册邮箱</label>
            <input
              type="email"
              value={email}
              disabled
              className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-md text-gray-500 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">重置验证码</label>
            <input
              type="text"
              value={resetCode}
              onChange={(e) => setResetCode(e.target.value.toUpperCase())}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary font-mono tracking-widest"
              placeholder="输入10位验证码"
              required
              maxLength={10}
            />
            <p className="text-xs text-gray-400 mt-1">请输入从管理员处获取的10位字符验证码</p>
          </div>

          <PasswordInput
            label="新密码"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="不少于6位"
            required
            minLength={6}
          />

          <PasswordInput
            label="确认新密码"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="再次输入新密码"
            required
            minLength={6}
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white py-2 rounded-md hover:bg-primary-hover transition-colors disabled:bg-blue-300"
          >
            {loading ? '处理中...' : '确认重置密码'}
          </button>
          
          <button
            type="button"
            onClick={() => {
              setStep('request')
              setMessage(null)
            }}
            className="w-full text-gray-500 text-sm hover:text-gray-700"
          >
            返回上一步
          </button>
        </form>
      )}

      <div className="mt-6 text-center text-sm text-gray-600 border-t pt-4">
        <Link to="/login" className="text-primary hover:underline">
          返回登录
        </Link>
      </div>
    </div>
  )
}

export default ForgotPassword
