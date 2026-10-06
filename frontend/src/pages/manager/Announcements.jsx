import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Megaphone,
  Plus,
  Search,
  Trash2,
  Users,
  Lock,
  Eye,
  CheckCircle2,
  X,
  Paperclip,
  AlertTriangle,
} from "lucide-react";
import Layout from "../../components/layout/Layout";
import Modal from "../../components/common/Modal";
import Toast from "../../components/common/Toast";
import FileUpload from "../../components/common/FileUpload";
import * as api from "../../api/announcementApi";
import * as empApi from "../../api/employeeApi";
import { formatSentTime, formatDateTime } from "../../utils/dateUtils";

const FONT = "'Calibri', 'Segoe UI', -apple-system, sans-serif";

const priorityConfig = {
  LOW: { color: "#64748b", bg: "#f1f5f9", label: "Low", dot: "#94a3b8" },
  NORMAL: { color: "#4f46e5", bg: "#eef2ff", label: "Normal", dot: "#6366f1" },
  HIGH: { color: "#d97706", bg: "#fffbeb", label: "High", dot: "#f59e0b" },
  URGENT: { color: "#dc2626", bg: "#fef2f2", label: "Urgent", dot: "#ef4444" },
};

const emptyForm = {
  title: "",
  content: "",
  priority: "NORMAL",
  target_type: "ALL",
  target_employee_ids: [],
  attachments: [],
};

