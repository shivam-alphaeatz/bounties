import { supabase } from '../supabaseClient';

export interface BountyAction {
  bucket_id: number;
  bounty: string;
  action: 'accepted' | 'rejected';
  timestamp: Date;
  category?: string;
  rejection_reason?: string;
}

export class BountyActionsService {
  static async saveBountyAction(action: BountyAction): Promise<void> {
    try {
      const { error } = await supabase
        .from('bounty_selection_history')
        .insert({
          bucket_id: action.bucket_id,
          category: action.category || `Category ${action.bucket_id}`,
          bounty: action.bounty,
          action: action.action,
          timestamp: action.timestamp.toISOString(),
          notes: action.rejection_reason,
        });

      if (error) {
        console.error('Error saving bounty action:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to save bounty action:', error);
      throw error;
    }
  }

  static async saveBountyActions(actions: BountyAction[]): Promise<void> {
    try {
      const actionsToInsert = actions.map(action => ({
        bucket_id: action.bucket_id,
        category: action.category || `Category ${action.bucket_id}`,
        bounty: action.bounty,
        action: action.action,
        timestamp: action.timestamp.toISOString(),
        notes: action.rejection_reason,
      }));

      const { error } = await supabase
        .from('bounty_selection_history')
        .insert(actionsToInsert);

      if (error) {
        console.error('Error saving bounty actions:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to save bounty actions:', error);
      throw error;
    }
  }

  static async getBountyActions(): Promise<BountyAction[]> {
    try {
      const { data, error } = await supabase
        .from('bounty_selection_history')
        .select('*')
        .order('timestamp', { ascending: false });

      if (error) {
        console.error('Error fetching bounty actions:', error);
        throw error;
      }

      return data?.map(item => ({
        bucket_id: item.bucket_id,
        bounty: item.bounty,
        action: item.action,
        timestamp: new Date(item.timestamp),
        category: item.category,
        rejection_reason: item.notes,
      })) || [];
    } catch (error) {
      console.error('Failed to fetch bounty actions:', error);
      throw error;
    }
  }

  static exportToCSV(actions: BountyAction[]): void {
    const csvContent = [
      'Bucket ID,Category,Bounty,Action,Timestamp,Notes',
      ...actions.map(action => 
        `${action.bucket_id},"${action.category || 'Unknown'}","${action.bounty}","${action.action}","${action.timestamp.toISOString()}","${action.rejection_reason || ''}"`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bounty_actions_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  static getLocalStorageKey(): string {
    return 'bounty_actions';
  }

  static saveToLocalStorage(actions: BountyAction[]): void {
    try {
      localStorage.setItem(this.getLocalStorageKey(), JSON.stringify(actions));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  }

  static loadFromLocalStorage(): BountyAction[] {
    try {
      const stored = localStorage.getItem(this.getLocalStorageKey());
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.map((action: any) => ({
          ...action,
          timestamp: new Date(action.timestamp)
        }));
      }
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
    }
    return [];
  }
} 