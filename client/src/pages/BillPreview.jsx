import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { api } from '../api'
import './BillPreview.css'

function BillPreview() {
  const location = useLocation()
  const navigate = useNavigate()
  const bookingInfo = location.state

  const [billData, setBillData] = useState(null)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [bookingSuccess, setBookingSuccess] = useState(null)

  useEffect(() => {
    if (!bookingInfo) {
      navigate('/')
      return
    }
    calculateBill()
  }, [])

  const calculateBill = async () => {
    if (!bookingInfo?.venue) return

    const start = new Date(`${bookingInfo.date}T${bookingInfo.startTime}`)
    const end = new Date(start.getTime() + bookingInfo.duration * 60 * 60 * 1000)

    try {
      const res = await api.calculateFee({
        venue_id: bookingInfo.venue.id,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        equipments: bookingInfo.equipments?.map((e) => ({ id: e.id, quantity: e.quantity })) || [],
        player_count: bookingInfo.playerCount,
      })
      if (res.code === 0) {
        setBillData(res.data)
      }
    } catch (err) {
      console.error('计算费用失败', err)
    }
  }

  const handleSubmit = async () => {
    if (!customerName.trim()) {
      alert('请输入您的姓名')
      return
    }

    setSubmitting(true)
    const start = new Date(`${bookingInfo.date}T${bookingInfo.startTime}`)
    const end = new Date(start.getTime() + bookingInfo.duration * 60 * 60 * 1000)

    try {
      const res = await api.createBooking({
        venue_id: bookingInfo.venue.id,
        customer_name: customerName,
        customer_phone: customerPhone,
        player_count: bookingInfo.playerCount,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        equipments: bookingInfo.equipments?.map((e) => ({ id: e.id, quantity: e.quantity })) || [],
      })

      if (res.code === 0) {
        setBookingSuccess(res.data)
      } else {
        alert(res.message || '预约失败')
      }
    } catch (err) {
      console.error('提交预约失败', err)
      alert('预约失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  const handleBack = () => {
    navigate(-1)
  }

  const handleViewBookings = () => {
    navigate('/bookings')
  }

  const handleBackHome = () => {
    navigate('/')
  }

  if (!bookingInfo) return null

  if (bookingSuccess) {
    return (
      <div className="bill-preview">
        <div className="success-card card">
          <div className="success-icon">✅</div>
          <h2 className="success-title">预约成功！</h2>
          <p className="success-subtitle">我们已为您确认预约，期待您的光临</p>

          <div className="success-details">
            <div className="detail-row">
              <span className="detail-label">预约编号</span>
              <span className="detail-value">#{bookingSuccess.id}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">场地</span>
              <span className="detail-value">{bookingInfo.venue?.name}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">日期时间</span>
              <span className="detail-value">
                {bookingInfo.date} {bookingInfo.startTime}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">玩家人数</span>
              <span className="detail-value">{bookingInfo.playerCount}人</span>
            </div>
            <div className="detail-row total">
              <span className="detail-label">实付金额</span>
              <span className="detail-value price">¥{bookingSuccess.total_amount?.toFixed(2)}</span>
            </div>
          </div>

          <div className="success-actions">
            <button className="btn btn-primary" onClick={handleViewBookings}>
              查看我的预约
            </button>
            <button className="btn btn-default" onClick={handleBackHome}>
              返回首页
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bill-preview">
      <div className="page-title">
        <h2>核对账单</h2>
        <p>请确认以下信息无误后提交预约</p>
      </div>

      <div className="bill-container">
        <div className="bill-main card">
          <h3 className="section-title">预约信息</h3>

          <div className="bill-section">
            <div className="bill-row">
              <span className="bill-label">对战场地</span>
              <span className="bill-value">{bookingInfo.venue?.name}</span>
            </div>
            <div className="bill-row">
              <span className="bill-label">预约日期</span>
              <span className="bill-value">{bookingInfo.date}</span>
            </div>
            <div className="bill-row">
              <span className="bill-label">游玩时段</span>
              <span className="bill-value">
                {bookingInfo.startTime} - {(() => {
                  const start = new Date(`${bookingInfo.date}T${bookingInfo.startTime}`)
                  const end = new Date(start.getTime() + bookingInfo.duration * 60 * 60 * 1000)
                  return end.toTimeString().slice(0, 5)
                })()}
              </span>
            </div>
            <div className="bill-row">
              <span className="bill-label">游玩时长</span>
              <span className="bill-value">{billData?.totalHours || bookingInfo.duration}小时</span>
            </div>
            <div className="bill-row">
              <span className="bill-label">玩家人数</span>
              <span className="bill-value">{bookingInfo.playerCount}人</span>
            </div>
          </div>

          <div className="bill-section">
            <h4 className="section-subtitle">场地费用</h4>
            <div className="bill-row">
              <span className="bill-label">
                {bookingInfo.venue?.name} × {billData?.totalHours || bookingInfo.duration}小时
              </span>
              <span className="bill-value">¥{billData?.venueFee?.toFixed(2) || '0.00'}</span>
            </div>
          </div>

          {bookingInfo.equipments?.length > 0 && (
            <div className="bill-section">
              <h4 className="section-subtitle">租赁装备</h4>
              {billData?.equipmentDetails?.map((eq) => (
                <div key={eq.id} className="bill-row">
                  <span className="bill-label">
                    {eq.name} × {eq.quantity} × {eq.hours}小时
                  </span>
                  <span className="bill-value">¥{eq.subtotal?.toFixed(2)}</span>
                </div>
              ))}
              <div className="bill-row subtotal">
                <span className="bill-label">装备小计</span>
                <span className="bill-value">¥{billData?.equipmentFee?.toFixed(2) || '0.00'}</span>
              </div>
            </div>
          )}

          {billData?.discount?.amount > 0 && (
            <div className="bill-section discount-section">
              <h4 className="section-subtitle">优惠信息</h4>
              <div className="bill-row discount">
                <span className="bill-label">
                  🏷️ {billData.discount.name}
                  {billData.discount.type === 'percentage' && ` (${billData.discount.value}% off)`}
                </span>
                <span className="bill-value discount-value">
                  -¥{billData.discount.amount?.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          <div className="bill-section customer-section">
            <h4 className="section-subtitle">预约人信息</h4>
            <div className="form-item">
              <label className="form-label">姓名 *</label>
              <input
                type="text"
                className="form-input"
                placeholder="请输入您的姓名"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>
            <div className="form-item">
              <label className="form-label">联系电话</label>
              <input
                type="tel"
                className="form-input"
                placeholder="请输入联系电话"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="bill-summary card">
          <h3 className="section-title">费用总计</h3>

          <div className="summary-row">
            <span>场地费用</span>
            <span>¥{billData?.venueFee?.toFixed(2) || '0.00'}</span>
          </div>
          <div className="summary-row">
            <span>装备租赁</span>
            <span>¥{billData?.equipmentFee?.toFixed(2) || '0.00'}</span>
          </div>

          {billData?.discount?.amount > 0 && (
            <div className="summary-row discount">
              <span>组队优惠</span>
              <span>-¥{billData.discount.amount?.toFixed(2)}</span>
            </div>
          )}

          <div className="summary-divider"></div>

          <div className="summary-total">
            <span>应付金额</span>
            <span className="total-price">¥{billData?.totalAmount?.toFixed(2) || '0.00'}</span>
          </div>

          {billData?.has_conflict && (
            <div className="conflict-warning">
              ⚠️ 该时段已被预约，请返回重新选择
            </div>
          )}

          <button
            className="btn btn-primary submit-btn"
            onClick={handleSubmit}
            disabled={submitting || billData?.has_conflict || !customerName.trim()}
          >
            {submitting ? '提交中...' : '确认预约'}
          </button>
          <button className="btn btn-default back-btn" onClick={handleBack}>
            返回修改
          </button>
        </div>
      </div>
    </div>
  )
}

export default BillPreview
