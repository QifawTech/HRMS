import { useState, useEffect } from "react";
import {
  CalendarDays,
  Plus,
  Pencil,
  Trash2,
  Save,
  Sparkles,
  Flag,
  Star,
  Briefcase,
  CheckCircle2,
} from "lucide-react";
import Layout from "../../components/layout/Layout";
import Toast from "../../components/common/Toast";
import * as holidayApi from "../../api/holidayApi";

const FONT = "'Inter', 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif";

const TYPE_STYLES = {
  National: { bg: "#fee2e2", color: "#991b1b", border: "#fecaca" },
  Regional: { bg: "#fef3c7", color: "#92400e", border: "#fde68a" },
  Festival: { bg: "#ede9fe", color: "#5b21b6", border: "#c4b5fd" },
  Company: { bg: "#dbeafe", color: "#1e40af", border: "#bfdbfe" },
  Optional: { bg: "#f1f5f9", color: "#475569", border: "#cbd5e1" },
};

const formatDate = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  return dt.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

// ============================================
// Stat Card
// ============================================
const StatBox = ({ label, value, color, bg, Icon }) => (
  <div
    style={{
      flex: 1,
      minWidth: 120,
      padding: "14px 16px",
      background: bg,
      borderRadius: 12,
      border: `1px solid ${color}20`,
      fontFamily: FONT,
    }}
  >
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        marginBottom: 4,
      }}
    >
      <Icon size={13} color={color} />
      <span
        style={{
          fontSize: 10.5,
          fontWeight: 700,
          color: color,
          textTransform: "uppercase",
          letterSpacing: 0.4,
        }}
      >
        {label}
      </span>
    </div>
    <div
      style={{
        fontSize: 22,
        fontWeight: 800,
        color: "#0f172a",
        letterSpacing: "-0.5px",
      }}
    >
      {value}
    </div>
  </div>
);

