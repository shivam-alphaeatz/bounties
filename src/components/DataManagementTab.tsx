import React, { useState, useEffect } from 'react';
import { AttributesService, Attribute } from '../services/attributesService';
import { bucketMap } from '../supabaseClient';
import './DataManagementTab.css';

interface AttributeFormData {
  key: string;
  description: string;
  bucket_id: number | null;
  type: string;
}

interface FactFormData {
  title: string;
  content: string;
  category: string;
  source?: string;
}

interface ImageFormData {
  title: string;
  description: string;
  url: string;
  category: string;
}

type DataType = 'attributes' | 'facts' | 'images';

const DataManagementTab: React.FC = () => {
  const [activeDataType, setActiveDataType] = useState<DataType>('attributes');
  
  // Attributes state
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [attributeLoading, setAttributeLoading] = useState(true);
  const [attributeError, setAttributeError] = useState<string | null>(null);
  const [editingAttribute, setEditingAttribute] = useState<Attribute | null>(null);
  const [attributeFormData, setAttributeFormData] = useState<AttributeFormData>({
    key: '',
    description: '',
    bucket_id: null,
    type: 'attribute'
  });
  const [isAttributeFormOpen, setIsAttributeFormOpen] = useState(false);
  const [attributeFilterBucket, setAttributeFilterBucket] = useState<string>('all');
  const [attributeSearchTerm, setAttributeSearchTerm] = useState<string>('');

  // Facts state (placeholder)
  const [facts, setFacts] = useState<any[]>([]);
  const [factLoading, setFactLoading] = useState(false);
  const [factError, setFactError] = useState<string | null>(null);
  const [editingFact, setEditingFact] = useState<any | null>(null);
  const [factFormData, setFactFormData] = useState<FactFormData>({
    title: '',
    content: '',
    category: '',
    source: ''
  });
  const [isFactFormOpen, setIsFactFormOpen] = useState(false);
  const [factFilterCategory, setFactFilterCategory] = useState<string>('all');
  const [factSearchTerm, setFactSearchTerm] = useState<string>('');

  // Images state (placeholder)
  const [images, setImages] = useState<any[]>([]);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [editingImage, setEditingImage] = useState<any | null>(null);
  const [imageFormData, setImageFormData] = useState<ImageFormData>({
    title: '',
    description: '',
    url: '',
    category: ''
  });
  const [isImageFormOpen, setIsImageFormOpen] = useState(false);
  const [imageFilterCategory, setImageFilterCategory] = useState<string>('all');
  const [imageSearchTerm, setImageSearchTerm] = useState<string>('');

  useEffect(() => {
    if (activeDataType === 'attributes') {
      fetchAttributes();
    } else if (activeDataType === 'facts') {
      fetchFacts();
    } else if (activeDataType === 'images') {
      fetchImages();
    }
  }, [activeDataType]);

  // Attributes functions
  const fetchAttributes = async () => {
    try {
      setAttributeLoading(true);
      setAttributeError(null);
      const data = await AttributesService.getAttributes();
      setAttributes(data);
    } catch (err) {
      console.error('Error fetching attributes:', err);
      setAttributeError('Failed to load attributes. Please try again.');
    } finally {
      setAttributeLoading(false);
    }
  };

  const handleAddAttribute = () => {
    setEditingAttribute(null);
    setAttributeFormData({
      key: '',
      description: '',
      bucket_id: null,
      type: 'attribute'
    });
    setIsAttributeFormOpen(true);
  };

  const handleEditAttribute = (attribute: Attribute) => {
    setEditingAttribute(attribute);
    setAttributeFormData({
      key: attribute.key,
      description: attribute.description || '',
      bucket_id: attribute.bucket_id || null,
      type: 'attribute'
    });
    setIsAttributeFormOpen(true);
  };

  const handleDeleteAttribute = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this attribute? This action cannot be undone.')) {
      try {
        await AttributesService.deleteAttribute(id);
        await fetchAttributes();
      } catch (err) {
        console.error('Error deleting attribute:', err);
        setAttributeError('Failed to delete attribute. Please try again.');
      }
    }
  };

  const handleAttributeFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!attributeFormData.key.trim()) {
      setAttributeError('Attribute key is required.');
      return;
    }

    try {
      setAttributeError(null);
      
      if (editingAttribute) {
        await AttributesService.updateAttribute(
          editingAttribute.id,
          attributeFormData.key.trim(),
          attributeFormData.description.trim() || undefined,
          attributeFormData.bucket_id !== null ? attributeFormData.bucket_id : undefined,
          attributeFormData.type
        );
      } else {
        await AttributesService.createAttribute(
          attributeFormData.key.trim(),
          attributeFormData.description.trim() || undefined,
          attributeFormData.bucket_id !== null ? attributeFormData.bucket_id : undefined,
          attributeFormData.type
        );
      }

      setIsAttributeFormOpen(false);
      setEditingAttribute(null);
      setAttributeFormData({
        key: '',
        description: '',
        bucket_id: null,
        type: 'attribute'
      });
      await fetchAttributes();
    } catch (err) {
      console.error('Error saving attribute:', err);
      setAttributeError('Failed to save attribute. Please try again.');
    }
  };

  const handleAttributeFormCancel = () => {
    setIsAttributeFormOpen(false);
    setEditingAttribute(null);
    setAttributeFormData({
      key: '',
      description: '',
      bucket_id: null,
      type: 'attribute'
    });
    setAttributeError(null);
  };

  // Facts functions (placeholder)
  const fetchFacts = async () => {
    // TODO: Implement facts fetching
    setFactLoading(false);
    setFacts([]);
  };

  const handleAddFact = () => {
    setEditingFact(null);
    setFactFormData({
      title: '',
      content: '',
      category: '',
      source: ''
    });
    setIsFactFormOpen(true);
  };

  const handleEditFact = (fact: any) => {
    setEditingFact(fact);
    setFactFormData({
      title: fact.title || '',
      content: fact.content || '',
      category: fact.category || '',
      source: fact.source || ''
    });
    setIsFactFormOpen(true);
  };

  const handleDeleteFact = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this fact? This action cannot be undone.')) {
      // TODO: Implement fact deletion
      console.log('Delete fact:', id);
    }
  };

  const handleFactFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement fact form submission
    console.log('Submit fact:', factFormData);
    setIsFactFormOpen(false);
  };

  const handleFactFormCancel = () => {
    setIsFactFormOpen(false);
    setEditingFact(null);
    setFactFormData({
      title: '',
      content: '',
      category: '',
      source: ''
    });
  };

  // Images functions (placeholder)
  const fetchImages = async () => {
    // TODO: Implement images fetching
    setImageLoading(false);
    setImages([]);
  };

  const handleAddImage = () => {
    setEditingImage(null);
    setImageFormData({
      title: '',
      description: '',
      url: '',
      category: ''
    });
    setIsImageFormOpen(true);
  };

  const handleEditImage = (image: any) => {
    setEditingImage(image);
    setImageFormData({
      title: image.title || '',
      description: image.description || '',
      url: image.url || '',
      category: image.category || ''
    });
    setIsImageFormOpen(true);
  };

  const handleDeleteImage = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this image? This action cannot be undone.')) {
      // TODO: Implement image deletion
      console.log('Delete image:', id);
    }
  };

  const handleImageFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement image form submission
    console.log('Submit image:', imageFormData);
    setIsImageFormOpen(false);
  };

  const handleImageFormCancel = () => {
    setIsImageFormOpen(false);
    setEditingImage(null);
    setImageFormData({
      title: '',
      description: '',
      url: '',
      category: ''
    });
  };

  // Utility functions
  const getBucketName = (bucketId: number | null | undefined): string => {
    if (!bucketId) return 'None';
    return bucketMap[bucketId as keyof typeof bucketMap] || `Unknown (${bucketId})`;
  };

  const getUniqueBucketNames = (): string[] => {
    const bucketNames = Object.values(bucketMap);
    return ['all', 'none', ...bucketNames];
  };

  // Filter functions
  const filteredAttributes = attributes.filter(attribute => {
    const matchesSearch = attribute.key.toLowerCase().includes(attributeSearchTerm.toLowerCase()) ||
                         (attribute.description && attribute.description.toLowerCase().includes(attributeSearchTerm.toLowerCase()));
    
    const matchesBucket = attributeFilterBucket === 'all' || 
                         attributeFilterBucket === 'none' && !attribute.bucket_id ||
                         (attribute.bucket_id && getBucketName(attribute.bucket_id) === attributeFilterBucket);
    
    return matchesSearch && matchesBucket;
  });

  const filteredFacts = facts.filter(fact => {
    const matchesSearch = fact.title?.toLowerCase().includes(factSearchTerm.toLowerCase()) ||
                         fact.content?.toLowerCase().includes(factSearchTerm.toLowerCase());
    
    const matchesCategory = factFilterCategory === 'all' || fact.category === factFilterCategory;
    
    return matchesSearch && matchesCategory;
  });

  const filteredImages = images.filter(image => {
    const matchesSearch = image.title?.toLowerCase().includes(imageSearchTerm.toLowerCase()) ||
                         image.description?.toLowerCase().includes(imageSearchTerm.toLowerCase());
    
    const matchesCategory = imageFilterCategory === 'all' || image.category === imageFilterCategory;
    
    return matchesSearch && matchesCategory;
  });

  const renderAttributesTab = () => {
    if (attributeLoading) {
      return (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading attributes...</p>
        </div>
      );
    }

    return (
      <div className="data-content">
        <div className="data-header">
          <div className="header-content">
            <h2>Attributes Management</h2>
            <p>Create and manage attributes that can be assigned to bounties</p>
          </div>
          <div className="header-actions">
            <button 
              className="add-btn"
              onClick={handleAddAttribute}
            >
              + Add Attribute
            </button>
          </div>
        </div>

        {attributeError && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            {attributeError}
          </div>
        )}

        <div className="data-stats">
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
            <label htmlFor="attribute-bucket-filter">Filter by Category:</label>
            <select
              id="attribute-bucket-filter"
              value={attributeFilterBucket}
              onChange={(e) => setAttributeFilterBucket(e.target.value)}
              className="filter-select"
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
            <label htmlFor="attribute-search-filter">Search:</label>
            <input
              type="text"
              id="attribute-search-filter"
              value={attributeSearchTerm}
              onChange={(e) => setAttributeSearchTerm(e.target.value)}
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
          <div className="data-table">
            <table>
              <thead>
                <tr>
                  <th>Key</th>
                  <th>Description</th>
                  <th>Type</th>
                  <th>Category</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAttributes.map((attribute) => (
                  <tr key={attribute.id}>
                    <td className="data-key">{attribute.key}</td>
                    <td className="data-description">
                      {attribute.description || <span className="no-description">No description</span>}
                    </td>
                    <td className="data-type">
                      <span className={`type-badge ${attribute.type || 'attribute'}`}>
                        {attribute.type || 'attribute'}
                      </span>
                    </td>
                    <td className="data-category">
                      <span className={`category-badge ${attribute.bucket_id ? 'assigned' : 'unassigned'}`}>
                        {getBucketName(attribute.bucket_id)}
                      </span>
                    </td>
                    <td className="data-actions">
                      <button
                        className="edit-btn"
                        onClick={() => handleEditAttribute(attribute)}
                        title="Edit attribute"
                      >
                        ✏️
                      </button>
                      <button
                        className="delete-btn"
                        onClick={() => handleDeleteAttribute(attribute.id)}
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
        {isAttributeFormOpen && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h2>{editingAttribute ? 'Edit Attribute' : 'Add New Attribute'}</h2>
                <button className="close-btn" onClick={handleAttributeFormCancel}>×</button>
              </div>
              
              <form onSubmit={handleAttributeFormSubmit} className="data-form">
                <div className="form-group">
                  <label htmlFor="attribute-key">Attribute Key *</label>
                  <input
                    type="text"
                    id="attribute-key"
                    value={attributeFormData.key}
                    onChange={(e) => setAttributeFormData({ ...attributeFormData, key: e.target.value })}
                    placeholder="e.g., difficulty, duration, energy"
                    required
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="attribute-description">Description</label>
                  <textarea
                    id="attribute-description"
                    value={attributeFormData.description}
                    onChange={(e) => setAttributeFormData({ ...attributeFormData, description: e.target.value })}
                    placeholder="Optional description of what this attribute represents..."
                    rows={3}
                    className="form-textarea"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="attribute-bucket">Category (Optional)</label>
                  <select
                    id="attribute-bucket"
                    value={attributeFormData.bucket_id || ''}
                    onChange={(e) => setAttributeFormData({ 
                      ...attributeFormData, 
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

                <div className="form-group">
                  <label htmlFor="attribute-type">Type</label>
                  <select
                    id="attribute-type"
                    value={attributeFormData.type}
                    onChange={(e) => setAttributeFormData({ ...attributeFormData, type: e.target.value })}
                    className="form-select"
                  >
                    <option value="attribute">Attribute</option>
                    <option value="fact">Fact</option>
                    <option value="image">Image</option>
                  </select>
                </div>

                <div className="form-actions">
                  <button type="button" onClick={handleAttributeFormCancel} className="cancel-btn">
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

  const renderFactsTab = () => {
    return (
      <div className="data-content">
        <div className="data-header">
          <div className="header-content">
            <h2>Facts Management</h2>
            <p>Create and manage facts and knowledge base entries</p>
          </div>
          <div className="header-actions">
            <button 
              className="add-btn"
              onClick={handleAddFact}
            >
              + Add Fact
            </button>
          </div>
        </div>

        <div className="placeholder-content">
          <div className="placeholder-icon">📚</div>
          <h3>Facts Management Coming Soon</h3>
          <p>This section will allow you to manage facts and knowledge base entries. Implementation details will be provided later.</p>
        </div>

        {/* Fact Form Modal (placeholder) */}
        {isFactFormOpen && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h2>{editingFact ? 'Edit Fact' : 'Add New Fact'}</h2>
                <button className="close-btn" onClick={handleFactFormCancel}>×</button>
              </div>
              
              <form onSubmit={handleFactFormSubmit} className="data-form">
                <div className="form-group">
                  <label htmlFor="fact-title">Title *</label>
                  <input
                    type="text"
                    id="fact-title"
                    value={factFormData.title}
                    onChange={(e) => setFactFormData({ ...factFormData, title: e.target.value })}
                    placeholder="Enter fact title..."
                    required
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="fact-content">Content *</label>
                  <textarea
                    id="fact-content"
                    value={factFormData.content}
                    onChange={(e) => setFactFormData({ ...factFormData, content: e.target.value })}
                    placeholder="Enter fact content..."
                    rows={4}
                    required
                    className="form-textarea"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="fact-category">Category</label>
                  <input
                    type="text"
                    id="fact-category"
                    value={factFormData.category}
                    onChange={(e) => setFactFormData({ ...factFormData, category: e.target.value })}
                    placeholder="Enter category..."
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="fact-source">Source (Optional)</label>
                  <input
                    type="text"
                    id="fact-source"
                    value={factFormData.source}
                    onChange={(e) => setFactFormData({ ...factFormData, source: e.target.value })}
                    placeholder="Enter source URL or reference..."
                    className="form-input"
                  />
                </div>

                <div className="form-actions">
                  <button type="button" onClick={handleFactFormCancel} className="cancel-btn">
                    Cancel
                  </button>
                  <button type="submit" className="save-btn">
                    {editingFact ? 'Update Fact' : 'Create Fact'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderImagesTab = () => {
    return (
      <div className="data-content">
        <div className="data-header">
          <div className="header-content">
            <h2>Images Management</h2>
            <p>Create and manage images and visual content</p>
          </div>
          <div className="header-actions">
            <button 
              className="add-btn"
              onClick={handleAddImage}
            >
              + Add Image
            </button>
          </div>
        </div>

        <div className="placeholder-content">
          <div className="placeholder-icon">🖼️</div>
          <h3>Images Management Coming Soon</h3>
          <p>This section will allow you to manage images and visual content. Implementation details will be provided later.</p>
        </div>

        {/* Image Form Modal (placeholder) */}
        {isImageFormOpen && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h2>{editingImage ? 'Edit Image' : 'Add New Image'}</h2>
                <button className="close-btn" onClick={handleImageFormCancel}>×</button>
              </div>
              
              <form onSubmit={handleImageFormSubmit} className="data-form">
                <div className="form-group">
                  <label htmlFor="image-title">Title *</label>
                  <input
                    type="text"
                    id="image-title"
                    value={imageFormData.title}
                    onChange={(e) => setImageFormData({ ...imageFormData, title: e.target.value })}
                    placeholder="Enter image title..."
                    required
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="image-description">Description</label>
                  <textarea
                    id="image-description"
                    value={imageFormData.description}
                    onChange={(e) => setImageFormData({ ...imageFormData, description: e.target.value })}
                    placeholder="Enter image description..."
                    rows={3}
                    className="form-textarea"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="image-url">Image URL *</label>
                  <input
                    type="url"
                    id="image-url"
                    value={imageFormData.url}
                    onChange={(e) => setImageFormData({ ...imageFormData, url: e.target.value })}
                    placeholder="Enter image URL..."
                    required
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="image-category">Category</label>
                  <input
                    type="text"
                    id="image-category"
                    value={imageFormData.category}
                    onChange={(e) => setImageFormData({ ...imageFormData, category: e.target.value })}
                    placeholder="Enter category..."
                    className="form-input"
                  />
                </div>

                <div className="form-actions">
                  <button type="button" onClick={handleImageFormCancel} className="cancel-btn">
                    Cancel
                  </button>
                  <button type="submit" className="save-btn">
                    {editingImage ? 'Update Image' : 'Create Image'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="data-management-container">
      <div className="data-management-header">
        <div className="header-content">
          <h1>Data Management</h1>
          <p>Manage attributes, facts, and images for your bounties system</p>
        </div>
      </div>

      <div className="data-type-tabs">
        <button 
          className={`data-type-tab ${activeDataType === 'attributes' ? 'active' : ''}`}
          onClick={() => setActiveDataType('attributes')}
        >
          🏷️ Attributes
        </button>
        <button 
          className={`data-type-tab ${activeDataType === 'facts' ? 'active' : ''}`}
          onClick={() => setActiveDataType('facts')}
        >
          📚 Facts
        </button>
        <button 
          className={`data-type-tab ${activeDataType === 'images' ? 'active' : ''}`}
          onClick={() => setActiveDataType('images')}
        >
          🖼️ Images
        </button>
      </div>

      <div className="data-type-content">
        {activeDataType === 'attributes' && renderAttributesTab()}
        {activeDataType === 'facts' && renderFactsTab()}
        {activeDataType === 'images' && renderImagesTab()}
      </div>
    </div>
  );
};

export default DataManagementTab; 