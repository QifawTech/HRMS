import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus,
  CalendarDays,
  X,
  CheckCircle2,
  Clock,
  XCircle,
  Ban,
  MessageSquare,
  User as UserIcon,
  AlertTriangle,
} from "lucide-react";
import Layout from "../../components/layout/Layout";
import Modal from "../../components/common/Modal";
import Toast from "../../components/common/Toast";
import * as api from "../../api/leaveApi";
import { formatDateTime, formatDate } from "../../utils/dateUtils";

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
      return (
        <span className="erp-badge erp-badge-gray">
          <Ban size={11} /> Cancelled
        </span>
      );
    default:
      return <span className="erp-badge erp-badge-gray">{status}</span>;
  }
};

const emptyForm = {
  leave_type_id: "",
  start_date: new Date().toISOString().split("T")[0],
  end_date: new Date().toISOString().split("T")[0],
  reason: "",
};

const EmployeeLeave = () => {
  const [leaves, setLeaves] = useState([]);
  const [types, setTypes] = useState([]);
  const [stats, setStats] = useState([]);
  const [fyInfo, setFyInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [filterStatus, setFilterStatus] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [lRes, tRes, sRes, fyRes] = await Promise.all([
        api.getMyLeaves(),
        api.listLeaveTypes(),
        api.getMyLeaveStats(),
        api.getFinancialYear(),
      ]);
      setLeaves(Array.isArray(lRes.data) ? lRes.data : []);
      setTypes(Array.isArray(tRes.data) ? tRes.data : []);
      setStats(Array.isArray(sRes.data) ? sRes.data : []);
      setFyInfo(fyRes.data || null);
    } catch (e) {
      setToast({ message: "Failed to load leaves", type: "error" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openApply = () => {
    setForm(emptyForm);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.leave_type_id) {
      setToast({ message: "Select a leave type", type: "error" });
      return;
    }
    if (!form.start_date || !form.end_date) {
      setToast({ message: "Start and end dates required", type: "error" });
      return;
    }
    setSaving(true);
    try {
      await api.applyLeave(form);
      setToast({ message: "Leave request submitted!", type: "success" });
      setModalOpen(false);
      load();
    } catch (err) {
      setToast({
        message: err.response?.data?.error || "Failed to apply",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    try {
      await api.cancelLeave(cancelTarget._id);
      setToast({ message: "Leave cancelled", type: "success" });
      setCancelTarget(null);
      load();
    } catch (err) {
      setToast({
        message: err.response?.data?.error || "Failed to cancel",
        type: "error",
      });
    }
  };

  const daysDiff = () => {
    if (!form.start_date || !form.end_date) return 0;
    const s = new Date(form.start_date);
    const e = new Date(form.end_date);
    return Math.max(1, Math.floor((e - s) / (1000 * 60 * 60 * 24)) + 1);
  };

  const isSameDayRequest = () => {
    const today = new Date().toISOString().split("T")[0];
    return form.start_date === today;
  };

  const selectedType = useMemo(() => {
    return types.find((t) => t._id === form.leave_type_id);
  }, [types, form.leave_type_id]);

  const filteredLeaves = useMemo(() => {
    if (!filterStatus) return leaves;
    return leaves.filter((l) => l.status === filterStatus);
  }, [leaves, filterStatus]);

  const counts = useMemo(() => {
    return {
      all: leaves.length,
      Pending: leaves.filter((l) => l.status === "Pending").length,
      Approved: leaves.filter((l) => l.status === "Approved").length,
      Rejected: leaves.filter((l) => l.status === "Rejected").length,
      Cancelled: leaves.filter((l) => l.status === "Cancelled").length,
    };
  }, [leaves]);

  const tabs = [
    { key: "", label: "All", count: counts.all },
    { key: "Pending", label: "Pending", count: counts.Pending },
    { key: "Approved", label: "Approved", count: counts.Approved },
    { key: "Rejected", label: "Rejected", count: counts.Rejected },
    { key: "Cancelled", label: "Cancelled", count: counts.Cancelled },
  ];

  return (
    <Layout>
      <div style={{ fontFamily: FONT }}>
        <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
          <div>
            <h1 className="erp-page-title">My Leaves</h1>
            <p className="erp-page-subtitle mb-0">
              Apply and track your leave requests
              {fyInfo && (
                <span
                  style={{
                    marginLeft: 8,
                    fontSize: 11.5,
                    background: "#eef2ff",
                    color: "#4338ca",
                    padding: "2px 8px",
                    borderRadius: 6,
                    fontWeight: 700,
                  }}
                >
                  {fyInfo.label}
                </span>
              )}
            </p>
          </div>
          <button className="erp-btn erp-btn-primary" onClick={openApply}>
            <Plus size={15} /> Apply Leave
          </button>
        </div>

        {/* FY Info Banner */}
        {fyInfo && (
          <div
            style={{
              padding: 12,
              background: "#eef2ff",
              border: "1px solid #c7d2fe",
              borderRadius: 10,
              marginBottom: 16,
              fontSize: 12.5,
              color: "#3730a3",
              fontFamily: FONT,
            }}
          >
            <strong>Financial Year:</strong> {fyInfo.label} ·{" "}
            <span style={{ color: "#6b7280" }}>
              {formatDate(fyInfo.start_date)} — {formatDate(fyInfo.end_date)}
            </span>
          </div>
        )}

        {/* Stats — Only CL + SL */}
        {stats.length > 0 && (
          <div className="row g-3 mb-3">
            {stats.map((s) => {
              const pct = s.total > 0 ? (s.used / s.total) * 100 : 0;
              const color = s.code === "CL" ? "#4f46e5" : "#dc2626";
              const bg = s.code === "CL" ? "#eef2ff" : "#fef2f2";
              return (
                <div className="col-12 col-md-6" key={s.leave_type_id}>
                  <div
                    className="erp-card"
                    style={{ padding: 18, fontFamily: FONT }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: 12,
                      }}
                    >
                      <div>
                        <p
                          className="erp-stat-label"
                          style={{ marginBottom: 4 }}
                        >
                          {s.name}
                        </p>
                        <div
                          style={{
                            fontSize: 26,
                            fontWeight: 800,
                            color: "#0f172a",
                            letterSpacing: "-0.5px",
                          }}
                        >
                          {s.available}
                          <span
                            style={{
                              fontSize: 14,
                              color: "#6b7280",
                              fontWeight: 500,
                            }}
                          >
                            {" "}
                            / {s.total} days
                          </span>
                        </div>
                      </div>
                      <div
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: 10,
                          background: bg,
                          color,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 800,
                          fontSize: 12,
                        }}
                      >
                        {s.code}
                      </div>
                    </div>
                    <div
                      style={{
                        height: 6,
                        background: "#f3f4f6",
                        borderRadius: 3,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${pct}%`,
                          height: "100%",
                          background: color,
                          transition: "width 0.3s",
                        }}
                      />
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginTop: 6,
                        fontSize: 11.5,
                        color: "#6b7280",
                      }}
                    >
                      <span>Used: {s.used} days</span>
                      <span>
                        {s.code === "CL"
                          ? "Unused lapses at FY end"
                          : "Unused may be encashed"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Status Tabs */}
        {leaves.length > 0 && (
          <div className="erp-card mb-3" style={{ padding: 6 }}>
            <div className="d-flex gap-1 flex-wrap">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setFilterStatus(t.key)}
                  className="erp-btn"
                  style={{
                    background:
                      filterStatus === t.key ? "var(--primary)" : "transparent",
                    color:
                      filterStatus === t.key ? "white" : "var(--text-primary)",
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
                        filterStatus === t.key
                          ? "rgba(255,255,255,0.25)"
                          : "#f3f4f6",
                      color:
                        filterStatus === t.key
                          ? "white"
                          : "var(--text-secondary)",
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
        )}

        {/* Leave Requests Table */}
        {loading ? (
          <div
            className="erp-card text-center py-5"
            style={{ color: "#6b7280" }}
          >
            <div className="spinner-border spinner-border-sm me-2" />
            Loading...
          </div>
        ) : filteredLeaves.length === 0 ? (
          <div className="erp-card text-center py-5">
            <CalendarDays
              size={42}
              color="#d1d5db"
              style={{ marginBottom: 12 }}
            />
            <h5 style={{ fontWeight: 600 }}>
              {leaves.length === 0
                ? "No leave requests yet"
                : `No ${filterStatus.toLowerCase()} leaves`}
            </h5>
            <p style={{ color: "#6b7280", marginBottom: 16 }}>
              {leaves.length === 0
                ? "Apply for your first leave"
                : "Try a different filter"}
            </p>
            {leaves.length === 0 && (
              <button className="erp-btn erp-btn-primary" onClick={openApply}>
                <Plus size={15} /> Apply Leave
              </button>
            )}
          </div>
        ) : (
          <div className="erp-card" style={{ padding: 0, overflow: "hidden" }}>
            <div className="table-responsive">
              <table className="erp-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>From</th>
                    <th>To</th>
                    <th>Days</th>
                    <th>Reason</th>
                    <th>Status / Reviewed By</th>
                    <th style={{ width: 80 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeaves.map((l) => (
                    <tr key={l._id}>
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
                      <td style={{ fontSize: 13 }}>
                        {formatDate(l.start_date)}
                      </td>
                      <td style={{ fontSize: 13 }}>{formatDate(l.end_date)}</td>
                      <td>
                        <span className="erp-badge erp-badge-blue">
                          {l.total_days}d
                        </span>
                      </td>
                      <td
                        style={{
                          fontSize: 12.5,
                          color: "#6b7280",
                          maxWidth: 180,
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
                          <div style={{ marginTop: 6 }}>
                            {l.reviewer_name && (
                              <div
                                style={{
                                  fontSize: 11.5,
                                  color: "#6b7280",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 4,
                                }}
                              >
                                <UserIcon size={11} />
                                <span>
                                  by <strong>{l.reviewer_name}</strong>
                                </span>
                              </div>
                            )}
                            {l.reviewed_at && (
                              <div
                                style={{
                                  fontSize: 10.5,
                                  color: "#9ca3af",
                                  marginTop: 2,
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
                                  background: "#f9fafb",
                                  padding: "4px 8px",
                                  borderRadius: 6,
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 4,
                                  maxWidth: 220,
                                }}
                              >
                                <MessageSquare size={10} />
                                <span
                                  style={{
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {l.manager_comment}
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {l.status === "Cancelled" && (
                          <div
                            style={{
                              fontSize: 10.5,
                              color: "#9ca3af",
                              marginTop: 4,
                            }}
                          >
                            Cancelled by you
                          </div>
                        )}
                      </td>
                      <td>
                        {l.status === "Pending" && (
                          <button
                            className="erp-icon-btn erp-icon-btn-danger"
                            onClick={() => setCancelTarget(l)}
                            title="Cancel"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Apply Modal */}
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Apply for Leave"
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
                {saving ? "Submitting..." : "Submit Request"}
              </button>
            </>
          }
        >
          <div className="mb-3">
            <label className="erp-label">Leave Type *</label>
            <select
              className="erp-input"
              value={form.leave_type_id}
              onChange={(e) =>
                setForm({ ...form, leave_type_id: e.target.value })
              }
              style={{ fontFamily: FONT }}
            >
              <option value="">Select Leave Type</option>
              {types.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name} ({t.max_days_per_year} days/year)
                </option>
              ))}
            </select>
          </div>

          <div className="row g-3 mb-3">
            <div className="col-6">
              <label className="erp-label">Start Date *</label>
              <input
                type="date"
                className="erp-input"
                value={form.start_date}
                onChange={(e) =>
                  setForm({ ...form, start_date: e.target.value })
                }
                min={new Date().toISOString().split("T")[0]}
                style={{ fontFamily: FONT }}
              />
            </div>
            <div className="col-6">
              <label className="erp-label">End Date *</label>
              <input
                type="date"
                className="erp-input"
                value={form.end_date}
                onChange={(e) =>
                  setForm({ ...form, end_date: e.target.value })
                }
                min={form.start_date}
                style={{ fontFamily: FONT }}
              />
            </div>
          </div>

          <div className="mb-3">
            <label className="erp-label">Total Days</label>
            <div
              style={{
                padding: "8px 12px",
                background: "#eef2ff",
                borderRadius: 8,
                fontWeight: 600,
                color: "#4338ca",
                fontFamily: FONT,
              }}
            >
              {daysDiff()} day(s)
              {isSameDayRequest() && (
                <span
                  style={{
                    marginLeft: 8,
                    fontSize: 11,
                    background: "#fef3c7",
                    color: "#92400e",
                    padding: "1px 6px",
                    borderRadius: 4,
                  }}
                >
                  SAME DAY
                </span>
              )}
            </div>
          </div>

          {/* Same Day Warning */}
          {isSameDayRequest() && (
            <div
              style={{
                padding: 10,
                background: "#fef3c7",
                border: "1px solid #fde68a",
                borderRadius: 8,
                marginBottom: 16,
                fontSize: 12,
                color: "#92400e",
                fontFamily: FONT,
                lineHeight: 1.5,
              }}
            >
              <AlertTriangle
                size={13}
                style={{ display: "inline", marginRight: 6 }}
              />
              <strong>Same-day leave:</strong>{" "}
              {selectedType?.code === "SL" ? (
                "Sick leave allows same-day application."
              ) : (
                <>
                  Casual leave same-day requires{" "}
                  <strong>manager approval</strong>.
                </>
              )}
            </div>
          )}

          <div className="mb-3">
            <label className="erp-label">Reason *</label>
            <textarea
              className="erp-input"
              rows={3}
              placeholder="Why do you need this leave?"
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              style={{ resize: "vertical", fontFamily: FONT }}
            />
          </div>

          <div
            style={{
              padding: 8,
              background: "#f8fafc",
              borderRadius: 6,
              fontSize: 11.5,
              color: "#6b7280",
              fontFamily: FONT,
            }}
          >
            <strong>Note:</strong> Sandwich leave not allowed (weekend between
            two casual leaves).
          </div>
        </Modal>

        {/* Cancel Confirm */}
        <Modal
          open={!!cancelTarget}
          onClose={() => setCancelTarget(null)}
          title="Cancel Leave Request?"
          footer={
            <>
              <button
                className="erp-btn erp-btn-outline"
                onClick={() => setCancelTarget(null)}
                style={{ fontFamily: FONT }}
              >
                No, Keep
              </button>
              <button
                className="erp-btn erp-btn-danger"
                onClick={handleCancel}
                style={{ fontFamily: FONT }}
              >
                Yes, Cancel
              </button>
            </>
          }
        >
          <p style={{ color: "#6b7280", margin: 0, fontFamily: FONT }}>
            Are you sure you want to cancel this leave request? This action
            cannot be undone.
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

export default EmployeeLeave;