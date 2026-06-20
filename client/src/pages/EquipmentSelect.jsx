import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { api } from '../api'
import './EquipmentSelect.css'

function EquipmentSelect() {
  const location = useLocation()
  const navigate = useNavigate()
  const bookingInfo = location.state

  const [categories, setCategories] = useState([])
  const [equipments, setEquipments] = useState([])
  const [selectedEquip, setSelectedEquip] = useState({})
  const [activeCategory, setActiveCategory] = useState('')

  useEffect(() => {
    if (!bookingInfo) {
      navigate('/')
      return
    }
    loadCategories()
  }, [])

  useEffect(() => {
    if (activeCategory) {
      loadEquipments(activeCategory)
    }
  }, [activeCategory])

  const loadCategories = async () => {
    try {
      const res = await api.getEquipmentCategories()
      if (res.code === 0 && res.data.length > 0) {
        setCategories(res.data)
        setActiveCategory(res.data[0].key)
      }
    } catch (err) {
      console.error('加载装备分类失败', err)
    }
  }

  const loadEquipments = async (category) => {
    try {
      const res = await api.getEquipments(category)
      if (res.code === 0) {
        setEquipments(res.data)
      }
    } catch (err) {
      console.error('加载装备列表失败', err)
    }
  }

  const handleQuantityChange = (equipId, delta) => {
    setSelectedEquip((prev) => {
      const current = prev[equipId] || 0
      const newValue = Math.max(0, current + delta)
      return {
        ...prev,
        [equipId]: newValue,
      }
    })
  }

  const getSelectedEquipList = () => {
    return Object.entries(selectedEquip)
      .filter(([, qty]) => qty > 0)
      .map(([id, quantity]) => {
        const equip = [...equipments].find((e) => e.id === Number(id))
        return {
          id: Number(id),
          quantity,
          name: equip?.name,
          price_per_hour: equip?.price_per_hour,
          category: equip?.category,
        }
      })
      .filter((e) => e.name)
  }

  const handleNext = () => {
    navigate('/bill', {
      state: {
        ...bookingInfo,
        equipments: getSelectedEquipList(),
      },
    })
  }

  const handleBack = () => {
    navigate(-1)
  }

  const getCategoryIcon = (key) => {
    const icons = {
      helmet: '🪖',
      protector: '🦺',
      modification: '🔧',
    }
    return icons[key] || '📦'
  }

  if (!bookingInfo) return null

  return (
    <div className="equipment-select">
      <div className="page-title">
        <h2>租赁装备</h2>
        <p>到店可额外租赁装备，系统自动叠加费用</p>
      </div>

      <div className="equipment-container">
        <div className="equipment-main card">
          <div className="category-tabs">
            {categories.map((cat) => (
              <button
                key={cat.key}
                className={`category-tab ${activeCategory === cat.key ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat.key)}
              >
                <span className="tab-icon">{getCategoryIcon(cat.key)}</span>
                {cat.label}
              </button>
            ))}
          </div>

          <div className="equipment-grid">
            {equipments.map((equip) => (
              <div key={equip.id} className="equip-card">
                <div className="equip-icon">{getCategoryIcon(equip.category)}</div>
                <div className="equip-info">
                  <h4 className="equip-name">{equip.name}</h4>
                  <p className="equip-desc">{equip.description}</p>
                  <p className="equip-price">¥{equip.price_per_hour}/小时</p>
                  <p className="equip-stock">库存: {equip.stock}件</p>
                </div>
                <div className="quantity-control">
                  <button
                    className="qty-btn"
                    onClick={() => handleQuantityChange(equip.id, -1)}
                    disabled={!selectedEquip[equip.id]}
                  >
                    -
                  </button>
                  <span className="qty-value">{selectedEquip[equip.id] || 0}</span>
                  <button
                    className="qty-btn"
                    onClick={() => handleQuantityChange(equip.id, 1)}
                    disabled={selectedEquip[equip.id] >= equip.stock}
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="equipment-summary card">
          <h3 className="section-title">预约摘要</h3>
          
          <div className="summary-item">
            <span className="summary-label">场地</span>
            <span className="summary-value">{bookingInfo.venue?.name}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">日期</span>
            <span className="summary-value">{bookingInfo.date}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">时间</span>
            <span className="summary-value">
              {bookingInfo.startTime} - {(() => {
                const start = new Date(`${bookingInfo.date}T${bookingInfo.startTime}`)
                const end = new Date(start.getTime() + bookingInfo.duration * 60 * 60 * 1000)
                return end.toTimeString().slice(0, 5)
              })()}
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-label">时长</span>
            <span className="summary-value">{bookingInfo.duration}小时</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">人数</span>
            <span className="summary-value">{bookingInfo.playerCount}人</span>
          </div>

          {getSelectedEquipList().length > 0 && (
            <>
              <div className="summary-divider"></div>
              <h4 className="summary-subtitle">已选装备</h4>
              {getSelectedEquipList().map((eq) => (
                <div key={eq.id} className="summary-item">
                  <span className="summary-label">{eq.name} × {eq.quantity}</span>
                  <span className="summary-value">
                    ¥{(eq.price_per_hour * bookingInfo.duration * eq.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </>
          )}

          <div className="summary-divider"></div>
          <div className="summary-total">
            <span>场地费</span>
            <span>¥{(bookingInfo.venue?.price_per_hour * bookingInfo.duration).toFixed(2)}</span>
          </div>
          <div className="summary-total">
            <span>装备费</span>
            <span>
              ¥{getSelectedEquipList().reduce((sum, eq) => sum + eq.price_per_hour * bookingInfo.duration * eq.quantity, 0).toFixed(2)}
            </span>
          </div>

          <button className="btn btn-primary next-btn" onClick={handleNext}>
            下一步：核对账单
          </button>
          <button className="btn btn-default back-btn" onClick={handleBack}>
            返回选择场地
          </button>
        </div>
      </div>
    </div>
  )
}

export default EquipmentSelect
