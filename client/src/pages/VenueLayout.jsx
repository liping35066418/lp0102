import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import './VenueLayout.css'

function VenueLayout() {
  const navigate = useNavigate()
  const [venues, setVenues] = useState([])
  const [selectedVenue, setSelectedVenue] = useState(null)
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })
  const [startTime, setStartTime] = useState('10:00')
  const [duration, setDuration] = useState(2)
  const [playerCount, setPlayerCount] = useState(2)
  const [bookedSlots, setBookedSlots] = useState([])
  const [hasConflict, setHasConflict] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadVenues()
  }, [])

  useEffect(() => {
    if (selectedVenue && selectedDate) {
      loadBookedSlots()
    }
  }, [selectedVenue, selectedDate])

  useEffect(() => {
    checkConflict()
  }, [bookedSlots, startTime, duration])

  const loadVenues = async () => {
    try {
      const res = await api.getVenues()
      if (res.code === 0) {
        setVenues(res.data)
        if (res.data.length > 0) {
          setSelectedVenue(res.data[0])
        }
      }
    } catch (err) {
      console.error('加载场地失败', err)
    }
  }

  const loadBookedSlots = async () => {
    if (!selectedVenue) return
    try {
      const res = await api.checkBookings(selectedVenue.id, selectedDate)
      if (res.code === 0) {
        setBookedSlots(res.data)
      }
    } catch (err) {
      console.error('加载预约情况失败', err)
    }
  }

  const checkConflict = () => {
    if (bookedSlots.length === 0) {
      setHasConflict(false)
      return
    }

    const startDate = new Date(`${selectedDate}T${startTime}`)
    const endDate = new Date(startDate.getTime() + duration * 60 * 60 * 1000)

    const conflict = bookedSlots.some((slot) => {
      const slotStart = new Date(slot.start_time)
      const slotEnd = new Date(slot.end_time)
      return startDate < slotEnd && endDate > slotStart
    })

    setHasConflict(conflict)
  }

  const getEndTime = () => {
    const start = new Date(`${selectedDate}T${startTime}`)
    const end = new Date(start.getTime() + duration * 60 * 60 * 1000)
    return end.toTimeString().slice(0, 5)
  }

  const handleVenueClick = (venue) => {
    setSelectedVenue(venue)
  }

  const handleNext = () => {
    if (!selectedVenue || hasConflict) return
    navigate('/equipment', {
      state: {
        venue: selectedVenue,
        date: selectedDate,
        startTime,
        duration,
        playerCount,
      },
    })
  }

  const getVenueTypeColor = (type) => {
    const colors = {
      standard: '#52c41a',
      competitive: '#fa8c16',
      casual: '#1890ff',
      professional: '#722ed1',
      beginner: '#13c2c2',
      vip: '#eb2f96',
    }
    return colors[type] || '#1890ff'
  }

  const timeOptions = []
  for (let h = 9; h <= 21; h++) {
    timeOptions.push(`${h.toString().padStart(2, '0')}:00`)
  }

  const durationOptions = [
    { value: 1, label: '1小时' },
    { value: 1.5, label: '1.5小时' },
    { value: 2, label: '2小时' },
    { value: 2.5, label: '2.5小时' },
    { value: 3, label: '3小时' },
    { value: 4, label: '4小时' },
  ]

  return (
    <div className="venue-layout">
      <div className="page-title">
        <h2>选择对战场地</h2>
        <p>点击场地选择，查看实时可用时段</p>
      </div>

      <div className="venue-container">
        <div className="venue-map card">
          <h3 className="section-title">场馆平面图</h3>
          <div className="map-wrapper">
            <svg viewBox="0 0 680 370" className="venue-svg">
              {venues.map((venue) => (
                <g
                  key={venue.id}
                  onClick={() => handleVenueClick(venue)}
                  className={`venue-rect ${selectedVenue?.id === venue.id ? 'selected' : ''}`}
                >
                  <rect
                    x={venue.position_x}
                    y={venue.position_y}
                    width={venue.width}
                    height={venue.height}
                    rx={8}
                    ry={8}
                    fill={selectedVenue?.id === venue.id ? getVenueTypeColor(venue.type) : '#fafafa'}
                    stroke={getVenueTypeColor(venue.type)}
                    strokeWidth="2"
                  />
                  <text
                    x={venue.position_x + venue.width / 2}
                    y={venue.position_y + venue.height / 2 - 8}
                    textAnchor="middle"
                    fill={selectedVenue?.id === venue.id ? 'white' : '#333'}
                    fontSize="13"
                    fontWeight="500"
                  >
                    {venue.name.split(' - ')[0]}
                  </text>
                  <text
                    x={venue.position_x + venue.width / 2}
                    y={venue.position_y + venue.height / 2 + 12}
                    textAnchor="middle"
                    fill={selectedVenue?.id === venue.id ? 'white' : '#999'}
                    fontSize="11"
                  >
                    ¥{venue.price_per_hour}/时 · {venue.capacity}人
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>

        <div className="booking-panel card">
          <h3 className="section-title">预约信息</h3>

          {selectedVenue && (
            <div className="venue-info">
              <div className="venue-info-header">
                <span
                  className="venue-tag"
                  style={{ background: getVenueTypeColor(selectedVenue.type) }}
                >
                  {selectedVenue.name}
                </span>
              </div>
              <div className="venue-info-detail">
                <span>💰 ¥{selectedVenue.price_per_hour}/小时</span>
                <span>👥 最多{selectedVenue.capacity}人</span>
              </div>
            </div>
          )}

          <div className="form-item">
            <label className="form-label">选择日期</label>
            <input
              type="date"
              className="form-input"
              value={selectedDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>

          <div className="form-item">
            <label className="form-label">开始时间</label>
            <select
              className="form-select"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            >
              {timeOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="form-item">
            <label className="form-label">游玩时长</label>
            <select
              className="form-select"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
            >
              {durationOptions.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
            <p className="end-time-hint">
              结束时间：{getEndTime()}
            </p>
          </div>

          <div className="form-item">
            <label className="form-label">玩家人数</label>
            <input
              type="number"
              className="form-input"
              min="1"
              max={selectedVenue?.capacity || 20}
              value={playerCount}
              onChange={(e) => setPlayerCount(Number(e.target.value))}
            />
          </div>

          {hasConflict && (
            <div className="conflict-warning">
              ⚠️ 该时段已被预约，请选择其他时间
            </div>
          )}

          {!hasConflict && bookedSlots.length > 0 && (
            <div className="available-info">
              ✅ 该时段可用
            </div>
          )}

          <button
            className="btn btn-primary next-btn"
            onClick={handleNext}
            disabled={!selectedVenue || hasConflict}
          >
            下一步：选择装备
          </button>
        </div>
      </div>

      <div className="today-bookings card">
        <h3 className="section-title">当日已预约时段</h3>
        {bookedSlots.length === 0 ? (
          <p className="empty-tip">暂无预约，全天可用</p>
        ) : (
          <div className="booking-slots">
            {bookedSlots.map((slot) => (
              <div key={slot.id} className="slot-item">
                <span className="slot-time">
                  {new Date(slot.start_time).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                  {' - '}
                  {new Date(slot.end_time).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="slot-status">已预约</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default VenueLayout
