import React, { useState, useEffect } from "react";
import {
  AttributesService,
  Attribute,
  BountyAttribute,
} from "../services/attributesService";
import { BountyImageService } from "../services/bountyImageService";
import { ImageKitService } from "../services/imageKitService";
import { BountyHintsService, BountyHint } from "../services/bountyHintsService";
import "./AttributesModal.css";

interface AttributesModalProps {
  isOpen: boolean;
  onClose: () => void;
  bountyId: string;
  bountyName: string;
  bucketId: number;
  mode: "add" | "edit";
  onAttributesUpdated: () => void;
}

const AttributesModal: React.FC<AttributesModalProps> = ({
  isOpen,
  onClose,
  bountyId,
  bountyName,
  bucketId,
  mode,
  onAttributesUpdated,
}) => {
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [bountyAttributes, setBountyAttributes] = useState<BountyAttribute[]>(
    [],
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAttribute, setEditingAttribute] =
    useState<BountyAttribute | null>(null);
  const [generatingAttributes, setGeneratingAttributes] = useState(false);
  const [formData, setFormData] = useState({
    attributeId: "",
    type: "",
    value: 1,
  });

  // Image state
  const [imageUrl, setImageUrl] = useState<string>("");
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [showImageForm, setShowImageForm] = useState(false);
  const [uploadMethod, setUploadMethod] = useState<"url" | "file">("url");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  // Hints state
  const [hints, setHints] = useState<BountyHint[]>([]);
  const [showHintForm, setShowHintForm] = useState(false);
  const [editingHint, setEditingHint] = useState<BountyHint | null>(null);
  const [hintLoading, setHintLoading] = useState(false);
  const [hintFormData, setHintFormData] = useState({
    hint: "",
    type: "tip" as "tip" | "warning" | "info",
  });

  // Get available attributes (not already assigned to this bounty)
  const availableAttributes = attributes.filter(
    (attr) =>
      !bountyAttributes.some(
        (bountyAttr) => bountyAttr.attribute_id === attr.id,
      ),
  );

  // Get assigned attributes
  const assignedAttributes = attributes.filter((attr) =>
    bountyAttributes.some((bountyAttr) => bountyAttr.attribute_id === attr.id),
  );

  // Get min and max values based on type
  const getValueConstraints = (type: string) => {
    if (type.toLowerCase() === "plus") {
      return { min: 1, max: 3 };
    } else if (type.toLowerCase() === "minus") {
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
      setShowImageForm(false);
    }
  }, [isOpen]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log(
        "Loading data for bountyId:",
        bountyId,
        "type:",
        typeof bountyId,
      );

      const [attributesData, bountyAttributesData, imageData, hintsData] =
        await Promise.all([
          AttributesService.getAttributesByBucket(bucketId),
          AttributesService.getBountyAttributes(bountyId),
          BountyImageService.getBountyImage(bountyId),
          BountyHintsService.getBountyHints(bountyId),
        ]);

      setAttributes(attributesData);
      setBountyAttributes(bountyAttributesData);
      setCurrentImageUrl(imageData);
      setHints(hintsData);

      console.log("DEBUG: AttributesModal - loaded hints:", hintsData);
      console.log("DEBUG: AttributesModal - hints count:", hintsData.length);
      if (hintsData.length > 0) {
        console.log("DEBUG: AttributesModal - first hint:", hintsData[0]);
        console.log(
          "DEBUG: AttributesModal - first hint keys:",
          Object.keys(hintsData[0]),
        );
      }
    } catch (err) {
      console.error("Error loading data:", err);
      setError("Failed to load attributes data");
    } finally {
      setLoading(false);
    }
  };

  const handleAddAttribute = () => {
    setEditingAttribute(null);
    setFormData({
      attributeId: "",
      type: "",
      value: 1,
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
    if (
      !["plus", "minus"].includes(attribute.type.toLowerCase()) &&
      value === 0
    ) {
      value = 1; // Default to 1 if value is 0 in default range
    }

    setEditingAttribute(attribute);
    setFormData({
      attributeId: attribute.attribute_id,
      type: attribute.type,
      value: value,
    });
    setShowAddForm(true);
  };

  const handleDeleteAttribute = async (attribute: BountyAttribute) => {
    if (!window.confirm("Are you sure you want to delete this attribute?")) {
      return;
    }

    try {
      setLoading(true);
      await AttributesService.deleteBountyAttribute(
        attribute.bounty_id,
        attribute.attribute_id,
      );
      await loadData();
      onAttributesUpdated();
    } catch (err) {
      console.error("Error deleting attribute:", err);
      setError("Failed to delete attribute");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAttributes = async () => {
    try {
      setGeneratingAttributes(true);
      setError(null);

      const response = await fetch(
        "https://nwfhqrmdjmjopbxulyhu.supabase.co/functions/v1/attributeGEN",
        {
          method: "POST",
          headers: {
            Authorization:
              "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53Zmhxcm1kam1qb3BieHVseWh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYyNjc5MDMsImV4cCI6MjA2MTg0MzkwM30.NvbyIKp7BxALfO0SBpdFcbCXXhPcOJ_4YJY8HPyVlzs",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            bucket_id: bucketId,
            bounty_id: bountyId,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log("Attributes generated successfully:", result);

      // Reload data to show the newly generated attributes
      await loadData();
      onAttributesUpdated();

      // Show success message
      alert("Attributes generated successfully!");
    } catch (err) {
      console.error("Error generating attributes:", err);
      setError("Failed to generate attributes. Please try again.");
    } finally {
      setGeneratingAttributes(false);
    }
  };

  // Image handling functions
  const handleAddImage = () => {
    setImageUrl("");
    setSelectedFile(null);
    setUploadMethod("url");
    setShowImageForm(true);
  };

  const handleEditImage = () => {
    setImageUrl(currentImageUrl || "");
    setSelectedFile(null);
    setUploadMethod("url");
    setShowImageForm(true);
  };

  const handleDeleteImage = async () => {
    if (!window.confirm("Are you sure you want to delete this image?")) {
      return;
    }

    try {
      setImageLoading(true);
      await BountyImageService.deleteBountyImage(bountyId);
      setCurrentImageUrl(null);
      onAttributesUpdated();
    } catch (err) {
      console.error("Error deleting image:", err);
      setError("Failed to delete image");
    } finally {
      setImageLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        setError("Please select a valid image file");
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError("File size must be less than 10MB");
        return;
      }

      setSelectedFile(file);
      setError(null);
    }
  };

  const handleImageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (uploadMethod === "url" && !imageUrl.trim()) {
      setError("Please enter an image URL");
      return;
    }

    if (uploadMethod === "file" && !selectedFile) {
      setError("Please select a file to upload");
      return;
    }

    try {
      setImageLoading(true);
      setError(null);
      setUploadProgress(0);

      let finalImageUrl: string;

      if (uploadMethod === "file" && selectedFile) {
        // Upload file to ImageKit
        setUploadProgress(50);
        finalImageUrl = await BountyImageService.uploadAndSaveBountyImage(
          selectedFile,
          bountyId,
          bountyName,
        );
        setUploadProgress(100);
      } else {
        // Use URL directly
        if (currentImageUrl) {
          // Update existing image
          await BountyImageService.updateBountyImage(bountyId, imageUrl);
        } else {
          // Add new image
          await BountyImageService.addBountyImage(bountyId, imageUrl);
        }
        finalImageUrl = imageUrl;
      }

      setCurrentImageUrl(finalImageUrl);
      setShowImageForm(false);
      setSelectedFile(null);
      setImageUrl("");
      onAttributesUpdated();
    } catch (err) {
      console.error("Error saving image:", err);
      setError(
        `Failed to save image: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    } finally {
      setImageLoading(false);
      setUploadProgress(0);
    }
  };

  const handleImageCancel = () => {
    setShowImageForm(false);
    setImageUrl("");
    setSelectedFile(null);
    setUploadMethod("url");
    setError(null);
  };

  // Hint handling functions
  const handleAddHint = () => {
    setEditingHint(null);
    setHintFormData({
      hint: "",
      type: "tip",
    });
    setShowHintForm(true);
  };

  const handleEditHint = (hint: BountyHint) => {
    setEditingHint(hint);
    setHintFormData({
      hint: hint.hint,
      type: hint.type,
    });
    setShowHintForm(true);
  };

  const handleDeleteHint = async (hintIndex: number) => {
    console.log("DEBUG: handleDeleteHint called with hintIndex:", hintIndex);

    if (!window.confirm("Are you sure you want to delete this hint?")) {
      return;
    }

    try {
      setHintLoading(true);
      console.log("DEBUG: About to call deleteHintByIndex with:", hintIndex);
      await BountyHintsService.deleteHintByIndex(bountyId, hintIndex);
      console.log("DEBUG: deleteHintByIndex completed successfully");
      await loadData();
      onAttributesUpdated();
    } catch (err) {
      console.error("Error deleting hint:", err);
      setError(
        `Failed to delete hint: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    } finally {
      setHintLoading(false);
    }
  };

  const handleDeleteAllHints = async () => {
    if (
      !window.confirm(
        "Are you sure you want to delete ALL hints for this bounty? This action cannot be undone.",
      )
    ) {
      return;
    }

    try {
      setHintLoading(true);
      await BountyHintsService.deleteAllBountyHints(bountyId);
      await loadData();
      onAttributesUpdated();
    } catch (err) {
      console.error("Error deleting all hints:", err);
      setError(
        `Failed to delete all hints: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    } finally {
      setHintLoading(false);
    }
  };

  const handleHintSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!hintFormData.hint.trim()) {
      setError("Please enter a hint");
      return;
    }

    console.log("DEBUG: handleHintSubmit called", {
      isEditing: !!editingHint,
      editingHintId: editingHint?.id,
      bountyId,
      hint: hintFormData.hint,
      type: hintFormData.type,
    });

    try {
      setHintLoading(true);
      setError(null);

      if (editingHint) {
        console.log("DEBUG: Updating existing hint with ID:", editingHint.id);
        // Update existing hint
        await BountyHintsService.updateBountyHint(
          editingHint.id!,
          hintFormData.hint,
          hintFormData.type,
        );
        console.log("DEBUG: Update completed successfully");
      } else {
        console.log("DEBUG: Adding new hint for bountyId:", bountyId);
        // Add new hint
        const newHint = await BountyHintsService.addBountyHint(
          bountyId,
          hintFormData.hint,
          hintFormData.type,
        );
        console.log("DEBUG: Add completed successfully, new hint:", newHint);
      }

      await loadData();
      setShowHintForm(false);
      setEditingHint(null);
      onAttributesUpdated();
    } catch (err) {
      console.error("Error saving hint:", err);
      setError(
        `Failed to save hint: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    } finally {
      setHintLoading(false);
    }
  };

  const handleHintCancel = () => {
    setShowHintForm(false);
    setEditingHint(null);
    setHintFormData({
      hint: "",
      type: "tip",
    });
    setError(null);
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
          formData.value,
        );
      } else {
        // Add new attribute
        await AttributesService.addBountyAttribute(
          bountyId,
          formData.attributeId,
          formData.type,
          formData.value,
        );
      }

      await loadData();
      onAttributesUpdated();
      setShowAddForm(false);
      setEditingAttribute(null);
    } catch (err) {
      console.error("Error saving attribute:", err);
      setError("Failed to save attribute");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setEditingAttribute(null);
    setFormData({
      attributeId: "",
      type: "",
      value: 1,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="attributes-modal-overlay">
      <div className="attributes-modal">
        <div className={`attributes-modal-header ${mode}-mode`}>
          <h2>
            {mode === "add"
              ? "Add Attributes, Image & Hints"
              : "Edit Attributes, Image & Hints"}
          </h2>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="attributes-modal-content">
          <div className="bounty-info">
            <h3>{bountyName}</h3>
            <p>Bounty ID: {bountyId}</p>
          </div>

          {error && <div className="error-message">{error}</div>}

          {loading && <div className="loading-message">Loading...</div>}

          {/* Image Section */}
          {!showImageForm && (
            <div className="image-section">
              <div className="section-header">
                <h3>Bounty Image</h3>
                {currentImageUrl ? (
                  <button
                    className="edit-button"
                    onClick={handleEditImage}
                    disabled={imageLoading}
                  >
                    Edit Image
                  </button>
                ) : (
                  <button
                    className="add-button"
                    onClick={handleAddImage}
                    disabled={imageLoading}
                  >
                    + Add Image
                  </button>
                )}
              </div>

              {currentImageUrl ? (
                <div className="current-image">
                  <img
                    src={currentImageUrl}
                    alt="Bounty"
                    className="bounty-image"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      e.currentTarget.nextElementSibling?.classList.remove(
                        "hidden",
                      );
                    }}
                  />
                  <div className="image-error hidden">
                    <p>Failed to load image</p>
                  </div>
                  <div className="image-actions">
                    <button
                      className="delete-button"
                      onClick={handleDeleteImage}
                      disabled={imageLoading}
                    >
                      Delete Image
                    </button>
                  </div>
                </div>
              ) : (
                <div className="no-image">
                  <p>No image assigned to this bounty.</p>
                </div>
              )}
            </div>
          )}

          {/* Image Form */}
          {showImageForm && (
            <div className="image-form">
              <h3>{currentImageUrl ? "Edit Image" : "Add Image"}</h3>

              <form onSubmit={handleImageSubmit}>
                <div className="upload-method-selector">
                  <label>
                    <input
                      type="radio"
                      name="uploadMethod"
                      value="url"
                      checked={uploadMethod === "url"}
                      onChange={() => setUploadMethod("url")}
                    />
                    Enter Image URL
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="uploadMethod"
                      value="file"
                      checked={uploadMethod === "file"}
                      onChange={() => setUploadMethod("file")}
                    />
                    Upload File
                  </label>
                </div>

                {uploadMethod === "url" ? (
                  <div className="form-group">
                    <label htmlFor="imageUrl">Image URL:</label>
                    <input
                      type="url"
                      id="imageUrl"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://example.com/image.jpg"
                      required={uploadMethod === "url"}
                    />
                  </div>
                ) : (
                  <div className="form-group">
                    <label htmlFor="imageFile">Select Image File:</label>
                    <input
                      type="file"
                      id="imageFile"
                      accept="image/*"
                      onChange={handleFileSelect}
                      required={uploadMethod === "file"}
                    />
                    {selectedFile && (
                      <div className="file-info">
                        <p>Selected: {selectedFile.name}</p>
                        <p>
                          Size: {(selectedFile.size / 1024 / 1024).toFixed(2)}{" "}
                          MB
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="upload-progress">
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                    <p>Uploading... {uploadProgress}%</p>
                  </div>
                )}

                <div className="form-actions">
                  <button
                    type="button"
                    className="cancel-button"
                    onClick={handleImageCancel}
                    disabled={imageLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="save-button"
                    disabled={
                      imageLoading ||
                      (uploadMethod === "url" && !imageUrl.trim()) ||
                      (uploadMethod === "file" && !selectedFile)
                    }
                  >
                    {imageLoading
                      ? "Saving..."
                      : currentImageUrl
                        ? "Update"
                        : "Add"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Attributes Section */}
          {!showAddForm && (
            <div className="attributes-section">
              <div className="section-header">
                <h3>
                  {mode === "add" ? "Add New Attributes" : "Current Attributes"}
                </h3>
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
                  <p>
                    {mode === "add"
                      ? "Ready to add attributes to this bounty."
                      : "No attributes assigned to this bounty yet."}
                  </p>
                  <div className="add-options">
                    <button
                      className="generate-button"
                      onClick={handleGenerateAttributes}
                      disabled={generatingAttributes || loading}
                    >
                      {generatingAttributes
                        ? "Generating..."
                        : "🎲 Generate Attributes"}
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
                </div>
              ) : (
                <div className="attributes-list">
                  {bountyAttributes.map((attr) => (
                    <div
                      key={`${attr.bounty_id}-${attr.attribute_id}`}
                      className="attribute-item"
                    >
                      <div className="attribute-info">
                        <span className="attribute-name">
                          {attr.attribute?.key || "Unknown"}
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
              <h3>
                {editingAttribute
                  ? "Edit Attribute"
                  : mode === "add"
                    ? "Add New Attribute"
                    : "Add Attribute"}
              </h3>

              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="attributeId">Select Attribute:</label>
                  {availableAttributes.length === 0 ? (
                    <div className="no-attributes-available">
                      <p>
                        All attributes for this bucket are already assigned to
                        this bounty.
                      </p>
                    </div>
                  ) : (
                    <div className="attribute-selection">
                      {availableAttributes.map((attr) => (
                        <div
                          key={attr.id}
                          className={`attribute-option ${formData.attributeId === attr.id ? "selected" : ""}`}
                          onClick={() =>
                            setFormData({ ...formData, attributeId: attr.id })
                          }
                        >
                          <div className="attribute-option-header">
                            <span className="attribute-key">{attr.key}</span>
                            {formData.attributeId === attr.id && (
                              <span className="selected-indicator">✓</span>
                            )}
                          </div>
                          {attr.description && (
                            <p className="attribute-description">
                              {attr.description}
                            </p>
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
                            <span className="attribute-description">
                              {" "}
                              - {attr.description}
                            </span>
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
                      if (
                        !["plus", "minus"].includes(newType.toLowerCase()) &&
                        newValue === 0
                      ) {
                        newValue = 1; // Default to 1 if switching to default range with 0
                      }

                      setFormData({
                        ...formData,
                        type: newType,
                        value: newValue,
                      });
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
                      let newValue =
                        parseInt(e.target.value) || valueConstraints.min;

                      // Prevent 0 for default range (when type is not plus or minus)
                      if (
                        !["plus", "minus"].includes(
                          formData.type.toLowerCase(),
                        ) &&
                        newValue === 0
                      ) {
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
                      {formData.type.toLowerCase() === "plus" &&
                        "Range: 1 to 3"}
                      {formData.type.toLowerCase() === "minus" &&
                        "Range: -3 to -1"}
                      {!["plus", "minus"].includes(
                        formData.type.toLowerCase(),
                      ) && "Range: -3 to 3 (excluding 0)"}
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
                    {loading
                      ? "Saving..."
                      : editingAttribute
                        ? "Update"
                        : "Add"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Hints Section */}
          {!showHintForm && (
            <div className="hints-section">
              <div className="section-header">
                <h3>Bounty Hints</h3>
                <div className="hints-header-actions">
                  <button
                    className="add-button"
                    onClick={handleAddHint}
                    disabled={hintLoading}
                  >
                    Add Hint
                  </button>
                  {hints.length > 0 && (
                    <button
                      className="delete-all-button"
                      onClick={handleDeleteAllHints}
                      disabled={hintLoading}
                      title="Delete all hints for this bounty"
                    >
                      Delete All
                    </button>
                  )}
                </div>
              </div>

              {hints.length === 0 ? (
                <div className="no-hints">
                  <div className="empty-state">
                    <span className="empty-icon">💡</span>
                    <p>No hints added yet</p>
                    <small>
                      Add helpful tips and information for this bounty
                    </small>
                  </div>
                </div>
              ) : (
                <div className="hints-list">
                  {hints.map((hint, index) => (
                    <div
                      key={`hint-${index}`}
                      className={`hint-item hint-${hint.type}`}
                    >
                      <div className="hint-content">
                        <div className="hint-type-icon">
                          {hint.type === "tip" && "💡"}
                          {hint.type === "warning" && "⚠️"}
                          {hint.type === "info" && "ℹ️"}
                        </div>
                        <div className="hint-text">
                          <p>{hint.hint}</p>
                          <small className="hint-meta">
                            {hint.type} •{" "}
                            {new Date(hint.created_at).toLocaleDateString()}
                          </small>
                        </div>
                      </div>
                      <div className="hint-actions">
                        <button
                          className="edit-button"
                          onClick={() => handleEditHint(hint)}
                          disabled={hintLoading}
                        >
                          Edit
                        </button>
                        <button
                          className="delete-button"
                          onClick={() => {
                            console.log(
                              "DEBUG: Delete button clicked for hint at index:",
                              index,
                            );
                            handleDeleteHint(index);
                          }}
                          disabled={hintLoading}
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

          {showHintForm && (
            <div className="hint-form">
              <h3>{editingHint ? "Edit Hint" : "Add New Hint"}</h3>

              <form onSubmit={handleHintSubmit}>
                <div className="form-group">
                  <label htmlFor="hintType">Hint Type:</label>
                  <select
                    id="hintType"
                    value={hintFormData.type}
                    onChange={(e) =>
                      setHintFormData({
                        ...hintFormData,
                        type: e.target.value as "tip" | "warning" | "info",
                      })
                    }
                    required
                  >
                    <option value="tip">💡 Tip</option>
                    <option value="warning">⚠️ Warning</option>
                    <option value="info">ℹ️ Info</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="hintText">Hint Text:</label>
                  <textarea
                    id="hintText"
                    value={hintFormData.hint}
                    onChange={(e) =>
                      setHintFormData({ ...hintFormData, hint: e.target.value })
                    }
                    placeholder="Enter helpful tip or information..."
                    rows={4}
                    required
                  />
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    className="cancel-button"
                    onClick={handleHintCancel}
                    disabled={hintLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="save-button"
                    disabled={hintLoading || !hintFormData.hint.trim()}
                  >
                    {hintLoading
                      ? "Saving..."
                      : editingHint
                        ? "Update Hint"
                        : "Add Hint"}
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
