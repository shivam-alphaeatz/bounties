import { supabase } from '../supabaseClient';

export interface AIBounty {
  id: string;
  bucket_id: number;
  category: string;
  bounty: string;
  action: 'pending' | 'accepted' | 'rejected' | 'finalized';
  type: 'daily' | 'weekly' | 'yearly';
  created_at: string;
  date?: string;
  notes?: string;
}

export interface PendingBounty {
  bucket_id: number;
  category: string;
  bounty: string;
  type: 'daily' | 'weekly' | 'yearly';
}

export interface SubmitBountyData {
  date: string;
  expiry: string;
  lifespan: number;
}

export interface BountyToBeSubmitted {
  bounty: string;
  bucket_id: number;
  category: string;
  type: 'daily' | 'weekly' | 'yearly';
  created_at: string;
}

export class AIBountiesService {
  // Step A: AI Generation Function (runs independently) -> Step B: Insert into bounty_selection_history (status: pending)
  static async insertPendingBounties(bounties: PendingBounty[]): Promise<void> {
    try {
      const pendingBounties = bounties.map(bounty => ({
        bucket_id: bounty.bucket_id,
        category: bounty.category,
        bounty: bounty.bounty,
        action: 'pending' as const,
        type: bounty.type,
        created_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('bounty_selection_history')
        .insert(pendingBounties);

      if (error) {
        console.error('Error inserting pending bounties:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to insert pending bounties:', error);
      throw error;
    }
  }

  // Step C: UI fetches all PENDING bounties < 24h
  static async getPendingBounties(): Promise<AIBounty[]> {
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from('bounty_selection_history')
        .select('*')
        .eq('action', 'pending')
        .gte('created_at', twentyFourHoursAgo)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching pending bounties:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Failed to fetch pending bounties:', error);
      throw error;
    }
  }

  // Step D: Admin Reviews -> Step E: Update status = 'accepted'
  static async approveBounty(bountyId: string, date: string, notes?: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('bounty_selection_history')
        .update({
          action: 'accepted',
          date: date,
          notes: notes
        })
        .eq('id', bountyId);

      if (error) {
        console.error('Error approving bounty:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to approve bounty:', error);
      throw error;
    }
  }

  // Step D: Admin Reviews -> Step F: Update status = 'rejected'
  static async rejectBounty(bountyId: string, notes?: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('bounty_selection_history')
        .update({
          action: 'rejected',
          notes: notes
        })
        .eq('id', bountyId);

      if (error) {
        console.error('Error rejecting bounty:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to reject bounty:', error);
      throw error;
    }
  }

  // NEW: Get bounties to be submitted using edge function
  static async getBountiesToBeSubmitted(date: string): Promise<BountyToBeSubmitted[]> {
    try {
      const response = await fetch('https://nwfhqrmdjmjopbxulyhu.supabase.co/functions/v1/bounties_to_be_submitted', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53Zmhxcm1kam1qb3BieHVseWh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYyNjc5MDMsImV4cCI6MjA2MTg0MzkwM30.NvbyIKp7BxALfO0SBpdFcbCXXhPcOJ_4YJY8HPyVlzs',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ date })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to get bounties to be submitted:', error);
      throw error;
    }
  }

  // NEW: Submit specific bounties to main table
  static async submitBountiesToMainTable(bounties: BountyToBeSubmitted[], submitData: SubmitBountyData): Promise<{ successCount: number; errorCount: number }> {
    try {
      let successCount = 0;
      let errorCount = 0;

      for (const bounty of bounties) {
        try {
          // Insert into main bounties table
          const { data: bountyData, error: insertError } = await supabase
            .from('bounties')
            .insert({
              date: submitData.date,
              bounty: bounty.bounty,
              type: bounty.type,
              target_value: 1,
              lifespan: submitData.lifespan,
              expiry: submitData.expiry
            })
            .select();

          if (insertError) {
            console.error('Error inserting bounty to main table:', insertError);
            errorCount++;
            continue;
          }

          // If bounty was inserted successfully, add category weight
          if (bountyData && bountyData.length > 0) {
            const bountyId = bountyData[0].id;
            
            // Add category weight
            const { error: weightError } = await supabase
              .from('bountyBucketWeight')
              .insert({
                bountyId: bountyId,
                bucketId: bounty.bucket_id,
                weight: 1 // Default weight of 1
              });

            if (weightError) {
              console.error('Error saving category weight:', weightError);
              // Don't count this as a failure since the bounty was saved
            }
            
            successCount++;
          }
        } catch (bountyError) {
          console.error('Error processing bounty:', bountyError);
          errorCount++;
        }
      }

      return { successCount, errorCount };
    } catch (error) {
      console.error('Failed to submit bounties to main table:', error);
      throw error;
    }
  }

  // Get all bounties for display (pending, accepted, rejected)
  static async getAllBounties(): Promise<AIBounty[]> {
    try {
      const { data, error } = await supabase
        .from('bounty_selection_history')
        .select('*')
        .in('action', ['pending', 'accepted', 'rejected'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching all bounties:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Failed to fetch all bounties:', error);
      throw error;
    }
  }

  // Get bounties by status
  static async getBountiesByStatus(status: 'pending' | 'accepted' | 'rejected' | 'finalized'): Promise<AIBounty[]> {
    try {
      const { data, error } = await supabase
        .from('bounty_selection_history')
        .select('*')
        .eq('action', status)
        .order('created_at', { ascending: false });

      if (error) {
        console.error(`Error fetching ${status} bounties:`, error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error(`Failed to fetch ${status} bounties:`, error);
      throw error;
    }
  }

  // Get count of bounties by status
  static async getBountyCounts(): Promise<{ pending: number; accepted: number; rejected: number; finalized: number }> {
    try {
      const { data, error } = await supabase
        .from('bounty_selection_history')
        .select('action');

      if (error) {
        console.error('Error fetching bounty counts:', error);
        throw error;
      }

      const counts = {
        pending: 0,
        accepted: 0,
        rejected: 0,
        finalized: 0
      };

      data?.forEach(item => {
        if (item.action in counts) {
          counts[item.action as keyof typeof counts]++;
        }
      });

      return counts;
    } catch (error) {
      console.error('Failed to fetch bounty counts:', error);
      throw error;
    }
  }

  // Step K: Background Cleanup: Delete old pending
  static async cleanupOldPendingBounties(): Promise<void> {
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const { error } = await supabase
        .from('bounty_selection_history')
        .delete()
        .eq('action', 'pending')
        .lt('created_at', twentyFourHoursAgo);

      if (error) {
        console.error('Error cleaning up old pending bounties:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to cleanup old pending bounties:', error);
      throw error;
    }
  }
} 