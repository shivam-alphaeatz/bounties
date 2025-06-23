-- Create the bounty_actions table to store approved and rejected bounties
CREATE TABLE IF NOT EXISTS bounty_actions (
    id SERIAL PRIMARY KEY,
    bucket_id INTEGER NOT NULL,
    bounty TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('approved', 'rejected')),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    category TEXT,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_bounty_actions_bucket_id ON bounty_actions(bucket_id);
CREATE INDEX IF NOT EXISTS idx_bounty_actions_action ON bounty_actions(action);
CREATE INDEX IF NOT EXISTS idx_bounty_actions_timestamp ON bounty_actions(timestamp);
CREATE INDEX IF NOT EXISTS idx_bounty_actions_category ON bounty_actions(category);
CREATE INDEX IF NOT EXISTS idx_bounty_actions_rejection_reason ON bounty_actions(rejection_reason);

-- Add comments to the table
COMMENT ON TABLE bounty_actions IS 'Stores user actions (approve/reject) on AI-generated bounties';
COMMENT ON COLUMN bounty_actions.bucket_id IS 'The bucket/category ID from the AI response';
COMMENT ON COLUMN bounty_actions.bounty IS 'The bounty text that was approved or rejected';
COMMENT ON COLUMN bounty_actions.action IS 'Whether the bounty was approved or rejected';
COMMENT ON COLUMN bounty_actions.category IS 'The human-readable category name';
COMMENT ON COLUMN bounty_actions.timestamp IS 'When the action was taken';
COMMENT ON COLUMN bounty_actions.rejection_reason IS 'Optional reason or notes for rejected bounties';

-- Enable Row Level Security (RLS) for better security
ALTER TABLE bounty_actions ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows all operations (you can modify this based on your security needs)
CREATE POLICY "Allow all operations on bounty_actions" ON bounty_actions
    FOR ALL USING (true); 