import { createClient } from '@supabase/supabase-js';

// Supabase connection details from environment variables
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://nwfhqrmdjmjopbxulyhu.supabase.co';
// TODO: Replace this with your actual anon key from Supabase dashboard
// Go to Settings → API → Copy the "anon public" key (not service_role)
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'YOUR_ANON_KEY_HERE';

// Create a single supabase client for interacting with your database
export const supabase = createClient(supabaseUrl, supabaseKey);

// Bucket ID to Category mapping (reverse of the one in insert.py)
export const bucketMap = {
  1: 'Nourish',
  2: 'Rest',
  3: 'Active Life',
  4: 'Connect',
  5: 'Mindset',
  6: 'Explore'
}; 