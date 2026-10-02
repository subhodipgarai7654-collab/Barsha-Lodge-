-- ==========================================================
-- Barsha Lodge, Tarapith - Relational Database Schema
-- Location: Tarapith, Near Bharat Sevashram Sangha, Birbhum, West Bengal
-- Manager: Subhodip Garai | Phone: +91 8388957523
-- Compatible with: SQLite 3, MySQL 5.7+, PostgreSQL 12+
-- ==========================================================

-- 1. Admins Table
CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(150),
  role VARCHAR(50) DEFAULT 'superadmin',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Rooms Table
CREATE TABLE IF NOT EXISTS rooms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(150) NOT NULL,
  room_number VARCHAR(50) NOT NULL UNIQUE,
  type VARCHAR(50) NOT NULL, -- single, double, triple, suite
  is_ac INTEGER NOT NULL DEFAULT 0, -- 1: AC, 0: Non-AC
  bed_type VARCHAR(100) NOT NULL, -- Single Bed, Double Bed, Triple Bed
  price_per_night DECIMAL(10, 2) NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 2,
  amenities TEXT, -- JSON array of amenities
  status VARCHAR(50) NOT NULL DEFAULT 'Available', -- Available, Booked, Occupied, Maintenance
  image_url TEXT,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Customers Table
CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(150) NOT NULL,
  mobile VARCHAR(20) NOT NULL UNIQUE,
  email VARCHAR(150),
  address TEXT,
  total_stays INTEGER DEFAULT 1,
  total_spent DECIMAL(10, 2) DEFAULT 0.00,
  last_booking_id VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Bookings Table
CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id VARCHAR(50) NOT NULL UNIQUE, -- e.g. BL2026-0001
  customer_id INTEGER,
  room_id INTEGER NOT NULL,
  guest_name VARCHAR(150) NOT NULL,
  mobile_number VARCHAR(20) NOT NULL,
  email VARCHAR(150),
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  num_guests INTEGER NOT NULL DEFAULT 1,
  num_rooms INTEGER NOT NULL DEFAULT 1,
  special_requests TEXT,
  price_per_night DECIMAL(10, 2) NOT NULL,
  total_nights INTEGER NOT NULL DEFAULT 1,
  total_amount DECIMAL(10, 2) NOT NULL,
  advance_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  due_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  status VARCHAR(50) NOT NULL DEFAULT 'Pending', -- Pending, Confirmed, Checked-in, Checked-out, Cancelled
  payment_status VARCHAR(50) NOT NULL DEFAULT 'Pending', -- Pending, Partially Paid, Paid, Refunded
  payment_method VARCHAR(50) DEFAULT 'UPI',
  transaction_id VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE SET NULL,
  FOREIGN KEY (room_id) REFERENCES rooms (id) ON DELETE RESTRICT
);

-- 5. Payments Table
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id VARCHAR(50) NOT NULL,
  customer_name VARCHAR(150) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL DEFAULT 'UPI',
  transaction_id VARCHAR(100),
  payment_status VARCHAR(50) NOT NULL DEFAULT 'Pending', -- Pending, Partially Paid, Paid, Refunded
  paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT
);

-- 6. Gallery Table
CREATE TABLE IF NOT EXISTS gallery (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title VARCHAR(150) NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'Lodge', -- Lodge, Rooms, Tarapith, Facilities
  image_url TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  caption TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Facilities Table
CREATE TABLE IF NOT EXISTS facilities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  icon VARCHAR(50) DEFAULT 'CheckCircle',
  is_active INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0
);

-- 8. Website Settings Table
CREATE TABLE IF NOT EXISTS website_settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. Admin Logs Table
CREATE TABLE IF NOT EXISTS admin_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action VARCHAR(100) NOT NULL,
  details TEXT,
  ip VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. Users Table (Guests and Registered Customers)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  role VARCHAR(50) DEFAULT 'user', -- user, admin
  reset_token VARCHAR(255),
  reset_expires TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. AI Knowledge Base Table (Editable lodge knowledge, FAQs, and Tarapith travel guides)
CREATE TABLE IF NOT EXISTS ai_knowledge_base (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category VARCHAR(100) NOT NULL, -- lodge_info, rooms, policies, tarapith_guide, faqs, contact
  topic VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================================
-- INDEXES FOR HIGH-PERFORMANCE SEARCH & FILTERING
-- ==========================================================
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings (check_in_date, check_out_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings (status);
CREATE INDEX IF NOT EXISTS idx_bookings_mobile ON bookings (mobile_number);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms (status);
CREATE INDEX IF NOT EXISTS idx_rooms_type ON rooms (type, is_ac);
CREATE INDEX IF NOT EXISTS idx_customers_mobile ON customers (mobile);
CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments (booking_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_ai_kb_category ON ai_knowledge_base (category);
