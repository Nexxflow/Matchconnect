-- Migration script to create missing Live Scoring tables safely
-- Safe to execute against existing databases with existing users/messages schema

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Teams (for live scoring)
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

-- 2. Players
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

-- 3. Matches
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team1_id UUID REFERENCES teams(id),
  team2_id UUID REFERENCES teams(id),
  venue VARCHAR(150),
  overs_limit INT,
  status VARCHAR(20) DEFAULT 'not_started',
  toss_winner_id UUID REFERENCES teams(id),
  toss_winner_team VARCHAR(10),
  toss_decision VARCHAR(10),
  batting_team_id UUID REFERENCES teams(id),
  bowling_team_id UUID REFERENCES teams(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Innings
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

-- 5. Overs
CREATE TABLE IF NOT EXISTS overs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  innings_id UUID REFERENCES innings(id) ON DELETE CASCADE,
  over_number INT NOT NULL,
  bowler_id UUID REFERENCES players(id),
  runs_conceded INT DEFAULT 0,
  wickets INT DEFAULT 0,
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Balls
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

-- 7. Batting Stats
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

-- 8. Bowling Stats
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
