import React, { useState, useEffect, useCallback } from 'react';
import { AIBountiesService, BountyToBeSubmitted, SubmitBountyData } from '../services/aiBountiesService';
import './AcceptedBountiesTab.css';

const AcceptedBountiesTab: React.FC = () => {
  const [acceptedBounties, setAcceptedBounties] = useState<BountyToBeSubmitted[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
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

  // Set default date to tomorrow
  useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDate = tomorrow.toISOString().split('T')[0];
    setSelectedDate(tomorrowDate);
  }, []);

  // Fetch accepted bounties for the selected date
  const fetchAcceptedBounties = useCallback(async (date: string) => {
    if (!date) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const bounties = await AIBountiesService.getBountiesToBeSubmitted(date);
      setAcceptedBounties(bounties);
    } catch (err) {
      console.error('Error fetching accepted bounties:', err);
      setError('Failed to load accepted bounties. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load bounties when date changes
  useEffect(() => {
    if (selectedDate) {
      fetchAcceptedBounties(selectedDate);
    }
  }, [selectedDate, fetchAcceptedBounties]);

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

  // Handle date change
  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
  };

  // Handle opening submission modal
  const handleOpenSubmission = async () => {
    if (acceptedBounties.length === 0) {
      setError('No accepted bounties found for the selected date.');
      return;
    }

    setSubmissionModal(prev => ({
      ...prev,
      isOpen: true,
      bountiesToSubmit: acceptedBounties
    }));
  };

  // Handle submission date change
  const handleSubmissionDateChange = async (newDate: string) => {
    if (!newDate) return;

    try {
      setSubmissionModal(prev => ({ ...prev, loading: true }));
      const bounties = await AIBountiesService.getBountiesToBeSubmitted(newDate);
      
      setSubmissionModal(prev => ({
        ...prev,
        date: newDate,
        bountiesToSubmit: bounties,
        loading: false
      }));
    } catch (err) {
      console.error('Error fetching bounties for new date:', err);
      setError('Failed to fetch bounties for the selected date.');
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
        await fetchAcceptedBounties(selectedDate); // Refresh data to show updated state
        setError(null); // Clear any previous errors
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

  // Handle edit bounty (placeholder function)
  const handleEditBounty = (bounty: BountyToBeSubmitted) => {
    console.log('Edit bounty:', bounty);
    // TODO: Implement edit functionality
    alert(`Edit functionality for bounty: "${bounty.bounty}" will be implemented later.`);
  };

  // Handle add info to bounty (placeholder function)
  const handleAddInfo = (bounty: BountyToBeSubmitted) => {
    console.log('Add info to bounty:', bounty);
    // TODO: Implement add info functionality
    alert(`Add info functionality for bounty: "${bounty.bounty}" will be implemented later.`);
  };

  // Group bounties by category
  const groupBountiesByCategory = (bounties: BountyToBeSubmitted[]) => {
    const grouped: { [category: string]: BountyToBeSubmitted[] } = {};
    
    bounties.forEach(bounty => {
      if (!grouped[bounty.category]) {
        grouped[bounty.category] = [];
      }
      grouped[bounty.category].push(bounty);
    });
    
    return grouped;
  };

  const groupedBounties = groupBountiesByCategory(acceptedBounties);

  if (loading) {
    return (
      <div className="accepted-bounties-container">
        <div className="accepted-bounties-loading">
          Loading accepted bounties...
        </div>
      </div>
    );
  }

  return (
    <div className="accepted-bounties-container">
      <div className="accepted-bounties-header">
        <h2>Accepted Bounties</h2>
        <p className="header-description">
          Manage accepted bounties that haven't been submitted to the main bounties table yet.
        </p>
      </div>

      {error && (
        <div className="accepted-bounties-error">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      <div className="date-selection">
        <label htmlFor="date-selector">Select Date:</label>
        <input
          id="date-selector"
          type="date"
          value={selectedDate}
          onChange={(e) => handleDateChange(e.target.value)}
          className="date-input"
        />
      </div>

      <div className="bounties-summary">
        <div className="summary-card">
          <span className="summary-number">{acceptedBounties.length}</span>
          <span className="summary-label">Accepted Bounties</span>
        </div>
        <div className="summary-card">
          <span className="summary-number">{Object.keys(groupedBounties).length}</span>
          <span className="summary-label">Categories</span>
        </div>
      </div>

      {acceptedBounties.length === 0 ? (
        <div className="no-bounties">
          <p>No accepted bounties found for the selected date.</p>
          <p>Try selecting a different date or check the AI Bounties tab to approve some bounties first.</p>
        </div>
      ) : (
        <>
          <div className="bounties-display">
            {Object.entries(groupedBounties).map(([category, bounties]) => (
              <div key={category} className="category-section">
                <h3 className="category-title">{category}</h3>
                <div className="bounties-list">
                  {bounties.map((bounty, index) => (
                    <div key={index} className="bounty-item">
                      <div className="bounty-content">
                        <p className="bounty-text">{bounty.bounty}</p>
                        <div className="bounty-meta">
                          <span className="bounty-type">{bounty.type}</span>
                          <span className="bounty-date">
                            Created: {new Date(bounty.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="bounty-actions">
                        <button 
                          className="edit-button"
                          onClick={() => handleEditBounty(bounty)}
                          title="Edit this bounty"
                        >
                          ✏️ Edit
                        </button>
                        <button 
                          className="add-button"
                          onClick={() => handleAddInfo(bounty)}
                          title="Add additional information"
                        >
                          ➕ Add
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="submit-section">
            <button 
              className="submit-button"
              onClick={handleOpenSubmission}
              disabled={acceptedBounties.length === 0}
            >
              Submit {acceptedBounties.length} Bounties to Main Table
            </button>
          </div>
        </>
      )}

      {/* Submission Modal */}
      {submissionModal.isOpen && (
        <div className="submission-modal-overlay">
          <div className="submission-modal">
            <h3>Submit Bounties to Main Table</h3>
            <div className="submission-content">
              {submissionModal.loading ? (
                <div className="loading-message">Loading bounties for selected date...</div>
              ) : (
                <>
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
                    <label htmlFor="submission-expiry">Expiry Date/Time:</label>
                    <input
                      id="submission-expiry"
                      type="datetime-local"
                      value={submissionModal.expiry}
                      onChange={(e) => setSubmissionModal(prev => ({ ...prev, expiry: e.target.value }))}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="submission-lifespan">Lifespan (hours):</label>
                    <input
                      id="submission-lifespan"
                      type="number"
                      min="1"
                      max="720"
                      value={submissionModal.lifespan}
                      onChange={(e) => setSubmissionModal(prev => ({ ...prev, lifespan: parseInt(e.target.value) || 24 }))}
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
                      No accepted bounties found for the selected date that aren't already in the main table.
                    </p>
                  )}
                  
                  <p className="help-text">
                    <strong>Note:</strong> Only accepted bounties that aren't already in the main table for the selected date will be shown. 
                    Lifespan defaults to 24 hours, and expiry is automatically set to 24 hours from the target date.
                  </p>
                </>
              )}
            </div>
            <div className="submission-actions">
              <button 
                className="cancel-button"
                onClick={handleSubmissionCancel}
              >
                Cancel
              </button>
              <button 
                className="confirm-submit-button"
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

export default AcceptedBountiesTab; 