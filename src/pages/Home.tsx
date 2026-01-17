import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'

interface Announcement {
  id: string
  title: string
  content: string
  created_at: string
}

interface ClockIn {
  id: string
  content: string
  images: string[]
  created_at: string
  users: {
    name: string
    email: string
  }
}

const Home: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [clockIns, setClockIns] = useState<ClockIn[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch latest 3 announcements
        const { data: announcementsData } = await supabase
          .from('announcements')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(3)

        if (announcementsData) {
          setAnnouncements(announcementsData)
        }

        // Fetch latest 10 clock-ins
        // Note: We need to join with users table to get user name
        const { data: clockInsData, error } = await supabase
          .from('clockins')
          .select(`
            id,
            content,
            images,
            created_at,
            users (
              name,
              email
            )
          `)
          .order('created_at', { ascending: false })
          .limit(10)

        if (error) {
          console.error('Error fetching clockins:', error)
        }

        if (clockInsData) {
          // Type assertion needed because Supabase types might not perfectly match
          setClockIns(clockInsData as unknown as ClockIn[])
        }
      } catch (error) {
        console.error('Error loading home data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Announcements Section */}
      <section className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            📢 最新公告
          </h2>
          <Link to="/announcements" className="text-sm text-primary hover:underline">
            查看更多
          </Link>
        </div>
        
        {announcements.length > 0 ? (
          <div className="space-y-4">
            {announcements.map((announcement) => (
              <div key={announcement.id} className="border-b border-gray-100 last:border-0 pb-3 last:pb-0">
                <Link to={`/announcement/${announcement.id}`} className="block group">
                  <h3 className="font-medium text-gray-800 group-hover:text-primary transition-colors">
                    {announcement.title}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                    {announcement.content}
                  </p>
                  <span className="text-xs text-gray-400 mt-2 block">
                    {format(new Date(announcement.created_at), 'yyyy年MM月dd日 HH:mm', { locale: zhCN })}
                  </span>
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-500 py-8">
            暂无公告
          </div>
        )}
      </section>

      {/* Clock-in Feed Section */}
      <section>
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          ⏱️ 打卡动态
        </h2>
        
        {clockIns.length > 0 ? (
          <div className="space-y-4">
            {clockIns.map((clockIn) => (
              <div key={clockIn.id} className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
                      {clockIn.users?.name?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-800">{clockIn.users?.name || '未知用户'}</h3>
                      <span className="text-xs text-gray-400">
                        {format(new Date(clockIn.created_at), 'yyyy年MM月dd日 HH:mm', { locale: zhCN })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="text-gray-700 whitespace-pre-wrap">{clockIn.content}</div>
                  
                  {clockIn.images && clockIn.images.length > 0 && (
                    <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-2">
                      {clockIn.images.map((img, index) => (
                        <img
                          key={index}
                          src={img}
                          alt={`打卡图片 ${index + 1}`}
                          className="rounded-lg object-cover w-full h-48 cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => window.open(img, '_blank')}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-500 py-12 bg-white rounded-lg shadow-sm">
            还没有人打卡，快去<Link to="/clock-in" className="text-primary hover:underline">打卡</Link>吧！
          </div>
        )}
      </section>
    </div>
  )
}

export default Home
