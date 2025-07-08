import { supabase } from '../supabaseClient';

export interface Attribute {
  id: string;
  key: string;
  description?: string;
  bucket_id?: number;
}

export interface BountyAttribute {
  bounty_id: string;
  attribute_id: string;
  timestamp: string;
  type: string;
  value: number;
  attribute?: Attribute; // Joined attribute data
}

export interface BountyWithAttributes {
  id: number;
  date: string;
  bounty: string;
  type: string;
  lifespan: number;
  target_value: number;
  expiry: string | null;
  created_at: string;
  categories?: Array<{
    name: string;
    weight: number;
  }>;
  attributes?: BountyAttribute[];
}

export class AttributesService {
  // Get all available attributes
  static async getAttributes(): Promise<Attribute[]> {
    try {
      console.log('Fetching all attributes...');
      
      const { data, error } = await supabase
        .from('attributes')
        .select('*')
        .order('key');

      if (error) {
        console.error('Error fetching attributes:', error);
        throw error;
      }

      console.log('Attributes data:', data);
      return data || [];
    } catch (error) {
      console.error('Failed to fetch attributes:', error);
      throw error;
    }
  }

  // Get attributes for a specific bucket
  static async getAttributesByBucket(bucketId: number): Promise<Attribute[]> {
    try {
      console.log('Fetching attributes for bucketId:', bucketId);
      
      const { data, error } = await supabase
        .from('attributes')
        .select('*')
        .eq('bucket_id', bucketId)
        .order('key');

      if (error) {
        console.error('Error fetching attributes by bucket:', error);
        throw error;
      }

      console.log('Attributes by bucket data:', data);
      return data || [];
    } catch (error) {
      console.error('Failed to fetch attributes by bucket:', error);
      throw error;
    }
  }

  // Get attributes for a specific bounty
  static async getBountyAttributes(bountyId: string): Promise<BountyAttribute[]> {
    try {
      console.log('Fetching bounty attributes for bountyId:', bountyId);
      
      const { data, error } = await supabase
        .from('bounty_attributes')
        .select(`
          *,
          attribute:attributes(*)
        `)
        .eq('bounty_id', bountyId)
        .order('timestamp');

      if (error) {
        console.error('Error fetching bounty attributes:', error);
        throw error;
      }

      console.log('Bounty attributes data:', data);
      return data || [];
    } catch (error) {
      console.error('Failed to fetch bounty attributes:', error);
      throw error;
    }
  }

  // Add an attribute to a bounty
  static async addBountyAttribute(
    bountyId: string,
    attributeId: string,
    type: string,
    value: number
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('bounty_attributes')
        .insert({
          bounty_id: bountyId,
          attribute_id: attributeId,
          type,
          value
        });

      if (error) {
        console.error('Error adding bounty attribute:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to add bounty attribute:', error);
      throw error;
    }
  }

  // Update an existing bounty attribute
  static async updateBountyAttribute(
    bountyId: string,
    attributeId: string,
    type: string,
    value: number
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('bounty_attributes')
        .update({ type, value })
        .eq('bounty_id', bountyId)
        .eq('attribute_id', attributeId);

      if (error) {
        console.error('Error updating bounty attribute:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to update bounty attribute:', error);
      throw error;
    }
  }

  // Delete a bounty attribute
  static async deleteBountyAttribute(bountyId: string, attributeId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('bounty_attributes')
        .delete()
        .eq('bounty_id', bountyId)
        .eq('attribute_id', attributeId);

      if (error) {
        console.error('Error deleting bounty attribute:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to delete bounty attribute:', error);
      throw error;
    }
  }

  // Create a new attribute
  static async createAttribute(key: string): Promise<Attribute> {
    try {
      const { data, error } = await supabase
        .from('attributes')
        .insert({ key })
        .select()
        .single();

      if (error) {
        console.error('Error creating attribute:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Failed to create attribute:', error);
      throw error;
    }
  }

  // Get bounties with their attributes
  static async getBountiesWithAttributes(): Promise<BountyWithAttributes[]> {
    try {
      // First get all bounties
      const { data: bountiesData, error: bountiesError } = await supabase
        .from('bounties')
        .select('*')
        .order('date', { ascending: false });

      if (bountiesError) {
        throw bountiesError;
      }

      // Get category weights
      const { data: bucketWeightsData, error: bucketWeightsError } = await supabase
        .from('bountyBucketWeight')
        .select('*');

      if (bucketWeightsError) {
        throw bucketWeightsError;
      }

      // Get all bounty attributes
      const { data: attributesData, error: attributesError } = await supabase
        .from('bounty_attributes')
        .select(`
          *,
          attribute:attributes(*)
        `);

      if (attributesError) {
        throw attributesError;
      }

      // Combine the data
      const bountiesWithAttributes = bountiesData.map((bounty: any) => {
        const categories = bucketWeightsData
          .filter((weight: any) => weight.bountyId === bounty.id)
          .map((weight: any) => ({
            name: weight.bucketId, // You might want to map this to category names
            weight: weight.weight || 0
          }));

        const attributes = attributesData
          .filter((attr: any) => attr.bounty_id === bounty.id)
          .map((attr: any) => ({
            bounty_id: attr.bounty_id,
            attribute_id: attr.attribute_id,
            timestamp: attr.timestamp,
            type: attr.type,
            value: attr.value,
            attribute: attr.attribute
          }));

        return {
          ...bounty,
          categories,
          attributes
        };
      });

      return bountiesWithAttributes || [];
    } catch (error) {
      console.error('Failed to fetch bounties with attributes:', error);
      throw error;
    }
  }
} 