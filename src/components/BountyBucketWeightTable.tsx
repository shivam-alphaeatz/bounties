import React, { useEffect, useState } from 'react';
import { supabase, bucketMap } from '../supabaseClient';

interface BountyBucketWeight {
  id: number;
  bountyId: number;
  bucketId: number;
  weight: number;
  created_at: string;
}

interface BountyWithCategories {
  id: number;
  date: string;
  bounty: string;
  categories: Array<{
    name: string;
    weight: number;
  }>;
}

const BountyBucketWeightTable: React.FC = () => {
  const [bountiesWithCategories, setBountiesWithCategories] = useState<BountyWithCategories[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBountyBucketWeights = async () => {
      try {
        setLoading(true);
        
        // First, fetch all bounties
        const { data: bountiesData, error: bountiesError } = await supabase
          .from('bounties')
          .select('*')
          .order('date', { ascending: false });

        if (bountiesError) {
          throw bountiesError;
        }

        console.log('Fetched bounties:', bountiesData);

        // Then, fetch all bucket weights
        const { data: bucketWeightsData, error: bucketWeightsError } = await supabase
          .from('bountyBucketWeight')
          .select('*');

        if (bucketWeightsError) {
          throw bucketWeightsError;
        }

        console.log('Fetched bucket weights:', bucketWeightsData);

        // Combine the data
        const bountiesWithCategories = bountiesData.map((bounty: any) => {
          const categories = bucketWeightsData
            .filter((weight: BountyBucketWeight) => weight.bountyId === bounty.id)
            .map((weight: BountyBucketWeight) => ({
              name: bucketMap[weight.bucketId as keyof typeof bucketMap] || 'Unknown',
              weight: weight.weight || 0
            }));
          
          return {
            id: bounty.id,
            date: bounty.date,
            bounty: bounty.bounty,
            categories
          };
        });

        console.log('Combined data:', bountiesWithCategories);
        setBountiesWithCategories(bountiesWithCategories);
      } catch (err) {
        console.error('Error fetching bounty bucket weights:', err);
        setError('Failed to load bounty bucket weights. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchBountyBucketWeights();
  }, []);

  if (loading) return <div>Loading bounty bucket weights...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="bounty-bucket-weight-table">
      <h2>Bounties with Categories</h2>
      {bountiesWithCategories.length === 0 ? (
        <p>No bounties with categories found.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Bounty</th>
              <th>Categories</th>
            </tr>
          </thead>
          <tbody>
            {bountiesWithCategories.map((bounty) => (
              <tr key={bounty.id}>
                <td>{new Date(bounty.date).toLocaleDateString()}</td>
                <td>{bounty.bounty}</td>
                <td>
                  {bounty.categories.length > 0 ? (
                    <ul className="category-list">
                      {bounty.categories.map((category, index) => (
                        <li key={index}>
                          <span className="category-name">{category.name}</span>
                          <span className="category-weight">Weight: {category.weight}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="no-categories">No categories</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default BountyBucketWeightTable; 