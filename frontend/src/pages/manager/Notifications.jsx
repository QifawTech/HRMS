import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  CheckCheck,
  Trash2,
  Info,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Megaphone,
  ChevronRight,
} from "lucide-react";
import Layout from "../../components/layout/Layout";
import Toast from "../../components/common/Toast";
import * as api from "../../api/notificationApi";
import { timeAgo } from "../../utils/dateUtils";

const FONT = "'Calibri', 'Segoe UI', -apple-system, sans-serif";

// ============================================
// Icon + color per notification type
// ============================================
const typeConfig = {
  ANNOUNCEMENT: { Icon: Megaphone, color: "#4f46e5", bg: "#eef2ff" },
  PRIVATE_MSG: { Icon: Info, color: "#d97706", bg: "#fffbeb" },
  LEAVE_APPLIED: { Icon: Clock, color: "#0891b2", bg: "#ecfeff" },
  LEAVE_APPROVED: { Icon: CheckCircle2, color: "#059669", bg: "#ecfdf5" },
  LEAVE_REJECTED: { Icon: XCircle, color: "#dc2626", bg: "#fef2f2" },
  LATE_CHECK_IN: { Icon: AlertTriangle, color: "#d97706", bg: "#fffbeb" },
  EARLY_LOGOUT: { Icon: AlertTriangle, color: "#dc2626", bg: "#fef2f2" },
  TASK_ASSIGNED: { Icon: Clock, color: "#4f46e5", bg: "#eef2ff" },
  TASK_PLAN_SUBMITTED: { Icon: Info, color: "#4338ca", bg: "#eef2ff" },
  TASK_PLAN_APPROVED: { Icon: CheckCircle2, color: "#059669", bg: "#ecfdf5" },
  TASK_PLAN_CHANGES: { Icon: AlertTriangle, color: "#d97706", bg: "#fffbeb" },
  TASK_STARTED: { Icon: Clock, color: "#0891b2", bg: "#ecfeff" },
  TASK_COMPLETED: { Icon: CheckCircle2, color: "#059669", bg: "#ecfdf5" },
  RESIGNATION_APPLIED: { Icon: Info, color: "#d97706", bg: "#fffbeb" },
  RESIGNATION_ACCEPTED: { Icon: CheckCircle2, color: "#059669", bg: "#ecfdf5" },
  RESIGNATION_REJECTED: { Icon: XCircle, color: "#dc2626", bg: "#fef2f2" },
  RESIGNATION_COMPLETED: { Icon: CheckCircle2, color: "#64748b", bg: "#f1f5f9" },
  INFO: { Icon: Bell, color: "#64748b", bg: "#f1f5f9" },
};

const getTypeConfig = (type) => typeConfig[type] || typeConfig.INFO;

