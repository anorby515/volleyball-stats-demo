-- ============================================================================
-- Migration: Add error-type columns to set_scores
-- ============================================================================
-- These columns were added to the application code in the error tracking
-- feature but were missing from the database schema, causing all Supabase
-- syncs for set_scores to fail with "column does not exist" errors.
--
-- Run this in the Supabase SQL Editor to apply the migration.
-- Safe to run on a live database — uses ADD COLUMN IF NOT EXISTS.
-- ============================================================================

ALTER TABLE set_scores
    ADD COLUMN IF NOT EXISTS attack_errors  INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS block_errors   INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS serve_errors   INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS pass_errors    INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS penalty_errors INTEGER NOT NULL DEFAULT 0;

-- Verify the columns were added
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'set_scores'
ORDER BY ordinal_position;
