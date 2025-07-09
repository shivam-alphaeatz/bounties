import React, { useState, useEffect } from 'react';
import { AttributesService, Attribute } from '../services/attributesService';
import { bucketMap } from '../supabaseClient';
import './AttributesTab.css';

interface AttributeFormData {
  key: string;
  description: string;
  bucket_id: number | null;
}

const AttributesTab: React.FC = () => {
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingAttribute, setEditingAttribute] = useState<Attribute | null>(null);
  const [formData, setFormData] = useState<AttributeFormData>({
    key: '',
    description: '',
    bucket_id: null
  });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [filterBucket, setFilterBucket] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    fetchAttributes();
  }, []);

  const fetchAttributes = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await AttributesService.getAttributes();
      setAttributes(data);
    } catch (err) {
      console.error('Error fetching attributes:', err);
      setError('Failed to load attributes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddClick = () => {
    setEditingAttribute(null);
    setFormData({
      key: '',
      description: '',
      bucket_id: null
    });
    setIsFormOpen(true);
  };

  const handleEditClick = (attribute: Attribute) => {
    setEditingAttribute(attribute);
    setFormData({
      key: attribute.key,
      description: attribute.description || '',
      bucket_id: attribute.bucket_id || null
    });
    setIsFormOpen(true);
  };

  const handleDeleteClick = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this attribute? This action cannot be undone.')) {
      try {
        await AttributesService.deleteAttribute(id);
        await fetchAttributes();
      } catch (err) {
        console.error('Error deleting attribute:', err);
        setError('Failed to delete attribute. Please try again.');
      }
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.key.trim()) {
      setError('Attribute key is required.');
      return;
    }

    try {
      setError(null);
      
      if (editingAttribute) {
        // Update existing attribute
        await AttributesService.updateAttribute(
          editingAttribute.id,
          formData.key.trim(),
          formData.description.trim() || undefined,
          formData.bucket_id !== null ? formData.bucket_id : undefined
        );
      } else {
        // Create new attribute
        await AttributesService.createAttribute(
          formData.key.trim(),
          formData.description.trim() || undefined,
          formData.bucket_id !== null ? formData.bucket_id : undefined
        );
      }

      setIsFormOpen(false);
      setEditingAttribute(null);
      setFormData({
        key: '',
        description: '',
        bucket_id: null
      });
      await fetchAttributes();
    } catch (err) {
      console.error('Error saving attribute:', err);
      setError('Failed to save attribute. Please try again.');
    }
  };

  const handleFormCancel = () => {
    setIsFormOpen(false);
    setEditingAttribute(null);
    setFormData({
      key: '',
      description: '',
      bucket_id: null
    });
    setError(null);
  };

  const getBucketName = (bucketId: number | null | undefined): string => {
    if (!bucketId) return 'None';
    return bucketMap[bucketId as keyof typeof bucketMap] || `Unknown (${bucketId})`;
  };

  const getUniqueBucketNames = (): string[] => {
    const bucketNames = Object.values(bucketMap);
    return ['all', 'none', ...bucketNames];
  };

  // Filter attributes based on search term and bucket filter
  const filteredAttributes = attributes.filter(attribute => {
    const matchesSearch = attribute.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (attribute.description && attribute.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesBucket = filterBucket === 'all' || 
                         filterBucket === 'none' && !attribute.bucket_id ||
                         (attribute.bucket_id && getBucketName(attribute.bucket_id) === filterBucket);
    
    return matchesSearch && matchesBucket;
  });

  if (loading) {
    return (
      <div className="attributes-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading attributes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="attributes-container">
      <div className="attributes-header">
        <div className="header-content">
          <h1>Attributes Management</h1>
          <p>Create and manage attributes that can be assigned to bounties</p>
        </div>
        <div className="header-actions">
          <button 
            className="add-attribute-btn"
            onClick={handleAddClick}
          >
            + Add Attribute
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}

      <div className="attributes-stats">
        <div className="stat-card">
          <div className="stat-number">{attributes.length}</div>
          <div className="stat-label">Total Attributes</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{filteredAttributes.length}</div>
          <div className="stat-label">Filtered Attributes</div>
        </div>
      </div>

      <div className="filters-section">
        <div className="filter-group">
          <label htmlFor="bucket-filter">Filter by Category:</label>
          <select
            id="bucket-filter"
            value={filterBucket}
            onChange={(e) => setFilterBucket(e.target.value)}
            className="bucket-filter"
          >
            {getUniqueBucketNames().map(bucketName => (
              <option key={bucketName} value={bucketName}>
                {bucketName === 'all' ? 'All Categories' : 
                 bucketName === 'none' ? 'No Category' : bucketName}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label htmlFor="search-filter">Search:</label>
          <input
            type="text"
            id="search-filter"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by key or description..."
            className="search-filter"
          />
        </div>
      </div>

      {filteredAttributes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🏷️</div>
          <h3>No attributes found</h3>
          <p>
            {attributes.length === 0 
              ? "No attributes have been created yet. Click 'Add Attribute' to create your first attribute."
              : "No attributes match your current filters. Try adjusting your search or filter criteria."
            }
          </p>
        </div>
      ) : (
        <div className="attributes-table">
          <table>
            <thead>
              <tr>
                <th>Key</th>
                <th>Description</th>
                <th>Category</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAttributes.map((attribute) => (
                <tr key={attribute.id}>
                  <td className="attribute-key">{attribute.key}</td>
                  <td className="attribute-description">
                    {attribute.description || <span className="no-description">No description</span>}
                  </td>
                  <td className="attribute-category">
                    <span className={`category-badge ${attribute.bucket_id ? 'assigned' : 'unassigned'}`}>
                      {getBucketName(attribute.bucket_id)}
                    </span>
                  </td>
                  <td className="attribute-actions">
                    <button
                      className="edit-btn"
                      onClick={() => handleEditClick(attribute)}
                      title="Edit attribute"
                    >
                      ✏️
                    </button>
                    <button
                      className="delete-btn"
                      onClick={() => handleDeleteClick(attribute.id)}
                      title="Delete attribute"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Attribute Form Modal */}
      {isFormOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editingAttribute ? 'Edit Attribute' : 'Add New Attribute'}</h2>
              <button className="close-btn" onClick={handleFormCancel}>×</button>
            </div>
            
            <form onSubmit={handleFormSubmit} className="attribute-form">
              <div className="form-group">
                <label htmlFor="attribute-key">Attribute Key *</label>
                <input
                  type="text"
                  id="attribute-key"
                  value={formData.key}
                  onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                  placeholder="e.g., difficulty, duration, energy"
                  required
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="attribute-description">Description</label>
                <textarea
                  id="attribute-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description of what this attribute represents..."
                  rows={3}
                  className="form-textarea"
                />
              </div>

              <div className="form-group">
                <label htmlFor="attribute-bucket">Category (Optional)</label>
                <select
                  id="attribute-bucket"
                  value={formData.bucket_id || ''}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    bucket_id: e.target.value ? parseInt(e.target.value) : null 
                  })}
                  className="form-select"
                >
                  <option value="">No Category</option>
                  {Object.entries(bucketMap).map(([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-actions">
                <button type="button" onClick={handleFormCancel} className="cancel-btn">
                  Cancel
                </button>
                <button type="submit" className="save-btn">
                  {editingAttribute ? 'Update Attribute' : 'Create Attribute'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttributesTab; 