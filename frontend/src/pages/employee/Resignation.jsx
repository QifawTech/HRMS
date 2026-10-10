import { useState, useEffect, useCallback } from "react";
import {
  AlertTriangle,
  FileText,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  MessageSquare,
  User,
  Briefcase,
} from "lucide-react";
import Layout from "../../components/layout/Layout";
import Modal from "../../components/common/Modal";
import Toast from "../../components/common/Toast";
import * as api from "../../api/resignationApi";
import { formatDateTime } from "../../utils/dateUtils";

const FONT = "'Inter', 'Segoe UI', -apple-system, sans-serif";

const statusStyles = {
  None: {
    bg: "#f3f4f6",
    color: "#6b7280",
    label: "Not Applied",
    Icon: FileText,
  },
  Pending: {
    bg: "#fef3c7",
    color: "#92400e",
    label: "Pending Approval",
    Icon: Clock,
  },
  Accepted: {
    bg: "#dbeafe",
    color: "#1e40af",
    label: "Resigned",
    Icon: CheckCircle2,
  },
  Rejected: {
    bg: "#fee2e2",
    color: "#991b1b",
    label: "Rejected",
    Icon: XCircle,
  },
  Completed: {
    bg: "#ecfdf5",
    color: "#065f46",
    label: "Completed",
    Icon: CheckCircle2,
  },
};

