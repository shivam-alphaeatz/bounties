import { supabase } from '../supabaseClient';
import { ImageKitService } from './imageKitService';

export interface BountyImage {
  bounty_id: string;
  image_url: string;
}

export class BountyImageService {
  // Helper function to append transformation parameters to image URL
  private static appendImageTransformParams(imageUrl: string): string {
    if (!imageUrl || !imageUrl.trim()) {
      return imageUrl;
    }

    // Check if the URL already has any query parameters
    if (imageUrl.includes('?')) {
      // URL already has parameters, save as-is
      return imageUrl;
    }

    // URL has no parameters, append transformation parameters
    return `${imageUrl}?tr=w-1024,h-683,q-90,f-webp`;
  }

  // Add image URL for a bounty
  static async addBountyImage(bountyId: string, imageUrl: string): Promise<void> {
    try {
      const transformedUrl = this.appendImageTransformParams(imageUrl);
      
      const { error } = await supabase
        .from('bounty_image_mapping')
        .insert({
          bounty_id: bountyId,
          image_url: transformedUrl
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
      const transformedUrl = this.appendImageTransformParams(imageUrl);
      
      // First check if an image already exists for this bounty
      const existingImage = await this.getBountyImage(bountyId);
      
      if (existingImage) {
        // Update existing record
        const { error } = await supabase
          .from('bounty_image_mapping')
          .update({ image_url: transformedUrl })
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
            image_url: transformedUrl
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

  // Upload file directly to ImageKit and save URL to database
  static async uploadAndSaveBountyImage(
    file: File, 
    bountyId: string, 
    bountyName: string
  ): Promise<string> {
    try {
      // Upload file to ImageKit
      const imageUrl = await ImageKitService.uploadFileAndGetUrl({
        file,
        bountyId,
        bountyName,
        folder: '/bounties'
      });

      // Save the URL to database
      await this.updateBountyImage(bountyId, imageUrl);

      return imageUrl;
    } catch (error) {
      console.error('Failed to upload and save bounty image:', error);
      throw error;
    }
  }
} 