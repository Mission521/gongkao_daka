import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Plus } from 'lucide-react'
import { useAuthStore } from '../store/authStore'

interface Announcement {
  id: string
  title: string
  content: string
  created_at: string
}

const Announcements: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuthStore()

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const { data, error } = await supabase
          .from('announcements')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) throw error
        setAnnouncements(data || [])
      } catch (error) {
        console.error('Error fetching announcements:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAnnouncements()
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">公告列表</h2>
        {user && (
          <Link
            to="/announcements/create"
            className="flex items-center gap-1 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-hover transition-colors text-sm"
          >
            <Plus size={16} />
            发布公告
          </Link>
        )}
      </div>

      <div className="space-y-4">
        {announcements.length > 0 ? (
          announcements.map((announcement) => (
            <div key={announcement.id} className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
              <Link to={`/announcement/${announcement.id}`} className="block">
                <h3 className="text-xl font-bold text-gray-800 mb-2 hover:text-primary transition-colors">
                  {announcement.title}
                </h3>
                <p className="text-gray-600 line-clamp-3 mb-4">
                  {announcement.content}
                </p>
                <div className="text-sm text-gray-400">
                  发布于 {format(new Date(announcement.created_at), 'yyyy年MM月dd日 HH:mm', { locale: zhCN })}
                </div>
              </Link>
            </div>
          ))
        ) : (
          <div className="text-center text-gray-500 py-12 bg-white rounded-lg shadow-sm">
            暂无公告
          </div>
        )}
      </div>
    </div>
  )
}

export default Announcements
