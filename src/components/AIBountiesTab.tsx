import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AIBountiesService, AIBounty, BountyToBeSubmitted, SubmitBountyData } from '../services/aiBountiesService';
import { AIBountyGenerator } from '../utils/aiBountyGenerator';
import './AIBountiesTab.css';

interface BountyCounts {
  pending: number;
  accepted: number;
  rejected: number;
  finalized: number;
}

interface CategoryBounties {
  [categoryId: number]: {
    [type: string]: AIBounty[];
  };
}

const AIBountiesTab: React.FC = () => {
  const [bounties, setBounties] = useState<AIBounty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'pending' | 'accepted' | 'rejected'>('pending');
  const [bountyCounts, setBountyCounts] = useState<BountyCounts>({ pending: 0, accepted: 0, rejected: 0, finalized: 0 });
  const [generating, setGenerating] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());
  const [rejectionModal, setRejectionModal] = useState<{
    isOpen: boolean;
    bounty: AIBounty | null;
    notes: string;
  }>({
    isOpen: false,
    bounty: null,
    notes: ''
  });
  const [approvalModal, setApprovalModal] = useState<{
    isOpen: boolean;
    bounty: AIBounty | null;
    date: string;
    notes: string;
  }>({
    isOpen: false,
    bounty: null,
    date: '',
    notes: ''
  });
  const [submissionModal, setSubmissionModal] = useState<{
    isOpen: boolean;
    date: string;
    expiry: string;
    lifespan: number;
    bountiesToSubmit: BountyToBeSubmitted[];
    loading: boolean;
  }>({
    isOpen: false,
    date: '',
    expiry: '',
    lifespan: 24,
    bountiesToSubmit: [],
    loading: false
  });

  // Add ref to track if generation is already in progress
  const isGeneratingRef = useRef(false);

  // Fetch bounties and counts
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [bountiesData, countsData] = await Promise.all([
        AIBountiesService.getAllBounties(),
        AIBountiesService.getBountyCounts()
      ]);

      setBounties(bountiesData);
      setBountyCounts(countsData);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load bounties. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Set default dates when approval modal opens
  useEffect(() => {
    if (approvalModal.isOpen) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowDate = tomorrow.toISOString().split('T')[0];

      setApprovalModal(prev => ({
        ...prev,
        date: tomorrowDate
      }));
    }
  }, [approvalModal.isOpen]);

  // Set default dates when submission modal opens
  useEffect(() => {
    if (submissionModal.isOpen) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowDate = tomorrow.toISOString().split('T')[0];
      
      // Set expiry to 24 hours from tomorrow
      const defaultExpiry = new Date(tomorrow);
      defaultExpiry.setHours(defaultExpiry.getHours() + 24);
      const defaultExpiryDate = defaultExpiry.toISOString().slice(0, 16); // Format for datetime-local input

      setSubmissionModal(prev => ({
        ...prev,
        date: tomorrowDate,
        expiry: defaultExpiryDate,
        lifespan: 24
      }));
    }
  }, [submissionModal.isOpen]);

  // Filter bounties based on selected status
  const filteredBounties = selectedStatus === 'all' 
    ? bounties 
    : bounties.filter(bounty => bounty.action === selectedStatus);

  // Group bounties by category and type
  const categoryBounties: CategoryBounties = {};
  filteredBounties.forEach(bounty => {
    if (!categoryBounties[bounty.bucket_id]) {
      categoryBounties[bounty.bucket_id] = { daily: [], weekly: [], yearly: [] };
    }
    if (categoryBounties[bounty.bucket_id][bounty.type]) {
      categoryBounties[bounty.bucket_id][bounty.type].push(bounty);
    }
  });

  // Get available categories
  const availableCategories = AIBountyGenerator.getAvailableCategories();

  // Handle approve bounty
  const handleApprove = async (bounty: AIBounty) => {
    setApprovalModal({
      isOpen: true,
      bounty,
      date: '',
      notes: ''
    });
  };

  // Handle approval confirmation
  const handleApprovalConfirm = async () => {
    if (!approvalModal.bounty) return;

    try {
      await AIBountiesService.approveBounty(
        approvalModal.bounty.id, 
        approvalModal.date, 
        approvalModal.notes
      );
      setApprovalModal({ isOpen: false, bounty: null, date: '', notes: '' });
      await fetchData(); // Refresh data
    } catch (err) {
      console.error('Error approving bounty:', err);
      setError('Failed to approve bounty. Please try again.');
    }
  };

  // Handle approval cancel
  const handleApprovalCancel = () => {
    setApprovalModal({ isOpen: false, bounty: null, date: '', notes: '' });
  };

  // Handle reject bounty
  const handleReject = async (bounty: AIBounty) => {
    setRejectionModal({
      isOpen: true,
      bounty,
      notes: ''
    });
  };

  // Handle rejection confirmation
  const handleRejectionConfirm = async () => {
    if (!rejectionModal.bounty) return;

    try {
      await AIBountiesService.rejectBounty(rejectionModal.bounty.id, rejectionModal.notes);
      setRejectionModal({ isOpen: false, bounty: null, notes: '' });
      await fetchData(); // Refresh data
    } catch (err) {
      console.error('Error rejecting bounty:', err);
      setError('Failed to reject bounty. Please try again.');
    }
  };

  // Handle rejection cancel
  const handleRejectionCancel = () => {
    setRejectionModal({ isOpen: false, bounty: null, notes: '' });
  };

  // Handle open submission modal
  const handleOpenSubmission = async () => {
    setSubmissionModal(prev => ({ ...prev, isOpen: true, loading: true }));
    
    try {
      // Get tomorrow's date as default
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowDate = tomorrow.toISOString().split('T')[0];
      
      // Get bounties to be submitted for tomorrow
      const bountiesToSubmit = await AIBountiesService.getBountiesToBeSubmitted(tomorrowDate);
      
      setSubmissionModal(prev => ({
        ...prev,
        date: tomorrowDate,
        bountiesToSubmit,
        loading: false
      }));
    } catch (err) {
      console.error('Error getting bounties to submit:', err);
      setError('Failed to get bounties to submit. Please try again.');
      setSubmissionModal(prev => ({ ...prev, isOpen: false, loading: false }));
    }
  };

  // Handle date change in submission modal
  const handleSubmissionDateChange = async (newDate: string) => {
    setSubmissionModal(prev => ({ ...prev, loading: true }));
    
    try {
      const bountiesToSubmit = await AIBountiesService.getBountiesToBeSubmitted(newDate);
      
      // Calculate new expiry based on the new date (24 hours from the new date)
      const newDateObj = new Date(newDate);
      newDateObj.setHours(newDateObj.getHours() + 24);
      const newExpiryDate = newDateObj.toISOString().slice(0, 16); // Format for datetime-local input
      
      setSubmissionModal(prev => ({
        ...prev,
        date: newDate,
        expiry: newExpiryDate,
        bountiesToSubmit,
        loading: false
      }));
    } catch (err) {
      console.error('Error getting bounties for date:', err);
      setError('Failed to get bounties for selected date. Please try again.');
      setSubmissionModal(prev => ({ ...prev, loading: false }));
    }
  };

  // Handle submission confirmation
  const handleSubmissionConfirm = async () => {
    if (submissionModal.bountiesToSubmit.length === 0) {
      setError('No bounties to submit for the selected date.');
      return;
    }

    try {
      setSubmissionModal(prev => ({ ...prev, loading: true }));
      setError(null);

      const submitData: SubmitBountyData = {
        date: submissionModal.date,
        expiry: submissionModal.expiry,
        lifespan: submissionModal.lifespan
      };

      // Submit bounties to main table
      const { successCount, errorCount } = await AIBountiesService.submitBountiesToMainTable(
        submissionModal.bountiesToSubmit, 
        submitData
      );
      
      if (successCount > 0) {
        setSubmissionModal(prev => ({ ...prev, isOpen: false, loading: false }));
        alert(`Successfully submitted ${successCount} bounties to the main table!${errorCount > 0 ? ` ${errorCount} bounties failed.` : ''}`);
      } else {
        setError('No bounties were submitted successfully.');
      }
    } catch (err) {
      console.error('Error submitting bounties:', err);
      setError('Failed to submit bounties. Please try again.');
    } finally {
      setSubmissionModal(prev => ({ ...prev, loading: false }));
    }
  };

  // Handle submission cancel
  const handleSubmissionCancel = () => {
    setSubmissionModal(prev => ({ ...prev, isOpen: false, loading: false }));
  };

  // Handle cleanup old pending bounties
  const handleCleanup = async () => {
    try {
      await AIBountiesService.cleanupOldPendingBounties();
      await fetchData(); // Refresh data
      alert('Old pending bounties cleaned up successfully!');
    } catch (err) {
      console.error('Error cleaning up old bounties:', err);
      setError('Failed to cleanup old bounties. Please try again.');
    }
  };

  // Handle generate all bounties
  const handleGenerateAllBounties = async () => {
    try {
      if (isGeneratingRef.current) {
        console.log('Generation already in progress, ignoring click');
        setError('Generation already in progress. Please wait for it to complete.');
        return;
      }
      
      isGeneratingRef.current = true;
      setGenerating(true);
      setError(null);

      // Generate bounties for all categories
      await AIBountyGenerator.generateAllCategoriesBounties('daily', 2);
      
      // Refresh data to show new bounties
      await fetchData();
      
      alert('New bounties generated successfully!');
    } catch (err) {
      console.error('Error generating bounties:', err);
      setError('Failed to generate new bounties. Please try again.');
    } finally {
      setGenerating(false);
      isGeneratingRef.current = false;
    }
  };

  // Handle generate bounties for specific category and type
  const handleGenerateCategoryBounties = async (categoryId: number, type: 'daily' | 'weekly' | 'yearly') => {
    try {
      if (isGeneratingRef.current) {
        console.log('Generation already in progress, ignoring click');
        setError('Generation already in progress. Please wait for it to complete.');
        return;
      }
      
      isGeneratingRef.current = true;
      setGenerating(true);
      setError(null);

      await AIBountyGenerator.generateCategoryBounties(categoryId, type, 3);
      
      // Refresh data to show new bounties
      await fetchData();
      
      const categoryName = AIBountyGenerator.getCategoryName(categoryId);
      alert(`New ${type} bounties generated for ${categoryName}!`);
    } catch (err) {
      console.error('Error generating category bounties:', err);
      setError('Failed to generate new bounties. Please try again.');
    } finally {
      setGenerating(false);
      isGeneratingRef.current = false;
    }
  };

  // Toggle category expansion
  const toggleCategory = (categoryId: number) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  // Toggle type expansion
  const toggleType = (typeKey: string) => {
    const newExpanded = new Set(expandedTypes);
    if (newExpanded.has(typeKey)) {
      newExpanded.delete(typeKey);
    } else {
      newExpanded.add(typeKey);
    }
    setExpandedTypes(newExpanded);
  };

  // Get status badge class
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'pending': return 'status-pending';
      case 'accepted': return 'status-approved';
      case 'rejected': return 'status-rejected';
      case 'finalized': return 'status-finalized';
      default: return 'status-pending';
    }
  };

  // Get status display text
  const getStatusDisplayText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pending Review';
      case 'accepted': return 'Approved';
      case 'rejected': return 'Rejected';
      case 'finalized': return 'Finalized';
      default: return status;
    }
  };

  // Get bounty count for category and type
  const getBountyCount = (categoryId: number, type: string) => {
    return categoryBounties[categoryId]?.[type]?.length || 0;
  };

  if (loading) {
    return <div className="ai-bounties-loading">Loading AI Bounties...</div>;
  }

  return (
    <div className="ai-bounties-tab">
      <div className="ai-bounties-header">
        <h2>AI Bounties Management</h2>
        <div className="ai-bounties-actions">
          <button 
            className="generate-button"
            onClick={handleGenerateAllBounties}
            disabled={generating}
          >
            {generating ? 'Generating...' : 'Generate All Categories'}
          </button>
          <button 
            className="submit-button"
            onClick={handleOpenSubmission}
            disabled={submissionModal.loading}
          >
            {submissionModal.loading ? 'Loading...' : 'Submit Bounties'}
          </button>
          <button 
            className="cleanup-button"
            onClick={handleCleanup}
            disabled={bountyCounts.pending === 0}
          >
            Cleanup Old Pending
          </button>
        </div>
      </div>

      {error && (
        <div className="ai-bounties-error">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      <div className="ai-bounties-stats">
        <div className="stat-card">
          <span className="stat-number">{bountyCounts.pending}</span>
          <span className="stat-label">Pending</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{bountyCounts.accepted}</span>
          <span className="stat-label">Accepted</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{bountyCounts.rejected}</span>
          <span className="stat-label">Rejected</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{bountyCounts.finalized}</span>
          <span className="stat-label">Finalized</span>
        </div>
      </div>

      <div className="ai-bounties-filters">
        <select 
          value={selectedStatus} 
          onChange={(e) => setSelectedStatus(e.target.value as any)}
          className="status-filter"
          aria-label="Filter bounties by status"
        >
          <option value="all">All Statuses ({bounties.length})</option>
          <option value="pending">Pending ({bountyCounts.pending})</option>
          <option value="accepted">Accepted ({bountyCounts.accepted})</option>
          <option value="rejected">Rejected ({bountyCounts.rejected})</option>
        </select>
      </div>

      <div className="ai-bounties-categories">
        {availableCategories.map(category => {
          const categoryId = category.id;
          const categoryBountiesData = categoryBounties[categoryId];
          const isExpanded = expandedCategories.has(categoryId);
          
          // Calculate total bounties for this category
          const totalBounties = categoryBountiesData 
            ? Object.values(categoryBountiesData).reduce((sum, bounties) => sum + bounties.length, 0)
            : 0;

          return (
            <div key={categoryId} className="category-section">
              <div 
                className="category-header"
                onClick={() => toggleCategory(categoryId)}
              >
                <div className="category-info">
                  <h3 className="category-name">{category.name}</h3>
                  <span className="category-count">({totalBounties} bounties)</span>
                </div>
                <div className="category-actions">
                  <button 
                    className="generate-category-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleGenerateCategoryBounties(categoryId, 'daily');
                    }}
                    disabled={generating}
                    title="Generate Daily Bounties"
                  >
                    Daily
                  </button>
                  <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>
                    ▼
                  </span>
                </div>
              </div>

              {isExpanded && categoryBountiesData && (
                <div className="category-content">
                  {(['daily', 'weekly', 'yearly'] as const).map(type => {
                    const typeBounties = categoryBountiesData[type] || [];
                    const typeKey = `${categoryId}-${type}`;
                    const isTypeExpanded = expandedTypes.has(typeKey);
                    
                    return (
                      <div key={type} className="type-section">
                        <div 
                          className="type-header"
                          onClick={() => toggleType(typeKey)}
                        >
                          <h4 className="type-name">{type.charAt(0).toUpperCase() + type.slice(1)}</h4>
                          <span className="type-count">({typeBounties.length} bounties)</span>
                          <span className={`expand-icon ${isTypeExpanded ? 'expanded' : ''}`}>
                            ▼
                          </span>
                        </div>

                        {isTypeExpanded && (
                          <div className="type-content">
                            {typeBounties.length === 0 ? (
                              <div className="no-bounties-type">
                                <p>No {type} bounties found for this category.</p>
                                <p>Click the "Daily" button above to generate new bounties.</p>
                              </div>
                            ) : (
                              typeBounties.map((bounty) => (
                                <div key={bounty.id} className={`bounty-card ${bounty.action}`}>
                                  <div className="bounty-header">
                                    <div className={`bounty-status ${getStatusBadgeClass(bounty.action)}`}>
                                      {getStatusDisplayText(bounty.action)}
                                    </div>
                                  </div>
                                  
                                  <div className="bounty-content">
                                    <div className="bounty-text">{bounty.bounty}</div>
                                    <div className="bounty-meta">
                                      <span className="bounty-date">
                                        {new Date(bounty.created_at).toLocaleDateString()}
                                      </span>
                                    </div>
                                    {bounty.notes && (
                                      <div className="bounty-notes">
                                        <strong>Notes:</strong> {bounty.notes}
                                      </div>
                                    )}
                                  </div>

                                  {bounty.action === 'pending' && (
                                    <div className="bounty-actions">
                                      <button 
                                        className="approve-button"
                                        onClick={() => handleApprove(bounty)}
                                      >
                                        Approve
                                      </button>
                                      <button 
                                        className="reject-button"
                                        onClick={() => handleReject(bounty)}
                                      >
                                        Reject
                                      </button>
                                    </div>
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredBounties.length === 0 && (
        <div className="no-bounties">
          {selectedStatus === 'all' 
            ? 'No bounties found. Click "Generate All Categories" to create some!' 
            : `No ${selectedStatus} bounties found.`
          }
        </div>
      )}

      {/* Show message for empty categories */}
      {availableCategories.length > 0 && Object.keys(categoryBounties).length === 0 && (
        <div className="no-bounties">
          <p>No bounties found for the selected status.</p>
          <p>Click "Generate All Categories" to create new bounties, or use the "Daily" buttons on individual categories.</p>
        </div>
      )}

      {/* Rejection Modal */}
      {rejectionModal.isOpen && (
        <div className="rejection-modal-overlay">
          <div className="rejection-modal">
            <h3>Reject Bounty</h3>
            <div className="rejection-content">
              <p><strong>Bounty:</strong> {rejectionModal.bounty?.bounty}</p>
              <p><strong>Category:</strong> {rejectionModal.bounty?.category}</p>
              <div className="rejection-notes">
                <label htmlFor="rejection-notes">Rejection Reason (Optional):</label>
                <textarea
                  id="rejection-notes"
                  value={rejectionModal.notes}
                  onChange={(e) => setRejectionModal(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Enter reason for rejection..."
                  rows={3}
                />
              </div>
            </div>
            <div className="rejection-actions">
              <button 
                className="cancel-button"
                onClick={handleRejectionCancel}
              >
                Cancel
              </button>
              <button 
                className="confirm-reject-button"
                onClick={handleRejectionConfirm}
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approval Modal */}
      {approvalModal.isOpen && (
        <div className="rejection-modal-overlay">
          <div className="rejection-modal">
            <h3>Approve Bounty</h3>
            <div className="rejection-content">
              <p><strong>Bounty:</strong> {approvalModal.bounty?.bounty}</p>
              <p><strong>Category:</strong> {approvalModal.bounty?.category}</p>
              <div className="form-group">
                <label htmlFor="approval-date">Target Date:</label>
                <input
                  id="approval-date"
                  type="date"
                  value={approvalModal.date}
                  onChange={(e) => setApprovalModal(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>
              <div className="rejection-notes">
                <label htmlFor="approval-notes">Approval Notes (Optional):</label>
                <textarea
                  id="approval-notes"
                  value={approvalModal.notes}
                  onChange={(e) => setApprovalModal(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Enter approval notes..."
                  rows={3}
                />
              </div>
            </div>
            <div className="rejection-actions">
              <button 
                className="cancel-button"
                onClick={handleApprovalCancel}
              >
                Cancel
              </button>
              <button 
                className="confirm-approve-button"
                onClick={handleApprovalConfirm}
              >
                Confirm Approval
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submission Modal */}
      {submissionModal.isOpen && (
        <div className="rejection-modal-overlay">
          <div className="rejection-modal">
            <h3>Submit Bounties</h3>
            <div className="rejection-content">
              {submissionModal.loading ? (
                <p>Loading bounties to submit...</p>
              ) : (
                <>
                  <p>Configure the date and expiry for bounties to be submitted:</p>
                  <div className="form-group">
                    <label htmlFor="submission-date">Target Date:</label>
                    <input
                      id="submission-date"
                      type="date"
                      value={submissionModal.date}
                      onChange={(e) => handleSubmissionDateChange(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="submission-lifespan">Lifespan (hours):</label>
                    <input
                      id="submission-lifespan"
                      type="number"
                      min="1"
                      max="8760"
                      value={submissionModal.lifespan}
                      onChange={(e) => setSubmissionModal(prev => ({ ...prev, lifespan: parseInt(e.target.value) || 24 }))}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="submission-expiry">Expiry Date:</label>
                    <input
                      id="submission-expiry"
                      type="datetime-local"
                      value={submissionModal.expiry}
                      onChange={(e) => setSubmissionModal(prev => ({ ...prev, expiry: e.target.value }))}
                    />
                  </div>
                  
                  {submissionModal.bountiesToSubmit.length > 0 ? (
                    <div className="bounties-to-submit">
                      <h4>Bounties to Submit ({submissionModal.bountiesToSubmit.length}):</h4>
                      <div className="bounties-list">
                        {submissionModal.bountiesToSubmit.map((bounty, index) => (
                          <div key={index} className="bounty-item">
                            <span className="bounty-text">{bounty.bounty}</span>
                            <span className="bounty-category">({bounty.category})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="no-bounties-message">
                      No approved bounties found for the selected date that aren't already in the main table.
                    </p>
                  )}
                  
                  <p className="help-text">
                    <strong>Note:</strong> Only approved bounties that aren't already in the main table for the selected date will be shown. 
                    Lifespan defaults to 24 hours, and expiry is automatically set to 24 hours from the target date.
                  </p>
                </>
              )}
            </div>
            <div className="rejection-actions">
              <button 
                className="cancel-button"
                onClick={handleSubmissionCancel}
              >
                Cancel
              </button>
              <button 
                className="confirm-reject-button"
                onClick={handleSubmissionConfirm}
                disabled={submissionModal.loading || submissionModal.bountiesToSubmit.length === 0}
              >
                {submissionModal.loading ? 'Submitting...' : 'Submit Bounties'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIBountiesTab; 