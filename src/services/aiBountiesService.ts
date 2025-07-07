import { supabase } from '../supabaseClient';
import { bucketMap } from '../supabaseClient';

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
  rating?: number;
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
  id: number;
  bounty: string;
  bucket_id: number;
  category: string;
  type: 'daily' | 'weekly' | 'yearly';
  created_at: string;
}

export class AIBountiesService {
  // Step A: AI Generation Function (runs independently) -> Step B: Insert into bounty_selection_history (status: pending)
  static async insertPendingBounties(bounties: PendingBounty[]): Promise<{ inserted: number; duplicates: number; total: number }> {
    try {
      // Check for existing bounties to prevent duplicates
      const existingBounties = await supabase
        .from('bounty_selection_history')
        .select('bounty, bucket_id, type')
        .in('action', ['pending', 'accepted'])
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Last 24 hours

      const existingBountySet = new Set();
      const existingBountyTextSet = new Set(); // For exact text matches
      
      if (existingBounties.data) {
        existingBounties.data.forEach(bounty => {
          existingBountySet.add(`${bounty.bounty}-${bounty.bucket_id}-${bounty.type}`);
          existingBountyTextSet.add(bounty.bounty); // Add just the bounty text
        });
      }

      // Filter out duplicates - check both combination and exact text
      const uniqueBounties = bounties.filter(bounty => {
        const key = `${bounty.bounty}-${bounty.bucket_id}-${bounty.type}`;
        const isDuplicate = existingBountySet.has(key) || existingBountyTextSet.has(bounty.bounty);
        
        if (isDuplicate) {
          console.log(`Skipping duplicate bounty: "${bounty.bounty}" (bucket_id: ${bounty.bucket_id}, type: ${bounty.type})`);
        } else {
          console.log(`New bounty to insert: "${bounty.bounty}" (bucket_id: ${bounty.bucket_id}, type: ${bounty.type})`);
        }
        
        return !isDuplicate;
      });

      const duplicates = bounties.length - uniqueBounties.length;

      if (uniqueBounties.length === 0) {
        console.log('All bounties already exist, skipping insertion');
        return { inserted: 0, duplicates, total: bounties.length };
      }

      console.log(`Inserting ${uniqueBounties.length} unique bounties (filtered from ${bounties.length} total)`);

      const pendingBounties = uniqueBounties.map(bounty => ({
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

      return { inserted: uniqueBounties.length, duplicates, total: bounties.length };
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
  static async approveBounty(bountyId: string, date: string, notes?: string, rating?: number | null): Promise<void> {
    try {
      const updateData: any = {
        action: 'accepted',
        date: date,
        notes: notes
      };
      
      if (rating !== undefined && rating !== null && rating >= 0 && rating <= 10) {
        updateData.rating = rating;
      } else if (rating === null) {
        updateData.rating = null;
      }

      const { error: updateError } = await supabase
        .from('bounty_selection_history')
        .update(updateData)
        .eq('id', bountyId);

      if (updateError) {
        console.error('Error approving bounty:', updateError);
        throw updateError;
      }

    } catch (error) {
      console.error('Failed to approve bounty:', error);
      throw error;
    }
  }

  // Step D: Admin Reviews -> Step F: Update status = 'rejected'
  static async rejectBounty(bountyId: string, notes?: string, rating?: number | null): Promise<void> {
    try {
      const updateData: any = {
        action: 'rejected',
        notes: notes
      };
      
      if (rating !== undefined && rating !== null && rating > 0 && rating < 10) {
        updateData.rating = rating;
      } else if (rating === null) {
        updateData.rating = null;
      }

      const { error } = await supabase
        .from('bounty_selection_history')
        .update(updateData)
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

  // Get count of today's approved bounties (for submit button)
  static async getTodayApprovedCount(): Promise<number> {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('bounty_selection_history')
        .select('id')
        .eq('action', 'accepted')
        .eq('date', today);

      if (error) {
        console.error('Error fetching today\'s approved bounties count:', error);
        throw error;
      }

      return data?.length || 0;
    } catch (error) {
      console.error('Failed to fetch today\'s approved bounties count:', error);
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

  // Cleanup all pending bounties (no time filter)
  static async cleanupAllPendingBounties(): Promise<void> {
    try {
      const { error } = await supabase
        .from('bounty_selection_history')
        .delete()
        .eq('action', 'pending');

      if (error) {
        console.error('Error cleaning up all pending bounties:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to cleanup all pending bounties:', error);
      throw error;
    }
  }

  // Get count of pending bounties by age
  static async getPendingBountyCounts(): Promise<{ total: number; old: number; recent: number }> {
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      // Get total pending count
      const { data: totalData, error: totalError } = await supabase
        .from('bounty_selection_history')
        .select('id')
        .eq('action', 'pending');

      if (totalError) throw totalError;

      // Get old pending count (older than 24 hours)
      const { data: oldData, error: oldError } = await supabase
        .from('bounty_selection_history')
        .select('id')
        .eq('action', 'pending')
        .lt('created_at', twentyFourHoursAgo);

      if (oldError) throw oldError;

      const total = totalData?.length || 0;
      const old = oldData?.length || 0;
      const recent = total - old;

      return { total, old, recent };
    } catch (error) {
      console.error('Failed to get pending bounty counts:', error);
      throw error;
    }
  }

  // Get bounties from main bounties table by date
  static async getBountiesByDate(date: string): Promise<BountyToBeSubmitted[]> {
    try {
      // Fetch bounties from main table for the specified date
      const { data: bountiesData, error: bountiesError } = await supabase
        .from('bounties')
        .select('*')
        .eq('date', date)
        .order('created_at', { ascending: false });

      if (bountiesError) {
        console.error('Error fetching bounties from main table:', bountiesError);
        throw bountiesError;
      }

      // Fetch bucket weights to get category information
      const { data: bucketWeightsData, error: bucketWeightsError } = await supabase
        .from('bountyBucketWeight')
        .select('*');

      if (bucketWeightsError) {
        console.error('Error fetching bucket weights:', bucketWeightsError);
        throw bucketWeightsError;
      }

      // Map bounties to BountyToBeSubmitted format with category information
      const bountiesWithCategories = bountiesData.map((bounty: any) => {
        // Find the bucket weight for this bounty
        const bucketWeight = bucketWeightsData.find((weight: any) => weight.bountyId === bounty.id);
        
        // Get category name from bucketMap
        const category = bucketWeight ? 
          bucketMap[bucketWeight.bucketId as keyof typeof bucketMap] || 'Unknown' : 
          'Unknown';

        return {
          id: bounty.id,
          bounty: bounty.bounty,
          bucket_id: bucketWeight?.bucketId || 0,
          category: category,
          type: bounty.type,
          created_at: bounty.created_at
        };
      });

      return bountiesWithCategories || [];
    } catch (error) {
      console.error('Failed to get bounties by date:', error);
      throw error;
    }
  }
} 