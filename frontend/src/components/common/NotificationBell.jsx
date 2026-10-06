import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  CheckCheck,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  XCircle,
  Megaphone,
  MessageSquare,
  Clock,
} from "lucide-react";
import * as api from "../../api/notificationApi";
import { useAuth } from "../../hooks/useAuth";
import { timeAgo } from "../../utils/dateUtils";

// ============================================
// Icon mapping by type
// ============================================
const typeConfig = {
  LATE_CHECK_IN: {
    Icon: AlertTriangle,
    color: "#d97706",
    bg: "#fef3c7",
    label: "Late Check-In",
  },
  EARLY_LOGOUT: {
    Icon: Clock,
    color: "#dc2626",
    bg: "#fef2f2",
    label: "Early Logout",
  },
  LEAVE_APPLIED: {
    Icon: Calendar,
    color: "#0891b2",
    bg: "#ecfeff",
    label: "Leave Applied",
  },
  LEAVE_APPROVED: {
    Icon: CheckCircle2,
    color: "#059669",
    bg: "#ecfdf5",
    label: "Leave Approved",
  },
  LEAVE_REJECTED: {
    Icon: XCircle,
    color: "#dc2626",
    bg: "#fef2f2",
    label: "Leave Rejected",
  },
  ANNOUNCEMENT: {
    Icon: Megaphone,
    color: "#4f46e5",
    bg: "#eef2ff",
    label: "Announcement",
  },
  PRIVATE_MSG: {
    Icon: MessageSquare,
    color: "#d97706",
    bg: "#fef3c7",
    label: "Private Message",
  },
  INFO: {
    Icon: Bell,
    color: "#6b7280",
    bg: "#f3f4f6",
    label: "Info",
  },
};

const getConfig = (type) => typeConfig[type] || typeConfig.INFO;

