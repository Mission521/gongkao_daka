import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuthStore } from '../store/authStore'

const CreateAnnouncement: React.FC = () => {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !content.trim()) return

    setSubmitting(true)

    try {
      const { error } = await supabase.from('announcements').insert([
        {
          author_id: user?.id,
          title: title,
          content: content,
        },
      ])

      if (error) throw error

      alert('公告发布成功！')
      navigate('/announcements')
    } catch (error) {
      console.error('Error creating announcement:', error)
      alert('发布失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">发布新公告</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              标题
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="请输入公告标题"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              内容
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary h-60 resize-none"
              placeholder="请输入公告内容，支持 Markdown 格式..."
              required
            />
          </div>

          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => navigate('/announcements')}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="bg-primary text-white px-8 py-2 rounded-lg hover:bg-primary-hover transition-colors disabled:bg-gray-300"
            >
              {submitting ? '发布中...' : '发布公告'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateAnnouncement
