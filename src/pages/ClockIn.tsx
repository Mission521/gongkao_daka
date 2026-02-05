import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuthStore } from '../store/authStore'
import { Image, X, Upload, Save } from 'lucide-react'

import { useUIStore } from '../store/uiStore'
import { useDraft } from '../hooks/useDraft'

const ClockIn: React.FC = () => {
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('日常')
  const [images, setImages] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const { user } = useAuthStore()
  const { addToast } = useUIStore()
  const navigate = useNavigate()

  const { 
    saveDraft, 
    clearDraft, 
    updateDraftData, 
    saving: savingDraft, 
    lastSaved 
  } = useDraft({
    pageType: 'clock-in',
    initialData: { content: '', category: '日常', images: [] },
    onRecover: (data: any) => {
      setContent(data.content || '')
      setCategory(data.category || '日常')
      setImages(data.images || [])
    },
    isEmpty: (data: any) => {
      // Content must be non-empty string (trimmed) or have images
      return (!data.content || data.content.trim() === '') && (!data.images || data.images.length === 0)
    }
  })

  React.useEffect(() => {
    updateDraftData({ content, category, images })
  }, [content, category, images, updateDraftData])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return

    setUploading(true)
    const files = Array.from(e.target.files)

    try {
      for (const file of files) {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Math.random()}.${fileExt}`
        const filePath = `${user?.id}/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('clockin-images')
          .upload(filePath, file)

        if (uploadError) throw uploadError

        const { data } = supabase.storage
          .from('clockin-images')
          .getPublicUrl(filePath)

        setImages((prev) => [...prev, data.publicUrl])
      }
    } catch (error) {
      console.error('Error uploading image:', error)
      alert('图片上传失败，请重试')
    } finally {
      setUploading(false)
      // Clear input
      e.target.value = ''
    }
  }

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return

    setSubmitting(true)

    try {
      const { error } = await supabase.from('clockins').insert([
        {
          user_id: user?.id,
          content: content,
          category: category,
          images: images,
        },
      ])

      if (error) throw error

      // Add success toast
      addToast({
        title: '打卡成功',
        message: '您的打卡记录已成功保存',
        type: 'success'
      })

      // Add notification
      await supabase.from('notifications').insert([
        {
          user_id: user?.id,
          title: '打卡成功',
          content: `您已完成今日打卡：${content.substring(0, 20)}${content.length > 20 ? '...' : ''}`,
          type: 'success'
        }
      ])

      await clearDraft()

      navigate('/')
    } catch (error) {
      console.error('Error submitting clock-in:', error)
      addToast({
        title: '打卡失败',
        message: '提交过程中发生错误，请重试',
        type: 'error'
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          📝 每日打卡
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              打卡类型
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white"
            >
              <option value="日常">日常</option>
              <option value="学习">学习</option>
              <option value="运动">运动</option>
              <option value="工作">工作</option>
              <option value="其他">其他</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              打卡内容
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary h-40 resize-none"
              placeholder="今天学习了什么？有什么收获？"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              上传图片
            </label>
            <div className="grid grid-cols-3 gap-4 mb-4">
              {images.map((img, index) => (
                <div key={index} className="relative group aspect-square">
                  <img
                    src={img}
                    alt={`Uploaded ${index + 1}`}
                    className="w-full h-full object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
              
              <label className="border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:text-primary transition-colors aspect-square">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={uploading}
                />
                {uploading ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400"></div>
                ) : (
                  <>
                    <Upload size={24} className="mb-2" />
                    <span className="text-sm">上传图片</span>
                  </>
                )}
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-4 items-center">
            {lastSaved && (
              <span className="text-sm text-gray-500">
                {savingDraft ? '保存中...' : `上次保存: ${lastSaved.toLocaleTimeString()}`}
              </span>
            )}
            
            <button
              type="button"
              onClick={() => saveDraft({ content, category, images }, true)}
              disabled={savingDraft || !content.trim()}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Save size={18} />
              保存草稿
            </button>

            <button
              type="submit"
              disabled={submitting || !content.trim()}
              className="bg-primary text-white px-8 py-2 rounded-lg hover:bg-primary-hover transition-colors disabled:bg-gray-300 flex items-center gap-2"
            >
              {submitting ? '提交中...' : '发布打卡'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ClockIn
