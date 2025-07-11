import { supabase } from '../supabaseClient';

export interface BountyImage {
  bounty_id: string;
  image_url: string;
}

export class BountyImageService {
  // Add image URL for a bounty
  static async addBountyImage(bountyId: string, imageUrl: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('bounty_image_mapping')
        .insert({
          bounty_id: bountyId,
          image_url: imageUrl
        });

      if (error) {
        console.error('Error adding bounty image:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to add bounty image:', error);
      throw error;
    }
  }

  // Get image URL for a bounty
  static async getBountyImage(bountyId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('bounty_image_mapping')
        .select('image_url')
        .eq('bounty_id', bountyId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned - no image exists for this bounty
          return null;
        }
        console.error('Error getting bounty image:', error);
        throw error;
      }

      return data?.image_url || null;
    } catch (error) {
      console.error('Failed to get bounty image:', error);
      throw error;
    }
  }

  // Update image URL for a bounty
  static async updateBountyImage(bountyId: string, imageUrl: string): Promise<void> {
    try {
      // First check if an image already exists for this bounty
      const existingImage = await this.getBountyImage(bountyId);
      
      if (existingImage) {
        // Update existing record
        const { error } = await supabase
          .from('bounty_image_mapping')
          .update({ image_url: imageUrl })
          .eq('bounty_id', bountyId);

        if (error) {
          console.error('Error updating bounty image:', error);
          throw error;
        }
      } else {
        // Insert new record
        const { error } = await supabase
          .from('bounty_image_mapping')
          .insert({
            bounty_id: bountyId,
            image_url: imageUrl
          });

        if (error) {
          console.error('Error inserting bounty image:', error);
          throw error;
        }
      }
    } catch (error) {
      console.error('Failed to update bounty image:', error);
      throw error;
    }
  }

  // Delete image for a bounty
  static async deleteBountyImage(bountyId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('bounty_image_mapping')
        .delete()
        .eq('bounty_id', bountyId);

      if (error) {
        console.error('Error deleting bounty image:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to delete bounty image:', error);
      throw error;
    }
  }

  // Get all bounty images
  static async getAllBountyImages(): Promise<BountyImage[]> {
    try {
      const { data, error } = await supabase
        .from('bounty_image_mapping')
        .select('*');

      if (error) {
        console.error('Error getting all bounty images:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Failed to get all bounty images:', error);
      throw error;
    }
  }
} 