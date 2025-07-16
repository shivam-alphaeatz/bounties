import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AIBountiesService, AIBounty } from '../services/aiBountiesService';
import { AIBountyGenerator } from '../utils/aiBountyGenerator';
import { PushNotificationService } from '../services/pushNotificationService';
import { supabase } from '../supabaseClient';
import './AIBountiesTab.css';

// Import categoryMap for proper category name mapping
const categoryMap: { [key: number]: string } = {
  1: 'Nourish',
  2: 'Rest',
  3: 'Active Life',
  4: 'Connect',
  5: 'Mindset',
  6: 'Explore'
};

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

interface AIBountiesTabProps {
  onNavigateToAcceptedBounties: () => void;
}

interface BountyToSubmit {
  id: string;
  bounty: string;
  category: string;
  bucket_id: number;
  date: string;
  expiry_timestamp: string;
  type: string;
}

const AIBountiesTab: React.FC<AIBountiesTabProps> = ({ onNavigateToAcceptedBounties }) => {
  const [bounties, setBounties] = useState<AIBounty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'pending' | 'accepted' | 'rejected'>('pending');
  const [bountyCounts, setBountyCounts] = useState<BountyCounts>({ pending: 0, accepted: 0, rejected: 0, finalized: 0 });
  const [generating, setGenerating] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());
  const [pendingCounts, setPendingCounts] = useState({ total: 0, old: 0, recent: 0 });
  const [todayApprovedCount, setTodayApprovedCount] = useState<number>(0);
  const [showCleanupDropdown, setShowCleanupDropdown] = useState(false);
  const [submitDate, setSubmitDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [rejectionModal, setRejectionModal] = useState<{
    isOpen: boolean;
    bounty: AIBounty | null;
    notes: string;
    rating: number | null;
  }>({
    isOpen: false,
    bounty: null,
    notes: '',
    rating: null
  });
  const [approvalModal, setApprovalModal] = useState<{
    isOpen: boolean;
    bounty: AIBounty | null;
    date: string;
    notes: string;
    rating: number | null;
  }>({
    isOpen: false,
    bounty: null,
    date: '',
    notes: '',
    rating: null
  });

  // Submit modal state
  const [submitModal, setSubmitModal] = useState<{
    isOpen: boolean;
    bountiesToSubmit: BountyToSubmit[];
    selectedDate: string;
  }>({
    isOpen: false,
    bountiesToSubmit: [],
    selectedDate: new Date().toISOString().split('T')[0]
  });

  // Add ref to track if generation is already in progress
  const isGeneratingRef = useRef(false);

  // Fetch bounties and counts
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [bountiesData, countsData, pendingCountsData, todayApprovedData] = await Promise.all([
        AIBountiesService.getAllBounties(),
        AIBountiesService.getBountyCounts(),
        AIBountiesService.getPendingBountyCounts(),
        AIBountiesService.getTodayApprovedCount()
      ]);

      setBounties(bountiesData);
      setBountyCounts(countsData);
      setPendingCounts(pendingCountsData);
      setTodayApprovedCount(todayApprovedData);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load bounties. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load data on mount
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle clicking outside cleanup dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showCleanupDropdown && !target.closest('.cleanup-dropdown')) {
        setShowCleanupDropdown(false);
      }
    };

    if (showCleanupDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCleanupDropdown]);

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
      notes: '',
      rating: null
    });
  };

  // Handle approval confirmation
  const handleApprovalConfirm = async () => {
    if (!approvalModal.bounty) return;

    try {
      await AIBountiesService.approveBounty(
        approvalModal.bounty.id, 
        approvalModal.date, 
        approvalModal.notes,
        approvalModal.rating as number | undefined
      );
      setApprovalModal({ isOpen: false, bounty: null, date: '', notes: '', rating: null });
      await fetchData(); // Refresh data
      setError(null); // Clear any previous errors
      alert(`Bounty approved successfully! Use the "Submit Approved" button to add it to the main bounties table.`);
    } catch (err) {
      console.error('Error approving bounty:', err);
      setError('Failed to approve bounty. Please try again.');
    }
  };

  // Handle approval cancel
  const handleApprovalCancel = () => {
    setApprovalModal({ isOpen: false, bounty: null, date: '', notes: '', rating: null });
  };

  // Handle reject bounty
  const handleReject = async (bounty: AIBounty) => {
    setRejectionModal({
      isOpen: true,
      bounty,
      notes: '',
      rating: null
    });
  };

  // Handle rejection confirmation
  const handleRejectionConfirm = async () => {
    if (!rejectionModal.bounty) return;

    try {
      await AIBountiesService.rejectBounty(
        rejectionModal.bounty.id, 
        rejectionModal.notes,
        rejectionModal.rating as number | undefined
      );
      setRejectionModal({ isOpen: false, bounty: null, notes: '', rating: null });
      await fetchData(); // Refresh data
      setError(null); // Clear any previous errors
    } catch (err) {
      console.error('Error rejecting bounty:', err);
      setError('Failed to reject bounty. Please try again.');
    }
  };

  // Handle rejection cancel
  const handleRejectionCancel = () => {
    setRejectionModal({ isOpen: false, bounty: null, notes: '', rating: null });
  };

  // Handle cleanup
  const handleCleanup = async () => {
    try {
      await AIBountiesService.cleanupOldPendingBounties();
      await fetchData(); // Refresh data
      setError(null); // Clear any previous errors
      alert('Successfully cleaned up old pending bounties!');
    } catch (err) {
      console.error('Error cleaning up old pending bounties:', err);
      setError('Failed to cleanup old pending bounties. Please try again.');
    }
  };

  // Handle cleanup all
  const handleCleanupAll = async () => {
    const confirmed = window.confirm(
      `Are you sure you want to remove ALL ${pendingCounts.total} pending bounties?\n\n` +
      `This will remove ${pendingCounts.old} old pending bounties and ${pendingCounts.recent} recent pending bounties.\n\n` +
      `This action cannot be undone.`
    );
    
    if (!confirmed) return;

    try {
      await AIBountiesService.cleanupAllPendingBounties();
      await fetchData(); // Refresh data
      setError(null); // Clear any previous errors
      alert('Successfully cleaned up all pending bounties!');
    } catch (err) {
      console.error('Error cleaning up all pending bounties:', err);
      setError('Failed to cleanup all pending bounties. Please try again.');
    }
  };

  // Handle generate all bounties
  const handleGenerateAllBounties = async () => {
    if (isGeneratingRef.current) {
      console.log('Generation already in progress, skipping...');
      return;
    }

    try {
      isGeneratingRef.current = true;
      setGenerating(true);
      setError(null);

      const result = await AIBountyGenerator.generateAllCategoriesBounties('daily', 2);
      
      await fetchData(); // Refresh data
      setError(null); // Clear any previous errors
      
      alert(`Successfully generated ${result.inserted} new bounties!${result.duplicates > 0 ? ` ${result.duplicates} duplicates were filtered out.` : ''}`);
    } catch (err) {
      console.error('Error generating bounties:', err);
      setError('Failed to generate bounties. Please try again.');
    } finally {
      setGenerating(false);
      isGeneratingRef.current = false;
    }
  };

  // Handle generate category bounties
  const handleGenerateCategoryBounties = async (categoryId: number, type: 'daily' | 'weekly' | 'yearly') => {
    if (isGeneratingRef.current) {
      console.log('Generation already in progress, skipping...');
      return;
    }

    try {
      isGeneratingRef.current = true;
      setGenerating(true);
      setError(null);

      const categoryName = AIBountyGenerator.getCategoryName(categoryId);
      const result = await AIBountyGenerator.generateCategoryBounties(categoryId, type, 3);
      
      await fetchData(); // Refresh data
      setError(null); // Clear any previous errors
      
      alert(`Successfully generated ${result.inserted} new ${type} bounties for ${categoryName}!${result.duplicates > 0 ? ` ${result.duplicates} duplicates were filtered out.` : ''}`);
    } catch (err) {
      console.error('Error generating category bounties:', err);
      setError('Failed to generate category bounties. Please try again.');
    } finally {
      setGenerating(false);
      isGeneratingRef.current = false;
    }
  };

  // Toggle category expansion
  const toggleCategory = (categoryId: number) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  // Toggle type expansion
  const toggleType = (typeKey: string) => {
    setExpandedTypes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(typeKey)) {
        newSet.delete(typeKey);
      } else {
        newSet.add(typeKey);
      }
      return newSet;
    });
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
      case 'pending': return 'Pending';
      case 'accepted': return 'Approved';
      case 'rejected': return 'Rejected';
      case 'finalized': return 'Finalized';
      default: return 'Pending';
    }
  };

  // Handle submit approved bounties - open modal
  const handleSubmitApprovedBounties = () => {
    // Get all approved bounties
    const approvedBounties = bounties.filter(bounty => bounty.action === 'accepted');
    
    if (approvedBounties.length === 0) {
      alert('No approved bounties to submit.');
      return;
    }

    // Use the selected submit date instead of today's date
    const selectedDateString = submitDate;

    // Calculate default expiry (24 hours after the target date at 11:59 PM)
    const targetDate = new Date(selectedDateString);
    const defaultExpiry = new Date(targetDate);
    defaultExpiry.setDate(targetDate.getDate() + 1);
    defaultExpiry.setHours(23, 59, 0, 0);

    // Filter bounties for the selected date
    const selectedDateBounties = approvedBounties.filter(bounty => bounty.date === selectedDateString);

    // Prepare bounties for submission
    const bountiesToSubmit: BountyToSubmit[] = selectedDateBounties.map(bounty => ({
      id: bounty.id,
      bounty: bounty.bounty,
      category: bounty.category,
      bucket_id: bounty.bucket_id,
      date: selectedDateString,
      expiry_timestamp: defaultExpiry.toISOString(),
      type: bounty.type
    }));

    setSubmitModal({
      isOpen: true,
      bountiesToSubmit,
      selectedDate: selectedDateString
    });
  };

  // Handle date change in submit modal
  const handleSubmitModalDateChange = (newDate: string) => {
    // Filter bounties for the selected date
    const approvedBounties = bounties.filter(bounty => 
      bounty.action === 'accepted' && 
      bounty.date === newDate
    );
    
    if (approvedBounties.length === 0) {
      // No bounties for this date, clear the list
      setSubmitModal(prev => ({
        ...prev,
        selectedDate: newDate,
        bountiesToSubmit: []
      }));
      return;
    }

    // Calculate default expiry (24 hours after the target date at 11:59 PM)
    const targetDate = new Date(newDate);
    const defaultExpiry = new Date(targetDate);
    defaultExpiry.setDate(targetDate.getDate() + 1);
    defaultExpiry.setHours(23, 59, 0, 0);

    // Prepare bounties for submission for the selected date
    const bountiesToSubmit: BountyToSubmit[] = approvedBounties.map(bounty => ({
      id: bounty.id,
      bounty: bounty.bounty,
      category: bounty.category,
      bucket_id: bounty.bucket_id,
      date: newDate,
      expiry_timestamp: defaultExpiry.toISOString(),
      type: bounty.type
    }));

    setSubmitModal(prev => ({
      ...prev,
      selectedDate: newDate,
      bountiesToSubmit
    }));
  };

  // Handle actual submission from modal
  const handleSubmitFromModal = async () => {
    try {
      setError(null);
      
      let successCount = 0;
      let errorCount = 0;

      for (const bountyToSubmit of submitModal.bountiesToSubmit) {
        try {
          // Submit to main table
          const { data: mainBountyData, error: insertError } = await supabase
            .from('bounties')
            .insert({
              date: bountyToSubmit.date,
              bounty: bountyToSubmit.bounty,
              type: bountyToSubmit.type,
              target_value: 1,
              lifespan: 24,
              expiry: bountyToSubmit.expiry_timestamp
            })
            .select();

          if (insertError) {
            console.error('Error inserting bounty to main table:', insertError);
            errorCount++;
            continue;
          }

          // Add category weight if bounty was inserted successfully
          if (mainBountyData && mainBountyData.length > 0) {
            const mainBountyId = mainBountyData[0].id;
            
            // Find the original bounty to get bucket_id
            const originalBounty = bounties.find(b => b.id === bountyToSubmit.id);
            
            if (originalBounty) {
              const { error: weightError } = await supabase
                .from('bountyBucketWeight')
                .insert({
                  bountyId: mainBountyId,
                  bucketId: originalBounty.bucket_id,
                  weight: 1
                });

              if (weightError) {
                console.error('Error saving category weight:', weightError);
              }
            }
            
            successCount++;
          }
        } catch (bountyError) {
          console.error('Error processing bounty:', bountyError);
          errorCount++;
        }
      }

      // Update status to finalized for successfully submitted bounties
      if (successCount > 0) {
        const successfulBounties = submitModal.bountiesToSubmit.slice(0, successCount);
        for (const bounty of successfulBounties) {
          await supabase
            .from('bounty_selection_history')
            .update({ action: 'finalized' })
            .eq('id', bounty.id);
        }
      }

      // Close modal and refresh data
      setSubmitModal({ isOpen: false, bountiesToSubmit: [], selectedDate: new Date().toISOString().split('T')[0] });
      await fetchData();
      
      if (successCount > 0) {
        // Send push notification for successful submission
        await PushNotificationService.sendBountySubmissionNotification();
        alert(`Successfully submitted ${successCount} bounties to main table!${errorCount > 0 ? ` ${errorCount} bounties failed.` : ''}`);
      } else {
        setError('Failed to submit any bounties. Please try again.');
      }
    } catch (err) {
      console.error('Error submitting bounties:', err);
      setError('Failed to submit bounties. Please try again.');
    }
  };

  // Update bounty in submit modal
  const updateBountyInSubmitModal = (index: number, field: keyof BountyToSubmit, value: string) => {
    setSubmitModal(prev => ({
      ...prev,
      bountiesToSubmit: prev.bountiesToSubmit.map((bounty, i) => 
        i === index ? { ...bounty, [field]: value } : bounty
      )
    }));
  };

  // Remove bounty from submit modal and revert to pending status
  const removeBountyFromSubmitModal = async (index: number) => {
    const bountyToRemove = submitModal.bountiesToSubmit[index];
    
    if (!bountyToRemove) return;

    try {
      // Update the bounty status back to pending in the database
      const { error } = await supabase
        .from('bounty_selection_history')
        .update({ 
          action: 'pending',
          date: null, // Clear the date since it's no longer approved
          notes: null, // Clear approval notes
          rating: null // Clear approval rating
        })
        .eq('id', bountyToRemove.id);

      if (error) {
        console.error('Error reverting bounty to pending:', error);
        setError('Failed to remove bounty. Please try again.');
        return;
      }

      // Remove from modal display
      setSubmitModal(prev => ({
        ...prev,
        bountiesToSubmit: prev.bountiesToSubmit.filter((_, i) => i !== index)
      }));

      // Refresh data to update the UI
      await fetchData();
      
      console.log(`Bounty "${bountyToRemove.bounty}" has been moved back to pending status.`);
    } catch (err) {
      console.error('Error removing bounty:', err);
      setError('Failed to remove bounty. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="ai-bounties-tab">
        <div className="ai-bounties-loading">
          Loading AI bounties...
        </div>
      </div>
    );
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
          <div className="submit-section">
            <div className="submit-date-selector">
              <label htmlFor="submit-date">Date for Submission:</label>
              <input
                id="submit-date"
                type="date"
                value={submitDate}
                onChange={(e) => setSubmitDate(e.target.value)}
                title="Select the date for approved bounties to submit"
              />
            </div>
            <button 
              className="submit-button"
              onClick={handleSubmitApprovedBounties}
            >
              📤 Submit Approved
            </button>
          </div>
          <div className="cleanup-dropdown">
            <button 
              className="cleanup-dropdown-button"
              onClick={() => setShowCleanupDropdown(!showCleanupDropdown)}
              disabled={bountyCounts.pending === 0}
            >
              🧹 Cleanup ({pendingCounts.total})
            </button>
            {showCleanupDropdown && (
              <div className="cleanup-dropdown-menu">
                <button 
                  className="dropdown-item"
                  onClick={() => {
                    handleCleanup();
                    setShowCleanupDropdown(false);
                  }}
                  title="Remove pending bounties older than 24 hours"
                >
                  🕐 Cleanup Old ({pendingCounts.old})
                </button>
                <button 
                  className="dropdown-item"
                  onClick={() => {
                    handleCleanupAll();
                    setShowCleanupDropdown(false);
                  }}
                  title="Remove all pending bounties"
                >
                  🗑️ Cleanup All ({pendingCounts.total})
                </button>
              </div>
            )}
          </div>
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
                                    {bounty.rating !== null && bounty.rating !== undefined && (
                                      <div className="bounty-rating">
                                        <strong>Rating:</strong> {bounty.rating}/10
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
              <p><strong>Category:</strong> {rejectionModal.bounty ? categoryMap[rejectionModal.bounty.bucket_id] || 'Unknown Category' : ''}</p>
              <div className="form-group">
                <label htmlFor="rejection-rating">Rating (0-10):</label>
                <div className="slider-container">
                  <div className="slider-value">
                    {rejectionModal.rating !== null && rejectionModal.rating !== undefined ? `Rating: ${rejectionModal.rating}/10` : 'No rating'}
                  </div>
                  <input
                    id="rejection-rating"
                    type="range"
                    min="0"
                    max="10"
                    value={rejectionModal.rating === null || rejectionModal.rating === undefined ? 5 : rejectionModal.rating}
                    onChange={e => setRejectionModal(prev => ({ ...prev, rating: e.target.value ? parseInt(e.target.value) : null }))}
                    className="rating-slider"
                  />
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={rejectionModal.rating === null || rejectionModal.rating === undefined ? '' : rejectionModal.rating}
                    onChange={e => {
                      const value = e.target.value;
                      setRejectionModal(prev => ({ 
                        ...prev, 
                        rating: value === '' ? null : (parseInt(value) >= 0 && parseInt(value) <= 10 ? parseInt(value) : prev.rating)
                      }));
                    }}
                    className="rating-number-input"
                    placeholder="0-10"
                  />
                  <button
                    type="button"
                    className="clear-rating-btn"
                    onClick={() => setRejectionModal(prev => ({ ...prev, rating: null }))}
                  >
                    Clear
                  </button>
                </div>
              </div>
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
              <p><strong>Category:</strong> {approvalModal.bounty ? categoryMap[approvalModal.bounty.bucket_id] || 'Unknown Category' : ''}</p>
              <div className="form-group">
                <label htmlFor="approval-date">Target Date:</label>
                <input
                  id="approval-date"
                  type="date"
                  value={approvalModal.date}
                  onChange={(e) => setApprovalModal(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label htmlFor="approval-rating">Rating (0-10):</label>
                <div className="slider-container">
                  <div className="slider-value">
                    {approvalModal.rating !== null && approvalModal.rating !== undefined ? `Rating: ${approvalModal.rating}/10` : 'No rating'}
                  </div>
                  <input
                    id="approval-rating"
                    type="range"
                    min="0"
                    max="10"
                    value={approvalModal.rating === null || approvalModal.rating === undefined ? 5 : approvalModal.rating}
                    onChange={e => setApprovalModal(prev => ({ ...prev, rating: e.target.value ? parseInt(e.target.value) : null }))}
                    className="rating-slider"
                  />
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={approvalModal.rating === null || approvalModal.rating === undefined ? '' : approvalModal.rating}
                    onChange={e => {
                      const value = e.target.value;
                      setApprovalModal(prev => ({ 
                        ...prev, 
                        rating: value === '' ? null : (parseInt(value) >= 0 && parseInt(value) <= 10 ? parseInt(value) : prev.rating)
                      }));
                    }}
                    className="rating-number-input"
                    placeholder="0-10"
                  />
                  <button
                    type="button"
                    className="clear-rating-btn"
                    onClick={() => setApprovalModal(prev => ({ ...prev, rating: null }))}
                  >
                    Clear
                  </button>
                </div>
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

      {/* Submit Modal */}
      {submitModal.isOpen && (
        <div className="rejection-modal-overlay">
          <div className="rejection-modal" style={{ maxWidth: '800px', width: '95%' }}>
            <h3>Submit Approved Bounties to Main Table</h3>
            <div className="rejection-content">
              <div className="submit-modal-date-selector">
                <label htmlFor="submit-modal-date">Select Date for Approved Bounties:</label>
                <input
                  id="submit-modal-date"
                  type="date"
                  value={submitModal.selectedDate}
                  onChange={(e) => handleSubmitModalDateChange(e.target.value)}
                  title="Select the date for approved bounties"
                />
              </div>
              
              <p>Review and adjust the settings for each approved bounty before submitting:</p>
              
              <div className="bounties-to-submit">
                {submitModal.bountiesToSubmit.map((bounty, index) => (
                  <div key={index} className="bounty-submit-item">
                    <div className="bounty-submit-header">
                      <h4>{bounty.bounty}</h4>
                      <span className="category-badge">{categoryMap[bounty.bucket_id] || 'Unknown Category'}</span>
                      <button 
                        className="remove-bounty-button"
                        onClick={async () => await removeBountyFromSubmitModal(index)}
                        title="Remove this bounty from submission"
                      >
                        ✕ Remove
                      </button>
                    </div>
                    <div className="bounty-submit-settings">
                      <div className="setting-group">
                        <label htmlFor={`date-${index}`}>Date:</label>
                        <input
                          id={`date-${index}`}
                          type="date"
                          value={bounty.date}
                          onChange={(e) => updateBountyInSubmitModal(index, 'date', e.target.value)}
                          title="Set the date for this bounty"
                        />
                      </div>
                      <div className="setting-group">
                        <label htmlFor={`expiry-${index}`}>Expiry:</label>
                        <input
                          id={`expiry-${index}`}
                          type="datetime-local"
                          value={bounty.expiry_timestamp.slice(0, 16)} // Format for datetime-local input
                          onChange={(e) => {
                            const newTimestamp = new Date(e.target.value).toISOString();
                            updateBountyInSubmitModal(index, 'expiry_timestamp', newTimestamp);
                          }}
                          title="Set the expiry date and time"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {submitModal.bountiesToSubmit.length === 0 && (
                <div className="no-bounties-message">
                  <p>No approved bounties found for the selected date ({submitModal.selectedDate}).</p>
                  <p>Try selecting a different date or approve some bounties first.</p>
                </div>
              )}
            </div>
            <div className="rejection-actions">
              <button 
                className="cancel-button"
                onClick={() => setSubmitModal({ isOpen: false, bountiesToSubmit: [], selectedDate: new Date().toISOString().split('T')[0] })}
              >
                Cancel
              </button>
              <button 
                className="confirm-approve-button"
                onClick={handleSubmitFromModal}
                disabled={submitModal.bountiesToSubmit.length === 0}
              >
                Submit {submitModal.bountiesToSubmit.length} Bounties
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIBountiesTab; 