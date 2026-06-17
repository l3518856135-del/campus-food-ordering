-- ==================== 校园点餐系统 D1 数据库 Schema ====================

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'customer' CHECK(role IN ('customer', 'merchant')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 会话表（token 管理）
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 订单表
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  customer_id INTEGER NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_dorm TEXT NOT NULL DEFAULT '',
  area TEXT NOT NULL,
  store TEXT NOT NULL,
  items TEXT NOT NULL,  -- JSON 格式
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','delivering','completed','cancelled')),
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 菜单数据表
CREATE TABLE IF NOT EXISTS menu_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  data TEXT NOT NULL,  -- JSON 格式，存储完整菜单结构
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 收货地址表
CREATE TABLE IF NOT EXISTS addresses (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  dorm TEXT NOT NULL,
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_store ON orders(store);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON addresses(user_id);