const NotificationBell = () => {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();
  const { role } = useAuth();

  const loadCount = useCallback(async () => {
    try {
      const res = await api.getUnreadCount();
      setCount(res.data.count || 0);
    } catch {}
  }, []);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getMyNotifications();
      setItems(res.data.slice(0, 10));
    } catch {}
    finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCount();
    const t = setInterval(loadCount, 15000);
    return () => clearInterval(t);
  }, [loadCount]);

  useEffect(() => {
    if (open) loadItems();
  }, [open, loadItems]);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await api.markAllRead();
      setCount(0);
      loadItems();
    } catch {}
  };

  const handleClickItem = async (item) => {
    try {
      if (!item.is_read) {
        await api.markNotificationRead(item._id);
        setCount((c) => Math.max(0, c - 1));
        setItems((prev) =>
          prev.map((x) => (x._id === item._id ? { ...x, is_read: true } : x))
        );
      }
    } catch {}

    setOpen(false);

    if (
      item.type === "ANNOUNCEMENT" ||
      item.type === "PRIVATE_MSG" ||
      item.announcement_id
    ) {
      const annId = item.announcement_id
        ? typeof item.announcement_id === "string"
          ? item.announcement_id
          : item.announcement_id.toString()
        : null;

      if (role === "MANAGER") {
        navigate(`/manager/announcements${annId ? `?open=${annId}` : ""}`);
      } else {
        navigate(`/employee/announcements${annId ? `?open=${annId}` : ""}`);
      }
      return;
    }

    if (item.type?.startsWith("LEAVE")) {
      navigate(role === "MANAGER" ? "/manager/leaves" : "/employee/leaves");
      return;
    }

    if (item.type === "LATE_CHECK_IN" || item.type === "EARLY_LOGOUT") {
      navigate(
        role === "MANAGER" ? "/manager/attendance" : "/employee/attendance"
      );
      return;
    }

    navigate(
      role === "MANAGER" ? "/manager/notifications" : "/employee/notifications"
    );
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        className="erp-hamburger"
        onClick={() => setOpen((o) => !o)}
        title="Notifications"
        style={{ position: "relative" }}
      >
        <Bell size={18} />
        {count > 0 && (
          <span
            style={{
              position: "absolute",
              top: 2,
              right: 2,
              background: "#ef4444",
              color: "white",
              fontSize: 9.5,
              fontWeight: 700,
              borderRadius: 10,
              minWidth: 16,
              height: 16,
              padding: "0 4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "2px solid #1e1b4b",
            }}
          >
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: 400,
            maxWidth: "94vw",
            background: "white",
            borderRadius: 14,
            boxShadow: "0 20px 50px -12px rgba(0,0,0,0.25)",
            border: "1px solid var(--border)",
            zIndex: 1000,
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "14px 18px",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "#fafafa",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>
                Notifications
              </span>
              {count > 0 && (
                <span
                  style={{
                    background: "#ef4444",
                    color: "white",
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 10,
                  }}
                >
                  {count} new
                </span>
              )}
            </div>
            {count > 0 && (
              <button
                onClick={handleMarkAllRead}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 12,
                  color: "#4f46e5",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <CheckCheck size={13} /> Mark all
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ maxHeight: 460, overflowY: "auto" }}>
            {loading ? (
              <div
                style={{ padding: 32, textAlign: "center", color: "#6b7280" }}
              >
                <div className="spinner-border spinner-border-sm" />
              </div>
            ) : items.length === 0 ? (
              <div
                style={{
                  padding: 40,
                  textAlign: "center",
                  color: "#6b7280",
                  fontSize: 13,
                }}
              >
                <Bell
                  size={40}
                  style={{
                    display: "block",
                    margin: "0 auto 10px",
                    opacity: 0.25,
                  }}
                />
                <div style={{ fontWeight: 600, marginBottom: 4 }}>
                  No notifications
                </div>
                <div style={{ fontSize: 12, color: "#9ca3af" }}>
                  You're all caught up
                </div>
              </div>
            ) : (
              items.map((item) => {
                const cfg = getConfig(item.type);
                const Icon = cfg.Icon;

                return (
                  <div
                    key={item._id}
                    onClick={() => handleClickItem(item)}
                    style={{
                      padding: "14px 18px",
                      borderBottom: "1px solid #f3f4f6",
                      cursor: "pointer",
                      background: item.is_read ? "white" : "#f9fafe",
                      transition: "background 0.15s",
                      display: "flex",
                      gap: 12,
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "#f3f4f6")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = item.is_read
                        ? "white"
                        : "#f9fafe")
                    }
                  >
                    {/* Icon */}
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 10,
                        background: cfg.bg,
                        color: cfg.color,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        position: "relative",
                      }}
                    >
                      <Icon size={18} />
                      {!item.is_read && (
                        <span
                          style={{
                            position: "absolute",
                            top: -2,
                            right: -2,
                            width: 9,
                            height: 9,
                            borderRadius: "50%",
                            background: "#ef4444",
                            border: "2px solid white",
                          }}
                        />
                      )}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Type label */}
                      <div
                        style={{
                          fontSize: 10.5,
                          fontWeight: 700,
                          color: cfg.color,
                          textTransform: "uppercase",
                          letterSpacing: 0.4,
                          marginBottom: 3,
                        }}
                      >
                        {cfg.label}
                      </div>

                      {/* Message */}
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: item.is_read ? 500 : 600,
                          color: "#111827",
                          lineHeight: 1.4,
                          marginBottom: 4,
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {item.message}
                      </div>

                      {/* Footer */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          fontSize: 11,
                          color: "#9ca3af",
                        }}
                      >
                        <span>
                          {item.from_name && (
                            <>
                              <strong style={{ color: "#6b7280" }}>
                                {item.from_name}
                              </strong>
                              {" · "}
                            </>
                          )}
                          {timeAgo(item.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <div
              onClick={() => {
                setOpen(false);
                if (role === "MANAGER") navigate("/manager/notifications");
                else navigate("/employee/notifications");
              }}
              style={{
                padding: 14,
                textAlign: "center",
                fontSize: 13,
                fontWeight: 600,
                color: "#4f46e5",
                cursor: "pointer",
                borderTop: "1px solid var(--border)",
                background: "#fafafa",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "#f3f4f6")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "#fafafa")
              }
            >
              View All Notifications →
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;