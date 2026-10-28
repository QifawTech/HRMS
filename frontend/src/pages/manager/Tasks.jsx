import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ClipboardList,
  Plus,
  Search,
  Edit2,
  Trash2,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  User,
  Calendar,
  Pause,
  FileText,
  Download,
  Eye,
  Send,
  X as XIcon,
  Check,
  MoreVertical,
  Target,
} from "lucide-react";
import Layout from "../../components/layout/Layout";
import Modal from "../../components/common/Modal";
import Toast from "../../components/common/Toast";
import * as api from "../../api/taskApi";
import * as empApi from "../../api/employeeApi";
import { formatDateTime } from "../../utils/dateUtils";

const FONT = "'Calibri', 'Segoe UI', -apple-system, sans-serif";

// ============================================
// Style configs
// ============================================
const priorityConfig = {
  LOW: { color: "#64748b", bg: "#f1f5f9", label: "Low", dot: "#94a3b8" },
  NORMAL: { color: "#4f46e5", bg: "#eef2ff", label: "Normal", dot: "#6366f1" },
  HIGH: { color: "#d97706", bg: "#fffbeb", label: "High", dot: "#f59e0b" },
  URGENT: { color: "#dc2626", bg: "#fef2f2", label: "Urgent", dot: "#ef4444" },
};

const statusConfig = {
  Pending: { color: "#92400e", bg: "#fffbeb", label: "Pending", Icon: Clock },
  "Plan Submitted": {
    color: "#3730a3",
    bg: "#eef2ff",
    label: "Plan Submitted",
    Icon: Send,
  },
  Approved: {
    color: "#065f46",
    bg: "#ecfdf5",
    label: "Approved",
    Icon: CheckCircle2,
  },
  "Changes Requested": {
    color: "#991b1b",
    bg: "#fef2f2",
    label: "Changes Requested",
    Icon: AlertTriangle,
  },
  "In Progress": {
    color: "#1e40af",
    bg: "#dbeafe",
    label: "In Progress",
    Icon: Loader2,
  },
  Completed: {
    color: "#065f46",
    bg: "#ecfdf5",
    label: "Completed",
    Icon: CheckCircle2,
  },
  Cancelled: {
    color: "#64748b",
    bg: "#f1f5f9",
    label: "Cancelled",
    Icon: Pause,
  },
};