// ============================================
// Main Component
// ============================================
const ManagerNotifications = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [toast, setToast] = useState(null);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getMyNotifications(tab === "unread");
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setToast({ message: "Failed to load", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    load();
  }, [load]);

  const handleMarkRead = async (n) => {
    if (n.is_read) return;
    try {
      await api.markNotificationRead(n._id);
      setItems((prev) =>
        prev.map((x) => (x._id === n._id ? { ...x, is_read: true } : x))
      );
    } catch {}
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllRead();
      setItems((prev) => prev.map((x) => ({ ...x, is_read: true })));
      setToast({ message: "All marked as read", type: "success" });
    } catch {}
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    try {
      await api.deleteNotification(id);
      setItems((prev) => prev.filter((x) => x._id !== id));
    } catch {}
  };

  const handleNotificationClick = async (n) => {
    await handleMarkRead(n);

    const relatedId = n.related_id
      ? typeof n.related_id === "string"
        ? n.related_id
        : n.related_id.toString()
      : null;

    // Announcement / Private
    if (
      n.type === "ANNOUNCEMENT" ||
      n.type === "PRIVATE_MSG" ||
      n.announcement_id
    ) {
      const annId = n.announcement_id
        ? typeof n.announcement_id === "string"
          ? n.announcement_id
          : n.announcement_id.toString()
        : null;
      navigate(`/manager/announcements${annId ? `?open=${annId}` : ""}`);
      return;
    }

    // Leave
    if (n.type === "LEAVE_APPLIED") {
      navigate(`/manager/leaves${relatedId ? `?open=${relatedId}` : ""}`);
      return;
    }
    if (n.type === "LEAVE_APPROVED" || n.type === "LEAVE_REJECTED") {
      navigate("/manager/leaves");
      return;
    }

    // Attendance
    if (n.type === "LATE_CHECK_IN" || n.type === "EARLY_LOGOUT") {
      const dateParam = n.date ? `?date=${n.date}` : "";
      navigate(`/manager/attendance${dateParam}`);
      return;
    }

    // Tasks
    if (
      n.type === "TASK_ASSIGNED" ||
      n.type === "TASK_PLAN_SUBMITTED" ||
      n.type === "TASK_PLAN_APPROVED" ||
      n.type === "TASK_PLAN_CHANGES" ||
      n.type === "TASK_STARTED" ||
      n.type === "TASK_COMPLETED"
    ) {
      navigate(`/manager/tasks${relatedId ? `?open=${relatedId}` : ""}`);
      return;
    }

    // Resignation
    if (
      n.type === "RESIGNATION_APPLIED" ||
      n.type === "RESIGNATION_ACCEPTED" ||
      n.type === "RESIGNATION_REJECTED" ||
      n.type === "RESIGNATION_COMPLETED"
    ) {
      navigate("/manager/resignations");
      return;
    }

    // Fallback
    navigate("/manager/notifications");
  };

  const unreadCount = items.filter((x) => !x.is_read).length;

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
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              Notifications
              {unreadCount > 0 && (
                <span
                  style={{
                    background: "#ef4444",
                    color: "white",
                    fontSize: 12,
                    fontWeight: 700,
                    padding: "3px 10px",
                    borderRadius: 20,
                    letterSpacing: 0,
                  }}
                >
                  {unreadCount} new
                </span>
              )}
            </h1>
            <p
              style={{
                fontSize: 13.5,
                color: "#64748b",
                margin: 0,
              }}
            >
              Alerts and updates across your organization
            </p>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              style={{
                background: "white",
                color: "#4f46e5",
                border: "1px solid #c7d2fe",
                borderRadius: 10,
                padding: "9px 16px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontFamily: FONT,
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#eef2ff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "white";
              }}
            >
              <CheckCheck size={14} strokeWidth={2.5} /> Mark all as read
            </button>
          )}
        </div>

        {/* ============================================
            Tabs — segmented control
            ============================================ */}
        <div
          style={{
            display: "inline-flex",
            gap: 2,
            background: "#f1f5f9",
            padding: 3,
            borderRadius: 10,
            marginBottom: 20,
          }}
        >
          <TabButton
            active={tab === "all"}
            onClick={() => setTab("all")}
            label="All"
            count={items.length}
          />
          <TabButton
            active={tab === "unread"}
            onClick={() => setTab("unread")}
            label="Unread"
            count={unreadCount}
            highlight
          />
        </div>

        {/* ============================================
            List
            ============================================ */}
        {loading ? (
          <LoadingCard />
        ) : items.length === 0 ? (
          <EmptyState tab={tab} />
        ) : (
          <div
            style={{
              background: "white",
              border: "1px solid #e2e8f0",
              borderRadius: 14,
              overflow: "hidden",
            }}
          >
            {items.map((n, idx) => (
              <NotificationRow
                key={n._id}
                notif={n}
                isLast={idx === items.length - 1}
                onClick={() => handleNotificationClick(n)}
                onDelete={(e) => handleDelete(e, n._id)}
              />
            ))}
          </div>
        )}
      </div>

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
// Tab Button
// ============================================
const TabButton = ({ active, onClick, label, count, highlight }) => (
  <button
    onClick={onClick}
    style={{
      padding: "7px 18px",
      fontSize: 13,
      fontWeight: 600,
      border: "none",
      background: active ? "white" : "transparent",
      color: active ? "#0f172a" : "#64748b",
      borderRadius: 8,
      cursor: "pointer",
      fontFamily: FONT,
      boxShadow: active ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
      transition: "all 0.15s",
      display: "flex",
      alignItems: "center",
      gap: 6,
    }}
  >
    {label}
    {count > 0 && (
      <span
        style={{
          background: active
            ? highlight
              ? "#ef4444"
              : "#eef2ff"
            : "transparent",
          color: active
            ? highlight
              ? "white"
              : "#4f46e5"
            : "#94a3b8",
          borderRadius: 6,
          padding: "1px 7px",
          fontSize: 11,
          fontWeight: 700,
        }}
      >
        {count}
      </span>
    )}
  </button>
);

