import React, { useState, useEffect, useCallback } from 'react';
import './AIBountiesModal.css';
import { BountyActionsService, BountyAction } from '../services/bountyActionsService';
import { GoogleSheetsService, BountySheetData, BountyActionSheetData } from '../services/googleSheetsService';
import { DatabaseTest } from '../utils/databaseTest';
import { supabase } from '../supabaseClient';

interface Bounty {
  bucket_id: number;
  prompt: string;
  bounties: string[];
}

interface BountyToSubmit {
  name: string;
  category: string;
  weight: number;
  expiry_days: number;
}

interface RejectionModalProps {
  isOpen: boolean;
  bounty: string;
  category: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

const RejectionModal: React.FC<RejectionModalProps> = ({ isOpen, bounty, category, onConfirm, onCancel }) => {
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  return (
    <div className="rejection-modal-overlay">
      <div className="rejection-modal">
        <div className="rejection-modal-header">
          <h3>Add Rejection Reason</h3>
        </div>
        <div className="rejection-modal-content">
          <div className="bounty-info">
            <p><strong>Bounty:</strong> {bounty}</p>
            <p><strong>Category:</strong> {category}</p>
          </div>
          <div className="reason-input">
            <label htmlFor="rejection-reason">Reason for rejection (optional):</label>
            <textarea
              id="rejection-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason for rejection or notes..."
              rows={4}
            />
          </div>
          <div className="rejection-modal-actions">
            <button className="cancel-button" onClick={onCancel}>
              Cancel
            </button>
            <button 
              className="confirm-reject-button"
              onClick={() => onConfirm(reason)}
            >
              Confirm Rejection
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface AIBountiesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AIBountiesModal: React.FC<AIBountiesModalProps> = ({ isOpen, onClose }) => {
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bountyActions, setBountyActions] = useState<BountyAction[]>([]);
  const [saving, setSaving] = useState(false);
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [bountiesToSubmit, setBountiesToSubmit] = useState<BountyToSubmit[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [rejectionModal, setRejectionModal] = useState<{
    isOpen: boolean;
    bounty: string;
    category: string;
    bucketId: number;
  }>({
    isOpen: false,
    bounty: '',
    category: '',
    bucketId: 0
  });
  const [rejectionReason, setRejectionReason] = useState<{[key: string]: string}>({});

  // Bucket ID to Category mapping
  const bucketMap: { [key: number]: string } = {
    1: 'Nourish',
    2: 'Rest',
    3: 'Active Life',
    4: 'Connect',
    5: 'Mindset',
    6: 'Explore'
  };

  const fetchBounties = useCallback(async (bucketId: number | null) => {
    setLoading(true);
    setError(null);
    
    const requestBody = { bucket_id: bucketId || 0 };
    const authToken = process.env.REACT_APP_SUPABASE_ANON_KEY;
    const edgeFunctionUrl = process.env.REACT_APP_SUPABASE_EDGE_FUNCTION_URL || 'https://nwfhqrmdjmjopbxulyhu.supabase.co/functions/v1/bountygen';
    
    console.log('Fetching bounties with:', {
      url: edgeFunctionUrl,
      method: 'POST',
      body: requestBody,
      hasAuthToken: !!authToken,
      authTokenLength: authToken?.length
    });
    
    try {
      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const data = await response.json();
      console.log('Bounties data received:', data);
      setBounties(data);
    } catch (err) {
      console.error('Fetch error details:', err);
      
      // Show the exact error details
      let errorMessage = 'Failed to fetch bounties';
      
      if (err instanceof Error) {
        if (err.name === 'TypeError' && err.message.includes('Failed to fetch')) {
          errorMessage = `Network Error: ${err.message}\n\nThis could be:\n- CORS issue\n- Edge Function not responding\n- Network connectivity problem\n- Invalid URL`;
        } else if (err.message.includes('fetch')) {
          errorMessage = `Fetch Error: ${err.message}`;
        } else {
          errorMessage = `Error: ${err.message}`;
        }
      } else {
        errorMessage = `Unknown Error: ${String(err)}`;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // New function for category-specific refresh
  const fetchBountiesForCategory = async (bucketId: number) => {
    const authToken = process.env.REACT_APP_SUPABASE_ANON_KEY;
    const edgeFunctionUrl = process.env.REACT_APP_SUPABASE_EDGE_FUNCTION_URL || 'https://nwfhqrmdjmjopbxulyhu.supabase.co/functions/v1/bountygen';
    
    console.log(`Fetching bounties for category ${bucketId} (${bucketMap[bucketId]})`);
    
    try {
      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ bucket_id: bucketId }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const data = await response.json();
      console.log(`New bounties received for category ${bucketId}:`, data);
      
      // Update only the specific category while preserving others
      setBounties(prevBounties => {
        const updatedBounties = [...prevBounties];
        const categoryIndex = updatedBounties.findIndex(b => b.bucket_id === bucketId);
        
        // Find the new data for this specific category
        const newCategoryData = Array.isArray(data) 
          ? data.find((b: Bounty) => b.bucket_id === bucketId)
          : data;
        
        if (categoryIndex !== -1) {
          // Replace the specific category's bounties
          if (newCategoryData) {
            updatedBounties[categoryIndex] = newCategoryData;
          }
        } else {
          // If category doesn't exist, add it
          if (newCategoryData) {
            updatedBounties.push(newCategoryData);
          }
        }
        
        return updatedBounties;
      });
      
    } catch (err) {
      console.error(`Error fetching bounties for category ${bucketId}:`, err);
      alert(`Failed to refresh category ${bucketMap[bucketId]}. Please try again.`);
    }
  };

  const loadSavedActions = async () => {
    try {
      // Try to load from database first
      const savedActions = await BountyActionsService.getBountyActions();
      setBountyActions(savedActions);
    } catch (error) {
      // Fallback to localStorage
      const localActions = BountyActionsService.loadFromLocalStorage();
      setBountyActions(localActions);
    }
  };

  useEffect(() => {
    if (isOpen) {
      // Initially fetch all categories with null id
      fetchBounties(null);
      loadSavedActions();
    }
  }, [isOpen]);

  const handleBountyAction = async (bucketId: number, bounty: string, action: 'accepted' | 'rejected') => {
    if (action === 'rejected') {
      // Open rejection modal for rejected bounties
      setRejectionModal({
        isOpen: true,
        bounty,
        category: bucketMap[bucketId] || `Category ${bucketId}`,
        bucketId
      });
      return;
    }

    // Handle approval directly
    await processBountyAction(bucketId, bounty, action, '');
  };

  const processBountyAction = async (bucketId: number, bounty: string, action: 'accepted' | 'rejected', reason: string) => {
    // Check if this bounty has already been acted upon to prevent duplicates
    const existingAction = bountyActions.find(a => a.bounty === bounty);
    if (existingAction) {
      console.log(`Bounty "${bounty}" has already been ${existingAction.action}. Skipping duplicate action.`);
      return;
    }

    const newAction: BountyAction = {
      bucket_id: bucketId,
      bounty,
      action,
      timestamp: new Date(),
      category: bucketMap[bucketId] || `Category ${bucketId}`,
      rejection_reason: action === 'rejected' ? reason : undefined
    };

    const updatedActions = [...bountyActions, newAction];
    setBountyActions(updatedActions);
    
    // Remove the bounty from the current list in the UI
    setBounties(prev => prev.map(bucket => {
      if (bucket.bucket_id === bucketId) {
        return {
          ...bucket,
          bounties: bucket.bounties.filter(b => b !== bounty)
        };
      }
      return bucket;
    }));

    // Save to localStorage immediately as a backup
    BountyActionsService.saveToLocalStorage(updatedActions);
  };

  const handleRejectionConfirm = async (reason: string) => {
    await processBountyAction(
      rejectionModal.bucketId,
      rejectionModal.bounty,
      'rejected',
      reason
    );
    setRejectionModal({ isOpen: false, bounty: '', category: '', bucketId: 0 });
  };

  const handleRejectionCancel = () => {
    setRejectionModal({ isOpen: false, bounty: '', category: '', bucketId: 0 });
  };

  const getAvailableBounties = (bucketId: number) => {
    const bucket = bounties.find(b => b.bucket_id === bucketId);
    if (!bucket) return [];
    
    // Filter out bounties that have already been acted upon
    const actedBounties = bountyActions
      .filter(action => action.bucket_id === bucketId)
      .map(action => action.bounty);
    
    return bucket.bounties.filter(bounty => !actedBounties.includes(bounty));
  };

  const hasAvailableBounties = (bucketId: number) => {
    return getAvailableBounties(bucketId).length > 0;
  };

  const exportToCSV = () => {
    BountyActionsService.exportToCSV(bountyActions);
  };

  const saveAllToDatabase = async () => {
    setSaving(true);
    try {
      console.log('Attempting to save all bounty actions:', bountyActions);
      
      if (bountyActions.length === 0) {
        alert('No new bounty actions to save!');
        setSaving(false);
        return;
      }

      // Save to Supabase database (primary storage)
      await BountyActionsService.saveBountyActions(bountyActions);
      console.log('Successfully saved to Supabase database');
      
      // Clear the actions from state and localStorage after successful save
      setBountyActions([]);
      BountyActionsService.saveToLocalStorage([]);
      
      alert('✅ Bounty actions saved successfully to database!');
      
    } catch (dbError) {
      console.error('Failed to save to database:', dbError);
      
      // Keep data locally if DB save fails
      BountyActionsService.saveToLocalStorage(bountyActions);
      
      let errorMessage = 'Failed to save to database. Data is saved locally as a backup.';
      if (dbError instanceof Error) {
        if (dbError.message.includes('relation "bounty_selection_history" does not exist')) {
          errorMessage = 'Database table "bounty_selection_history" does not exist. Please create the table first.';
        } else if (dbError.message.includes('connection')) {
          errorMessage = 'Database connection failed. Please check your Supabase credentials.';
        } else if (dbError.message.includes('permission')) {
          errorMessage = 'Database permission denied. Please check your Supabase RLS policies.';
        } else {
          errorMessage += `\n\nError: ${dbError.message}`;
        }
      }
      
      alert(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const testDatabaseConnection = async () => {
    try {
      const result = await DatabaseTest.runFullTest();
      alert(result);
    } catch (error) {
      console.error('Database test failed:', error);
      alert('Database test failed. Please check the console for details.');
    }
  };

  const prepareBountiesForSubmission = () => {
    const approvedBounties = bountyActions
      .filter(action => action.action === 'accepted')
      .map(action => ({
        name: action.bounty,
        category: action.category || `Category ${action.bucket_id}`,
        weight: 1,
        expiry_days: 1
      }));
    
    setBountiesToSubmit(approvedBounties);
    setShowSubmitForm(true);
  };

  const updateBountyToSubmit = (index: number, field: keyof BountyToSubmit, value: string | number) => {
    setBountiesToSubmit(prev => prev.map((bounty, i) => 
      i === index ? { ...bounty, [field]: value } : bounty
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent multiple submissions
    if (submitting) {
      console.log('Submission already in progress. Ignoring duplicate click.');
      return;
    }
    
    setSubmitting(true);
    
    const approvedActions = bountyActions.filter(action => action.action === 'accepted');
    const rejectedActions = bountyActions.filter(action => action.action === 'rejected');

    if (approvedActions.length === 0 && rejectedActions.length === 0) {
      alert('No bounties to submit!');
      setSubmitting(false);
      return;
    }

    try {
      console.log(`Submitting ${approvedActions.length} approved and ${rejectedActions.length} rejected bounties`);
      
      // Step 1: Save all actions (approved and rejected) to the history table.
      // This ensures rejected bounties are saved even if approved ones fail later.
      if (bountyActions.length > 0) {
        await BountyActionsService.saveBountyActions(bountyActions);
        console.log('Successfully saved all actions to bounty_selection_history');
      }

      // Step 2: If there are approved bounties, insert them into the main 'bounties' and 'bountyBucketWeight' tables.
      if (approvedActions.length > 0) {
          const now = new Date();
          const expiry = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  
          const newBountiesToInsert = approvedActions.map(action => {
            const originalBounty = bounties.find(b => b.bounties.includes(action.bounty));
            return {
              date: now.toISOString().split('T')[0], // Current date in YYYY-MM-DD format
              bounty: action.bounty, // Use 'bounty' field name, not 'description'
              type: 'daily', // Default type
              lifespan: 24, // 24 hours
              target_value: 1, // Default target value
              expiry: expiry.toISOString(),
            };
          });
  
          console.log('Inserting bounties:', newBountiesToInsert.map(b => b.bounty));
  
          const { data: insertedBounties, error: bountiesError } = await supabase
            .from('bounties')
            .insert(newBountiesToInsert)
            .select('id, bounty'); // Select 'bounty' field, not 'name'
  
          if (bountiesError) throw bountiesError;
          if (!insertedBounties) throw new Error("Failed to get IDs from inserted bounties.");
  
          console.log('Successfully inserted bounties:', insertedBounties);
  
          const bucketWeights = insertedBounties.map(insertedBounty => {
            const originalAction = approvedActions.find(a => a.bounty === insertedBounty.bounty); // Match on 'bounty' field
            if (!originalAction) {
              throw new Error(`Could not find original action for bounty name ${insertedBounty.bounty}`);
            }
            return {
              bountyId: insertedBounty.id, // Use 'bountyId' field name
              bucketId: originalAction.bucket_id, // Use 'bucketId' field name
              weight: 1 // Default weight
            };
          });
  
          console.log('Inserting bucket weights:', bucketWeights);
  
          const { error: weightsError } = await supabase
            .from('bountyBucketWeight')
            .insert(bucketWeights);
  
          if (weightsError) throw weightsError;
          console.log('Successfully submitted approved bounties to main tables.');
      }
      
      alert('✅ Bounties processed successfully!');

      // Step 3: Update UI state - remove actioned bounties from view without a full refresh.
      const actionedBountyNames = new Set(bountyActions.map(a => a.bounty));
      const remainingBountiesInBuckets = bounties.map(bucket => ({
          ...bucket,
          bounties: bucket.bounties.filter(name => !actionedBountyNames.has(name))
      })).filter(bucket => bucket.bounties.length > 0);
      
      setBounties(remainingBountiesInBuckets);

      // Step 4: Clear state and localStorage for the processed actions
      setBountyActions([]);
      BountyActionsService.saveToLocalStorage([]);
      setShowSubmitForm(false);
      setBountiesToSubmit([]);

    } catch (error) {
      console.error('Error in submission process:', error);
      alert('An error occurred during the submission process. Please check the console.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // Derived state for easier access in render
  const approvedActions = bountyActions.filter(a => a.action === 'accepted');
  const rejectedActions = bountyActions.filter(a => a.action === 'rejected');

  const group1Categories = ['Active Life', 'Nourish', 'Rest'];
  
  // Create a Set for faster lookups
  const group1CategorySet = new Set(group1Categories);

  const group1Bounties = bounties.filter(b => group1CategorySet.has(bucketMap[b.bucket_id]));
  const group2Bounties = bounties.filter(b => !group1CategorySet.has(bucketMap[b.bucket_id]));

  const renderBountyList = (bountyList: Bounty[]) => {
    return bountyList.map(bucket => {
        // Filter out bounties that have already been acted upon in this session
        const availableBounties = bucket.bounties.filter(bountyName => 
            !bountyActions.some(action => action.bounty === bountyName)
        );

        return (
            <div key={bucket.bucket_id} className="bounty-category-item">
                <div className="category-header">
                  <h4>{bucketMap[bucket.bucket_id] || `Category ${bucket.bucket_id}`}</h4>
                  <button
                    className="refresh-category-button"
                    onClick={() => fetchBountiesForCategory(bucket.bucket_id)}
                    title={`Get new bounties for ${bucketMap[bucket.bucket_id] || `Category ${bucket.bucket_id}`}`}
                  >
                    Add New
                  </button>
                </div>
                <div className="bounties-list-items">
                    {availableBounties.length > 0 ? (
                        availableBounties.map((bountyName) => {
                            const existingAction = bountyActions.find(a => a.bounty === bountyName);
                            const isDisabled = !!existingAction;
                            
                            return (
                                <div key={bountyName} className={`bounty-item ${isDisabled ? 'disabled' : ''}`}>
                                    <p className="bounty-text">{bountyName}</p>
                                    {existingAction ? (
                                        <div className="bounty-status">
                                            <span className={`status-badge ${existingAction.action === 'accepted' ? 'approved' : 'rejected'}`}>
                                                {existingAction.action === 'accepted' ? '✓ Approved' : '✗ Rejected'}
                                            </span>
                                        </div>
                                    ) : (
                                        <div className="bounty-actions">
                                            <button 
                                                className="approve-button" 
                                                onClick={() => handleBountyAction(bucket.bucket_id, bountyName, 'accepted')}
                                                disabled={isDisabled}
                                            >
                                                Approve
                                            </button>
                                            <button 
                                                className="reject-button" 
                                                onClick={() => handleBountyAction(bucket.bucket_id, bountyName, 'rejected')}
                                                disabled={isDisabled}
                                            >
                                                Reject
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    ) : (
                        <div className="no-bounties-message">
                            <p>No available bounties in this category</p>
                            <button 
                                className="get-more-bounties-button"
                                onClick={() => fetchBountiesForCategory(bucket.bucket_id)}
                            >
                                Get More Bounties
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    });
  }

  return (
    <div className="ai-bounties-modal-overlay">
      <div className="ai-bounties-modal">
        <div className="ai-bounties-modal-header">
          <h2>AI Bounties</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="ai-bounties-modal-content">
          {loading && <div className="loading">Loading bounties...</div>}
          
          {error && (
            <div className="error">
              <p><strong>Error Details:</strong></p>
              <pre style={{ 
                whiteSpace: 'pre-wrap', 
                fontSize: '12px', 
                backgroundColor: '#f8f9fa', 
                padding: '10px', 
                borderRadius: '4px',
                maxHeight: '200px',
                overflow: 'auto'
              }}>
                {error}
              </pre>
              <div style={{ marginTop: '10px' }}>
                <button onClick={() => fetchBounties(null)}>Retry</button>
              </div>
            </div>
          )}

          {!loading && !error && !showSubmitForm && (
            <>
              <div className="bounties-container">
                <div className="bounty-category-group">
                  <h3>Active Life, Nourish & Rest</h3>
                  {renderBountyList(group1Bounties)}
                </div>
                <hr className="category-divider" />
                <div className="bounty-category-group">
                  <h3>Connect, Mindset & Explore</h3>
                  {renderBountyList(group2Bounties)}
                </div>
              </div>

              {bountyActions.length > 0 && (
                <div className="actions-summary">
                  <h3>Actions Summary ({bountyActions.length} total)</h3>
                  <div className="summary-stats">
                    <span>Approved: {approvedActions.length}</span>
                    <span>Rejected: {rejectedActions.length}</span>
                  </div>
                  <div className="summary-actions">
                    <button className="export-button" onClick={exportToCSV}>
                      Export to CSV
                    </button>
                    <button 
                      className="save-db-button" 
                      onClick={saveAllToDatabase}
                      disabled={saving || bountyActions.length === 0}
                    >
                      {saving ? 'Saving...' : `Save ${bountyActions.length} Actions to DB`}
                    </button>
                    <button 
                      className="test-db-button"
                      onClick={testDatabaseConnection}
                      title="Test database connection and table setup"
                    >
                      Test DB
                    </button>
                    {approvedActions.length > 0 && (
                      <button 
                        className="submit-button" 
                        onClick={prepareBountiesForSubmission}
                      >
                        Submit Approved to Main Table
                      </button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {showSubmitForm && (
            <div className="submit-form">
              <h3>Submit Approved Bounties to Main Table</h3>
              <p>Review and adjust the settings for each approved bounty before submitting:</p>
              
              <div className="sheet-actions">
                <button 
                  className="open-sheet-button"
                  onClick={() => GoogleSheetsService.openSheetInNewTab()}
                >
                  Open Google Sheets
                </button>
                <span className="sheet-info">Data will be copied to clipboard for easy pasting</span>
              </div>
              
              <div className="bounties-to-submit">
                {bountiesToSubmit.map((bounty, index) => (
                  <div key={index} className="bounty-submit-item">
                    <div className="bounty-submit-header">
                      <h4>{bounty.name}</h4>
                      <span className="category-badge">{bounty.category}</span>
                    </div>
                    <div className="bounty-submit-settings">
                      <div className="setting-group">
                        <label htmlFor={`weight-${index}`}>Weight:</label>
                        <input
                          id={`weight-${index}`}
                          type="number"
                          min="1"
                          max="10"
                          value={bounty.weight}
                          onChange={(e) => updateBountyToSubmit(index, 'weight', parseInt(e.target.value) || 1)}
                          title="Set the weight for this bounty (1-10)"
                        />
                      </div>
                      <div className="setting-group">
                        <label htmlFor={`expiry-${index}`}>Expiry (days):</label>
                        <input
                          id={`expiry-${index}`}
                          type="number"
                          min="1"
                          max="30"
                          value={bounty.expiry_days}
                          onChange={(e) => updateBountyToSubmit(index, 'expiry_days', parseInt(e.target.value) || 1)}
                          title="Set the expiry period in days (1-30)"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="submit-form-actions">
                <button 
                  className="cancel-button"
                  onClick={() => setShowSubmitForm(false)}
                >
                  Cancel
                </button>
                <button 
                  className="submit-final-button"
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? 'Submitting...' : `Submit ${bountiesToSubmit.length} Bounties`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <RejectionModal
        isOpen={rejectionModal.isOpen}
        bounty={rejectionModal.bounty}
        category={rejectionModal.category}
        onConfirm={handleRejectionConfirm}
        onCancel={handleRejectionCancel}
      />
    </div>
  );
};

export default AIBountiesModal; 