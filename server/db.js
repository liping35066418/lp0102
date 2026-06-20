const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS venues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      price_per_hour REAL NOT NULL,
      capacity INTEGER NOT NULL,
      position_x INTEGER DEFAULT 0,
      position_y INTEGER DEFAULT 0,
      width INTEGER DEFAULT 100,
      height INTEGER DEFAULT 100,
      status TEXT DEFAULT 'active'
    );

    CREATE TABLE IF NOT EXISTS equipments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      price_per_hour REAL NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0,
      description TEXT,
      status TEXT DEFAULT 'active'
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      venue_id INTEGER NOT NULL,
      customer_name TEXT NOT NULL,
      customer_phone TEXT,
      player_count INTEGER NOT NULL DEFAULT 1,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      total_hours REAL NOT NULL,
      venue_fee REAL NOT NULL,
      equipment_fee REAL NOT NULL DEFAULT 0,
      discount_amount REAL NOT NULL DEFAULT 0,
      total_amount REAL NOT NULL,
      status TEXT DEFAULT 'confirmed',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (venue_id) REFERENCES venues(id)
    );

    CREATE TABLE IF NOT EXISTS booking_equipments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_id INTEGER NOT NULL,
      equipment_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      subtotal REAL NOT NULL,
      FOREIGN KEY (booking_id) REFERENCES bookings(id),
      FOREIGN KEY (equipment_id) REFERENCES equipments(id)
    );

    CREATE TABLE IF NOT EXISTS group_discounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      min_players INTEGER NOT NULL,
      max_players INTEGER,
      discount_type TEXT NOT NULL DEFAULT 'percentage',
      discount_value REAL NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const venueCount = db.prepare('SELECT COUNT(*) as count FROM venues').get().count;
  if (venueCount === 0) {
    const insertVenue = db.prepare(`
      INSERT INTO venues (name, type, price_per_hour, capacity, position_x, position_y, width, height)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const venues = [
      ['A场地 - 标准对战场', 'standard', 200, 10, 50, 50, 180, 120],
      ['B场地 - 竞技场', 'competitive', 280, 12, 250, 50, 180, 120],
      ['C场地 - 娱乐场', 'casual', 150, 8, 450, 50, 180, 120],
      ['D场地 - 专业场', 'professional', 350, 14, 50, 200, 180, 120],
      ['E场地 - 新手场', 'beginner', 120, 6, 250, 200, 180, 120],
      ['F场地 - VIP场', 'vip', 500, 8, 450, 200, 180, 120],
    ];

    const insertMany = db.transaction((venuesData) => {
      for (const v of venuesData) {
        insertVenue.run(...v);
      }
    });
    insertMany(venues);
  }

  const equipCount = db.prepare('SELECT COUNT(*) as count FROM equipments').get().count;
  if (equipCount === 0) {
    const insertEquip = db.prepare(`
      INSERT INTO equipments (name, category, price_per_hour, stock, description)
      VALUES (?, ?, ?, ?, ?)
    `);

    const equipments = [
      ['战术头盔', 'helmet', 30, 50, '专业防护头盔，带护面'],
      ['轻量化头盔', 'helmet', 20, 30, '入门级防护头盔'],
      ['护肘护膝套装', 'protector', 25, 40, '全套关节防护装备'],
      ['战术背心', 'protector', 35, 30, '防弹背心，增加躯干防护'],
      ['护目镜', 'protector', 15, 60, '防冲击护目镜'],
      ['电动水弹枪', 'modification', 50, 20, '高性能电动水弹枪'],
      ['改装枪管', 'modification', 30, 15, '高精度改装枪管'],
      ['扩容弹夹', 'modification', 20, 25, '大容量弹夹'],
      ['战术手电', 'modification', 15, 30, '强光战术手电'],
    ];

    const insertMany = db.transaction((eqData) => {
      for (const e of eqData) {
        insertEquip.run(...e);
      }
    });
    insertMany(equipments);
  }

  const discountCount = db.prepare('SELECT COUNT(*) as count FROM group_discounts').get().count;
  if (discountCount === 0) {
    const insertDiscount = db.prepare(`
      INSERT INTO group_discounts (name, min_players, max_players, discount_type, discount_value, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const discounts = [
      ['3人组队优惠', 3, 4, 'percentage', 10, '3-4人组队享9折'],
      ['5人组队优惠', 5, 7, 'percentage', 15, '5-7人组队享85折'],
      ['8人以上团购', 8, null, 'percentage', 25, '8人及以上享75折'],
    ];

    const insertMany = db.transaction((discData) => {
      for (const d of discData) {
        insertDiscount.run(...d);
      }
    });
    insertMany(discounts);
  }
}

initDB();

module.exports = db;
