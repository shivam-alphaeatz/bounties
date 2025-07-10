-- Add type column to attributes table
ALTER TABLE attributes ADD COLUMN IF NOT EXISTS type TEXT;

-- Update existing attributes to have a default type
UPDATE attributes SET type = 'attribute' WHERE type IS NULL;

-- Add comment for the new column
COMMENT ON COLUMN attributes.type IS 'The type of attribute (e.g., "attribute", "fact", "image")'; 