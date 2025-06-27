-- Create the bounty_selection_history table for the new AI bounties flow
CREATE TABLE IF NOT EXISTS bounty_selection_history (
    id SERIAL PRIMARY KEY,
    bucket_id INTEGER NOT NULL,
    category TEXT NOT NULL,
    bounty TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('pending', 'approved', 'rejected', 'finalized')),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,
    type TEXT DEFAULT 'daily',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create the bounty_actions table to store approved and rejected bounties (legacy)
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

-- Create the main bounties table
CREATE TABLE IF NOT EXISTS bounties (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    bounty TEXT NOT NULL,
    type TEXT NOT NULL,
    lifespan INTEGER,
    target_value INTEGER DEFAULT 1,
    expiry TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create the bountyBucketWeight table for category weights
CREATE TABLE IF NOT EXISTS bountyBucketWeight (
    id SERIAL PRIMARY KEY,
    bountyId INTEGER NOT NULL REFERENCES bounties(id) ON DELETE CASCADE,
    bucketId INTEGER NOT NULL,
    weight INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_bounty_selection_history_bucket_id ON bounty_selection_history(bucket_id);
CREATE INDEX IF NOT EXISTS idx_bounty_selection_history_action ON bounty_selection_history(action);
CREATE INDEX IF NOT EXISTS idx_bounty_selection_history_timestamp ON bounty_selection_history(timestamp);
CREATE INDEX IF NOT EXISTS idx_bounty_selection_history_category ON bounty_selection_history(category);
CREATE INDEX IF NOT EXISTS idx_bounty_selection_history_type ON bounty_selection_history(type);
CREATE INDEX IF NOT EXISTS idx_bounty_selection_history_created_at ON bounty_selection_history(created_at);

CREATE INDEX IF NOT EXISTS idx_bounty_actions_bucket_id ON bounty_actions(bucket_id);
CREATE INDEX IF NOT EXISTS idx_bounty_actions_action ON bounty_actions(action);
CREATE INDEX IF NOT EXISTS idx_bounty_actions_timestamp ON bounty_actions(timestamp);
CREATE INDEX IF NOT EXISTS idx_bounty_actions_category ON bounty_actions(category);
CREATE INDEX IF NOT EXISTS idx_bounty_actions_rejection_reason ON bounty_actions(rejection_reason);

CREATE INDEX IF NOT EXISTS idx_bounties_date ON bounties(date);
CREATE INDEX IF NOT EXISTS idx_bounties_type ON bounties(type);
CREATE INDEX IF NOT EXISTS idx_bountyBucketWeight_bountyId ON bountyBucketWeight(bountyId);
CREATE INDEX IF NOT EXISTS idx_bountyBucketWeight_bucketId ON bountyBucketWeight(bucketId);

-- Add comments to the tables
COMMENT ON TABLE bounty_selection_history IS 'Stores AI-generated bounties with status flow: pending -> approved/rejected -> finalized';
COMMENT ON COLUMN bounty_selection_history.bucket_id IS 'The bucket/category ID from the AI response';
COMMENT ON COLUMN bounty_selection_history.category IS 'The human-readable category name';
COMMENT ON COLUMN bounty_selection_history.bounty IS 'The bounty text';
COMMENT ON COLUMN bounty_selection_history.action IS 'Status: pending, approved, rejected, or finalized';
COMMENT ON COLUMN bounty_selection_history.timestamp IS 'When the action was taken';
COMMENT ON COLUMN bounty_selection_history.notes IS 'Optional notes or rejection reason';
COMMENT ON COLUMN bounty_selection_history.type IS 'The type of bounty (daily, weekly, yearly)';

COMMENT ON TABLE bounty_actions IS 'Legacy table - Stores user actions (approve/reject) on AI-generated bounties';
COMMENT ON COLUMN bounty_actions.bucket_id IS 'The bucket/category ID from the AI response';
COMMENT ON COLUMN bounty_actions.bounty IS 'The bounty text that was approved or rejected';
COMMENT ON COLUMN bounty_actions.action IS 'Whether the bounty was approved or rejected';
COMMENT ON COLUMN bounty_actions.category IS 'The human-readable category name';
COMMENT ON COLUMN bounty_actions.timestamp IS 'When the action was taken';
COMMENT ON COLUMN bounty_actions.rejection_reason IS 'Optional reason or notes for rejected bounties';

COMMENT ON TABLE bounties IS 'Main bounties table storing all bounties';
COMMENT ON COLUMN bounties.date IS 'The date the bounty was created';
COMMENT ON COLUMN bounties.bounty IS 'The bounty text';
COMMENT ON COLUMN bounties.type IS 'The type of bounty (daily, weekly, yearly, AI Generated)';
COMMENT ON COLUMN bounties.lifespan IS 'The lifespan of the bounty in days';
COMMENT ON COLUMN bounties.target_value IS 'The target value for the bounty';
COMMENT ON COLUMN bounties.expiry IS 'The expiry date/time for the bounty';

COMMENT ON TABLE bountyBucketWeight IS 'Stores category weights for bounties';
COMMENT ON COLUMN bountyBucketWeight.bountyId IS 'Reference to the bounty';
COMMENT ON COLUMN bountyBucketWeight.bucketId IS 'The bucket/category ID';
COMMENT ON COLUMN bountyBucketWeight.weight IS 'The weight for this category';

-- Enable Row Level Security (RLS) for better security
ALTER TABLE bounty_selection_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE bounty_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bounties ENABLE ROW LEVEL SECURITY;
ALTER TABLE bountyBucketWeight ENABLE ROW LEVEL SECURITY;

-- Create policies that allow all operations (you can modify this based on your security needs)
CREATE POLICY "Allow all operations on bounty_selection_history" ON bounty_selection_history
    FOR ALL USING (true);

CREATE POLICY "Allow all operations on bounty_actions" ON bounty_actions
    FOR ALL USING (true);

CREATE POLICY "Allow all operations on bounties" ON bounties
    FOR ALL USING (true);

CREATE POLICY "Allow all operations on bountyBucketWeight" ON bountyBucketWeight
    FOR ALL USING (true); 