const ManagerHolidays = () => {
  const [toast, setToast] = useState(null);
  const [holidays, setHolidays] = useState([]);
  const [years, setYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [autoSeeding, setAutoSeeding] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({
    name: "",
    date: "",
    type: "National",
    description: "",
    is_optional: false,
  });
  const [saving, setSaving] = useState(false);

  // ============================================
  // ✅ AUTO-SEED: Load + auto-seed if empty
  // ============================================
  const load = async () => {
    setLoading(true);
    try {
      const [hRes, yRes] = await Promise.all([
        holidayApi.listHolidays(selectedYear),
        holidayApi.getAvailableYears(),
      ]);

      let holidaysData = Array.isArray(hRes.data) ? hRes.data : [];

      // ✅ AUTO-SEED if no holidays for this year
      if (holidaysData.length === 0) {
        setAutoSeeding(true);
        try {
          const seedRes = await holidayApi.seedDefaults(selectedYear);
          const created = seedRes.data?.created || 0;

          if (created > 0) {
            // Reload after seeding
            const reloadRes = await holidayApi.listHolidays(selectedYear);
            holidaysData = Array.isArray(reloadRes.data)
              ? reloadRes.data
              : [];
            setToast({
              message: `Loaded ${created} default holidays for ${selectedYear}`,
              type: "success",
            });
          }
        } catch (seedErr) {
          console.error("Auto-seed failed:", seedErr);
          // Silent fail — not critical
        } finally {
          setAutoSeeding(false);
        }
      }

      setHolidays(holidaysData);
      setYears(Array.isArray(yRes.data) ? yRes.data : []);
    } catch (e) {
      console.error(e);
      setToast({ message: "Failed to load holidays", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, [selectedYear]);

  // ============================================
  // Stats
  // ============================================
  const stats = {
    total: holidays.length,
    national: holidays.filter((h) => h.type === "National").length,
    festival: holidays.filter((h) => h.type === "Festival").length,
    optional: holidays.filter((h) => h.is_optional).length,
  };

  const openAdd = () => {
    setEditItem(null);
    setForm({
      name: "",
      date: `${selectedYear}-01-01`,
      type: "National",
      description: "",
      is_optional: false,
    });
    setModalOpen(true);
  };

  const openEdit = (h) => {
    setEditItem(h);
    setForm({
      name: h.name,
      date: h.date,
      type: h.type,
      description: h.description || "",
      is_optional: !!h.is_optional,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.date) {
      setToast({ message: "Name and date required", type: "error" });
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, year: parseInt(form.date.slice(0, 4)) };
      if (editItem) {
        await holidayApi.updateHoliday(editItem._id, payload);
        setToast({ message: "Holiday updated", type: "success" });
      } else {
        await holidayApi.createHoliday(payload);
        setToast({ message: "Holiday added", type: "success" });
      }
      setModalOpen(false);
      load();
    } catch (e) {
      setToast({
        message: e.response?.data?.error || "Failed",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (h) => {
    if (!window.confirm(`Delete "${h.name}"?`)) return;
    try {
      await holidayApi.deleteHoliday(h._id);
      setToast({ message: "Deleted", type: "success" });
      load();
    } catch (e) {
      setToast({ message: "Failed to delete", type: "error" });
    }
  };

  const handleManualSeed = async () => {
    if (!window.confirm(`Load default Indian holidays for ${selectedYear}?`))
      return;
    try {
      const res = await holidayApi.seedDefaults(selectedYear);
      setToast({
        message: `Added ${res.data.created} holidays for ${selectedYear}`,
        type: "success",
      });
      load();
    } catch (e) {
      setToast({ message: "Seeding failed", type: "error" });
    }
  };

  return (
    <Layout>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

        .hol-page,
        .hol-page * {
          font-family: ${FONT};
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          box-sizing: border-box;
        }

        /* ✅ FIX: Max-width and auto margin ah remove panni, full width ah maathiiruken */
        .hol-page {
          width: 100%;
          padding: 0 20px; /* Konjam left/right padding kudukkirom */
        }

        /* ✅ FIX: Header row ku mela extra gap varaama irukka */
        .hol-header-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 18px;
          margin-top: 0;
        }

        .hol-header-controls {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-wrap: wrap;
        }

        .hol-year-select {
          padding: 10px 14px;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          background: white;
          font-weight: 700;
          font-size: 13.5px;
          font-family: ${FONT};
          cursor: pointer;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
          color: #0f172a;
        }

        .hol-year-select:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
        }

        .hol-stats-row {
          display: flex;
          gap: 10px;
          margin-bottom: 18px;
          flex-wrap: wrap;
        }

        .hol-card {
          background: white;
          border: 1px solid #eef0f4;
          border-radius: 14px;
          padding: 20px;
          box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04);
        }

        /* ===== Table (desktop) ===== */
        .hol-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }

        .hol-table th {
          background: #f8fafc;
          padding: 10px 12px;
          text-align: left;
          font-size: 11px;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.4px;
          font-weight: 700;
          border-bottom: 1px solid #e2e8f0;
        }

        .hol-table td {
          padding: 12px;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: middle;
        }

        .hol-table tbody tr:hover {
          background: #f9fafb;
        }

        .hol-table tbody tr:last-child td {
          border-bottom: none;
        }

        .hol-type-pill {
          display: inline-block;
          padding: 3px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
          border: 1px solid transparent;
        }

        .hol-actions {
          display: flex;
          gap: 6px;
        }

        .hol-icon-btn {
          border: none;
          border-radius: 8px;
          padding: 6px 9px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          transition: opacity 0.15s;
          font-family: ${FONT};
          font-size: 12px;
          font-weight: 600;
        }

        .hol-icon-btn:hover {
          opacity: 0.85;
        }

        /* ===== Mobile cards ===== */
        .hol-card-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .hol-mini-card {
          padding: 14px;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          background: #fff;
        }

        .hol-mini-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 8px;
          margin-bottom: 10px;
        }

        .hol-mini-title {
          font-weight: 700;
          font-size: 14px;
          color: #0f172a;
        }

        .hol-mini-meta {
          font-size: 11.5px;
          color: #94a3b8;
          margin-top: 2px;
        }

        .hol-mini-row {
          display: flex;
          justify-content: space-between;
          padding: 6px 0;
          font-size: 12.5px;
          border-top: 1px dashed #f1f5f9;
        }

        .hol-mini-row:first-of-type {
          border-top: none;
        }

        .hol-mini-row-label {
          color: #64748b;
          font-weight: 500;
        }

        .hol-mini-row-value {
          font-weight: 700;
          color: #0f172a;
        }

        .hol-mini-actions {
          display: flex;
          gap: 8px;
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid #f1f5f9;
        }

        .hol-mini-actions .hol-icon-btn {
          flex: 1;
          justify-content: center;
          padding: 8px;
        }

        /* ===== Modal ===== */
        .hol-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 16px;
        }

        .hol-modal {
          background: white;
          border-radius: 14px;
          padding: 24px;
          max-width: 480px;
          width: 100%;
          font-family: ${FONT};
          max-height: 90vh;
          overflow-y: auto;
        }

        /* ===== Loading state ===== */
        .hol-loading {
          text-align: center;
          padding: 60px 20px;
          color: #6b7280;
          font-size: 13.5px;
        }

        @keyframes hol-spin {
          to { transform: rotate(360deg); }
        }

        .hol-spin {
          animation: hol-spin 0.8s linear infinite;
          display: inline-block;
        }

        /* ===== Responsive ===== */
        @media (min-width: 768px) {
          .hol-card-list { display: none; }
        }

        @media (max-width: 767px) {
          .hol-table-wrapper { display: none; }
          .hol-page .erp-page-title { font-size: 22px; }
          .hol-page .erp-page-subtitle { font-size: 12.5px; }
          .hol-header-controls { width: 100%; }
          .hol-header-controls .erp-btn { flex: 1; justify-content: center; }
          .hol-year-select { flex: 1; }
          .hol-card { padding: 14px; }
          .hol-stats-row { gap: 8px; }
          .hol-modal { padding: 20px; border-radius: 12px; }
        }

        @media (max-width: 480px) {
          .hol-stats-row > div { min-width: calc(50% - 4px) !important; }
        }
      `}</style>

      <div className="hol-page">
        {/* Header */}
        <div className="hol-header-row" style={{ paddingTop: 0 }}>
          <div>
            <h1 className="erp-page-title">Holiday Calendar</h1>
            <p className="erp-page-subtitle mb-0">
              Configure yearly holidays for your company
            </p>
          </div>
          <div className="hol-header-controls">
            <select
              className="hol-year-select"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            >
              {(years.length ? years : [selectedYear]).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <button
              className="erp-btn erp-btn-outline"
              onClick={handleManualSeed}
              title="Add default Indian holidays"
            >
              <Sparkles size={14} /> Seed Defaults
            </button>
            <button className="erp-btn erp-btn-primary" onClick={openAdd}>
              <Plus size={14} /> Add Holiday
            </button>
          </div>
        </div>

        {/* Stats Row */}
        {!loading && holidays.length > 0 && (
          <div className="hol-stats-row">
            <StatBox
              label="Total"
              value={stats.total}
              color="#6366f1"
              bg="#eef2ff"
              Icon={CalendarDays}
            />
            <StatBox
              label="National"
              value={stats.national}
              color="#dc2626"
              bg="#fef2f2"
              Icon={Flag}
            />
            <StatBox
              label="Festivals"
              value={stats.festival}
              color="#8b5cf6"
              bg="#f5f3ff"
              Icon={Star}
            />
            <StatBox
              label="Optional"
              value={stats.optional}
              color="#d97706"
              bg="#fffbeb"
              Icon={Briefcase}
            />
          </div>
        )}

        {/* Content Card */}
        <div className="hol-card">
          {loading ? (
            <div className="hol-loading">
              <div className="hol-spin" style={{ fontSize: 24 }}>⟳</div>
              <div style={{ marginTop: 10 }}>
                {autoSeeding
                  ? `Loading default holidays for ${selectedYear}...`
                  : "Loading holidays..."}
              </div>
            </div>
          ) : holidays.length === 0 ? (
            <div
              className="text-center py-5"
              style={{ color: "#9ca3af", padding: 40 }}
            >
              <CalendarDays
                size={42}
                style={{ opacity: 0.4, marginBottom: 12 }}
              />
              <div style={{ fontWeight: 600, fontSize: 15, color: "#4b5563" }}>
                No holidays for {selectedYear}
              </div>
              <div style={{ fontSize: 12.5, marginTop: 6 }}>
                Click "Seed Defaults" to add common Indian holidays, or add
                manually.
              </div>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hol-table-wrapper">
                <table className="hol-table">
                  <thead>
                    <tr>
                      <th style={{ width: 40 }}>#</th>
                      <th>Holiday</th>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Optional</th>
                      <th style={{ width: 110 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {holidays.map((h, i) => {
                      const st = TYPE_STYLES[h.type] || TYPE_STYLES.Optional;
                      return (
                        <tr key={h._id}>
                          <td style={{ color: "#94a3b8", fontWeight: 600 }}>
                            {i + 1}
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, color: "#0f172a" }}>
                              {h.name}
                            </div>
                            {h.description && (
                              <div
                                style={{
                                  fontSize: 11.5,
                                  color: "#94a3b8",
                                  marginTop: 2,
                                }}
                              >
                                {h.description}
                              </div>
                            )}
                          </td>
                          <td style={{ fontWeight: 600, color: "#0f172a" }}>
                            {formatDate(h.date)}
                          </td>
                          <td>
                            <span
                              className="hol-type-pill"
                              style={{
                                background: st.bg,
                                color: st.color,
                                borderColor: st.border,
                              }}
                            >
                              {h.type}
                            </span>
                          </td>
                          <td>
                            {h.is_optional ? (
                              <span
                                style={{
                                  color: "#d97706",
                                  fontWeight: 700,
                                  fontSize: 12,
                                }}
                              >
                                Optional
                              </span>
                            ) : (
                              <span
                                style={{
                                  color: "#059669",
                                  fontWeight: 700,
                                  fontSize: 12,
                                }}
                              >
                                Mandatory
                              </span>
                            )}
                          </td>
                          <td>
                            <div className="hol-actions">
                              <button
                                className="hol-icon-btn"
                                onClick={() => openEdit(h)}
                                style={{
                                  background: "#eef2ff",
                                  color: "#4f46e5",
                                }}
                                title="Edit"
                              >
                                <Pencil size={12} />
                              </button>
                              <button
                                className="hol-icon-btn"
                                onClick={() => handleDelete(h)}
                                style={{
                                  background: "#fee2e2",
                                  color: "#dc2626",
                                }}
                                title="Delete"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="hol-card-list">
                {holidays.map((h) => {
                  const st = TYPE_STYLES[h.type] || TYPE_STYLES.Optional;
                  return (
                    <div key={h._id} className="hol-mini-card">
                      <div className="hol-mini-head">
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div className="hol-mini-title">{h.name}</div>
                          {h.description && (
                            <div className="hol-mini-meta">
                              {h.description}
                            </div>
                          )}
                        </div>
                        <span
                          className="hol-type-pill"
                          style={{
                            background: st.bg,
                            color: st.color,
                            borderColor: st.border,
                          }}
                        >
                          {h.type}
                        </span>
                      </div>
                      <div className="hol-mini-row">
                        <span className="hol-mini-row-label">Date</span>
                        <span className="hol-mini-row-value">
                          {formatDate(h.date)}
                        </span>
                      </div>
                      <div className="hol-mini-row">
                        <span className="hol-mini-row-label">Status</span>
                        <span
                          className="hol-mini-row-value"
                          style={{
                            color: h.is_optional ? "#d97706" : "#059669",
                          }}
                        >
                          {h.is_optional ? "Optional" : "Mandatory"}
                        </span>
                      </div>
                      <div className="hol-mini-actions">
                        <button
                          className="hol-icon-btn"
                          onClick={() => openEdit(h)}
                          style={{
                            background: "#eef2ff",
                            color: "#4f46e5",
                          }}
                        >
                          <Pencil size={12} /> Edit
                        </button>
                        <button
                          className="hol-icon-btn"
                          onClick={() => handleDelete(h)}
                          style={{
                            background: "#fee2e2",
                            color: "#dc2626",
                          }}
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div
          className="hol-modal-backdrop"
          onClick={() => setModalOpen(false)}
        >
          <div className="hol-modal" onClick={(e) => e.stopPropagation()}>
            <h3
              style={{
                fontSize: 16,
                fontWeight: 700,
                marginBottom: 16,
                color: "#0f172a",
              }}
            >
              {editItem ? "Edit Holiday" : "Add Holiday"}
            </h3>

            <div className="mb-3">
              <label className="erp-label">Holiday Name *</label>
              <input
                className="erp-input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., Pongal"
                style={{ fontFamily: FONT }}
              />
            </div>

            <div className="row g-3 mb-3">
              <div className="col-12 col-sm-6">
                <label className="erp-label">Date *</label>
                <input
                  type="date"
                  className="erp-input"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  style={{ fontFamily: FONT }}
                />
              </div>
              <div className="col-12 col-sm-6">
                <label className="erp-label">Type</label>
                <select
                  className="erp-input"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  style={{ fontFamily: FONT }}
                >
                  <option>National</option>
                  <option>Regional</option>
                  <option>Festival</option>
                  <option>Company</option>
                  <option>Optional</option>
                </select>
              </div>
            </div>

            <div className="mb-3">
              <label className="erp-label">Description (Optional)</label>
              <textarea
                className="erp-input"
                rows={2}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Notes about this holiday"
                style={{ resize: "vertical", fontFamily: FONT }}
              />
            </div>

            <div className="mb-3">
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#374151",
                  fontFamily: FONT,
                }}
              >
                <input
                  type="checkbox"
                  checked={form.is_optional}
                  onChange={(e) =>
                    setForm({ ...form, is_optional: e.target.checked })
                  }
                  style={{ width: 18, height: 18, accentColor: "#6366f1" }}
                />
                Optional Holiday (employee can choose)
              </label>
            </div>

            <div className="d-flex justify-content-end gap-2">
              <button
                className="erp-btn erp-btn-outline"
                onClick={() => setModalOpen(false)}
                style={{ fontFamily: FONT }}
              >
                Cancel
              </button>
              <button
                className="erp-btn erp-btn-primary"
                onClick={handleSave}
                disabled={saving}
                style={{ fontFamily: FONT }}
              >
                <Save size={14} />
                {saving ? "Saving..." : editItem ? "Update" : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default ManagerHolidays;