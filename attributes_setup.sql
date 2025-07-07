-- Create the attributes table
CREATE TABLE IF NOT EXISTS attributes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    description TEXT,
    bucket_id INTEGER
);

-- Create the bounty_attributes table for the relationship between bounties and attributes
CREATE TABLE IF NOT EXISTS bounty_attributes (
    bounty_id UUID NOT NULL REFERENCES bounties(id) ON DELETE CASCADE,
    attribute_id UUID NOT NULL REFERENCES attributes(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    type TEXT NOT NULL,
    value INTEGER NOT NULL,
    PRIMARY KEY (bounty_id, attribute_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_attributes_key ON attributes(key);
CREATE INDEX IF NOT EXISTS idx_bounty_attributes_bounty_id ON bounty_attributes(bounty_id);
CREATE INDEX IF NOT EXISTS idx_bounty_attributes_attribute_id ON bounty_attributes(attribute_id);
CREATE INDEX IF NOT EXISTS idx_bounty_attributes_type ON bounty_attributes(type);
CREATE INDEX IF NOT EXISTS idx_bounty_attributes_timestamp ON bounty_attributes(timestamp);

-- Enable Row Level Security (RLS) for better security
ALTER TABLE attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE bounty_attributes ENABLE ROW LEVEL SECURITY;

-- Create policies that allow all operations (you can modify this based on your security needs)
CREATE POLICY "Allow all operations on attributes" ON attributes
    FOR ALL USING (true);

CREATE POLICY "Allow all operations on bounty_attributes" ON bounty_attributes
    FOR ALL USING (true);

-- Add comments to the tables
COMMENT ON TABLE attributes IS 'Stores available attributes that can be assigned to bounties';
COMMENT ON COLUMN attributes.id IS 'Unique identifier for the attribute';
COMMENT ON COLUMN attributes.key IS 'The attribute name/key (e.g., "difficulty", "priority", "category")';
COMMENT ON COLUMN attributes.description IS 'Optional description of the attribute';
COMMENT ON COLUMN attributes.bucket_id IS 'Optional bucket/category ID for the attribute';

COMMENT ON TABLE bounty_attributes IS 'Stores the relationship between bounties and their attributes';
COMMENT ON COLUMN bounty_attributes.bounty_id IS 'Reference to the bounty';
COMMENT ON COLUMN bounty_attributes.attribute_id IS 'Reference to the attribute';
COMMENT ON COLUMN bounty_attributes.timestamp IS 'When the attribute was assigned to the bounty';
COMMENT ON COLUMN bounty_attributes.type IS 'The type of attribute value (e.g., "rating", "score", "level")';
COMMENT ON COLUMN bounty_attributes.value IS 'The numeric value for this attribute';

-- Insert some default attributes
INSERT INTO attributes (key, description) VALUES 
    ('difficulty', 'How difficult the bounty is to complete'),
    ('priority', 'How important the bounty is'),
    ('enjoyment', 'How enjoyable the bounty is'),
    ('impact', 'How much impact the bounty has'),
    ('time_required', 'How much time the bounty requires'),
    ('energy_level', 'Energy level required for the bounty')
ON CONFLICT (key) DO NOTHING; 