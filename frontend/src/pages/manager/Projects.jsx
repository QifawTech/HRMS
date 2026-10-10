import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Users,
  Calendar,
  FolderKanban,
} from "lucide-react";
import Layout from "../../components/layout/Layout";
import Modal from "../../components/common/Modal";
import Toast from "../../components/common/Toast";
import * as api from "../../api/projectApi";
import * as empApi from "../../api/employeeApi";

const FONT = "'Inter', 'Segoe UI', -apple-system, sans-serif";

const STATUS_STYLES = {
  ACTIVE: { bg: "#f0fdf4", color: "#14532d", border: "#bbf7d0", label: "Active" },
  COMPLETED: { bg: "#eff6ff", color: "#1e3a8a", border: "#bfdbfe", label: "Completed" },
  ON_HOLD: { bg: "#fef9f3", color: "#78350f", border: "#fde68a", label: "On Hold" },
  PLANNED: { bg: "#f4f4f5", color: "#18181b", border: "#e4e4e7", label: "Planned" },
};

const formatDate = (d) => {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return d;
  }
};

const emptyForm = {
  name: "",
  code: "",
  description: "",
  client: "",
  status: "ACTIVE",
  priority: "NORMAL",
  start_date: new Date().toISOString().slice(0, 10),
  end_date: "",
  assigned_employees: [],
  progress: 0,
};

