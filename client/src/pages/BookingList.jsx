import { useState, useEffect } from 'react'
import { api } from '../api'
import './BookingList.css'

function BookingList() {
  const [bookings, setBookings] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(false)
  const [filterDate, setFilterDate] = useState('')

  useEffect(() => {
    loadData()
  }, [filterDate])

  const loadData = async () => {
    setLoading(true)
    try {
      const params = {}
      if (filterDate) params.date = filterDate
      const [bookingsRes, statsRes] = await Promise.all([
        api.getBookings(params),
        api.getBookingStats(params),
      ])
      if (bookingsRes.code === 0) {
        setBookings(bookingsRes.data)
      }
      if (statsRes.code === 0) {
        setStats(statsRes.data)
      }
    } catch (err) {
      console.error('加载数据失败', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async (id) => {
    if (!confirm('确定要取消这个预约吗？')) return
    try {
      const res = await api.cancelBooking(id)
      if (res.code === 0) {
        alert('取消成功')
        loadData()
      }
    } catch (err) {
      console.error('取消预约失败', err)
    }
  }

  const handleComplete = async (id) => {
    if (!confirm('确定要标记为已完成吗？')) return
    try {
      const res = await api.completeBooking(id)
      if (res.code === 0) {
        alert('已标记完成')
        loadData()
      }
    } catch (err) {
      console.error('标记完成失败', err)
    }
  }

  const getStatusText = (status) => {
    const map = {
      confirmed: '已确认',
      cancelled: '已取消',
      completed: '已完成',
    }
    return map[status] || status
  }

  const getStatusClass = (status) => {
    return `status-${status}`
  }

  const formatDateTime = (dateStr) => {
    const date = new Date(dateStr)
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
  }

  return (
    <div className="booking-list">
      <div className="page-header">
        <h2 className="page-title">我的预约</h2>
        <div className="filter-bar">
          <input
            type="date"
            className="form-input filter-input"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            placeholder="选择日期筛选"
          />
          {filterDate && (
            <button className="btn btn-default" onClick={() => setFilterDate('')}>
              清除筛选
            </button>
          )}
        </div>
      </div>

      {stats && (
        <div className="stats-overview">
          <div className="stat-card card">
            <div className="stat-icon icon-bookings">📋</div>
            <div className="stat-content">
              <div className="stat-label">预约总数</div>
              <div className="stat-value">{stats.total_count}</div>
            </div>
          </div>
          <div className="stat-card card">
            <div className="stat-icon icon-revenue">💰</div>
            <div className="stat-content">
              <div className="stat-label">有效预约总金额</div>
              <div className="stat-value stat-money">¥{stats.valid_total_amount?.toFixed(2)}</div>
            </div>
          </div>
          <div className="stat-card card">
            <div className="stat-icon icon-average">📊</div>
            <div className="stat-content">
              <div className="stat-label">平均每单金额</div>
              <div className="stat-value stat-money">¥{stats.avg_amount?.toFixed(2)}</div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading">加载中...</div>
      ) : bookings.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-icon">📋</div>
          <p>暂无预约记录</p>
        </div>
      ) : (
        <div className="booking-cards">
          {bookings.map((booking) => (
            <div key={booking.id} className="booking-card card">
              <div className="booking-header">
                <h3 className="booking-venue">{booking.venue_name}</h3>
                <span className={`booking-status ${getStatusClass(booking.status)}`}>
                  {getStatusText(booking.status)}
                </span>
              </div>

              <div className="booking-body">
                <div className="booking-info">
                  <span className="info-icon">🕐</span>
                  <span>
                    {formatDateTime(booking.start_time)} - {formatDateTime(booking.end_time)}
                  </span>
                </div>
                <div className="booking-info">
                  <span className="info-icon">⏱️</span>
                  <span>{booking.total_hours}小时</span>
                </div>
                <div className="booking-info">
                  <span className="info-icon">👤</span>
                  <span>{booking.customer_name}</span>
                </div>
                <div className="booking-info">
                  <span className="info-icon">👥</span>
                  <span>{booking.player_count}人</span>
                </div>
              </div>

              <div className="booking-footer">
                <div className="booking-total">
                  <span className="total-label">总金额</span>
                  <span className="total-price">¥{booking.total_amount?.toFixed(2)}</span>
                </div>
                <div className="booking-actions">
                  {booking.status === 'confirmed' && (
                    <>
                      <button
                        className="btn btn-primary btn-complete"
                        onClick={() => handleComplete(booking.id)}
                      >
                        标记完成
                      </button>
                      <button
                        className="btn btn-default btn-cancel"
                        onClick={() => handleCancel(booking.id)}
                      >
                        取消预约
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default BookingList
