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
} from "lucide-react";
import Layout from "../../components/layout/Layout";
import Toast from "../../components/common/Toast";
import * as api from "../../api/notificationApi";
import { timeAgo } from "../../utils/dateUtils";

const iconForType = (type) => {
  switch (type) {
    case "ANNOUNCEMENT":
      return { Icon: Megaphone, color: "#4f46e5", bg: "#eef2ff" };
    case "PRIVATE_MSG":
      return { Icon: Info, color: "#d97706", bg: "#fef3c7" };
    case "LEAVE_APPLIED":
      return { Icon: Clock, color: "#d97706", bg: "#fef3c7" };
    case "LEAVE_APPROVED":
      return { Icon: CheckCircle2, color: "#059669", bg: "#ecfdf5" };
    case "LEAVE_REJECTED":
      return { Icon: XCircle, color: "#dc2626", bg: "#fef2f2" };
    case "LATE_CHECK_IN":
    case "EARLY_LOGOUT":
      return { Icon: AlertTriangle, color: "#dc2626", bg: "#fef2f2" };
    default:
      return { Icon: Bell, color: "#6b7280", bg: "#f3f4f6" };
  }
};

const EmployeeNotifications = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [toast, setToast] = useState(null);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getMyNotifications(tab === "unread");
      setItems(res.data);
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

  const handleDelete = async (id) => {
    try {
      await api.deleteNotification(id);
      setItems((prev) => prev.filter((x) => x._id !== id));
    } catch {}
  };

  const handleNotificationClick = async (n) => {
    await handleMarkRead(n);

    // Announcement ? open in announcements page
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
      navigate(`/employee/announcements${annId ? `?open=${annId}` : ""}`);
      return;
    }

    // Leave ? leave page
    if (n.type?.startsWith("LEAVE")) {
      navigate("/employee/leaves");
      return;
    }

    // Attendance ? attendance page
    if (n.type === "LATE_CHECK_IN" || n.type === "EARLY_LOGOUT") {
      navigate("/employee/attendance");
      return;
    }
  };

  const unreadCount = items.filter((x) => !x.is_read).length;

  return (
    <Layout>
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
        <div>
          <h1 className="erp-page-title">Notifications</h1>
          <p className="erp-page-subtitle mb-0">Your alerts and updates</p>
        </div>
        {unreadCount > 0 && (
          <button className="erp-btn erp-btn-outline" onClick={handleMarkAllRead}>
            <CheckCheck size={14} /> Mark all read
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="erp-card mb-3" style={{ padding: 6 }}>
        <div className="d-flex gap-1">
          <button
            onClick={() => setTab("all")}
            className="erp-btn"
            style={{
              background: tab === "all" ? "var(--primary)" : "transparent",
              color: tab === "all" ? "white" : "var(--text-primary)",
              padding: "6px 14px",
              fontSize: 12.5,
              border: "none",
            }}
          >
            All
          </button>
          <button
            onClick={() => setTab("unread")}
            className="erp-btn"
            style={{
              background: tab === "unread" ? "var(--primary)" : "transparent",
              color: tab === "unread" ? "white" : "var(--text-primary)",
              padding: "6px 14px",
              fontSize: 12.5,
              border: "none",
            }}
          >
            Unread
            {unreadCount > 0 && (
              <span
                style={{
                  marginLeft: 6,
                  background:
                    tab === "unread" ? "rgba(255,255,255,0.25)" : "#ef4444",
                  color: "white",
                  borderRadius: 10,
                  padding: "1px 7px",
                  fontSize: 10.5,
                  fontWeight: 700,
                }}
              >
                {unreadCount}
              </span>
            )}
          </button>
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
          <Bell size={42} color="#d1d5db" style={{ marginBottom: 12 }} />
          <h5 style={{ fontWeight: 600 }}>
            {tab === "unread"
              ? "No unread notifications"
              : "No notifications yet"}
          </h5>
          <p style={{ color: "#6b7280", margin: 0 }}>
            {tab === "unread"
              ? "You're all caught up!"
              : "You'll see updates here"}
          </p>
        </div>
      ) : (
        <div className="erp-card" style={{ padding: 0, overflow: "hidden" }}>
          {items.map((n) => {
            const { Icon, color, bg } = iconForType(n.type);
            return (
              <div
                key={n._id}
                onClick={() => handleNotificationClick(n)}
                style={{
                  display: "flex",
                  gap: 12,
                  padding: "14px 16px",
                  borderBottom: "1px solid var(--border)",
                  cursor: "pointer",
                  background: n.is_read ? "white" : "#f9fafe",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#f3f4f6")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = n.is_read
                    ? "white"
                    : "#f9fafe")
                }
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: bg,
                    color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon size={18} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      marginBottom: 2,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13.5,
                        fontWeight: n.is_read ? 500 : 700,
                      }}
                    >
                      {n.title}
                    </span>
                    {!n.is_read && (
                      <span
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: "50%",
                          background: "#ef4444",
                        }}
                      />
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 12.5,
                      color: "#6b7280",
                      marginBottom: 4,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                    }}
                  >
                    {n.message}
                  </div>
                  <div style={{ fontSize: 11, color: "#9ca3af" }}>
                    {n.from_name && `By ${n.from_name} · `}
                    {timeAgo(n.created_at)}
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(n._id);
                  }}
                  className="erp-icon-btn erp-icon-btn-danger"
                  style={{ padding: 4, alignSelf: "flex-start" }}
                  title="Delete"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })}
        </div>
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

export default EmployeeNotifications;