const ManagerProjects = () => {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({});
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [toast, setToast] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, sRes] = await Promise.all([
        api.listProjects(search, filterStatus),
        api.getProjectStats(),
      ]);
      setItems(Array.isArray(pRes.data) ? pRes.data : []);
      setStats(sRes.data || {});
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search, filterStatus]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    empApi
      .listEmployees("", "", "ACTIVE")
      .then((r) => setEmployees(Array.isArray(r.data) ? r.data : []))
      .catch(() => {});
  }, []);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (p) => {
    setEditing(p);
    setForm({
      name: p.name || "",
      code: p.code || "",
      description: p.description || "",
      client: p.client || "",
      status: p.status || "ACTIVE",
      priority: p.priority || "NORMAL",
      start_date: p.start_date || "",
      end_date: p.end_date || "",
      assigned_employees: p.assigned_employees || [],
      progress: p.progress || 0,
    });
    setModalOpen(true);
  };

  const toggleEmployee = (id) => {
    setForm((f) => ({
      ...f,
      assigned_employees: f.assigned_employees.includes(id)
        ? f.assigned_employees.filter((x) => x !== id)
        : [...f.assigned_employees, id],
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setToast({ message: "Project name required", type: "error" });
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await api.updateProject(editing._id, form);
        setToast({ message: "Project updated", type: "success" });
      } else {
        await api.createProject(form);
        setToast({ message: "Project created", type: "success" });
      }
      setModalOpen(false);
      load();
    } catch (err) {
      setToast({
        message: err.response?.data?.error || "Failed",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await api.deleteProject(confirmDelete._id);
      setToast({ message: "Project deleted", type: "success" });
      setConfirmDelete(null);
      load();
    } catch {
      setToast({ message: "Failed to delete", type: "error" });
    }
  };

  return (
    <Layout>
      <style>{`
        .proj-page * { font-family: ${FONT}; }
        .proj-page {
          font-family: ${FONT};
          max-width: 1200px;
          margin: 0 auto;
          color: #18181b;
          padding-bottom: 60px;
          -webkit-font-smoothing: antialiased;
        }

        /* HEADER */
        .proj-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 32px;
          flex-wrap: wrap;
          gap: 16px;
        }
        .proj-title {
          font-size: 32px;
          font-weight: 700;
          color: #09090b;
          letter-spacing: -1px;
          margin-bottom: 6px;
          line-height: 1.1;
        }
        .proj-subtitle {
          font-size: 14px;
          color: #71717a;
          margin: 0;
        }
        .proj-new-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #09090b;
          color: white;
          border: none;
          border-radius: 10px;
          padding: 10px 18px;
          font-size: 13.5px;
          font-weight: 600;
          cursor: pointer;
          font-family: ${FONT};
          transition: all 0.15s;
        }
        .proj-new-btn:hover {
          background: #18181b;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px -2px rgba(0,0,0,0.15);
        }

        /* STATS */
        .proj-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1px;
          background: #e4e4e7;
          border: 1px solid #e4e4e7;
          border-radius: 12px;
          overflow: hidden;
          margin-bottom: 32px;
        }
        .proj-stat {
          background: white;
          padding: 20px 22px;
          transition: background 0.15s;
        }
        .proj-stat:hover { background: #fafafa; }
        .proj-stat-label {
          font-size: 11px;
          font-weight: 500;
          color: #71717a;
          text-transform: uppercase;
          letter-spacing: 0.6px;
          margin-bottom: 8px;
        }
        .proj-stat-value {
          font-size: 26px;
          font-weight: 700;
          color: #09090b;
          line-height: 1;
          letter-spacing: -0.8px;
          font-variant-numeric: tabular-nums;
        }
        .proj-stat-value.muted { color: #a1a1aa; }

        /* FILTERS */
        .proj-filters {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        .proj-search {
          position: relative;
          flex: 1 1 260px;
          max-width: 360px;
        }
        .proj-search input {
          width: 100%;
          padding: 10px 14px 10px 38px;
          border: 1px solid #e4e4e7;
          border-radius: 10px;
          font-size: 13.5px;
          font-family: ${FONT};
          outline: none;
          background: white;
          transition: all 0.15s;
        }
        .proj-search input:focus {
          border-color: #a1a1aa;
          box-shadow: 0 0 0 3px rgba(0,0,0,0.04);
        }
        .proj-search svg {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #a1a1aa;
        }
        .proj-filter-select {
          padding: 10px 14px;
          border: 1px solid #e4e4e7;
          border-radius: 10px;
          font-size: 13.5px;
          font-family: ${FONT};
          background: white;
          cursor: pointer;
          outline: none;
          min-width: 160px;
        }

        /* GRID */
        .proj-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
          gap: 14px;
        }

        .proj-card {
          background: white;
          border: 1px solid #e4e4e7;
          border-radius: 14px;
          padding: 18px;
          transition: all 0.15s ease;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .proj-card:hover {
          border-color: #a1a1aa;
          box-shadow: 0 4px 12px -2px rgba(0,0,0,0.06);
        }
        .proj-card-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
        }
        .proj-card-code {
          font-size: 10.5px;
          font-weight: 700;
          color: #71717a;
          background: #f4f4f5;
          padding: 3px 8px;
          border-radius: 6px;
          letter-spacing: 0.4px;
          text-transform: uppercase;
          font-family: monospace;
        }
        .proj-card-status {
          font-size: 10.5px;
          font-weight: 600;
          padding: 3px 9px;
          border-radius: 6px;
          letter-spacing: 0.3px;
          text-transform: uppercase;
          border: 1px solid;
        }
        .proj-card-name {
          font-size: 16px;
          font-weight: 700;
          color: #09090b;
          letter-spacing: -0.3px;
          line-height: 1.3;
        }
        .proj-card-client {
          font-size: 12px;
          color: #71717a;
          margin-top: 4px;
        }
        .proj-card-desc {
          font-size: 12.5px;
          color: #71717a;
          line-height: 1.5;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .proj-card-dates {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: #52525b;
          background: #fafafa;
          padding: 8px 12px;
          border-radius: 8px;
          font-variant-numeric: tabular-nums;
        }
        .proj-card-emp {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding-top: 12px;
          border-top: 1px solid #f4f4f5;
        }
        .proj-avatar-stack {
          display: flex;
          align-items: center;
        }
        .proj-avatar-stack > * {
          margin-left: -8px;
          border: 2px solid white;
        }
        .proj-avatar-stack > *:first-child { margin-left: 0; }
        .proj-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #f4f4f5;
          color: #52525b;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: -0.3px;
        }
        .proj-avatar.more {
          background: #09090b;
          color: white;
        }
        .proj-emp-count {
          font-size: 11.5px;
          color: #71717a;
          font-weight: 500;
        }
        .proj-card-actions {
          display: flex;
          gap: 6px;
        }
        .proj-action-btn {
          flex: 1;
          padding: 8px;
          border-radius: 8px;
          border: 1px solid #e4e4e7;
          background: white;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
          font-family: ${FONT};
          color: #52525b;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          transition: all 0.15s;
        }
        .proj-action-btn:hover {
          background: #fafafa;
          border-color: #a1a1aa;
          color: #09090b;
        }
        .proj-action-btn.danger:hover {
          background: #fef2f2;
          border-color: #fecaca;
          color: #991b1b;
        }

        /* EMPTY / LOADING */
        .proj-empty {
          background: white;
          border: 1px dashed #e4e4e7;
          border-radius: 16px;
          padding: 80px 24px;
          text-align: center;
          grid-column: 1 / -1;
        }
        .proj-empty-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 64px;
          height: 64px;
          border-radius: 16px;
          background: #f4f4f5;
          color: #52525b;
          margin-bottom: 18px;
        }
        .proj-empty-title {
          font-size: 15px;
          font-weight: 600;
          color: #09090b;
          margin-bottom: 6px;
        }
        .proj-empty-desc {
          font-size: 13px;
          color: #71717a;
        }
        .proj-loading {
          background: white;
          border: 1px solid #e4e4e7;
          border-radius: 12px;
          padding: 80px;
          text-align: center;
          color: #a1a1aa;
          font-size: 13px;
        }

        /* EMPLOYEE PICKER */
        .proj-emp-picker {
          max-height: 280px;
          overflow-y: auto;
          border: 1px solid #e4e4e7;
          border-radius: 12px;
          padding: 4px;
        }
        .proj-emp-row {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 12px 14px;
          border-radius: 10px;
          cursor: pointer;
          font-size: 13px;
          font-family: ${FONT};
          transition: all 0.15s;
          border: 1px solid transparent;
        }
        .proj-emp-row:hover {
          background: #fafafa;
          border-color: #e4e4e7;
        }
        .proj-emp-row.checked {
          background: #f4f4f5;
          border-color: #a1a1aa;
        }
        .proj-emp-row input[type="checkbox"] {
          width: 18px;
          height: 18px;
          cursor: pointer;
          flex-shrink: 0;
          accent-color: #09090b;
        }
        .proj-emp-info {
          flex: 1;
          min-width: 0;
        }
        .proj-emp-name {
          font-size: 13.5px;
          font-weight: 600;
          color: #09090b;
          line-height: 1.3;
          margin-bottom: 3px;
          letter-spacing: -0.2px;
        }
        .proj-emp-meta {
          font-size: 11.5px;
          color: #71717a;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }
        .proj-emp-meta .dot {
          color: #d4d4d8;
          font-size: 10px;
        }

        /* MOBILE */
        @media (max-width: 900px) {
          .proj-stats { grid-template-columns: repeat(2, 1fr); }
        }

        @media (max-width: 767px) {
          .proj-page { padding: 0 4px; }
          .proj-title { font-size: 24px; }
          .proj-subtitle { font-size: 13px; }
          .proj-header { margin-bottom: 20px; }
          .proj-new-btn { width: 100%; justify-content: center; }
          .proj-stats { margin-bottom: 20px; border-radius: 10px; }
          .proj-stat { padding: 14px 16px; }
          .proj-stat-value { font-size: 22px; }
          .proj-stat-label { font-size: 10px; }
          .proj-grid { grid-template-columns: 1fr; }
          .proj-search { flex: 1 1 100%; max-width: none; }
          .proj-filter-select { width: 100%; }
        }
      `}</style>

      <div className="proj-page">
        {/* HEADER */}
        <div className="proj-header">
          <div>
            <h1 className="proj-title">Projects</h1>
            <p className="proj-subtitle">
              Manage projects and assign team members
            </p>
          </div>
          <button className="proj-new-btn" onClick={openAdd}>
            <Plus size={15} strokeWidth={2.5} /> New Project
          </button>
        </div>

        {/* STATS */}
        <div className="proj-stats">
          <div className="proj-stat">
            <div className="proj-stat-label">Total</div>
            <div className="proj-stat-value">{stats.total || 0}</div>
          </div>
          <div className="proj-stat">
            <div className="proj-stat-label">Active</div>
            <div className="proj-stat-value">{stats.active || 0}</div>
          </div>
          <div className="proj-stat">
            <div className="proj-stat-label">Completed</div>
            <div className="proj-stat-value">{stats.completed || 0}</div>
          </div>
          <div className="proj-stat">
            <div className="proj-stat-label">On Hold</div>
            <div
              className={`proj-stat-value ${
                (stats.on_hold || 0) === 0 ? "muted" : ""
              }`}
            >
              {stats.on_hold || 0}
            </div>
          </div>
        </div>

        {/* FILTERS */}
        <div className="proj-filters">
          <div className="proj-search">
            <Search size={15} strokeWidth={2.2} />
            <input
              type="text"
              placeholder="Search projects, code, client..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="proj-filter-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="COMPLETED">Completed</option>
            <option value="ON_HOLD">On Hold</option>
            <option value="PLANNED">Planned</option>
          </select>
        </div>

        {/* LIST */}
        {loading ? (
          <div className="proj-loading">
            <div className="spinner-border spinner-border-sm me-2" />
            Loading projects...
          </div>
        ) : items.length === 0 ? (
          <div className="proj-grid">
            <div className="proj-empty">
              <div className="proj-empty-icon">
                <FolderKanban size={28} strokeWidth={1.8} />
              </div>
              <div className="proj-empty-title">
                {search || filterStatus
                  ? "No projects match your filters"
                  : "No projects yet"}
              </div>
              <div className="proj-empty-desc">
                {search || filterStatus
                  ? "Try adjusting your search"
                  : "Create your first project to get started"}
              </div>
            </div>
          </div>
        ) : (
          <div className="proj-grid">
            {items.map((p) => {
              const st = STATUS_STYLES[p.status] || STATUS_STYLES.ACTIVE;
              const emps = p.assigned_employees_detail || [];

              return (
                <div key={p._id} className="proj-card">
                  <div className="proj-card-top">
                    <span className="proj-card-code">{p.code}</span>
                    <span
                      className="proj-card-status"
                      style={{
                        background: st.bg,
                        color: st.color,
                        borderColor: st.border,
                      }}
                    >
                      {st.label}
                    </span>
                  </div>

                  <div>
                    <div className="proj-card-name">{p.name}</div>
                    {p.client && (
                      <div className="proj-card-client">{p.client}</div>
                    )}
                  </div>

                  {p.description && (
                    <div className="proj-card-desc">{p.description}</div>
                  )}

                  {(p.start_date || p.end_date) && (
                    <div className="proj-card-dates">
                      <Calendar size={13} strokeWidth={2} />
                      {formatDate(p.start_date)} → {formatDate(p.end_date)}
                    </div>
                  )}

                  <div className="proj-card-emp">
                    <div className="proj-avatar-stack">
                      {emps.slice(0, 4).map((e) => (
                        <div
                          key={e.id}
                          className="proj-avatar"
                          title={e.name}
                        >
                          {e.name
                            ?.split(" ")
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join("")}
                        </div>
                      ))}
                      {emps.length > 4 && (
                        <div className="proj-avatar more">
                          +{emps.length - 4}
                        </div>
                      )}
                    </div>
                    <span className="proj-emp-count">
                      {emps.length === 0
                        ? "No members"
                        : `${emps.length} member${
                            emps.length !== 1 ? "s" : ""
                          }`}
                    </span>
                  </div>

                  <div className="proj-card-actions">
                    <button
                      className="proj-action-btn"
                      onClick={() => openEdit(p)}
                    >
                      <Pencil size={12} /> Edit
                    </button>
                    <button
                      className="proj-action-btn danger"
                      onClick={() => setConfirmDelete(p)}
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CREATE / EDIT MODAL */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit Project" : "New Project"}
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
              onClick={handleSave}
              disabled={saving}
              style={{ fontFamily: FONT }}
            >
              {saving ? "Saving..." : editing ? "Update" : "Create"}
            </button>
          </>
        }
      >
        <div className="row g-3">
          <div className="col-12">
            <label className="erp-label">Project Name *</label>
            <input
              className="erp-input"
              value={form.name}
              onChange={(e) =>
                setForm({ ...form, name: e.target.value })
              }
              placeholder="e.g., Website Redesign"
              autoFocus
              style={{ fontFamily: FONT }}
            />
          </div>

          <div className="col-12 col-sm-6">
            <label className="erp-label">Code</label>
            <input
              className="erp-input"
              value={form.code}
              onChange={(e) =>
                setForm({ ...form, code: e.target.value.toUpperCase() })
              }
              placeholder="Auto (PRJ001)"
              style={{ fontFamily: FONT }}
            />
          </div>

          <div className="col-12 col-sm-6">
            <label className="erp-label">Client</label>
            <input
              className="erp-input"
              value={form.client}
              onChange={(e) =>
                setForm({ ...form, client: e.target.value })
              }
              placeholder="Client name"
              style={{ fontFamily: FONT }}
            />
          </div>

          <div className="col-12 col-sm-6">
            <label className="erp-label">Status</label>
            <select
              className="erp-input"
              value={form.status}
              onChange={(e) =>
                setForm({ ...form, status: e.target.value })
              }
              style={{ fontFamily: FONT }}
            >
              <option value="PLANNED">Planned</option>
              <option value="ACTIVE">Active</option>
              <option value="ON_HOLD">On Hold</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>

          <div className="col-12 col-sm-6">
            <label className="erp-label">Priority</label>
            <select
              className="erp-input"
              value={form.priority}
              onChange={(e) =>
                setForm({ ...form, priority: e.target.value })
              }
              style={{ fontFamily: FONT }}
            >
              <option value="LOW">Low</option>
              <option value="NORMAL">Normal</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>

          <div className="col-12 col-sm-6">
            <label className="erp-label">Start Date</label>
            <input
              type="date"
              className="erp-input"
              value={form.start_date}
              onChange={(e) =>
                setForm({ ...form, start_date: e.target.value })
              }
              style={{ fontFamily: FONT }}
            />
          </div>

          <div className="col-12 col-sm-6">
            <label className="erp-label">End Date</label>
            <input
              type="date"
              className="erp-input"
              value={form.end_date}
              onChange={(e) =>
                setForm({ ...form, end_date: e.target.value })
              }
              style={{ fontFamily: FONT }}
            />
          </div>

          <div className="col-12">
            <label className="erp-label">Description</label>
            <textarea
              className="erp-input"
              rows={2}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              placeholder="Project description"
              style={{ resize: "vertical", fontFamily: FONT }}
            />
          </div>

          <div className="col-12">
            <label className="erp-label">
              <Users
                size={12}
                style={{ display: "inline", marginRight: 5 }}
              />
              Assign Team ({form.assigned_employees.length} selected)
            </label>
            <div className="proj-emp-picker">
              {employees.length === 0 ? (
                <div
                  style={{
                    padding: 14,
                    textAlign: "center",
                    color: "#a1a1aa",
                    fontSize: 12.5,
                  }}
                >
                  No employees available
                </div>
              ) : (
                employees.map((emp) => {
                  const checked = form.assigned_employees.includes(
                    emp._id
                  );
                  return (
                    <label
                      key={emp._id}
                      className={`proj-emp-row ${
                        checked ? "checked" : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleEmployee(emp._id)}
                      />
                      <div className="proj-emp-info">
                        <div className="proj-emp-name">
                          {emp.first_name} {emp.last_name}
                        </div>
                        <div className="proj-emp-meta">
                          <span>{emp.employee_code}</span>
                          {emp.department_name && (
                            <>
                              <span className="dot">•</span>
                              <span>{emp.department_name}</span>
                            </>
                          )}
                          {emp.designation_title && (
                            <>
                              <span className="dot">•</span>
                              <span>{emp.designation_title}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </label>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </Modal>

      {/* DELETE CONFIRM */}
      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete Project?"
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
              onClick={handleDelete}
              style={{ fontFamily: FONT }}
            >
              Delete
            </button>
          </>
        }
      >
        <p style={{ margin: 0, color: "#71717a", fontFamily: FONT }}>
          Delete <strong>{confirmDelete?.name}</strong>? This cannot be
          undone.
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

export default ManagerProjects;