const EmployeeResignation = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ reason: "", last_working_day: "" });
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [confirmCancel, setConfirmCancel] = useState(false);

  // ✅ Dynamic notice period
  const [noticePeriodDays, setNoticePeriodDays] = useState(15);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getMyResignation();
      setData(res.data || {});
      // ✅ Read notice period from backend response
      if (res.data?.notice_period_days) {
        setNoticePeriodDays(res.data.notice_period_days);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Compute min last working day
  const getMinDateStr = () => {
    const minDate = new Date();
    minDate.setDate(minDate.getDate() + noticePeriodDays);
    return minDate.toISOString().split("T")[0];
  };

  const openApply = () => {
    setForm({
      reason: "",
      last_working_day: getMinDateStr(),
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.reason.trim() || form.reason.length < 10) {
      setToast({
        message: "Please provide a detailed reason (min 10 characters)",
        type: "error",
      });
      return;
    }
    if (!form.last_working_day) {
      setToast({ message: "Please select last working day", type: "error" });
      return;
    }

    // ✅ Validate against dynamic notice period
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(form.last_working_day);
    selected.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil(
      (selected - today) / (1000 * 60 * 60 * 24)
    );

    if (diffDays < noticePeriodDays) {
      setToast({
        message: `Minimum ${noticePeriodDays} days notice required. You've selected ${diffDays} days.`,
        type: "error",
      });
      return;
    }

    setSubmitting(true);
    try {
      await api.applyResignation(form);
      setToast({
        message: "Resignation application submitted to manager",
        type: "success",
      });
      setModalOpen(false);
      load();
    } catch (err) {
      setToast({
        message: err.response?.data?.error || "Failed to apply",
        type: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    try {
      await api.cancelResignation();
      setToast({ message: "Resignation cancelled", type: "success" });
      setConfirmCancel(false);
      load();
    } catch (err) {
      setToast({
        message: err.response?.data?.error || "Failed to cancel",
        type: "error",
      });
    }
  };

  const status = data?.resignation_status || "None";
  const style = statusStyles[status] || statusStyles.None;
  const StatusIcon = style.Icon;

  return (
    <Layout>
      <style>{`
        .res-page * { font-family: ${FONT}; }
        .res-page { font-family: ${FONT}; }

        @media (max-width: 767px) {
          .res-page .erp-page-title { font-size: 22px; }
          .res-page .erp-page-subtitle { font-size: 12.5px; }
          .res-page .res-apply-btn {
            width: 100%;
            justify-content: center;
          }
          .res-page .erp-card { padding: 16px !important; }
        }
      `}</style>

      <div className="res-page">
        <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-4">
          <div>
            <h1 className="erp-page-title">Resignation</h1>
            <p className="erp-page-subtitle mb-0">
              Submit and track your resignation request
            </p>
          </div>
          {(status === "None" || status === "Rejected") && (
            <button
              className="erp-btn erp-btn-danger res-apply-btn"
              onClick={openApply}
              style={{ fontFamily: FONT }}
            >
              <Send size={15} /> Apply for Resignation
            </button>
          )}
        </div>

        {loading ? (
          <div
            className="erp-card text-center py-5"
            style={{ color: "#6b7280" }}
          >
            <div className="spinner-border spinner-border-sm me-2" />
            Loading...
          </div>
        ) : (
          <div className="row g-3">
            {/* Status Card */}
            <div className="col-12 col-md-6">
              <div className="erp-card" style={{ padding: 20 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#9ca3af",
                    textTransform: "uppercase",
                    letterSpacing: 0.4,
                    marginBottom: 12,
                  }}
                >
                  Current Status
                </div>
                <div
                  className="erp-task-badge"
                  style={{
                    background: style.bg,
                    color: style.color,
                    fontSize: 13,
                    padding: "8px 14px",
                    fontWeight: 700,
                  }}
                >
                  <StatusIcon size={14} /> {style.label}
                </div>

                {data?.resignation_applied_at && (
                  <div
                    style={{
                      marginTop: 14,
                      fontSize: 12.5,
                      color: "#6b7280",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Calendar size={12} />
                    Applied: {formatDateTime(data.resignation_applied_at)}
                  </div>
                )}
              </div>
            </div>

            {/* Details Card */}
            {status !== "None" && (
              <div className="col-12 col-md-6">
                <div className="erp-card" style={{ padding: 20 }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#9ca3af",
                      textTransform: "uppercase",
                      letterSpacing: 0.4,
                      marginBottom: 12,
                    }}
                  >
                    Details
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}
                  >
                    {data.resignation_last_day && (
                      <Row
                        Icon={Calendar}
                        label="Requested Last Day"
                        value={new Date(
                          data.resignation_last_day
                        ).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      />
                    )}
                    {data.resignation_notice_end && (
                      <Row
                        Icon={Briefcase}
                        label="Last Working Day"
                        value={new Date(
                          data.resignation_notice_end
                        ).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                        highlight
                      />
                    )}
                    {data.resignation_reviewed_by_name && (
                      <Row
                        Icon={User}
                        label="Reviewed By"
                        value={data.resignation_reviewed_by_name}
                      />
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Reason Card */}
            {data?.resignation_reason && (
              <div className="col-12">
                <div className="erp-card" style={{ padding: 20 }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#9ca3af",
                      textTransform: "uppercase",
                      letterSpacing: 0.4,
                      marginBottom: 10,
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                    }}
                  >
                    <MessageSquare size={12} /> Your Reason
                  </div>
                  <div
                    style={{
                      padding: 12,
                      background: "#f9fafb",
                      borderRadius: 8,
                      fontSize: 13,
                      color: "#374151",
                      lineHeight: 1.6,
                    }}
                  >
                    {data.resignation_reason}
                  </div>
                </div>
              </div>
            )}

            {/* Manager Feedback */}
            {data?.resignation_review_comment && (
              <div className="col-12">
                <div className="erp-card" style={{ padding: 20 }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#9ca3af",
                      textTransform: "uppercase",
                      letterSpacing: 0.4,
                      marginBottom: 10,
                    }}
                  >
                    Manager's Response
                  </div>
                  <div
                    style={{
                      padding: 12,
                      background:
                        status === "Rejected" ? "#fef2f2" : "#ecfdf5",
                      border: `1px solid ${
                        status === "Rejected" ? "#fecaca" : "#a7f3d0"
                      }`,
                      borderRadius: 8,
                      fontSize: 13,
                      color:
                        status === "Rejected" ? "#991b1b" : "#065f46",
                      fontStyle: "italic",
                    }}
                  >
                    "{data.resignation_review_comment}"
                  </div>
                </div>
              </div>
            )}

            {/* Cancel button for pending */}
            {status === "Pending" && (
              <div className="col-12">
                <button
                  className="erp-btn erp-btn-outline"
                  onClick={() => setConfirmCancel(true)}
                  style={{
                    color: "#dc2626",
                    borderColor: "#fecaca",
                    fontFamily: FONT,
                  }}
                >
                  Cancel Resignation Request
                </button>
              </div>
            )}

            {/* Info card for accepted (Resigned) */}
            {status === "Accepted" && (
              <div className="col-12">
                <div
                  className="erp-card"
                  style={{
                    padding: 16,
                    background: "#eff6ff",
                    border: "1px solid #bfdbfe",
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      color: "#1e40af",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <CheckCircle2 size={16} />
                    <div>
                      <strong>Your resignation has been accepted.</strong>
                      {data?.resignation_notice_end && (
                        <>
                          {" "}
                          Your last working day is{" "}
                          <strong>
                            {new Date(
                              data.resignation_notice_end
                            ).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </strong>
                          .
                        </>
                      )}{" "}
                      Please ensure smooth handover of your responsibilities.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Apply Modal */}
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Apply for Resignation"
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
                className="erp-btn erp-btn-danger"
                onClick={handleSubmit}
                disabled={submitting}
                style={{ fontFamily: FONT }}
              >
                {submitting ? "Submitting..." : "Submit Request"}
              </button>
            </>
          }
        >
          {/* ✅ Dynamic notice warning */}
          <div
            style={{
              padding: 12,
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: 8,
              marginBottom: 16,
              display: "flex",
              gap: 8,
              alignItems: "flex-start",
              fontSize: 12.5,
              color: "#991b1b",
              fontFamily: FONT,
            }}
          >
            <AlertTriangle
              size={16}
              style={{ flexShrink: 0, marginTop: 1 }}
            />
            <div>
              <strong>Important:</strong> Please provide at least{" "}
              <strong>{noticePeriodDays} days</strong> notice. Your manager
              will review and confirm.
            </div>
          </div>

          <div className="mb-3">
            <label className="erp-label">Reason for Resignation *</label>
            <textarea
              className="erp-input"
              rows={4}
              placeholder="Please explain your reason in detail..."
              value={form.reason}
              onChange={(e) =>
                setForm({ ...form, reason: e.target.value })
              }
              style={{ resize: "vertical", fontFamily: FONT }}
              autoFocus
            />
            <small style={{ color: "#9ca3af", fontSize: 11 }}>
              Minimum 10 characters
            </small>
          </div>

          <div className="mb-3">
            <label className="erp-label">
              Preferred Last Working Day *
            </label>
            <input
              type="date"
              className="erp-input"
              value={form.last_working_day}
              min={getMinDateStr()}
              onChange={(e) =>
                setForm({ ...form, last_working_day: e.target.value })
              }
              style={{ fontFamily: FONT }}
            />
            <small style={{ color: "#9ca3af", fontSize: 11 }}>
              Minimum {noticePeriodDays} days from today
            </small>
          </div>
        </Modal>

        {/* Cancel Confirm */}
        <Modal
          open={confirmCancel}
          onClose={() => setConfirmCancel(false)}
          title="Cancel Resignation?"
          footer={
            <>
              <button
                className="erp-btn erp-btn-outline"
                onClick={() => setConfirmCancel(false)}
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
          <p style={{ margin: 0, color: "#6b7280", fontFamily: FONT }}>
            Are you sure you want to cancel your resignation request?
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

const Row = ({ Icon, label, value, highlight }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
    <Icon size={14} color={highlight ? "#4f46e5" : "#9ca3af"} />
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600 }}>
        {label}
      </div>
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: highlight ? "#4338ca" : "#111827",
        }}
      >
        {value}
      </div>
    </div>
  </div>
);

export default EmployeeResignation;