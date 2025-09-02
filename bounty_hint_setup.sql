-- Create the bounty_hint table for storing hints related to bounties
-- One bounty can have only one hint
CREATE TABLE IF NOT EXISTS bounty_hint (
    bounty_id TEXT PRIMARY KEY,
    hint TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'tip' CHECK (type IN ('tip', 'warning', 'info')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_bounty_hint_type ON bounty_hint(type);
CREATE INDEX IF NOT EXISTS idx_bounty_hint_created_at ON bounty_hint(created_at);

-- Add comments to the table and columns
COMMENT ON TABLE bounty_hint IS 'Stores helpful hints and tips for bounties - one hint per bounty';
COMMENT ON COLUMN bounty_hint.bounty_id IS 'Primary key - reference to the bounty ID (can be UUID or integer as string)';
COMMENT ON COLUMN bounty_hint.hint IS 'The hint text content';
COMMENT ON COLUMN bounty_hint.type IS 'Type of hint: tip, warning, or info';
COMMENT ON COLUMN bounty_hint.created_at IS 'When the hint was created';

-- Enable Row Level Security (RLS) for better security
ALTER TABLE bounty_hint ENABLE ROW LEVEL SECURITY;

-- Create policy that allows all operations (you can modify this based on your security needs)
CREATE POLICY "Allow all operations on bounty_hint" ON bounty_hint
    FOR ALL USING (true);

-- Insert sample data (optional - remove if not needed)
-- INSERT INTO bounty_hint (bounty_id, hint, type) VALUES
-- ('sample-bounty-id', 'Keep a pitcher of water with citrus slices handy.', 'tip'),
-- ('sample-bounty-id', 'Make sure to drink water regularly throughout the day.', 'warning'),
-- ('sample-bounty-id', 'Hydration is key to maintaining energy levels.', 'info');
