-- ============================================================================
-- Add set_status column to set_scores table
-- Run this in Supabase SQL Editor to update your existing database
-- ============================================================================

-- Add the set_status column
ALTER TABLE set_scores 
ADD COLUMN set_status TEXT NOT NULL DEFAULT 'in_progress' 
CHECK (set_status IN ('in_progress', 'completed'));

-- Add comment
COMMENT ON COLUMN set_scores.set_status IS 'Status: in_progress or completed';

-- Update any existing records to be 'completed' if they have scores
UPDATE set_scores 
SET set_status = 'completed' 
WHERE team1_score > 0 OR team2_score > 0;

-- Verify the change
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'set_scores' 
AND column_name = 'set_status';

-- ============================================================================
-- END OF UPDATE SCRIPT
-- ============================================================================
