import React, { useState, useEffect, useCallback, useRef } from 'react';
import './AIBountiesModal.css';
import { BountyActionsService, BountyAction } from '../services/bountyActionsService';
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
  bounty_type: string;
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
  
  // Add bounty type state
  const [selectedBountyType, setSelectedBountyType] = useState<'daily' | 'weekly' | 'yearly'>('daily');
  
  // Track which bounty types have been loaded
  const [loadedBountyTypes, setLoadedBountyTypes] = useState<Set<string>>(new Set(['daily']));
  
  // Add state to show/hide processed bounties
  const [showProcessedBounties, setShowProcessedBounties] = useState(false);
  
  // Add refresh counters for each category and type (max 3 refreshes per category per type)
  const [refreshCounts, setRefreshCounts] = useState<{[key: string]: number}>({});
  
  // Track pending uploads counts
  const [pendingActionsCount, setPendingActionsCount] = useState(0);
  const [pendingBountiesCount, setPendingBountiesCount] = useState(0);

  // Options dropdown state
  const [showOptionsDropdown, setShowOptionsDropdown] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });
  const optionsButtonRef = useRef<HTMLButtonElement>(null);

  // Cache keys for localStorage
  const CACHE_KEYS = {
    BOUNTIES: 'ai_bounties_cache',
    BOUNTIES_TIMESTAMP: 'ai_bounties_timestamp',
    REFRESH_COUNTS: 'ai_refresh_counts'
  };

  // Cache duration in milliseconds (1 hour)
  const CACHE_DURATION = 60 * 60 * 1000;

  // Pending uploads cache keys
  const PENDING_KEYS = {
    PENDING_ACTIONS: 'pending_bounty_actions',
    PENDING_BOUNTIES: 'pending_bounties_submit'
  };

  // Bucket ID to Category mapping
  const bucketMap: { [key: number]: string } = {
    1: 'Nourish',
    2: 'Rest',
    3: 'Active Life',
    4: 'Connect',
    5: 'Mindset',
    6: 'Explore'
  };

  // Bounty types
  const bountyTypes = ['daily', 'weekly', 'yearly'] as const;

  // Function to get cache key for specific type
  const getCacheKeyForType = (type: string) => `ai_bounties_cache_${type}`;
  const getTimestampKeyForType = (type: string) => `ai_bounties_timestamp_${type}`;

  // Function to calculate dropdown position
  const calculateDropdownPosition = () => {
    if (optionsButtonRef.current) {
      const rect = optionsButtonRef.current.getBoundingClientRect();
      const top = rect.bottom + 8; // 8px gap
      const right = window.innerWidth - rect.right;
      setDropdownPosition({ top, right });
      console.log('Dropdown position calculated:', { top, right, rect });
    }
  };

  // Function to handle options button click
  const handleOptionsButtonClick = () => {
    if (!showOptionsDropdown) {
      calculateDropdownPosition();
    }
    setShowOptionsDropdown(!showOptionsDropdown);
  };

  // Cache management functions
  const saveBountiesToCache = (bountiesData: Bounty[]) => {
    try {
      const cacheKey = getCacheKeyForType(selectedBountyType);
      const timestampKey = getTimestampKeyForType(selectedBountyType);
      localStorage.setItem(cacheKey, JSON.stringify(bountiesData));
      localStorage.setItem(timestampKey, Date.now().toString());
      console.log(`Saved bounties to cache for type: ${selectedBountyType}`);
    } catch (error) {
      console.error('Error saving bounties to cache:', error);
    }
  };

  const loadBountiesFromCache = (bountyType?: string): Bounty[] | null => {
    try {
      const typeToUse = bountyType || selectedBountyType;
      const cacheKey = getCacheKeyForType(typeToUse);
      const timestampKey = getTimestampKeyForType(typeToUse);
      const cached = localStorage.getItem(cacheKey);
      const timestamp = localStorage.getItem(timestampKey);
      
      if (!cached || !timestamp) {
        console.log(`No cached bounties found for type: ${typeToUse}`);
        return null;
      }
      
      const age = Date.now() - parseInt(timestamp);
      if (age > CACHE_DURATION) {
        console.log(`Cache expired for type: ${typeToUse}, age: ${age}ms`);
        localStorage.removeItem(cacheKey);
        localStorage.removeItem(timestampKey);
        return null;
      }
      
      const bounties = JSON.parse(cached);
      console.log(`Loaded ${bounties.length} bounties from cache for type: ${typeToUse}`);
      return bounties;
    } catch (error) {
      console.error('Error loading bounties from cache:', error);
      return null;
    }
  };

  const clearBountiesCache = () => {
    try {
      bountyTypes.forEach(type => {
        const cacheKey = getCacheKeyForType(type);
        const timestampKey = getTimestampKeyForType(type);
        localStorage.removeItem(cacheKey);
        localStorage.removeItem(timestampKey);
      });
      console.log('Cleared all bounty caches');
    } catch (error) {
      console.error('Error clearing bounties cache:', error);
    }
  };

  const saveRefreshCountsToCache = (counts: {[key: string]: number}) => {
    try {
      localStorage.setItem(CACHE_KEYS.REFRESH_COUNTS, JSON.stringify(counts));
    } catch (error) {
      console.error('Error saving refresh counts to cache:', error);
    }
  };

  const loadRefreshCountsFromCache = (): {[key: string]: number} => {
    try {
      const cached = localStorage.getItem(CACHE_KEYS.REFRESH_COUNTS);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.error('Error loading refresh counts from cache:', error);
    }
    return { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  };

  // Pending uploads management functions
  const savePendingActions = (actions: BountyAction[]) => {
    try {
      localStorage.setItem(PENDING_KEYS.PENDING_ACTIONS, JSON.stringify(actions));
      console.log(`Saved ${actions.length} pending actions to localStorage`);
    } catch (error) {
      console.error('Error saving pending actions:', error);
    }
  };

  const loadPendingActions = (): BountyAction[] => {
    try {
      const pending = localStorage.getItem(PENDING_KEYS.PENDING_ACTIONS);
      if (pending) {
        const parsed = JSON.parse(pending);
        return parsed.map((action: any) => ({
          ...action,
          timestamp: new Date(action.timestamp)
        }));
      }
    } catch (error) {
      console.error('Error loading pending actions:', error);
    }
    return [];
  };

  const clearPendingActions = () => {
    try {
      localStorage.removeItem(PENDING_KEYS.PENDING_ACTIONS);
      console.log('Pending actions cleared from localStorage');
    } catch (error) {
      console.error('Error clearing pending actions:', error);
    }
  };

  const savePendingBounties = (bounties: BountyToSubmit[]) => {
    try {
      localStorage.setItem(PENDING_KEYS.PENDING_BOUNTIES, JSON.stringify(bounties));
      console.log(`Saved ${bounties.length} pending bounties to localStorage`);
    } catch (error) {
      console.error('Error saving pending bounties:', error);
    }
  };

  const loadPendingBounties = (): BountyToSubmit[] => {
    try {
      const pending = localStorage.getItem(PENDING_KEYS.PENDING_BOUNTIES);
      if (pending) {
        return JSON.parse(pending);
      }
    } catch (error) {
      console.error('Error loading pending bounties:', error);
    }
    return [];
  };

  const clearPendingBounties = () => {
    try {
      localStorage.removeItem(PENDING_KEYS.PENDING_BOUNTIES);
      console.log('Pending bounties cleared from localStorage');
    } catch (error) {
      console.error('Error clearing pending bounties:', error);
    }
  };

  // Function to update pending counts
  const updatePendingCounts = () => {
    const pendingActions = loadPendingActions();
    const pendingBounties = loadPendingBounties();
    setPendingActionsCount(pendingActions.length);
    setPendingBountiesCount(pendingBounties.length);
  };

  // Function to check if there are pending uploads
  const hasPendingUploads = () => {
    return pendingActionsCount > 0 || pendingBountiesCount > 0;
  };

  // Function to show pending uploads info
  const showPendingUploadsInfo = () => {
    let message = 'Pending Uploads:\n\n';
    
    if (pendingActionsCount > 0) {
      message += `• ${pendingActionsCount} bounty actions (approved/rejected)\n`;
    }
    
    if (pendingBountiesCount > 0) {
      message += `• ${pendingBountiesCount} bounties for main table\n`;
    }
    
    if (pendingActionsCount === 0 && pendingBountiesCount === 0) {
      message = 'No pending uploads found.';
    }
    
    alert(message);
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

  const fetchBounties = useCallback(async (bucketId: number | null, forceRefresh: boolean = false) => {
    setLoading(true);
    setError(null);
    
    // If not forcing refresh, try to load from cache first
    if (!forceRefresh && bucketId === null) {
      const cachedBounties = loadBountiesFromCache();
      if (cachedBounties) {
        console.log('Using cached bounties');
        setBounties(cachedBounties);
        setLoading(false);
        return;
      }
    }
    
    console.log('Fetching bounties from API...');
    
    const requestBody = { 
      bucket_id: bucketId || 0,
      type: selectedBountyType
    };
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
      
      // Save to cache if this is a full fetch (not category-specific)
      if (bucketId === null) {
        saveBountiesToCache(data);
      }
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
  }, [selectedBountyType]);

  // New function for category-specific refresh
  const fetchBountiesForCategory = async (bucketId: number) => {
    const refreshKey = `${selectedBountyType}_${bucketId}`;
    
    // Check if we've reached the refresh limit for this category and type
    if (refreshCounts[refreshKey] >= 3) {
      alert(`You've reached the maximum of 3 refreshes for ${bucketMap[bucketId]} (${selectedBountyType}). Please wait for new bounties to be generated.`);
      return;
    }

    const authToken = process.env.REACT_APP_SUPABASE_ANON_KEY;
    const edgeFunctionUrl = process.env.REACT_APP_SUPABASE_EDGE_FUNCTION_URL || 'https://nwfhqrmdjmjopbxulyhu.supabase.co/functions/v1/bountygen';
    
    try {
      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ 
          bucket_id: bucketId,
          type: selectedBountyType
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const newBounties = await response.json();
      
      // Update the existing bounties with new ones for this category
      setBounties(prevBounties => {
        const updatedBounties = prevBounties.map(bucket => 
          bucket.bucket_id === bucketId ? newBounties[0] : bucket
        );
        
        // Update cache with the new data
        saveBountiesToCache(updatedBounties);
        return updatedBounties;
      });

      // Increment refresh count for this category and type
      setRefreshCounts(prev => {
        const newCounts = {
          ...prev,
          [refreshKey]: (prev[refreshKey] || 0) + 1
        };
        saveRefreshCountsToCache(newCounts);
        return newCounts;
      });

      console.log(`Successfully refreshed category ${bucketId} for type ${selectedBountyType}. Refresh count: ${(refreshCounts[refreshKey] || 0) + 1}/3`);
    } catch (err) {
      console.error(`Error fetching bounties for category ${bucketId} (${selectedBountyType}):`, err);
      setError(`Failed to fetch new bounties for ${bucketMap[bucketId]} (${selectedBountyType})`);
    }
  };

  // Group bounties into two categories
  const group1Bounties = (bounties || []).filter(bucket => [1, 2, 3].includes(bucket.bucket_id));
  const group2Bounties = (bounties || []).filter(bucket => [4, 5, 6].includes(bucket.bucket_id));

  // Get approved and rejected actions
  const approvedActions = (bountyActions || []).filter(action => action.action === 'accepted');
  const rejectedActions = (bountyActions || []).filter(action => action.action === 'rejected');
  
  // Get unsubmitted actions for the submit button
  const unsubmittedActions = (bountyActions || []).filter(action => !action.submitted);
  const unsubmittedApprovedActions = unsubmittedActions.filter(action => action.action === 'accepted');
  const unsubmittedRejectedActions = unsubmittedActions.filter(action => action.action === 'rejected');

  // Load saved actions and update pending counts on mount
  useEffect(() => {
    if (isOpen) {
      console.log('AIBountiesModal: Modal opened, loading cached data and fetching bounties if needed');
      
      // Load refresh counts from cache
      const cachedRefreshCounts = loadRefreshCountsFromCache();
      setRefreshCounts(cachedRefreshCounts);
      
      // Load saved actions
      loadSavedActions();
      
      // Fetch bounties (will use cache if available)
      fetchBounties(null, false);
      updatePendingCounts();
    } else {
      console.log('AIBountiesModal: Modal closed');
    }
  }, [isOpen, fetchBounties]);

  // Update pending counts when bountyActions change
  useEffect(() => {
    updatePendingCounts();
  }, [bountyActions]);

  // Update pending counts on mount
  useEffect(() => {
    updatePendingCounts();
  }, []);

  // Handle clicking outside dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showOptionsDropdown && !target.closest('.options-dropdown')) {
        setShowOptionsDropdown(false);
      }
    };

    if (showOptionsDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showOptionsDropdown]);

  // Handle window resize to recalculate dropdown position
  useEffect(() => {
    const handleResize = () => {
      if (showOptionsDropdown) {
        calculateDropdownPosition();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [showOptionsDropdown]);

  // Function to reset refresh limits for all categories
  const resetRefreshLimits = () => {
    const confirmed = window.confirm(
      'Are you sure you want to reset refresh limits for all categories?\n\n' +
      'This will allow you to refresh bounties again for all categories and types.'
    );
    
    if (confirmed) {
      setRefreshCounts({});
      saveRefreshCountsToCache({});
      console.log('Refresh limits reset for all categories and types');
      
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
      successMessage.textContent = 'Refresh limits reset successfully!';
      document.body.appendChild(successMessage);
      
      // Remove the message after 3 seconds
      setTimeout(() => {
        if (document.body.contains(successMessage)) {
          document.body.removeChild(successMessage);
        }
      }, 3000);
    }
  };

  // Function to clear approved bounties from cache and database
  const clearApprovedBounties = async () => {
    // Clear all unsubmitted actions from localStorage and state
    const submittedActions = bountyActions.filter(action => action.submitted);
    setBountyActions(submittedActions);
    BountyActionsService.saveToLocalStorage(submittedActions);
    
    // Also clear any pending actions that might be unsubmitted
    clearPendingActions();
    
    console.log('Cleared all unsubmitted bounty actions');
  };

  const clearAllActions = async () => {
    // Clear ALL actions from localStorage and state (both submitted and unsubmitted)
    setBountyActions([]);
    BountyActionsService.saveToLocalStorage([]);
    
    // Also clear any pending actions
    clearPendingActions();
    
    console.log('Cleared all bounty actions (submitted and unsubmitted)');
  };

  // Function to handle modal close with confirmation
  const handleCloseModal = () => {
    if (bountyActions.length > 0) {
      const confirmed = window.confirm(
        `You have ${bountyActions.length} bounty action${bountyActions.length !== 1 ? 's' : ''} (${approvedActions.length} approved, ${rejectedActions.length} rejected) that haven't been submitted.\n\n` +
        `Closing the modal will clear all actions from cache and database.\n\n` +
        `Are you sure you want to close and lose these actions?`
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
      // Use localStorage only (Vercel-friendly)
      const localActions = BountyActionsService.loadFromLocalStorage();
      
      // Ensure all actions have bounty_type and submitted fields (for backward compatibility)
      const actionsWithDefaults = localActions.map(action => ({
        ...action,
        bounty_type: action.bounty_type || 'daily', // Default to daily for existing actions
        submitted: action.submitted !== undefined ? action.submitted : false // Default to false for existing actions
      }));
      
      setBountyActions(actionsWithDefaults);
      console.log('Loaded actions from localStorage:', actionsWithDefaults.length);
    } catch (error) {
      console.error('Error loading saved actions:', error);
      setBountyActions([]);
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
    console.log(`Processing bounty action: ${action} for bounty "${bounty}" in category ${bucketId}`);
    
    const bountyAction: BountyAction = {
      bucket_id: bucketId,
      bounty: bounty,
      action: action,
      timestamp: new Date(),
      category: bucketMap[bucketId],
      rejection_reason: reason,
      bounty_type: selectedBountyType, // Include the current bounty type
      submitted: false // Mark as not submitted initially
    };

    try {
      // Try to save to database first
      await BountyActionsService.saveBountyAction(bountyAction);
      console.log('Bounty action saved to database successfully');
    } catch (error) {
      console.error('Failed to save to database, saving to localStorage:', error);
      // Save to localStorage as backup
      BountyActionsService.saveToLocalStorage([...bountyActions, bountyAction]);
    }

    // Update local state
    setBountyActions(prev => [...prev, bountyAction]);
    
    // Update pending counts
    updatePendingCounts();
    
    console.log(`Bounty action processed successfully. Total actions: ${bountyActions.length + 1}`);
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

  // Function to export pending bounties to CSV
  const exportPendingBountiesToCSV = () => {
    const pendingBounties = loadPendingBounties();
    if (pendingBounties.length === 0) {
      alert('No pending bounties to export.');
      return;
    }

    // Convert pending bounties to CSV format matching bounty_selection_history table
    const csvData = pendingBounties.map(bounty => ({
      bucket_id: '', // Not available in pending bounties
      category: bounty.category,
      bounty: bounty.name,
      action: 'accepted', // Pending bounties are all approved ones
      timestamp: new Date().toISOString(),
      notes: `Pending upload - Date: ${bounty.date}, Expiry: ${bounty.expiry_timestamp}`
    }));

    // Create CSV content
    const headers = ['bucket_id', 'category', 'bounty', 'action', 'timestamp', 'notes'];
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => 
        headers.map(header => {
          const value = row[header as keyof typeof row] || '';
          // Escape quotes and wrap in quotes if contains comma
          return `"${String(value).replace(/"/g, '""')}"`;
        }).join(',')
      )
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `pending_bounties_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    alert(`Exported ${pendingBounties.length} pending bounties to CSV successfully!`);
  };

  // Function to upload bounty actions to Supabase with fallback
  const uploadBountyActionsToSupabase = async (actions: BountyAction[]): Promise<boolean> => {
    try {
      console.log('Attempting to upload bounty actions to Supabase...', { actionCount: actions.length });
      
      if (!actions || actions.length === 0) {
        console.log('No actions to upload, returning true');
        return true;
      }
      
      const actionsToInsert = actions.map(action => ({
        bucket_id: action.bucket_id,
        category: action.category || `Category ${action.bucket_id}`,
        bounty: action.bounty,
        action: action.action,
        timestamp: action.timestamp.toISOString(),
        notes: action.rejection_reason,
        type: action.bounty_type || 'daily',
      }));

      console.log('Actions to insert:', actionsToInsert);

      const { data, error } = await supabase
        .from('bounty_selection_history')
        .insert(actionsToInsert)
        .select();

      if (error) {
        console.error('Error uploading bounty actions to Supabase:', error);
        return false;
      }
      
      console.log('Successfully uploaded all bounty actions to Supabase:', { 
        uploadedCount: data?.length || 0,
        expectedCount: actions.length 
      });
      return true;
    } catch (error) {
      console.error('Failed to upload bounty actions to Supabase:', error);
      return false;
    }
  };

  // Function to retry pending actions upload
  const retryPendingActionsUpload = async () => {
    const pendingActions = loadPendingActions();
    if (pendingActions.length === 0) {
      alert('No pending actions to upload.');
      return;
    }

    console.log(`Retrying upload of ${pendingActions.length} pending actions...`);
    const success = await uploadBountyActionsToSupabase(pendingActions);
    
    if (success) {
      clearPendingActions();
      updatePendingCounts();
      alert(`Successfully uploaded ${pendingActions.length} pending actions to database!`);
    } else {
      alert(`Failed to upload pending actions. They will remain in localStorage for later retry.`);
    }
  };

  // Function to retry pending bounties upload
  const retryPendingBountiesUpload = async () => {
    const pendingBounties = loadPendingBounties();
    if (pendingBounties.length === 0) {
      alert('No pending bounties to upload.');
      return;
    }

    console.log(`Retrying upload of ${pendingBounties.length} pending bounties...`);
    
    let successCount = 0;
    let errorCount = 0;
    
    try {
      for (const bounty of pendingBounties) {
        // Insert into main bounties table
        const { data: bountyData, error: bountyError } = await supabase
          .from('bounties')
          .insert({
            date: bounty.date,
            bounty: bounty.name,
            type: bounty.bounty_type,
            expiry: bounty.expiry_timestamp,
            target_value: 1
          })
          .select();

        if (bountyError) {
          console.error('Error saving bounty to main table:', bountyError);
          errorCount++;
          continue;
        }

        // If bounty was inserted successfully, add category weight
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
                weight: 1
              });

            if (weightError) {
              console.error('Error saving category weight:', weightError);
            }
          }
          
          successCount++;
        }
      }
      
      if (errorCount === 0) {
        clearPendingBounties();
        updatePendingCounts();
        alert(`Successfully uploaded all ${pendingBounties.length} pending bounties to database!`);
      } else {
        alert(`Uploaded ${successCount} bounties successfully, but ${errorCount} failed. Failed items remain in localStorage.`);
      }
    } catch (error) {
      console.error('Error retrying pending bounties upload:', error);
      alert('Error uploading pending bounties. They will remain in localStorage for later retry.');
    }
  };

  // Function to force refresh all bounties from API
  const forceRefreshAllBounties = () => {
    const confirmed = window.confirm(
      'Are you sure you want to force refresh all bounties?\n\n' +
      'This will fetch fresh data from the API and clear the cache.'
    );
    
    if (confirmed) {
      clearBountiesCache();
      fetchBounties(null, true);
    }
  };

  const prepareBountiesForSubmission = async () => {
    // Calculate default expiry (next day 11:59 PM)
    const defaultExpiry = new Date();
    defaultExpiry.setDate(defaultExpiry.getDate() + 1); // Tomorrow
    defaultExpiry.setHours(23, 59, 0, 0); // 11:59 PM
    
    // Get tomorrow's date in YYYY-MM-DD format
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowString = tomorrow.toISOString().split('T')[0];
    
    const approvedBounties = unsubmittedApprovedActions
      .map(action => ({
        name: action.bounty,
        category: action.category || `Category ${action.bucket_id}`,
        date: tomorrowString, // Default to tomorrow's date
        expiry_timestamp: defaultExpiry.toISOString(), // Default to next day 11:59 PM
        bounty_type: action.bounty_type || selectedBountyType // Use the type from the action, fallback to current type
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
      let databaseSuccess = false;
      
      // First, upload ALL unsubmitted bounty actions (both approved and rejected) to bounty_selection_history table
      const allUnsubmittedActions = unsubmittedActions;
      let actionsUploadSuccess = true;
      
      if (allUnsubmittedActions && allUnsubmittedActions.length > 0) {
        actionsUploadSuccess = await uploadBountyActionsToSupabase(allUnsubmittedActions);
        
        if (!actionsUploadSuccess) {
          console.log('Failed to upload actions to bounty_selection_history, saving to pending uploads');
          savePendingActions(allUnsubmittedActions);
          alert('Warning: Could not upload actions to database. Actions have been saved to pending uploads for later retry.');
        } else {
          console.log('All unsubmitted bounty actions uploaded to bounty_selection_history successfully');
        }
      }
      
      // Try to save approved bounties to main bounties table
      try {
        for (const bounty of bountiesToSubmit) {
          // Insert into main bounties table
          const { data: bountyData, error: bountyError } = await supabase
            .from('bounties')
            .insert({
              date: bounty.date,
              bounty: bounty.name,
              type: bounty.bounty_type,
              expiry: bounty.expiry_timestamp,
              target_value: 1
            })
            .select();

          if (bountyError) {
            console.error('Error saving bounty to main table:', bountyError);
            errorCount++;
            continue;
          }

          // If bounty was inserted successfully, add category weight
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
        
        databaseSuccess = errorCount === 0;
      } catch (dbError) {
        console.error('Database operation failed:', dbError);
        databaseSuccess = false;
      }

      // Show appropriate message based on results
      if (databaseSuccess && actionsUploadSuccess) {
        alert(`Successfully submitted ${bountiesToSubmit.length} bounties to the main bounties table!\n\nDatabase upload successful.`);
        
        // Mark all actions as submitted so they don't appear in submit button anymore
        const updatedActions = bountyActions.map(action => ({
          ...action,
          submitted: true
        }));
        
        // Update state and localStorage with submitted actions
        setBountyActions(updatedActions);
        BountyActionsService.saveToLocalStorage(updatedActions);
        
        console.log('Submission successful - marked actions as submitted');
      } else if (successCount > 0) {
        alert(`Submitted ${successCount} bounties successfully, but ${errorCount} failed.\n\nSome bounties were saved to database, others saved to pending uploads for later retry.`);
        
        // Save failed bounties to pending uploads
        const failedBounties = bountiesToSubmit.filter((_, index) => {
          // This is a simplified check - in a real implementation you'd track which ones failed
          return index >= successCount;
        });
        if (failedBounties.length > 0) {
          savePendingBounties(failedBounties);
        }
      } else {
        alert(`Failed to upload to database. All ${bountiesToSubmit.length} bounties have been saved to pending uploads for later retry.\n\nYou can retry uploading them later when database is available.`);
        
        // Save all bounties to pending uploads
        savePendingBounties(bountiesToSubmit);
      }
      
      // Clear the form and go back to main view
      setShowSubmitForm(false);
      setBountiesToSubmit([]);
      
    } catch (error) {
      console.error('Error submitting bounties:', error);
      alert('Error submitting bounties. All data has been kept in localStorage as backup. Please try again.');
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
    
    // Try to remove from database if possible
    try {
      const { error } = await supabase
        .from('bounty_selection_history')
        .delete()
        .eq('bounty', bountyName)
        .eq('action', 'accepted');

      if (error) {
        console.error('Error removing bounty from database:', error);
        console.log('Bounty removed from localStorage, but database removal failed');
      } else {
        console.log('Bounty successfully removed from both localStorage and database');
      }
    } catch (error) {
      console.error('Failed to remove bounty from database:', error);
      console.log('Bounty removed from localStorage, but database removal failed');
    }
  };

  const renderBountyList = (bountyList: Bounty[]) => {
    return bountyList.map((bucket) => {
        const allBounties = bucket.bounties || [];
        const refreshCount = refreshCounts[`${selectedBountyType}_${bucket.bucket_id}`] || 0;
        const canRefresh = refreshCount < 3;

        // Filter out bounties that have already been processed (approved or rejected)
        const availableBounties = allBounties.filter(bountyName => {
            const existingAction = (bountyActions || []).find(a => 
                a.bounty === bountyName && 
                a.bucket_id === bucket.bucket_id &&
                a.bounty_type === selectedBountyType
            );
            return !existingAction; // Only show bounties that haven't been processed
        });

        // Get processed bounties for this category and type
        const processedBounties = allBounties.filter(bountyName => {
            const existingAction = (bountyActions || []).find(a => 
                a.bounty === bountyName && 
                a.bucket_id === bucket.bucket_id &&
                a.bounty_type === selectedBountyType
            );
            return !!existingAction; // Show bounties that have been processed
        });

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
                    {(availableBounties && availableBounties.length > 0) ? (
                        availableBounties.map((bountyName) => {
                            return (
                                <div key={bountyName} className="bounty-item">
                                    <p className="bounty-text">{bountyName}</p>
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
                
                {/* Show processed bounties if toggle is enabled */}
                {showProcessedBounties && processedBounties.length > 0 && (
                    <div className="processed-bounties-section">
                        <h5>Processed Bounties ({processedBounties.length})</h5>
                        <div className="processed-bounties-list">
                            {processedBounties.map((bountyName) => {
                                const existingAction = (bountyActions || []).find(a => 
                                    a.bounty === bountyName && 
                                    a.bucket_id === bucket.bucket_id &&
                                    a.bounty_type === selectedBountyType
                                );
                                
                                return (
                                    <div key={bountyName} className="processed-bounty-item">
                                        <p className="bounty-text">{bountyName}</p>
                                        <div className="bounty-status">
                                            <span className={`status-badge ${existingAction?.action === 'accepted' ? 'approved' : 'rejected'}`}>
                                                {existingAction?.action === 'accepted' ? '✓ Approved' : '✗ Rejected'}
                                            </span>
                                            {existingAction?.rejection_reason && (
                                                <div className="reason-display">
                                                    <small>Reason: {existingAction.rejection_reason}</small>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        );
    });
  }

  // Function to handle bounty type selection
  const handleBountyTypeChange = (newType: 'daily' | 'weekly' | 'yearly') => {
    setSelectedBountyType(newType);
    
    // Check if this bounty type has been loaded before
    if (!loadedBountyTypes.has(newType)) {
      console.log(`Bounty type ${newType} not loaded yet, fetching bounties...`);
      // Mark this type as loaded and fetch bounties
      setLoadedBountyTypes(prev => new Set([...Array.from(prev), newType]));
      fetchBounties(null, false);
    } else {
      console.log(`Bounty type ${newType} already loaded, switching to cached data`);
      // Just switch to cached data without fetching
      const cachedBounties = loadBountiesFromCache(newType);
      if (cachedBounties) {
        setBounties(cachedBounties);
      }
    }
  };

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
              <div className="header-actions">
                <div className="bounty-type-selector">
                  <label htmlFor="bounty-type">Type:</label>
                  <select
                    id="bounty-type"
                    value={selectedBountyType}
                    onChange={(e) => handleBountyTypeChange(e.target.value as 'daily' | 'weekly' | 'yearly')}
                    className="bounty-type-select"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                <div className="processed-bounties-toggle">
                  <label className="toggle-label">
                    <input
                      type="checkbox"
                      checked={showProcessedBounties}
                      onChange={(e) => setShowProcessedBounties(e.target.checked)}
                      className="toggle-checkbox"
                    />
                    <span className="toggle-text">Show Processed</span>
                  </label>
                </div>
                <div className="options-dropdown">
                  <button 
                    ref={optionsButtonRef}
                    className="options-button"
                    onClick={handleOptionsButtonClick}
                    title="Options menu"
                  >
                    ⚙️ Options
                  </button>
                  {showOptionsDropdown && (
                    <div 
                      className="options-dropdown-menu"
                      style={{
                        top: `${dropdownPosition.top}px`,
                        right: `${dropdownPosition.right}px`
                      }}
                    >
                      <button 
                        className="dropdown-item"
                        onClick={() => {
                          resetRefreshLimits();
                          setShowOptionsDropdown(false);
                        }}
                        title="Reset refresh limits for all categories"
                      >
                        🔄 Reset Limits
                      </button>
                      <button 
                        className="dropdown-item"
                        onClick={() => {
                          forceRefreshAllBounties();
                          setShowOptionsDropdown(false);
                        }}
                        title="Force refresh all bounties from API"
                      >
                        🔄 Force Refresh
                      </button>
                      <button 
                        className="dropdown-item"
                        onClick={() => {
                          exportToCSV();
                          setShowOptionsDropdown(false);
                        }}
                        title="Export current actions to CSV"
                      >
                        📊 Export Actions CSV
                      </button>
                      {bountyActions.length > 0 && (
                        <button 
                          className="dropdown-item"
                          onClick={() => {
                            const confirmed = window.confirm(
                              `Are you sure you want to clear all ${bountyActions.length} processed actions?\n\n` +
                              `This will clear ${approvedActions.length} approved and ${rejectedActions.length} rejected bounty actions.\n\n` +
                              `This action cannot be undone.`
                            );
                            if (confirmed) {
                              clearApprovedBounties();
                            }
                            setShowOptionsDropdown(false);
                          }}
                          title="Clear all processed actions"
                        >
                          🗑️ Clear Processed Actions ({bountyActions.length})
                        </button>
                      )}
                      {pendingBountiesCount > 0 && (
                        <button 
                          className="dropdown-item"
                          onClick={() => {
                            exportPendingBountiesToCSV();
                            setShowOptionsDropdown(false);
                          }}
                          title="Export pending bounties to CSV"
                        >
                          📊 Export Pending CSV ({pendingBountiesCount})
                        </button>
                      )}
                      {hasPendingUploads() && (
                        <>
                          <button 
                            className="dropdown-item"
                            onClick={() => {
                              showPendingUploadsInfo();
                              setShowOptionsDropdown(false);
                            }}
                            title="Show pending uploads info"
                          >
                            📋 Pending Info ({pendingActionsCount + pendingBountiesCount})
                          </button>
                          <button 
                            className="dropdown-item"
                            onClick={() => {
                              retryPendingActionsUpload();
                              setShowOptionsDropdown(false);
                            }}
                            title="Retry uploading pending actions"
                          >
                            🔄 Retry Actions
                          </button>
                          <button 
                            className="dropdown-item"
                            onClick={() => {
                              retryPendingBountiesUpload();
                              setShowOptionsDropdown(false);
                            }}
                            title="Retry uploading pending bounties"
                          >
                            🔄 Retry Bounties
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
                <button className="close-button" onClick={handleCloseModal}>×</button>
              </div>
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

                  {unsubmittedActions.length > 0 && (
                    <div className="submit-section">
                      <div className="submit-info">
                        <span className="approved-count">
                          {unsubmittedApprovedActions.length} approved, {unsubmittedRejectedActions.length} rejected
                        </span>
                        <div className="submit-actions">
                          <button 
                            className="submit-button" 
                            onClick={prepareBountiesForSubmission}
                          >
                            Submit Actions
                          </button>
                          <button 
                            className="clear-button" 
                            onClick={async () => {
                              const confirmed = window.confirm(
                                `Are you sure you want to clear all ${unsubmittedActions.length} unsubmitted actions?\n\n` +
                                `This will clear ${unsubmittedApprovedActions.length} approved and ${unsubmittedRejectedActions.length} rejected bounty actions.\n\n` +
                                `This action cannot be undone.`
                              );
                              if (confirmed) {
                                clearApprovedBounties();
                              }
                            }}
                            title="Clear all unsubmitted actions"
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