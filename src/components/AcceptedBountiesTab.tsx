import React, { useState, useEffect, useCallback } from "react";
import {
  AIBountiesService,
  BountyToBeSubmitted,
} from "../services/aiBountiesService";
import {
  AttributesService,
  BountyAttribute,
} from "../services/attributesService";
import { BountyImageService } from "../services/bountyImageService";
import { BountyHintsService, BountyHint } from "../services/bountyHintsService";
import AttributesModal from "./AttributesModal";
import "./AcceptedBountiesTab.css";

interface BountyWithAttributes extends BountyToBeSubmitted {
  attributes?: BountyAttribute[];
  imageUrl?: string | null;
  hints?: BountyHint[];
}

const AcceptedBountiesTab: React.FC = () => {
  const [bounties, setBounties] = useState<BountyWithAttributes[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [attributesModalOpen, setAttributesModalOpen] = useState(false);
  const [selectedBounty, setSelectedBounty] =
    useState<BountyWithAttributes | null>(null);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");

  // Set default date to today
  useEffect(() => {
    const today = new Date();
    const todayDate = today.toISOString().split("T")[0];
    setSelectedDate(todayDate);
  }, []);

  // Fetch bounties for the selected date
  const fetchBounties = useCallback(async (date: string) => {
    if (!date) return;

    try {
      setLoading(true);
      setError(null);

      const bounties = await AIBountiesService.getBountiesByDate(date);

      // Fetch attributes, images, and hints for each bounty
      const bountiesWithAttributes = await Promise.all(
        bounties.map(async (bounty) => {
          try {
            const [attributes, imageUrl, hint] = await Promise.all([
              AttributesService.getBountyAttributes(bounty.id.toString()),
              BountyImageService.getBountyImage(bounty.id.toString()),
              BountyHintsService.getBountyHint(bounty.id.toString()),
            ]);
            return {
              ...bounty,
              attributes,
              imageUrl,
              hints: hint ? [hint] : [],
            };
          } catch (err) {
            console.error(`Error fetching data for bounty ${bounty.id}:`, err);
            return {
              ...bounty,
              attributes: [],
              imageUrl: null,
              hints: [],
            };
          }
        }),
      );

      setBounties(bountiesWithAttributes);
    } catch (err) {
      console.error("Error fetching bounties:", err);
      setError("Failed to load bounties. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Load bounties when date changes
  useEffect(() => {
    if (selectedDate) {
      fetchBounties(selectedDate);
    }
  }, [selectedDate, fetchBounties]);

  // Handle date change
  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
  };

  // Handle type change
  const handleTypeChange = (newType: string) => {
    setSelectedType(newType);
  };

  // Handle edit bounty - open attributes modal for editing existing attributes
  const handleEditBounty = (bounty: BountyWithAttributes) => {
    setSelectedBounty(bounty);
    setModalMode("edit");
    setAttributesModalOpen(true);
  };

  // Handle add to bounty - open attributes modal for adding new attributes
  const handleAddToBounty = (bounty: BountyWithAttributes) => {
    setSelectedBounty(bounty);
    setModalMode("add");
    setAttributesModalOpen(true);
  };

  // Handle attributes modal close
  const handleAttributesModalClose = () => {
    setAttributesModalOpen(false);
    setSelectedBounty(null);
  };

  // Handle attributes updated
  const handleAttributesUpdated = () => {
    // Refresh bounties data if needed
    if (selectedDate) {
      fetchBounties(selectedDate);
    }
  };

  // Filter bounties by type first, then group by category and sort by attributes
  const filteredBounties = bounties.filter((bounty) => {
    return selectedType === "all" || bounty.type === selectedType;
  });

  const groupBountiesByCategory = (bounties: BountyWithAttributes[]) => {
    const grouped: { [category: string]: BountyWithAttributes[] } = {};

    bounties.forEach((bounty) => {
      if (!grouped[bounty.category]) {
        grouped[bounty.category] = [];
      }
      grouped[bounty.category].push(bounty);
    });

    // Sort bounties within each category: bounties without attributes first
    Object.keys(grouped).forEach((category) => {
      grouped[category].sort((a, b) => {
        const aHasAttributes = a.attributes && a.attributes.length > 0;
        const bHasAttributes = b.attributes && b.attributes.length > 0;

        if (aHasAttributes && !bHasAttributes) return 1; // b comes first
        if (!aHasAttributes && bHasAttributes) return -1; // a comes first
        return 0; // keep original order
      });
    });

    return grouped;
  };

  const groupedBounties = groupBountiesByCategory(filteredBounties);

  if (loading) {
    return (
      <div className="bounties-management-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading bounties...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bounties-management-container">
      <div className="bounties-header">
        <div className="header-content">
          <h1>Bounties Management</h1>
          <p>View and manage bounties from the main table by date</p>
        </div>
        <div className="header-actions">
          <div className="filter-container">
            <div className="date-selector">
              <label htmlFor="date-selector">Select Date</label>
              <input
                type="date"
                id="date-selector"
                value={selectedDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="date-input"
              />
            </div>
            <div className="type-selector">
              <label htmlFor="type-selector">Filter by Type</label>
              <select
                id="type-selector"
                value={selectedType}
                onChange={(e) => handleTypeChange(e.target.value)}
                className="type-select"
              >
                <option value="all">All Types</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}

      <div className="bounties-stats">
        <div className="stat-card">
          <div className="stat-number">{bounties.length}</div>
          <div className="stat-label">Total Bounties</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{filteredBounties.length}</div>
          <div className="stat-label">Filtered Bounties</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">
            {Object.keys(groupedBounties).length}
          </div>
          <div className="stat-label">Categories</div>
        </div>
      </div>

      {bounties.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📅</div>
          <h3>No bounties found</h3>
          <p>
            No bounties found for the selected date. Try selecting a different
            date or add some bounties to the main table first.
          </p>
        </div>
      ) : filteredBounties.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <h3>No bounties found</h3>
          <p>
            No bounties found for the selected type "{selectedType}". Try
            selecting a different bounty type or "All Types".
          </p>
        </div>
      ) : (
        <div className="bounties-grid">
          {Object.entries(groupedBounties).map(([category, bounties]) => (
            <div key={category} className="category-card">
              <div className="category-header">
                <h3 className="category-title">{category}</h3>
                <span className="category-count">
                  {bounties.length} bounties
                </span>
              </div>
              <div className="bounties-list">
                {bounties.map((bounty, index) => {
                  const hasAttributes =
                    bounty.attributes && bounty.attributes.length > 0;
                  const hasImage =
                    bounty.imageUrl && bounty.imageUrl.trim() !== "";
                  const hasHints = bounty.hints && bounty.hints.length > 0;

                  return (
                    <div key={index} className="bounty-card">
                      <div className="bounty-content">
                        <h4 className="bounty-title">{bounty.bounty}</h4>
                        <div className="bounty-meta">
                          <span className="bounty-type">{bounty.type}</span>
                          <span className="bounty-date">
                            {new Date(bounty.created_at).toLocaleDateString()}
                          </span>
                          {hasAttributes && (
                            <span className="attributes-indicator">
                              📊 {bounty.attributes!.length} attribute
                              {bounty.attributes!.length !== 1 ? "s" : ""}
                            </span>
                          )}
                          {hasImage && (
                            <span className="image-indicator">🖼️ Image</span>
                          )}
                          {hasHints && (
                            <span className="hints-indicator">
                              💡 {bounty.hints!.length} hint
                              {bounty.hints!.length !== 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="bounty-actions">
                        {hasAttributes || hasImage || hasHints ? (
                          <button
                            className="action-button edit-button"
                            onClick={() => handleEditBounty(bounty)}
                            title="Edit bounty attributes, image, and hints"
                          >
                            <span className="button-icon">✏️</span>
                            Edit
                          </button>
                        ) : (
                          <button
                            className="action-button add-button"
                            onClick={() => handleAddToBounty(bounty)}
                            title="Add attributes, image, and hints to bounty"
                          >
                            <span className="button-icon">➕</span>
                            Add
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Attributes Modal */}
      {selectedBounty && (
        <AttributesModal
          isOpen={attributesModalOpen}
          onClose={handleAttributesModalClose}
          bountyId={selectedBounty.id.toString()}
          bountyName={selectedBounty.bounty}
          bucketId={selectedBounty.bucket_id}
          mode={modalMode}
          onAttributesUpdated={handleAttributesUpdated}
        />
      )}
    </div>
  );
};

export default AcceptedBountiesTab;
