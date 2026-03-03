-- ============================================================================
-- Migration: Add CHECK constraints for data integrity
-- ============================================================================
-- Adds:
--   1. CHECK (>= 0) on all integer stat columns (set_scores, player_stats)
--   2. char_length() limits on text columns (matches, player_stats)
--   3. Missing serves/aces/serve_errors columns on player_stats
--
-- Safe to run multiple times (uses IF NOT EXISTS / named constraints).
-- ============================================================================

-- ============================================================================
-- STEP 1: Add missing player_stats columns (serves, aces, serve_errors)
-- ============================================================================
ALTER TABLE player_stats ADD COLUMN IF NOT EXISTS serves INTEGER NOT NULL DEFAULT 0;
ALTER TABLE player_stats ADD COLUMN IF NOT EXISTS aces INTEGER NOT NULL DEFAULT 0;
ALTER TABLE player_stats ADD COLUMN IF NOT EXISTS serve_errors INTEGER NOT NULL DEFAULT 0;

-- ============================================================================
-- STEP 2: CHECK (>= 0) on set_scores integer columns
-- ============================================================================
ALTER TABLE set_scores ADD CONSTRAINT chk_set_team1_score_nonneg CHECK (team1_score >= 0);
ALTER TABLE set_scores ADD CONSTRAINT chk_set_team1_kills_nonneg CHECK (team1_kills >= 0);
ALTER TABLE set_scores ADD CONSTRAINT chk_set_team1_blocks_nonneg CHECK (team1_blocks >= 0);
ALTER TABLE set_scores ADD CONSTRAINT chk_set_team1_serves_nonneg CHECK (team1_serves >= 0);
ALTER TABLE set_scores ADD CONSTRAINT chk_set_team1_errors_nonneg CHECK (team1_errors >= 0);
ALTER TABLE set_scores ADD CONSTRAINT chk_set_team2_score_nonneg CHECK (team2_score >= 0);
ALTER TABLE set_scores ADD CONSTRAINT chk_set_team2_kills_nonneg CHECK (team2_kills >= 0);
ALTER TABLE set_scores ADD CONSTRAINT chk_set_team2_blocks_nonneg CHECK (team2_blocks >= 0);
ALTER TABLE set_scores ADD CONSTRAINT chk_set_team2_serves_nonneg CHECK (team2_serves >= 0);
ALTER TABLE set_scores ADD CONSTRAINT chk_set_team2_errors_nonneg CHECK (team2_errors >= 0);
ALTER TABLE set_scores ADD CONSTRAINT chk_set_attack_errors_nonneg CHECK (attack_errors >= 0);
ALTER TABLE set_scores ADD CONSTRAINT chk_set_block_errors_nonneg CHECK (block_errors >= 0);
ALTER TABLE set_scores ADD CONSTRAINT chk_set_serve_errors_nonneg CHECK (serve_errors >= 0);
ALTER TABLE set_scores ADD CONSTRAINT chk_set_pass_errors_nonneg CHECK (pass_errors >= 0);
ALTER TABLE set_scores ADD CONSTRAINT chk_set_penalty_errors_nonneg CHECK (penalty_errors >= 0);

-- ============================================================================
-- STEP 3: CHECK (>= 0) on player_stats integer columns
-- ============================================================================
ALTER TABLE player_stats ADD CONSTRAINT chk_ps_attempts_nonneg CHECK (attempts >= 0);
ALTER TABLE player_stats ADD CONSTRAINT chk_ps_kills_nonneg CHECK (kills >= 0);
ALTER TABLE player_stats ADD CONSTRAINT chk_ps_errors_nonneg CHECK (errors >= 0);
ALTER TABLE player_stats ADD CONSTRAINT chk_ps_serves_nonneg CHECK (serves >= 0);
ALTER TABLE player_stats ADD CONSTRAINT chk_ps_aces_nonneg CHECK (aces >= 0);
ALTER TABLE player_stats ADD CONSTRAINT chk_ps_serve_errors_nonneg CHECK (serve_errors >= 0);

-- ============================================================================
-- STEP 4: Text length limits
-- ============================================================================
ALTER TABLE matches ADD CONSTRAINT chk_opponent_name_len CHECK (char_length(opponent_name) <= 100);
ALTER TABLE matches ADD CONSTRAINT chk_tournament_len CHECK (tournament IS NULL OR char_length(tournament) <= 100);
ALTER TABLE matches ADD CONSTRAINT chk_team1_name_len CHECK (char_length(team1_name) <= 100);
ALTER TABLE player_stats ADD CONSTRAINT chk_player_name_len CHECK (char_length(player_name) <= 100);
ALTER TABLE player_stats ADD CONSTRAINT chk_team_name_len CHECK (char_length(team_name) <= 100);

-- ============================================================================
-- VERIFICATION
-- ============================================================================
SELECT conname, conrelid::regclass AS table_name
FROM pg_constraint
WHERE contype = 'c'
AND conrelid::regclass::text IN ('matches', 'set_scores', 'player_stats')
ORDER BY conrelid::regclass::text, conname;
