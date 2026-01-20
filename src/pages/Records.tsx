import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuthStore } from '../store/authStore'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Pencil, Trash2 } from 'lucide-react'
import { useUIStore } from '../store/uiStore'
import { ConfirmDialog } from '../components/ConfirmDialog'

interface ClockIn {
  id: string
  content: string
  images: string[]
  created_at: string
}

const Records: React.FC = () => {
  const [records, setRecords] = useState<ClockIn[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuthStore()
  const { addToast } = useUIStore()
  const navigate = useNavigate()
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const confirmDelete = async () => {
    if (!deleteId) return

    try {
      const { error } = await supabase
        .from('clockins')
        .delete()
        .eq('id', deleteId)

      if (error) throw error

      setRecords((prev) => prev.filter((r) => r.id !== deleteId))
      addToast({
        title: '删除成功',
        type: 'success'
      })
    } catch (error) {
      console.error('Error deleting record:', error)
      addToast({
        title: '删除失败',
        message: '操作未能完成，请重试',
        type: 'error'
      })
    } finally {
      setDeleteId(null)
    }
  }

  useEffect(() => {
    const fetchRecords = async () => {
      if (!user) return

      try {
        const { data, error } = await supabase
          .from('clockins')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (error) throw error
        setRecords(data || [])
      } catch (error) {
        console.error('Error fetching records:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchRecords()
  }, [user])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">我的打卡记录</h2>

      <div className="space-y-4">
        {records.length > 0 ? (
          records.map((record) => (
            <div key={record.id} className="bg-white rounded-lg shadow-sm p-6 relative group">
              <div className="flex justify-between items-start mb-4">
                <span className="text-sm text-gray-500">
                  {format(new Date(record.created_at), 'yyyy年MM月dd日 HH:mm', { locale: zhCN })}
                </span>
                
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => navigate(`/clock-in/edit/${record.id}`)}
                    className="p-1 text-gray-500 hover:text-primary hover:bg-gray-100 rounded"
                    title="编辑"
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    onClick={() => setDeleteId(record.id)}
                    className="p-1 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded"
                    title="删除"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              
              <div className="text-gray-700 whitespace-pre-wrap mb-4">{record.content}</div>

              {record.images && record.images.length > 0 && (
                <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                  {record.images.map((img, index) => (
                    <img
                      key={index}
                      src={img}
                      alt={`Record ${index + 1}`}
                      className="rounded-lg object-cover w-full h-32 cursor-pointer hover:opacity-90"
                      onClick={() => window.open(img, '_blank')}
                    />
                  ))}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-center text-gray-500 py-12 bg-white rounded-lg shadow-sm">
            暂无打卡记录
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!deleteId}
        title="删除确认"
        message="您确定要删除这条打卡记录吗？此操作无法撤销。"
        confirmText="确认删除"
        cancelText="取消"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
        type="danger"
      />
    </div>
  )
}

export default Records
