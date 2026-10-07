import { useState, useEffect, useCallback } from "react";
import {
  Check,
  X,
  Search,
  CalendarDays,
  Clock,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Users,
  AlertTriangle,
} from "lucide-react";
import Layout from "../../components/layout/Layout";
import Modal from "../../components/common/Modal";
import Toast from "../../components/common/Toast";
import * as api from "../../api/leaveApi";
import { formatDate, formatDateTime } from "../../utils/dateUtils";

const FONT = "'Calibri', 'Segoe UI', -apple-system, sans-serif";

const statusBadge = (status) => {
  switch (status) {
    case "Pending":
      return (
        <span
          className="erp-badge"
          style={{ background: "#fef3c7", color: "#92400e" }}
        >
          <Clock size={11} /> Pending
        </span>
      );
    case "Approved":
      return (
        <span className="erp-badge erp-badge-green">
          <CheckCircle2 size={11} /> Approved
        </span>
      );
    case "Rejected":
      return (
        <span
          className="erp-badge"
          style={{ background: "#fee2e2", color: "#991b1b" }}
        >
          <XCircle size={11} /> Rejected
        </span>
      );
    case "Cancelled":
      return <span className="erp-badge erp-badge-gray">Cancelled</span>;
    default:
      return <span className="erp-badge erp-badge-gray">{status}</span>;
  }
};

const StatCard = ({ label, value, icon: Icon, color, bg, active, onClick }) => (
  <div className="col-6 col-md-3">
    <div
      className="erp-card erp-stat-card"
      style={{
        cursor: onClick ? "pointer" : "default",
        border: active ? `2px solid ${color}` : "1px solid var(--border)",
      }}
      onClick={onClick}
    >
      <div>
        <p className="erp-stat-label">{label}</p>
        <p className="erp-stat-value">{value}</p>
      </div>
      <div className="erp-stat-icon" style={{ backgroundColor: bg, color }}>
        <Icon size={20} />
      </div>
    </div>
  </div>
);

