import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Megaphone,
  Lock,
  Users,
  Search,
  Download,
  Eye,
  FileText,
  CheckCircle2,
} from "lucide-react";
import Layout from "../../components/layout/Layout";
import Toast from "../../components/common/Toast";
import * as api from "../../api/announcementApi";
import { formatSentTime } from "../../utils/dateUtils";

const priorityStyle = {
  LOW: { bg: "#f3f4f6", color: "#4b5563", label: "Low" },
  NORMAL: { bg: "#eef2ff", color: "#4338ca", label: "Normal" },
  HIGH: { bg: "#fef3c7", color: "#92400e", label: "High" },
  URGENT: { bg: "#fee2e2", color: "#991b1b", label: "Urgent" },
};

const formatSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

const EmployeeAnnouncements = () => {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({ total: 0, unread: 0 });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState(null);
  const [highlightId, setHighlightId] = useState(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const openId = searchParams.get("open");
  const itemRefs = useRef({});
  const initialLoadDone = useRef(false);

  // Simple, direct load function
  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [aRes, sRes] = await Promise.all([
        api.getMyAnnouncements(tab, search),
        api.getMyAnnouncementStats(),
      ]);
      setItems(Array.isArray(aRes.data) ? aRes.data : []);
      setStats(sRes.data || { total: 0, unread: 0 });
    } catch (e) {
      console.error("Load error:", e);
      // Only show toast on initial load, not on tab switch
      if (!silent) {
        setToast({ message: "Failed to load announcements", type: "error" });
      }
    } finally {
      setLoading(false);
    }
  }, [tab, search]);

  // Initial load
  useEffect(() => {
    if (!initialLoadDone.current) {
      initialLoadDone.current = true;
      load(false);
    }
  }, [load]);

  // Tab/search change ? reload silently
  useEffect(() => {
    if (initialLoadDone.current) {
      load(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, search]);

  // Handle ?open=<id> — scroll + auto-mark seen
  useEffect(() => {
    if (!openId || loading || items.length === 0) return;

    const el = itemRefs.current[openId];
    if (el) {
      setTimeout(() => {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
      setHighlightId(openId);

      const item = items.find((x) => x._id === openId);
      if (item && !item.is_seen_by_me) {
        api
          .markAsSeen(openId)
          .then(() => {
            setItems((prev) =>
              prev.map((it) =>
                it._id === openId ? { ...it, is_seen_by_me: true } : it
              )
            );
            setStats((s) => ({ ...s, unread: Math.max(0, s.unread - 1) }));
          })
          .catch(() => {});
      }

      const timer = setTimeout(() => {
        setHighlightId(null);
        const newParams = new URLSearchParams(searchParams);
        newParams.delete("open");
        setSearchParams(newParams, { replace: true });
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [openId, loading, items, searchParams, setSearchParams]);

  const handleMarkSeen = async (ann) => {
    if (ann.is_seen_by_me) return;
    try {
      await api.markAsSeen(ann._id);
      setItems((prev) =>
        prev.map((it) =>
          it._id === ann._id ? { ...it, is_seen_by_me: true } : it
        )
      );
      setStats((s) => ({ ...s, unread: Math.max(0, s.unread - 1) }));
      setToast({ message: "Marked as read", type: "success" });
    } catch (err) {
      setToast({ message: "Failed to mark as read", type: "error" });
    }
  };

  const tabs = [
    { key: "", label: "All" },
    { key: "ALL", label: "Common" },
    { key: "SPECIFIC", label: "Private" },
  ];

  return (
    <Layout>
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
        <div>
          <h1 className="erp-page-title">Announcements</h1>
          <p className="erp-page-subtitle mb-0">
            Messages and updates from management
          </p>
        </div>
        {stats.unread > 0 && (
          <span
            className="erp-badge"
            style={{
              background: "#fee2e2",
              color: "#991b1b",
              fontSize: 13,
              padding: "6px 12px",
            }}
          >
            {stats.unread} unread
          </span>
        )}
      </div>

      {/* Tabs + Search */}
      <div className="erp-card mb-3" style={{ padding: 10 }}>
        <div className="d-flex flex-wrap align-items-center gap-2">
          <div className="d-flex gap-1">
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
      {loading && items.length === 0 ? (
        <div className="erp-card text-center py-5" style={{ color: "#6b7280" }}>
          <div className="spinner-border spinner-border-sm me-2" />
          Loading...
        </div>
      ) : items.length === 0 ? (
        <div className="erp-card text-center py-5">
          <Megaphone size={42} color="#d1d5db" style={{ marginBottom: 12 }} />
          <h5 style={{ fontWeight: 600 }}>
            {tab === "SPECIFIC"
              ? "No private messages"
              : tab === "ALL"
              ? "No common announcements"
              : "No announcements yet"}
          </h5>
          <p style={{ color: "#6b7280", margin: 0 }}>
            {tab ? "Nothing in this category" : "You're all caught up"}
          </p>
        </div>
      ) : (
        <div className="d-flex flex-column gap-3">
          {items.map((a) => {
            const isPrivate = a.target_type === "SPECIFIC";
            const isNew = !a.is_seen_by_me;
            const p = priorityStyle[a.priority] || priorityStyle.NORMAL;
            const isHighlighted = highlightId === a._id;

            return (
              <div
                key={a._id}
                ref={(el) => (itemRefs.current[a._id] = el)}
                className="erp-card"
                style={{
                  borderLeft: `4px solid ${
                    a.priority === "URGENT"
                      ? "#dc2626"
                      : a.priority === "HIGH"
                      ? "#d97706"
                      : isPrivate
                      ? "#d97706"
                      : "#4f46e5"
                  }`,
                  background: isHighlighted
                    ? "#fffbeb"
                    : isNew
                    ? "#fefefe"
                    : "white",
                  boxShadow: isHighlighted
                    ? "0 0 0 3px rgba(79,70,229,0.2), 0 4px 6px -1px rgba(0,0,0,0.1)"
                    : undefined,
                  transition: "all 0.4s ease",
                }}
              >
                {/* Header badges */}
                <div className="d-flex align-items-center gap-2 mb-2 flex-wrap">
                  <span
                    className="erp-badge"
                    style={{
                      background: p.bg,
                      color: p.color,
                      fontWeight: 700,
                    }}
                  >
                    {a.priority === "URGENT" && "?? "}
                    {p.label}
                  </span>
                  <span
                    className="erp-badge"
                    style={{
                      background: isPrivate ? "#fef3c7" : "#eef2ff",
                      color: isPrivate ? "#92400e" : "#4338ca",
                    }}
                  >
                    {isPrivate ? (
                      <>
                        <Lock size={10} /> Private
                      </>
                    ) : (
                      <>
                        <Users size={10} /> Common
                      </>
                    )}
                  </span>
                  {isNew && (
                    <span
                      className="erp-badge"
                      style={{
                        background: "#dc2626",
                        color: "white",
                        fontSize: 10,
                      }}
                    >
                      NEW
                    </span>
                  )}
                  {!isNew && (
                    <span
                      className="erp-badge"
                      style={{
                        background: "#ecfdf5",
                        color: "#065f46",
                        fontSize: 10,
                      }}
                    >
                      <CheckCircle2 size={10} /> Read
                    </span>
                  )}
                </div>

                {/* Title */}
                <h4
                  style={{
                    fontWeight: 700,
                    fontSize: 16,
                    marginBottom: 8,
                    color: "#111827",
                  }}
                >
                  {a.title}
                </h4>

                {/* Content */}
                <p
                  style={{
                    fontSize: 13.5,
                    color: "#4b5563",
                    lineHeight: 1.6,
                    marginBottom: 12,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {a.content}
                </p>

                {/* Attachments */}
                {a.attachments?.length > 0 && (
                  <div
                    style={{
                      background: "#f9fafb",
                      borderRadius: 8,
                      padding: 10,
                      marginBottom: 12,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#6b7280",
                        textTransform: "uppercase",
                        marginBottom: 8,
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <FileText size={12} /> Attachments (
                      {a.attachments.length})
                    </div>
                    <div className="d-flex flex-column gap-1">
                      {a.attachments.map((att) => (
                        <div
                          key={att.file_id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "6px 8px",
                            background: "white",
                            borderRadius: 6,
                            fontSize: 12.5,
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
                              {att.file_name}
                            </div>
                            <div
                              style={{ fontSize: 10.5, color: "#9ca3af" }}
                            >
                              {formatSize(att.file_size)}
                            </div>
                          </div>
                          <a
                            href={api.downloadFileUrl(att.file_id)}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                              padding: "4px 10px",
                              background: "#eef2ff",
                              color: "#4338ca",
                              borderRadius: 6,
                              textDecoration: "none",
                              fontSize: 11.5,
                              fontWeight: 600,
                            }}
                          >
                            <Download size={11} /> Download
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-end",
                    paddingTop: 10,
                    borderTop: "1px solid var(--border)",
                    fontSize: 12,
                    color: "#6b7280",
                    flexWrap: "wrap",
                    gap: 8,
                  }}
                >
                  <div>
                    <div>
                      From{" "}
                      <strong style={{ color: "#111827" }}>
                        {a.created_by_name}
                      </strong>
                    </div>
                    <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
                      Sent: {formatSentTime(a.created_at)}
                    </div>
                  </div>

                  {isNew && (
                    <button
                      className="erp-btn erp-btn-primary"
                      onClick={() => handleMarkSeen(a)}
                      style={{ padding: "4px 12px", fontSize: 12 }}
                    >
                      <Eye size={12} /> Mark as Read
                    </button>
                  )}
                </div>
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

export default EmployeeAnnouncements;