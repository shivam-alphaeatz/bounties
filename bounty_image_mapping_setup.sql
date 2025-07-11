-- Create the bounty_image_mapping table
CREATE TABLE IF NOT EXISTS bounty_image_mapping (
    bounty_id UUID NOT NULL REFERENCES bounties(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    PRIMARY KEY (bounty_id)
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_bounty_image_mapping_bounty_id ON bounty_image_mapping(bounty_id);

-- Enable Row Level Security (RLS) for better security
ALTER TABLE bounty_image_mapping ENABLE ROW LEVEL SECURITY;

-- Create policy that allows all operations (you can modify this based on your security needs)
CREATE POLICY "Allow all operations on bounty_image_mapping" ON bounty_image_mapping
    FOR ALL USING (true);

-- Add comments to the table
COMMENT ON TABLE bounty_image_mapping IS 'Stores image URLs for bounties';
COMMENT ON COLUMN bounty_image_mapping.bounty_id IS 'Reference to the bounty (UUID)';
COMMENT ON COLUMN bounty_image_mapping.image_url IS 'URL of the image for the bounty'; 