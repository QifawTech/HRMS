import { useState, useEffect, useCallback } from "react";
import { Search, Check, X, Clock, CheckCircle2, ShieldAlert } from "lucide-react";
import Layout from "../../components/layout/Layout";
import Modal from "../../components/common/Modal";
import Toast from "../../components/common/Toast";
import * as api from "../../api/forgotLogoutApi";
import { formatDateTime } from "../../utils/dateUtils";

const FONT = "'Calibri', 'Segoe UI', -apple-system, sans-serif";

const statusStyles = {
  Pending: { bg: "#fef3c7", color: "#92400e", label: "Pending" },
  Approved: { bg: "#ecfdf5", color: "#065f46", label: "Approved" },
  Rejected: { bg: "#fee2e2", color: "#991b1b", label: "Rejected" },
};

const ManagerForgotLogout = () => {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("Pending");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState(null);
  const [reviewModal, setReviewModal] = useState(null);
  const [reviewComment, setReviewComment] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [lRes, sRes] = await Promise.all([
        api.listRequests(tab, search),
        api.getStats(),
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
  };

  const submitReview = async () => {
    if (!reviewModal) return;
    if (reviewModal.action === "Reject" && !reviewComment.trim()) {
      setToast({ message: "Reason required", type: "error" });
      return;
    }
    try {
      await api.reviewRequest(
        reviewModal.item._id,
        reviewModal.action === "Approve" ? "Approve" : "Reject",
        reviewComment
      );
      setToast({
        message:
          reviewModal.action === "Approve"
            ? "Approved — employee can now check-in"
            : "Request rejected",
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

  const tabs = [
    { key: "Pending", label: "Pending", count: stats.pending || 0 },
    { key: "Approved", label: "Approved", count: stats.approved || 0 },
    { key: "Rejected", label: "Rejected", count: stats.rejected || 0 },
  ];

  return (
    <Layout>
      <div style={{ fontFamily: FONT }}>
        <div className="mb-4">
          <h1 className="erp-page-title">Forgot Logout Requests</h1>
          <p className="erp-page-subtitle mb-0">
            Review employee requests who forgot to logout
          </p>
        </div>

        <div className="row g-3 mb-4">
          <div className="col-6 col-md-4">
            <div className="erp-card erp-stat-card">
              <div>
                <p className="erp-stat-label">Pending</p>
                <p className="erp-stat-value">{stats.pending || 0}</p>
              </div>
              <div className="erp-stat-icon" style={{ background: "#fef3c7", color: "#d97706" }}>
                <Clock size={20} />
              </div>
            </div>
          </div>
          <div className="col-6 col-md-4">
            <div className="erp-card erp-stat-card">
              <div>
                <p className="erp-stat-label">Approved</p>
                <p className="erp-stat-value">{stats.approved || 0}</p>
              </div>
              <div className="erp-stat-icon" style={{ background: "#ecfdf5", color: "#059669" }}>
                <CheckCircle2 size={20} />
              </div>
            </div>
          </div>
          <div className="col-6 col-md-4">
            <div className="erp-card erp-stat-card">
              <div>
                <p className="erp-stat-label">Rejected</p>
                <p className="erp-stat-value">{stats.rejected || 0}</p>
              </div>
              <div className="erp-stat-icon" style={{ background: "#fee2e2", color: "#dc2626" }}>
                <X size={20} />
              </div>
            </div>
          </div>
        </div>

        <div className="erp-card mb-3" style={{ padding: 12 }}>
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
                      background: tab === t.key ? "rgba(255,255,255,0.25)" : "#f3f4f6",
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

        {loading ? (
          <div className="erp-card text-center py-5" style={{ color: "#6b7280" }}>
            <div className="spinner-border spinner-border-sm me-2" />
            Loading...
          </div>
        ) : items.length === 0 ? (
          <div className="erp-card text-center py-5">
            <ShieldAlert size={42} color="#d1d5db" style={{ marginBottom: 12 }} />
            <h5 style={{ fontWeight: 600 }}>No requests</h5>
            <p style={{ color: "#6b7280", margin: 0 }}>
              {tab} requests will appear here
            </p>
          </div>
        ) : (
          <div className="row g-3">
            {items.map((item) => {
              const st = statusStyles[item.status] || statusStyles.Pending;
              return (
                <div className="col-12 col-lg-6" key={item._id}>
                  <div
                    className="erp-task-card"
                    style={{
                      borderLeftColor:
                        item.status === "Pending" ? "#d97706"
                        : item.status === "Approved" ? "#059669" : "#dc2626",
                    }}
                  >
                    <div className="d-flex align-items-center gap-2 mb-3 flex-wrap">
                      <span className="erp-task-badge" style={{ background: st.bg, color: st.color, fontWeight: 700 }}>
                        ● {st.label}
                      </span>
                      {item.status === "Pending" && (
                        <span className="erp-task-badge" style={{ background: "#dc2626", color: "white", fontSize: 10 }}>
                          ⚡ ACTION REQUIRED
                        </span>
                      )}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                      <div className="erp-avatar">
                        {item.employee_name?.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{item.employee_name}</div>
                        <div style={{ fontSize: 12, color: "#6b7280" }}>{item.employee_code}</div>
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <MetaRow
                        Icon={Clock}
                        label="Forgot on"
                        value={item.attendance_date ? new Date(item.attendance_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                        highlight
                      />
                      <MetaRow Icon={Clock} label="Requested" value={formatDateTime(item.applied_at)} />
                    </div>

                    {item.reason && (
                      <div style={{ marginTop: 12, padding: 10, background: "#f9fafb", borderRadius: 8, fontSize: 12.5, color: "#4b5563", lineHeight: 1.5 }}>
                        <strong style={{ color: "#111827" }}>Reason:</strong> {item.reason}
                      </div>
                    )}

                    {item.review_comment && item.status !== "Pending" && (
                      <div style={{ marginTop: 10, padding: 10, background: item.status === "Rejected" ? "#fef2f2" : "#ecfdf5", borderRadius: 8, fontSize: 12.5, color: item.status === "Rejected" ? "#991b1b" : "#065f46", fontStyle: "italic" }}>
                        <strong>Your response:</strong> {item.review_comment}
                      </div>
                    )}

                    {item.status === "Pending" && (
                      <div style={{ display: "flex", gap: 8, marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
                        <button className="erp-task-action-btn" onClick={() => openReview(item, "Approve")} style={{ color: "#059669", borderColor: "#a7f3d0", background: "#ecfdf5", flex: 1, justifyContent: "center" }}>
                          <Check size={13} /> Approve
                        </button>
                        <button className="erp-task-action-btn" onClick={() => openReview(item, "Reject")} style={{ color: "#dc2626", borderColor: "#fecaca", background: "#fef2f2", flex: 1, justifyContent: "center" }}>
                          <X size={13} /> Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Modal
          open={!!reviewModal}
          onClose={() => setReviewModal(null)}
          title={reviewModal?.action === "Approve" ? "Approve Request" : "Reject Request"}
          footer={
            <>
              <button className="erp-btn erp-btn-outline" onClick={() => setReviewModal(null)} style={{ fontFamily: FONT }}>
                Cancel
              </button>
              <button className={`erp-btn ${reviewModal?.action === "Approve" ? "erp-btn-primary" : "erp-btn-danger"}`} onClick={submitReview} style={{ fontFamily: FONT }}>
                {reviewModal?.action === "Approve" ? "Confirm Approve" : "Reject"}
              </button>
            </>
          }
        >
          {reviewModal && (
            <>
              <div style={{ padding: 12, background: "#f9fafb", borderRadius: 8, marginBottom: 16, fontFamily: FONT }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{reviewModal.item.employee_name}</div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>{reviewModal.item.employee_code}</div>
              </div>

              <div className="mb-3">
                <label className="erp-label">
                  {reviewModal.action === "Approve" ? "Comment (Optional)" : "Reason for Rejection *"}
                </label>
                <textarea className="erp-input" rows={3} value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} style={{ resize: "vertical", fontFamily: FONT }} autoFocus />
              </div>
            </>
          )}
        </Modal>

        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    </Layout>
  );
};

const MetaRow = ({ Icon, label, value, highlight }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
    <Icon size={13} color={highlight ? "#4f46e5" : "#9ca3af"} />
    <div style={{ flex: 1, display: "flex", justifyContent: "space-between" }}>
      <span style={{ fontSize: 12, color: "#6b7280" }}>{label}</span>
      <span style={{ fontSize: 12.5, fontWeight: 600, color: highlight ? "#4338ca" : "#111827" }}>{value}</span>
    </div>
  </div>
);

export default ManagerForgotLogout;