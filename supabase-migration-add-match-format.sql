-- ============================================================================
-- Migration: Add match_format and scoring_format columns to matches table
-- ============================================================================
-- These columns were added to the v2 schema and application code but were
-- never migrated to the live database, causing ALL Supabase match syncs to
-- fail with PGRST204: "Could not find the 'match_format' column".
--
-- Run this in the Supabase SQL Editor to apply the migration.
-- Safe to run on a live database — uses ADD COLUMN IF NOT EXISTS.
-- ============================================================================

ALTER TABLE matches
    ADD COLUMN IF NOT EXISTS match_format TEXT NOT NULL DEFAULT 'bracket_play'
        CHECK (match_format IN ('bracket_play', 'pool_play')),
    ADD COLUMN IF NOT EXISTS scoring_format TEXT
        CHECK (scoring_format IN ('0_to_21', '4_to_25'));

-- Add comments
COMMENT ON COLUMN matches.match_format IS 'Format: bracket_play or pool_play';
COMMENT ON COLUMN matches.scoring_format IS 'Pool play scoring: 0_to_21 or 4_to_25 (null for bracket play)';

-- Verify the columns were added
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'matches'
ORDER BY ordinal_position;
