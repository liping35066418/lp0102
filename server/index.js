const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
const PORT = 8872;

app.use(cors());
app.use(express.json());

// 场地列表
app.get('/api/venues', (req, res) => {
  const venues = db.prepare('SELECT * FROM venues WHERE status = ? ORDER BY id').all('active');
  res.json({ code: 0, data: venues });
});

// 单场地详情
app.get('/api/venues/:id', (req, res) => {
  const venue = db.prepare('SELECT * FROM venues WHERE id = ?').get(req.params.id);
  if (!venue) {
    return res.json({ code: 1, message: '场地不存在' });
  }
  res.json({ code: 0, data: venue });
});

// 装备列表
app.get('/api/equipments', (req, res) => {
  const { category } = req.query;
  let sql = 'SELECT * FROM equipments WHERE status = ?';
  const params = ['active'];
  if (category) {
    sql += ' AND category = ?';
    params.push(category);
  }
  sql += ' ORDER BY category, id';
  const equipments = db.prepare(sql).all(...params);
  res.json({ code: 0, data: equipments });
});

// 装备分类
app.get('/api/equipments/categories', (req, res) => {
  const categories = db.prepare(`
    SELECT DISTINCT category as key,
      CASE category
        WHEN 'helmet' THEN '头盔'
        WHEN 'protector' THEN '护具'
        WHEN 'modification' THEN '改装道具'
        ELSE category
      END as label
    FROM equipments WHERE status = ? ORDER BY category
  `).all('active');
  res.json({ code: 0, data: categories });
});

// 检查场地时段可用性
app.get('/api/bookings/check', (req, res) => {
  const { venue_id, date } = req.query;
  if (!venue_id || !date) {
    return res.json({ code: 1, message: '参数不完整' });
  }

  const [year, month, day] = date.split('-').map(Number);
  const startTime = new Date(year, month - 1, day, 0, 0, 0, 0).toISOString();
  const endTime = new Date(year, month - 1, day, 23, 59, 59, 999).toISOString();

  const bookings = db.prepare(`
    SELECT id, start_time, end_time, status
    FROM bookings
    WHERE venue_id = ?
      AND status != 'cancelled'
      AND start_time < ?
      AND end_time > ?
    ORDER BY start_time
  `).all(venue_id, endTime, startTime);

  res.json({ code: 0, data: bookings });
});

// 校验时段是否冲突
function checkTimeConflict(venueId, startTime, endTime, excludeBookingId = null) {
  let sql = `
    SELECT COUNT(*) as count
    FROM bookings
    WHERE venue_id = ?
      AND status != 'cancelled'
      AND start_time < ?
      AND end_time > ?
  `;
  const params = [venueId, endTime, startTime];
  if (excludeBookingId) {
    sql += ' AND id != ?';
    params.push(excludeBookingId);
  }
  const result = db.prepare(sql).get(...params);
  return result.count > 0;
}

// 计算总费用
function calculateTotal(venueId, startTime, endTime, equipments = [], playerCount = 1, overrideVenuePrice = null, overrideEquipmentFee = null) {
  const venue = db.prepare('SELECT * FROM venues WHERE id = ?').get(venueId);
  if (!venue) return null;

  const start = new Date(startTime);
  const end = new Date(endTime);
  const totalHours = Math.max(0.5, Math.ceil((end - start) / (1000 * 60 * 30)) * 0.5);

  const venuePricePerHour = overrideVenuePrice != null ? overrideVenuePrice : venue.price_per_hour;
  const venueFee = venuePricePerHour * totalHours;

  let equipmentFee = 0;
  const equipmentDetails = [];
  if (overrideEquipmentFee != null) {
    equipmentFee = overrideEquipmentFee;
  } else {
    for (const eq of equipments) {
      const equip = db.prepare('SELECT * FROM equipments WHERE id = ?').get(eq.id);
      if (equip && equip.status === 'active') {
        const qty = eq.quantity || 1;
        const subtotal = equip.price_per_hour * totalHours * qty;
        equipmentFee += subtotal;
        equipmentDetails.push({
          id: equip.id,
          name: equip.name,
          category: equip.category,
          price_per_hour: equip.price_per_hour,
          quantity: qty,
          hours: totalHours,
          subtotal: subtotal,
        });
      }
    }
  }

  const discount = calculateGroupDiscount(playerCount, venueFee + equipmentFee);

  const totalAmount = venueFee + equipmentFee - discount.amount;

  return {
    totalHours,
    venueFee,
    venuePricePerHour,
    equipmentFee,
    equipmentDetails,
    discount,
    totalAmount,
  };
}

