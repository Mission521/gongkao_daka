import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { ArrowLeft } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Announcement {
  id: string
  title: string
  content: string
  created_at: string
}

const AnnouncementDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const [announcement, setAnnouncement] = useState<Announcement | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDetail = async () => {
      if (!id) return

      try {
        const { data, error } = await supabase
          .from('announcements')
          .select('*')
          .eq('id', id)
          .single()

        if (error) throw error
        setAnnouncement(data)
      } catch (error) {
        console.error('Error fetching announcement detail:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDetail()
  }, [id])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!announcement) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">公告未找到</h2>
        <Link to="/announcements" className="text-primary hover:underline">
          返回列表
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Link to="/announcements" className="inline-flex items-center text-gray-500 hover:text-primary mb-6 transition-colors">
        <ArrowLeft size={20} className="mr-1" />
        返回列表
      </Link>

      <article className="bg-white rounded-lg shadow-md p-8">
        <header className="mb-6 border-b pb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {announcement.title}
          </h1>
          <time className="text-gray-500">
            {format(new Date(announcement.created_at), 'yyyy年MM月dd日 HH:mm', { locale: zhCN })}
          </time>
        </header>

        <div className="prose prose-blue max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{announcement.content}</ReactMarkdown>
        </div>
      </article>
    </div>
  )
}

export default AnnouncementDetail
