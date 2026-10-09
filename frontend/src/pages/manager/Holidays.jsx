import { useState, useEffect } from "react";
import {
  CalendarDays,
  Plus,
  Pencil,
  Trash2,
  Save,
  Sparkles,
} from "lucide-react";
import Layout from "../../components/layout/Layout";
import Toast from "../../components/common/Toast";
import * as holidayApi from "../../api/holidayApi";

const FONT = "'Inter', 'Segoe UI', -apple-system, sans-serif";

const TYPE_STYLES = {
  National: { bg: "#fee2e2", color: "#991b1b" },
  Regional: { bg: "#fef3c7", color: "#92400e" },
  Festival: { bg: "#ede9fe", color: "#5b21b6" },
  Company: { bg: "#dbeafe", color: "#1e40af" },
  Optional: { bg: "#f1f5f9", color: "#475569" },
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

const ManagerHolidays = () => {
  const [toast, setToast] = useState(null);
  const [holidays, setHolidays] = useState([]);
  const [years, setYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);

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

  const load = async () => {
    setLoading(true);
    try {
      const [hRes, yRes] = await Promise.all([
        holidayApi.listHolidays(selectedYear),
        holidayApi.getAvailableYears(),
      ]);
      setHolidays(Array.isArray(hRes.data) ? hRes.data : []);
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

  const handleSeed = async () => {
    if (!window.confirm(`Seed default Indian holidays for ${selectedYear}?`))
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
        .hol-page { font-family: ${FONT}; max-width: 1100px; margin: 0 auto; }
        .hol-header-row { display: flex; justify-content: space-between; align-items: flex-end; gap: 12px; flex-wrap: wrap; }
        .hol-year-select {
          padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border);
          background: white; font-weight: 700; font-size: 13.5px;
          font-family: ${FONT}; cursor: pointer; outline: none;
        }
        .hol-card {
          background: white; border: 1px solid var(--border);
          border-radius: 14px; padding: 20px; margin-top: 18px;
        }
        .hol-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .hol-table th {
          background: #f8fafc; padding: 10px 12px; text-align: left;
          font-size: 11px; color: #64748b; text-transform: uppercase;
          letter-spacing: 0.4px; font-weight: 700;
          border-bottom: 1px solid #e2e8f0;
        }
        .hol-table td {
          padding: 12px; border-bottom: 1px solid #f1f5f9; vertical-align: middle;
        }
        .hol-type-pill {
          display: inline-block; padding: 3px 10px; border-radius: 20px;
          font-size: 11px; font-weight: 700;
        }
        .hol-actions { display: flex; gap: 6px; }
        .hol-icon-btn {
          border: none; border-radius: 8px; padding: 6px 9px; cursor: pointer;
          display: inline-flex; align-items: center;
        }
        .hol-modal-backdrop {
          position: fixed; inset: 0; background: rgba(0,0,0,0.5);
          display: flex; align-items: center; justify-content: center;
          z-index: 9999; padding: 16px;
        }
        .hol-modal {
          background: white; border-radius: 14px; padding: 24px;
          max-width: 480px; width: 100%; font-family: ${FONT};
          max-height: 90vh; overflow-y: auto;
        }
        @media (max-width: 767px) {
          .hol-table-wrapper { display: none; }
          .hol-card-list { display: flex; flex-direction: column; gap: 10px; }
          .hol-mini-card {
            padding: 14px; border: 1px solid #e2e8f0;
            border-radius: 12px; background: #fff;
          }
          .hol-mini-head {
            display: flex; justify-content: space-between;
            align-items: flex-start; gap: 8px; margin-bottom: 8px;
          }
          .hol-mini-title { font-weight: 700; font-size: 14px; }
          .hol-mini-meta { font-size: 12px; color: #64748b; margin-top: 2px; }
          .hol-mini-row {
            display: flex; justify-content: space-between;
            padding: 5px 0; font-size: 12.5px;
            border-top: 1px dashed #f1f5f9;
          }
          .hol-mini-row:first-of-type { border-top: none; }
          .hol-mini-actions { display: flex; gap: 8px; margin-top: 10px; }
          .hol-mini-actions .hol-icon-btn { flex: 1; justify-content: center; }
          .hol-header-row .erp-btn { width: 100%; justify-content: center; }
        }
        @media (min-width: 768px) {
          .hol-card-list { display: none; }
        }
      `}</style>

      <div className="hol-page">
        <div className="hol-header-row mb-3">
          <div>
            <h1 className="erp-page-title">Holiday Calendar</h1>
            <p className="erp-page-subtitle mb-0">
              Configure yearly holidays for your company
            </p>
          </div>
          <div className="d-flex gap-2 align-items-center flex-wrap">
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
              onClick={handleSeed}
              title="Add default Indian holidays"
            >
              <Sparkles size={14} /> Seed Defaults
            </button>
            <button className="erp-btn erp-btn-primary" onClick={openAdd}>
              <Plus size={14} /> Add Holiday
            </button>
          </div>
        </div>

        <div className="hol-card">
          {loading ? (
            <div className="text-center py-5" style={{ color: "#6b7280" }}>
              <div className="spinner-border spinner-border-sm me-2" />
              Loading holidays...
            </div>
          ) : holidays.length === 0 ? (
            <div className="text-center py-5" style={{ color: "#9ca3af" }}>
              <CalendarDays size={36} style={{ opacity: 0.4, marginBottom: 10 }} />
              <div style={{ fontWeight: 600, fontSize: 14 }}>
                No holidays for {selectedYear}
              </div>
              <div style={{ fontSize: 12.5, marginTop: 4 }}>
                Click "Seed Defaults" to add common Indian holidays, or add manually.
              </div>
            </div>
          ) : (
            <>
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
                            <div style={{ fontWeight: 600 }}>{h.name}</div>
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
                              style={{ background: st.bg, color: st.color }}
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

              <div className="hol-card-list">
                {holidays.map((h) => {
                  const st = TYPE_STYLES[h.type] || TYPE_STYLES.Optional;
                  return (
                    <div key={h._id} className="hol-mini-card">
                      <div className="hol-mini-head">
                        <div>
                          <div className="hol-mini-title">{h.name}</div>
                          {h.description && (
                            <div className="hol-mini-meta">{h.description}</div>
                          )}
                        </div>
                        <span
                          className="hol-type-pill"
                          style={{ background: st.bg, color: st.color }}
                        >
                          {h.type}
                        </span>
                      </div>
                      <div className="hol-mini-row">
                        <span style={{ color: "#64748b" }}>Date</span>
                        <span style={{ fontWeight: 700 }}>
                          {formatDate(h.date)}
                        </span>
                      </div>
                      <div className="hol-mini-row">
                        <span style={{ color: "#64748b" }}>Type</span>
                        <span style={{ fontWeight: 700 }}>
                          {h.is_optional ? "Optional" : "Mandatory"}
                        </span>
                      </div>
                      <div className="hol-mini-actions">
                        <button
                          className="hol-icon-btn"
                          onClick={() => openEdit(h)}
                          style={{ background: "#eef2ff", color: "#4f46e5" }}
                        >
                          <Pencil size={12} /> Edit
                        </button>
                        <button
                          className="hol-icon-btn"
                          onClick={() => handleDelete(h)}
                          style={{ background: "#fee2e2", color: "#dc2626" }}
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

      {modalOpen && (
        <div className="hol-modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="hol-modal" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
              {editItem ? "Edit Holiday" : "Add Holiday"}
            </h3>

            <div className="mb-3">
              <label className="erp-label">Holiday Name *</label>
              <input
                className="erp-input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., Pongal"
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
                />
              </div>
              <div className="col-12 col-sm-6">
                <label className="erp-label">Type</label>
                <select
                  className="erp-input"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
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
                style={{ resize: "vertical" }}
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
                }}
              >
                <input
                  type="checkbox"
                  checked={form.is_optional}
                  onChange={(e) =>
                    setForm({ ...form, is_optional: e.target.checked })
                  }
                  style={{ width: 18, height: 18 }}
                />
                Optional Holiday (employee can choose)
              </label>
            </div>

            <div className="d-flex justify-content-end gap-2">
              <button
                className="erp-btn erp-btn-outline"
                onClick={() => setModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="erp-btn erp-btn-primary"
                onClick={handleSave}
                disabled={saving}
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