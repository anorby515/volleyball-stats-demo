-- ============================================================================
-- Des Moines Eclipse Volleyball Stat Tracker - Error Tracking Migration
-- ============================================================================
-- Adds detailed error type columns to set_scores table.
-- These track Eclipse errors broken down by category within each set.
--
-- Run this script in Supabase SQL Editor to add the new columns.
-- Safe to run on existing data (all columns default to 0).
-- ============================================================================

-- Add error type breakdown columns to set_scores
ALTER TABLE set_scores ADD COLUMN IF NOT EXISTS attack_errors INTEGER NOT NULL DEFAULT 0;
ALTER TABLE set_scores ADD COLUMN IF NOT EXISTS block_errors INTEGER NOT NULL DEFAULT 0;
ALTER TABLE set_scores ADD COLUMN IF NOT EXISTS serve_errors INTEGER NOT NULL DEFAULT 0;
ALTER TABLE set_scores ADD COLUMN IF NOT EXISTS pass_errors INTEGER NOT NULL DEFAULT 0;
ALTER TABLE set_scores ADD COLUMN IF NOT EXISTS penalty_errors INTEGER NOT NULL DEFAULT 0;

-- Add comments for the new columns
COMMENT ON COLUMN set_scores.attack_errors IS 'Eclipse attack errors (unforced hitting errors)';
COMMENT ON COLUMN set_scores.block_errors IS 'Eclipse block errors (attacks blocked by opponent)';
COMMENT ON COLUMN set_scores.serve_errors IS 'Eclipse serve errors';
COMMENT ON COLUMN set_scores.pass_errors IS 'Eclipse pass errors';
COMMENT ON COLUMN set_scores.penalty_errors IS 'Eclipse penalty errors';

-- ============================================================================
-- VERIFICATION
-- ============================================================================
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'set_scores'
AND column_name IN ('attack_errors', 'block_errors', 'serve_errors', 'pass_errors', 'penalty_errors')
ORDER BY column_name;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
