import { useState, useEffect, useCallback } from "react";
import {
  FileText,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
  User,
  FolderOpen,
  Eye,
  Shield,
} from "lucide-react";
import Layout from "../../components/layout/Layout";
import Modal from "../../components/common/Modal";
import Toast from "../../components/common/Toast";
import * as api from "../../api/documentApi";
import { formatDateTime } from "../../utils/dateUtils";

const FONT = "'Calibri', 'Segoe UI', -apple-system, sans-serif";

const formatSize = (b) => {
  if (!b) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${Math.round(b / 1024)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
};

const categoryColors = {
  Resume: { bg: "#eef2ff", color: "#4338ca" },
  "ID Proof": { bg: "#fef3c7", color: "#92400e" },
  "Offer Letter": { bg: "#ecfdf5", color: "#065f46" },
  Certificate: { bg: "#dbeafe", color: "#1e40af" },
  "Joining Document": { bg: "#e0e7ff", color: "#3730a3" },
  "Personal Document": { bg: "#fce7f3", color: "#9f1239" },
  Other: { bg: "#f3f4f6", color: "#4b5563" },
};

const getCategoryStyle = (cat) =>
  categoryColors[cat] || { bg: "#f3f4f6", color: "#4b5563" };

const emptyForm = {
  doc_category: "",
  doc_name: "",
  description: "",
};

const EmployeeDocuments = () => {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({});
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterUploadedBy, setFilterUploadedBy] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  // ============================================
  // Load documents
  // ============================================
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dRes, sRes] = await Promise.all([
        api.getMyDocuments(filterCategory, search, filterUploadedBy),
        api.getMyDocumentStats(),
      ]);
      setItems(Array.isArray(dRes.data) ? dRes.data : []);
      setStats(sRes.data || {});
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filterCategory, search, filterUploadedBy]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    api
      .getCategories()
      .then((res) => setCategories(res.data.employee || []))
      .catch(() => {});
  }, []);

  // ============================================
  // Handlers
  // ============================================
  const openAdd = () => {
    setForm(emptyForm);
    setFile(null);
    setModalOpen(true);
  };

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      setToast({ message: "File too large (max 5MB)", type: "error" });
      return;
    }
    setFile(f);
  };

  const handleSubmit = async () => {
    if (!form.doc_category) {
      setToast({ message: "Select category", type: "error" });
      return;
    }
    if (!form.doc_name.trim()) {
      setToast({ message: "Document name is required", type: "error" });
      return;
    }
    if (!file) {
      setToast({ message: "Please select a file", type: "error" });
      return;
    }

    setSaving(true);
    try {
      setUploading(true);
      const uploadRes = await api.uploadFile(file);
      setUploading(false);

      await api.createMyDocument({
        doc_category: form.doc_category,
        doc_name: form.doc_name,
        description: form.description,
        ...uploadRes.data,
      });

      setToast({ message: "Document uploaded!", type: "success" });
      setModalOpen(false);
      load();
    } catch (err) {
      setToast({
        message: err.response?.data?.error || "Failed to upload",
        type: "error",
      });
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await api.deleteMyDocument(confirmDelete._id);
      setToast({ message: "Document deleted", type: "success" });
      setConfirmDelete(null);
      load();
    } catch (err) {
      setToast({
        message: err.response?.data?.error || "Failed to delete",
        type: "error",
      });
    }
  };

  const clearFilters = () => {
    setSearch("");
    setFilterCategory("");
    setFilterUploadedBy("");
  };

  const hasFilters = search || filterCategory || filterUploadedBy;

  return (
    <Layout>
      <div style={{ fontFamily: FONT }}>
        {/* ============================================
            Header
            ============================================ */}
        <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-4">
          <div>
            <h1 className="erp-page-title">My Documents</h1>
            <p className="erp-page-subtitle mb-0">
              Your personal documents and records
            </p>
          </div>
          <button className="erp-btn erp-btn-primary" onClick={openAdd}>
            <Plus size={15} /> Upload Document
          </button>
        </div>

        {/* ============================================
            Stats
            ============================================ */}
        <div className="row g-3 mb-4">
          <div className="col-12 col-md-4">
            <div className="erp-card erp-stat-card">
              <div>
                <p className="erp-stat-label">Total Documents</p>
                <p className="erp-stat-value">{stats.total || 0}</p>
              </div>
              <div
                className="erp-stat-icon"
                style={{ background: "#eef2ff", color: "#4f46e5" }}
              >
                <FolderOpen size={20} />
              </div>
            </div>
          </div>
        </div>

        {/* ============================================
            Filters
            ============================================ */}
        <div className="erp-card mb-3" style={{ padding: 12 }}>
          <div className="row g-2 align-items-center">
            <div className="col-12 col-md-5">
              <div className="erp-input-wrapper">
                <Search size={16} className="erp-input-icon" />
                <input
                  className="erp-input"
                  placeholder="Search documents..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ fontFamily: FONT }}
                />
              </div>
            </div>
            <div className="col-6 col-md-3">
              <select
                className="erp-input"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                style={{ fontFamily: FONT }}
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-6 col-md-3">
              <select
                className="erp-input"
                value={filterUploadedBy}
                onChange={(e) => setFilterUploadedBy(e.target.value)}
                style={{ fontFamily: FONT }}
              >
                <option value="">All Documents</option>
                <option value="MANAGER">From Manager</option>
                <option value="EMPLOYEE">Uploaded by Me</option>
              </select>
            </div>
            <div className="col-12 col-md-1 text-end">
              {hasFilters && (
                <button
                  className="erp-btn erp-btn-outline w-100"
                  onClick={clearFilters}
                  title="Clear filters"
                  style={{
                    padding: "8px",
                    fontFamily: FONT,
                    justifyContent: "center",
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ============================================
            Table
            ============================================ */}
        {loading ? (
          <div
            className="erp-card text-center py-5"
            style={{ color: "#6b7280", fontFamily: FONT }}
          >
            <div className="spinner-border spinner-border-sm me-2" />
            Loading documents...
          </div>
        ) : items.length === 0 ? (
          <div className="erp-card text-center py-5">
            <FolderOpen
              size={42}
              color="#d1d5db"
              style={{ marginBottom: 12 }}
            />
            <h5 style={{ fontWeight: 600, fontFamily: FONT }}>
              {hasFilters
                ? "No documents match your filters"
                : "No documents yet"}
            </h5>
            <p
              style={{
                color: "#6b7280",
                marginBottom: 16,
                fontFamily: FONT,
                fontSize: 13,
              }}
            >
              {hasFilters
                ? "Try adjusting your search or filters"
                : "Upload your personal documents"}
            </p>
            {hasFilters ? (
              <button
                className="erp-btn erp-btn-outline"
                onClick={clearFilters}
                style={{ fontFamily: FONT }}
              >
                Clear Filters
              </button>
            ) : (
              <button
                className="erp-btn erp-btn-primary"
                onClick={openAdd}
                style={{ fontFamily: FONT }}
              >
                <Plus size={15} /> Upload Document
              </button>
            )}
          </div>
        ) : (
          <div
            className="erp-card"
            style={{ padding: 0, overflow: "hidden" }}
          >
            <div className="table-responsive">
              <table
                className="erp-table"
                style={{ fontFamily: FONT, width: "100%" }}
              >
                <thead>
                  <tr>
                    <th style={{ minWidth: 220 }}>Document</th>
                    <th style={{ minWidth: 140 }}>Category</th>
                    <th style={{ minWidth: 180 }}>File</th>
                    <th style={{ minWidth: 180 }}>Source</th>
                    <th style={{ width: 130 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((doc) => {
                    const catStyle = getCategoryStyle(doc.doc_category);
                    const isEmployeeUpload =
                      doc.uploaded_by_role === "EMPLOYEE";

                    return (
                      <tr key={doc._id}>
                        {/* Document name + description */}
                        <td>
                          <div
                            style={{ fontWeight: 600, fontSize: 13.5 }}
                          >
                            {doc.doc_name}
                          </div>
                          {doc.description && (
                            <div
                              style={{
                                fontSize: 11.5,
                                color: "#6b7280",
                                marginTop: 2,
                                maxWidth: 280,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {doc.description}
                            </div>
                          )}
                        </td>

                        {/* Category */}
                        <td>
                          <span
                            className="erp-badge"
                            style={{
                              background: catStyle.bg,
                              color: catStyle.color,
                              fontWeight: 600,
                              fontSize: 11,
                            }}
                          >
                            {doc.doc_category}
                          </span>
                        </td>

                        {/* File info */}
                        <td>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <FileText
                              size={14}
                              color="#6b7280"
                              style={{ flexShrink: 0 }}
                            />
                            <div style={{ minWidth: 0 }}>
                              <div
                                style={{
                                  fontSize: 12,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                  maxWidth: 170,
                                  fontWeight: 500,
                                }}
                                title={doc.file_name}
                              >
                                {doc.file_name}
                              </div>
                              <div
                                style={{
                                  fontSize: 10.5,
                                  color: "#9ca3af",
                                }}
                              >
                                {formatSize(doc.file_size)}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Source — Manager or Me */}
                        <td>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              marginBottom: 3,
                            }}
                          >
                            {isEmployeeUpload ? (
                              <span
                                className="erp-badge"
                                style={{
                                  background: "#fce7f3",
                                  color: "#9f1239",
                                  fontSize: 10,
                                  fontWeight: 700,
                                }}
                              >
                                <User size={9} /> By Me
                              </span>
                            ) : (
                              <span
                                className="erp-badge"
                                style={{
                                  background: "#ecfdf5",
                                  color: "#065f46",
                                  fontSize: 10,
                                  fontWeight: 700,
                                }}
                              >
                                <Shield size={9} /> From Manager
                              </span>
                            )}
                          </div>
                          <div
                            style={{ fontSize: 11, color: "#6b7280" }}
                          >
                            {doc.uploaded_by_name}
                          </div>
                          <div
                            style={{ fontSize: 10, color: "#9ca3af" }}
                          >
                            {formatDateTime(doc.created_at).split(",")[0]}
                          </div>
                        </td>

                        {/* Actions */}
                        <td>
                          <div className="d-flex gap-1">
                            <a
                              href={api.documentFileUrl(doc.file_id)}
                              target="_blank"
                              rel="noreferrer"
                              className="erp-icon-btn"
                              title="View / Download"
                              style={{
                                padding: 6,
                                color: "#4f46e5",
                                textDecoration: "none",
                              }}
                            >
                              <Eye size={13} />
                            </a>
                            {isEmployeeUpload && (
                              <button
                                className="erp-icon-btn erp-icon-btn-danger"
                                onClick={() => setConfirmDelete(doc)}
                                title="Delete"
                                style={{ padding: 6 }}
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ============================================
          Upload Modal
          ============================================ */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Upload Document"
        footer={
          <>
            <button
              className="erp-btn erp-btn-outline"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </button>
            <button
              className="erp-btn erp-btn-primary"
              onClick={handleSubmit}
              disabled={saving || uploading}
            >
              {uploading
                ? "Uploading..."
                : saving
                ? "Saving..."
                : "Upload"}
            </button>
          </>
        }
      >
        <div className="mb-3">
          <label className="erp-label">Category *</label>
          <select
            className="erp-input"
            value={form.doc_category}
            onChange={(e) =>
              setForm({ ...form, doc_category: e.target.value })
            }
            style={{ fontFamily: FONT }}
          >
            <option value="">Select Category</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-3">
          <label className="erp-label">Document Name *</label>
          <input
            className="erp-input"
            placeholder="e.g., Aadhaar Card, 10th Certificate"
            value={form.doc_name}
            onChange={(e) =>
              setForm({ ...form, doc_name: e.target.value })
            }
            style={{ fontFamily: FONT }}
          />
        </div>

        <div className="mb-3">
          <label className="erp-label">Description (Optional)</label>
          <textarea
            className="erp-input"
            rows={2}
            placeholder="Notes..."
            value={form.description}
            onChange={(e) =>
              setForm({ ...form, description: e.target.value })
            }
            style={{ resize: "vertical", fontFamily: FONT }}
          />
        </div>

        <div>
          <label className="erp-label">File * (Max 5MB)</label>
          {!file ? (
            <label
              htmlFor="emp-doc-file"
              style={{
                display: "block",
                border: "2px dashed #d1d5db",
                borderRadius: 10,
                padding: 20,
                textAlign: "center",
                cursor: "pointer",
                background: "#fafafa",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.borderColor = "#4f46e5")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.borderColor = "#d1d5db")
              }
            >
              <Upload size={22} color="#6b7280" />
              <div
                style={{
                  marginTop: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: FONT,
                }}
              >
                Click to select file
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "#6b7280",
                  marginTop: 2,
                  fontFamily: FONT,
                }}
              >
                PDF, DOC, Image, ZIP · Max 5MB
              </div>
            </label>
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                background: "#f9fafb",
                border: "1px solid var(--border)",
                borderRadius: 8,
              }}
            >
              <FileText size={18} color="#4f46e5" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    fontFamily: FONT,
                  }}
                >
                  {file.name}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "#6b7280",
                    fontFamily: FONT,
                  }}
                >
                  {formatSize(file.size)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFile(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "#9ca3af",
                  padding: 4,
                }}
              >
                <X size={14} />
              </button>
            </div>
          )}
          <input
            id="emp-doc-file"
            type="file"
            style={{ display: "none" }}
            onChange={handleFileChange}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.txt,.zip"
          />
        </div>
      </Modal>

      {/* ============================================
          Confirm Delete
          ============================================ */}
      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete Document?"
        footer={
          <>
            <button
              className="erp-btn erp-btn-outline"
              onClick={() => setConfirmDelete(null)}
            >
              Cancel
            </button>
            <button
              className="erp-btn erp-btn-danger"
              onClick={handleDelete}
            >
              Yes, Delete
            </button>
          </>
        }
      >
        <p style={{ margin: 0, color: "#6b7280", fontFamily: FONT }}>
          Delete <strong>{confirmDelete?.doc_name}</strong>? This cannot
          be undone.
        </p>
      </Modal>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </Layout>
  );
};

export default EmployeeDocuments;