const ManagerAnnouncements = () => {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({});
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [seenTarget, setSeenTarget] = useState(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const openId = searchParams.get("open");
  const [highlightId, setHighlightId] = useState(null);
  const itemRefs = useRef({});
  const initialLoadDone = useRef(false);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const [aRes, sRes] = await Promise.all([
          api.listAnnouncements(tab, "", search),
          api.getAnnouncementStats(),
        ]);
        setItems(Array.isArray(aRes.data) ? aRes.data : []);
        setStats(sRes.data || {});
      } catch (e) {
        console.error("Load error:", e);
        if (!silent) {
          setToast({
            message: "Failed to load announcements",
            type: "error",
          });
        }
      } finally {
        setLoading(false);
      }
    },
    [tab, search]
  );

  useEffect(() => {
    if (!initialLoadDone.current) {
      initialLoadDone.current = true;
      load(false);
    }
  }, [load]);

  useEffect(() => {
    if (initialLoadDone.current) {
      load(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, search]);

  useEffect(() => {
    empApi
      .listEmployees("", "", "ACTIVE")
      .then((res) => setEmployees(Array.isArray(res.data) ? res.data : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!openId || loading || items.length === 0) return;

    const el = itemRefs.current[openId];
    if (el) {
      setTimeout(() => {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
      setHighlightId(openId);

      const timer = setTimeout(() => {
        setHighlightId(null);
        const newParams = new URLSearchParams(searchParams);
        newParams.delete("open");
        setSearchParams(newParams, { replace: true });
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [openId, loading, items, searchParams, setSearchParams]);

  const openAdd = () => {
    setForm(emptyForm);
    setModalOpen(true);
  };

  const toggleEmployee = (id) => {
    setForm((f) => ({
      ...f,
      target_employee_ids: f.target_employee_ids.includes(id)
        ? f.target_employee_ids.filter((x) => x !== id)
        : [...f.target_employee_ids, id],
    }));
  };

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      setToast({ message: "Title and content required", type: "error" });
      return;
    }
    if (
      form.target_type === "SPECIFIC" &&
      form.target_employee_ids.length === 0
    ) {
      setToast({ message: "Select at least one employee", type: "error" });
      return;
    }
    setSaving(true);
    try {
      await api.createAnnouncement(form);
      setToast({
        message:
          form.target_type === "ALL"
            ? "Common announcement published!"
            : "Private message sent!",
        type: "success",
      });
      setModalOpen(false);
      await load(true);
    } catch (err) {
      setToast({
        message: err.response?.data?.error || "Failed to publish",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await api.deleteAnnouncement(confirmDelete._id);
      setToast({ message: "Deleted", type: "success" });
      setConfirmDelete(null);
      await load(true);
    } catch (err) {
      setToast({ message: "Failed to delete", type: "error" });
    }
  };

  const tabs = [
    { key: "", label: "All", count: stats.total || 0 },
    { key: "ALL", label: "Common", count: stats.common || 0 },
    { key: "SPECIFIC", label: "Private", count: stats.private || 0 },
  ];

  return (
    <Layout>
      <div style={{ fontFamily: FONT, maxWidth: 1200, margin: "0 auto" }}>
        {/* ============================================
            Header
            ============================================ */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 28,
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
              Announcements
            </h1>
            <p
              style={{
                fontSize: 13.5,
                color: "#64748b",
                margin: 0,
              }}
            >
              Send messages to your team
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
            <Plus size={15} strokeWidth={2.5} /> New Announcement
          </button>
        </div>

        {/* ============================================
            Stats — compact inline row
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
            Icon={Megaphone}
          />
          <StatTile
            label="Common"
            value={stats.common || 0}
            color="#059669"
            bg="#ecfdf5"
            Icon={Users}
          />
          <StatTile
            label="Private"
            value={stats.private || 0}
            color="#d97706"
            bg="#fffbeb"
            Icon={Lock}
          />
          <StatTile
            label="Urgent"
            value={stats.urgent || 0}
            color="#dc2626"
            bg="#fef2f2"
            Icon={AlertTriangle}
          />
        </div>

        {/* ============================================
            Tabs + Search — sticky bar
            ============================================ */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 16,
            padding: "4px 0",
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
                  }}
                >
                  {t.label}
                  <span
                    style={{
                      background: active ? "#eef2ff" : "transparent",
                      color: active ? "#4f46e5" : "#94a3b8",
                      borderRadius: 6,
                      padding: "1px 6px",
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    {t.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div
            style={{
              position: "relative",
              flex: "1 1 240px",
              maxWidth: 320,
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
              placeholder="Search announcements..."
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
        </div>

        {/* ============================================
            List
            ============================================ */}
        {loading ? (
          <div
            style={{
              background: "white",
              borderRadius: 14,
              border: "1px solid #e2e8f0",
              padding: 60,
              textAlign: "center",
              color: "#94a3b8",
              fontSize: 13,
            }}
          >
            <div className="spinner-border spinner-border-sm me-2" />
            Loading...
          </div>
        ) : items.length === 0 ? (
          <EmptyState tab={tab} onAdd={openAdd} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {items.map((a) => (
              <AnnouncementRow
                key={a._id}
                ann={a}
                highlighted={highlightId === a._id}
                innerRef={(el) => (itemRefs.current[a._id] = el)}
                onDelete={() => setConfirmDelete(a)}
                onViewSeen={() => setSeenTarget(a._id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ============================================
          Create Modal
          ============================================ */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="New Announcement"
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
              {saving
                ? "Publishing..."
                : form.target_type === "ALL"
                ? "Publish to All"
                : "Send Private"}
            </button>
          </>
        }
      >
        <div className="mb-3">
          <label className="erp-label">Title *</label>
          <input
            className="erp-input"
            placeholder="e.g., Diwali Holiday Notice"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            autoFocus
            style={{ fontFamily: FONT }}
          />
        </div>

        <div className="row g-2 mb-3">
          <div className="col-6">
            <label className="erp-label">Priority</label>
            <select
              className="erp-input"
              value={form.priority}
              onChange={(e) =>
                setForm({ ...form, priority: e.target.value })
              }
              style={{ fontFamily: FONT }}
            >
              <option value="LOW">🟢 Low</option>
              <option value="NORMAL">🔵 Normal</option>
              <option value="HIGH">🟠 High</option>
              <option value="URGENT">🔴 Urgent</option>
            </select>
          </div>
          <div className="col-6">
            <label className="erp-label">Target</label>
            <select
              className="erp-input"
              value={form.target_type}
              onChange={(e) =>
                setForm({
                  ...form,
                  target_type: e.target.value,
                  target_employee_ids: [],
                })
              }
              style={{ fontFamily: FONT }}
            >
              <option value="ALL">All Employees (Common)</option>
              <option value="SPECIFIC">Specific (Private)</option>
            </select>
          </div>
        </div>

        <div className="mb-3">
          <label className="erp-label">Content *</label>
          <textarea
            className="erp-input"
            rows={4}
            placeholder="Type your message here..."
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            style={{ resize: "vertical", fontFamily: FONT }}
          />
        </div>

        {form.target_type === "SPECIFIC" && (
          <div className="mb-3">
            <label className="erp-label">
              Select Employees ({form.target_employee_ids.length} selected)
            </label>
            <div
              style={{
                maxHeight: 200,
                overflowY: "auto",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: 6,
              }}
            >
              {employees.length === 0 ? (
                <div
                  style={{
                    padding: 12,
                    textAlign: "center",
                    color: "#6b7280",
                    fontSize: 12.5,
                    fontFamily: FONT,
                  }}
                >
                  No active employees
                </div>
              ) : (
                employees.map((emp) => {
                  const checked = form.target_employee_ids.includes(
                    emp._id
                  );
                  return (
                    <label
                      key={emp._id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "6px 10px",
                        borderRadius: 6,
                        cursor: "pointer",
                        background: checked ? "#eef2ff" : "transparent",
                        fontSize: 13,
                        fontFamily: FONT,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleEmployee(emp._id)}
                      />
                      <div
                        className="erp-avatar"
                        style={{ width: 26, height: 26, fontSize: 10 }}
                      >
                        {emp.first_name?.[0]}
                        {emp.last_name?.[0]}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600 }}>
                          {emp.first_name} {emp.last_name}
                        </div>
                        <div style={{ fontSize: 11, color: "#6b7280" }}>
                          {emp.employee_code}
                          {emp.department_name &&
                            ` · ${emp.department_name}`}
                        </div>
                      </div>
                    </label>
                  );
                })
              )}
            </div>
          </div>
        )}

        <div className="mb-2">
          <label className="erp-label">
            Attachments ({form.attachments.length}/5)
          </label>
          <FileUpload
            files={form.attachments}
            onChange={(files) =>
              setForm({ ...form, attachments: files })
            }
          />
        </div>
      </Modal>

      {/* Seen List Modal */}
      {seenTarget && (
        <SeenListModal
          annId={seenTarget}
          onClose={() => setSeenTarget(null)}
        />
      )}

      {/* Confirm Delete */}
      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete Announcement?"
        footer={
          <>
            <button
              className="erp-btn erp-btn-outline"
              onClick={() => setConfirmDelete(null)}
            >
              Cancel
            </button>
            <button
              className="erp-btn erp-btn-danger"
              onClick={handleDelete}
            >
              Yes, Delete
            </button>
          </>
        }
      >
        <p style={{ margin: 0, color: "#6b7280", fontFamily: FONT }}>
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
// Stat Tile
// ============================================
const StatTile = ({ label, value, color, bg, Icon }) => (
  <div
    style={{
      background: "white",
      border: "1px solid #e2e8f0",
      borderRadius: 12,
      padding: "14px 16px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      fontFamily: FONT,
      transition: "all 0.15s",
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.borderColor = "#cbd5e1";
      e.currentTarget.style.boxShadow =
        "0 2px 8px -2px rgba(0,0,0,0.05)";
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.borderColor = "#e2e8f0";
      e.currentTarget.style.boxShadow = "none";
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
// Announcement Row
// ============================================
const AnnouncementRow = ({
  ann,
  highlighted,
  innerRef,
  onDelete,
  onViewSeen,
}) => {
  const isPrivate = ann.target_type === "SPECIFIC";
  const p = priorityConfig[ann.priority] || priorityConfig.NORMAL;
  const pct =
    ann.total_recipients > 0
      ? Math.round((ann.seen_count / ann.total_recipients) * 100)
      : 0;
  const seenFull = pct === 100;

  return (
    <div
      ref={innerRef}
      style={{
        background: "white",
        border: highlighted ? "1.5px solid #6366f1" : "1px solid #e2e8f0",
        borderRadius: 14,
        padding: "18px 20px",
        fontFamily: FONT,
        transition: "all 0.25s ease",
        boxShadow: highlighted
          ? "0 0 0 4px rgba(99,102,241,0.1), 0 4px 12px -4px rgba(0,0,0,0.08)"
          : "0 1px 2px rgba(0,0,0,0.02)",
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
            ann.priority === "URGENT"
              ? "#ef4444"
              : ann.priority === "HIGH"
              ? "#f59e0b"
              : isPrivate
              ? "#d97706"
              : "#6366f1",
        }}
      />

      {/* ============ TOP ROW — Badges + Actions ============ */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            flexWrap: "wrap",
          }}
        >
          {/* Priority pill */}
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
              letterSpacing: 0.2,
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

          {/* Type pill */}
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              background: isPrivate ? "#fffbeb" : "#f1f5f9",
              color: isPrivate ? "#92400e" : "#475569",
              padding: "3px 9px",
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 600,
              border: `1px solid ${isPrivate ? "#fde68a" : "#e2e8f0"}`,
            }}
          >
            {isPrivate ? (
              <>
                <Lock size={10} strokeWidth={2.5} /> Private
              </>
            ) : (
              <>
                <Users size={10} strokeWidth={2.5} /> Common
              </>
            )}
          </span>

          {/* Attachment pill */}
          {ann.attachments?.length > 0 && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                background: "#f8fafc",
                color: "#64748b",
                padding: "3px 9px",
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 600,
                border: "1px solid #e2e8f0",
              }}
            >
              <Paperclip size={10} strokeWidth={2.5} />
              {ann.attachments.length}
            </span>
          )}

          {/* Recipients info for private */}
          {isPrivate && ann.total_recipients > 0 && (
            <span
              style={{
                fontSize: 11,
                color: "#94a3b8",
                fontWeight: 500,
                marginLeft: 2,
              }}
            >
              → {ann.total_recipients}{" "}
              {ann.total_recipients === 1 ? "recipient" : "recipients"}
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
          <IconButton
            onClick={onViewSeen}
            title="View recipients"
            Icon={Eye}
          />
          <IconButton
            onClick={onDelete}
            title="Delete"
            Icon={Trash2}
            danger
          />
        </div>
      </div>

      {/* ============ TITLE ============ */}
      <h3
        style={{
          fontSize: 15.5,
          fontWeight: 700,
          color: "#0f172a",
          margin: 0,
          marginBottom: 6,
          letterSpacing: "-0.2px",
          lineHeight: 1.4,
        }}
      >
        {ann.title}
      </h3>

      {/* ============ CONTENT ============ */}
      <p
        style={{
          fontSize: 13,
          color: "#475569",
          margin: 0,
          marginBottom: 16,
          lineHeight: 1.55,
          overflow: "hidden",
          textOverflow: "ellipsis",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
        }}
      >
        {ann.content}
      </p>

      {/* ============ FOOTER — Metadata + Progress ============ */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          paddingTop: 12,
          borderTop: "1px solid #f1f5f9",
          flexWrap: "wrap",
        }}
      >
        {/* Metadata */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 11.5,
            color: "#94a3b8",
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <span
              style={{
                width: 20,
                height: 20,
                borderRadius: "50%",
                background:
                  "linear-gradient(135deg, #6366f1, #8b5cf6)",
                color: "white",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 9,
                fontWeight: 800,
                letterSpacing: "-0.2px",
              }}
            >
              {ann.created_by_name?.charAt(0) || "M"}
            </span>
            <strong style={{ color: "#64748b", fontWeight: 600 }}>
              {ann.created_by_name}
            </strong>
          </span>
          <span style={{ color: "#cbd5e1" }}>·</span>
          <span>{formatSentTime(ann.created_at)}</span>
        </div>

        {/* Seen progress — compact */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            minWidth: 200,
          }}
        >
          <div
            style={{
              flex: 1,
              height: 5,
              background: "#f1f5f9",
              borderRadius: 3,
              overflow: "hidden",
              position: "relative",
            }}
          >
            <div
              style={{
                width: `${pct}%`,
                height: "100%",
                background: seenFull
                  ? "linear-gradient(90deg, #10b981, #059669)"
                  : "linear-gradient(90deg, #818cf8, #6366f1)",
                borderRadius: 3,
                transition: "width 0.4s ease",
              }}
            />
          </div>
          <span
            style={{
              fontSize: 11,
              color: seenFull ? "#059669" : "#64748b",
              fontWeight: 700,
              whiteSpace: "nowrap",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {seenFull && <CheckCircle2 size={11} strokeWidth={3} />}
            {ann.seen_count || 0}/{ann.total_recipients || 0}
          </span>
        </div>
      </div>
    </div>
  );
};

// ============================================
// Icon Button
// ============================================
const IconButton = ({ onClick, title, Icon, danger }) => (
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
      fontFamily: FONT,
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
// Empty State
// ============================================
const EmptyState = ({ tab, onAdd }) => (
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
      <Megaphone size={28} strokeWidth={2} />
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
      {tab === "ALL"
        ? "No common announcements"
        : tab === "SPECIFIC"
        ? "No private messages"
        : "No announcements yet"}
    </h3>
    <p
      style={{
        fontSize: 13,
        color: "#64748b",
        margin: 0,
        marginBottom: 20,
      }}
    >
      {tab
        ? "Nothing in this category yet"
        : "Send your first announcement to your team"}
    </p>
    {!tab && (
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
        <Plus size={15} strokeWidth={2.5} /> New Announcement
      </button>
    )}
  </div>
);

// ============================================
// Seen List Modal
// ============================================
const SeenListModal = ({ annId, onClose }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getSeenList(annId)
      .then((res) => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [annId]);

  return (
    <Modal
      open={true}
      onClose={onClose}
      title="Who has seen this?"
      footer={
        <button className="erp-btn erp-btn-outline" onClick={onClose}>
          Close
        </button>
      }
    >
      {loading ? (
        <div className="text-center py-4" style={{ fontFamily: FONT }}>
          Loading...
        </div>
      ) : data ? (
        <div style={{ fontFamily: FONT }}>
          <div
            style={{
              padding: 12,
              background: "#f9fafb",
              borderRadius: 8,
              marginBottom: 12,
              display: "flex",
              justifyContent: "space-between",
              fontSize: 13,
            }}
          >
            <span>
              <strong style={{ color: "#059669" }}>
                {data.seen_count}
              </strong>{" "}
              seen
            </span>
            <span>
              <strong style={{ color: "#dc2626" }}>
                {data.pending_count}
              </strong>{" "}
              pending
            </span>
            <span>
              Total: <strong>{data.total}</strong>
            </span>
          </div>

          {data.seen.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#059669",
                  textTransform: "uppercase",
                  marginBottom: 8,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <CheckCircle2 size={13} /> Seen ({data.seen_count})
              </div>
              <div
                style={{
                  maxHeight: 200,
                  overflowY: "auto",
                  border: "1px solid #a7f3d0",
                  borderRadius: 8,
                  background: "#ecfdf5",
                }}
              >
                {data.seen.map((emp) => (
                  <div
                    key={emp.employee_id}
                    style={{
                      padding: "8px 12px",
                      borderBottom: "1px solid #d1fae5",
                      fontSize: 13,
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <span>
                      <strong>{emp.employee_name}</strong>{" "}
                      <span style={{ color: "#6b7280", fontSize: 11 }}>
                        ({emp.employee_code})
                      </span>
                    </span>
                    <span style={{ color: "#6b7280", fontSize: 11 }}>
                      {emp.seen_at
                        ? formatDateTime(emp.seen_at)
                            .split(",")
                            .slice(1)
                            .join(",")
                            .trim()
                        : ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.pending.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#dc2626",
                  textTransform: "uppercase",
                  marginBottom: 8,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <X size={13} /> Not Seen ({data.pending_count})
              </div>
              <div
                style={{
                  maxHeight: 150,
                  overflowY: "auto",
                  border: "1px solid #fecaca",
                  borderRadius: 8,
                  background: "#fef2f2",
                }}
              >
                {data.pending.map((emp) => (
                  <div
                    key={emp.employee_id}
                    style={{
                      padding: "8px 12px",
                      borderBottom: "1px solid #fee2e2",
                      fontSize: 13,
                    }}
                  >
                    <strong>{emp.employee_name}</strong>{" "}
                    <span style={{ color: "#6b7280", fontSize: 11 }}>
                      ({emp.employee_code})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-4" style={{ fontFamily: FONT }}>
          Failed to load
        </div>
      )}
    </Modal>
  );
};

export default ManagerAnnouncements;