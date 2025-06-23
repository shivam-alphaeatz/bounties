import { supabase } from '../supabaseClient';

export class DatabaseTest {
  static async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      // Test basic connection
      const { data, error } = await supabase
        .from('bounty_selection_history')
        .select('count')
        .limit(1);

      if (error) {
        if (error.message.includes('relation "bounty_selection_history" does not exist')) {
          return {
            success: false,
            message: '❌ Table "bounty_selection_history" does not exist!\n\nPlease create the table with this SQL:\n\nCREATE TABLE bounty_selection_history (\n  id SERIAL PRIMARY KEY,\n  bucket_id INTEGER NOT NULL,\n  category TEXT NOT NULL,\n  bounty TEXT NOT NULL,\n  action TEXT NOT NULL,\n  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()\n);'
          };
        }
        
        if (error.message.includes('permission')) {
          return {
            success: false,
            message: '❌ Permission denied!\n\nPlease check your Supabase RLS (Row Level Security) policies.\n\nYou may need to enable RLS and create appropriate policies for the bounty_selection_history table.'
          };
        }
        
        return {
          success: false,
          message: `❌ Database connection failed!\n\nError: ${error.message}\n\nPlease check your Supabase credentials in the .env file.`
        };
      }

      return {
        success: true,
        message: '✅ Database connection successful!\n\nTable "bounty_selection_history" exists and is accessible.'
      };

    } catch (error) {
      console.error('Database test error:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('fetch')) {
          return {
            success: false,
            message: '❌ Network error!\n\nUnable to connect to Supabase. Please check your internet connection and Supabase URL.'
          };
        }
        
        return {
          success: false,
          message: `❌ Unexpected error!\n\nError: ${error.message}`
        };
      }

      return {
        success: false,
        message: '❌ Unknown error occurred while testing database connection.'
      };
    }
  }

  static async testInsert(): Promise<{ success: boolean; message: string }> {
    try {
      const testData = {
        bucket_id: 99,
        category: 'Test Category',
        bounty: 'Test bounty for database connection',
        action: 'accepted',
        timestamp: new Date().toISOString(),
        notes: 'This is a test note.',
      };

      const { data, error } = await supabase
        .from('bounty_selection_history')
        .insert(testData)
        .select();

      if (error) {
        return {
          success: false,
          message: `❌ Insert test failed!\n\nError: ${error.message}\n\nThis means the app cannot save bounty actions to the database.`
        };
      }

      // Clean up test data
      if (data && data.length > 0) {
        await supabase
          .from('bounty_selection_history')
          .delete()
          .eq('id', data[0].id);
      }

      return {
        success: true,
        message: '✅ Insert test successful!\n\nThe app can save bounty actions to the database.'
      };

    } catch (error) {
      console.error('Insert test error:', error);
      return {
        success: false,
        message: `❌ Insert test failed!\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  static async runFullTest(): Promise<string> {
    const connectionTest = await this.testConnection();
    let result = connectionTest.message + '\n\n';

    if (connectionTest.success) {
      const insertTest = await this.testInsert();
      result += insertTest.message;
    }

    return result;
  }
} 