import React, { useState, useEffect } from 'react';
import { supabase, bucketMap } from '../supabaseClient';

interface Bounty {
  id?: number;
  date: string;
  bounty: string;
  type: string;
  lifespan: number;
  target_value: number;
  expiry: string | null;
  created_at?: string;
}

interface BountyFormProps {
  bounty?: Bounty;
  onSave: () => void;
  onCancel: () => void;
}

// Type options for the dropdown
const typeOptions = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'yearly', label: 'Yearly' }
];

// Default lifespan values in hours
const defaultLifespans = {
  daily: 24,
  weekly: 168,
  yearly: 8760
};

// Helper function to convert UTC to IST for datetime-local input
const convertUTCToIST = (utcDate: string | null): string => {
  if (!utcDate) return '';
  const date = new Date(utcDate);
  // Format for datetime-local input: YYYY-MM-DDThh:mm
  return date.toLocaleString('sv-SE', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).replace(' ', 'T');
};

// Helper function to convert datetime-local input to UTC
const convertISTToUTC = (istDate: string): string => {
  if (!istDate) return '';
  // datetime-local input format: YYYY-MM-DDThh:mm
  const date = new Date(istDate);
  return date.toISOString();
};

const BountyForm: React.FC<BountyFormProps> = ({ bounty, onSave, onCancel }) => {
  const [formData, setFormData] = useState<Bounty>({
    date: '',
    bounty: '',
    type: 'daily',
    lifespan: defaultLifespans.daily,
    target_value: 1,
    expiry: ''
  });
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [bucketWeights, setBucketWeights] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form with bounty data if editing
  useEffect(() => {
    if (bounty) {
      console.log('Initializing form with bounty data:', bounty);
      setFormData({
        date: bounty.date,
        bounty: bounty.bounty,
        type: bounty.type,
        lifespan: bounty.lifespan,
        target_value: bounty.target_value || 0,
        expiry: bounty.expiry ? convertUTCToIST(bounty.expiry) : ''
      });

      // Fetch categories and weights for this bounty
      const fetchCategories = async () => {
        try {
          if (bounty.id) {
            const { data, error } = await supabase
              .from('bountyBucketWeight')
              .select('bucketId, weight')
              .eq('bountyId', bounty.id);

            if (error) throw error;

            if (data) {
              console.log('Fetched categories:', data);
              setSelectedCategories(data.map(item => item.bucketId));
              
              // Create a map of bucketId to weight
              const weights: Record<number, number> = {};
              data.forEach(item => {
                weights[item.bucketId] = item.weight || 0;
              });
              setBucketWeights(weights);
            }
          }
        } catch (err) {
          console.error('Error fetching categories:', err);
        }
      };

      fetchCategories();
    }
  }, [bounty]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'type') {
      setFormData(prev => ({ 
        ...prev, 
        [name]: value,
        lifespan: defaultLifespans[value as keyof typeof defaultLifespans] || prev.lifespan
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleLifespanChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setFormData(prev => ({ ...prev, lifespan: value }));
  };

  const handleTargetValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setFormData(prev => ({ ...prev, target_value: value }));
  };

  const handleCategoryChange = (bucketId: number) => {
    setSelectedCategories(prev => {
      if (prev.includes(bucketId)) {
        // Remove the category and its weight
        const newWeights = { ...bucketWeights };
        delete newWeights[bucketId];
        setBucketWeights(newWeights);
        return prev.filter(id => id !== bucketId);
      } else {
        // Add the category with default weight of 0
        setBucketWeights(prev => ({ ...prev, [bucketId]: 0 }));
        return [...prev, bucketId];
      }
    });
  };

  const handleWeightChange = (bucketId: number, value: string) => {
    const weight = parseInt(value, 10) || 0;
    setBucketWeights(prev => ({ ...prev, [bucketId]: weight }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let bountyId: number | undefined;
      
      // Log form data for debugging
      console.log('Form data before validation:', formData);
      console.log('Selected categories:', selectedCategories);
      
      // Validate form data with detailed error messages
      if (!formData.date) {
        throw new Error('Date is required');
      }
      
      if (!formData.bounty) {
        throw new Error('Bounty description is required');
      }
      
      if (!formData.type) {
        throw new Error('Type is required');
      }
      
      if (selectedCategories.length === 0) {
        throw new Error('Please select at least one category');
      }

      // Convert expiry from IST to UTC before saving
      const expiryUTC = formData.expiry ? convertISTToUTC(formData.expiry) : null;
      
      if (bounty?.id) {
        // Update existing bounty
        bountyId = bounty.id;
        console.log('Updating bounty with ID:', bountyId);
        console.log('Update data:', {
          date: formData.date,
          bounty: formData.bounty,
          type: formData.type,
          lifespan: formData.lifespan,
          target_value: formData.target_value,
          expiry: expiryUTC
        });
        
        const { error: updateError } = await supabase
          .from('bounties')
          .update({
            date: formData.date,
            bounty: formData.bounty,
            type: formData.type,
            lifespan: formData.lifespan,
            target_value: formData.target_value,
            expiry: expiryUTC
          })
          .eq('id', bountyId);

        if (updateError) {
          console.error('Update error:', updateError);
          throw updateError;
        }

        // Delete existing categories
        console.log('Deleting existing categories for bounty ID:', bountyId);
        const { error: deleteError } = await supabase
          .from('bountyBucketWeight')
          .delete()
          .eq('bountyId', bountyId);

        if (deleteError) {
          console.error('Delete error:', deleteError);
          throw deleteError;
        }
      } else {
        // Insert new bounty
        console.log('Inserting new bounty with data:', {
          date: formData.date,
          bounty: formData.bounty,
          type: formData.type,
          lifespan: formData.lifespan,
          target_value: formData.target_value,
          expiry: expiryUTC
        });
        
        const { data, error: insertError } = await supabase
          .from('bounties')
          .insert({
            date: formData.date,
            bounty: formData.bounty,
            type: formData.type,
            lifespan: formData.lifespan,
            target_value: formData.target_value,
            expiry: expiryUTC
          })
          .select();

        if (insertError) {
          console.error('Insert error:', insertError);
          throw insertError;
        }
        
        if (!data || data.length === 0) {
          console.error('No data returned from insert');
          throw new Error('Failed to insert bounty');
        }

        // Set the new bounty ID
        bountyId = data[0].id;
        console.log('New bounty created with ID:', bountyId);
      }

      // Insert new categories with weights
      if (selectedCategories.length > 0 && bountyId) {
        const categoryInserts = selectedCategories.map(bucketId => ({
          bountyId,
          bucketId,
          weight: bucketWeights[bucketId] || 0
        }));
        
        console.log('Inserting categories:', categoryInserts);
        
        const { error: categoryError } = await supabase
          .from('bountyBucketWeight')
          .insert(categoryInserts);

        if (categoryError) {
          console.error('Category insert error:', categoryError);
          throw categoryError;
        }
      }

      onSave();
    } catch (err) {
      console.error('Error saving bounty:', err);
      setError(err instanceof Error ? err.message : 'Failed to save bounty. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bounty-form">
      <h2>{bounty ? 'Edit Bounty' : 'Add New Bounty'}</h2>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="date">Date:</label>
          <input
            type="date"
            id="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="bounty">Bounty:</label>
          <textarea
            id="bounty"
            name="bounty"
            value={formData.bounty}
            onChange={handleChange}
            required
            rows={3}
          />
        </div>

        <div className="form-group">
          <label htmlFor="type">Type:</label>
          <select
            id="type"
            name="type"
            value={formData.type}
            onChange={handleChange}
            required
          >
            {typeOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="lifespan">Lifespan (hours):</label>
          <input
            type="number"
            id="lifespan"
            name="lifespan"
            value={formData.lifespan}
            onChange={handleLifespanChange}
            min="1"
            required
          />
          <small>Default: {defaultLifespans[formData.type as keyof typeof defaultLifespans]} hours for {formData.type} bounties</small>
        </div>

        <div className="form-group">
          <label htmlFor="target_value">Target Value:</label>
          <input
            type="number"
            id="target_value"
            name="target_value"
            value={formData.target_value}
            onChange={handleTargetValueChange}
            min="0"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="expiry">Expiry Date and Time (IST):</label>
          <input
            type="datetime-local"
            id="expiry"
            name="expiry"
            value={formData.expiry || ''}
            onChange={handleChange}
          />
          <small>Optional: Set when this bounty should expire (Indian Standard Time)</small>
        </div>

        <div className="form-group">
          <label>Categories:</label>
          <div className="categories-container">
            {Object.entries(bucketMap).map(([id, name]) => {
              const bucketId = Number(id);
              const isSelected = selectedCategories.includes(bucketId);
              
              return (
                <div key={id} className={`category-item ${isSelected ? 'selected' : ''}`}>
                  <div className="category-checkbox">
                    <input
                      type="checkbox"
                      id={`category-${id}`}
                      checked={isSelected}
                      onChange={() => handleCategoryChange(bucketId)}
                    />
                    <label htmlFor={`category-${id}`}>{name}</label>
                  </div>
                  
                  {isSelected && (
                    <div className="weight-input">
                      <label htmlFor={`weight-${id}`}>Weight:</label>
                      <input
                        type="number"
                        id={`weight-${id}`}
                        value={bucketWeights[bucketId] || 0}
                        onChange={(e) => handleWeightChange(bucketId, e.target.value)}
                        min="0"
                        placeholder="0"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {selectedCategories.length === 0 && (
            <div className="no-categories-message">
              Select at least one category for this bounty
            </div>
          )}
        </div>

        <div className="form-actions">
          <button type="button" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
          <button type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>

        {error && (
          <div className="form-error">
            <div className="error-icon">⚠️</div>
            <div className="error-message">{error}</div>
          </div>
        )}
      </form>
    </div>
  );
};

export default BountyForm; 