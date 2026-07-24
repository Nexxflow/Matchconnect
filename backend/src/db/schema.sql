-- MatchConnect Cricket — CORRECTED Schema (matches actual controller code)
-- Run this on a fresh/empty Neon database.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Users (id is INTEGER, not UUID — required by challengesController's int[] queries) ──
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(160) UNIQUE NOT NULL,
  phone VARCHAR(20),
  password_hash TEXT NOT NULL,
  team_name VARCHAR(120),
  village_name VARCHAR(120),
  team_year INT,
  fcm_token TEXT,
  reset_password_token VARCHAR(255),
  reset_password_expires TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_password_token);

-- ─── Teams (used only by live-scoring flow in matchController) ──
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID,
  name VARCHAR(120) NOT NULL,
  rating NUMERIC(2,1) DEFAULT 0,
  wins INT DEFAULT 0,
  losses INT DEFAULT 0,
  specialty VARCHAR(50),
  established_year INT,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Players ──
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

-- ─── Grounds (posted_by_user_id is INTEGER, references users) ──
CREATE TABLE IF NOT EXISTS grounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  area VARCHAR(150),
  price_per_hour NUMERIC(10,2) NOT NULL,
  google_maps_url TEXT,
  posted_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  availability_mode VARCHAR(20) DEFAULT 'always',
  available_date DATE,
  available_time VARCHAR(50),
  rating NUMERIC(2,1) DEFAULT 0,
  amenities JSONB DEFAULT '[]',
  tags JSONB DEFAULT '[]',
  latitude NUMERIC(9,6),
  longitude NUMERIC(9,6),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Umpires (real columns: mobile, experience, fee_per_match) ──
CREATE TABLE IF NOT EXISTS umpires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL,
  mobile VARCHAR(20),
  role VARCHAR(60) NOT NULL,
  experience INT,
  fee_per_match NUMERIC(10,2) NOT NULL,
  available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Challenges (Find Match) — real columns used by challengesController ──
CREATE TABLE IF NOT EXISTS challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_name VARCHAR(120) NOT NULL,
  contact_no VARCHAR(20) NOT NULL,
  format VARCHAR(10) NOT NULL,
  overs INT,
  match_date DATE NOT NULL,
  time_slot VARCHAR(20) NOT NULL,
  ground_id UUID REFERENCES grounds(id),
  urgent BOOLEAN DEFAULT false,
  note VARCHAR(120),
  creator_id INTEGER REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'open',
  accepted_by_team_name VARCHAR(120),
  accepted_by_contact_no VARCHAR(20),
  accepted_by_user_id INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_challenges_creator ON challenges(creator_id);
CREATE INDEX IF NOT EXISTS idx_challenges_accepted_by ON challenges(accepted_by_user_id);

-- ─── Messages (chat inside an accepted challenge) ──
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,
  sender_id INTEGER REFERENCES users(id),
  sender_team_name VARCHAR(120),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_messages_challenge ON messages(challenge_id);

-- ─── Bookings (Grounds + Umpires, unified) ──
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id),
  booking_type VARCHAR(10) NOT NULL,
  ground_id UUID REFERENCES grounds(id),
  umpire_id UUID REFERENCES umpires(id),
  booking_date DATE NOT NULL,
  time_slot VARCHAR(20) NOT NULL,
  base_amount NUMERIC(10,2) NOT NULL,
  platform_fee NUMERIC(10,2) NOT NULL,
  total_amount NUMERIC(10,2) NOT NULL,
  payment_status VARCHAR(20) DEFAULT 'pending',
  razorpay_order_id VARCHAR(100),
  razorpay_payment_id VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT chk_booking_ref CHECK (
    (booking_type = 'ground' AND ground_id IS NOT NULL AND umpire_id IS NULL) OR
    (booking_type = 'umpire' AND umpire_id IS NOT NULL AND ground_id IS NULL)
  )
);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);

-- ─── Tournaments ──
CREATE TABLE IF NOT EXISTS tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  status VARCHAR(30) DEFAULT 'Registering',
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

-- team_id here matches tournamentsController's real INSERT (tournament_id, team_id) —
-- references the `teams` table, NOT users directly.
CREATE TABLE IF NOT EXISTS tournament_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  registered_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tournament_id, team_id)
);
CREATE INDEX IF NOT EXISTS idx_registrations_tournament ON tournament_registrations(tournament_id);

-- ─── Live Scoring: Matches / Innings / Overs / Balls / Stats ──
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team1_id UUID REFERENCES teams(id),
  team2_id UUID REFERENCES teams(id),
  venue VARCHAR(150),
  overs_limit INT,
  status VARCHAR(20) DEFAULT 'not_started',
  toss_winner_id UUID REFERENCES teams(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS innings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  inning_number INT NOT NULL,
  batting_team_id UUID REFERENCES teams(id),
  bowling_team_id UUID REFERENCES teams(id),
  total_runs INT DEFAULT 0,
  wickets INT DEFAULT 0,
  overs_completed NUMERIC(4,1) DEFAULT 0,
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS overs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  innings_id UUID REFERENCES innings(id) ON DELETE CASCADE,
  over_number INT NOT NULL,
  bowler_id UUID REFERENCES players(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS balls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  over_id UUID REFERENCES overs(id) ON DELETE CASCADE,
  ball_number INT NOT NULL,
  batsman_id UUID REFERENCES players(id),
  bowler_id UUID REFERENCES players(id),
  fielder_id UUID REFERENCES players(id),
  runs INT DEFAULT 0,
  extra_type VARCHAR(20),
  extra_runs INT DEFAULT 0,
  is_wicket BOOLEAN DEFAULT false,
  wicket_type VARCHAR(30),
  dismissed_player_id UUID REFERENCES players(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS batting_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  innings_id UUID REFERENCES innings(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id),
  runs INT DEFAULT 0,
  balls_faced INT DEFAULT 0,
  fours INT DEFAULT 0,
  sixes INT DEFAULT 0,
  is_out BOOLEAN DEFAULT false,
  dismissal VARCHAR(50),
  is_on_strike BOOLEAN DEFAULT false,
  UNIQUE(innings_id, player_id)
);

CREATE TABLE IF NOT EXISTS bowling_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  innings_id UUID REFERENCES innings(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id),
  overs_bowled NUMERIC(4,1) DEFAULT 0,
  runs_conceded INT DEFAULT 0,
  wickets INT DEFAULT 0,
  is_current BOOLEAN DEFAULT false,
  UNIQUE(innings_id, player_id)
);