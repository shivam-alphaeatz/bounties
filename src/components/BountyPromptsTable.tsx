import React, { useState, useEffect } from 'react';
import { supabase, bucketMap } from '../supabaseClient';
import './BountyPromptsTable.css';

interface BountyPrompt {
  id: number;
  bucket_id: string;
  type: string;
  prompt: string;
  created_at: string;
  updated_at?: string;
}

interface PromptFormData {
  bucket_id: string;
  type: string;
  prompt: string;
}

interface JsonField {
  key: string;
  value: string;
}

const BountyPromptsTable: React.FC = () => {
  const [prompts, setPrompts] = useState<BountyPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingPrompt, setEditingPrompt] = useState<BountyPrompt | null>(null);
  const [viewingPrompt, setViewingPrompt] = useState<BountyPrompt | null>(null);
  const [formData, setFormData] = useState<PromptFormData>({
    bucket_id: '',
    type: '',
    prompt: ''
  });
  const [jsonFields, setJsonFields] = useState<JsonField[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [filterBucket, setFilterBucket] = useState('');
  const [filterType, setFilterType] = useState('');
  const [editMode, setEditMode] = useState<'fields' | 'raw'>('fields');
  const [rawJsonText, setRawJsonText] = useState('');

  useEffect(() => {
    fetchPrompts();
  }, []);

  const fetchPrompts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('all_bounty_prompts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPrompts(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch prompts');
    } finally {
      setLoading(false);
    }
  };

  const parseJsonToFields = (jsonString: string): JsonField[] => {
    try {
      const parsed = JSON.parse(jsonString);
      if (typeof parsed === 'object' && parsed !== null) {
        return Object.entries(parsed).map(([key, value]) => ({
          key,
          value: typeof value === 'string' ? value : JSON.stringify(value)
        }));
      }
    } catch {
      // If not valid JSON, treat as single field
      return [{ key: 'content', value: jsonString }];
    }
    return [];
  };

  const convertFieldsToJson = (fields: JsonField[]): string => {
    const obj: { [key: string]: any } = {};
    fields.forEach(field => {
      if (field.key.trim()) {
        // Try to parse value as JSON, fallback to string
        try {
          obj[field.key.trim()] = JSON.parse(field.value);
        } catch {
          obj[field.key.trim()] = field.value;
        }
      }
    });
    return JSON.stringify(obj, null, 2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let jsonString: string;
      
      if (editMode === 'fields') {
        // In fields mode, use the raw JSON text if available, otherwise convert from fields
        if (rawJsonText && rawJsonText.trim()) {
          try {
            JSON.parse(rawJsonText);
            jsonString = rawJsonText;
          } catch (parseError) {
            setError('Invalid JSON format in the JSON Editor. Please check your syntax.');
            return;
          }
        } else {
          jsonString = convertFieldsToJson(jsonFields);
        }
      } else {
        // Validate raw JSON
        try {
          JSON.parse(rawJsonText);
          jsonString = rawJsonText;
        } catch (parseError) {
          setError('Invalid JSON format. Please check your syntax.');
          return;
        }
      }
      
      if (editingPrompt) {
        // Update existing prompt
        const { error } = await supabase
          .from('all_bounty_prompts')
          .update({
            bucket_id: formData.bucket_id,
            type: formData.type,
            prompt: jsonString
          })
          .eq('id', editingPrompt.id);

        if (error) throw error;
      } else {
        // Create new prompt
        const { error } = await supabase
          .from('all_bounty_prompts')
          .insert([{
            bucket_id: formData.bucket_id,
            type: formData.type,
            prompt: jsonString
          }]);

        if (error) throw error;
      }

      setFormData({ bucket_id: '', type: '', prompt: '' });
      setJsonFields([]);
      setRawJsonText('');
      setEditingPrompt(null);
      setIsFormOpen(false);
      setEditMode('fields');
      fetchPrompts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save prompt');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this prompt?')) return;
    
    try {
      const { error } = await supabase
        .from('all_bounty_prompts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchPrompts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete prompt');
    }
  };

  const handleEdit = (prompt: BountyPrompt) => {
    setEditingPrompt(prompt);
    setFormData({
      bucket_id: prompt.bucket_id,
      type: prompt.type,
      prompt: prompt.prompt
    });
    setJsonFields(parseJsonToFields(prompt.prompt));
    setRawJsonText(prompt.prompt);
    setIsFormOpen(true);
    setEditMode('fields');
  };

  const handleView = (prompt: BountyPrompt) => {
    setViewingPrompt(prompt);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingPrompt(null);
    setFormData({ bucket_id: '', type: '', prompt: '' });
    setJsonFields([]);
    setRawJsonText('');
    setEditMode('fields');
  };

  const closeView = () => {
    setViewingPrompt(null);
  };

  const addJsonField = () => {
    setJsonFields([...jsonFields, { key: '', value: '' }]);
  };

  const removeJsonField = (index: number) => {
    setJsonFields(jsonFields.filter((_, i) => i !== index));
  };

  const updateJsonField = (index: number, field: 'key' | 'value', value: string) => {
    const newFields = [...jsonFields];
    newFields[index] = { ...newFields[index], [field]: value };
    setJsonFields(newFields);
  };

  const getPromptPreview = (prompt: string): string => {
    try {
      const parsed = JSON.parse(prompt);
      if (typeof parsed === 'object' && parsed !== null) {
        // Return a preview of the JSON structure
        const keys = Object.keys(parsed);
        return keys.length > 0 ? `{${keys.slice(0, 3).join(', ')}${keys.length > 3 ? '...' : ''}}` : '{}';
      }
      return String(parsed).substring(0, 50);
    } catch {
      return prompt.substring(0, 50) + (prompt.length > 50 ? '...' : '');
    }
  };

  // Function to get bucket name from bucket_id
  const getBucketName = (bucketId: string): string => {
    const id = parseInt(bucketId);
    return bucketMap[id as keyof typeof bucketMap] || `Unknown (${bucketId})`;
  };

  // Function to get unique bucket names for filter dropdown
  const getUniqueBucketNames = (): string[] => {
    const bucketNames = prompts.map(prompt => getBucketName(prompt.bucket_id));
    return Array.from(new Set(bucketNames)).sort();
  };

  const isJsonPrompt = (prompt: string): boolean => {
    try {
      JSON.parse(prompt);
      return true;
    } catch {
      return false;
    }
  };

  const filteredPrompts = prompts.filter(prompt => {
    const bucketName = getBucketName(prompt.bucket_id);
    const matchesBucket = !filterBucket || bucketName.toLowerCase().includes(filterBucket.toLowerCase());
    const matchesType = !filterType || prompt.type.toLowerCase().includes(filterType.toLowerCase());
    return matchesBucket && matchesType;
  });

  if (loading) return <div className="loading">Loading prompts...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="bounty-prompts-container">
      <div className="prompts-header">
        <h2>Bounty Prompts</h2>
        <button 
          className="add-prompt-btn"
          onClick={() => {
            setIsFormOpen(true);
            setJsonFields([{ key: '', value: '' }]);
            setRawJsonText('{\n  \n}');
          }}
        >
          Add New Prompt
        </button>
      </div>

      <div className="filters">
        <input
          type="text"
          placeholder="Filter by bucket name..."
          value={filterBucket}
          onChange={(e) => setFilterBucket(e.target.value)}
          className="filter-input"
        />
        <input
          type="text"
          placeholder="Filter by type..."
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="filter-input"
        />
      </div>

      <div className="prompts-table-container">
        <table className="prompts-table">
          <thead>
            <tr>
              <th>Bucket</th>
              <th>Type</th>
              <th>Prompt Preview</th>
              <th>Created</th>
              <th>Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPrompts.map((prompt) => (
              <tr key={prompt.id}>
                <td>{getBucketName(prompt.bucket_id)}</td>
                <td>{prompt.type}</td>
                <td>
                  <div className="prompt-preview">
                    {getPromptPreview(prompt.prompt)}
                    {isJsonPrompt(prompt.prompt) && (
                      <span className="json-badge">JSON</span>
                    )}
                  </div>
                </td>
                <td>{new Date(prompt.created_at).toLocaleDateString()}</td>
                <td>
                  {prompt.updated_at 
                    ? new Date(prompt.updated_at).toLocaleDateString()
                    : '-'
                  }
                </td>
                <td>
                  <div className="action-buttons">
                    <button
                      onClick={() => handleView(prompt)}
                      className="view-btn"
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleEdit(prompt)}
                      className="edit-btn"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(prompt.id)}
                      className="delete-btn"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Form Modal */}
      {isFormOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>{editingPrompt ? 'Edit Prompt' : 'Add New Prompt'}</h3>
              <button onClick={closeForm} className="close-btn">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="prompt-form">
              <div className="form-group">
                <label htmlFor="bucket_id">Bucket:</label>
                <select
                  id="bucket_id"
                  value={formData.bucket_id}
                  onChange={(e) => setFormData({ ...formData, bucket_id: e.target.value })}
                  required
                >
                  <option value="">Select a bucket...</option>
                  {Object.entries(bucketMap).map(([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="type">Type:</label>
                <input
                  type="text"
                  id="type"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Prompt Content:</label>
                <div className="edit-mode-toggle">
                  <button
                    type="button"
                    className={`toggle-btn ${editMode === 'fields' ? 'active' : ''}`}
                    onClick={() => setEditMode('fields')}
                  >
                    JSON Fields
                  </button>
                  <button
                    type="button"
                    className={`toggle-btn ${editMode === 'raw' ? 'active' : ''}`}
                    onClick={() => setEditMode('raw')}
                  >
                    Raw JSON
                  </button>
                </div>
                
                {editMode === 'fields' ? (
                  <div className="json-fields-container">
                    {jsonFields.map((field, index) => (
                      <div key={index} className="json-field-row">
                        <input
                          type="text"
                          placeholder="Key"
                          value={field.key}
                          onChange={(e) => updateJsonField(index, 'key', e.target.value)}
                          className="field-key-input"
                        />
                        <textarea
                          placeholder="Value"
                          value={field.value}
                          onChange={(e) => updateJsonField(index, 'value', e.target.value)}
                          rows={2}
                          className="field-value-input"
                        />
                        <button
                          type="button"
                          onClick={() => removeJsonField(index)}
                          className="remove-field-btn"
                          title="Remove field"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addJsonField}
                      className="add-field-btn"
                    >
                      + Add Field
                    </button>
                    <div className="json-preview">
                      <label htmlFor="json-preview-textarea">JSON Editor:</label>
                      <textarea
                        id="json-preview-textarea"
                        className="json-preview-textarea"
                        value={(() => {
                          // Use a separate state for the JSON editor content
                          try {
                            return JSON.stringify(JSON.parse(rawJsonText || convertFieldsToJson(jsonFields)), null, 2);
                          } catch {
                            return rawJsonText || convertFieldsToJson(jsonFields);
                          }
                        })()}
                        onChange={(e) => {
                          // Update the raw JSON text independently
                          setRawJsonText(e.target.value);
                        }}
                        onKeyDown={(e) => {
                          // Prevent Ctrl+A from selecting the whole page
                          if (e.ctrlKey && e.key === 'a') {
                            e.preventDefault();
                            e.currentTarget.select();
                          }
                        }}
                        rows={12}
                        placeholder="Edit JSON directly here with complete freedom..."
                      />
                      <div className="json-validation">
                        {(() => {
                          try {
                            JSON.parse(rawJsonText || convertFieldsToJson(jsonFields));
                            return <span className="valid-json">✓ Valid JSON</span>;
                          } catch {
                            return <span className="invalid-json">✗ Invalid JSON</span>;
                          }
                        })()}
                      </div>
                      <div className="json-editor-actions">
                        <button
                          type="button"
                          onClick={() => {
                            // Sync from fields to JSON editor
                            setRawJsonText(convertFieldsToJson(jsonFields));
                          }}
                          className="sync-btn"
                        >
                          Sync from Fields
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            // Sync from JSON editor to fields
                            try {
                              const parsed = JSON.parse(rawJsonText);
                              const newFields: JsonField[] = [];
                              Object.entries(parsed).forEach(([key, value]) => {
                                newFields.push({
                                  key,
                                  value: typeof value === 'string' ? value : JSON.stringify(value)
                                });
                              });
                              setJsonFields(newFields);
                            } catch (error) {
                              alert('Invalid JSON format. Please fix the JSON before syncing to fields.');
                            }
                          }}
                          className="sync-btn"
                        >
                          Sync to Fields
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="raw-json-container">
                    <textarea
                      value={rawJsonText}
                      onChange={(e) => setRawJsonText(e.target.value)}
                      placeholder="Enter JSON content here..."
                      className="raw-json-textarea"
                      rows={15}
                    />
                    <div className="json-validation">
                      {(() => {
                        try {
                          JSON.parse(rawJsonText);
                          return <span className="valid-json">✓ Valid JSON</span>;
                        } catch {
                          return <span className="invalid-json">✗ Invalid JSON</span>;
                        }
                      })()}
                    </div>
                  </div>
                )}
              </div>
              <div className="form-actions">
                <button type="submit" className="save-btn">
                  {editingPrompt ? 'Update' : 'Create'}
                </button>
                <button type="button" onClick={closeForm} className="cancel-btn">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewingPrompt && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>View Prompt</h3>
              <button onClick={closeView} className="close-btn">&times;</button>
            </div>
            <div className="prompt-view">
              <div className="view-group">
                <label>Bucket:</label>
                <span>{getBucketName(viewingPrompt.bucket_id)}</span>
              </div>
              <div className="view-group">
                <label>Type:</label>
                <span>{viewingPrompt.type}</span>
              </div>
              <div className="view-group">
                <label htmlFor="prompt-display">Prompt:</label>
                <textarea
                  id="prompt-display"
                  className="json-display-textarea"
                  value={(() => {
                    try {
                      return JSON.stringify(JSON.parse(viewingPrompt.prompt), null, 2);
                    } catch {
                      return viewingPrompt.prompt;
                    }
                  })()}
                  readOnly
                  rows={15}
                  aria-label="Prompt content (read-only)"
                />
              </div>
              <div className="view-group">
                <label>Created:</label>
                <span>{new Date(viewingPrompt.created_at).toLocaleString()}</span>
              </div>
              {viewingPrompt.updated_at && (
                <div className="view-group">
                  <label>Updated:</label>
                  <span>{new Date(viewingPrompt.updated_at).toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BountyPromptsTable; 