-- Add rating column to existing bounty_selection_history table
-- Run this script in your Supabase SQL editor if the column doesn't exist

-- Add the rating column with constraint
ALTER TABLE bounty_selection_history 
ADD COLUMN IF NOT EXISTS rating INTEGER CHECK (rating IS NULL OR (rating >= 0 AND rating <= 10));

-- Add comment to the column
COMMENT ON COLUMN bounty_selection_history.rating IS 'Rating of the bounty (0-10 scale)';

-- Create index for better performance on rating queries (optional)
CREATE INDEX IF NOT EXISTS idx_bounty_selection_history_rating ON bounty_selection_history(rating); 