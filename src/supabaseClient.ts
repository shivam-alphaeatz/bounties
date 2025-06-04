import { createClient } from '@supabase/supabase-js';

// Supabase connection details from your insert.py file
const supabaseUrl = 'https://nwfhqrmdjmjopbxulyhu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53Zmhxcm1kam1qb3BieHVseWh1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjI2NzkwMywiZXhwIjoyMDYxODQzOTAzfQ.QjKCJFJaJM1E3PKa22wJ2yvptXBLmYw-u4QF7fS0sfs';

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