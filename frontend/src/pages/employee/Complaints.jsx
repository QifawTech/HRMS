import { useState, useEffect, useCallback } from "react";
import {
  MessageSquareWarning,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  Send,
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
    icon: Clock,
  },
  IN_PROGRESS: {
    bg: "#dbeafe",
    color: "#1e40af",
    border: "#bfdbfe",
    label: "In Progress",
    icon: AlertCircle,
  },
  SOLVED: {
    bg: "#dcfce7",
    color: "#166534",
    border: "#bbf7d0",
    label: "Solved",
    icon: CheckCircle2,
  },
};

const PRIORITY_LABELS = {
  LOW: { label: "Low", color: "#64748b" },
  NORMAL: { label: "Normal", color: "#52525b" },
  HIGH: { label: "High", color: "#b45309" },
  URGENT: { label: "Urgent", color: "#991b1b" },
};

const CATEGORIES = [
  "General",
  "Work Environment",
  "Salary / Payroll",
  "Attendance",
  "Leave",
  "Manager",
  "Team",
  "Technical",
  "Other",
];

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

const emptyForm = {
  subject: "",
  description: "",
  category: "General",
  priority: "NORMAL",
};

const EmployeeComplaints = () => {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({ pending: 0, solved: 0 });
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getMyComplaints(filterStatus);
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!Array.isArray(items)) return;
    setStats({
      pending: items.filter((c) => c.status === "PENDING").length,
      solved: items.filter((c) => c.status === "SOLVED").length,
    });
  }, [items]);

  const openAdd = () => {
    setForm(emptyForm);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.subject.trim()) {
      setToast({ message: "Subject is required", type: "error" });
      return;
    }
    if (form.subject.trim().length < 3) {
      setToast({ message: "Subject too short", type: "error" });
      return;
    }
    if (!form.description.trim() || form.description.trim().length < 10) {
      setToast({
        message: "Description must be at least 10 characters",
        type: "error",
      });
      return;
    }

    setSaving(true);
    try {
      await api.createComplaint(form);
      setToast({ message: "Complaint submitted to manager", type: "success" });
      setModalOpen(false);
      load();
    } catch (err) {
      setToast({
        message: err.response?.data?.error || "Failed to submit",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <style>{`
        .cmp-page * { font-family: ${FONT}; }
        .cmp-page {
          font-family: ${FONT};
          max-width: 1000px;
          margin: 0 auto;
          color: #0f172a;
        }

        .cmp-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 12px;
        }
        .cmp-title {
          font-size: 26px;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.6px;
          margin-bottom: 4px;
        }
        .cmp-subtitle { font-size: 13.5px; color: #64748b; margin: 0; }

        .cmp-new-btn {
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
        .cmp-new-btn:hover {
          background: #18181b;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px -2px rgba(0,0,0,0.15);
        }

        .cmp-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1px;
          background: #e4e4e7;
          border: 1px solid #e4e4e7;
          border-radius: 12px;
          overflow: hidden;
          margin-bottom: 20px;
        }
        .cmp-stat {
          background: white;
          padding: 18px 20px;
        }
        .cmp-stat-label {
          font-size: 11px;
          font-weight: 500;
          color: #71717a;
          text-transform: uppercase;
          letter-spacing: 0.6px;
          margin-bottom: 8px;
        }
        .cmp-stat-value {
          font-size: 24px;
          font-weight: 700;
          color: #09090b;
          line-height: 1;
          letter-spacing: -0.5px;
          font-variant-numeric: tabular-nums;
        }

        .cmp-toolbar {
          display: flex;
          gap: 10px;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }
        .cmp-filter {
          padding: 9px 14px;
          border: 1px solid #e4e4e7;
          border-radius: 10px;
          font-size: 13.5px;
          font-family: ${FONT};
          background: white;
          cursor: pointer;
          outline: none;
        }
        .cmp-tabs {
          display: flex;
          gap: 2px;
          background: #f4f4f5;
          padding: 3px;
          border-radius: 10px;
        }
        .cmp-tab {
          padding: 7px 14px;
          font-size: 12.5px;
          font-weight: 600;
          border: none;
          background: transparent;
          color: #71717a;
          border-radius: 8px;
          cursor: pointer;
          font-family: ${FONT};
        }
        .cmp-tab.active {
          background: white;
          color: #09090b;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }

        .cmp-card {
          background: white;
          border: 1px solid #e4e4e7;
          border-radius: 14px;
          padding: 18px;
          margin-bottom: 12px;
          transition: all 0.15s ease;
        }
        .cmp-card:hover {
          border-color: #a1a1aa;
          box-shadow: 0 4px 12px -4px rgba(0,0,0,0.08);
        }
        .cmp-card-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 10px;
          margin-bottom: 10px;
          flex-wrap: wrap;
        }
        .cmp-card-subject {
          font-size: 15px;
          font-weight: 700;
          color: #09090b;
          letter-spacing: -0.2px;
        }
        .cmp-badges {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .cmp-pill {
          font-size: 10.5px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 6px;
          letter-spacing: 0.3px;
          text-transform: uppercase;
          border: 1px solid;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .cmp-desc {
          font-size: 13px;
          color: #475569;
          line-height: 1.55;
          margin-bottom: 12px;
        }
        .cmp-notes {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: 8px;
          padding: 10px 12px;
          font-size: 12.5px;
          color: #166534;
          margin-bottom: 12px;
          line-height: 1.5;
        }
        .cmp-notes strong {
          display: block;
          font-size: 10.5px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
          color: #14532d;
        }
        .cmp-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          padding-top: 12px;
          border-top: 1px solid #f1f5f9;
          font-size: 11.5px;
          color: #94a3b8;
          flex-wrap: wrap;
        }

        .cmp-empty {
          background: white;
          border: 1px dashed #e4e4e7;
          border-radius: 16px;
          padding: 70px 24px;
          text-align: center;
        }
        .cmp-empty-icon {
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
        .cmp-empty-title {
          font-size: 15px;
          font-weight: 700;
          color: #09090b;
          margin-bottom: 6px;
        }
        .cmp-empty-desc { font-size: 13px; color: #71717a; }

        .cmp-loading {
          background: white;
          border: 1px solid #e4e4e7;
          border-radius: 12px;
          padding: 60px;
          text-align: center;
          color: #a1a1aa;
          font-size: 13px;
        }

        @media (max-width: 767px) {
          .cmp-page { padding: 0 4px; }
          .cmp-title { font-size: 22px; }
          .cmp-subtitle { font-size: 12.5px; }
          .cmp-new-btn { width: 100%; justify-content: center; }
          .cmp-header { margin-bottom: 16px; }
          .cmp-stats { margin-bottom: 16px; border-radius: 10px; }
          .cmp-stat { padding: 14px 16px; }
          .cmp-stat-value { font-size: 20px; }
          .cmp-stat-label { font-size: 10px; }
          .cmp-card { padding: 14px; }
          .cmp-card-subject { font-size: 14px; }
          .cmp-toolbar { flex-direction: column; }
          .cmp-tabs { width: 100%; justify-content: space-between; }
          .cmp-tab { flex: 1; text-align: center; }
        }
      `}</style>

      <div className="cmp-page">
        {/* Header */}
        <div className="cmp-header">
          <div>
            <h1 className="cmp-title">My Complaints</h1>
            <p className="cmp-subtitle">
              Raise complaints and track their status
            </p>
          </div>
          <button className="cmp-new-btn" onClick={openAdd}>
            <Plus size={15} strokeWidth={2.5} /> Raise Complaint
          </button>
        </div>

        {/* Stats */}
        <div className="cmp-stats">
          <div className="cmp-stat">
            <div className="cmp-stat-label">Total</div>
            <div className="cmp-stat-value">{items.length}</div>
          </div>
          <div className="cmp-stat">
            <div className="cmp-stat-label">Pending</div>
            <div className="cmp-stat-value" style={{ color: "#d97706" }}>
              {stats.pending}
            </div>
          </div>
          <div className="cmp-stat">
            <div className="cmp-stat-label">Solved</div>
            <div className="cmp-stat-value" style={{ color: "#059669" }}>
              {stats.solved}
            </div>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="cmp-toolbar">
          <div className="cmp-tabs">
            {[
              { key: "", label: "All" },
              { key: "PENDING", label: "Pending" },
              { key: "IN_PROGRESS", label: "In Progress" },
              { key: "SOLVED", label: "Solved" },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setFilterStatus(t.key)}
                className={`cmp-tab ${filterStatus === t.key ? "active" : ""}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="cmp-loading">
            <div className="spinner-border spinner-border-sm me-2" />
            Loading...
          </div>
        ) : items.length === 0 ? (
          <div className="cmp-empty">
            <div className="cmp-empty-icon">
              <MessageSquareWarning size={28} strokeWidth={1.8} />
            </div>
            <div className="cmp-empty-title">
              {filterStatus ? "No complaints in this filter" : "No complaints yet"}
            </div>
            <div className="cmp-empty-desc">
              {filterStatus
                ? "Try a different filter"
                : "Raise your first complaint to your manager"}
            </div>
          </div>
        ) : (
          items.map((c) => {
            const st = STATUS_STYLES[c.status] || STATUS_STYLES.PENDING;
            const StatusIcon = st.icon;
            const pr = PRIORITY_LABELS[c.priority] || PRIORITY_LABELS.NORMAL;

            return (
              <div key={c._id} className="cmp-card">
                <div className="cmp-card-top">
                  <div className="cmp-card-subject">{c.subject}</div>
                  <div className="cmp-badges">
                    <span
                      className="cmp-pill"
                      style={{
                        background: st.bg,
                        color: st.color,
                        borderColor: st.border,
                      }}
                    >
                      <StatusIcon size={11} strokeWidth={2.5} />
                      {st.label}
                    </span>
                    <span
                      className="cmp-pill"
                      style={{
                        background: "#f4f4f5",
                        color: "#52525b",
                        borderColor: "#e4e4e7",
                      }}
                    >
                      {c.category}
                    </span>
                    <span
                      className="cmp-pill"
                      style={{
                        background: "white",
                        color: pr.color,
                        borderColor: "#e4e4e7",
                      }}
                    >
                      {pr.label}
                    </span>
                  </div>
                </div>

                <div className="cmp-desc">{c.description}</div>

                {c.manager_notes && (
                  <div className="cmp-notes">
                    <strong>Manager Response</strong>
                    {c.manager_notes}
                  </div>
                )}

                <div className="cmp-meta">
                  <span>Submitted: {formatDate(c.created_at)}</span>
                  {c.status === "SOLVED" && c.resolved_at && (
                    <span style={{ color: "#059669", fontWeight: 600 }}>
                      ✓ Solved: {formatDate(c.resolved_at)}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Raise Modal */}
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Raise Complaint"
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
                <Send size={14} />
                {saving ? "Submitting..." : "Submit"}
              </button>
            </>
          }
        >
          <div className="mb-3">
            <label className="erp-label">Subject *</label>
            <input
              className="erp-input"
              value={form.subject}
              onChange={(e) =>
                setForm({ ...form, subject: e.target.value })
              }
              placeholder="Short title of the complaint"
              autoFocus
              style={{ fontFamily: FONT }}
            />
          </div>

          <div className="row g-3 mb-3">
            <div className="col-6">
              <label className="erp-label">Category</label>
              <select
                className="erp-input"
                value={form.category}
                onChange={(e) =>
                  setForm({ ...form, category: e.target.value })
                }
                style={{ fontFamily: FONT }}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-6">
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
          </div>

          <div className="mb-2">
            <label className="erp-label">Description * (min 10 chars)</label>
            <textarea
              className="erp-input"
              rows={5}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              placeholder="Explain the issue in detail..."
              style={{ resize: "vertical", fontFamily: FONT }}
            />
            <div
              style={{
                fontSize: 11,
                color:
                  form.description.length >= 10 ? "#059669" : "#9ca3af",
                marginTop: 4,
                fontFamily: FONT,
              }}
            >
              {form.description.length}/10 characters
              {form.description.length >= 10 && " ✓"}
            </div>
          </div>
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

export default EmployeeComplaints;