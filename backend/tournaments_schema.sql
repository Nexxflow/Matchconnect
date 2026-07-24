CREATE TABLE IF NOT EXISTS tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  season VARCHAR(50),
  format VARCHAR(20) DEFAULT 'T20',
  venue VARCHAR(150),
  start_date DATE,
  end_date DATE,
  prize_pool INT DEFAULT 0,
  max_teams INT DEFAULT 16,
  status VARCHAR(20) DEFAULT 'registering',
  is_featured BOOLEAN DEFAULT false,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tournament_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  registered_by UUID REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'confirmed',
  registered_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tournament_id, team_id)
);

CREATE INDEX IF NOT EXISTS idx_tournament_reg_tournament ON tournament_registrations(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_reg_team ON tournament_registrations(team_id);

ALTER TABLE matches ADD COLUMN IF NOT EXISTS tournament_id UUID REFERENCES tournaments(id);
CREATE INDEX IF NOT EXISTS idx_matches_tournament ON matches(tournament_id);
