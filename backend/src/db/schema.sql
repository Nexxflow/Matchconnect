-- MatchConnect Cricket — PostgreSQL Schema
-- Run this on your Neon database before starting the server.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Users ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL,
  email VARCHAR(160) UNIQUE NOT NULL,
  phone VARCHAR(20),
  password_hash TEXT NOT NULL,
  reset_password_token VARCHAR(255),
  reset_password_expires TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_password_token);

-- Safe to re-run: adds the reset-password columns if this schema.sql
-- was already applied before they existed.
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_password_token VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_password_expires TIMESTAMPTZ;

-- ─── Teams ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  rating NUMERIC(2,1) DEFAULT 0,
  wins INT DEFAULT 0,
  losses INT DEFAULT 0,
  specialty VARCHAR(50),
  established_year INT,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Players ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  role VARCHAR(60),
  batting_avg NUMERIC(5,2),
  strike_rate NUMERIC(5,2),
  wickets INT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Grounds ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS grounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  area VARCHAR(150),
  price_per_hour NUMERIC(10,2) NOT NULL,
  rating NUMERIC(2,1) DEFAULT 0,
  amenities JSONB DEFAULT '[]',
  tags JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Umpires / Scorers ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS umpires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL,
  role VARCHAR(60) NOT NULL, -- 'Certified Umpire' | 'Scorer' | 'Umpire + Scorer'
  experience_years INT,
  price NUMERIC(10,2) NOT NULL,
  available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Challenges (Find Match) ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  format VARCHAR(10) NOT NULL, -- T20 | ODI | Test | Box
  match_date DATE NOT NULL,
  time_slot VARCHAR(20) NOT NULL,
  ground_id UUID REFERENCES grounds(id),
  urgent BOOLEAN DEFAULT false,
  note VARCHAR(120),
  status VARCHAR(20) DEFAULT 'open', -- open | accepted | cancelled
  accepted_by_team_id UUID REFERENCES teams(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Bookings (Grounds + Umpires, unified) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id),
  booking_type VARCHAR(10) NOT NULL, -- 'ground' | 'umpire'
  ground_id UUID REFERENCES grounds(id),
  umpire_id UUID REFERENCES umpires(id),
  booking_date DATE NOT NULL,
  time_slot VARCHAR(20) NOT NULL,
  base_amount NUMERIC(10,2) NOT NULL,
  platform_fee NUMERIC(10,2) NOT NULL,
  total_amount NUMERIC(10,2) NOT NULL,
  payment_status VARCHAR(20) DEFAULT 'pending', -- pending | paid | failed | refunded
  razorpay_order_id VARCHAR(100),
  razorpay_payment_id VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT chk_booking_ref CHECK (
    (booking_type = 'ground' AND ground_id IS NOT NULL AND umpire_id IS NULL) OR
    (booking_type = 'umpire' AND umpire_id IS NOT NULL AND ground_id IS NULL)
  )
);

-- ─── Tournaments ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  status VARCHAR(30) DEFAULT 'Registering', -- Registering | Ongoing | Finals | Completed
  format VARCHAR(10),
  venue VARCHAR(150),
  teams_count INT DEFAULT 0,
  matches_count INT DEFAULT 0,
  completed_count INT DEFAULT 0,
  prize VARCHAR(50),
  start_date DATE,
  featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Tournament Registrations ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tournament_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  registered_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tournament_id, team_id)
);

CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_challenges_team ON challenges(team_id);
CREATE INDEX IF NOT EXISTS idx_registrations_tournament ON tournament_registrations(tournament_id);


CREATE TABLE umpires(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    mobile VARCHAR(15) UNIQUE NOT NULL,
    experience INTEGER NOT NULL,
    fee_per_match NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);