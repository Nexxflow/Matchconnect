CREATE TABLE IF NOT EXISTS tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  format VARCHAR(20) DEFAULT 'T20',
  venue VARCHAR(150),
  start_date DATE,
  max_teams INT DEFAULT 16,
  status VARCHAR(20) DEFAULT 'registering',
  featured BOOLEAN DEFAULT false,
  teams_count INT DEFAULT 0,
  matches_count INT DEFAULT 0,
  completed_count INT DEFAULT 0,
  prize VARCHAR(100),
  creator_team_id UUID REFERENCES teams(id),
  created_by INTEGER REFERENCES users(id),
  creator_included BOOLEAN DEFAULT true,
  phone VARCHAR(20),
  co_phone VARCHAR(20),
  entry_fee NUMERIC DEFAULT 0,
  description TEXT,
  prizes JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Safety net: if this runs against an older tournaments table that was
-- created before some of the above columns existed, add them here too.
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS teams_count INT DEFAULT 0;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS matches_count INT DEFAULT 0;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS completed_count INT DEFAULT 0;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS prize VARCHAR(100);
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS creator_team_id UUID REFERENCES teams(id);
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id);
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS creator_included BOOLEAN DEFAULT true;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS co_phone VARCHAR(20);
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS entry_fee NUMERIC DEFAULT 0;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS prizes JSONB DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS tournament_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  registered_by INTEGER REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'confirmed',
  registered_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tournament_id, team_id)
);

CREATE INDEX IF NOT EXISTS idx_tournament_reg_tournament ON tournament_registrations(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_reg_team ON tournament_registrations(team_id);

ALTER TABLE matches ADD COLUMN IF NOT EXISTS tournament_id UUID REFERENCES tournaments(id);
CREATE INDEX IF NOT EXISTS idx_matches_tournament ON matches(tournament_id);

-- teams table: columns the tournament/team-creation flow relies on
ALTER TABLE teams ADD COLUMN IF NOT EXISTS village_name VARCHAR(120);
ALTER TABLE teams ADD COLUMN IF NOT EXISTS year_formed INTEGER;

-- challenges table: columns the "Post a Match Challenge" flow relies on
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS overs INTEGER DEFAULT 20;
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS ground_name VARCHAR(200);