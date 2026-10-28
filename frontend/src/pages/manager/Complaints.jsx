import { useState, useEffect, useCallback } from "react";
import {
  MessageSquareWarning,
  Search,
  Check,
  Clock,
  AlertCircle,
  Trash2,
  User,
  Hash,
  X,
} from "lucide-react";
import Layout from "../../components/layout/Layout";
import Modal from "../../components/common/Modal";
import Toast from "../../components/common/Toast";
import * as api from "../../api/complaintApi";

const FONT = "'Inter', 'Segoe UI', -apple-system, sans-serif";

const STATUS_STYLES = {
  PENDING: {
    bg: "#fef3c7",
    color: "#92400e",
    border: "#fde68a",
    label: "Pending",
  },
  IN_PROGRESS: {
    bg: "#dbeafe",
    color: "#1e40af",
    border: "#bfdbfe",
    label: "In Progress",
  },
  SOLVED: {
    bg: "#dcfce7",
    color: "#166534",
    border: "#bbf7d0",
    label: "Solved",
  },
};

const PRIORITY_LABELS = {
  LOW: { label: "Low", color: "#64748b" },
  NORMAL: { label: "Normal", color: "#52525b" },
  HIGH: { label: "High", color: "#b45309" },
  URGENT: { label: "Urgent", color: "#991b1b" },
};

const formatDate = (iso) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return iso;
  }
};

