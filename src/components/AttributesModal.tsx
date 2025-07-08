import React, { useState, useEffect } from 'react';
import { AttributesService, Attribute, BountyAttribute } from '../services/attributesService';
import './AttributesModal.css';

interface AttributesModalProps {
  isOpen: boolean;
  onClose: () => void;
  bountyId: string;
  bountyName: string;
  bucketId: number;
  mode: 'add' | 'edit';
  onAttributesUpdated: () => void;
}

const AttributesModal: React.FC<AttributesModalProps> = ({
  isOpen,
  onClose,
  bountyId,
  bountyName,
  bucketId,
  mode,
  onAttributesUpdated
}) => {
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [bountyAttributes, setBountyAttributes] = useState<BountyAttribute[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAttribute, setEditingAttribute] = useState<BountyAttribute | null>(null);
  const [generatingAttributes, setGeneratingAttributes] = useState(false);
  const [formData, setFormData] = useState({
    attributeId: '',
    type: '',
    value: 1
  });

  // Get available attributes (not already assigned to this bounty)
  const availableAttributes = attributes.filter(attr => 
    !bountyAttributes.some(bountyAttr => bountyAttr.attribute_id === attr.id)
  );

  // Get assigned attributes
  const assignedAttributes = attributes.filter(attr => 
    bountyAttributes.some(bountyAttr => bountyAttr.attribute_id === attr.id)
  );

  // Get min and max values based on type
  const getValueConstraints = (type: string) => {
    if (type.toLowerCase() === 'plus') {
      return { min: 1, max: 3 };
    } else if (type.toLowerCase() === 'minus') {
      return { min: -3, max: -1 };
    }
    return { min: -3, max: 3 }; // Default range: -3 to 3 (excluding 0)
  };

  const valueConstraints = getValueConstraints(formData.type);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, bountyId]);

  // Reset form state when modal opens
  useEffect(() => {
    if (isOpen) {
      setShowAddForm(false);
      setEditingAttribute(null);
    }
  }, [isOpen]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Loading data for bountyId:', bountyId, 'type:', typeof bountyId);

      const [attributesData, bountyAttributesData] = await Promise.all([
        AttributesService.getAttributesByBucket(bucketId),
        AttributesService.getBountyAttributes(bountyId)
      ]);

      setAttributes(attributesData);
      setBountyAttributes(bountyAttributesData);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load attributes data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAttribute = () => {
    setEditingAttribute(null);
    setFormData({
      attributeId: '',
      type: '',
      value: 1
    });
    setShowAddForm(true);
  };

  const handleEditAttribute = (attribute: BountyAttribute) => {
    const constraints = getValueConstraints(attribute.type);
    let value = attribute.value;
    
    // Ensure value is within constraints
    if (value < constraints.min) {
      value = constraints.min;
    } else if (value > constraints.max) {
      value = constraints.max;
    }
    
    // Prevent 0 for default range (when type is not plus or minus)
    if (!['plus', 'minus'].includes(attribute.type.toLowerCase()) && value === 0) {
      value = 1; // Default to 1 if value is 0 in default range
    }
    
    setEditingAttribute(attribute);
    setFormData({
      attributeId: attribute.attribute_id,
      type: attribute.type,
      value: value
    });
    setShowAddForm(true);
  };

  const handleDeleteAttribute = async (attribute: BountyAttribute) => {
    if (!window.confirm('Are you sure you want to delete this attribute?')) {
      return;
    }

    try {
      setLoading(true);
      await AttributesService.deleteBountyAttribute(attribute.bounty_id, attribute.attribute_id);
      await loadData();
      onAttributesUpdated();
    } catch (err) {
      console.error('Error deleting attribute:', err);
      setError('Failed to delete attribute');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAttributes = async () => {
    try {
      setGeneratingAttributes(true);
      setError(null);

      const response = await fetch('https://nwfhqrmdjmjopbxulyhu.supabase.co/functions/v1/attributeGEN', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53Zmhxcm1kam1qb3BieHVseWh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYyNjc5MDMsImV4cCI6MjA2MTg0MzkwM30.NvbyIKp7BxALfO0SBpdFcbCXXhPcOJ_4YJY8HPyVlzs',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          bucket_id: bucketId,
          bounty_id: bountyId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Attributes generated successfully:', result);

      // Reload data to show the newly generated attributes
      await loadData();
      onAttributesUpdated();
      
      // Show success message
      alert('Attributes generated successfully!');
    } catch (err) {
      console.error('Error generating attributes:', err);
      setError('Failed to generate attributes. Please try again.');
    } finally {
      setGeneratingAttributes(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);

      if (editingAttribute) {
        // Update existing attribute
        await AttributesService.updateBountyAttribute(
          editingAttribute.bounty_id,
          editingAttribute.attribute_id,
          formData.type,
          formData.value
        );
      } else {
        // Add new attribute
        await AttributesService.addBountyAttribute(
          bountyId,
          formData.attributeId,
          formData.type,
          formData.value
        );
      }

      await loadData();
      onAttributesUpdated();
      setShowAddForm(false);
      setEditingAttribute(null);
    } catch (err) {
      console.error('Error saving attribute:', err);
      setError('Failed to save attribute');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setEditingAttribute(null);
    setFormData({
      attributeId: '',
      type: '',
      value: 1
    });
  };

  if (!isOpen) return null;

  return (
    <div className="attributes-modal-overlay">
      <div className="attributes-modal">
        <div className={`attributes-modal-header ${mode}-mode`}>
          <h2>{mode === 'add' ? 'Add Attributes' : 'Edit Attributes'}</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="attributes-modal-content">
          <div className="bounty-info">
            <h3>{bountyName}</h3>
            <p>Bounty ID: {bountyId}</p>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {loading && (
            <div className="loading-message">
              Loading...
            </div>
          )}

          {!showAddForm && (
            <div className="attributes-section">
              <div className="section-header">
                <h3>{mode === 'add' ? 'Add New Attributes' : 'Current Attributes'}</h3>
                <button 
                  className="add-button"
                  onClick={handleAddAttribute}
                  disabled={loading}
                >
                  + Add Attribute
                </button>
              </div>

              {bountyAttributes.length === 0 ? (
                <div className="no-attributes">
                  <p>{mode === 'add' ? 'Ready to add attributes to this bounty.' : 'No attributes assigned to this bounty yet.'}</p>
                  {mode === 'add' && (
                    <div className="add-options">
                      <button 
                        className="generate-button"
                        onClick={handleGenerateAttributes}
                        disabled={generatingAttributes || loading}
                      >
                        {generatingAttributes ? 'Generating...' : '🎲 Generate Attributes'}
                      </button>
                      <div className="or-divider">or</div>
                      <button 
                        className="add-first-button"
                        onClick={handleAddAttribute}
                        disabled={loading}
                      >
                        Add Manually
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="attributes-list">
                  {bountyAttributes.map((attr) => (
                    <div key={`${attr.bounty_id}-${attr.attribute_id}`} className="attribute-item">
                      <div className="attribute-info">
                        <span className="attribute-name">
                          {attr.attribute?.key || 'Unknown'}
                        </span>
                        <span className="attribute-type">{attr.type}</span>
                        <span className="attribute-value">{attr.value}</span>
                      </div>
                      <div className="attribute-actions">
                        <button
                          className="edit-button"
                          onClick={() => handleEditAttribute(attr)}
                          disabled={loading}
                        >
                          Edit
                        </button>
                        <button
                          className="delete-button"
                          onClick={() => handleDeleteAttribute(attr)}
                          disabled={loading}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {showAddForm && (
            <div className="add-attribute-form">
              <h3>{editingAttribute ? 'Edit Attribute' : (mode === 'add' ? 'Add New Attribute' : 'Add Attribute')}</h3>
              
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="attributeId">Select Attribute:</label>
                  {availableAttributes.length === 0 ? (
                    <div className="no-attributes-available">
                      <p>All attributes for this bucket are already assigned to this bounty.</p>
                    </div>
                  ) : (
                    <div className="attribute-selection">
                      {availableAttributes.map((attr) => (
                        <div 
                          key={attr.id} 
                          className={`attribute-option ${formData.attributeId === attr.id ? 'selected' : ''}`}
                          onClick={() => setFormData({ ...formData, attributeId: attr.id })}
                        >
                          <div className="attribute-option-header">
                            <span className="attribute-key">{attr.key}</span>
                            {formData.attributeId === attr.id && (
                              <span className="selected-indicator">✓</span>
                            )}
                          </div>
                          {attr.description && (
                            <p className="attribute-description">{attr.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {assignedAttributes.length > 0 && (
                  <div className="form-group">
                    <label>Already Assigned Attributes:</label>
                    <div className="assigned-attributes">
                      {assignedAttributes.map((attr) => (
                        <div key={attr.id} className="assigned-attribute">
                          <span className="attribute-key">{attr.key}</span>
                          {attr.description && (
                            <span className="attribute-description"> - {attr.description}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="type">Type:</label>
                  <input
                    type="text"
                    id="type"
                    value={formData.type}
                    onChange={(e) => {
                      const newType = e.target.value;
                      const newConstraints = getValueConstraints(newType);
                      let newValue = formData.value;
                      
                      // Adjust value if it's outside the new constraints
                      if (newValue < newConstraints.min) {
                        newValue = newConstraints.min;
                      } else if (newValue > newConstraints.max) {
                        newValue = newConstraints.max;
                      }
                      
                      // Prevent 0 for default range (when type is not plus or minus)
                      if (!['plus', 'minus'].includes(newType.toLowerCase()) && newValue === 0) {
                        newValue = 1; // Default to 1 if switching to default range with 0
                      }
                      
                      setFormData({ ...formData, type: newType, value: newValue });
                    }}
                    placeholder="plus or minus"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="value">Value:</label>
                  <input
                    type="number"
                    id="value"
                    value={formData.value}
                    onChange={(e) => {
                      let newValue = parseInt(e.target.value) || valueConstraints.min;
                      
                      // Prevent 0 for default range (when type is not plus or minus)
                      if (!['plus', 'minus'].includes(formData.type.toLowerCase()) && newValue === 0) {
                        newValue = newValue > 0 ? 1 : -1;
                      }
                      
                      setFormData({ ...formData, value: newValue });
                    }}
                    min={valueConstraints.min}
                    max={valueConstraints.max}
                    required
                  />
                  <div className="value-constraints">
                    <small>
                      {formData.type.toLowerCase() === 'plus' && 'Range: 1 to 3'}
                      {formData.type.toLowerCase() === 'minus' && 'Range: -3 to -1'}
                      {!['plus', 'minus'].includes(formData.type.toLowerCase()) && 'Range: -3 to 3 (excluding 0)'}
                    </small>
                  </div>
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    className="cancel-button"
                    onClick={handleCancel}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="save-button"
                    disabled={loading || !formData.attributeId}
                  >
                    {loading ? 'Saving...' : (editingAttribute ? 'Update' : 'Add')}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AttributesModal; 