const LeaveManagement = () => {
  const [leaves, setLeaves] = useState([]);
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [search, setSearch] = useState("");
  const [reviewTarget, setReviewTarget] = useState(null);
  const [reviewAction, setReviewAction] = useState("Approved");
  const [reviewComment, setReviewComment] = useState("");
  const [toast, setToast] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [lRes, sRes] = await Promise.all([
        api.getAllLeaves(filterStatus, search),
        api.getLeaveStats(),
      ]);
      setLeaves(Array.isArray(lRes.data) ? lRes.data : []);
      setStats(sRes.data || {});
    } catch (e) {
      setToast({ message: "Failed to load", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [filterStatus, search]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const openReview = (leave, action) => {
    setReviewTarget(leave);
    setReviewAction(action);
    setReviewComment("");
  };

  const submitReview = async () => {
    if (!reviewTarget) return;
    try {
      await api.reviewLeave(reviewTarget._id, reviewAction, reviewComment);
      setToast({
        message: `Leave ${reviewAction.toLowerCase()} successfully`,
        type: "success",
      });
      setReviewTarget(null);
      load();
    } catch (err) {
      setToast({
        message: err.response?.data?.error || "Failed",
        type: "error",
      });
    }
  };

  return (
    <Layout>
      <div style={{ fontFamily: FONT }}>
        <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
          <div>
            <h1 className="erp-page-title">Leave Management</h1>
            <p className="erp-page-subtitle mb-0">
              Review and manage employee leave requests
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="row g-3 mb-3">
          <StatCard
            label="Pending"
            value={stats.pending || 0}
            icon={Clock}
            color="#d97706"
            bg="#fef3c7"
            active={filterStatus === "Pending"}
            onClick={() =>
              setFilterStatus(filterStatus === "Pending" ? "" : "Pending")
            }
          />
          <StatCard
            label="Approved"
            value={stats.approved || 0}
            icon={CheckCircle2}
            color="#059669"
            bg="#ecfdf5"
            active={filterStatus === "Approved"}
            onClick={() =>
              setFilterStatus(filterStatus === "Approved" ? "" : "Approved")
            }
          />
          <StatCard
            label="Rejected"
            value={stats.rejected || 0}
            icon={XCircle}
            color="#dc2626"
            bg="#fef2f2"
            active={filterStatus === "Rejected"}
            onClick={() =>
              setFilterStatus(filterStatus === "Rejected" ? "" : "Rejected")
            }
          />
          <StatCard
            label="Total"
            value={stats.total || 0}
            icon={Users}
            color="#4f46e5"
            bg="#eef2ff"
            active={filterStatus === ""}
            onClick={() => setFilterStatus("")}
          />
        </div>

        {/* Filters */}
        <div className="erp-card mb-3" style={{ padding: 12 }}>
          <div className="row g-2">
            <div className="col-12 col-md-4">
              <select
                className="erp-input"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{ fontFamily: FONT }}
              >
                <option value="">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
            <div className="col-12 col-md-8">
              <div className="erp-input-wrapper">
                <Search size={16} className="erp-input-icon" />
                <input
                  className="erp-input"
                  placeholder="Search by employee name or code..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ fontFamily: FONT }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div
            className="erp-card text-center py-5"
            style={{ color: "#6b7280" }}
          >
            <div className="spinner-border spinner-border-sm me-2" />
            Loading...
          </div>
        ) : leaves.length === 0 ? (
          <div className="erp-card text-center py-5">
            <CalendarDays
              size={42}
              color="#d1d5db"
              style={{ marginBottom: 12 }}
            />
            <h5 style={{ fontWeight: 600 }}>No leave requests</h5>
            <p style={{ color: "#6b7280", margin: 0 }}>
              {filterStatus
                ? `No ${filterStatus.toLowerCase()} leave requests`
                : "Nothing to review at the moment"}
            </p>
          </div>
        ) : (
          <div className="erp-card" style={{ padding: 0, overflow: "hidden" }}>
            <div className="table-responsive">
              <table className="erp-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Type</th>
                    <th>Dates</th>
                    <th>Days</th>
                    <th>Reason</th>
                    <th>Status / Reviewed By</th>
                    <th style={{ width: 100 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {leaves.map((l) => (
                    <tr key={l._id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>
                          {l.employee_name}
                        </div>
                        <div style={{ fontSize: 12, color: "#6b7280" }}>
                          {l.employee_code}
                        </div>
                      </td>
                      <td>
                        <strong>{l.leave_type_name}</strong>
                        {l.is_same_day && (
                          <div
                            style={{
                              fontSize: 10,
                              marginTop: 4,
                              background: "#fef3c7",
                              color: "#92400e",
                              padding: "1px 6px",
                              borderRadius: 4,
                              display: "inline-block",
                              fontWeight: 700,
                            }}
                          >
                            SAME DAY
                          </div>
                        )}
                      </td>
                      <td style={{ fontSize: 12.5 }}>
                        {formatDate(l.start_date)}
                        <br />
                        <span style={{ color: "#9ca3af" }}>to</span>{" "}
                        {formatDate(l.end_date)}
                      </td>
                      <td>
                        <span className="erp-badge erp-badge-blue">
                          {l.total_days}d
                        </span>
                      </td>
                      <td
                        style={{
                          fontSize: 12.5,
                          color: "#6b7280",
                          maxWidth: 200,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {l.reason || "—"}
                      </td>
                      <td>
                        {statusBadge(l.status)}
                        {l.status !== "Pending" && l.status !== "Cancelled" && (
                          <>
                            {l.reviewer_name && (
                              <div
                                style={{
                                  fontSize: 11,
                                  color: "#6b7280",
                                  marginTop: 4,
                                }}
                              >
                                by <strong>{l.reviewer_name}</strong>
                              </div>
                            )}
                            {l.reviewed_at && (
                              <div
                                style={{
                                  fontSize: 10.5,
                                  color: "#9ca3af",
                                }}
                              >
                                {formatDateTime(l.reviewed_at)}
                              </div>
                            )}
                            {l.manager_comment && (
                              <div
                                style={{
                                  fontSize: 11,
                                  color: "#6b7280",
                                  marginTop: 4,
                                  fontStyle: "italic",
                                  maxWidth: 200,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                "{l.manager_comment}"
                              </div>
                            )}
                          </>
                        )}
                      </td>
                      <td>
                        {l.status === "Pending" ? (
                          <div className="d-flex gap-1">
                            <button
                              className="erp-icon-btn"
                              onClick={() => openReview(l, "Approved")}
                              title="Approve"
                              style={{ color: "#059669" }}
                            >
                              <Check size={14} />
                            </button>
                            <button
                              className="erp-icon-btn erp-icon-btn-danger"
                              onClick={() => openReview(l, "Rejected")}
                              title="Reject"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: 11, color: "#9ca3af" }}>
                            —
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Review Modal */}
        <Modal
          open={!!reviewTarget}
          onClose={() => setReviewTarget(null)}
          title={
            reviewAction === "Approved" ? "Approve Leave" : "Reject Leave"
          }
          footer={
            <>
              <button
                className="erp-btn erp-btn-outline"
                onClick={() => setReviewTarget(null)}
                style={{ fontFamily: FONT }}
              >
                Cancel
              </button>
              <button
                className={`erp-btn ${
                  reviewAction === "Approved"
                    ? "erp-btn-primary"
                    : "erp-btn-danger"
                }`}
                onClick={submitReview}
                style={{ fontFamily: FONT }}
              >
                {reviewAction === "Approved" ? "Approve" : "Reject"}
              </button>
            </>
          }
        >
          {reviewTarget && (
            <>
              {reviewTarget.is_same_day && (
                <div
                  style={{
                    padding: 12,
                    background: "#fef3c7",
                    border: "1px solid #fde68a",
                    borderRadius: 8,
                    marginBottom: 12,
                    display: "flex",
                    gap: 8,
                    alignItems: "flex-start",
                    fontSize: 12.5,
                    color: "#92400e",
                    fontFamily: FONT,
                  }}
                >
                  <AlertTriangle
                    size={14}
                    style={{ flexShrink: 0, marginTop: 2 }}
                  />
                  <div>
                    <strong>Same-day request.</strong> Employee applied for
                    leave starting today.
                  </div>
                </div>
              )}

              <div
                style={{
                  padding: 12,
                  background: "#f9fafb",
                  borderRadius: 8,
                  marginBottom: 16,
                  fontFamily: FONT,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 6,
                    fontSize: 13,
                  }}
                >
                  <span style={{ color: "#6b7280" }}>Employee</span>
                  <strong>{reviewTarget.employee_name}</strong>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 6,
                    fontSize: 13,
                  }}
                >
                  <span style={{ color: "#6b7280" }}>Type</span>
                  <strong>{reviewTarget.leave_type_name}</strong>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 6,
                    fontSize: 13,
                  }}
                >
                  <span style={{ color: "#6b7280" }}>Dates</span>
                  <strong>
                    {formatDate(reviewTarget.start_date)} →{" "}
                    {formatDate(reviewTarget.end_date)}
                  </strong>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 13,
                  }}
                >
                  <span style={{ color: "#6b7280" }}>Total Days</span>
                  <strong>{reviewTarget.total_days}</strong>
                </div>
              </div>

              {reviewTarget.reason && (
                <div className="mb-3">
                  <label className="erp-label">Employee's Reason</label>
                  <div
                    style={{
                      padding: 10,
                      background: "#eef2ff",
                      borderRadius: 8,
                      fontSize: 13,
                      color: "#4338ca",
                      fontFamily: FONT,
                    }}
                  >
                    {reviewTarget.reason}
                  </div>
                </div>
              )}

              <div className="mb-3">
                <label className="erp-label">
                  <MessageSquare
                    size={12}
                    style={{ display: "inline", marginRight: 4 }}
                  />
                  Comment (Optional)
                </label>
                <textarea
                  className="erp-input"
                  rows={3}
                  placeholder="Add a comment for the employee..."
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  style={{ resize: "vertical", fontFamily: FONT }}
                />
              </div>
            </>
          )}
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

export default LeaveManagement;