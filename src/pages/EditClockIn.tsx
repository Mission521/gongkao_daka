import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuthStore } from '../store/authStore'
import { X, Upload } from 'lucide-react'

const EditClockIn: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const [content, setContent] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const { user } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    const fetchClockIn = async () => {
      if (!id || !user) return

      try {
        const { data, error } = await supabase
          .from('clockins')
          .select('*')
          .eq('id', id)
          .single()

        if (error) throw error
        
        // Verify ownership
        if (data.user_id !== user.id) {
          alert('无权编辑此记录')
          navigate('/records')
          return
        }

        if (data) {
          setContent(data.content)
          setImages(data.images || [])
        }
      } catch (error) {
        console.error('Error fetching clockin:', error)
        alert('获取记录失败')
        navigate('/records')
      } finally {
        setLoading(false)
      }
    }

    fetchClockIn()
  }, [id, user, navigate])

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
      const { error } = await supabase
        .from('clockins')
        .update({
          content: content,
          images: images,
        })
        .eq('id', id)

      if (error) throw error

      alert('打卡记录更新成功！')
      navigate('/records')
    } catch (error) {
      console.error('Error updating clock-in:', error)
      alert('更新失败，请重试')
    } finally {
      setSubmitting(false)
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
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          ✏️ 编辑打卡
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
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
              图片
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

          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => navigate('/records')}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={submitting || !content.trim()}
              className="bg-primary text-white px-8 py-2 rounded-lg hover:bg-primary-hover transition-colors disabled:bg-gray-300"
            >
              {submitting ? '保存中...' : '保存修改'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EditClockIn
