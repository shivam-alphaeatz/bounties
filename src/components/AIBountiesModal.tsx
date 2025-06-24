import React, { useState, useEffect, useCallback } from 'react';
import './AIBountiesModal.css';
import { BountyActionsService, BountyAction } from '../services/bountyActionsService';
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
  date: string;
  expiry_timestamp: string;
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
  
  // Add refresh counters for each category (max 3 refreshes per category)
  const [refreshCounts, setRefreshCounts] = useState<{[key: number]: number}>({
    1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0
  });

  // Bucket ID to Category mapping
  const bucketMap: { [key: number]: string } = {
    1: 'Nourish',
    2: 'Rest',
    3: 'Active Life',
    4: 'Connect',
    5: 'Mindset',
    6: 'Explore'
  };

  // Helper function to format expiry timestamp for display
  const formatExpiryForDisplay = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  // Helper function to format date for display
  const formatDateForDisplay = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
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
    // Check if we've reached the refresh limit for this category
    if (refreshCounts[bucketId] >= 3) {
      alert(`You've reached the maximum of 3 refreshes for ${bucketMap[bucketId]}. Please wait for new bounties to be generated.`);
      return;
    }

    const authToken = process.env.REACT_APP_SUPABASE_ANON_KEY;
    const edgeFunctionUrl = process.env.REACT_APP_SUPABASE_EDGE_FUNCTION_URL || 'https://nwfhqrmdjmjopbxulyhu.supabase.co/functions/v1/bountygen';
    
    console.log(`Fetching bounties for category ${bucketId} (${bucketMap[bucketId]}) - Refresh #${refreshCounts[bucketId] + 1}`);
    
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
        const updatedBounties = prevBounties.map(bucket => 
          bucket.bucket_id === bucketId ? data[0] : bucket
        );
        return updatedBounties;
      });

      // Increment refresh count for this category
      setRefreshCounts(prev => ({
        ...prev,
        [bucketId]: prev[bucketId] + 1
      }));

      console.log(`Successfully refreshed category ${bucketId}. Refresh count: ${refreshCounts[bucketId] + 1}/3`);
    } catch (err) {
      console.error(`Error fetching bounties for category ${bucketId}:`, err);
      setError(`Failed to fetch new bounties for ${bucketMap[bucketId]}`);
    }
  };

  // Group bounties into two categories
  const group1Bounties = bounties.filter(bucket => [1, 2, 3].includes(bucket.bucket_id));
  const group2Bounties = bounties.filter(bucket => [4, 5, 6].includes(bucket.bucket_id));

  // Get approved and rejected actions
  const approvedActions = bountyActions.filter(action => action.action === 'accepted');
  const rejectedActions = bountyActions.filter(action => action.action === 'rejected');

  useEffect(() => {
    if (isOpen) {
      console.log('AIBountiesModal: Modal opened, fetching bounties and loading actions');
      fetchBounties(null);
      loadSavedActions();
      
      // Check for and clear any default approved bounties
      setTimeout(async () => {
        const savedActions = await BountyActionsService.getBountyActions();
        const defaultApprovedCount = savedActions.filter(action => action.action === 'accepted').length;
        
        if (defaultApprovedCount > 0) {
          console.log(`Found ${defaultApprovedCount} default approved bounties, clearing them...`);
          const confirmed = window.confirm(
            `Found ${defaultApprovedCount} previously approved bounty${defaultApprovedCount !== 1 ? 'ies' : 'y'} from a previous session.\n\n` +
            `These will be cleared to start fresh. Continue?`
          );
          
          if (confirmed) {
            await clearApprovedBounties();
          }
        }
      }, 1000); // Small delay to ensure actions are loaded first
    } else {
      console.log('AIBountiesModal: Modal closed');
    }
  }, [isOpen, fetchBounties]);

  // Function to clear approved bounties from cache and database
  const clearApprovedBounties = async () => {
    try {
      // Clear from localStorage
      const remainingActions = bountyActions.filter(action => action.action === 'rejected');
      BountyActionsService.saveToLocalStorage(remainingActions);
      setBountyActions(remainingActions);

      // Clear from database if possible
      try {
        const { error } = await supabase
          .from('bounty_actions')
          .delete()
          .eq('action', 'accepted');

        if (error) {
          console.error('Error clearing approved bounties from database:', error);
        } else {
          console.log('Successfully cleared approved bounties from database');
        }
      } catch (dbError) {
        console.error('Failed to clear approved bounties from database:', dbError);
      }

      console.log('Approved bounties cleared successfully');
    } catch (error) {
      console.error('Error clearing approved bounties:', error);
    }
  };

  // Function to handle modal close with confirmation
  const handleCloseModal = () => {
    if (approvedActions.length > 0) {
      const confirmed = window.confirm(
        `You have ${approvedActions.length} approved bounty${approvedActions.length !== 1 ? 'ies' : 'y'} that haven't been submitted.\n\n` +
        `Closing the modal will clear all approved bounties from cache and database.\n\n` +
        `Are you sure you want to close and lose these approved bounties?`
      );
      
      if (confirmed) {
        clearApprovedBounties();
        onClose();
      }
    } else {
      onClose();
    }
  };

  // Add keyboard event listener for Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        // Don't close if rejection modal is open
        if (rejectionModal.isOpen) {
          console.log('AIBountiesModal: Escape key pressed but rejection modal is open, ignoring');
          return;
        }
        console.log('AIBountiesModal: Escape key pressed, closing modal');
        handleCloseModal();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      // Restore body scroll when modal is closed
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, rejectionModal.isOpen, approvedActions.length]);

  console.log('AIBountiesModal: Rendering with isOpen:', isOpen);

  const loadSavedActions = async () => {
    try {
      const savedActions = await BountyActionsService.getBountyActions();
      setBountyActions(savedActions);
    } catch (error) {
      console.error('Error loading saved actions:', error);
      // Fallback to localStorage
      const localActions = BountyActionsService.loadFromLocalStorage();
      setBountyActions(localActions);
    }
  };

  const handleBountyAction = async (bucketId: number, bounty: string, action: 'accepted' | 'rejected') => {
    if (action === 'rejected') {
      setRejectionModal({
        isOpen: true,
        bounty,
        category: bucketMap[bucketId],
        bucketId
      });
    } else {
      await processBountyAction(bucketId, bounty, action, '');
    }
  };

  const processBountyAction = async (bucketId: number, bounty: string, action: 'accepted' | 'rejected', reason: string) => {
    console.log(`Processing ${action} action for bounty: ${bounty}`);
    
    const newAction: BountyAction = {
      bucket_id: bucketId,
      bounty,
      action,
      timestamp: new Date(),
      category: bucketMap[bucketId],
      rejection_reason: reason || undefined
    };

    // For rejections, save immediately to database
    if (action === 'rejected') {
      try {
        console.log('Saving rejection to database...');
        const { error } = await supabase
          .from('rejected_bounties')
          .insert({
            bounty: bounty,
            category: bucketMap[bucketId],
            bucket_id: bucketId,
            rejection_reason: reason || null,
            rejected_at: new Date().toISOString()
          });

        if (error) {
          console.error('Error saving rejection to database:', error);
          // Don't throw error here - continue with localStorage save
        } else {
          console.log('Rejection saved to database successfully');
        }
      } catch (error) {
        console.error('Failed to save rejection to database:', error);
        // Don't throw error here - continue with localStorage save
      }
    }

    // For approvals, save immediately to database
    if (action === 'accepted') {
      try {
        console.log('Saving approval to database...');
        const { error } = await supabase
          .from('approved_bounties')
          .insert({
            bounty: bounty,
            category: bucketMap[bucketId],
            bucket_id: bucketId,
            approved_at: new Date().toISOString()
          });

        if (error) {
          console.error('Error saving approval to database:', error);
          // Don't throw error here - continue with localStorage save
        } else {
          console.log('Approval saved to database successfully');
        }
      } catch (error) {
        console.error('Failed to save approval to database:', error);
        // Don't throw error here - continue with localStorage save
      }
    }

    // Save to localStorage and update state
    try {
      console.log('Saving action to localStorage...');
      await BountyActionsService.saveBountyAction(newAction);
      setBountyActions(prev => {
        const updated = [...prev, newAction];
        console.log('Updated bountyActions:', updated);
        return updated;
      });
      
      if (reason) {
        setRejectionReason(prev => ({ ...prev, [bounty]: reason }));
      }
      
      console.log(`Successfully processed ${action} action for bounty: ${bounty}`);
    } catch (error) {
      console.error('Error saving action to localStorage:', error);
      // Even if localStorage fails, update the state to show the action
      setBountyActions(prev => [...prev, newAction]);
    }
  };

  const handleRejectionConfirm = async (reason: string) => {
    console.log('Rejection confirmed with reason:', reason);
    try {
      await processBountyAction(
        rejectionModal.bucketId,
        rejectionModal.bounty,
        'rejected',
        reason
      );
      console.log('Rejection processed successfully, closing rejection modal');
      setRejectionModal({ isOpen: false, bounty: '', category: '', bucketId: 0 });
      
      // Show a brief success message
      const successMessage = document.createElement('div');
      successMessage.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #10b981;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        z-index: 2000;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
      `;
      successMessage.textContent = 'Bounty rejected and saved successfully!';
      document.body.appendChild(successMessage);
      
      // Remove the message after 3 seconds
      setTimeout(() => {
        if (document.body.contains(successMessage)) {
          document.body.removeChild(successMessage);
        }
      }, 3000);
      
    } catch (error) {
      console.error('Error processing rejection:', error);
      // Don't close the rejection modal if there's an error
      alert('Error processing rejection. Please try again.');
    }
  };

  const handleRejectionCancel = () => {
    console.log('Rejection cancelled');
    setRejectionModal({ isOpen: false, bounty: '', category: '', bucketId: 0 });
  };

  const getAvailableBounties = (bucketId: number) => {
    const bucket = bounties.find(b => b.bucket_id === bucketId);
    return bucket ? bucket.bounties : [];
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
      // Save all actions to database
      for (const action of bountyActions) {
        if (action.action === 'accepted') {
          // Save approved bounties
          const { error } = await supabase
            .from('approved_bounties')
            .insert({
              bounty: action.bounty,
              category: action.category,
              bucket_id: action.bucket_id,
              approved_at: action.timestamp.toISOString()
            });

          if (error) {
            console.error('Error saving approved bounty:', error);
          }
        } else {
          // Save rejected bounties
          const { error } = await supabase
            .from('rejected_bounties')
            .insert({
              bounty: action.bounty,
              category: action.category,
              bucket_id: action.bucket_id,
              rejection_reason: action.rejection_reason,
              rejected_at: action.timestamp.toISOString()
            });

          if (error) {
            console.error('Error saving rejected bounty:', error);
          }
        }
      }

      console.log('All actions saved to database successfully');
      alert('All actions saved to database successfully!');
    } catch (error) {
      console.error('Error saving to database:', error);
      alert('Error saving to database. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const testDatabaseConnection = async () => {
    try {
      const result = await DatabaseTest.testConnection();
      alert(`Database test result: ${result}`);
    } catch (error) {
      alert(`Database test failed: ${error}`);
    }
  };

  const prepareBountiesForSubmission = () => {
    // Calculate default expiry (24 hours from now)
    const defaultExpiry = new Date();
    defaultExpiry.setHours(defaultExpiry.getHours() + 24);
    
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    
    const approvedBounties = bountyActions
      .filter(action => action.action === 'accepted')
      .map(action => ({
        name: action.bounty,
        category: action.category || `Category ${action.bucket_id}`,
        date: today, // Default to today's date
        expiry_timestamp: defaultExpiry.toISOString() // Default to 24 hours from now
      }));
    
    setBountiesToSubmit(approvedBounties);
    setShowSubmitForm(true);
  };

  const updateBountyToSubmit = (index: number, field: keyof BountyToSubmit, value: string | number) => {
    setBountiesToSubmit(prev => 
      prev.map((bounty, i) => 
        i === index ? { ...bounty, [field]: value } : bounty
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      let successCount = 0;
      let errorCount = 0;
      
      // Save to main bounties table
      for (const bounty of bountiesToSubmit) {
        // Insert into main bounties table
        const { data: bountyData, error: bountyError } = await supabase
          .from('bounties')
          .insert({
            date: bounty.date, // Use the date from the form
            bounty: bounty.name, // Use 'bounty' field instead of 'name'
            type: 'daily', // Changed from 'AI Generated' to 'daily'
            expiry: bounty.expiry_timestamp, // Use the expiry timestamp directly
            target_value: 1
          })
          .select();

        if (bountyError) {
          console.error('Error saving bounty to main table:', bountyError);
          errorCount++;
          continue;
        }

        // If bounty was inserted successfully, add category weight (default weight of 1)
        if (bountyData && bountyData.length > 0) {
          const bountyId = bountyData[0].id;
          
          // Find the bucket_id for this category
          const bucketId = Object.entries(bucketMap).find(([id, name]) => name === bounty.category)?.[0];
          
          if (bucketId) {
            const { error: weightError } = await supabase
              .from('bountyBucketWeight')
              .insert({
                bountyId: bountyId,
                bucketId: parseInt(bucketId),
                weight: 1 // Default weight of 1
              });

            if (weightError) {
              console.error('Error saving category weight:', weightError);
              // Don't count this as a failure since the bounty was saved
            }
          }
          
          successCount++;
        }
      }

      if (errorCount > 0) {
        alert(`Submitted ${successCount} bounties successfully, but ${errorCount} failed. Check console for details.`);
      } else {
        alert(`Successfully submitted ${bountiesToSubmit.length} bounties to the main bounties table!`);
      }
      
      // Clear the form and go back to main view
      setShowSubmitForm(false);
      setBountiesToSubmit([]);
      
      // Clear approved actions from localStorage since they've been submitted
      const remainingActions = bountyActions.filter(action => action.action === 'rejected');
      BountyActionsService.saveToLocalStorage(remainingActions);
      setBountyActions(remainingActions);
      
    } catch (error) {
      console.error('Error submitting bounties:', error);
      alert('Error submitting bounties. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const removeApprovedBounty = async (bountyName: string) => {
    console.log(`Removing approved bounty: ${bountyName}`);
    
    // Remove from bountiesToSubmit
    setBountiesToSubmit(prev => prev.filter(bounty => bounty.name !== bountyName));
    
    // Remove from bountyActions and localStorage
    const updatedActions = bountyActions.filter(action => action.bounty !== bountyName);
    setBountyActions(updatedActions);
    
    // Update localStorage
    BountyActionsService.saveToLocalStorage(updatedActions);

    // Remove from database
    try {
      console.log('Removing bounty from database...');
      const { error } = await supabase
        .from('approved_bounties')
        .delete()
        .eq('bounty', bountyName);

      if (error) {
        console.error('Error removing bounty from database:', error);
        alert('Warning: Bounty was removed from the list but there was an error removing it from the database.');
      } else {
        console.log('Bounty successfully removed from database');
      }
    } catch (error) {
      console.error('Failed to remove bounty from database:', error);
      alert('Warning: Bounty was removed from the list but there was an error removing it from the database.');
    }
  };

  const renderBountyList = (bountyList: Bounty[]) => {
    return bountyList.map(bucket => {
        // Show all bounties, including those that have been acted upon
        const allBounties = bucket.bounties;
        const refreshCount = refreshCounts[bucket.bucket_id] || 0;
        const canRefresh = refreshCount < 3;

        return (
            <div key={bucket.bucket_id} className="bounty-category-item">
                <div className="category-header">
                  <h4>{bucketMap[bucket.bucket_id] || `Category ${bucket.bucket_id}`}</h4>
                  <div className="refresh-info">
                    <span className="refresh-count">Refreshes: {refreshCount}/3</span>
                    <button
                      className={`refresh-category-button ${!canRefresh ? 'disabled' : ''}`}
                      onClick={() => canRefresh && fetchBountiesForCategory(bucket.bucket_id)}
                      disabled={!canRefresh}
                      title={canRefresh 
                        ? `Get new bounties for ${bucketMap[bucket.bucket_id] || `Category ${bucket.bucket_id}`}`
                        : `Maximum refreshes reached for ${bucketMap[bucket.bucket_id] || `Category ${bucket.bucket_id}`}`
                      }
                    >
                      {canRefresh ? 'Add New' : 'Limit Reached'}
                    </button>
                  </div>
                </div>
                <div className="bounties-list-items">
                    {allBounties.length > 0 ? (
                        allBounties.map((bountyName) => {
                            const existingAction = bountyActions.find(a => a.bounty === bountyName);
                            const isDisabled = !!existingAction;
                            
                            return (
                                <div key={bountyName} className={`bounty-item ${isDisabled ? 'acted-upon' : ''}`}>
                                    <p className="bounty-text">{bountyName}</p>
                                    {existingAction ? (
                                        <div className="bounty-status">
                                            <span className={`status-badge ${existingAction.action === 'accepted' ? 'approved' : 'rejected'}`}>
                                                {existingAction.action === 'accepted' ? '✓ Approved' : '✗ Rejected'}
                                            </span>
                                            {existingAction.rejection_reason && (
                                                <div className="reason-display">
                                                    <small>Reason: {existingAction.rejection_reason}</small>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="bounty-actions">
                                            <button 
                                                className="approve-button" 
                                                onClick={() => handleBountyAction(bucket.bucket_id, bountyName, 'accepted')}
                                            >
                                                Approve
                                            </button>
                                            <button 
                                                className="reject-button" 
                                                onClick={() => handleBountyAction(bucket.bucket_id, bountyName, 'rejected')}
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
                                className={`get-more-bounties-button ${!canRefresh ? 'disabled' : ''}`}
                                onClick={() => canRefresh && fetchBountiesForCategory(bucket.bucket_id)}
                                disabled={!canRefresh}
                            >
                                {canRefresh ? 'Get More Bounties' : 'Refresh Limit Reached'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    });
  }

  return (
    <>
      {isOpen && (
        <div 
          className="ai-bounties-modal-overlay" 
          onClick={(e) => {
            // Don't close if rejection modal is open
            if (rejectionModal.isOpen) {
              console.log('AIBountiesModal: Click outside but rejection modal is open, ignoring');
              return;
            }
            console.log('AIBountiesModal: Click outside, closing modal');
            handleCloseModal();
          }}
        >
          <div className="ai-bounties-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ai-bounties-modal-header">
              <h2>AI Bounties</h2>
              <button className="close-button" onClick={handleCloseModal}>×</button>
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

                  {approvedActions.length > 0 && (
                    <div className="submit-section">
                      <div className="submit-info">
                        <span className="approved-count">{approvedActions.length} bounty{approvedActions.length !== 1 ? 'ies' : 'y'} approved</span>
                        <div className="submit-actions">
                          <button 
                            className="submit-button" 
                            onClick={prepareBountiesForSubmission}
                          >
                            Submit Approved Bounties
                          </button>
                          <button 
                            className="clear-button" 
                            onClick={async () => {
                              const confirmed = window.confirm(
                                `Are you sure you want to clear all ${approvedActions.length} approved bounty${approvedActions.length !== 1 ? 'ies' : 'y'}?\n\n` +
                                `This action cannot be undone.`
                              );
                              if (confirmed) {
                                await clearApprovedBounties();
                              }
                            }}
                            title="Clear all approved bounties"
                          >
                            Clear All
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {showSubmitForm && (
                <div className="submit-form">
                  <h3>Submit Approved Bounties to Main Table</h3>
                  <p>Review and adjust the settings for each approved bounty before submitting:</p>
                  
                  <div className="bounties-to-submit">
                    {bountiesToSubmit.map((bounty, index) => (
                      <div key={index} className="bounty-submit-item">
                        <div className="bounty-submit-header">
                          <h4>{bounty.name}</h4>
                          <span className="category-badge">{bounty.category}</span>
                          <button 
                            className="remove-bounty-button"
                            onClick={() => removeApprovedBounty(bounty.name)}
                            title="Remove this bounty from submission"
                          >
                            ✕ Remove
                          </button>
                        </div>
                        <div className="bounty-submit-settings">
                          <div className="setting-group">
                            <label htmlFor={`date-${index}`}>Date:</label>
                            <div className="date-display">
                              <span className="date-text">Date: {formatDateForDisplay(bounty.date)}</span>
                            </div>
                            <input
                              id={`date-${index}`}
                              type="date"
                              value={bounty.date}
                              onChange={(e) => updateBountyToSubmit(index, 'date', e.target.value)}
                              title="Set the date for this bounty"
                            />
                          </div>
                          <div className="setting-group">
                            <label htmlFor={`expiry-${index}`}>Expiry:</label>
                            <div className="expiry-display">
                              <span className="expiry-text">Expires: {formatExpiryForDisplay(bounty.expiry_timestamp)}</span>
                            </div>
                            <input
                              id={`expiry-${index}`}
                              type="datetime-local"
                              value={bounty.expiry_timestamp.slice(0, 16)} // Format for datetime-local input
                              onChange={(e) => {
                                const newTimestamp = new Date(e.target.value).toISOString();
                                updateBountyToSubmit(index, 'expiry_timestamp', newTimestamp);
                              }}
                              title="Set the expiry date and time"
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
      )}
    </>
  );
};

export default AIBountiesModal; 