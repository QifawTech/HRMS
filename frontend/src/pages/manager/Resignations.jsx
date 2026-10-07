import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Check,
  X,
  Clock,
  User,
  Calendar,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  UserMinus,
  Briefcase,
  Pencil,
  Save,
} from "lucide-react";
import Layout from "../../components/layout/Layout";
import Modal from "../../components/common/Modal";
import Toast from "../../components/common/Toast";
import * as api from "../../api/resignationApi";
import { formatDateTime } from "../../utils/dateUtils";

const FONT = "'Calibri', 'Segoe UI', -apple-system, sans-serif";

const statusStyles = {
  Pending: { bg: "#fef3c7", color: "#92400e", label: "Pending" },
  Accepted: { bg: "#dbeafe", color: "#1e40af", label: "Resigned" },
  Rejected: { bg: "#fee2e2", color: "#991b1b", label: "Rejected" },
  Completed: { bg: "#ecfdf5", color: "#065f46", label: "Completed" },
};

const ManagerResignations = () => {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("Pending");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState(null);

  // Review modal
  const [reviewModal, setReviewModal] = useState(null);
  const [reviewComment, setReviewComment] = useState("");
  const [noticeEnd, setNoticeEnd] = useState("");

  // Complete confirm
  const [completeConfirm, setCompleteConfirm] = useState(null);

  // NEW: Edit modal
  const [editModal, setEditModal] = useState(null); // { item }
  const [editDate, setEditDate] = useState("");
  const [editReason, setEditReason] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [lRes, sRes] = await Promise.all([
        api.listResignations(tab, search),
        api.getResignationStats(),
      ]);
      setItems(Array.isArray(lRes.data) ? lRes.data : []);
      setStats(sRes.data || {});
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [tab, search]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const openReview = (item, action) => {
    setReviewModal({ item, action });
    setReviewComment("");
    const d = new Date();
    d.setDate(d.getDate() + 30);
    setNoticeEnd(d.toISOString().split("T")[0]);
  };

  const submitReview = async () => {
    if (!reviewModal) return;

    if (reviewModal.action === "Reject" && !reviewComment.trim()) {
      setToast({
        message: "Please provide a reason for rejection",
        type: "error",
      });
      return;
    }

    if (reviewModal.action === "Accept" && !noticeEnd) {
      setToast({ message: "Set notice period end date", type: "error" });
      return;
    }

    try {
      await api.reviewResignation(
        reviewModal.item._id,
        reviewModal.action,
        reviewComment,
        reviewModal.action === "Accept" ? noticeEnd : null
      );
      setToast({
        message:
          reviewModal.action === "Accept"
            ? "Resignation accepted — employee marked as Resigned"
            : "Resignation rejected",
        type: "success",
      });
      setReviewModal(null);
      load();
    } catch (err) {
      setToast({
        message: err.response?.data?.error || "Failed",
        type: "error",
      });
    }
  };

  // ============================================
  // NEW: Edit last working day
  // ============================================
  const openEdit = (item) => {
    setEditModal({ item });
    setEditDate(item.resignation_notice_end || item.resignation_last_day || "");
    setEditReason("");
  };

  const submitEdit = async () => {
    if (!editModal) return;
    if (!editDate) {
      setToast({ message: "Please select a date", type: "error" });
      return;
    }

    setEditSaving(true);
    try {
      await api.editResignationNotice(editModal.item._id, editDate, editReason);
      setToast({ message: "Last working day updated", type: "success" });
      setEditModal(null);
      load();
    } catch (err) {
      setToast({
        message: err.response?.data?.error || "Failed to update",
        type: "error",
      });
    } finally {
      setEditSaving(false);
    }
  };

  const handleComplete = async () => {
    if (!completeConfirm) return;
    try {
      await api.completeResignation(completeConfirm._id);
      setToast({ message: "Resignation completed", type: "success" });
      setCompleteConfirm(null);
      load();
    } catch (err) {
      setToast({
        message: err.response?.data?.error || "Failed",
        type: "error",
      });
    }
  };

  const tabs = [
    { key: "Pending", label: "Pending", count: stats.pending || 0 },
    { key: "Accepted", label: "Resigned", count: stats.accepted || 0 },
    { key: "Rejected", label: "Rejected", count: stats.rejected || 0 },
    { key: "Completed", label: "Completed", count: stats.completed || 0 },
  ];

  const today = new Date().toISOString().split("T")[0];

  return (
    <Layout>
      <div
        style={{ fontFamily: FONT }}
        className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-4"
      >
        <div>
          <h1 className="erp-page-title">Resignations</h1>
          <p className="erp-page-subtitle mb-0">
            Review and manage employee resignations
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="row g-3 mb-4" style={{ fontFamily: FONT }}>
        <div className="col-6 col-md-3">
          <div className="erp-card erp-stat-card">
            <div>
              <p className="erp-stat-label">Pending</p>
              <p className="erp-stat-value">{stats.pending || 0}</p>
            </div>
            <div
              className="erp-stat-icon"
              style={{ background: "#fef3c7", color: "#d97706" }}
            >
              <Clock size={20} />
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="erp-card erp-stat-card">
            <div>
              <p className="erp-stat-label">Resigned</p>
              <p className="erp-stat-value">{stats.accepted || 0}</p>
            </div>
            <div
              className="erp-stat-icon"
              style={{ background: "#dbeafe", color: "#1e40af" }}
            >
              <Briefcase size={20} />
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="erp-card erp-stat-card">
            <div>
              <p className="erp-stat-label">Rejected</p>
              <p className="erp-stat-value">{stats.rejected || 0}</p>
            </div>
            <div
              className="erp-stat-icon"
              style={{ background: "#fee2e2", color: "#dc2626" }}
            >
              <X size={20} />
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="erp-card erp-stat-card">
            <div>
              <p className="erp-stat-label">Completed</p>
              <p className="erp-stat-value">{stats.completed || 0}</p>
            </div>
            <div
              className="erp-stat-icon"
              style={{ background: "#ecfdf5", color: "#059669" }}
            >
              <CheckCircle2 size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="erp-card mb-3" style={{ padding: 12, fontFamily: FONT }}>
        <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
          <div className="d-flex gap-1 flex-wrap">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className="erp-btn"
                style={{
                  background: tab === t.key ? "var(--primary)" : "transparent",
                  color: tab === t.key ? "white" : "var(--text-primary)",
                  padding: "6px 14px",
                  fontSize: 12.5,
                  border: "none",
                  fontFamily: FONT,
                }}
              >
                {t.label}
                <span
                  style={{
                    marginLeft: 6,
                    background:
                      tab === t.key ? "rgba(255,255,255,0.25)" : "#f3f4f6",
                    color: tab === t.key ? "white" : "#6b7280",
                    borderRadius: 10,
                    padding: "1px 7px",
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  {t.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="erp-input-wrapper">
          <Search size={16} className="erp-input-icon" />
          <input
            className="erp-input"
            placeholder="Search by name or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ fontFamily: FONT }}
          />
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="erp-card text-center py-5" style={{ color: "#6b7280" }}>
          <div className="spinner-border spinner-border-sm me-2" />
          Loading...
        </div>
      ) : items.length === 0 ? (
        <div className="erp-card text-center py-5" style={{ fontFamily: FONT }}>
          <UserMinus size={42} color="#d1d5db" style={{ marginBottom: 12 }} />
          <h5 style={{ fontWeight: 600 }}>No resignations here</h5>
          <p style={{ color: "#6b7280", margin: 0 }}>
            {tab} resignations will appear here
          </p>
        </div>
      ) : (
        <div className="row g-3" style={{ fontFamily: FONT }}>
          {items.map((item) => {
            const st =
              statusStyles[item.resignation_status] || statusStyles.Pending;

            return (
              <div className="col-12 col-lg-6" key={item._id}>
                <div
                  className="erp-task-card"
                  style={{
                    borderLeftColor:
                      item.resignation_status === "Pending"
                        ? "#d97706"
                        : item.resignation_status === "Accepted"
                        ? "#1e40af"
                        : item.resignation_status === "Rejected"
                        ? "#dc2626"
                        : "#059669",
                  }}
                >
                  {/* Header */}
                  <div className="d-flex align-items-center gap-2 mb-3 flex-wrap">
                    <span
                      className="erp-task-badge"
                      style={{
                        background: st.bg,
                        color: st.color,
                        fontWeight: 700,
                      }}
                    >
                      ● {st.label}
                    </span>
                    {item.resignation_status === "Pending" && (
                      <span
                        className="erp-task-badge"
                        style={{
                          background: "#dc2626",
                          color: "white",
                          fontSize: 10,
                        }}
                      >
                        ⚡ ACTION REQUIRED
                      </span>
                    )}
                  </div>

                  {/* Employee */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      marginBottom: 12,
                    }}
                  >
                    <div className="erp-avatar">
                      {item.employee_name
                        ?.split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>
                        {item.employee_name}
                      </div>
                      <div style={{ fontSize: 12, color: "#6b7280" }}>
                        {item.employee_code}
                      </div>
                    </div>
                  </div>

                  {/* Meta */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    <MetaRow
                      Icon={Calendar}
                      label="Applied On"
                      value={formatDateTime(item.resignation_applied_at)}
                    />
                    <MetaRow
                      Icon={Clock}
                      label="Requested Last Day"
                      value={
                        item.resignation_last_day
                          ? new Date(
                              item.resignation_last_day
                            ).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"
                      }
                    />
                    {item.resignation_notice_end && (
                      <MetaRow
                        Icon={Briefcase}
                        label="Last Working Day"
                        value={new Date(
                          item.resignation_notice_end
                        ).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                        highlight
                      />
                    )}
                  </div>

                  {/* Reason */}
                  {item.resignation_reason && (
                    <div
                      style={{
                        marginTop: 12,
                        padding: 10,
                        background: "#f9fafb",
                        borderRadius: 8,
                        fontSize: 12.5,
                        color: "#4b5563",
                        lineHeight: 1.5,
                      }}
                    >
                      <strong style={{ color: "#111827" }}>Reason:</strong>{" "}
                      {item.resignation_reason}
                    </div>
                  )}

                  {/* Manager comment */}
                  {item.resignation_review_comment &&
                    item.resignation_status !== "Pending" && (
                      <div
                        style={{
                          marginTop: 10,
                          padding: 10,
                          background:
                            item.resignation_status === "Rejected"
                              ? "#fef2f2"
                              : "#ecfdf5",
                          borderRadius: 8,
                          fontSize: 12.5,
                          color:
                            item.resignation_status === "Rejected"
                              ? "#991b1b"
                              : "#065f46",
                          fontStyle: "italic",
                        }}
                      >
                        <strong>Your response:</strong>{" "}
                        {item.resignation_review_comment}
                      </div>
                    )}

                  {/* Actions - Pending */}
                  {item.resignation_status === "Pending" && (
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        marginTop: 14,
                        paddingTop: 12,
                        borderTop: "1px solid var(--border)",
                      }}
                    >
                      <button
                        className="erp-task-action-btn"
                        onClick={() => openReview(item, "Accept")}
                        style={{
                          color: "#059669",
                          borderColor: "#a7f3d0",
                          background: "#ecfdf5",
                          flex: 1,
                          justifyContent: "center",
                        }}
                      >
                        <Check size={13} /> Accept
                      </button>
                      <button
                        className="erp-task-action-btn"
                        onClick={() => openReview(item, "Reject")}
                        style={{
                          color: "#dc2626",
                          borderColor: "#fecaca",
                          background: "#fef2f2",
                          flex: 1,
                          justifyContent: "center",
                        }}
                      >
                        <X size={13} /> Reject
                      </button>
                    </div>
                  )}

                  {/* Actions - Accepted: Edit + Complete */}
                  {item.resignation_status === "Accepted" && (
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        marginTop: 14,
                        paddingTop: 12,
                        borderTop: "1px solid var(--border)",
                      }}
                    >
                      <button
                        className="erp-task-action-btn"
                        onClick={() => openEdit(item)}
                        style={{
                          color: "#4f46e5",
                          borderColor: "#c7d2fe",
                          background: "#eef2ff",
                          flex: 1,
                          justifyContent: "center",
                        }}
                      >
                        <Pencil size={13} /> Edit Last Day
                      </button>
                      <button
                        className="erp-task-action-btn"
                        onClick={() => setCompleteConfirm(item)}
                        style={{
                          color: "#1e40af",
                          borderColor: "#bfdbfe",
                          background: "#eff6ff",
                          flex: 1,
                          justifyContent: "center",
                        }}
                      >
                        <CheckCircle2 size={13} /> Complete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Review Modal */}
      <Modal
        open={!!reviewModal}
        onClose={() => setReviewModal(null)}
        title={
          reviewModal?.action === "Accept"
            ? "Accept Resignation"
            : "Reject Resignation"
        }
        footer={
          <>
            <button
              className="erp-btn erp-btn-outline"
              onClick={() => setReviewModal(null)}
              style={{ fontFamily: FONT }}
            >
              Cancel
            </button>
            <button
              className={`erp-btn ${
                reviewModal?.action === "Accept"
                  ? "erp-btn-primary"
                  : "erp-btn-danger"
              }`}
              onClick={submitReview}
              style={{ fontFamily: FONT }}
            >
              {reviewModal?.action === "Accept"
                ? "Confirm Accept"
                : "Reject Resignation"}
            </button>
          </>
        }
      >
        {reviewModal && (
          <>
            <div
              style={{
                padding: 12,
                background: "#f9fafb",
                borderRadius: 8,
                marginBottom: 16,
                fontFamily: FONT,
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 14 }}>
                {reviewModal.item.employee_name}
              </div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>
                {reviewModal.item.employee_code}
              </div>
            </div>

            {reviewModal.action === "Accept" && (
              <div className="mb-3">
                <label className="erp-label">Last Working Day *</label>
                <input
                  type="date"
                  className="erp-input"
                  value={noticeEnd}
                  onChange={(e) => setNoticeEnd(e.target.value)}
                  min={today}
                  style={{ fontFamily: FONT }}
                />
                <small style={{ color: "#9ca3af", fontSize: 11 }}>
                  Employee will be marked as <strong>RESIGNED</strong>{" "}
                  immediately on accept
                </small>
              </div>
            )}

            <div className="mb-3">
              <label className="erp-label">
                {reviewModal.action === "Accept"
                  ? "Comment (Optional)"
                  : "Reason for Rejection *"}
              </label>
              <textarea
                className="erp-input"
                rows={3}
                placeholder={
                  reviewModal.action === "Accept"
                    ? "Optional message..."
                    : "Explain why the resignation is being rejected..."
                }
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                style={{ resize: "vertical", fontFamily: FONT }}
                autoFocus
              />
            </div>
          </>
        )}
      </Modal>

      {/* NEW: Edit Modal */}
      <Modal
        open={!!editModal}
        onClose={() => setEditModal(null)}
        title="Edit Last Working Day"
        footer={
          <>
            <button
              className="erp-btn erp-btn-outline"
              onClick={() => setEditModal(null)}
              style={{ fontFamily: FONT }}
            >
              Cancel
            </button>
            <button
              className="erp-btn erp-btn-primary"
              onClick={submitEdit}
              disabled={editSaving}
              style={{ fontFamily: FONT }}
            >
              <Save size={14} />
              {editSaving ? "Saving..." : "Save Changes"}
            </button>
          </>
        }
      >
        {editModal && (
          <>
            <div
              style={{
                padding: 12,
                background: "#eef2ff",
                borderRadius: 8,
                marginBottom: 16,
                fontFamily: FONT,
                border: "1px solid #c7d2fe",
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 14 }}>
                {editModal.item.employee_name}
              </div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>
                {editModal.item.employee_code}
              </div>
            </div>

            <div className="mb-3">
              <label className="erp-label">New Last Working Day *</label>
              <input
                type="date"
                className="erp-input"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                min={today}
                style={{ fontFamily: FONT }}
                autoFocus
              />
              <small style={{ color: "#9ca3af", fontSize: 11 }}>
                Employee will be notified of this change
              </small>
            </div>

            <div className="mb-3">
              <label className="erp-label">Reason (Optional)</label>
              <textarea
                className="erp-input"
                rows={3}
                placeholder="e.g., Extended due to project handover..."
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                style={{ resize: "vertical", fontFamily: FONT }}
              />
            </div>
          </>
        )}
      </Modal>

      {/* Complete Confirm */}
      <Modal
        open={!!completeConfirm}
        onClose={() => setCompleteConfirm(null)}
        title="Complete Resignation?"
        footer={
          <>
            <button
              className="erp-btn erp-btn-outline"
              onClick={() => setCompleteConfirm(null)}
              style={{ fontFamily: FONT }}
            >
              Cancel
            </button>
            <button
              className="erp-btn erp-btn-primary"
              onClick={handleComplete}
              style={{ fontFamily: FONT }}
            >
              Yes, Complete
            </button>
          </>
        }
      >
        <div
          style={{
            padding: 12,
            background: "#fef3c7",
            border: "1px solid #fde68a",
            borderRadius: 8,
            marginBottom: 12,
            fontSize: 13,
            color: "#92400e",
            display: "flex",
            gap: 8,
            alignItems: "flex-start",
            fontFamily: FONT,
          }}
        >
          <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            This will <strong>permanently disable</strong> the employee's
            login access.
          </div>
        </div>

        <p style={{ margin: 0, color: "#6b7280", fontFamily: FONT }}>
          Complete resignation for{" "}
          <strong>{completeConfirm?.employee_name}</strong>?
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

const MetaRow = ({ Icon, label, value, highlight }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
    <Icon size={13} color={highlight ? "#4f46e5" : "#9ca3af"} />
    <div
      style={{ flex: 1, display: "flex", justifyContent: "space-between" }}
    >
      <span style={{ fontSize: 12, color: "#6b7280" }}>{label}</span>
      <span
        style={{
          fontSize: 12.5,
          fontWeight: 600,
          color: highlight ? "#4338ca" : "#111827",
        }}
      >
        {value}
      </span>
    </div>
  </div>
);

export default ManagerResignations;