const formatSize = (b) => {
  if (!b) return "";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${Math.round(b / 1024)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
};

// ============================================
// Main component
// ============================================
const emptyForm = {
  title: "",
  description: "",
  priority: "NORMAL",
  assigned_to: "",
  due_date: "",
};

const ManagerTasks = () => {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({});
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("");
  const [search, setSearch] = useState("");
  const [filterEmployee, setFilterEmployee] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [reviewModal, setReviewModal] = useState(null);
  const [reviewComment, setReviewComment] = useState("");
  const [viewHistory, setViewHistory] = useState(null);

  // ?open support
  const [searchParams] = useSearchParams();
  const openId = searchParams.get("open");
  const [highlightId, setHighlightId] = useState(null);

  // ============================================
  // Load tasks
  // ============================================
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tRes, sRes] = await Promise.all([
        api.listTasks(tab, filterEmployee, "", search),
        api.getTaskStats(),
      ]);
      setItems(Array.isArray(tRes.data) ? tRes.data : []);
      setStats(sRes.data || {});
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [tab, filterEmployee, search]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    empApi
      .listEmployees("", "", "ACTIVE")
      .then((res) => setEmployees(Array.isArray(res.data) ? res.data : []))
      .catch(() => {});
  }, []);

  // Handle ?open=<id>
  useEffect(() => {
    if (openId && items.length > 0) {
      setHighlightId(openId);
      setTimeout(() => {
        const el = document.getElementById(`task-${openId}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 200);
      const timer = setTimeout(() => setHighlightId(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [openId, items]);

  // ============================================
  // Handlers
  // ============================================
  const openAdd = () => {
    setEditing(null);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const defaultDate = tomorrow.toISOString().split("T")[0];
    setForm({ ...emptyForm, due_date: `${defaultDate}T18:00` });
    setModalOpen(true);
  };

  const openEdit = (task) => {
    setEditing(task);
    let dueValue = "";
    if (task.due_date) {
      try {
        const d = new Date(task.due_date);
        const offset = d.getTimezoneOffset();
        const local = new Date(d.getTime() - offset * 60 * 1000);
        dueValue = local.toISOString().slice(0, 16);
      } catch {
        dueValue = "";
      }
    }
    setForm({
      title: task.title,
      description: task.description || "",
      priority: task.priority || "NORMAL",
      assigned_to: task.assigned_to,
      due_date: dueValue,
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      setToast({ message: "Title is required", type: "error" });
      return;
    }
    if (!form.assigned_to) {
      setToast({ message: "Select an employee", type: "error" });
      return;
    }
    if (!form.due_date) {
      setToast({ message: "Due date is required", type: "error" });
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await api.updateTask(editing._id, form);
        setToast({ message: "Task updated!", type: "success" });
      } else {
        await api.createTask(form);
        setToast({ message: "Task assigned!", type: "success" });
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

  const openReview = (task, action) => {
    setReviewModal({ task, action });
    setReviewComment("");
  };

  const submitReview = async () => {
    if (!reviewModal) return;

    if (
      reviewModal.action === "Request Changes" &&
      !reviewComment.trim()
    ) {
      setToast({
        message: "Please provide a reason for requesting changes",
        type: "error",
      });
      return;
    }

    try {
      await api.reviewPlan(
        reviewModal.task._id,
        reviewModal.action,
        reviewComment
      );
      setToast({
        message:
          reviewModal.action === "Approve"
            ? "Plan approved!"
            : "Changes requested",
        type: "success",
      });
      setReviewModal(null);
      setReviewComment("");
      load();
    } catch (err) {
      setToast({
        message: err.response?.data?.error || "Failed",
        type: "error",
      });
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await api.deleteTask(confirmDelete._id);
      setToast({ message: "Task deleted", type: "success" });
      setConfirmDelete(null);
      load();
    } catch (err) {
      setToast({ message: "Failed to delete", type: "error" });
    }
  };

  const tabs = [
    { key: "", label: "All", count: stats.total || 0 },
    { key: "Pending", label: "Pending", count: stats.pending || 0 },
    {
      key: "Plan Submitted",
      label: "Needs Review",
      count: stats.plan_submitted || 0,
      highlight: true,
    },
    { key: "In Progress", label: "In Progress", count: stats.in_progress || 0 },
    { key: "Completed", label: "Completed", count: stats.completed || 0 },
  ];

  return (
    <Layout>
      {/* ✅ FIX: Max-width and margin auto ah remove panni, full width ah maathiiruken */}
      <div style={{ fontFamily: FONT, width: "100%", padding: "0 20px" }}>
        {/* ============================================
            Header
            ============================================ */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 24,
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <h1
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: "#0f172a",
                letterSpacing: "-0.5px",
                marginBottom: 4,
              }}
            >
              Tasks
            </h1>
            <p
              style={{
                fontSize: 13.5,
                color: "#64748b",
                margin: 0,
              }}
            >
              Assign tasks · Review plans · Track progress
            </p>
          </div>
          <button
            onClick={openAdd}
            style={{
              background: "linear-gradient(135deg, #6366f1, #4f46e5)",
              color: "white",
              border: "none",
              borderRadius: 10,
              padding: "10px 18px",
              fontSize: 13.5,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontFamily: FONT,
              boxShadow: "0 4px 12px -4px rgba(79,70,229,0.4)",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow =
                "0 6px 16px -4px rgba(79,70,229,0.5)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow =
                "0 4px 12px -4px rgba(79,70,229,0.4)";
            }}
          >
            <Plus size={15} strokeWidth={2.5} /> Assign Task
          </button>
        </div>

        {/* ============================================
            Stats
            ============================================ */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 12,
            marginBottom: 24,
          }}
        >
          <StatTile
            label="Total"
            value={stats.total || 0}
            color="#4f46e5"
            bg="#eef2ff"
            Icon={ClipboardList}
          />
          <StatTile
            label="Needs Review"
            value={stats.plan_submitted || 0}
            color="#4338ca"
            bg="#e0e7ff"
            Icon={Send}
            highlight={stats.plan_submitted > 0}
          />
          <StatTile
            label="In Progress"
            value={stats.in_progress || 0}
            color="#1e40af"
            bg="#dbeafe"
            Icon={Loader2}
          />
          <StatTile
            label="Overdue"
            value={stats.overdue || 0}
            color="#dc2626"
            bg="#fef2f2"
            Icon={AlertTriangle}
            highlight={stats.overdue > 0}
          />
        </div>

        {/* ============================================
            Tabs + Search
            ============================================ */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 16,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 2,
              background: "#f1f5f9",
              padding: 3,
              borderRadius: 10,
              overflowX: "auto",
              maxWidth: "100%",
            }}
          >
            {tabs.map((t) => {
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  style={{
                    padding: "7px 16px",
                    fontSize: 13,
                    fontWeight: 600,
                    border: "none",
                    background: active ? "white" : "transparent",
                    color: active ? "#0f172a" : "#64748b",
                    borderRadius: 8,
                    cursor: "pointer",
                    fontFamily: FONT,
                    boxShadow: active
                      ? "0 1px 3px rgba(0,0,0,0.08)"
                      : "none",
                    transition: "all 0.15s",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    whiteSpace: "nowrap",
                  }}
                >
                  {t.label}
                  {t.count > 0 && (
                    <span
                      style={{
                        background: active
                          ? t.highlight
                            ? "#ef4444"
                            : "#eef2ff"
                          : "transparent",
                        color: active
                          ? t.highlight
                            ? "white"
                            : "#4f46e5"
                          : "#94a3b8",
                        borderRadius: 6,
                        padding: "1px 6px",
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    >
                      {t.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ============================================
            Search + Employee filter
            ============================================ */}
        <div
          style={{
            display: "flex",
            gap: 10,
            marginBottom: 20,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              position: "relative",
              flex: "1 1 260px",
              maxWidth: 340,
            }}
          >
            <Search
              size={15}
              color="#94a3b8"
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                pointerEvents: "none",
              }}
            />
            <input
              type="text"
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                padding: "9px 12px 9px 34px",
                border: "1px solid #e2e8f0",
                borderRadius: 10,
                fontSize: 13,
                fontFamily: FONT,
                background: "white",
                outline: "none",
                color: "#0f172a",
                transition: "all 0.15s",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#6366f1";
                e.currentTarget.style.boxShadow =
                  "0 0 0 3px rgba(99,102,241,0.1)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "#e2e8f0";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
          </div>

          <select
            value={filterEmployee}
            onChange={(e) => setFilterEmployee(e.target.value)}
            style={{
              padding: "9px 12px",
              border: "1px solid #e2e8f0",
              borderRadius: 10,
              fontSize: 13,
              fontFamily: FONT,
              background: "white",
              outline: "none",
              color: "#0f172a",
              cursor: "pointer",
              minWidth: 200,
            }}
          >
            <option value="">All Employees</option>
            {employees.map((emp) => (
              <option key={emp._id} value={emp._id}>
                {emp.first_name} {emp.last_name} ({emp.employee_code})
              </option>
            ))}
          </select>
        </div>

        {/* ============================================
            List
            ============================================ */}
        {loading ? (
          <LoadingCard />
        ) : items.length === 0 ? (
          <EmptyState onAdd={openAdd} />
        ) : (
          <div className="row g-3">
            {items.map((task) => (
              <div
                className="col-12 col-md-6 col-xl-4"
                key={task._id}
                id={`task-${task._id}`}
              >
                <TaskCard
                  task={task}
                  highlighted={highlightId === task._id}
                  onEdit={openEdit}
                  onDelete={setConfirmDelete}
                  onReview={openReview}
                  onViewHistory={setViewHistory}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ============================================
          Create / Edit Modal
          ============================================ */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit Task" : "Assign New Task"}
        footer={
          <>
            <button
              className="erp-btn erp-btn-outline"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </button>
            <button
              className="erp-btn erp-btn-primary"
              onClick={handleSubmit}
              disabled={saving}
            >
              {saving ? "Saving..." : editing ? "Update" : "Assign Task"}
            </button>
          </>
        }
      >
        <div className="mb-3">
          <label className="erp-label">Title *</label>
          <input
            className="erp-input"
            placeholder="e.g., Prepare monthly report"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            autoFocus
          />
        </div>

        <div className="mb-3">
          <label className="erp-label">Description</label>
          <textarea
            className="erp-input"
            rows={3}
            placeholder="Detailed instructions..."
            value={form.description}
            onChange={(e) =>
              setForm({ ...form, description: e.target.value })
            }
            style={{ resize: "vertical" }}
          />
        </div>

        <div className="row g-3 mb-3">
          <div className="col-6">
            <label className="erp-label">Priority</label>
            <select
              className="erp-input"
              value={form.priority}
              onChange={(e) =>
                setForm({ ...form, priority: e.target.value })
              }
            >
              <option value="LOW">🟢 Low</option>
              <option value="NORMAL">🔵 Normal</option>
              <option value="HIGH">🟠 High</option>
              <option value="URGENT">🔴 Urgent</option>
            </select>
          </div>
          <div className="col-6">
            <label className="erp-label">Assign To *</label>
            <select
              className="erp-input"
              value={form.assigned_to}
              onChange={(e) =>
                setForm({ ...form, assigned_to: e.target.value })
              }
            >
              <option value="">Select Employee</option>
              {employees.map((emp) => (
                <option key={emp._id} value={emp._id}>
                  {emp.first_name} {emp.last_name} ({emp.employee_code})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="erp-label">Due Date *</label>
          <input
            type="date"
            className="erp-input"
            value={form.due_date ? form.due_date.split("T")[0] : ""}
            onChange={(e) => {
              const dateVal = e.target.value;
              const timeVal = form.due_date?.split("T")[1] || "18:00";
              setForm({ ...form, due_date: `${dateVal}T${timeVal}` });
            }}
            min={new Date().toISOString().split("T")[0]}
          />
          <small style={{ color: "#9ca3af", fontSize: 11 }}>
            Task due by end of this day (06:00 PM)
          </small>
        </div>
      </Modal>

      {/* Review Modal */}
      <Modal
        open={!!reviewModal}
        onClose={() => setReviewModal(null)}
        title={
          reviewModal?.action === "Approve"
            ? "Approve Plan"
            : "Request Changes"
        }
        footer={
          <>
            <button
              className="erp-btn erp-btn-outline"
              onClick={() => setReviewModal(null)}
            >
              Cancel
            </button>
            <button
              className={`erp-btn ${
                reviewModal?.action === "Approve"
                  ? "erp-btn-primary"
                  : "erp-btn-danger"
              }`}
              onClick={submitReview}
            >
              {reviewModal?.action === "Approve"
                ? "Confirm Approval"
                : "Send Feedback"}
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
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                {reviewModal.task.title}
              </div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>
                From: {reviewModal.task.assigned_to_name}
              </div>
            </div>

            <div className="mb-3">
              <label className="erp-label">
                {reviewModal.action === "Approve"
                  ? "Comment (Optional)"
                  : "Reason for Changes *"}
              </label>
              <textarea
                className="erp-input"
                rows={4}
                placeholder={
                  reviewModal.action === "Approve"
                    ? "Add a message for the employee..."
                    : "Explain what needs to be changed..."
                }
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                style={{ resize: "vertical" }}
                autoFocus
              />
            </div>
          </>
        )}
      </Modal>

      {/* History Modal */}
      {viewHistory && (
        <Modal
          open={true}
          onClose={() => setViewHistory(null)}
          title={`Workflow — ${viewHistory.title}`}
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
                    By <strong>{h.by_name}</strong> · {formatDateTime(h.at)}
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

      {/* Delete Confirmation */}
      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete Task?"
        footer={
          <>
            <button
              className="erp-btn erp-btn-outline"
              onClick={() => setConfirmDelete(null)}
            >
              Cancel
            </button>
            <button className="erp-btn erp-btn-danger" onClick={handleDelete}>
              Yes, Delete
            </button>
          </>
        }
      >
        <p style={{ margin: 0, color: "#6b7280" }}>
          Delete <strong>{confirmDelete?.title}</strong>? This cannot be
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

// ============================================
// Task Card
// ============================================
const TaskCard = ({
  task,
  highlighted,
  onEdit,
  onDelete,
  onReview,
  onViewHistory,
}) => {
  const p = priorityConfig[task.priority] || priorityConfig.NORMAL;
  const s = statusConfig[task.status] || statusConfig.Pending;
  const StatusIcon = s.Icon;

  const dueWarning = task.due_warning;
  const dueColor =
    dueWarning === "overdue" || dueWarning === "urgent"
      ? "#dc2626"
      : dueWarning === "warning"
      ? "#d97706"
      : "#64748b";
  const dueBg =
    dueWarning === "overdue" || dueWarning === "urgent"
      ? "#fef2f2"
      : dueWarning === "warning"
      ? "#fffbeb"
      : "#f1f5f9";

  const plan = task.workflow_plan;
  const hasPlan = plan && (plan.text_plan || plan.file_name);
  const needsReview = task.status === "Plan Submitted";

  return (
    <div
      style={{
        background: "white",
        border: highlighted ? "1.5px solid #6366f1" : "1px solid #e2e8f0",
        borderRadius: 14,
        padding: 18,
        fontFamily: FONT,
        transition: "all 0.25s ease",
        boxShadow: highlighted
          ? "0 0 0 4px rgba(99,102,241,0.1), 0 4px 12px -4px rgba(0,0,0,0.08)"
          : "0 1px 2px rgba(0,0,0,0.02)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        position: "relative",
        overflow: "hidden",
      }}
      onMouseEnter={(e) => {
        if (!highlighted) {
          e.currentTarget.style.borderColor = "#cbd5e1";
          e.currentTarget.style.boxShadow =
            "0 4px 12px -4px rgba(0,0,0,0.06)";
        }
      }}
      onMouseLeave={(e) => {
        if (!highlighted) {
          e.currentTarget.style.borderColor = "#e2e8f0";
          e.currentTarget.style.boxShadow =
            "0 1px 2px rgba(0,0,0,0.02)";
        }
      }}
    >
      {/* Left accent bar */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 3,
          background:
            task.priority === "URGENT"
              ? "#ef4444"
              : task.priority === "HIGH"
              ? "#f59e0b"
              : needsReview
              ? "#6366f1"
              : "#6366f1",
        }}
      />

      {/* Header badges */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 10,
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            background: p.bg,
            color: p.color,
            padding: "3px 9px",
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: p.dot,
            }}
          />
          {p.label}
        </span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            background: s.bg,
            color: s.color,
            padding: "3px 9px",
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          <StatusIcon size={10} strokeWidth={2.5} />
          {s.label}
        </span>
        {needsReview && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              background: "#dc2626",
              color: "white",
              padding: "3px 9px",
              borderRadius: 6,
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: 0.3,
            }}
          >
            ⚡ ACTION REQUIRED
          </span>
        )}
      </div>

      {/* Due warning */}
      {task.due_warning && task.status !== "Completed" && (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            background: dueBg,
            color: dueColor,
            padding: "3px 9px",
            borderRadius: 6,
            fontSize: 10.5,
            fontWeight: 700,
            marginBottom: 10,
            alignSelf: "flex-start",
          }}
        >
          {dueWarning === "overdue" && (
            <AlertTriangle size={10} strokeWidth={2.5} />
          )}
          {task.due_warning_text}
        </div>
      )}

      {/* Title */}
      <h5
        style={{
          fontSize: 14.5,
          fontWeight: 700,
          color: "#0f172a",
          margin: 0,
          marginBottom: 6,
          letterSpacing: "-0.2px",
          lineHeight: 1.4,
          overflow: "hidden",
          textOverflow: "ellipsis",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
        }}
      >
        {task.title}
      </h5>

      {/* Description */}
      {task.description && (
        <p
          style={{
            fontSize: 12.5,
            color: "#64748b",
            margin: 0,
            marginBottom: 12,
            lineHeight: 1.5,
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
          }}
        >
          {task.description}
        </p>
      )}

      {/* Meta rows */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 12,
          color: "#64748b",
          marginBottom: 6,
        }}
      >
        <User size={12} color="#94a3b8" />
        <strong style={{ color: "#334155", fontWeight: 600 }}>
          {task.assigned_to_name}
        </strong>
        <span style={{ color: "#cbd5e1" }}>·</span>
        <span style={{ color: "#94a3b8" }}>{task.assigned_to_code}</span>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 12,
          color: dueColor,
          marginBottom: 6,
          fontWeight: 600,
        }}
      >
        <Calendar size={12} />
        <span>
          Due: <strong>{formatDateTime(task.due_date)}</strong>
        </span>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 11,
          color: "#94a3b8",
          marginBottom: 12,
        }}
      >
        <Clock size={11} />
        Assigned: {formatDateTime(task.assigned_at)}
      </div>

      {/* Plan section */}
      {hasPlan && (
        <div
          style={{
            marginTop: "auto",
            padding: 12,
            background: needsReview ? "#eef2ff" : "#f8fafc",
            border: needsReview
              ? "1px solid #c7d2fe"
              : "1px solid #e2e8f0",
            borderRadius: 10,
            marginBottom: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <div
              style={{
                fontSize: 10.5,
                fontWeight: 800,
                color: needsReview ? "#4338ca" : "#64748b",
                textTransform: "uppercase",
                letterSpacing: 0.5,
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <FileText size={11} strokeWidth={2.5} />
              Submitted Plan
            </div>
            {plan.uploaded_at && (
              <div style={{ fontSize: 10, color: "#94a3b8" }}>
                {formatDateTime(plan.uploaded_at)}
              </div>
            )}
          </div>

          {plan.file_name && plan.file_id && (
            <a
              href={api.taskFileUrl(plan.file_id)}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 10px",
                background: "white",
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                fontSize: 12,
                color: "#0f172a",
                cursor: "pointer",
                textDecoration: "none",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#6366f1";
                e.currentTarget.style.background = "#fafbff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#e2e8f0";
                e.currentTarget.style.background = "white";
              }}
            >
              <FileText size={14} color="#4f46e5" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: 600,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {plan.file_name}
                </div>
                {plan.file_size && (
                  <div style={{ fontSize: 10, color: "#94a3b8" }}>
                    {formatSize(plan.file_size)}
                  </div>
                )}
              </div>
              <Download size={13} color="#4f46e5" />
            </a>
          )}
        </div>
      )}

      {/* Changes requested feedback */}
      {task.status === "Changes Requested" && task.plan_review_comment && (
        <div
          style={{
            padding: "8px 12px",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: 8,
            fontSize: 11.5,
            color: "#991b1b",
            marginBottom: 12,
          }}
        >
          <strong>Your feedback:</strong> {task.plan_review_comment}
        </div>
      )}

      {/* Actions */}
      <div
        style={{
          display: "flex",
          gap: 6,
          paddingTop: 12,
          borderTop: "1px solid #f1f5f9",
          marginTop: "auto",
          flexWrap: "wrap",
        }}
      >
        {needsReview && (
          <>
            <button
              onClick={() => onReview(task, "Approve")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "7px 12px",
                borderRadius: 8,
                border: "1px solid #a7f3d0",
                background: "#ecfdf5",
                color: "#059669",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: FONT,
                transition: "all 0.15s",
                flex: 1,
                justifyContent: "center",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#d1fae5";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#ecfdf5";
              }}
            >
              <Check size={13} strokeWidth={2.5} /> Approve
            </button>
            <button
              onClick={() => onReview(task, "Request Changes")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "7px 12px",
                borderRadius: 8,
                border: "1px solid #fecaca",
                background: "#fef2f2",
                color: "#dc2626",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: FONT,
                transition: "all 0.15s",
                flex: 1,
                justifyContent: "center",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#fee2e2";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#fef2f2";
              }}
            >
              <XIcon size={13} strokeWidth={2.5} /> Changes
            </button>
          </>
        )}

        <div
          style={{
            marginLeft: needsReview ? 0 : "auto",
            display: "flex",
            gap: 4,
            width: needsReview ? "100%" : "auto",
            justifyContent: needsReview ? "flex-end" : "flex-end",
          }}
        >
          {task.workflow_history?.length > 0 && (
            <CardIconButton
              onClick={() => onViewHistory(task)}
              title="View history"
              Icon={Eye}
            />
          )}
          <CardIconButton
            onClick={() => onEdit(task)}
            title="Edit"
            Icon={Edit2}
          />
          <CardIconButton
            onClick={() => onDelete(task)}
            title="Delete"
            Icon={Trash2}
            danger
          />
        </div>
      </div>
    </div>
  );
};

// ============================================
// Card Icon Button
// ============================================
const CardIconButton = ({ onClick, title, Icon, danger }) => (
  <button
    onClick={onClick}
    title={title}
    style={{
      width: 32,
      height: 32,
      borderRadius: 8,
      background: "transparent",
      border: "1px solid transparent",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: danger ? "#94a3b8" : "#64748b",
      transition: "all 0.15s",
    }}
    onMouseEnter={(e) => {
      if (danger) {
        e.currentTarget.style.background = "#fef2f2";
        e.currentTarget.style.color = "#dc2626";
        e.currentTarget.style.borderColor = "#fecaca";
      } else {
        e.currentTarget.style.background = "#f1f5f9";
        e.currentTarget.style.color = "#0f172a";
        e.currentTarget.style.borderColor = "#e2e8f0";
      }
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = "transparent";
      e.currentTarget.style.color = danger ? "#94a3b8" : "#64748b";
      e.currentTarget.style.borderColor = "transparent";
    }}
  >
    <Icon size={14} strokeWidth={2.2} />
  </button>
);

// ============================================
// Stat Tile
// ============================================
const StatTile = ({ label, value, color, bg, Icon, highlight }) => (
  <div
    style={{
      background: "white",
      border: highlight ? `1px solid ${color}40` : "1px solid #e2e8f0",
      borderRadius: 12,
      padding: "14px 16px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      fontFamily: FONT,
      transition: "all 0.15s",
      boxShadow: highlight
        ? `0 0 0 3px ${color}15, 0 1px 2px rgba(0,0,0,0.02)`
        : "0 1px 2px rgba(0,0,0,0.02)",
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.borderColor = highlight ? color : "#cbd5e1";
      e.currentTarget.style.boxShadow = highlight
        ? `0 0 0 3px ${color}20, 0 4px 8px -2px rgba(0,0,0,0.05)`
        : "0 2px 8px -2px rgba(0,0,0,0.05)";
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.borderColor = highlight
        ? `${color}40`
        : "#e2e8f0";
      e.currentTarget.style.boxShadow = highlight
        ? `0 0 0 3px ${color}15, 0 1px 2px rgba(0,0,0,0.02)`
        : "0 1px 2px rgba(0,0,0,0.02)";
    }}
  >
    <div>
      <div
        style={{
          fontSize: 10.5,
          fontWeight: 700,
          color: "#94a3b8",
          textTransform: "uppercase",
          letterSpacing: 0.6,
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 800,
          color: "#0f172a",
          lineHeight: 1,
          letterSpacing: "-0.5px",
        }}
      >
        {value}
      </div>
    </div>
    <div
      style={{
        width: 38,
        height: 38,
        borderRadius: 10,
        background: bg,
        color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <Icon size={17} strokeWidth={2.4} />
    </div>
  </div>
);

// ============================================
// Loading / Empty
// ============================================
const LoadingCard = () => (
  <div
    style={{
      background: "white",
      borderRadius: 14,
      border: "1px solid #e2e8f0",
      padding: 60,
      textAlign: "center",
      color: "#94a3b8",
      fontSize: 13,
      fontFamily: FONT,
    }}
  >
    <div className="spinner-border spinner-border-sm me-2" />
    Loading tasks...
  </div>
);

const EmptyState = ({ onAdd }) => (
  <div
    style={{
      background: "white",
      borderRadius: 14,
      border: "1px solid #e2e8f0",
      padding: "60px 20px",
      textAlign: "center",
      fontFamily: FONT,
    }}
  >
    <div
      style={{
        width: 64,
        height: 64,
        borderRadius: "50%",
        background: "linear-gradient(135deg, #eef2ff, #f1f5f9)",
        color: "#6366f1",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 16,
      }}
    >
      <ClipboardList size={28} strokeWidth={2} />
    </div>
    <h3
      style={{
        fontSize: 16,
        fontWeight: 700,
        color: "#0f172a",
        margin: 0,
        marginBottom: 6,
      }}
    >
      No tasks yet
    </h3>
    <p
      style={{
        fontSize: 13,
        color: "#64748b",
        margin: 0,
        marginBottom: 20,
      }}
    >
      Assign your first task to an employee
    </p>
    <button
      onClick={onAdd}
      style={{
        background: "linear-gradient(135deg, #6366f1, #4f46e5)",
        color: "white",
        border: "none",
        borderRadius: 10,
        padding: "10px 20px",
        fontSize: 13.5,
        fontWeight: 600,
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontFamily: FONT,
        boxShadow: "0 4px 12px -4px rgba(79,70,229,0.4)",
      }}
    >
      <Plus size={15} strokeWidth={2.5} /> Assign Task
    </button>
  </div>
);

export default ManagerTasks;