const ManagerComplaints = () => {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [actionTarget, setActionTarget] = useState(null);
  const [actionStatus, setActionStatus] = useState("SOLVED");
  const [actionNotes, setActionNotes] = useState("");
  const [actionSaving, setActionSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [toast, setToast] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [lRes, sRes] = await Promise.all([
        api.listAllComplaints(search, filterStatus, ""),
        api.getComplaintStats(),
      ]);
      setItems(Array.isArray(lRes.data) ? lRes.data : []);
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

  const openAction = (c) => {
    setActionTarget(c);
    setActionStatus(c.status === "SOLVED" ? "SOLVED" : "SOLVED");
    setActionNotes(c.manager_notes || "");
  };

  const handleAction = async () => {
    if (!actionTarget) return;
    setActionSaving(true);
    try {
      await api.updateComplaintStatus(actionTarget._id, {
        status: actionStatus,
        manager_notes: actionNotes,
      });
      setToast({ message: `Marked as ${actionStatus}`, type: "success" });
      setActionTarget(null);
      load();
    } catch (err) {
      setToast({
        message: err.response?.data?.error || "Failed",
        type: "error",
      });
    } finally {
      setActionSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await api.deleteComplaint(confirmDelete._id);
      setToast({ message: "Complaint deleted", type: "success" });
      setConfirmDelete(null);
      load();
    } catch (err) {
      setToast({ message: "Failed to delete", type: "error" });
    }
  };

  return (
    <Layout>
      <style>{`
        .mcmp-page * { font-family: ${FONT}; }
        /* ✅ FIX: Max-width and margin auto ah remove panni, full width ah maathiiruken */
        .mcmp-page {
          font-family: ${FONT};
          width: 100%;
          padding: 0 20px;
          color: #0f172a;
        }

        .mcmp-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 12px;
        }
        .mcmp-title {
          font-size: 28px;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.8px;
          margin-bottom: 4px;
        }
        .mcmp-subtitle { font-size: 13.5px; color: #64748b; margin: 0; }

        .mcmp-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1px;
          background: #e4e4e7;
          border: 1px solid #e4e4e7;
          border-radius: 12px;
          overflow: hidden;
          margin-bottom: 20px;
        }
        .mcmp-stat { background: white; padding: 18px 20px; }
        .mcmp-stat-label {
          font-size: 11px;
          font-weight: 500;
          color: #71717a;
          text-transform: uppercase;
          letter-spacing: 0.6px;
          margin-bottom: 8px;
        }
        .mcmp-stat-value {
          font-size: 24px;
          font-weight: 700;
          color: #09090b;
          line-height: 1;
          letter-spacing: -0.5px;
          font-variant-numeric: tabular-nums;
        }

        .mcmp-filters {
          display: flex;
          gap: 10px;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }
        .mcmp-search {
          position: relative;
          flex: 1 1 260px;
          max-width: 360px;
        }
        .mcmp-search input {
          width: 100%;
          padding: 10px 14px 10px 38px;
          border: 1px solid #e4e4e7;
          border-radius: 10px;
          font-size: 13.5px;
          font-family: ${FONT};
          outline: none;
          background: white;
        }
        .mcmp-search svg {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #a1a1aa;
        }
        .mcmp-select {
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

        .mcmp-card {
          background: white;
          border: 1px solid #e4e4e7;
          border-radius: 14px;
          padding: 18px;
          margin-bottom: 12px;
          transition: all 0.15s ease;
        }
        .mcmp-card:hover {
          border-color: #a1a1aa;
          box-shadow: 0 4px 12px -4px rgba(0,0,0,0.08);
        }

        .mcmp-emp {
          display: flex;
          align-items: center;
          gap: 10px;
          padding-bottom: 12px;
          margin-bottom: 12px;
          border-bottom: 1px solid #f1f5f9;
        }
        .mcmp-emp-avatar {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: #f4f4f5;
          color: #52525b;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 700;
          flex-shrink: 0;
        }
        .mcmp-emp-name {
          font-size: 13.5px;
          font-weight: 700;
          color: #09090b;
        }
        .mcmp-emp-code {
          font-size: 11.5px;
          color: #71717a;
        }

        .mcmp-subject {
          font-size: 15px;
          font-weight: 700;
          color: #09090b;
          margin-bottom: 8px;
          letter-spacing: -0.2px;
        }
        .mcmp-badges {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          margin-bottom: 10px;
        }
        .mcmp-pill {
          font-size: 10.5px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 6px;
          letter-spacing: 0.3px;
          text-transform: uppercase;
          border: 1px solid;
        }
        .mcmp-desc {
          font-size: 13px;
          color: #475569;
          line-height: 1.55;
          margin-bottom: 12px;
        }
        .mcmp-notes {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: 8px;
          padding: 10px 12px;
          font-size: 12.5px;
          color: #166534;
          margin-bottom: 12px;
          line-height: 1.5;
        }
        .mcmp-notes strong {
          display: block;
          font-size: 10.5px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
          color: #14532d;
        }
        .mcmp-meta {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          padding-top: 12px;
          border-top: 1px solid #f1f5f9;
          font-size: 11.5px;
          color: #94a3b8;
          flex-wrap: wrap;
        }
        .mcmp-actions {
          display: flex;
          gap: 6px;
          margin-top: 12px;
        }
        .mcmp-btn {
          flex: 1;
          padding: 9px 12px;
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
        .mcmp-btn:hover {
          background: #fafafa;
          border-color: #a1a1aa;
          color: #09090b;
        }
        .mcmp-btn.solve {
          background: #f0fdf4;
          color: #166534;
          border-color: #bbf7d0;
        }
        .mcmp-btn.solve:hover {
          background: #dcfce7;
          border-color: #86efac;
        }
        .mcmp-btn.danger:hover {
          background: #fef2f2;
          border-color: #fecaca;
          color: #991b1b;
        }

        .mcmp-empty {
          background: white;
          border: 1px dashed #e4e4e7;
          border-radius: 16px;
          padding: 70px 24px;
          text-align: center;
        }
        .mcmp-empty-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 64px;
          height: 64px;
          border-radius: 16px;
          background: #f4f4f5;
          color: #52525b;
          margin-bottom: 16px;
        }
        .mcmp-empty-title {
          font-size: 15px;
          font-weight: 700;
          color: #09090b;
          margin-bottom: 6px;
        }
        .mcmp-empty-desc { font-size: 13px; color: #71717a; }
        .mcmp-loading {
          background: white;
          border: 1px solid #e4e4e7;
          border-radius: 12px;
          padding: 60px;
          text-align: center;
          color: #a1a1aa;
          font-size: 13px;
        }

        @media (max-width: 900px) {
          .mcmp-stats { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 767px) {
          .mcmp-page { padding: 0 4px; }
          .mcmp-title { font-size: 22px; }
          .mcmp-subtitle { font-size: 12.5px; }
          .mcmp-header { margin-bottom: 16px; }
          .mcmp-stats { margin-bottom: 16px; border-radius: 10px; }
          .mcmp-stat { padding: 14px 16px; }
          .mcmp-stat-value { font-size: 20px; }
          .mcmp-search { flex: 1 1 100%; max-width: none; }
          .mcmp-select { width: 100%; }
          .mcmp-card { padding: 14px; }
          .mcmp-actions { flex-direction: column; }
        }
      `}</style>

      <div className="mcmp-page">
        <div className="mcmp-header">
          <div>
            <h1 className="mcmp-title">Complaints</h1>
            <p className="mcmp-subtitle">
              Review and resolve employee complaints
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="mcmp-stats">
          <div className="mcmp-stat">
            <div className="mcmp-stat-label">Total</div>
            <div className="mcmp-stat-value">{stats.total || 0}</div>
          </div>
          <div className="mcmp-stat">
            <div className="mcmp-stat-label">Pending</div>
            <div className="mcmp-stat-value" style={{ color: "#d97706" }}>
              {stats.pending || 0}
            </div>
          </div>
          <div className="mcmp-stat">
            <div className="mcmp-stat-label">In Progress</div>
            <div className="mcmp-stat-value" style={{ color: "#1e40af" }}>
              {stats.in_progress || 0}
            </div>
          </div>
          <div className="mcmp-stat">
            <div className="mcmp-stat-label">Solved</div>
            <div className="mcmp-stat-value" style={{ color: "#059669" }}>
              {stats.solved || 0}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mcmp-filters">
          <div className="mcmp-search">
            <Search size={15} strokeWidth={2.2} />
            <input
              type="text"
              placeholder="Search by employee, code, subject..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="mcmp-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="SOLVED">Solved</option>
          </select>
        </div>

        {/* List */}
        {loading ? (
          <div className="mcmp-loading">
            <div className="spinner-border spinner-border-sm me-2" />
            Loading complaints...
          </div>
        ) : items.length === 0 ? (
          <div className="mcmp-empty">
            <div className="mcmp-empty-icon">
              <MessageSquareWarning size={28} strokeWidth={1.8} />
            </div>
            <div className="mcmp-empty-title">
              {search || filterStatus
                ? "No complaints match your filters"
                : "No complaints yet"}
            </div>
            <div className="mcmp-empty-desc">
              {search || filterStatus
                ? "Try adjusting filters"
                : "Employee complaints will appear here"}
            </div>
          </div>
        ) : (
          items.map((c) => {
            const st = STATUS_STYLES[c.status] || STATUS_STYLES.PENDING;
            const pr = PRIORITY_LABELS[c.priority] || PRIORITY_LABELS.NORMAL;

            return (
              <div key={c._id} className="mcmp-card">
                {/* Employee */}
                <div className="mcmp-emp">
                  <div className="mcmp-emp-avatar">
                    {(c.employee_name || "??")
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="mcmp-emp-name">{c.employee_name}</div>
                    <div className="mcmp-emp-code">
                      {c.employee_code}
                      {c.department_name && ` · ${c.department_name}`}
                    </div>
                  </div>
                </div>

                {/* Subject + badges */}
                <div className="mcmp-subject">{c.subject}</div>
                <div className="mcmp-badges">
                  <span
                    className="mcmp-pill"
                    style={{
                      background: st.bg,
                      color: st.color,
                      borderColor: st.border,
                    }}
                  >
                    {st.label}
                  </span>
                  <span
                    className="mcmp-pill"
                    style={{
                      background: "#f4f4f5",
                      color: "#52525b",
                      borderColor: "#e4e4e7",
                    }}
                  >
                    {c.category}
                  </span>
                  <span
                    className="mcmp-pill"
                    style={{
                      background: "white",
                      color: pr.color,
                      borderColor: "#e4e4e7",
                    }}
                  >
                    {pr.label}
                  </span>
                </div>

                <div className="mcmp-desc">{c.description}</div>

                {c.manager_notes && (
                  <div className="mcmp-notes">
                    <strong>Your Response</strong>
                    {c.manager_notes}
                  </div>
                )}

                <div className="mcmp-meta">
                  <span>Received: {formatDate(c.created_at)}</span>
                  {c.status === "SOLVED" && c.resolved_at && (
                    <span style={{ color: "#059669", fontWeight: 600 }}>
                      ✓ Solved: {formatDate(c.resolved_at)}
                    </span>
                  )}
                </div>

                <div className="mcmp-actions">
                  <button
                    className="mcmp-btn solve"
                    onClick={() => openAction(c)}
                  >
                    <Check size={13} /> Mark Solved
                  </button>
                  <button
                    className="mcmp-btn"
                    onClick={() => openAction(c)}
                  >
                    <Clock size={13} /> Update
                  </button>
                  <button
                    className="mcmp-btn danger"
                    onClick={() => setConfirmDelete(c)}
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              </div>
            );
          })
        )}

        {/* Action Modal */}
        <Modal
          open={!!actionTarget}
          onClose={() => setActionTarget(null)}
          title="Update Complaint Status"
          footer={
            <>
              <button
                className="erp-btn erp-btn-outline"
                onClick={() => setActionTarget(null)}
                style={{ fontFamily: FONT }}
              >
                Cancel
              </button>
              <button
                className="erp-btn erp-btn-primary"
                onClick={handleAction}
                disabled={actionSaving}
                style={{ fontFamily: FONT }}
              >
                <Check size={14} />
                {actionSaving ? "Saving..." : "Update Status"}
              </button>
            </>
          }
        >
          {actionTarget && (
            <>
              <div
                style={{
                  padding: 12,
                  background: "#f9fafb",
                  borderRadius: 10,
                  marginBottom: 16,
                  fontFamily: FONT,
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 14 }}>
                  {actionTarget.subject}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "#71717a",
                    marginTop: 2,
                  }}
                >
                  From {actionTarget.employee_name} ({actionTarget.employee_code})
                </div>
              </div>

              <div className="mb-3">
                <label className="erp-label">Status *</label>
                <select
                  className="erp-input"
                  value={actionStatus}
                  onChange={(e) => setActionStatus(e.target.value)}
                  style={{ fontFamily: FONT }}
                >
                  <option value="PENDING">Pending</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="SOLVED">Solved</option>
                </select>
              </div>

              <div className="mb-2">
                <label className="erp-label">
                  Response / Notes (Optional)
                </label>
                <textarea
                  className="erp-input"
                  rows={4}
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  placeholder="Add a note for the employee (visible to them)..."
                  style={{ resize: "vertical", fontFamily: FONT }}
                />
              </div>
            </>
          )}
        </Modal>

        {/* Delete Confirm */}
        <Modal
          open={!!confirmDelete}
          onClose={() => setConfirmDelete(null)}
          title="Delete Complaint?"
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
            Delete <strong>{confirmDelete?.subject}</strong>? This cannot be
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
      </div>
    </Layout>
  );
};

export default ManagerComplaints;