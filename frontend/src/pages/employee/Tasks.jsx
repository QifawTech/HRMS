import { useState, useEffect, useCallback } from "react";
import {
  ClipboardList,
  Search,
  Clock,
  AlertTriangle,
  CheckCircle2,
  User,
  Calendar,
  Lock,
  Loader2,
  Play,
  Pause,
  FileText,
  Send,
  Eye,
} from "lucide-react";
import Layout from "../../components/layout/Layout";
import Toast from "../../components/common/Toast";
import Modal from "../../components/common/Modal";
import StartTaskModal from "../../components/tasks/StartTaskModal";
import * as api from "../../api/taskApi";
import { formatDateTime } from "../../utils/dateUtils";

const priorityStyle = {
  LOW: { bg: "#f3f4f6", color: "#4b5563", label: "Low", dot: "#9ca3af" },
  NORMAL: { bg: "#eef2ff", color: "#4338ca", label: "Normal", dot: "#4f46e5" },
  HIGH: { bg: "#fef3c7", color: "#92400e", label: "High", dot: "#d97706" },
  URGENT: { bg: "#fee2e2", color: "#991b1b", label: "Urgent", dot: "#dc2626" },
};

const statusStyle = {
  Pending: { bg: "#fef3c7", color: "#92400e", label: "Pending", Icon: Clock },
  "Plan Submitted": { bg: "#e0e7ff", color: "#3730a3", label: "Plan Submitted", Icon: Send },
  Approved: { bg: "#d1fae5", color: "#065f46", label: "Approved", Icon: CheckCircle2 },
  "Changes Requested": { bg: "#fee2e2", color: "#991b1b", label: "Changes Requested", Icon: AlertTriangle },
  "In Progress": { bg: "#dbeafe", color: "#1e40af", label: "In Progress", Icon: Loader2 },
  Completed: { bg: "#ecfdf5", color: "#065f46", label: "Completed", Icon: CheckCircle2 },
  Cancelled: { bg: "#f3f4f6", color: "#6b7280", label: "Cancelled", Icon: Pause },
};

const EmployeeTasks = () => {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState(null);
  const [busy, setBusy] = useState(null);
  const [startModal, setStartModal] = useState(null);
  const [viewHistory, setViewHistory] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tRes, sRes] = await Promise.all([
        api.getMyTasks(tab, search),
        api.getMyTaskStats(),
      ]);
      setItems(Array.isArray(tRes.data) ? tRes.data : []);
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

  const handleStartWork = async (task) => {
    setBusy(task._id);
    try {
      await api.startWork(task._id);
      setToast({ message: "Work started!", type: "success" });
      load();
    } catch (err) {
      setToast({
        message: err.response?.data?.error || "Failed",
        type: "error",
      });
    } finally {
      setBusy(null);
    }
  };

  const handleComplete = async (task) => {
    setBusy(task._id);
    try {
      await api.completeTask(task._id);
      setToast({ message: "Task completed!", type: "success" });
      load();
    } catch (err) {
      setToast({
        message: err.response?.data?.error || "Failed",
        type: "error",
      });
    } finally {
      setBusy(null);
    }
  };

  const tabs = [
    { key: "", label: "All", count: stats.total || 0 },
    { key: "Pending", label: "Pending", count: stats.pending || 0 },
    { key: "In Progress", label: "In Progress", count: stats.in_progress || 0 },
    { key: "Completed", label: "Completed", count: stats.completed || 0 },
  ];

  return (
    <Layout>
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-4">
        <div>
          <h1 className="erp-page-title">My Tasks</h1>
          <p className="erp-page-subtitle mb-0">Tasks assigned to you</p>
        </div>
      </div>

      {/* Stats */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3">
          <div className="erp-card erp-stat-card">
            <div>
              <p className="erp-stat-label">Assigned</p>
              <p className="erp-stat-value">{stats.total || 0}</p>
            </div>
            <div className="erp-stat-icon" style={{ background: "#eef2ff", color: "#4f46e5" }}>
              <ClipboardList size={20} />
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
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
        <div className="col-6 col-md-3">
          <div className="erp-card erp-stat-card">
            <div>
              <p className="erp-stat-label">In Progress</p>
              <p className="erp-stat-value">{stats.in_progress || 0}</p>
            </div>
            <div className="erp-stat-icon" style={{ background: "#dbeafe", color: "#1e40af" }}>
              <Loader2 size={20} />
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="erp-card erp-stat-card">
            <div>
              <p className="erp-stat-label">Completed</p>
              <p className="erp-stat-value">{stats.completed || 0}</p>
            </div>
            <div className="erp-stat-icon" style={{ background: "#ecfdf5", color: "#059669" }}>
              <CheckCircle2 size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="erp-card mb-3" style={{ padding: 12 }}>
        <div className="d-flex flex-wrap align-items-center gap-2">
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

          <div className="erp-input-wrapper" style={{ flex: 1, minWidth: 200 }}>
            <Search size={16} className="erp-input-icon" />
            <input
              className="erp-input"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="erp-card text-center py-5" style={{ color: "#6b7280" }}>
          <div className="spinner-border spinner-border-sm me-2" />
          Loading...
        </div>
      ) : items.length === 0 ? (
        <div className="erp-card text-center py-5">
          <ClipboardList size={42} color="#d1d5db" style={{ marginBottom: 12 }} />
          <h5 style={{ fontWeight: 600 }}>No tasks assigned</h5>
          <p style={{ color: "#6b7280", margin: 0 }}>
            Your manager will assign tasks soon
          </p>
        </div>
      ) : (
        <div className="row g-3">
          {items.map((task) => {
            const p = priorityStyle[task.priority] || priorityStyle.NORMAL;
            const s = statusStyle[task.status] || statusStyle.Pending;
            const StatusIcon = s.Icon;

            const dueWarning = task.due_warning;
            const dueColor =
              dueWarning === "overdue" || dueWarning === "urgent"
                ? "#dc2626"
                : dueWarning === "warning"
                ? "#d97706"
                : "#6b7280";

            const dueBg =
              dueWarning === "overdue" || dueWarning === "urgent"
                ? "#fef2f2"
                : dueWarning === "warning"
                ? "#fffbeb"
                : "#f9fafb";

            return (
              <div className="col-12 col-md-6 col-lg-4" key={task._id}>
                <div
                  className="erp-task-card"
                  style={{
                    borderLeftColor:
                      task.priority === "URGENT"
                        ? "#dc2626"
                        : task.priority === "HIGH"
                        ? "#d97706"
                        : "#4f46e5",
                  }}
                >
                  {/* Header */}
                  <div className="d-flex align-items-center gap-2 mb-2 flex-wrap">
                    <span className="erp-task-badge" style={{ background: p.bg, color: p.color }}>
                      <span className="erp-task-dot" style={{ background: p.dot }} />
                      {p.label}
                    </span>
                    <span className="erp-task-badge" style={{ background: s.bg, color: s.color }}>
                      <StatusIcon size={11} />
                      {s.label}
                    </span>
                    {task.due_warning && task.status !== "Completed" && (
                      <span
                        className="erp-task-badge"
                        style={{ background: dueBg, color: dueColor, fontSize: 10.5 }}
                      >
                        {dueWarning === "overdue" && <AlertTriangle size={10} />}
                        {task.due_warning_text}
                      </span>
                    )}
                  </div>

                  <h5 className="erp-task-title">{task.title}</h5>
                  {task.description && <p className="erp-task-desc">{task.description}</p>}

                  <div className="erp-task-meta">
                    <User size={13} />
                    Assigned by <strong style={{ color: "#111827" }}>{task.assigned_by_name}</strong>
                  </div>

                  <div className="erp-task-meta" style={{ color: dueColor }}>
                    <Calendar size={13} />
                    <span>Due: <strong>{formatDateTime(task.due_date)}</strong></span>
                  </div>

                  <div className="erp-task-meta-small">
                    <Clock size={11} />
                    Assigned: {formatDateTime(task.assigned_at)}
                  </div>

                  {/* Manager feedback if changes requested */}
                  {task.status === "Changes Requested" && task.plan_review_comment && (
                    <div
                      style={{
                        marginTop: 10,
                        padding: "8px 12px",
                        background: "#fef2f2",
                        border: "1px solid #fecaca",
                        borderRadius: 8,
                        fontSize: 12,
                        color: "#991b1b",
                      }}
                    >
                      <strong>Manager:</strong> {task.plan_review_comment}
                    </div>
                  )}

                  {/* Actions */}
                  <div
                    style={{
                      display: "flex",
                      gap: 6,
                      marginTop: 12,
                      paddingTop: 12,
                      borderTop: "1px solid var(--border)",
                    }}
                  >
                    {/* Pending → Submit Plan */}
                    {(task.status === "Pending" || task.status === "Changes Requested") && (
                      <button
                        className="erp-task-action-btn"
                        onClick={() => setStartModal(task)}
                        style={{
                          color: "#1e40af",
                          borderColor: "#dbeafe",
                          background: "#eff6ff",
                          flex: 1,
                          justifyContent: "center",
                        }}
                      >
                        <Send size={12} />
                        {task.status === "Changes Requested" ? "Resubmit Plan" : "Start Task"}
                      </button>
                    )}

                    {/* Plan Submitted → Waiting */}
                    {task.status === "Plan Submitted" && (
                      <span
                        className="erp-task-action-btn"
                        style={{
                          color: "#3730a3",
                          borderColor: "#c7d2fe",
                          background: "#e0e7ff",
                          flex: 1,
                          justifyContent: "center",
                          cursor: "default",
                        }}
                      >
                        <Clock size={12} /> Waiting Manager Approval
                      </span>
                    )}

                    {/* Approved → Start Work */}
                    {task.status === "Approved" && (
                      <button
                        className="erp-task-action-btn"
                        onClick={() => handleStartWork(task)}
                        disabled={busy === task._id}
                        style={{
                          color: "#1e40af",
                          borderColor: "#dbeafe",
                          background: "#eff6ff",
                          flex: 1,
                          justifyContent: "center",
                        }}
                      >
                        <Play size={12} />
                        {busy === task._id ? "Starting..." : "Start Work"}
                      </button>
                    )}

                    {/* In Progress → Complete */}
                    {task.status === "In Progress" && (
                      <button
                        className="erp-task-action-btn"
                        onClick={() => handleComplete(task)}
                        disabled={busy === task._id}
                        style={{
                          color: "#059669",
                          borderColor: "#a7f3d0",
                          background: "#ecfdf5",
                          flex: 1,
                          justifyContent: "center",
                        }}
                      >
                        <CheckCircle2 size={12} />
                        {busy === task._id ? "Completing..." : "Mark Complete"}
                      </button>
                    )}

                    {/* View History */}
                    {task.workflow_history?.length > 0 && (
                      <button
                        className="erp-icon-btn"
                        onClick={() => setViewHistory(task)}
                        title="View History"
                        style={{ padding: 6 }}
                      >
                        <Eye size={13} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Start Task Modal */}
      {startModal && (
        <StartTaskModal
          open={true}
          task={startModal}
          onClose={() => setStartModal(null)}
          onSuccess={() => {
            setToast({ message: "Plan submitted!", type: "success" });
            load();
          }}
        />
      )}

      {/* History Modal */}
      {viewHistory && (
        <Modal
          open={true}
          onClose={() => setViewHistory(null)}
          title={`Workflow History — ${viewHistory.title}`}
          footer={
            <button
              className="erp-btn erp-btn-outline"
              onClick={() => setViewHistory(null)}
            >
              Close
            </button>
          }
        >
          <div style={{ maxHeight: 400, overflowY: "auto" }}>
            {viewHistory.workflow_history?.map((h, idx) => (
              <div
                key={idx}
                style={{
                  padding: "10px 12px",
                  borderBottom: "1px solid #f3f4f6",
                  display: "flex",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "#4f46e5",
                    marginTop: 6,
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>
                    {h.action}
                  </div>
                  <div style={{ fontSize: 11.5, color: "#6b7280" }}>
                    By <strong>{h.by_name}</strong> ·{" "}
                    {formatDateTime(h.at)}
                  </div>
                  {h.comment && (
                    <div
                      style={{
                        marginTop: 4,
                        fontSize: 12,
                        color: "#4b5563",
                        fontStyle: "italic",
                        padding: "6px 10px",
                        background: "#f9fafb",
                        borderRadius: 6,
                      }}
                    >
                      "{h.comment}"
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}

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

export default EmployeeTasks;