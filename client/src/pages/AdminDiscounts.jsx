import { useState, useEffect } from 'react'
import { api } from '../api'
import './AdminDiscounts.css'

function AdminDiscounts() {
  const [discounts, setDiscounts] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editingDiscount, setEditingDiscount] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    min_players: '',
    max_players: '',
    discount_type: 'percentage',
    discount_value: '',
    description: '',
  })
  const [testPlayers, setTestPlayers] = useState(5)
  const [testVenueFee, setTestVenueFee] = useState(200)
  const [testDuration, setTestDuration] = useState(2)
  const [testEquipFee, setTestEquipFee] = useState(50)
  const [testResult, setTestResult] = useState(null)

  useEffect(() => {
    loadDiscounts()
  }, [])

  const loadDiscounts = async () => {
    try {
      const res = await api.getDiscounts()
      if (res.code === 0) {
        setDiscounts(res.data)
      }
    } catch (err) {
      console.error('加载优惠配置失败', err)
    }
  }

  const handleAdd = () => {
    setEditingDiscount(null)
    setFormData({
      name: '',
      min_players: '',
      max_players: '',
      discount_type: 'percentage',
      discount_value: '',
      description: '',
    })
    setShowModal(true)
  }

  const handleEdit = (discount) => {
    setEditingDiscount(discount)
    setFormData({
      name: discount.name,
      min_players: discount.min_players,
      max_players: discount.max_players || '',
      discount_type: discount.discount_type,
      discount_value: discount.discount_value,
      description: discount.description || '',
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('确定要删除这个优惠吗？')) return
    try {
      const res = await api.deleteDiscount(id)
      if (res.code === 0) {
        alert('删除成功')
        loadDiscounts()
      }
    } catch (err) {
      console.error('删除优惠失败', err)
    }
  }

  const handleSubmit = async () => {
    if (!formData.name || formData.min_players === '' || formData.discount_value === '') {
      alert('请填写完整信息')
      return
    }

    try {
      const data = {
        ...formData,
        min_players: Number(formData.min_players),
        max_players: formData.max_players ? Number(formData.max_players) : null,
        discount_value: Number(formData.discount_value),
      }

      let res
      if (editingDiscount) {
        res = await api.updateDiscount(editingDiscount.id, data)
      } else {
        res = await api.createDiscount(data)
      }

      if (res.code === 0) {
        alert(editingDiscount ? '更新成功' : '创建成功')
        setShowModal(false)
        loadDiscounts()
      } else {
        alert(res.message || '操作失败')
      }
    } catch (err) {
      console.error('提交失败', err)
      alert('操作失败')
    }
  }

  const runTest = async () => {
    try {
      const now = new Date()
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 10, 0)
      const end = new Date(start.getTime() + testDuration * 60 * 60 * 1000)

      const venuesRes = await api.getVenues()
      if (venuesRes.code !== 0 || venuesRes.data.length === 0) return

      const venueId = venuesRes.data[0].id

      const res = await api.calculateFee({
        venue_id: venueId,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        equipments: [],
        player_count: testPlayers,
        venue_price: testVenueFee,
        equipment_fee: testEquipFee,
      })

      if (res.code === 0) {
        setTestResult(res.data)
      }
    } catch (err) {
      console.error('测试计算失败', err)
    }
  }

  useEffect(() => {
    if (discounts.length > 0) {
      runTest()
    }
  }, [testPlayers, testDuration, testEquipFee, testVenueFee, discounts])

  const getApplicableDiscount = (playerCount) => {
    const applicable = discounts
      .filter(
        (d) =>
          d.status === 'active' &&
          d.min_players <= playerCount &&
          (d.max_players == null || d.max_players >= playerCount)
      )
      .sort((a, b) => b.min_players - a.min_players)
    return applicable[0] || null
  }

  const resultVenueFee = testResult ? testResult.venueFee : testVenueFee * testDuration
  const resultEquipmentFee = testResult ? testResult.equipmentFee : testEquipFee
  const resultSubtotal = resultVenueFee + resultEquipmentFee
  const resultDiscount = testResult?.discount
  const resultDiscountAmount = resultDiscount ? resultDiscount.amount : 0
  const resultTotal = testResult ? testResult.totalAmount : resultSubtotal - resultDiscountAmount
  const resultHours = testResult ? testResult.totalHours : testDuration

  return (
    <div className="admin-discounts">
      <div className="page-header">
        <h2 className="page-title">后台管理 - 多人组队优惠</h2>
        <button className="btn btn-primary" onClick={handleAdd}>
          + 新增优惠
        </button>
      </div>

      <div className="admin-grid">
        <div className="discount-list-card card">
          <h3 className="section-title">优惠配置列表</h3>
          {discounts.length === 0 ? (
            <p className="empty-tip">暂无优惠配置</p>
          ) : (
            <div className="discount-table">
              <table>
                <thead>
                  <tr>
                    <th>优惠名称</th>
                    <th>人数范围</th>
                    <th>优惠类型</th>
                    <th>优惠值</th>
                    <th>状态</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {discounts.map((d) => (
                    <tr key={d.id}>
                      <td className="name-cell">{d.name}</td>
                      <td>
                        {d.min_players} - {d.max_players || '不限'}人
                      </td>
                      <td>{d.discount_type === 'percentage' ? '百分比折扣' : '固定金额'}</td>
                      <td>
                        {d.discount_type === 'percentage'
                          ? `${d.discount_value}% off`
                          : `¥${d.discount_value}`}
                      </td>
                      <td>
                        <span className={`status-badge ${d.status}`}>
                          {d.status === 'active' ? '启用' : '停用'}
                        </span>
                      </td>
                      <td className="actions">
                        <button className="link-btn" onClick={() => handleEdit(d)}>
                          编辑
                        </button>
                        <button className="link-btn danger" onClick={() => handleDelete(d.id)}>
                          删除
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="test-panel card">
          <h3 className="section-title">💰 账单计算校验</h3>
          <p className="panel-desc">随意搭配人数和装备，实时核对账单计算结果</p>

          <div className="test-form">
            <div className="form-item">
              <label className="form-label">玩家人数</label>
              <input
                type="number"
                className="form-input"
                min="1"
                value={testPlayers}
                onChange={(e) => setTestPlayers(Number(e.target.value))}
              />
            </div>
            <div className="form-item">
              <label className="form-label">场地单价 (元/小时)</label>
              <input
                type="number"
                className="form-input"
                min="0"
                value={testVenueFee}
                onChange={(e) => setTestVenueFee(Number(e.target.value))}
              />
            </div>
            <div className="form-item">
              <label className="form-label">游玩时长 (小时)</label>
              <input
                type="number"
                className="form-input"
                min="0.5"
                step="0.5"
                value={testDuration}
                onChange={(e) => setTestDuration(Number(e.target.value))}
              />
            </div>
            <div className="form-item">
              <label className="form-label">装备租赁总费用 (元)</label>
              <input
                type="number"
                className="form-input"
                min="0"
                value={testEquipFee}
                onChange={(e) => setTestEquipFee(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="test-result">
            <h4 className="result-title">计算结果</h4>
            <div className="result-row">
              <span>场地费 (¥{testVenueFee} × {resultHours}h)</span>
              <span>¥{resultVenueFee.toFixed(2)}</span>
            </div>
            <div className="result-row">
              <span>装备费</span>
              <span>¥{resultEquipmentFee.toFixed(2)}</span>
            </div>
            <div className="result-row subtotal">
              <span>小计</span>
              <span>¥{resultSubtotal.toFixed(2)}</span>
            </div>
            {resultDiscount && resultDiscount.id && (
              <div className="result-row discount">
                <span>🏷️ {resultDiscount.name}</span>
                <span>-¥{resultDiscountAmount.toFixed(2)}</span>
              </div>
            )}
            {(!resultDiscount || !resultDiscount.id) && testPlayers > 0 && (
              <div className="result-row no-discount">
                <span>暂无适用优惠</span>
                <span>-</span>
              </div>
            )}
            <div className="result-divider"></div>
            <div className="result-total">
              <span>应付总金额</span>
              <span className="total-amount">¥{resultTotal.toFixed(2)}</span>
            </div>
          </div>

          <div className="tip-box">
            <p>💡 校验提示：</p>
            <ul>
              <li>组队优惠按人数自动匹配最高档</li>
              <li>折扣后金额不低于0元</li>
              <li>不满半小时按半小时计算</li>
            </ul>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal card" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">{editingDiscount ? '编辑优惠' : '新增优惠'}</h3>

            <div className="form-item">
              <label className="form-label">优惠名称 *</label>
              <input
                type="text"
                className="form-input"
                placeholder="如：3人组队9折"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="form-row">
              <div className="form-item">
                <label className="form-label">最少人数 *</label>
                <input
                  type="number"
                  className="form-input"
                  min="1"
                  value={formData.min_players}
                  onChange={(e) => setFormData({ ...formData, min_players: e.target.value })}
                />
              </div>
              <div className="form-item">
                <label className="form-label">最多人数</label>
                <input
                  type="number"
                  className="form-input"
                  min="1"
                  placeholder="不填表示不限"
                  value={formData.max_players}
                  onChange={(e) => setFormData({ ...formData, max_players: e.target.value })}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-item">
                <label className="form-label">优惠类型 *</label>
                <select
                  className="form-select"
                  value={formData.discount_type}
                  onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })}
                >
                  <option value="percentage">百分比折扣</option>
                  <option value="fixed">固定金额减免</option>
                </select>
              </div>
              <div className="form-item">
                <label className="form-label">
                  优惠值 *
                  {formData.discount_type === 'percentage' ? ' (%)' : ' (元)'}
                </label>
                <input
                  type="number"
                  className="form-input"
                  min="0"
                  value={formData.discount_value}
                  onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                />
              </div>
            </div>

            <div className="form-item">
              <label className="form-label">描述</label>
              <textarea
                className="form-input"
                rows="2"
                placeholder="优惠描述说明"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="modal-actions">
              <button className="btn btn-default" onClick={() => setShowModal(false)}>
                取消
              </button>
              <button className="btn btn-primary" onClick={handleSubmit}>
                确定
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminDiscounts
