CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  password TEXT,
  role TEXT CHECK(role IN ('parent','sitter','admin')),
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  city TEXT,
  is_active INTEGER DEFAULT 1,
  email_verified INTEGER DEFAULT 0,
  phone_verified INTEGER DEFAULT 0,
  two_factor_enabled INTEGER DEFAULT 0,
  totp_secret_encrypted TEXT,
  identity_verified INTEGER DEFAULT 0,
  identity_verified_at TEXT,
  created_at TEXT,
  updated_at TEXT
);


CREATE TABLE IF NOT EXISTS parents (
  user_id TEXT PRIMARY KEY,
  children_ages TEXT,
  preferred_rate_min REAL,
  preferred_rate_max REAL,
  kids_count INTEGER,
  family_desc TEXT,
  needs TEXT,
  budget REAL,
  payment_pref TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sitters (
  user_id TEXT PRIMARY KEY,
  experience_years INTEGER,
  hourly_rate REAL,
  description TEXT,
  rating REAL DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  is_verified INTEGER DEFAULT 0,
  background_check_status TEXT DEFAULT 'pending',
  featured_until TEXT,
  verified_by TEXT,
  verified_at TEXT,
  age INTEGER,
  education TEXT,
  driver_license INTEGER DEFAULT 0,
  has_car INTEGER DEFAULT 0,
  smoker INTEGER DEFAULT 0,
  preferred_location TEXT,
  superpowers TEXT,
  comfortable_with TEXT,
  availability TEXT,
  identity_status TEXT DEFAULT 'none',
  document_url TEXT,
  selfie_url TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS certifications (
  id TEXT PRIMARY KEY,
  sitter_id TEXT,
  name TEXT,
  issuing_authority TEXT,
  document_url TEXT,
  is_verified INTEGER DEFAULT 0,
  FOREIGN KEY (sitter_id) REFERENCES sitters(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS availability (
  id TEXT PRIMARY KEY,
  sitter_id TEXT,
  day_of_week INTEGER CHECK(day_of_week BETWEEN 0 AND 6),
  start_time TEXT,
  end_time TEXT,
  is_recurring INTEGER DEFAULT 1,
  valid_from TEXT,
  valid_until TEXT,
  FOREIGN KEY (sitter_id) REFERENCES sitters(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  parent_id TEXT,
  sitter_id TEXT,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending','accepted','rejected','awaiting_payment','confirmed','completed','cancelled')),
  start_datetime TEXT,
  end_datetime TEXT,
  total_hours REAL,
  hourly_rate REAL,
  subtotal REAL,
  platform_fee REAL,
  total_amount REAL,
  message TEXT,
  cancelled_reason TEXT,
  cancelled_by TEXT,
  created_at TEXT,
  num_children INTEGER DEFAULT 1,
  FOREIGN KEY (parent_id) REFERENCES parents(user_id) ON DELETE CASCADE,
  FOREIGN KEY (sitter_id) REFERENCES sitters(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  booking_id TEXT UNIQUE,
  amount REAL,
  method TEXT CHECK(method IN ('qr','deposit')),
  receipt_url TEXT,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending','confirmed','rejected')),
  admin_confirmed_at TEXT,
  admin_id TEXT,
  notes TEXT,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS payouts (
  id TEXT PRIMARY KEY,
  sitter_id TEXT,
  amount REAL,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending','processing','paid','rejected')),
  reference TEXT,
  requested_at TEXT,
  paid_at TEXT,
  paid_by TEXT,
  notes TEXT,
  FOREIGN KEY (sitter_id) REFERENCES sitters(user_id) ON DELETE CASCADE,
  FOREIGN KEY (paid_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  booking_id TEXT UNIQUE,
  parent_id TEXT,
  sitter_id TEXT,
  rating INTEGER CHECK(rating BETWEEN 1 AND 5),
  comment TEXT,
  is_visible INTEGER DEFAULT 1,
  hidden_reason TEXT,
  hidden_by TEXT,
  created_at TEXT,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES parents(user_id) ON DELETE CASCADE,
  FOREIGN KEY (sitter_id) REFERENCES sitters(user_id) ON DELETE CASCADE,
  FOREIGN KEY (hidden_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS content_cards (
  id TEXT PRIMARY KEY,
  title TEXT UNIQUE,
  description TEXT,
  image_url TEXT,
  slug TEXT UNIQUE,
  body TEXT,
  updated_at TEXT,
  updated_by TEXT,
  created_at TEXT,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS site_config (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TEXT,
  updated_by TEXT,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS notifications_log (
  id TEXT PRIMARY KEY,
  sent_by TEXT,
  target TEXT CHECK(target IN ('all','parents','sitters')),
  subject TEXT,
  message TEXT,
  recipients_count INTEGER,
  sent_at TEXT,
  FOREIGN KEY (sent_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  token TEXT UNIQUE,
  expires_at TEXT,
  created_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_city ON users(city);
CREATE INDEX IF NOT EXISTS idx_sitters_rating ON sitters(rating);
CREATE INDEX IF NOT EXISTS idx_sitters_rate ON sitters(hourly_rate);
CREATE INDEX IF NOT EXISTS idx_sitters_verified ON sitters(is_verified);
CREATE INDEX IF NOT EXISTS idx_bookings_parent ON bookings(parent_id);
CREATE INDEX IF NOT EXISTS idx_bookings_sitter ON bookings(sitter_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_created ON bookings(created_at);
CREATE INDEX IF NOT EXISTS idx_reviews_sitter ON reviews(sitter_id);
CREATE INDEX IF NOT EXISTS idx_reviews_visible ON reviews(is_visible);

CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  sitter_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  hourly_rate REAL NOT NULL,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (sitter_id) REFERENCES sitters(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_services_sitter ON services(sitter_id);
CREATE INDEX IF NOT EXISTS idx_services_status ON services(status);

CREATE TABLE IF NOT EXISTS verification_log (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  type TEXT CHECK(type IN ('identity','email','phone')),
  method TEXT,           -- 'azure_face', 'otp_email', 'otp_sms', 'mock'
  confidence_score REAL, -- para verificación facial
  status TEXT CHECK(status IN ('pending','approved','rejected')),
  ip_address TEXT,
  created_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_verification_log_user ON verification_log(user_id);


