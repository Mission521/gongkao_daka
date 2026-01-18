import React, { useEffect, useState, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, parseISO, differenceInDays } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import ReactECharts from 'echarts-for-react'
import * as XLSX from 'xlsx'
import { Download, Filter, Calendar } from 'lucide-react'
import { useAuthStore } from '../store/authStore'

interface ClockInRecord {
  id: string
  content: string
  category: string
  images: string[]
  clockin_date: string
  created_at: string
  users: {
    name: string
    email: string
  }
}

type TimeRange = 'week' | 'month' | 'all'

interface User {
  id: string
  name: string
  email: string
}

const Stats: React.FC = () => {
  const [records, setRecords] = useState<ClockInRecord[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<TimeRange>('week')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedUser, setSelectedUser] = useState<string>('all')
  const { user } = useAuthStore()

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Log access
        if (user) {
          await supabase.from('access_logs').insert([{
            user_id: user.id,
            action: 'view_stats',
            details: { timeRange, selectedCategory, selectedUser }
          }])
        }

        // Fetch users for filter
        const { data: usersData } = await supabase
          .from('users')
          .select('id, name, email')
          .order('name')
        
        if (usersData) {
          setUsers(usersData)
        }

        // Fetch stats
        const { data, error } = await supabase
          .from('clockins')
          .select(`
            id,
            content,
            category,
            images,
            clockin_date,
            created_at,
            users (
              name,
              email
            )
          `)
          .order('created_at', { ascending: false })

        if (error) throw error
        setRecords(data as unknown as ClockInRecord[] || [])
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, []) // Initial load only, logging on filter change can be separate if needed

  // Filter records based on time range and category
  const filteredRecords = useMemo(() => {
    const now = new Date()
    let start: Date | null = null
    let end: Date | null = null

    if (timeRange === 'week') {
      start = subDays(now, 7)
      end = now
    } else if (timeRange === 'month') {
      start = subDays(now, 30)
      end = now
    }

    return records.filter(record => {
      const recordDate = parseISO(record.created_at)
      const matchesTime = start && end ? isWithinInterval(recordDate, { start, end }) : true
      const matchesCategory = selectedCategory === 'all' || record.category === selectedCategory
      
      // Filter by selected user
      // We match by email because clockins join uses email, and we fetched users list.
      // But wait, records join with users, so records have users.name and users.email.
      // We can filter by email.
      const matchesUser = selectedUser === 'all' || record.users.email === selectedUser
      
      return matchesTime && matchesCategory && matchesUser
    })
  }, [records, timeRange, selectedCategory, selectedUser])

  // Calculate Statistics
  const stats = useMemo(() => {
    // If specific user selected, calculate their stats.
    // If 'all' selected, calculate aggregate stats (e.g. total clockins of everyone).
    
    // Total count
    const totalCount = filteredRecords.length

    // Calculate streaks (Only meaningful for single user)
    let currentStreak = 0
    let longestStreak = 0
    
    if (selectedUser !== 'all') {
      const sortedRecords = [...filteredRecords].sort((a, b) => new Date(a.clockin_date).getTime() - new Date(b.clockin_date).getTime())
      
      let tempStreak = 0
      let lastDate: Date | null = null

      for (const record of sortedRecords) {
        const currentDate = parseISO(record.clockin_date)
        
        if (!lastDate) {
          tempStreak = 1
        } else {
          const diff = differenceInDays(currentDate, lastDate)
          if (diff === 1) {
            tempStreak++
          } else if (diff > 1) {
            longestStreak = Math.max(longestStreak, tempStreak)
            tempStreak = 1
          }
        }
        lastDate = currentDate
      }
      longestStreak = Math.max(longestStreak, tempStreak)

      const today = new Date()
      if (lastDate && differenceInDays(today, lastDate) <= 1) {
        currentStreak = tempStreak
      }
    }

    // Completion Rate (Simplified logic)
    // For 'all': Average clock-ins per day? Or just total count.
    // Let's use a target: 1 per day.
    let targetDays = 30
    if (timeRange === 'week') targetDays = 7
    // For 'all', target is targetDays * totalUsers (approx)
    // Let's keep it simple: Show count for All, Rate for Individual.
    
    const completionRate = selectedUser !== 'all' 
      ? ((totalCount / targetDays) * 100).toFixed(1) 
      : '-'

    return {
      totalCount,
      currentStreak: selectedUser !== 'all' ? currentStreak : '-',
      longestStreak: selectedUser !== 'all' ? longestStreak : '-',
      completionRate
    }
  }, [filteredRecords, selectedUser, timeRange])

  // Chart Data Preparation
  const chartOption = useMemo(() => {
    const dateMap = new Map<string, number>()
    
    filteredRecords.forEach(record => {
      const dateStr = format(parseISO(record.created_at), 'MM-dd')
      dateMap.set(dateStr, (dateMap.get(dateStr) || 0) + 1)
    })

    // Fill in missing dates if needed, or just show recorded dates. 
    // For a bar chart, usually better to show continuous dates.
    // Simplifying for now to show existing data points sorted.
    const sortedDates = Array.from(dateMap.keys()).sort()
    
    return {
      tooltip: {
        trigger: 'axis'
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: sortedDates,
        axisTick: {
          alignWithLabel: true
        }
      },
      yAxis: {
        type: 'value',
        minInterval: 1
      },
      series: [
        {
          name: '打卡次数',
          type: 'bar',
          barWidth: '60%',
          data: sortedDates.map(date => dateMap.get(date)),
          itemStyle: {
            color: '#3B82F6'
          }
        }
      ]
    }
  }, [filteredRecords])

  // Export to Excel
  const handleExport = () => {
    const dataToExport = filteredRecords.map(r => ({
      用户: r.users.name,
      邮箱: r.users.email,
      内容: r.content,
      分类: r.category,
      打卡日期: r.clockin_date,
      提交时间: format(parseISO(r.created_at), 'yyyy-MM-dd HH:mm:ss'),
    }))

    const ws = XLSX.utils.json_to_sheet(dataToExport)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "打卡记录")
    XLSX.writeFile(wb, `打卡记录_${format(new Date(), 'yyyyMMdd')}.xlsx`)
  }

  // Pagination Logic
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = filteredRecords.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage)

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">数据统计</h2>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
        >
          <Download size={18} />
          导出Excel
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <div className="text-gray-500 text-sm mb-1">总打卡次数</div>
          <div className="text-3xl font-bold text-primary">{stats.totalCount}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <div className="text-gray-500 text-sm mb-1">当前连续打卡</div>
          <div className="text-3xl font-bold text-green-600">{stats.currentStreak} <span className="text-sm font-normal text-gray-400">天</span></div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <div className="text-gray-500 text-sm mb-1">最长连续纪录</div>
          <div className="text-3xl font-bold text-orange-500">{stats.longestStreak} <span className="text-sm font-normal text-gray-400">天</span></div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <div className="text-gray-500 text-sm mb-1">月度完成率 (30天)</div>
          <div className="text-3xl font-bold text-purple-600">{stats.completionRate}%</div>
        </div>
      </div>

      {/* Filters & Chart */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <div className="flex flex-wrap gap-4 mb-6 justify-between items-center">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-gray-800">打卡趋势</h3>
          </div>
          
          <div className="flex gap-4">
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            >
              <option value="all">所有成员</option>
              {users.map(u => (
                <option key={u.id} value={u.email}>{u.name || u.email}</option>
              ))}
            </select>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            >
              <option value="all">所有分类</option>
              <option value="日常">日常</option>
              <option value="学习">学习</option>
              <option value="运动">运动</option>
              <option value="工作">工作</option>
              <option value="其他">其他</option>
            </select>

            <div className="flex bg-gray-100 rounded-md p-1">
              <button
                onClick={() => setTimeRange('week')}
                className={`px-3 py-1 text-sm rounded-md transition-all ${timeRange === 'week' ? 'bg-white shadow text-primary font-medium' : 'text-gray-500 hover:text-gray-700'}`}
              >
                近7天
              </button>
              <button
                onClick={() => setTimeRange('month')}
                className={`px-3 py-1 text-sm rounded-md transition-all ${timeRange === 'month' ? 'bg-white shadow text-primary font-medium' : 'text-gray-500 hover:text-gray-700'}`}
              >
                近30天
              </button>
              <button
                onClick={() => setTimeRange('all')}
                className={`px-3 py-1 text-sm rounded-md transition-all ${timeRange === 'all' ? 'bg-white shadow text-primary font-medium' : 'text-gray-500 hover:text-gray-700'}`}
              >
                全部
              </button>
            </div>
          </div>
        </div>

        <ReactECharts option={chartOption} style={{ height: 350 }} />
      </div>

      {/* History Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-800">详细记录</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  打卡时间
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  分类
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  内容
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  图片
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentItems.length > 0 ? (
                currentItems.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {format(parseISO(record.created_at), 'yyyy-MM-dd HH:mm', { locale: zhCN })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                        {record.category || '日常'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 line-clamp-2 max-w-xs">{record.content}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {record.images && record.images.length > 0 ? `${record.images.length} 张` : '无'}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-500">
                    暂无符合条件的记录
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
              >
                上一页
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
              >
                下一页
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  显示第 <span className="font-medium">{indexOfFirstItem + 1}</span> 到 <span className="font-medium">{Math.min(indexOfLastItem, filteredRecords.length)}</span> 条，
                  共 <span className="font-medium">{filteredRecords.length}</span> 条
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:bg-gray-100"
                  >
                    上一页
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        page === currentPage
                          ? 'z-10 bg-primary border-primary text-white'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:bg-gray-100"
                  >
                    下一页
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Stats