// ============================================
// Notification Row
// ============================================
const NotificationRow = ({ notif, isLast, onClick, onDelete }) => {
  const cfg = getTypeConfig(notif.type);
  const Icon = cfg.Icon;
  const unread = !notif.is_read;

  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 14,
        padding: "16px 20px",
        borderBottom: isLast ? "none" : "1px solid #f1f5f9",
        cursor: "pointer",
        background: unread ? "#fafbff" : "white",
        transition: "all 0.15s",
        position: "relative",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "#f8fafc";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = unread ? "#fafbff" : "white";
      }}
    >
      {/* Unread indicator (left edge) */}
      {unread && (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: "50%",
            transform: "translateY(-50%)",
            width: 3,
            height: 32,
            background: "#4f46e5",
            borderRadius: "0 3px 3px 0",
          }}
        />
      )}

      {/* Icon */}
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 12,
          background: cfg.bg,
          color: cfg.color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          position: "relative",
        }}
      >
        <Icon size={19} strokeWidth={2.3} />
        {unread && (
          <span
            style={{
              position: "absolute",
              top: -2,
              right: -2,
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "#ef4444",
              border: "2px solid white",
            }}
          />
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 4,
          }}
        >
          <span
            style={{
              fontSize: 14,
              fontWeight: unread ? 700 : 500,
              color: "#0f172a",
              letterSpacing: "-0.1px",
            }}
          >
            {notif.title}
          </span>
        </div>

        <div
          style={{
            fontSize: 13,
            color: "#475569",
            lineHeight: 1.5,
            marginBottom: 6,
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
          }}
        >
          {notif.message}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 11.5,
            color: "#94a3b8",
          }}
        >
          {notif.from_name && (
            <>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <span
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    background:
                      "linear-gradient(135deg, #6366f1, #8b5cf6)",
                    color: "white",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 8.5,
                    fontWeight: 800,
                    letterSpacing: "-0.2px",
                  }}
                >
                  {notif.from_name.charAt(0)}
                </span>
                <strong
                  style={{ color: "#64748b", fontWeight: 600 }}
                >
                  {notif.from_name}
                </strong>
              </span>
              <span style={{ color: "#cbd5e1" }}>·</span>
            </>
          )}
          <span>{timeAgo(notif.created_at)}</span>
        </div>
      </div>

      {/* Actions (right side) */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          alignSelf: "center",
          flexShrink: 0,
        }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(e);
          }}
          title="Delete"
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
            color: "#94a3b8",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#fef2f2";
            e.currentTarget.style.color = "#dc2626";
            e.currentTarget.style.borderColor = "#fecaca";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "#94a3b8";
            e.currentTarget.style.borderColor = "transparent";
          }}
        >
          <Trash2 size={14} strokeWidth={2.2} />
        </button>
        <ChevronRight size={16} color="#cbd5e1" />
      </div>
    </div>
  );
};

// ============================================
// Loading Card
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
    Loading notifications...
  </div>
);

// ============================================
// Empty State
// ============================================
const EmptyState = ({ tab }) => (
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
      <Bell size={28} strokeWidth={2} />
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
      {tab === "unread"
        ? "You're all caught up!"
        : "No notifications yet"}
    </h3>
    <p
      style={{
        fontSize: 13,
        color: "#64748b",
        margin: 0,
      }}
    >
      {tab === "unread"
        ? "You have no unread notifications"
        : "Updates and alerts will appear here"}
    </p>
  </div>
);

export default ManagerNotifications;