// 计算组队优惠
function calculateGroupDiscount(playerCount, baseAmount) {
  const discounts = db.prepare(`
    SELECT * FROM group_discounts
    WHERE status = 'active'
      AND min_players <= ?
      AND (max_players IS NULL OR max_players >= ?)
    ORDER BY min_players DESC
    LIMIT 1
  `).get(playerCount, playerCount);

  if (!discounts) {
    return { id: null, name: null, type: null, value: 0, amount: 0 };
  }

  let discountAmount = 0;
  if (discounts.discount_type === 'percentage') {
    discountAmount = baseAmount * (discounts.discount_value / 100);
  } else if (discounts.discount_type === 'fixed') {
    discountAmount = discounts.discount_value;
  }

  return {
    id: discounts.id,
    name: discounts.name,
    type: discounts.discount_type,
    value: discounts.discount_value,
    amount: Math.min(discountAmount, baseAmount),
  };
}

// 组队优惠列表
app.get('/api/discounts', (req, res) => {
  const discounts = db.prepare(`
    SELECT * FROM group_discounts WHERE status = 'active' ORDER BY min_players
  `).all();
  res.json({ code: 0, data: discounts });
});

// 新增组队优惠
app.post('/api/discounts', (req, res) => {
  const { name, min_players, max_players, discount_type, discount_value, description } = req.body;
  if (!name || min_players == null || !discount_type || discount_value == null) {
    return res.json({ code: 1, message: '参数不完整' });
  }

  const result = db.prepare(`
    INSERT INTO group_discounts (name, min_players, max_players, discount_type, discount_value, description)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(name, min_players, max_players || null, discount_type, discount_value, description || '');

  res.json({ code: 0, data: { id: result.lastInsertRowid } });
});

// 更新组队优惠
app.put('/api/discounts/:id', (req, res) => {
  const { name, min_players, max_players, discount_type, discount_value, description, status } = req.body;
  const id = req.params.id;

  const existing = db.prepare('SELECT * FROM group_discounts WHERE id = ?').get(id);
  if (!existing) {
    return res.json({ code: 1, message: '优惠不存在' });
  }

  db.prepare(`
    UPDATE group_discounts
    SET name = ?, min_players = ?, max_players = ?, discount_type = ?, discount_value = ?, description = ?, status = ?
    WHERE id = ?
  `).run(
    name || existing.name,
    min_players ?? existing.min_players,
    max_players ?? existing.max_players,
    discount_type || existing.discount_type,
    discount_value ?? existing.discount_value,
    description ?? existing.description,
    status || existing.status,
    id
  );

  res.json({ code: 0, message: '更新成功' });
});

// 删除组队优惠
app.delete('/api/discounts/:id', (req, res) => {
  db.prepare('UPDATE group_discounts SET status = ? WHERE id = ?').run('inactive', req.params.id);
  res.json({ code: 0, message: '删除成功' });
});

// 计算费用预览
app.post('/api/calculate', (req, res) => {
  const { venue_id, start_time, end_time, equipments, player_count, venue_price, equipment_fee } = req.body;

  if (!venue_id || !start_time || !end_time) {
    return res.json({ code: 1, message: '参数不完整' });
  }

  const conflict = checkTimeConflict(venue_id, start_time, end_time);
  const result = calculateTotal(
    venue_id,
    start_time,
    end_time,
    equipments || [],
    player_count || 1,
    venue_price != null ? Number(venue_price) : null,
    equipment_fee != null ? Number(equipment_fee) : null
  );

  if (!result) {
    return res.json({ code: 1, message: '场地不存在' });
  }

  res.json({
    code: 0,
    data: {
      ...result,
      has_conflict: conflict,
    },
  });
});

// 提交预约
app.post('/api/bookings', (req, res) => {
  const {
    venue_id,
    customer_name,
    customer_phone,
    player_count,
    start_time,
    end_time,
    equipments = [],
  } = req.body;

  if (!venue_id || !customer_name || !start_time || !end_time) {
    return res.json({ code: 1, message: '参数不完整' });
  }

  const start = new Date(start_time);
  const end = new Date(end_time);
  if (end <= start) {
    return res.json({ code: 1, message: '结束时间必须晚于开始时间' });
  }

  if (checkTimeConflict(venue_id, start_time, end_time)) {
    return res.json({ code: 2, message: '该时段已被预约，请选择其他时段' });
  }

  const calc = calculateTotal(venue_id, start_time, end_time, equipments, player_count || 1);
  if (!calc) {
    return res.json({ code: 1, message: '场地不存在' });
  }

  const insertBooking = db.prepare(`
    INSERT INTO bookings (
      venue_id, customer_name, customer_phone, player_count,
      start_time, end_time, total_hours,
      venue_fee, equipment_fee, discount_amount, total_amount
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertBookingEquip = db.prepare(`
    INSERT INTO booking_equipments (booking_id, equipment_id, quantity, unit_price, subtotal)
    VALUES (?, ?, ?, ?, ?)
  `);

  const transaction = db.transaction(() => {
    const bookingResult = insertBooking.run(
      venue_id,
      customer_name,
      customer_phone || '',
      player_count || 1,
      start_time,
      end_time,
      calc.totalHours,
      calc.venueFee,
      calc.equipmentFee,
      calc.discount.amount,
      calc.totalAmount
    );

    const bookingId = bookingResult.lastInsertRowid;

    for (const eq of calc.equipmentDetails) {
      insertBookingEquip.run(bookingId, eq.id, eq.quantity, eq.price_per_hour, eq.subtotal);
    }

    return bookingId;
  });

  try {
    const bookingId = transaction();
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
    const bookingEquips = db.prepare(`
      SELECT be.*, e.name, e.category
      FROM booking_equipments be
      LEFT JOIN equipments e ON be.equipment_id = e.id
      WHERE be.booking_id = ?
    `).all(bookingId);

    res.json({
      code: 0,
      data: {
        ...booking,
        equipments: bookingEquips,
        discount: calc.discount,
      },
    });
  } catch (err) {
    console.error(err);
    res.json({ code: 1, message: '预约失败' });
  }
});

// 预约列表
app.get('/api/bookings', (req, res) => {
  const { date, venue_id, status } = req.query;
  let sql = `
    SELECT b.*, v.name as venue_name
    FROM bookings b
    LEFT JOIN venues v ON b.venue_id = v.id
    WHERE 1=1
  `;
  const params = [];

  if (date) {
    sql += ' AND DATE(b.start_time) = ?';
    params.push(date);
  }
  if (venue_id) {
    sql += ' AND b.venue_id = ?';
    params.push(venue_id);
  }
  if (status) {
    sql += ' AND b.status = ?';
    params.push(status);
  }

  sql += ' ORDER BY b.start_time DESC';

  const bookings = db.prepare(sql).all(...params);
  res.json({ code: 0, data: bookings });
});

// 预约统计
app.get('/api/bookings/statistics', (req, res) => {
  const { date, venue_id } = req.query;
  let sql = `
    SELECT
      COUNT(*) as total_count,
      SUM(CASE WHEN status != 'cancelled' THEN total_amount ELSE 0 END) as valid_total_amount,
      SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_count,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_count,
      SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_count,
      SUM(CASE WHEN status != 'cancelled' THEN 1 ELSE 0 END) as valid_count
    FROM bookings
    WHERE 1=1
  `;
  const params = [];

  if (date) {
    sql += ' AND DATE(start_time) = ?';
    params.push(date);
  }
  if (venue_id) {
    sql += ' AND venue_id = ?';
    params.push(venue_id);
  }

  const stats = db.prepare(sql).get(...params);
  const validTotalAmount = stats.valid_total_amount || 0;
  const validCount = stats.valid_count || 0;

  res.json({
    code: 0,
    data: {
      total_count: stats.total_count || 0,
      valid_total_amount: validTotalAmount,
      valid_count: validCount,
      avg_amount: validCount > 0 ? validTotalAmount / validCount : 0,
      confirmed_count: stats.confirmed_count || 0,
      completed_count: stats.completed_count || 0,
      cancelled_count: stats.cancelled_count || 0,
    },
  });
});

// 预约详情
app.get('/api/bookings/:id', (req, res) => {
  const booking = db.prepare(`
    SELECT b.*, v.name as venue_name, v.price_per_hour as venue_price
    FROM bookings b
    LEFT JOIN venues v ON b.venue_id = v.id
    WHERE b.id = ?
  `).get(req.params.id);

  if (!booking) {
    return res.json({ code: 1, message: '预约不存在' });
  }

  const equipments = db.prepare(`
    SELECT be.*, e.name, e.category
    FROM booking_equipments be
    LEFT JOIN equipments e ON be.equipment_id = e.id
    WHERE be.booking_id = ?
  `).all(req.params.id);

  res.json({ code: 0, data: { ...booking, equipments } });
});

// 取消预约
app.put('/api/bookings/:id/cancel', (req, res) => {
  const result = db.prepare('UPDATE bookings SET status = ? WHERE id = ?').run('cancelled', req.params.id);
  if (result.changes === 0) {
    return res.json({ code: 1, message: '预约不存在' });
  }
  res.json({ code: 0, message: '取消成功' });
});

// 标记完成
app.put('/api/bookings/:id/complete', (req, res) => {
  const result = db.prepare("UPDATE bookings SET status = ? WHERE id = ? AND status = 'confirmed'").run('completed', req.params.id);
  if (result.changes === 0) {
    return res.json({ code: 1, message: '预约不存在或状态不允许完成' });
  }
  res.json({ code: 0, message: '已标记完成' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = app;
