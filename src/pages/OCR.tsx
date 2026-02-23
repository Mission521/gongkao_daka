import React, { useState } from 'react'
import Tesseract from 'tesseract.js'
import { Upload, FileText, Save, Copy } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { useAuthStore } from '../store/authStore'
import { useUIStore } from '../store/uiStore'
import { useNavigate } from 'react-router-dom'

const OCR: React.FC = () => {
  const [image, setImage] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const { user } = useAuthStore()
  const { addToast } = useUIStore()
  const navigate = useNavigate()

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setImage(URL.createObjectURL(file))
      setText('')
      setProgress(0)
      recognizeText(file)
    }
  }

  const recognizeText = async (file: File) => {
    setLoading(true)
    try {
      const result = await Tesseract.recognize(
        file,
        'chi_sim+eng', // Chinese Simplified + English
        {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              setProgress(Math.floor(m.progress * 100))
            }
          },
        }
      )
      setText(result.data.text)
    } catch (error) {
      console.error('OCR Error:', error)
      addToast({ type: 'error', title: '识别失败', message: '识别失败，请重试' })
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    addToast({ type: 'success', title: '复制成功', message: '已复制到剪贴板' })
  }

  const handleSaveAsClockIn = async () => {
    if (!user || !text.trim()) return

    try {
      const { error } = await supabase.from('clockins').insert([
        {
          user_id: user.id,
          content: `[OCR识别结果]\n${text}`,
        },
      ])

      if (error) throw error
      addToast({ type: 'success', title: '保存成功', message: '已保存到打卡记录' })
      navigate('/')
    } catch (error) {
      console.error('Error saving OCR result:', error)
      addToast({ type: 'error', title: '保存失败', message: '保存失败，请重试' })
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        📷 图片文字识别 (OCR)
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Column: Image Upload */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-medium text-gray-800 mb-4">1. 上传图片</h3>
            
            <label className="border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center h-64 cursor-pointer hover:border-primary hover:text-primary transition-colors bg-gray-50">
              {image ? (
                <img src={image} alt="Preview" className="h-full w-full object-contain rounded-lg" />
              ) : (
                <>
                  <Upload size={48} className="mb-4 text-gray-400" />
                  <span className="text-gray-500">点击上传图片</span>
                  <span className="text-xs text-gray-400 mt-2">支持 JPG, PNG</span>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Right Column: Result */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow-sm p-6 h-full flex flex-col">
            <h3 className="text-lg font-medium text-gray-800 mb-4 flex justify-between items-center">
              <span>2. 识别结果</span>
              {loading && <span className="text-sm text-primary">{progress}%</span>}
            </h3>

            <div className="flex-1 border border-gray-200 rounded-lg p-4 bg-gray-50 min-h-[16rem] whitespace-pre-wrap overflow-y-auto">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
                  正在识别中...
                </div>
              ) : text ? (
                text
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <FileText size={48} className="mb-2" />
                  暂无识别内容
                </div>
              )}
            </div>

            <div className="mt-4 flex gap-3">
              <button
                onClick={handleCopy}
                disabled={!text}
                className="flex-1 flex items-center justify-center gap-2 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Copy size={16} />
                复制
              </button>
              <button
                onClick={handleSaveAsClockIn}
                disabled={!text}
                className="flex-1 flex items-center justify-center gap-2 bg-primary text-white py-2 rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={16} />
                保存到打卡
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OCR
