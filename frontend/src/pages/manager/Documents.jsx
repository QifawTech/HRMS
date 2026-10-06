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
import * as empApi from "../../api/employeeApi";
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
  employee_id: "",
  doc_category: "",
  doc_name: "",
  description: "",
};

const ManagerDocuments = () => {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({});
  const [employees, setEmployees] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterEmployee, setFilterEmployee] = useState("");
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
        api.listDocuments(
          filterEmployee,
          filterCategory,
          search,
          filterUploadedBy
        ),
        api.getDocumentStats(),
      ]);
      setItems(Array.isArray(dRes.data) ? dRes.data : []);
      setStats(sRes.data || {});
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filterEmployee, filterCategory, search, filterUploadedBy]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  // Load employees + categories once
  useEffect(() => {
    empApi
      .listEmployees("", "", "ACTIVE")
      .then((res) => setEmployees(Array.isArray(res.data) ? res.data : []))
      .catch(() => {});
    api
      .getCategories()
      .then((res) => setCategories(res.data.manager || []))
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
    if (!form.employee_id) {
      setToast({ message: "Select employee", type: "error" });
      return;
    }
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

      await api.createDocument({
        employee_id: form.employee_id,
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
      await api.deleteDocument(confirmDelete._id);
      setToast({ message: "Document deleted", type: "success" });
      setConfirmDelete(null);
      load();
    } catch (err) {
      setToast({ message: "Failed to delete", type: "error" });
    }
  };

  const clearFilters = () => {
    setSearch("");
    setFilterEmployee("");
    setFilterCategory("");
    setFilterUploadedBy("");
  };

  const hasFilters =
    search || filterEmployee || filterCategory || filterUploadedBy;

  const selectedEmployee = employees.find((e) => e._id === filterEmployee);

  return (
    <Layout>
      <div style={{ fontFamily: FONT }}>
        {/* ============================================
            Header
            ============================================ */}
        <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-4">
          <div>
            <h1 className="erp-page-title">Documents</h1>
            <p className="erp-page-subtitle mb-0">
              Upload and manage employee documents
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
          <div className="col-6 col-md-4">
            <div className="erp-card erp-stat-card">
              <div>
                <p className="erp-stat-label">Manager Uploads</p>
                <p className="erp-stat-value">
                  {stats.manager_uploaded || 0}
                </p>
              </div>
              <div
                className="erp-stat-icon"
                style={{ background: "#ecfdf5", color: "#059669" }}
              >
                <Shield size={20} />
              </div>
            </div>
          </div>
          <div className="col-6 col-md-4">
            <div className="erp-card erp-stat-card">
              <div>
                <p className="erp-stat-label">Employee Uploads</p>
                <p className="erp-stat-value">
                  {stats.employee_uploaded || 0}
                </p>
              </div>
              <div
                className="erp-stat-icon"
                style={{ background: "#fef3c7", color: "#d97706" }}
              >
                <User size={20} />
              </div>
            </div>
          </div>
        </div>

        {/* ============================================
            Filters
            ============================================ */}
        <div className="erp-card mb-3" style={{ padding: 12 }}>
          <div className="row g-2 align-items-center">
            <div className="col-12 col-md-4">
              <div className="erp-input-wrapper">
                <Search size={16} className="erp-input-icon" />
                <input
                  className="erp-input"
                  placeholder="Search by document name or file..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ fontFamily: FONT }}
                />
              </div>
            </div>
            <div className="col-6 col-md-3">
              <select
                className="erp-input"
                value={filterEmployee}
                onChange={(e) => setFilterEmployee(e.target.value)}
                style={{ fontFamily: FONT }}
              >
                <option value="">All Employees</option>
                {employees.map((emp) => (
                  <option key={emp._id} value={emp._id}>
                    {emp.first_name} {emp.last_name}
                  </option>
                ))}
              </select>
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
            <div className="col-6 col-md-2">
              <select
                className="erp-input"
                value={filterUploadedBy}
                onChange={(e) => setFilterUploadedBy(e.target.value)}
                style={{ fontFamily: FONT }}
              >
                <option value="">All Uploads</option>
                <option value="MANAGER">Manager</option>
                <option value="EMPLOYEE">Employee</option>
              </select>
            </div>
            <div className="col-6 col-md-2 text-end">
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
                  <X size={14} /> Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ============================================
            Active Employee Filter Chip
            ============================================ */}
        {filterEmployee && selectedEmployee && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 14px",
              background: "#eef2ff",
              border: "1px solid #c7d2fe",
              borderRadius: 10,
              marginBottom: 12,
              fontFamily: FONT,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {selectedEmployee.first_name?.[0]}
              {selectedEmployee.last_name?.[0]}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: "#4338ca",
                  textTransform: "uppercase",
                  letterSpacing: 0.4,
                  marginBottom: 2,
                }}
              >
                Showing documents for
              </div>
              <div
                style={{
                  fontSize: 13.5,
                  fontWeight: 700,
                  color: "#111827",
                }}
              >
                {selectedEmployee.first_name} {selectedEmployee.last_name}
                <span
                  style={{
                    fontSize: 11.5,
                    color: "#6b7280",
                    fontWeight: 500,
                    marginLeft: 6,
                  }}
                >
                  ({selectedEmployee.employee_code})
                </span>
              </div>
            </div>
            <button
              onClick={() => setFilterEmployee("")}
              style={{
                background: "white",
                border: "1px solid #c7d2fe",
                borderRadius: 8,
                cursor: "pointer",
                color: "#4338ca",
                padding: "6px 12px",
                fontSize: 11.5,
                fontWeight: 700,
                fontFamily: FONT,
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <X size={12} /> Clear
            </button>
          </div>
        )}

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
                : "Upload your first employee document"}
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
                    <th style={{ minWidth: 200 }}>Document</th>
                    <th style={{ minWidth: 200 }}>Employee</th>
                    <th style={{ minWidth: 130 }}>Category</th>
                    <th style={{ minWidth: 140 }}>File</th>
                    <th style={{ minWidth: 140 }}>Uploaded By</th>
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
                          <div style={{ fontWeight: 600, fontSize: 13.5 }}>
                            {doc.doc_name}
                          </div>
                          {doc.description && (
                            <div
                              style={{
                                fontSize: 11.5,
                                color: "#6b7280",
                                marginTop: 2,
                                maxWidth: 260,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {doc.description}
                            </div>
                          )}
                        </td>

                        {/* Employee — clickable */}
                        <td>
                          <button
                            type="button"
                            onClick={() => setFilterEmployee(doc.employee_id)}
                            title="Click to view all documents of this employee"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              background: "transparent",
                              border: "none",
                              cursor: "pointer",
                              padding: "4px 6px",
                              borderRadius: 8,
                              textAlign: "left",
                              fontFamily: FONT,
                              width: "100%",
                              transition: "all 0.15s",
                            }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.background = "#f3f4f6")
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.background = "transparent")
                            }
                          >
                            <div
                              style={{
                                width: 30,
                                height: 30,
                                borderRadius: "50%",
                                background:
                                  "linear-gradient(135deg, #6366f1, #8b5cf6)",
                                color: "white",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 11,
                                fontWeight: 700,
                                flexShrink: 0,
                                letterSpacing: "-0.3px",
                              }}
                            >
                              {doc.employee_name
                                ?.split(" ")
                                .map((n) => n[0])
                                .slice(0, 2)
                                .join("")}
                            </div>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div
                                style={{
                                  fontSize: 12.5,
                                  fontWeight: 600,
                                  color: "#4f46e5",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {doc.employee_name}
                              </div>
                              <div
                                style={{
                                  fontSize: 11,
                                  color: "#6b7280",
                                }}
                              >
                                {doc.employee_code}
                              </div>
                            </div>
                            <Eye size={12} color="#9ca3af" />
                          </button>
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
                                  maxWidth: 150,
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

                        {/* Uploaded By */}
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
                                <User size={9} /> Employee
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
                                <Shield size={9} /> Manager
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 11, color: "#6b7280" }}>
                            {doc.uploaded_by_name}
                          </div>
                          <div style={{ fontSize: 10, color: "#9ca3af" }}>
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
                            <button
                              className="erp-icon-btn erp-icon-btn-danger"
                              onClick={() => setConfirmDelete(doc)}
                              title="Delete"
                              style={{ padding: 6 }}
                            >
                              <Trash2 size={13} />
                            </button>
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
                : "Upload Document"}
            </button>
          </>
        }
      >
        <div className="mb-3">
          <label className="erp-label">Employee *</label>
          <select
            className="erp-input"
            value={form.employee_id}
            onChange={(e) =>
              setForm({ ...form, employee_id: e.target.value })
            }
            style={{ fontFamily: FONT }}
          >
            <option value="">Select Employee</option>
            {employees.map((emp) => (
              <option key={emp._id} value={emp._id}>
                {emp.first_name} {emp.last_name} ({emp.employee_code})
              </option>
            ))}
          </select>
        </div>

        <div className="row g-3 mb-3">
          <div className="col-6">
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
          <div className="col-6">
            <label className="erp-label">Document Name *</label>
            <input
              className="erp-input"
              placeholder="e.g., Aadhaar Card"
              value={form.doc_name}
              onChange={(e) =>
                setForm({ ...form, doc_name: e.target.value })
              }
              style={{ fontFamily: FONT }}
            />
          </div>
        </div>

        <div className="mb-3">
          <label className="erp-label">Description (Optional)</label>
          <textarea
            className="erp-input"
            rows={2}
            placeholder="Any notes..."
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
              htmlFor="doc-file-input"
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
                PDF, DOC, XLS, JPG, PNG, ZIP · Max 5MB
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
            id="doc-file-input"
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

export default ManagerDocuments;