import React, { useEffect, useState } from 'react';
import { supabase, bucketMap } from '../supabaseClient';
import BountyForm from './BountyForm';

interface Bounty {
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
}

interface BountyBucketWeight {
  id: number;
  bountyId: number;
  bucketId: number;
  weight: number;
  created_at: string;
}

const BountiesTable: React.FC = () => {
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState<boolean>(false);
  const [editingBounty, setEditingBounty] = useState<Bounty | undefined>(undefined);
  const [filterType, setFilterType] = useState<string>('all');

  const fetchBounties = async () => {
    try {
      setLoading(true);
      const { data: bountiesData, error: bountiesError } = await supabase
        .from('bounties')
        .select('*')
        .order('date', { ascending: false });

      if (bountiesError) {
        throw bountiesError;
      }

      const { data: bucketWeightsData, error: bucketWeightsError } = await supabase
        .from('bountyBucketWeight')
        .select('*');

      if (bucketWeightsError) {
        throw bucketWeightsError;
      }

      const bountiesWithCategories = bountiesData.map((bounty: any) => {
        const categories = bucketWeightsData
          .filter((weight: BountyBucketWeight) => weight.bountyId === bounty.id)
          .map((weight: BountyBucketWeight) => ({
            name: bucketMap[weight.bucketId as keyof typeof bucketMap] || 'Unknown',
            weight: weight.weight || 0
          }));
        
        return {
          ...bounty,
          categories
        };
      });

      setBounties(bountiesWithCategories || []);
    } catch (err) {
      console.error('Error fetching bounties:', err);
      setError('Failed to load bounties. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBounties();
  }, []);

  const handleAddClick = () => {
    setEditingBounty(undefined);
    setShowForm(true);
  };

  const handleEditClick = (bounty: Bounty) => {
    setEditingBounty(bounty);
    setShowForm(true);
  };

  const handleDeleteClick = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this bounty?')) {
      try {
        // First delete related bucket weights
        const { error: bucketError } = await supabase
          .from('bountyBucketWeight')
          .delete()
          .eq('bountyId', id);

        if (bucketError) throw bucketError;

        // Then delete the bounty
        const { error: bountyError } = await supabase
          .from('bounties')
          .delete()
          .eq('id', id);

        if (bountyError) throw bountyError;

        // Refresh the list
        fetchBounties();
      } catch (err) {
        console.error('Error deleting bounty:', err);
        setError('Failed to delete bounty. Please try again.');
      }
    }
  };

  const handleFormSave = () => {
    setShowForm(false);
    fetchBounties();
  };

  const handleFormCancel = () => {
    setShowForm(false);
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterType(e.target.value);
  };

  // Filter bounties based on selected type
  const filteredBounties = filterType === 'all' 
    ? bounties 
    : bounties.filter(bounty => bounty.type === filterType);

  if (loading && !showForm) return <div className="loading">Loading bounties...</div>;
  if (error && !showForm) return <div className="error">{error}</div>;

  if (showForm) {
    return (
      <div className="bounties-container">
        <BountyForm 
          bounty={editingBounty} 
          onSave={handleFormSave} 
          onCancel={handleFormCancel} 
        />
      </div>
    );
  }

  return (
    <div className="bounties-table">
      <div className="table-header">
        <h2>Bounties</h2>
        <div className="table-actions">
          <div className="filter-container">
            <label htmlFor="type-filter">Filter by Type:</label>
            <select 
              id="type-filter" 
              value={filterType} 
              onChange={handleFilterChange}
              className="type-filter"
            >
              <option value="all">All Types</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          <button className="add-button" onClick={handleAddClick}>
            <span className="button-icon">+</span> Add New Bounty
          </button>
        </div>
      </div>
      {filteredBounties.length === 0 ? (
        <div className="no-data-message">
          <p>No bounties found. {filterType !== 'all' ? 'Try changing the filter or ' : ''}Click "Add New Bounty" to create one.</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Bounty</th>
                <th>Type</th>
                <th>Categories</th>
                <th>Target Value</th>
                <th>Expiry</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBounties.map((bounty) => (
                <tr key={bounty.id}>
                  <td>{new Date(bounty.date).toLocaleDateString()}</td>
                  <td className="bounty-name">{bounty.bounty}</td>
                  <td>
                    <span className="duration-badge">
                      {bounty.type}
                    </span>
                  </td>
                  <td>
                    {bounty.categories && bounty.categories.length > 0 ? (
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
                  <td>
                    <span className="target-value-badge">
                      {bounty.target_value}
                    </span>
                  </td>
                  <td>
                    {bounty.expiry ? (
                      <span className="expiry-badge">
                        {new Date(bounty.expiry).toLocaleString()}
                      </span>
                    ) : (
                      <span className="no-expiry">No expiry</span>
                    )}
                  </td>
                  <td className="actions">
                    <button 
                      className="edit-button" 
                      onClick={() => handleEditClick(bounty)}
                    >
                      Edit
                    </button>
                    <button 
                      className="delete-button" 
                      onClick={() => handleDeleteClick(bounty.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default BountiesTable;