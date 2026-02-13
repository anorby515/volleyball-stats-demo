-- ============================================================================
-- Des Moines Eclipse Volleyball Stat Tracker - Database Setup V2
-- ============================================================================
-- CHANGES FROM V1:
--   - match_id changed from TIMESTAMPTZ to UUID (client-generated)
--   - added set_status column to set_scores
--   - match_status CHECK constraint includes 'in_progress' and 'completed'
--
-- Run this script in Supabase SQL Editor to create all tables and triggers.
-- WARNING: This drops all existing tables. Run only on a fresh setup.
-- ============================================================================

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS player_stats CASCADE;
DROP TABLE IF EXISTS set_scores CASCADE;
DROP TABLE IF EXISTS matches CASCADE;

-- ============================================================================
-- TABLE: matches
-- ============================================================================
CREATE TABLE matches (
    match_id UUID PRIMARY KEY,
    tournament TEXT,
    team1_name TEXT NOT NULL DEFAULT 'Des Moines Eclipse',
    opponent_name TEXT NOT NULL,
    match_status TEXT NOT NULL DEFAULT 'in_progress' CHECK (match_status IN ('in_progress', 'completed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for matches
CREATE INDEX idx_matches_status ON matches(match_status);
CREATE INDEX idx_matches_opponent ON matches(opponent_name);
CREATE INDEX idx_matches_created ON matches(created_at DESC);

COMMENT ON TABLE matches IS 'Main match records';
COMMENT ON COLUMN matches.match_id IS 'Client-generated UUID';
COMMENT ON COLUMN matches.match_status IS 'Status: in_progress or completed';

-- ============================================================================
-- TABLE: set_scores
-- ============================================================================
CREATE TABLE set_scores (
    set_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES matches(match_id) ON DELETE CASCADE,
    set_number INTEGER NOT NULL CHECK (set_number BETWEEN 1 AND 3),
    set_status TEXT NOT NULL DEFAULT 'in_progress' CHECK (set_status IN ('in_progress', 'completed')),
    team1_score INTEGER NOT NULL DEFAULT 0,
    team1_kills INTEGER NOT NULL DEFAULT 0,
    team1_blocks INTEGER NOT NULL DEFAULT 0,
    team1_serves INTEGER NOT NULL DEFAULT 0,
    team1_errors INTEGER NOT NULL DEFAULT 0,
    team2_score INTEGER NOT NULL DEFAULT 0,
    team2_kills INTEGER NOT NULL DEFAULT 0,
    team2_blocks INTEGER NOT NULL DEFAULT 0,
    team2_serves INTEGER NOT NULL DEFAULT 0,
    team2_errors INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(match_id, set_number)
);

-- Indexes for set_scores
CREATE INDEX idx_set_scores_match ON set_scores(match_id);

COMMENT ON TABLE set_scores IS 'Scores and stats for each set';
COMMENT ON COLUMN set_scores.set_number IS 'Set number: 1, 2, or 3';
COMMENT ON COLUMN set_scores.set_status IS 'Status: in_progress or completed';

-- ============================================================================
-- TABLE: player_stats
-- ============================================================================
CREATE TABLE player_stats (
    stat_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES matches(match_id) ON DELETE CASCADE,
    player_name TEXT NOT NULL,
    team_name TEXT NOT NULL DEFAULT 'Des Moines Eclipse',
    attempts INTEGER NOT NULL DEFAULT 0,
    kills INTEGER NOT NULL DEFAULT 0,
    errors INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(match_id, player_name)
);

-- Indexes for player_stats
CREATE INDEX idx_player_stats_match ON player_stats(match_id);
CREATE INDEX idx_player_stats_name ON player_stats(player_name);
CREATE INDEX idx_player_stats_team ON player_stats(team_name);

COMMENT ON TABLE player_stats IS 'Individual player statistics accumulated across all sets in a match';

-- ============================================================================
-- TRIGGER: Auto-update updated_at timestamps
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_matches_updated_at BEFORE UPDATE ON matches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_set_scores_updated_at BEFORE UPDATE ON set_scores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_player_stats_updated_at BEFORE UPDATE ON player_stats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE set_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for matches" ON matches FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for set_scores" ON set_scores FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for player_stats" ON player_stats FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('matches', 'set_scores', 'player_stats')
ORDER BY table_name;

SELECT indexname FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('matches', 'set_scores', 'player_stats')
ORDER BY tablename, indexname;

SELECT tablename, policyname FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename;

-- ============================================================================
-- END OF SETUP SCRIPT V2
-- ============================================================================
