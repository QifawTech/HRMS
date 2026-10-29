import { useState, useEffect, useCallback } from "react";
import {
  Building2,
  Plus,
  Search,
  Edit2,
  Trash2,
  Users,
  Calendar,
} from "lucide-react";
import Layout from "../../components/layout/Layout";
import Modal from "../../components/common/Modal";
import Toast from "../../components/common/Toast";
import * as api from "../../api/departmentApi";
import { formatDateTime } from "../../utils/dateUtils";

const FONT = "'Inter', 'Segoe UI', -apple-system, sans-serif";

const Departments = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.listDepartments(search);
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setToast({ message: "Failed to load departments", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: "", description: "" });
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({ name: item.name, description: item.description || "" });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await api.updateDepartment(editing._id, form);
        setToast({
          message: "Department updated successfully",
          type: "success",
        });
      } else {
        await api.createDepartment(form);
        setToast({
          message: "Department created successfully",
          type: "success",
        });
      }
      setModalOpen(false);
      load();
    } catch (err) {
      setToast({
        message: err.response?.data?.error || "Operation failed",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!confirmDelete) return;
    try {
      await api.deactivateDepartment(confirmDelete._id);
      setToast({ message: "Department deactivated", type: "success" });
      setConfirmDelete(null);
      load();
    } catch (err) {
      setToast({
        message: err.response?.data?.error || "Failed to deactivate",
        type: "error",
      });
    }
  };

  return (
    <Layout>
      <div style={{ fontFamily: FONT }}>
        {/* Header */}
        <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
          <div>
            <h1 className="erp-page-title">Departments</h1>
            <p className="erp-page-subtitle mb-0">
              Manage your organization departments
            </p>
          </div>
          <button
            className="erp-btn erp-btn-primary"
            onClick={openAdd}
            style={{ fontFamily: FONT }}
          >
            <Plus size={15} /> Add Department
          </button>
        </div>

        {/* Search */}
        <div className="erp-card mb-3" style={{ padding: 12 }}>
          <div className="erp-input-wrapper">
            <Search size={16} className="erp-input-icon" />
            <input
              className="erp-input"
              placeholder="Search departments..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ fontFamily: FONT }}
            />
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div
            className="erp-card text-center py-5"
            style={{ color: "#6b7280", fontFamily: FONT }}
          >
            <div className="spinner-border spinner-border-sm me-2" />
            Loading departments...
          </div>
        ) : items.length === 0 ? (
          <div className="erp-card text-center py-5" style={{ fontFamily: FONT }}>
            <Building2 size={42} color="#d1d5db" style={{ marginBottom: 12 }} />
            <h5 style={{ fontWeight: 600 }}>
              {search ? "No departments found" : "No departments yet"}
            </h5>
            <p style={{ color: "#6b7280", marginBottom: 16 }}>
              {search
                ? "Try a different search term"
                : "Get started by creating your first department"}
            </p>
            {!search && (
              <button
                className="erp-btn erp-btn-primary"
                onClick={openAdd}
                style={{ fontFamily: FONT }}
              >
                <Plus size={15} /> Add Department
              </button>
            )}
          </div>
        ) : (
          <div className="row g-3">
            {items.map((d) => (
              <div className="col-12 col-sm-6 col-lg-4" key={d._id}>
                <div
                  className="erp-card h-100 d-flex flex-column"
                  style={{ fontFamily: FONT }}
                >
                  {/* Header: Icon + Name + Description */}
                  <div className="d-flex align-items-start gap-3 mb-3">
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 10,
                        backgroundColor: "#eef2ff",
                        color: "#4f46e5",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Building2 size={20} />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <h5
                        style={{
                          fontWeight: 700,
                          margin: 0,
                          fontSize: 15,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {d.name}
                      </h5>
                      <p
                        style={{
                          color: "#6b7280",
                          margin: 0,
                          marginTop: 3,
                          fontSize: 12.5,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          lineHeight: 1.4,
                        }}
                      >
                        {d.description || "No description"}
                      </p>
                    </div>
                  </div>

                  {/* Employee count */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      color: "#6b7280",
                      fontSize: 12.5,
                      marginBottom: 6,
                    }}
                  >
                    <Users size={14} />
                    <span>
                      {d.employee_count || 0}{" "}
                      {d.employee_count === 1 ? "employee" : "employees"}
                    </span>
                  </div>

                  {/* Created date */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      color: "#9ca3af",
                      fontSize: 11.5,
                      marginBottom: 12,
                    }}
                  >
                    <Calendar size={13} />
                    <span>Created: {formatDateTime(d.created_at)}</span>
                  </div>

                  {/* Actions */}
                  <div className="d-flex gap-2 mt-auto">
                    <button
                      className="erp-btn erp-btn-outline flex-fill justify-content-center"
                      onClick={() => openEdit(d)}
                      style={{ fontFamily: FONT, fontSize: 13 }}
                    >
                      <Edit2 size={13} /> Edit
                    </button>
                    <button
                      className="erp-btn erp-btn-outline"
                      onClick={() => setConfirmDelete(d)}
                      style={{
                        color: "#ef4444",
                        fontFamily: FONT,
                        padding: "8px 12px",
                      }}
                      title="Deactivate"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit Department" : "Add New Department"}
        footer={
          <>
            <button
              className="erp-btn erp-btn-outline"
              onClick={() => setModalOpen(false)}
              style={{ fontFamily: FONT }}
            >
              Cancel
            </button>
            <button
              className="erp-btn erp-btn-primary"
              onClick={handleSubmit}
              disabled={saving}
              style={{ fontFamily: FONT }}
            >
              {saving ? "Saving..." : editing ? "Update" : "Create"}
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmit} style={{ fontFamily: FONT }}>
          <div className="mb-3">
            <label className="erp-label">Department Name *</label>
            <input
              className="erp-input"
              placeholder="e.g., Engineering"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              autoFocus
              required
              style={{ fontFamily: FONT }}
            />
          </div>
          <div className="mb-3">
            <label className="erp-label">Description</label>
            <textarea
              className="erp-input"
              rows={3}
              placeholder="Short description (optional)"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              style={{ resize: "vertical", fontFamily: FONT }}
            />
          </div>
        </form>
      </Modal>

      {/* Confirm Deactivate */}
      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Deactivate Department?"
        footer={
          <>
            <button
              className="erp-btn erp-btn-outline"
              onClick={() => setConfirmDelete(null)}
              style={{ fontFamily: FONT }}
            >
              Cancel
            </button>
            <button
              className="erp-btn erp-btn-danger"
              onClick={handleDeactivate}
              style={{ fontFamily: FONT }}
            >
              Yes, Deactivate
            </button>
          </>
        }
      >
        <p style={{ margin: 0, color: "#6b7280", fontFamily: FONT }}>
          Are you sure you want to deactivate{" "}
          <strong style={{ color: "#111827" }}>{confirmDelete?.name}</strong>?
          This can be reversed later.
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

export default Departments;