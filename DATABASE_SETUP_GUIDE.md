# Database Setup Guide

If you're getting "Failed to save to database. Actions are saved locally." error, follow these steps to resolve the issue.

## Step 1: Check Database Connection

1. Open your browser's Developer Tools (F12)
2. Go to the Console tab
3. Open the AI Bounties modal
4. Click the "Test DB" button
5. Check the console output for detailed error messages

## Step 2: Create the Database Tables

### Option A: Using Supabase Dashboard (Recommended)

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to the "SQL Editor" tab
4. Copy and paste the following SQL:

```sql
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
CREATE INDEX IF NOT EXISTS idx_bounty_actions_bucket_id ON bounty_actions(bucket_id);
CREATE INDEX IF NOT EXISTS idx_bounty_actions_action ON bounty_actions(action);
CREATE INDEX IF NOT EXISTS idx_bounty_actions_timestamp ON bounty_actions(timestamp);
CREATE INDEX IF NOT EXISTS idx_bounty_actions_category ON bounty_actions(category);
CREATE INDEX IF NOT EXISTS idx_bounty_actions_rejection_reason ON bounty_actions(rejection_reason);

CREATE INDEX IF NOT EXISTS idx_bounties_date ON bounties(date);
CREATE INDEX IF NOT EXISTS idx_bounties_type ON bounties(type);
CREATE INDEX IF NOT EXISTS idx_bountyBucketWeight_bountyId ON bountyBucketWeight(bountyId);
CREATE INDEX IF NOT EXISTS idx_bountyBucketWeight_bucketId ON bountyBucketWeight(bucketId);

-- Enable Row Level Security (RLS) for better security
ALTER TABLE bounty_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bounties ENABLE ROW LEVEL SECURITY;
ALTER TABLE bountyBucketWeight ENABLE ROW LEVEL SECURITY;

-- Create policies that allow all operations (you can modify this based on your security needs)
CREATE POLICY "Allow all operations on bounty_actions" ON bounty_actions
    FOR ALL USING (true);

CREATE POLICY "Allow all operations on bounties" ON bounties
    FOR ALL USING (true);

CREATE POLICY "Allow all operations on bountyBucketWeight" ON bountyBucketWeight
    FOR ALL USING (true);
```

5. Click "Run" to execute the SQL

### Option B: Using the Test Button

1. The "Test DB" button in the AI Bounties modal will attempt to create the table automatically
2. Check the console for success/error messages

## Step 3: Verify Table Creation

1. In Supabase Dashboard, go to "Table Editor"
2. You should see these tables:
   - `bounty_actions` - Stores AI bounty approval/rejection actions
   - `bounties` - Main bounties table
   - `bountyBucketWeight` - Stores category weights for bounties

### bounty_actions table columns:
   - `id` (SERIAL PRIMARY KEY)
   - `bucket_id` (INTEGER)
   - `bounty` (TEXT)
   - `action` (TEXT)
   - `timestamp` (TIMESTAMP WITH TIME ZONE)
   - `category` (TEXT)
   - `rejection_reason` (TEXT)
   - `created_at` (TIMESTAMP WITH TIME ZONE)

### bounties table columns:
   - `id` (SERIAL PRIMARY KEY)
   - `date` (DATE)
   - `bounty` (TEXT)
   - `type` (TEXT)
   - `lifespan` (INTEGER)
   - `target_value` (INTEGER)
   - `expiry` (TIMESTAMP WITH TIME ZONE)
   - `created_at` (TIMESTAMP WITH TIME ZONE)

### bountyBucketWeight table columns:
   - `id` (SERIAL PRIMARY KEY)
   - `bountyId` (INTEGER - Foreign Key to bounties.id)
   - `bucketId` (INTEGER)
   - `weight` (INTEGER)
   - `created_at` (TIMESTAMP WITH TIME ZONE)

## Step 4: Test the Connection

1. Click the "Test DB" button again
2. You should see success messages in the console:
   - ✅ Database connection successful
   - ✅ bounty_actions table exists
   - ✅ Test insert successful
   - 🎉 All database tests passed!

## Common Issues and Solutions

### Issue 1: "relation 'bounty_actions' does not exist"
**Solution**: The table hasn't been created. Follow Step 2 to create it.

### Issue 2: "relation 'bounties' does not exist"
**Solution**: The main bounties table hasn't been created. Follow Step 2 to create all tables.

### Issue 3: "permission denied"
**Solution**: Check your Supabase API key and make sure it has the correct permissions.

### Issue 4: "network error"
**Solution**: Check your internet connection and Supabase service status.

### Issue 5: "invalid input syntax"
**Solution**: The data format might be incorrect. Check the console logs for the exact error.

## Troubleshooting

### Check Supabase Configuration

Verify your `src/supabaseClient.ts` file has the correct URL and API key:

```typescript
const supabaseUrl = 'https://nwfhqrmdjmjopbxulyhu.supabase.co';
const supabaseKey = 'your-api-key-here';
```

### Check API Key Permissions

1. Go to Supabase Dashboard → Settings → API
2. Make sure you're using the `service_role` key (not `anon`)
3. The key should have full access to the database

### Enable Row Level Security (RLS)

If you get RLS errors, you may need to disable RLS temporarily:

```sql
ALTER TABLE bounty_actions DISABLE ROW LEVEL SECURITY;
ALTER TABLE bounties DISABLE ROW LEVEL SECURITY;
ALTER TABLE bountyBucketWeight DISABLE ROW LEVEL SECURITY;
```

## Still Having Issues?

1. Check the browser console for detailed error messages
2. Verify your Supabase project is active and not paused
3. Make sure you have the correct API key with proper permissions
4. Try creating a simple test record manually in the Supabase dashboard

## Fallback Solution

If database issues persist, the application will continue to work using localStorage as a fallback. All your data will be saved locally and can be exported to CSV. 