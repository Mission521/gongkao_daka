import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuthStore } from '../store/authStore'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Pencil, Trash2 } from 'lucide-react'

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
  const navigate = useNavigate()

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定要删除这条打卡记录吗？')) return

    try {
      const { error } = await supabase
        .from('clockins')
        .delete()
        .eq('id', id)

      if (error) throw error

      setRecords((prev) => prev.filter((r) => r.id !== id))
    } catch (error) {
      console.error('Error deleting record:', error)
      alert('删除失败')
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
                    onClick={() => handleDelete(record.id)}
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
    </div>
  )
}

export default Records
