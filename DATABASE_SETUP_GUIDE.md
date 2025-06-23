# Database Setup Guide

If you're getting "Failed to save to database. Actions are saved locally." error, follow these steps to resolve the issue.

## Step 1: Check Database Connection

1. Open your browser's Developer Tools (F12)
2. Go to the Console tab
3. Open the AI Bounties modal
4. Click the "Test DB" button
5. Check the console output for detailed error messages

## Step 2: Create the Database Table

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
```

5. Click "Run" to execute the SQL

### Option B: Using the Test Button

1. The "Test DB" button in the AI Bounties modal will attempt to create the table automatically
2. Check the console for success/error messages

## Step 3: Verify Table Creation

1. In Supabase Dashboard, go to "Table Editor"
2. You should see a `bounty_actions` table
3. The table should have these columns:
   - `id` (SERIAL PRIMARY KEY)
   - `bucket_id` (INTEGER)
   - `bounty` (TEXT)
   - `action` (TEXT)
   - `timestamp` (TIMESTAMP WITH TIME ZONE)
   - `category` (TEXT)
   - `rejection_reason` (TEXT)
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

### Issue 2: "permission denied"
**Solution**: Check your Supabase API key and make sure it has the correct permissions.

### Issue 3: "network error"
**Solution**: Check your internet connection and Supabase service status.

### Issue 4: "invalid input syntax"
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
```

## Still Having Issues?

1. Check the browser console for detailed error messages
2. Verify your Supabase project is active and not paused
3. Make sure you have the correct API key with proper permissions
4. Try creating a simple test record manually in the Supabase dashboard

## Fallback Solution

If database issues persist, the application will continue to work using localStorage as a fallback. All your data will be saved locally and can be exported to CSV. 