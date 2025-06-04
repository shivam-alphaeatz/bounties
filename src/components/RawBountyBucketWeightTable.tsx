import React, { useEffect, useState } from 'react';
import { supabase, bucketMap } from '../supabaseClient';

interface BountyBucketWeight {
  id: number;
  bountyId: number;
  bucketId: number;
  weight: number;
  created_at: string;
}

interface Bounty {
  id: number;
  date: string;
  bounty: string;
  Duration: string;
  created_at: string;
}

const RawBountyBucketWeightTable: React.FC = () => {
  const [bucketWeights, setBucketWeights] = useState<BountyBucketWeight[]>([]);
  const [bounties, setBounties] = useState<Record<number, Bounty>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch all bucket weights
        const { data: bucketWeightsData, error: bucketWeightsError } = await supabase
          .from('bountyBucketWeight')
          .select('*');

        if (bucketWeightsError) {
          throw bucketWeightsError;
        }

        console.log('Raw bucket weights:', bucketWeightsData);
        setBucketWeights(bucketWeightsData || []);

        // Fetch all bounties
        const { data: bountiesData, error: bountiesError } = await supabase
          .from('bounties')
          .select('*');

        if (bountiesError) {
          throw bountiesError;
        }

        // Create a map of bounty IDs to bounty objects for easy lookup
        const bountiesMap: Record<number, Bounty> = {};
        bountiesData.forEach((bounty: Bounty) => {
          bountiesMap[bounty.id] = bounty;
        });

        console.log('Bounties map:', bountiesMap);
        setBounties(bountiesMap);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div className="loading">Loading raw bounty bucket weight data...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="raw-bounty-bucket-weight-table">
      <h2>Raw Bounty Bucket Weight Data</h2>
      {bucketWeights.length === 0 ? (
        <div className="no-data-message">
          <p>No bounty bucket weight data found.</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Bounty ID</th>
                <th>Bounty Name</th>
                <th>Bucket ID</th>
                <th>Category</th>
                <th>Weight</th>
                <th>Created At</th>
              </tr>
            </thead>
            <tbody>
              {bucketWeights.map((weight) => (
                <tr key={weight.id}>
                  <td>{weight.id}</td>
                  <td>{weight.bountyId}</td>
                  <td className="bounty-name">{bounties[weight.bountyId]?.bounty || 'Unknown'}</td>
                  <td>{weight.bucketId}</td>
                  <td>
                    <span className="category-badge">
                      {bucketMap[weight.bucketId as keyof typeof bucketMap] || 'Unknown'}
                    </span>
                  </td>
                  <td>
                    <span className="weight-badge">
                      {weight.weight || 0}
                    </span>
                  </td>
                  <td>{new Date(weight.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default RawBountyBucketWeightTable; 